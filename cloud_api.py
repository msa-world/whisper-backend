import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit import api

load_dotenv()

ROOM_NAME = os.getenv("LIVEKIT_ROOM_NAME", "whisper-room")
USER_IDENTITY = os.getenv("LIVEKIT_USER_IDENTITY", "user")
AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "whisper-assistant")

app = FastAPI(title="Whisper Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def ensure_room_exists(lk_api: api.LiveKitAPI, room_name: str) -> tuple[bool, str]:
    """Create the room if it does not already exist."""
    try:
        rooms = await lk_api.room.list_rooms(api.ListRoomsRequest(names=[room_name]))
        if rooms.rooms:
            return True, "existing"

        await lk_api.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                empty_timeout=10 * 60,
                departure_timeout=20,
                max_participants=10,
            )
        )
        return True, "created"
    except Exception as e:
        return False, str(e)


async def ensure_agent_dispatch(room_name: str) -> tuple[bool, str]:
    """Make sure the configured LiveKit agent is dispatched to this room."""
    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    if not all([url, api_key, api_secret]):
        return False, "LiveKit credentials not configured for dispatch"

    lk_api = api.LiveKitAPI(url, api_key, api_secret)
    try:
        room_ok, room_info = await ensure_room_exists(lk_api, room_name)
        if not room_ok:
            return False, f"room_error: {room_info}"

        existing = await lk_api.agent_dispatch.list_dispatch(room_name)
        for dispatch in existing:
            if dispatch.agent_name == AGENT_NAME:
                return True, f"dispatch_existing ({room_info})"

        for attempt in range(2):
            try:
                await lk_api.agent_dispatch.create_dispatch(
                    api.CreateAgentDispatchRequest(
                        agent_name=AGENT_NAME,
                        room=room_name,
                        metadata="cloud-auto-dispatch",
                    )
                )
                return True, f"dispatch_created ({room_info})"
            except Exception as e:
                if "requested room does not exist" in str(e).lower() and attempt == 0:
                    import asyncio

                    await asyncio.sleep(0.35)
                    continue
                return False, str(e)
        return False, "dispatch_failed"
    except Exception as e:
        return False, str(e)
    finally:
        await lk_api.aclose()


@app.get("/healthz")
async def healthz():
    """Health check for deployment probes."""
    return {"status": "ok"}


@app.get("/livekit/config")
async def get_livekit_config():
    """Generate room token and ensure agent dispatch for the frontend session."""
    room_name = ROOM_NAME
    participant_name = USER_IDENTITY

    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    if not url or not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured.")

    dispatch_ok, dispatch_info = await ensure_agent_dispatch(room_name)

    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity(participant_name)
        .with_name(participant_name)
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )

    return {
        "url": url,
        "token": token,
        "room": room_name,
        "agent_name": AGENT_NAME,
        "dispatch_ok": dispatch_ok,
        "dispatch_info": dispatch_info,
    }


@app.get("/usage/groq")
async def get_groq_usage():
    """Fetch remaining Groq API requests and tokens."""
    groq_api_key = os.getenv("GROQ_API_KEY_1") or os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return {"error": "Groq API key not configured"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {groq_api_key}"},
            )
            h = resp.headers
            remaining_req = h.get("x-ratelimit-remaining-requests", "unknown")
            remaining_tok = h.get("x-ratelimit-remaining-tokens", "unknown")
            return {
                "remaining_requests": remaining_req,
                "remaining_tokens": remaining_tok,
            }
    except Exception as e:
        return {"error": str(e)}


@app.get("/usage/elevenlabs")
async def get_elevenlabs_usage():
    """Fetch ElevenLabs character usage."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return {"error": "ElevenLabs API key not configured"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": api_key},
            )
            if resp.status_code == 200:
                data = resp.json()
                sub = data.get("subscription", {})
                return {
                    "character_count": sub.get("character_count"),
                    "character_limit": sub.get("character_limit"),
                }
            return {"error": f"Failed to fetch: {resp.status_code}"}
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
