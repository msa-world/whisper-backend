import os
import sys
import subprocess
import webview
import threading
import http.server
import socketserver
from functools import partial
from dotenv import load_dotenv
from livekit import api
import atexit
import httpx

load_dotenv()

# --- HTTP Server for local frontend ---
PORT = 5173
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(
    BASE_DIR,
    "Frontend interface Ai assistant", "Ai UI interface", "dist"
)

def start_server():
    Handler = partial(http.server.SimpleHTTPRequestHandler, directory=DIST_DIR)
    # Allow port reuse to avoid "Address already in use" on restarts
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[Backend] Serving frontend at http://localhost:{PORT}")
        httpd.serve_forever()

class Api:
    def __init__(self):
        self.base_dir = BASE_DIR
        self.server_process = None
        self.agent_process = None
        self.server_log_handle = None
        self.agent_log_handle = None
        self._connecting = False
        self._started = False  # Guard: only start services once

    def get_livekit_config(self):
        """Called by the React frontend to get LiveKit connection credentials only.
        Services are started once at app launch, not per credential request."""
        print("[Backend] get_livekit_config called")
        return self.get_credentials()

    def get_credentials(self):
        """Generate a token for the frontend to connect to the LiveKit room."""
        token = api.AccessToken(
            os.getenv("LIVEKIT_API_KEY"),
            os.getenv("LIVEKIT_API_SECRET")
        ).with_identity("tony_stark").with_name("Tony").with_grants(
            api.VideoGrants(room_join=True, room="whisper-room")
        ).to_jwt()
        return {
            "url": os.getenv("LIVEKIT_URL"),
            "token": token
        }

    def get_groq_usage(self):
        """Fetch Groq rate limit info by calling the models endpoint and reading headers."""
        try:
            api_key = os.getenv("GROQ_API_KEY_1") or os.getenv("GROQ_API_KEY")
            with httpx.Client(timeout=6) as client:
                resp = client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                h = resp.headers
                limit_req     = int(h.get("x-ratelimit-limit-requests",     30))
                remaining_req = int(h.get("x-ratelimit-remaining-requests", 30))
                limit_tok     = int(h.get("x-ratelimit-limit-tokens",       6000))
                remaining_tok = int(h.get("x-ratelimit-remaining-tokens",   6000))
                return {
                    "ok": True,
                    "requests": {
                        "limit":     limit_req,
                        "remaining": remaining_req,
                        "used":      max(0, limit_req - remaining_req),
                        "pct":       round((max(0, limit_req - remaining_req) / max(1, limit_req)) * 100),
                    },
                    "tokens": {
                        "limit":     limit_tok,
                        "remaining": remaining_tok,
                        "used":      max(0, limit_tok - remaining_tok),
                        "pct":       round((max(0, limit_tok - remaining_tok) / max(1, limit_tok)) * 100),
                    },
                }
        except Exception as e:
            return {"ok": False, "error": str(e), "requests": {"pct": 0, "used": 0, "limit": 30, "remaining": 30}, "tokens": {"pct": 0, "used": 0, "limit": 6000, "remaining": 6000}}

    def get_elevenlabs_usage(self):
        """Fetch ElevenLabs character usage from their subscription endpoint."""
        try:
            api_key = os.getenv("ELEVENLABS_API_KEY")
            with httpx.Client(timeout=6) as client:
                resp = client.get(
                    "https://api.elevenlabs.io/v1/user/subscription",
                    headers={"xi-api-key": api_key}
                )
                data = resp.json()
                used  = data.get("character_count", 0)
                limit = data.get("character_limit", 10000)
                return {
                    "ok":        True,
                    "used":      used,
                    "limit":     limit,
                    "remaining": max(0, limit - used),
                    "pct":       round((used / max(1, limit)) * 100),
                }
        except Exception as e:
            return {"ok": False, "error": str(e), "used": 0, "limit": 10000, "remaining": 10000, "pct": 0}

    def connect(self):
        """Start backend services — guarded so only one instance is ever started."""
        server_running = self.server_process and self.server_process.poll() is None
        agent_running = self.agent_process and self.agent_process.poll() is None
        if self._started and server_running and agent_running:
            print("[Backend] Services already running, skipping re-start.")
            return True
        if self._connecting:
            return True
        self._connecting = True
        self._started = False
        try:
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            env["PYTHONUTF8"] = "1"

            print("Starting MCP Server...")
            if self.server_log_handle is None or self.server_log_handle.closed:
                self.server_log_handle = open(
                    os.path.join(self.base_dir, "server.log"),
                    "a",
                    encoding="utf-8",
                )
            if not server_running:
                self.server_process = subprocess.Popen(
                    ["uv", "run", "python", "server.py"],
                    cwd=self.base_dir,
                    stdout=self.server_log_handle,
                    stderr=self.server_log_handle,
                    env=env,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                )

            print("Starting Whisper Agent...")
            if self.agent_log_handle is None or self.agent_log_handle.closed:
                self.agent_log_handle = open(
                    os.path.join(self.base_dir, "agent.log"),
                    "a",
                    encoding="utf-8",
                )
            if not agent_running:
                self.agent_process = subprocess.Popen(
                    ["uv", "run", "python", "whisper_agent.py", "dev"],
                    cwd=self.base_dir,
                    stdout=self.agent_log_handle,
                    stderr=self.agent_log_handle,
                    env=env,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                )
            self._started = True
            return True
        finally:
            self._connecting = False

    def disconnect(self):
        print("Stopping Backend Services...")
        for proc_name in ("agent_process", "server_process"):
            proc = getattr(self, proc_name)
            if not proc:
                continue
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=5)
            setattr(self, proc_name, None)

        if self.agent_log_handle and not self.agent_log_handle.closed:
            self.agent_log_handle.close()
        if self.server_log_handle and not self.server_log_handle.closed:
            self.server_log_handle.close()

        self.agent_log_handle = None
        self.server_log_handle = None
        self._started = False
        self._connecting = False
        return True

    def cleanup(self):
        self.disconnect()


# Initialize API backend
app_api = Api()
atexit.register(app_api.cleanup)

if __name__ == "__main__":
    # Start the local frontend server in a daemon thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Start backend services ONCE here, before the window opens
    # This ensures the agent is ready by the time the frontend connects
    app_api.connect()

    window = webview.create_window(
        "Whisper AI System",
        url=f"http://localhost:{PORT}",
        js_api=app_api,
        width=1100,
        height=850,
        min_size=(800, 600),
        frameless=False,
        background_color="#000000",
        text_select=False,
        confirm_close=True,
    )
    # webview.start(debug=True)  # Uncomment for DevTools
    webview.start()
