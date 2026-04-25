import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Whisper Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
async def healthz():
    """Health check for Render."""
    return {"status": "ok"}

@app.get("/livekit/config")
async def get_livekit_config():
    """Generates a connection token for the frontend to connect to the LiveKit room."""
    room_name = "whisper-room"
    participant_name = "user"
    
    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not url or not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured.")
        
    token = api.AccessToken(api_key, api_secret) \
        .with_identity(participant_name) \
        .with_name(participant_name) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
        )).to_jwt()
        
    return {
        "url": url,
        "token": token
    }

@app.get("/usage/groq")
async def get_groq_usage():
    """Fetches remaining Groq API requests and tokens."""
    groq_api_key = os.getenv("GROQ_API_KEY_1") or os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return {"error": "Groq API key not configured"}
        
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {groq_api_key}"}
            )
            h = resp.headers
            remaining_req = h.get("x-ratelimit-remaining-requests", "unknown")
            remaining_tok = h.get("x-ratelimit-remaining-tokens", "unknown")
            return {
                "remaining_requests": remaining_req,
                "remaining_tokens": remaining_tok
            }
    except Exception as e:
        return {"error": str(e)}

@app.get("/usage/elevenlabs")
async def get_elevenlabs_usage():
    """Fetches ElevenLabs character usage."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return {"error": "ElevenLabs API key not configured"}
        
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": api_key}
            )
            if resp.status_code == 200:
                data = resp.json()
                sub = data.get("subscription", {})
                return {
                    "character_count": sub.get("character_count"),
                    "character_limit": sub.get("character_limit")
                }
            return {"error": f"Failed to fetch: {resp.status_code}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
