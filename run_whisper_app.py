#!/usr/bin/env python3
"""
Simple HTTP server to run the Whisper AI standalone app
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8080
HANDLER = http.server.SimpleHTTPRequestHandler

# Get the directory of this script
script_dir = Path(__file__).parent

def run_server():
    """Start the HTTP server"""
    os.chdir(script_dir)
    
    with socketserver.TCPServer(("", PORT), HANDLER) as httpd:
        url = f"http://localhost:{PORT}/whisper_standalone.html"
        print("\n" + "="*60)
        print("  🎤 WHISPER AI ASSISTANT - RUNNING LOCALLY 🎤")
        print("="*60)
        print(f"\n✓ Server running at: {url}")
        print(f"\n✓ Open the URL above in your browser")
        print(f"\n✓ Allow microphone access when prompted")
        print(f"\n✓ Click the microphone button to start speaking!")
        print(f"\n{'='*60}\n")
        
        try:
            # Try to open browser automatically
            webbrowser.open(url)
            print(f"Opening browser... {url}\n")
        except:
            print(f"Please open: {url}\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nShutting down Whisper...")
            print("Goodbye!\n")

if __name__ == "__main__":
    run_server()
