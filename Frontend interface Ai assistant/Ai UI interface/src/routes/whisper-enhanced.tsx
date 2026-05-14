import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Copy,
  AlertCircle,
  Volume2,
  Zap,
  Settings,
  ChevronDown,
  Loader,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AppState {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  isListening: boolean;
  isSpeaking: boolean;
  isOnline: boolean;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function WhisperEnhanced() {
  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>({
    status: 'idle',
    isListening: false,
    isSpeaking: false,
    isOnline: navigator.onLine,
  });
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveCaption, setLiveCaption] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout>();
  const finalTranscriptRef = useRef<string>('');

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setAppState((prev) => ({ ...prev, isListening: true, status: 'listening' }));
      setLiveTranscript('');
      setError('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const displayText = finalTranscript || interimTranscript;
      setLiveTranscript(displayText);
      setLiveCaption(displayText);

      if (finalTranscript) {
        finalTranscriptRef.current = finalTranscript;
      } else if (interimTranscript) {
        finalTranscriptRef.current = interimTranscript;
      }
    };

    recognition.onend = async () => {
      setAppState((prev) => ({ ...prev, isListening: false }));

      const capturedTranscript = finalTranscriptRef.current.trim();

      if (capturedTranscript) {
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: capturedTranscript,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        finalTranscriptRef.current = '';
        setLiveTranscript('');

        // Get AI response
        await generateAndSpeakResponse(capturedTranscript);
      } else {
        setLiveTranscript('');
        finalTranscriptRef.current = '';
      }
    };

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setAppState((prev) => ({ ...prev, isListening: false }));
    };

    recognitionRef.current = recognition;

    // Greeting on mount
    setTimeout(() => {
      const greeting = "Hi there! I'm Whisper, your AI assistant. Click the microphone button to speak with me, or type your message below. I'm powered by Groq and Gemini AI with offline support!";
      const greetingMessage: Message = {
        id: 'greeting',
        role: 'ai',
        text: greeting,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
      speakText(greeting);
    }, 500);

    return () => {
      recognition.abort();
    };
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setAppState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setAppState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Text-to-speech
  const speakText = useCallback(async (text: string) => {
    setAppState((prev) => ({ ...prev, isSpeaking: true, status: 'speaking' }));

    try {
      // Try to use ElevenLabs API if online
      if (appState.isOnline) {
        const response = await fetch(`${API_BASE}/api/voice/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          if (audioRef.current) {
            audioRef.current.src = url;
            await audioRef.current.play();
          }
        } else {
          // Fallback to browser speech synthesis
          useBrowserSpeech(text);
        }
      } else {
        // Offline: use browser speech synthesis
        useBrowserSpeech(text);
      }
    } catch (err) {
      console.error('TTS error:', err);
      useBrowserSpeech(text);
    } finally {
      setAppState((prev) => ({ ...prev, isSpeaking: false, status: 'idle' }));
    }
  }, [appState.isOnline]);

  // Browser speech synthesis fallback
  const useBrowserSpeech = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.3; // Slightly higher for young girl voice effect
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
  };

  // Generate AI response
  const generateAndSpeakResponse = async (userInput: string) => {
    setAppState((prev) => ({ ...prev, status: 'thinking' }));

    try {
      if (appState.isOnline) {
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userInput }),
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const aiResponse = data.ai_response;

        // Add AI message
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: aiResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Speak response
        await speakText(aiResponse);
      } else {
        // Offline response
        const offlineResponse = await generateOfflineResponse(userInput);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: offlineResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        await speakText(offlineResponse);
      }
    } catch (err) {
      console.error('Response generation error:', err);
      setError('Failed to generate response');
    }
  };

  // Offline response generation
  const generateOfflineResponse = async (userInput: string): Promise<string> => {
    const lower = userInput.toLowerCase();

    if (/hello|hi|hey|greetings/.test(lower)) {
      return "Hello! I'm Whisper, your AI assistant. Even though I'm working offline, I can still help you with many things.";
    }
    if (/time|what.*time/.test(lower)) {
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    }
    if (/date|today/.test(lower)) {
      return `Today is ${new Date().toLocaleDateString()}.`;
    }
    if (/[+\-*/]/.test(userInput)) {
      try {
        const result = eval(userInput);
        return `The answer is ${result}.`;
      } catch {
        return "I can help with simple math. Could you rephrase?";
      }
    }

    return `I received your message: "${userInput}". I'm currently offline, so I can answer time/date questions and do math. For more advanced responses, I need internet.`;
  };

  // Handle text input
  const sendMessage = async (text?: string) => {
    const messageText = (text || userInput).trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');

    // Get AI response
    await generateAndSpeakResponse(messageText);
  };

  // Start listening
  const startListening = () => {
    if (recognitionRef.current && !appState.isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Recognition start error:', err);
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current && appState.isListening) {
      recognitionRef.current.stop();
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-black/40 border-b border-purple-500/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Whisper AI Assistant</h1>
            <p className="text-purple-300 text-sm">Powered by Groq, Gemini & ElevenLabs</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
              {appState.isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-xs">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs">Offline Mode</span>
                </>
              )}
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-purple-500/20 rounded-lg transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col gap-4 p-4">
        {/* Chat Area */}
        <div className="flex-1 bg-black/30 rounded-xl border border-purple-500/20 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Waiting for your first message...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-600/40 border border-purple-500/50'
                      : 'bg-blue-600/30 border border-blue-500/30'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  {msg.role === 'ai' && (
                    <button
                      onClick={() => copyToClipboard(msg.text)}
                      className="mt-2 text-xs text-gray-400 hover:text-white transition flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Live Caption */}
        {liveCaption && (
          <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-3 text-center">
            <p className="text-yellow-200">{liveCaption}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-black/30 rounded-xl border border-purple-500/20 p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message or use voice..."
              className="flex-1 bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              disabled={appState.isListening || appState.isSpeaking}
            />
            <button
              onClick={() => sendMessage()}
              disabled={appState.isListening || appState.isSpeaking || !userInput.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 p-2 rounded-lg transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={appState.isListening ? stopListening : startListening}
              disabled={appState.isSpeaking}
              className={`flex-1 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                appState.isListening
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:bg-gray-600`}
            >
              {appState.isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Start Listening
                </>
              )}
            </button>

            <button
              disabled={!messages.some((m) => m.role === 'ai')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition flex items-center gap-2"
              onClick={() => setMessages([])}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Status and Errors */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="text-center text-gray-400 text-xs">
          {appState.status === 'listening' && 'Listening...'}
          {appState.status === 'thinking' && 'Thinking...'}
          {appState.status === 'speaking' && 'Speaking...'}
          {appState.status === 'idle' && `${messages.length} messages`}
        </div>
      </div>

      {/* Audio element */}
      <audio ref={audioRef} />
    </div>
  );
}

export default WhisperEnhanced;
