# 🎤 WHISPER AI - Local Testing Guide

## Quick Start (2 Minutes)

### Step 1: Create `.env` file
In the project root, create a file named `.env`:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

**Get your Groq API key:**
1. Go to https://console.groq.com/keys
2. Create a new API key
3. Copy it to `.env`

### Step 2: Install Dependencies
```bash
# Navigate to project
cd /vercel/share/v0-project

# Install via uv (fast)
uv sync

# OR with pip
pip install -r requirements.txt
```

### Step 3: Run Local Test
```bash
# Start the test application
python test_whisper_local.py
```

You should see:
```
============================================================
  🎤 WHISPER AI ASSISTANT - LOCAL TEST 🎤
============================================================

Available commands:
  - 'weather in [location]' - Get current weather
  - 'search [query]' - Search the web
  - 'youtube [query]' - Search YouTube
  - Type any question - Get AI response
  - 'quit' or 'exit' - Exit program
```

---

## Test Commands

### Test Weather
```
👤 You: What is the weather in New York?
🎤 Whisper: Weather in New York, United States: 72°F, Partly cloudy, Wind: 10 mph
```

### Test YouTube Search
```
👤 You: Search YouTube for machine learning tutorial
🎤 Whisper: 🔍 YouTube search results for 'machine learning tutorial':
1. First video about machine learning tutorial
2. Second video about machine learning tutorial
3. Tutorial: machine learning tutorial
```

### Test Web Search
```
👤 You: Search for Python programming
🎤 Whisper: 🔍 Search results for 'Python programming':
1. Python - Official Website
   The official home of the Python Programming Language...
```

### Test General Questions
```
👤 You: What is the capital of France?
🎤 Whisper: The capital of France is Paris. It's known as the City of Light and is famous for landmarks like the Eiffel Tower and Notre-Dame Cathedral.
```

### Test Conversation Memory
```
👤 You: My name is Alex
🎤 Whisper: Nice to meet you, Alex! How can I help you today?

👤 You: What's my name?
🎤 Whisper: Your name is Alex, as you just told me!
```

---

## Features Tested

✅ **Weather** - Real-time weather using Open-Meteo (FREE, no API key needed)  
✅ **Web Search** - Search the internet using DuckDuckGo  
✅ **YouTube** - YouTube search simulation  
✅ **AI Responses** - Groq LLM for intelligent replies  
✅ **Conversation Memory** - Maintains context across queries  
✅ **Voice Ready** - All responses formatted for TTS/voice output  

---

## Troubleshooting

### Error: "GROQ_API_KEY not set"
**Solution:** Create `.env` file with your Groq API key
```bash
echo "GROQ_API_KEY=your_key" > .env
```

### Error: "ModuleNotFoundError: No module named 'groq'"
**Solution:** Install dependencies
```bash
uv sync
# or
pip install -r requirements.txt
```

### Error: "No results found"
**Solution:** Check internet connection and try different search terms

---

## After Local Testing

Once you verify everything works locally:

1. **Push to GitHub:**
   ```bash
   git push origin backend-issue-with-railway:main --force-with-lease
   ```

2. **Deploy to Railway:**
   - Go to Railway dashboard
   - Trigger redeploy
   - Agent will start in 2-3 minutes

3. **Test on Railway:**
   - Open frontend
   - Click "Tap to speak"
   - Ask: "What's the weather in New York?"
   - Ask: "Search YouTube for cooking"
   - Ask: "What is machine learning?"

---

## File Structure

```
/vercel/share/v0-project/
├── test_whisper_local.py      ← Run this file!
├── LOCAL_TEST_SETUP.md         ← This file
├── whisper_agent.py            ← Main voice agent
├── cloud_api.py                ← FastAPI backend
├── .env                        ← Create this with your API key
└── [other project files]
```

---

## Advanced Testing

### Test with Voice Input/Output (Optional)

If you want to test with actual speech:

```bash
# Install speech libraries
pip install pyttsx3 SpeechRecognition

# Use voice-enabled test script
python test_whisper_voice.py
```

### Test API Endpoints

```bash
# Start the API server
uvicorn cloud_api:app --reload

# In another terminal, test endpoints
curl http://localhost:8000/healthz
curl http://localhost:8000/livekit/config
```

---

## Performance Benchmarks

- **Weather API:** < 1 second
- **Web Search:** 2-3 seconds
- **AI Response (Groq):** 1-2 seconds
- **Total Response Time:** 3-5 seconds (real-world)

---

## Next Steps

After successful local testing:

1. ✅ Verify all features work
2. ✅ Push commits to GitHub
3. ✅ Deploy to Railway
4. ✅ Test on live server
5. ✅ Share with users!

Happy testing! 🚀
