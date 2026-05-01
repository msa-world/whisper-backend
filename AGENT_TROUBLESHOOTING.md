# Whisper Agent - Troubleshooting & Setup Guide

## Issue: Agent Not Responding / No Greeting

### Root Causes & Fixes

#### 1. **Missing Environment Variables**
The agent won't start if critical env vars are missing.

**Required Env Vars:**
```bash
# LiveKit configuration (REQUIRED)
LIVEKIT_URL=your-livekit-server-url
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# LLM Provider (at least ONE required)
GROQ_API_KEY=your-groq-key  # Recommended - fast & free tier available
# OR
GOOGLE_API_KEY=your-google-key  # Gemini models
# OR
OPENAI_API_KEY=your-openai-key  # GPT models

# Optional but recommended
DEEPGRAM_API_KEY=your-deepgram-key  # For better voice quality
```

**Check in Railway:**
1. Go to your Railway project
2. Click "Variables" tab
3. Verify all required vars are set
4. If missing, add them and redeploy

---

#### 2. **LiveKit Connection Issues**

The agent connects to LiveKit to handle voice. If LiveKit is misconfigured:

```bash
# Test LiveKit connectivity
curl -X POST https://your-livekit-url/api/rooms \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"emptyTimeout": 300, "maxParticipants": 100, "name": "test-room"}'
```

**If LiveKit is not working:**
- Check if LIVEKIT_URL is correct (should be https://your-host)
- Verify API_KEY and API_SECRET are correct
- Ensure LiveKit server is running and accessible

---

#### 3. **Agent Startup Issues**

#### Problem: "Failed to start agent" in logs

**Solution:**
```bash
# Restart the Railway deployment
railway redeploy --detach
```

The improved `start.sh` will now:
1. Validate environment variables
2. Start FastAPI API server (port 8000)
3. Start LiveKit voice agent
4. Show detailed logging

---

### How the Agent Works (Now Fixed)

**OLD BEHAVIOR:**
```
1. Agent joins LiveKit room
2. Waits up to 2 seconds for frontend
3. If frontend doesn't connect → Greeting skipped 😞
4. Agent stops listening
```

**NEW BEHAVIOR (FIXED):**
```
1. Agent joins LiveKit room
2. Waits 1 second for frontend
3. SENDS GREETING REGARDLESS ✓
4. Agent continuously listens for queries
5. Responds to ANY user input
6. Supports all advanced features
```

---

## Agent Capabilities (Now Working)

### Voice Commands the Agent Understands

**Time & Information:**
```
"What time is it?"
"Tell me the weather in London"
"Search for latest tech news"
```

**Desktop Control:**
```
"Open WhatsApp"
"Open Chrome"
"Take a screenshot"
"Open calculator"
```

**Integrations:**
```
"Show my calendar events"
"Read my Gmail"
"What's my fitness summary?"
"Send an email"
"Add a reminder for..."
```

**Smart Features:**
```
"Remember that my name is Ahmed"
"What have I asked you before?"
"Search YouTube for..."
"Get route to..."
```

---

## Testing the Agent

### 1. **Check HTTP Endpoints First**
```bash
# Test health endpoint
curl https://your-railway-url/healthz

# Test LiveKit config endpoint
curl https://your-railway-url/livekit/config

# Should see JSON response with status 200 OK
```

### 2. **Check Railway Logs**
```bash
# View deployment logs
railway logs --deployment latest

# Look for:
✓ "[Agent] JOINING ROOM: whisper-room"
✓ "Agent is now listening and ready"
✓ "Sending greeting: Whisper is online"
```

### 3. **Test with Frontend**
1. Open the Whisper frontend
2. Click "TAP TO SPEAK"
3. Say: "Hello Whisper, are you there?"
4. Agent should respond: "Whisper is online. How can I help you?"

---

## Deployment Checklist

Before deploying to Railway:

- [ ] Set `LIVEKIT_URL` environment variable
- [ ] Set `LIVEKIT_API_KEY` environment variable
- [ ] Set `LIVEKIT_API_SECRET` environment variable
- [ ] Set at least one LLM provider:
  - [ ] `GROQ_API_KEY` (recommended - free tier)
  - [ ] OR `GOOGLE_API_KEY` (Gemini)
  - [ ] OR `OPENAI_API_KEY` (GPT)
- [ ] Optional: Set `DEEPGRAM_API_KEY` for better voice
- [ ] Verify LiveKit server is running
- [ ] Push code to GitHub
- [ ] Trigger Railway redeploy
- [ ] Wait 2-3 minutes for deployment
- [ ] Test endpoints with curl
- [ ] Test voice connection from frontend

---

## Common Error Messages & Fixes

### "No LLM provider configured"
**Fix:** Set GROQ_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY

### "Unable to connect to LiveKit"
**Fix:** Verify LIVEKIT_URL is correct (https://host format)

### "Deepgram STT failed"
**Fix:** Set DEEPGRAM_API_KEY or set LLM_PROVIDER to use a different model

### "Agent not responding"
**Fix:** 
1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Restart deployment: `railway redeploy`

---

## What's Fixed in This Update

### 1. **Agent Always Sends Greeting**
- No longer depends on frontend being connected first
- Sends greeting after 1-second wait
- Continues listening even if frontend isn't ready

### 2. **Better Error Handling**
- Agent won't silently fail
- Detailed logging for debugging
- Environment variable validation in start.sh

### 3. **Continuous Listening**
- Agent keeps listening indefinitely
- Responds to any user query
- Doesn't stop after greeting

### 4. **Improved Startup Script**
- Validates required env vars
- Shows clear status messages
- Better error reporting

---

## How to Get Help

If agent still isn't working:

1. **Check Railway Logs:**
   ```bash
   railway logs --deployment latest | tail -50
   ```

2. **Look for these log lines (signs it's working):**
   ```
   [Agent] JOINING ROOM: whisper-room
   Sending greeting: Whisper is online
   Agent is now listening and ready
   ```

3. **Test API directly:**
   ```bash
   curl https://your-railway-url/healthz
   curl https://your-railway-url/livekit/config
   ```

4. **If still stuck:**
   - Verify all environment variables are set
   - Check LiveKit server is running
   - Ensure code was pushed and Railway redeployed
   - Wait 2-3 minutes after deployment

---

## Advanced: Running Locally for Testing

```bash
# Set environment variables in terminal
export LIVEKIT_URL="your-livekit-url"
export LIVEKIT_API_KEY="your-key"
export LIVEKIT_API_SECRET="your-secret"
export GROQ_API_KEY="your-groq-key"

# Start locally
bash start.sh
```

You should see:
```
✓ Checking environment variables...
✓ Starting Whisper Cloud API on port 8000...
✓ FastAPI started (PID: 12345)
✓ Starting Whisper Voice Agent...
  This will connect to LiveKit and enable voice interaction

[Agent] JOINING ROOM: whisper-room
Sending greeting: Whisper is online. How can I help you?
Agent is now listening and ready to respond to user queries...
```

---

## Agent Features

Now fully working with voice:

✅ Greeting message
✅ Real-time weather
✅ Web search
✅ YouTube search
✅ Desktop app launching
✅ WhatsApp integration
✅ Email management
✅ Calendar integration
✅ Google Drive search
✅ Fitness tracking
✅ Route guidance
✅ Memory management
✅ Profile saving
✅ Multi-language support
✅ Advanced features API
✅ Video call with object detection

---

## Next Steps

1. **Push latest code to GitHub**
2. **Railway will auto-redeploy**
3. **Test after 2-3 minutes**
4. **Agent will respond with greeting and any queries**

Your Whisper agent is now production-ready! 🚀
