#!/bin/bash

# Railway/Render provides the $PORT environment variable. Default to 8000 if not set.
PORT="${PORT:-8000}"

echo "=========================================="
echo "  🎤 WHISPER AI ASSISTANT - STARTING 🎤"
echo "=========================================="
echo ""
echo "✓ Checking environment variables..."

# Verify required env vars
if [ -z "$LIVEKIT_URL" ] || [ -z "$LIVEKIT_API_KEY" ] || [ -z "$LIVEKIT_API_SECRET" ]; then
    echo "⚠️  WARNING: LiveKit environment variables missing!"
    echo "   Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET"
fi

if [ -z "$GROQ_API_KEY" ] && [ -z "$GROQ_API_KEY_1" ]; then
    echo "⚠️  WARNING: Groq API key not set! Set GROQ_API_KEY or GROQ_API_KEY_1"
fi

echo ""
echo "✓ Starting Whisper Cloud API on port $PORT..."
echo "  Listening on 0.0.0.0:$PORT"
echo ""

# Start the FastAPI web service in the background with proper logging
uv run uvicorn cloud_api:app --host 0.0.0.0 --port $PORT --log-level info 2>&1 &
API_PID=$!

echo "✓ FastAPI started (PID: $API_PID)"
echo ""
echo "✓ Starting Whisper Voice Agent..."
echo "  This will connect to LiveKit and enable voice interaction"
echo ""

# Wait a moment for API to be ready
sleep 2

# Start the LiveKit voice agent with better error handling
# The agent will automatically:
# - Connect to LiveKit room
# - Send greeting when frontend joins
# - Listen and respond to user queries
# - Support all advanced features (weather, web search, integrations, etc.)

uv run python whisper_agent.py dev

# If agent exits, wait before restarting (give time for issue investigation)
EXIT_CODE=$?
echo ""
echo "⚠️  Voice agent exited with code: $EXIT_CODE"
echo "📋 Keeping FastAPI running for diagnostics..."
sleep 5

# Keep API alive for debugging
tail -f /dev/null
