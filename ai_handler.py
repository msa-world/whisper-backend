"""
Comprehensive AI Handler - Supports Groq, Gemini, Deepgram, ElevenLabs with offline mode
"""
import os
import json
import re
from typing import Optional, Tuple
from datetime import datetime
import httpx
from functools import lru_cache

# Load environment variables
GROQ_API_KEYS = [
    os.getenv("GROQ_API_KEY_1"),
    os.getenv("GROQ_API_KEY_2"),
    os.getenv("GROQ_API_KEY_3"),
    os.getenv("GROQ_API_KEY_4"),
    os.getenv("GROQ_API_KEY"),
]
GROQ_API_KEYS = [key for key in GROQ_API_KEYS if key]

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "fallback")
STT_PROVIDER = os.getenv("STT_PROVIDER", "groq")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "elevenlabs")

# Young girl voice ID in ElevenLabs
YOUNG_GIRL_VOICE_ID = "XB0fDUnXU5powFXDhCwa"  # Young female voice

# Offline response cache
OFFLINE_CACHE = {}

class OfflineAIHandler:
    """Handles offline responses with common queries"""
    
    @staticmethod
    def get_offline_response(user_input: str) -> str:
        """Generate response without API calls"""
        lower_input = user_input.lower()
        
        # Greetings
        if any(word in lower_input for word in ["hello", "hi", "hey", "greetings", "namaste"]):
            return "Hi there! I'm Whisper, your AI assistant. Even though I'm working offline right now, I can still help you with many things. What would you like to know?"
        
        # Time queries
        if any(word in lower_input for word in ["time", "what's the time", "current time"]):
            from datetime import datetime
            return f"The current time is {datetime.now().strftime('%I:%M %p')}."
        
        # Date queries
        if any(word in lower_input for word in ["date", "what's the date", "today"]):
            from datetime import datetime
            return f"Today is {datetime.now().strftime('%A, %B %d, %Y')}."
        
        # Name query
        if any(word in lower_input for word in ["your name", "who are you", "what are you"]):
            return "I'm Whisper, your personal AI assistant. I can help you with information, answer questions, and have conversations. Since I'm currently offline, my responses are limited but still helpful!"
        
        # Help
        if any(word in lower_input for word in ["help", "what can you do", "capabilities"]):
            return "I can help you with: current time and date, general questions, conversations, tips and advice. For online features like weather, web search, and advanced AI responses, I need internet connection. What would you like help with?"
        
        # Math
        if "+" in user_input or "-" in user_input or "*" in user_input or "/" in user_input:
            try:
                result = eval(user_input)
                return f"The answer is {result}."
            except:
                return "I can help with simple math. Could you rephrase your question?"
        
        # Offline advice/tips
        if any(word in lower_input for word in ["tip", "advice", "should i", "how to"]):
            if "sleep" in lower_input:
                return "Good sleep habits: Keep a consistent schedule, avoid screens before bed, keep your room cool and dark, and aim for 7-9 hours of sleep. Sweet dreams!"
            elif "health" in lower_input:
                return "Health tips: Stay hydrated, exercise regularly, eat balanced meals, get enough sleep, and manage stress through relaxation techniques."
            elif "focus" in lower_input:
                return "To improve focus: Remove distractions, break work into small tasks, take regular breaks, stay hydrated, and maintain a consistent routine."
            else:
                return "I'd be happy to help! Could you be more specific about what you need advice on?"
        
        # Default offline response
        return f"I received your message: '{user_input}'. While I'm working offline, I can answer time/date questions, do simple math, or provide general tips. For more advanced responses, I'll need an internet connection."


class TextToSpeechHandler:
    """Handles text-to-speech with ElevenLabs and fallback"""
    
    @staticmethod
    async def speak(text: str, voice_id: str = YOUNG_GIRL_VOICE_ID) -> Optional[bytes]:
        """Convert text to speech using ElevenLabs"""
        if not ELEVENLABS_API_KEY:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers={"xi-api-key": ELEVENLABS_API_KEY},
                    json={
                        "text": text,
                        "model_id": "eleven_monolingual_v1",
                        "voice_settings": {
                            "stability": 0.7,  # More natural
                            "similarity_boost": 0.8  # Better voice match
                        }
                    }
                )
                if response.status_code == 200:
                    return response.content
        except Exception as e:
            print(f"[Whisper] ElevenLabs TTS error: {e}")
        
        return None


