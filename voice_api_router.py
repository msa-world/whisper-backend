"""
Voice API Router - Handles all voice interaction endpoints
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import io
from ai_handler import handle_text_query, handle_voice_query

router = APIRouter(prefix="/api", tags=["voice"])


@router.post("/chat")
async def text_chat(request_data: dict):
    """Handle text-based chat"""
    text = request_data.get("message", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    result = await handle_text_query(text)
    return result


@router.post("/voice/transcribe")
async def voice_transcribe(audio: UploadFile = File(...)):
    """Transcribe voice to text"""
    try:
        audio_data = await audio.read()
        from ai_handler import SpeechToTextHandler
        
        text = await SpeechToTextHandler.transcribe(audio_data)
        if not text:
            raise HTTPException(status_code=400, detail="Unable to transcribe audio")
        
        return {"status": "success", "transcription": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/tts")
async def text_to_speech(request_data: dict):
    """Convert text to speech"""
    text = request_data.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        from ai_handler import TextToSpeechHandler
        
        audio_data = await TextToSpeechHandler.speak(text)
        if not audio_data:
            raise HTTPException(status_code=500, detail="Failed to generate speech")
        
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/query")
async def voice_query(audio: UploadFile = File(...)):
    """Complete voice query - transcribe, process, and generate response with TTS"""
    try:
        audio_data = await audio.read()
        result = await handle_voice_query(audio_data)
        
        if result.get("status") != "success":
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
        
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/stream")
async def voice_stream(audio: UploadFile = File(...)):
    """Voice query with streaming response and audio"""
    try:
        audio_data = await audio.read()
        result = await handle_voice_query(audio_data)
        
        if result.get("status") != "success":
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
        
        # Return response with embedded audio
        return {
            "user_input": result.get("user_input"),
            "response": result.get("ai_response"),
            "timestamp": result.get("timestamp")
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    from ai_handler import GROQ_API_KEYS, GOOGLE_API_KEY, ELEVENLABS_API_KEY, DEEPGRAM_API_KEY
    
    return {
        "status": "healthy",
        "ai_assistant": {
            "groq_available": len(GROQ_API_KEYS) > 0,
            "groq_keys": len(GROQ_API_KEYS),
            "gemini_available": bool(GOOGLE_API_KEY),
            "tts_available": bool(ELEVENLABS_API_KEY),
            "stt_available": bool(DEEPGRAM_API_KEY),
            "offline_mode": "enabled"
        }
    }


@router.get("/info")
async def assistant_info():
    """Get assistant information"""
    return {
        "name": "Whisper AI Assistant",
        "version": "2.0.0",
        "voice": "Young Female (Natural)",
        "capabilities": [
            "Text chat",
            "Voice transcription",
            "Text-to-speech",
            "Voice query processing",
            "Offline mode",
            "Multi-API fallback",
            "Conversation history"
        ],
        "providers": {
            "llm": ["Groq (Mixtral)", "Google Gemini", "Offline Fallback"],
            "tts": ["ElevenLabs", "Offline Fallback"],
            "stt": ["Deepgram", "Browser Speech-to-Text"]
        }
    }

