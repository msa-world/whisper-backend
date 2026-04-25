#!/bin/bash
set -e

# Render provides the $PORT environment variable. Default to 8000 if not set.
PORT="${PORT:-8000}"

echo "Starting Whisper Cloud API on port $PORT..."
# Start the FastAPI web service in the background
uv run uvicorn cloud_api:app --host 0.0.0.0 --port $PORT &

echo "Starting Whisper Voice Agent..."
# Start the LiveKit voice agent in the foreground so the container stays alive
uv run python whisper_agent.py dev