class LLMHandler:
    """Handles LLM requests with Groq, Gemini, and fallback"""
    
    current_key_index = 0
    
    @staticmethod
    def get_next_groq_key():
        """Rotate through Groq API keys"""
        if not GROQ_API_KEYS:
            return None
        LLMHandler.current_key_index = (LLMHandler.current_key_index + 1) % len(GROQ_API_KEYS)
        return GROQ_API_KEYS[LLMHandler.current_key_index]
    
    @staticmethod
    async def query_groq(user_input: str, conversation_history: list = None) -> Optional[str]:
        """Query Groq for AI response"""
        api_key = LLMHandler.get_next_groq_key()
        if not api_key:
            return None
        
        try:
            messages = conversation_history or []
            if not messages:
                messages = [{"role": "system", "content": "You are Whisper, a helpful, friendly AI assistant with a warm and empathetic personality. Respond naturally and conversationally. Keep responses concise but complete."}]
            
            messages.append({"role": "user", "content": user_input})
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "mixtral-8x7b-32768",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 500
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            print(f"[Whisper] Groq error: {e}")
        
        return None
    
    @staticmethod
    async def query_gemini(user_input: str) -> Optional[str]:
        """Query Google Gemini for AI response"""
        if not GOOGLE_API_KEY:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
                    params={"key": GOOGLE_API_KEY},
                    json={
                        "contents": [{
                            "parts": [{"text": user_input}]
                        }]
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {}).get("parts", [])
                        if content:
                            return content[0].get("text", "")
        except Exception as e:
            print(f"[Whisper] Gemini error: {e}")
        
        return None
    
    @staticmethod
    async def get_ai_response(user_input: str, conversation_history: list = None) -> str:
        """Get AI response with fallback logic"""
        # Try primary provider
        if LLM_PROVIDER == "groq" or LLM_PROVIDER == "fallback":
            response = await LLMHandler.query_groq(user_input, conversation_history)
            if response:
                return response
        
        # Try Gemini
        if LLM_PROVIDER == "gemini" or (LLM_PROVIDER == "fallback" and not response):
            response = await LLMHandler.query_gemini(user_input)
            if response:
                return response
        
        # Fallback to offline
        return OfflineAIHandler.get_offline_response(user_input)


class SpeechToTextHandler:
    """Handles speech-to-text with Deepgram"""
    
    @staticmethod
    async def transcribe(audio_data: bytes) -> Optional[str]:
        """Transcribe audio using Deepgram"""
        if not DEEPGRAM_API_KEY:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.deepgram.com/v1/listen",
                    headers={"Authorization": f"Token {DEEPGRAM_API_KEY}"},
                    params={
                        "model": "nova-2",
                        "language": "en",
                        "filler_words": "true"
                    },
                    content=audio_data
                )
                if response.status_code == 200:
                    data = response.json()
                    transcripts = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [])
                    if transcripts:
                        return transcripts[0].get("transcript", "")
        except Exception as e:
            print(f"[Whisper] Deepgram error: {e}")
        
        return None


class AIAssistant:
    """Main AI Assistant class combining all capabilities"""
    
    def __init__(self):
        self.conversation_history = []
        self.max_history = 10
    
    def add_to_history(self, role: str, content: str):
        """Add message to conversation history"""
        self.conversation_history.append({"role": role, "content": content})
        if len(self.conversation_history) > self.max_history:
            self.conversation_history.pop(0)
    
    async def process_user_input(self, user_input: str) -> Tuple[str, bytes]:
        """Process user input and generate response with voice"""
        # Add to history
        self.add_to_history("user", user_input)
        
        # Get AI response
        ai_response = await LLMHandler.get_ai_response(user_input, self.conversation_history)
        
        # Add AI response to history
        self.add_to_history("assistant", ai_response)
        
        # Generate speech
        audio_data = await TextToSpeechHandler.speak(ai_response)
        
        return ai_response, audio_data
    
    async def process_voice_input(self, audio_data: bytes) -> Tuple[str, str, bytes]:
        """Process voice input, transcribe, and generate response"""
        # Transcribe speech
        user_input = await SpeechToTextHandler.transcribe(audio_data)
        if not user_input:
            return "", "Unable to transcribe audio", None
        
        # Get response
        ai_response, audio_data = await self.process_user_input(user_input)
        
        return user_input, ai_response, audio_data


# Global instance
assistant = AIAssistant()


async def handle_text_query(text: str) -> dict:
    """Handle text query"""
    response, audio = await assistant.process_user_input(text)
    return {
        "status": "success",
        "user_input": text,
        "ai_response": response,
        "has_audio": audio is not None,
        "timestamp": datetime.now().isoformat()
    }


async def handle_voice_query(audio_data: bytes) -> dict:
    """Handle voice query"""
    try:
        user_text, response, audio = await assistant.process_voice_input(audio_data)
        return {
            "status": "success",
            "user_input": user_text,
            "ai_response": response,
            "has_audio": audio is not None,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

