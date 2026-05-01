#!/usr/bin/env python3
"""
Whisper AI Local Test - Test voice assistant features without Railway
Supports: YouTube search, weather queries, web search, voice responses
"""

import asyncio
import os
import json
import sys
from datetime import datetime

# Try to load .env, but don't fail if not available
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

# Try to import httpx, fallback to urllib
try:
    import httpx
    use_httpx = True
except ImportError:
    import urllib.request
    import urllib.parse
    use_httpx = False
    print("⚠️  httpx not available, using urllib (slower but works)")

class WhisperLocalTest:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY_1")
        if not self.groq_api_key:
            raise ValueError("❌ GROQ_API_KEY not set! Add it to .env file or set environment variable")
        
        self.use_httpx = use_httpx
        if use_httpx:
            self.groq_client = httpx.AsyncClient(
                base_url="https://api.groq.com/openai/v1",
                headers={"Authorization": f"Bearer {self.groq_api_key}"}
            )
        self.conversation_history = []
        
    def get_weather(self, location: str) -> str:
        """Get weather using Open-Meteo API (FREE, no key needed)"""
        try:
            import urllib.request
            import urllib.parse
            import json as json_lib
            
            # Get coordinates from location
            geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode({
                "name": location,
                "count": 1,
                "language": "en",
                "format": "json"
            })
            
            with urllib.request.urlopen(geo_url, timeout=5) as response:
                geo_data = json_lib.loads(response.read())
            
            if not geo_data.get("results"):
                return f"❌ Could not find location: {location}"
            
            result = geo_data["results"][0]
            latitude = result["latitude"]
            longitude = result["longitude"]
            found_location = f"{result['name']}, {result.get('country', '')}"
            
            # Get weather
            weather_url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode({
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,weather_code,wind_speed_10m",
                "temperature_unit": "fahrenheit"
            })
            
            with urllib.request.urlopen(weather_url, timeout=5) as response:
                weather_data = json_lib.loads(response.read())
            
            current = weather_data.get("current", {})
            temp = current.get("temperature_2m", "Unknown")
            wind = current.get("wind_speed_10m", "Unknown")
            
            weather_desc = {
                0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
                45: "Foggy", 48: "Foggy", 51: "Light drizzle", 61: "Slight rain",
                80: "Slight rain showers", 95: "Thunderstorm",
            }
            
            weather_code = current.get("weather_code", 0)
            description = weather_desc.get(weather_code, "Unknown weather")
            
            return f"Weather in {found_location}: {temp}°F, {description}, Wind: {wind} mph"
        except Exception as e:
            return f"❌ Could not fetch weather: {str(e)}"
    
    def search_youtube(self, query: str) -> str:
        """Simulate YouTube search response"""
        try:
            return f"🔍 YouTube search results for '{query}':\n1. First video about {query}\n2. Second video about {query}\n3. Tutorial: {query}"
        except Exception as e:
            return f"❌ YouTube search failed: {str(e)}"
    
    def web_search(self, query: str) -> str:
        """Search the web using DuckDuckGo"""
        try:
            from duckduckgo_search import DDGS
            ddgs = DDGS()
            results = ddgs.text(query, max_results=3)
            
            if not results:
                return f"❌ No results found for: {query}"
            
            response = f"🔍 Search results for '{query}':\n"
            for i, result in enumerate(results, 1):
                response += f"\n{i}. {result['title']}\n   {result['body'][:200]}...\n"
            return response
        except ImportError:
            return f"🔍 DuckDuckGo search for '{query}' (duckduckgo-search not installed). Try: pip install duckduckgo-search"
        except Exception as e:
            return f"❌ Web search failed: {str(e)}"
    
    def process_user_input(self, user_input: str) -> str:
        """Process user input and generate response using Groq"""
        try:
            print(f"\n👤 You: {user_input}")
            
            # Add user message to history
            self.conversation_history.append({
                "role": "user",
                "content": user_input
            })
            
            # Check for specific commands
            user_lower = user_input.lower()
            
            # Weather query
            if "weather" in user_lower or "temperature" in user_lower:
                for word in ["in", "at", "around", "near"]:
                    if word in user_lower:
                        location = user_lower.split(word)[1].strip().rstrip("?")
                        weather_info = self.get_weather(location)
                        print(f"\n🎤 Whisper: {weather_info}")
                        return weather_info
            
            # YouTube search
            if "youtube" in user_lower or "search youtube" in user_lower:
                query = user_input.replace("youtube", "").replace("search", "").strip()
                yt_results = self.search_youtube(query)
                print(f"\n🎤 Whisper: {yt_results}")
                return yt_results
            
            # Web search
            if "search" in user_lower and "youtube" not in user_lower:
                query = user_input.replace("search", "").replace("for", "").strip()
                search_results = self.web_search(query)
                print(f"\n🎤 Whisper: {search_results}")
                return search_results
            
            # Use Groq for general responses
            system_prompt = """You are Whisper, a helpful AI assistant like Alexa, Google Assistant, and Siri.
Be concise, friendly, and helpful. Keep responses to 1-2 sentences for voice interaction.
You can help with: weather, web search, YouTube search, general questions, math, cooking, music, and more."""
            
            # Create message for Groq
            messages = [{"role": "system", "content": system_prompt}] + self.conversation_history[-10:]
            
            import urllib.request
            import json as json_lib
            
            # Make request to Groq API
            request = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json_lib.dumps({
                    "model": "mixtral-8x7b-32768",
                    "messages": messages,
                    "max_tokens": 150,
                    "temperature": 0.7
                }).encode(),
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            
            with urllib.request.urlopen(request, timeout=10) as response:
                data = json_lib.loads(response.read())
            
            assistant_message = data["choices"][0]["message"]["content"]
            
            # Add to history
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_message
            })
            
            print(f"\n🎤 Whisper: {assistant_message}")
            return assistant_message
            
        except Exception as e:
            error_msg = f"❌ Error: {str(e)}"
            print(f"\n🎤 Whisper: {error_msg}")
            return error_msg
    
    def start_conversation(self):
        """Start interactive conversation"""
        print("\n" + "="*60)
        print("  🎤 WHISPER AI ASSISTANT - LOCAL TEST 🎤")
        print("="*60)
        print("\nAvailable commands:")
        print("  - 'weather in [location]' - Get current weather")
        print("  - 'search [query]' - Search the web")
        print("  - 'youtube [query]' - Search YouTube")
        print("  - Type any question - Get AI response")
        print("  - 'quit' or 'exit' - Exit program")
        print("\n" + "="*60)
        
        # Send greeting
        greeting = "Hi! I'm Whisper, your AI assistant. I can help you with weather, web searches, YouTube, and answer any questions. What would you like to know?"
        print(f"\n🎤 Whisper: {greeting}\n")
        
        # Interactive loop
        while True:
            try:
                user_input = input("👤 You: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ["quit", "exit", "bye", "goodbye"]:
                    print("\n🎤 Whisper: Goodbye! Have a great day!")
                    break
                
                self.process_user_input(user_input)
                
            except KeyboardInterrupt:
                print("\n\n🎤 Whisper: Goodbye! Have a great day!")
                break
            except Exception as e:
                print(f"Error: {e}")

def main():
    """Main entry point"""
    try:
        whisper = WhisperLocalTest()
        whisper.start_conversation()
    except Exception as e:
        print(f"❌ Failed to start Whisper: {e}")
        print("\n⚠️  Make sure to set GROQ_API_KEY")
        print("   Set environment variable: export GROQ_API_KEY=your_key_here")
        print("   Or create .env file with: GROQ_API_KEY=your_key_here")

if __name__ == "__main__":
    main()
