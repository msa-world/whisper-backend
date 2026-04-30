# Whisper AI Assistant - Complete Deployment Guide

This guide covers deploying Whisper to Railway with all advanced features enabled.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Railway Setup](#railway-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Variables](#environment-variables)
5. [Deploying Backend](#deploying-backend)
6. [Deploying Frontend](#deploying-frontend)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

You need:
- Railway account (railway.app)
- GitHub account with whisper-backend repository
- Groq API key (groq.com)
- LiveKit credentials
- ElevenLabs API key (optional, for text-to-speech)
- PostgreSQL database access

---

## Railway Setup

### Step 1: Create Railway Project

```bash
# Login to Railway
railway login

# Create new project
railway init
```

### Step 2: Add PostgreSQL Plugin

```bash
# From Railway Dashboard:
# 1. Go to your project
# 2. Click "Add Service" → "Database" → "PostgreSQL"
# 3. Copy the connection string
```

### Step 3: Connect GitHub Repository

```bash
# In Railway Dashboard:
# 1. Click "Add Service" → "GitHub repo"
# 2. Select msa-world/whisper-backend
# 3. Select main branch
# 4. Click "Deploy"
```

---

## Database Configuration

### Step 1: Set DATABASE_URL

Railway automatically creates a `DATABASE_URL` environment variable when you add PostgreSQL.

### Step 2: Initialize Database Tables

The database will auto-initialize when the app first starts (see `models.py` and `cloud_api.py`).

To verify tables were created:

```bash
# Connect to Railway PostgreSQL
railway connect postgresql

# List tables
\dt

# Check conversation table
SELECT * FROM conversations LIMIT 5;
```

### Step 3: Create Indexes (Optional)

For better query performance:

```sql
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_user_id ON users(user_id);
```

---

## Environment Variables

### Required Variables

Set these in your Railway project variables section:

```env
# LiveKit
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_ROOM_NAME=whisper-room
LIVEKIT_USER_IDENTITY=user
LIVEKIT_AGENT_NAME=whisper-assistant

# Speech-to-Text (choose one)
# Option 1: Groq
GROQ_API_KEY_1=your_groq_key

# Option 2: Deepgram
DEEPGRAM_API_KEY=your_deepgram_key

# Text-to-Speech
ELEVENLABS_API_KEY=your_elevenlabs_key

# Database (auto-set by Railway PostgreSQL plugin)
DATABASE_URL=postgresql://...

# Frontend
VITE_API_BASE_URL=https://your-railway-domain.up.railway.app
```

### Optional Variables

```env
# Google Services (for integrations)
GOOGLE_CALENDAR_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Slack Integration
SLACK_TOKEN=...

# Encryption
ENCRYPTION_KEY=your-32-char-base64-encoded-key

# Redis (for caching)
REDIS_URL=redis://...
```

---

## Deploying Backend

### Step 1: Verify Dockerfile

The Dockerfile should:
- Expose port 8000 (not 7860)
- Use `start.sh` as entrypoint
- Have proper build caching

Check `/vercel/share/v0-project/Dockerfile`:
```dockerfile
EXPOSE 8000
CMD ["bash", "start.sh"]
```

### Step 2: Deploy to Railway

```bash
# Commit your changes
git add -A
git commit -m "Deploy to Railway"
git push origin main

# Railway automatically deploys on push to main branch
# Monitor deployment in Railway Dashboard
```

### Step 3: Verify Deployment

```bash
# Check health endpoint
curl https://your-railway-domain.up.railway.app/healthz

# Expected response:
# {"status":"ok"}

# Test LiveKit config endpoint
curl https://your-railway-domain.up.railway.app/livekit/config

# Check logs
railway logs
```

---

## Deploying Frontend

### Step 1: Build Frontend

```bash
cd "Frontend interface Ai assistant/Ai UI interface"
npm install
npm run build
```

### Step 2: Environment Variables

Create `.env.production`:
```env
VITE_API_BASE_URL=https://your-railway-domain.up.railway.app
```

### Step 3: Deploy Options

#### Option A: Railway Static Site

```bash
# Build first
npm run build

# Push to Railway
railway add .
railway up
```

#### Option B: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option C: GitHub Pages (free)

```bash
# Build
npm run build

# Push dist to gh-pages branch
```

---

## Testing & Validation

### Backend Tests

#### 1. Health Check
```bash
curl https://your-domain.up.railway.app/healthz
# Should return: {"status":"ok"}
```

#### 2. LiveKit Config
```bash
curl https://your-domain.up.railway.app/livekit/config
# Should return: {"url":"wss://...", "token":"eyJ..."}
```

#### 3. Create User Preference
```bash
curl -X POST https://your-domain.up.railway.app/api/advanced/users/test-user/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "preferred_language": "es",
    "voice_speed": 1.2,
    "response_length": "medium"
  }'
```

#### 4. Create Conversation
```bash
curl -X POST https://your-domain.up.railway.app/api/advanced/conversations \
  -H "Content-Type: application/json" \
  -H "User-ID: test-user" \
  -d '{"title": "Test Conversation"}'
```

#### 5. List Languages
```bash
curl https://your-domain.up.railway.app/api/i18n/languages
```

### Frontend Tests

#### 1. Load Website
```
https://your-frontend-domain.com
```

#### 2. Check Console
- No 404 errors
- No CORS errors
- No "CONNECTION ERROR" message

#### 3. Voice Test
- Click "Tap to speak"
- Speak "Hello"
- Should see transcript appear
- Should hear voice response

#### 4. Settings
- Open settings panel
- Change language to Spanish
- Should see translations update
- Change voice speed
- Adjust response length

#### 5. Conversation History
- Open history panel
- Should see conversation list
- Click conversation to load
- Messages should load

### Database Tests

```sql
-- Check users table
SELECT COUNT(*) FROM users;

-- Check conversations
SELECT * FROM conversations WHERE user_id IS NOT NULL LIMIT 5;

-- Check messages
SELECT COUNT(*) FROM messages;

-- Check integrations
SELECT * FROM integration_configs;

-- Check analytics
SELECT * FROM user_analytics WHERE date > NOW() - INTERVAL '7 days';
```

---

## Performance Optimization

### 1. Database Indexes
```sql
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_context_items_key ON context_items(key);
```

### 2. Cache Headers
Configure CDN for frontend:
```
Cache-Control: public, max-age=3600
```

### 3. Connection Pooling
Already configured in `models.py` with SQLAlchemy:
```python
pool_size=10
max_overflow=20
pool_pre_ping=True
```

### 4. Frontend Optimization
- Code splitting for components
- Image optimization
- Lazy loading of history
- Compression enabled

---

## Monitoring & Maintenance

### Railway Logs
```bash
# Real-time logs
railway logs -f

# Search for errors
railway logs | grep error
```

### Database Backups
```bash
# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Analytics Monitoring
```sql
-- Check daily usage
SELECT 
  date,
  SUM(messages_sent) as total_messages,
  SUM(tokens_used) as total_tokens,
  SUM(api_cost) as total_cost
FROM user_analytics
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

---

## Troubleshooting

### Issue: Connection Error on Frontend

**Symptoms**: "CONNECTION ERROR" showing on UI

**Solutions**:
1. Check environment variables in Railway
2. Verify `VITE_API_BASE_URL` is correct
3. Check backend logs: `railway logs`
4. Ensure database initialized: check PostgreSQL connection
5. Clear browser cache and reload

### Issue: Database Not Found

**Symptoms**: "Table doesn't exist" errors

**Solutions**:
1. Connect to PostgreSQL: `railway connect postgresql`
2. List tables: `\dt`
3. If missing, run: `python -c "from models import init_db; init_db()"`
4. Check `cloud_api.py` has `init_db()` call on startup

### Issue: Voice Not Working

**Symptoms**: Audio blocked or no audio output

**Solutions**:
1. Check browser permissions (microphone/speaker)
2. Verify LiveKit credentials in environment
3. Test with `curl https://your-domain.up.railway.app/livekit/config`
4. Check browser console for detailed errors
5. Try different browser

### Issue: Slow Queries

**Symptoms**: Conversations loading slowly

**Solutions**:
1. Create indexes (see Performance Optimization)
2. Check query logs in PostgreSQL
3. Archive old conversations
4. Increase `pool_size` in models.py
5. Use `selectinload()` for related objects

### Issue: Out of Memory

**Symptoms**: Railway pod crashes

**Solutions**:
1. Increase Railway memory allocation
2. Reduce `pool_size` in SQLAlchemy
3. Archive/delete old conversations
4. Enable connection pooling
5. Check for memory leaks in logs

---

## Support & Next Steps

1. **Customize**: Update prompts and personalities
2. **Integrate**: Add more external services (Gmail, Slack)
3. **Scale**: Add caching layer (Redis)
4. **Monitor**: Set up error tracking (Sentry)
5. **Analyze**: Use analytics dashboard

For issues, check:
- Railway logs
- GitHub issues
- Database schema
- Environment variables
- Browser console

Good luck deploying Whisper to production!
