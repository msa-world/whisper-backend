#!/usr/bin/env python3
"""
Mock Whisper API Server - Fully Functional Demo
Works WITHOUT LiveKit, provides instant responses like Alexa/Siri
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
from datetime import datetime
import threading

class WhisperAPIHandler(BaseHTTPRequestHandler):
    """Handle API requests and return mock responses"""
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        path = self.path
        
        # Health check endpoint
        if path == '/healthz':
            response = json.dumps({"status": "ok", "message": "Whisper AI is healthy"})
            self.wfile.write(response.encode())
        
        # Greeting endpoint
        elif path == '/greeting':
            greeting = "Hi! I'm Whisper, your AI assistant. You can ask me about weather, search the web, find YouTube videos, or just chat with me. Go ahead and speak or type your question!"
            response = json.dumps({"greeting": greeting})
            self.wfile.write(response.encode())
        
        else:
            response = json.dumps({"error": "Not found"})
            self.wfile.write(response.encode())
    
    def do_POST(self):
        """Handle POST requests for processing queries"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body.decode())
            query = data.get('query', '').lower()
            
            response = self.process_query(query)
            self.wfile.write(json.dumps(response).encode())
        except Exception as e:
            error_response = json.dumps({"error": str(e), "response": "Sorry, I encountered an error processing your request."})
            self.wfile.write(error_response.encode())
    
    def process_query(self, query):
        """Process user query and return AI-like response"""
        
        # Weather queries
        if 'weather' in query:
            for word in ['in', 'at', 'around']:
                if word in query:
                    location = query.split(word)[1].strip().rstrip('?')
                    return {
                        "response": f"The weather in {location} is currently sunny with a temperature of 72 degrees Fahrenheit. There's a light breeze at 8 miles per hour. It looks like a beautiful day!",
                        "type": "weather"
                    }
            return {
                "response": "I can tell you the weather for any location. Just ask 'What is the weather in [city]?'",
                "type": "weather"
            }
        
        # YouTube search
        if 'youtube' in query or ('search' in query and 'youtube' in query):
            topic = query.replace('youtube', '').replace('search', '').strip()
            videos = [
                f"Tutorial: {topic} for Beginners",
                f"Complete Guide to {topic}",
                f"{topic} - Full Course"
            ]
            response_text = f"I found several YouTube videos about {topic}. Here are the top results: " + ", ".join(videos)
            return {
                "response": response_text,
                "type": "youtube"
            }
        
        # Web search
        if 'search' in query and 'youtube' not in query:
            topic = query.replace('search', '').replace('for', '').strip()
            return {
                "response": f"I found information about {topic}. {topic} is a fascinating topic with many interesting applications. Would you like to know more about any specific aspect?",
                "type": "search"
            }
        
        # Time queries
        if 'time' in query:
            current_time = datetime.now().strftime("%I:%M %p")
            return {
                "response": f"The current time is {current_time}.",
                "type": "time"
            }
        
        # Greeting queries
        if query in ['hi', 'hello', 'hey', 'what is up', 'how are you']:
            greetings = [
                "Hello! I'm doing great. How can I help you today?",
                "Hi there! What would you like to know?",
                "Hey! I'm here to help. What do you need?",
                "Hello! Ask me anything - I'm ready to help!"
            ]
            return {
                "response": greetings[len(query) % len(greetings)],
                "type": "greeting"
            }
        
        # Math queries
        if any(op in query for op in ['+', 'plus', '-', 'minus', '*', 'times', '/', 'divided']):
            return {
                "response": "I can help with math! For example, if you ask 'What is 10 plus 5?', I'll tell you the answer is 15. Try asking a math question!",
                "type": "math"
            }
        
        # AI questions
        if 'artificial intelligence' in query or 'ai' in query:
            return {
                "response": "Artificial Intelligence, or AI, refers to computer systems designed to perform tasks that typically require human intelligence. This includes learning from experience, recognizing patterns, understanding language, and making decisions. AI is used in many applications today, from virtual assistants like me to recommendation systems and autonomous vehicles.",
                "type": "knowledge"
            }
        
        # Python questions
        if 'python' in query:
            return {
                "response": "Python is a popular programming language known for its simplicity and readability. It's widely used in web development, data science, artificial intelligence, and many other fields. Would you like to know more about learning Python or its applications?",
                "type": "knowledge"
            }
        
        # Default response
        return {
            "response": f"That's an interesting question about '{query}'. I can help you with weather, search topics, YouTube videos, time, math, and general knowledge questions. Feel free to ask me anything!",
            "type": "general"
        }
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        print(f"[Whisper API] {format % args}")


def run_server(port=8000):
    """Start the mock API server"""
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, WhisperAPIHandler)
    print(f"[Whisper API] Starting server on port {port}...")
    print(f"[Whisper API] API running at http://localhost:{port}")
    print(f"[Whisper API] Health check: http://localhost:{port}/healthz")
    print(f"[Whisper API] Greeting: http://localhost:{port}/greeting")
    print("[Whisper API] Ready to receive queries!")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Whisper API] Shutting down...")
        httpd.shutdown()


if __name__ == "__main__":
    run_server(8000)
