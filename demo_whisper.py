#!/usr/bin/env python3
"""
Whisper AI Demo - Test all features without requiring API keys
This demonstrates: Weather, YouTube Search, Web Search, AI Responses
"""

import json
import urllib.request
import urllib.parse
from datetime import datetime


class WhisperDemo:
    def __init__(self):
        self.conversation_history = []
        self.demo_mode = True

    def get_weather(self, location: str) -> str:
        """Get real weather using Open-Meteo API (completely free)"""
        try:
            print("  [Fetching real weather data...]")
            
            # Get coordinates from location
            geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode({
                "name": location,
                "count": 1,
                "language": "en",
                "format": "json"
            })
            
            with urllib.request.urlopen(geo_url, timeout=5) as response:
                geo_data = json.loads(response.read())
            
            if not geo_data.get("results"):
                return f"Could not find location: {location}"
            
            result = geo_data["results"][0]
            latitude = result["latitude"]
            longitude = result["longitude"]
            found_location = f"{result['name']}, {result.get('country', '')}"
            
            # Get weather data
            weather_url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode({
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
                "temperature_unit": "fahrenheit"
            })
            
            with urllib.request.urlopen(weather_url, timeout=5) as response:
                weather_data = json.loads(response.read())
            
            current = weather_data.get("current", {})
            temp = current.get("temperature_2m", "Unknown")
            wind = current.get("wind_speed_10m", "Unknown")
            humidity = current.get("relative_humidity_2m", "Unknown")
            
            weather_desc = {
                0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
                45: "Foggy", 48: "Depositing rime fog", 51: "Light drizzle",
                61: "Slight rain", 80: "Slight rain showers", 95: "Thunderstorm"
            }
            
            weather_code = current.get("weather_code", 0)
            description = weather_desc.get(weather_code, "Unknown")
            
            return f"The weather in {found_location} is {temp}°F with {description}. Wind speed is {wind} mph and humidity is {humidity}%."
            
        except Exception as e:
            return f"Could not fetch weather: {str(e)}"

    def search_youtube(self, query: str) -> str:
        """Simulate YouTube search"""
        return f"Here are the top YouTube results for '{query}':\n1. Complete {query} Tutorial for Beginners\n2. Advanced {query} Techniques\n3. {query} Best Practices 2024"

    def web_search(self, query: str) -> str:
        """Simulate web search"""
        return f"Top web results for '{query}':\n1. Wikipedia article on {query}\n2. Stack Overflow discussions about {query}\n3. Latest news and articles about {query}"

    def get_ai_response(self, user_input: str) -> str:
        """Generate AI responses for general queries (demo mode)"""
        demo_responses = {
            "what is artificial intelligence": "Artificial Intelligence is a branch of computer science that aims to create intelligent machines capable of performing tasks that normally require human intelligence. This includes learning from experience, recognizing patterns, and understanding language.",
            
            "what is 2+2": "2 plus 2 equals 4. Math seems simple, but it's fundamental to everything we do!",
            
            "tell me a joke": "Why did the programmer quit his job? Because he didn't get arrays. That's programming humor for you!",
            
            "what is python": "Python is a popular programming language known for its simplicity and readability. It's widely used in web development, data science, artificial intelligence, and automation.",
            
            "how do i learn programming": "Start with the basics of any language like Python or JavaScript. Practice coding daily, build small projects, read code from others, and don't be afraid to make mistakes. Websites like Codecademy, freeCodeCamp, and LeetCode are great resources.",
            
            "what is machine learning": "Machine Learning is a subset of AI where systems learn and improve from experience without explicit programming. It powers recommendations, image recognition, voice assistants like me, and much more.",
            
            "what time is it": f"The current time is {datetime.now().strftime('%I:%M %p')}.",
            
            "what is the weather": "You need to tell me a location! Try asking 'What is the weather in New York' or 'Weather in London'",
        }
        
        # Check for exact matches first
        for key, response in demo_responses.items():
            if user_input.lower() == key:
                return response
        
        # Check for partial matches
        user_lower = user_input.lower()
        for key, response in demo_responses.items():
            if key.split()[0] in user_lower:
                return response
        
        # Default response
        return "That's a great question! In a production environment with Groq API connected, I would provide a detailed, personalized answer. For now, feel free to ask about weather, YouTube searches, or web searches!"

    def process_input(self, user_input: str) -> str:
        """Process user input and return response"""
        print(f"\nYou: {user_input}")
        
        user_lower = user_input.lower()
        
        # Weather queries
        if "weather" in user_lower or "temperature" in user_lower:
            for word in ["in", "at", "around", "near"]:
                if word in user_lower:
                    location = user_lower.split(word)[1].strip().rstrip("?")
                    response = self.get_weather(location)
                    print(f"\nWhisper: {response}\n")
                    return response
        
        # YouTube search
        if "youtube" in user_lower or "search youtube" in user_lower:
            query = user_input.replace("youtube", "").replace("search", "").strip().rstrip("?")
            if query:
                response = self.search_youtube(query)
                print(f"\nWhisper: {response}\n")
                return response
        
        # Web search
        if "search" in user_lower and "youtube" not in user_lower:
            query = user_input.replace("search", "").replace("for", "").strip().rstrip("?")
            if query:
                response = self.web_search(query)
                print(f"\nWhisper: {response}\n")
                return response
        
        # General AI responses
        response = self.get_ai_response(user_input)
        print(f"\nWhisper: {response}\n")
        return response

    def run(self):
        """Run the interactive demo"""
        print("\n" + "="*70)
        print("  WHISPER AI ASSISTANT - LOCAL DEMO")
        print("="*70)
        print("\n✓ Features available:")
        print("  • Real weather data (Open-Meteo API - FREE)")
        print("  • YouTube search simulation")
        print("  • Web search simulation")
        print("  • AI responses for general questions")
        print("\nExample queries:")
        print("  'weather in New York'")
        print("  'search for machine learning'")
        print("  'youtube python tutorial'")
        print("  'what is artificial intelligence'")
        print("  'type quit to exit'")
        print("\n" + "="*70 + "\n")
        
        # Send greeting
        greeting = "Hi! I'm Whisper, your AI assistant. I can help you with weather, YouTube searches, web searches, and answer questions. What would you like to know?"
        print(f"Whisper: {greeting}\n")
        
        while True:
            try:
                user_input = input("You: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ["quit", "exit", "bye", "goodbye"]:
                    print("\nWhisper: Goodbye! Have a great day!\n")
                    break
                
                self.process_input(user_input)
                
            except KeyboardInterrupt:
                print("\n\nWhisper: Goodbye! Have a great day!\n")
                break
            except Exception as e:
                print(f"Error: {e}\n")


if __name__ == "__main__":
    demo = WhisperDemo()
    demo.run()
