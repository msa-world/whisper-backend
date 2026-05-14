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
}

export function AdvancedVoiceAssistant() {
  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>({
    status: 'idle',
    isListening: false,
    isSpeaking: false,
  });
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveCaption, setLiveCaption] = useState('');
  const [apiKeys, setApiKeys] = useState({
    elevenlabs: '',
    openai: '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setAppState((prev) => ({
        ...prev,
        isListening: true,
        status: 'listening',
      }));
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

      // Clear caption after a delay if no new input
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
      if (!interimTranscript && !finalTranscript) {
        transcriptTimeoutRef.current = setTimeout(() => {
          setLiveCaption('');
        }, 3000);
      }
    };

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setAppState((prev) => ({
        ...prev,
        isListening: false,
        status: 'idle',
      }));
    };

    recognition.onend = async () => {
      setAppState((prev) => ({
        ...prev,
        isListening: false,
      }));

      if (liveTranscript.trim()) {
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: liveTranscript,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Generate AI response
        await generateAndSpeakResponse(liveTranscript);
      }

      setLiveTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [liveTranscript]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mock AI response generator
  const getMockAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    // Weather responses
    if (input.includes('weather')) {
      return 'The weather today is partly cloudy with a high of 72 degrees Fahrenheit. There\'s a gentle breeze from the west at 8 miles per hour. Perfect day to go outside!';
    }

    // Time responses
    if (input.includes('time') || input.includes('what time')) {
      const time = new Date().toLocaleTimeString();
      return `The current time is ${time}.`;
    }

    // YouTube responses
    if (input.includes('youtube') || input.includes('video')) {
      return 'I found several popular videos related to your search. You can check out tutorials, reviews, and compilations on YouTube. Would you like me to recommend something specific?';
    }

    // Greeting responses
    if (
      input.includes('hello') ||
      input.includes('hi') ||
      input.includes('hey')
    ) {
      return "Hello! I'm your advanced voice assistant powered by ElevenLabs and advanced speech recognition. How can I help you today?";
    }

    // Default response
    return `That's interesting. I understand you said "${userInput}". I'm here to help with weather, time, YouTube searches, and much more. Feel free to ask me anything!`;
  };

  // ElevenLabs TTS Integration
  const speakWithElevenLabs = async (text: string): Promise<void> => {
    if (!apiKeys.elevenlabs) {
      console.warn('ElevenLabs API key not set, using browser synthesis');
      speakWithBrowserAPI(text);
      return;
    }

    try {
      setAppState((prev) => ({
        ...prev,
        status: 'speaking',
        isSpeaking: true,
      }));

      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKeys.elevenlabs,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setAppState((prev) => ({
            ...prev,
            status: 'idle',
            isSpeaking: false,
          }));
        };
        audioRef.current.play();
      }
    } catch (err) {
      console.error('ElevenLabs error:', err);
      setError(`TTS Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      speakWithBrowserAPI(text);
    }
  };

  // Fallback: Browser API TTS
  const speakWithBrowserAPI = (text: string): void => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;

    utterance.onstart = () => {
      setAppState((prev) => ({
        ...prev,
        status: 'speaking',
        isSpeaking: true,
      }));
    };

    utterance.onend = () => {
      setAppState((prev) => ({
        ...prev,
        status: 'idle',
        isSpeaking: false,
      }));
    };

    utterance.onerror = () => {
      setAppState((prev) => ({
        ...prev,
        status: 'idle',
        isSpeaking: false,
      }));
    };

    window.speechSynthesis.speak(utterance);
  };

  // Generate and speak AI response
  const generateAndSpeakResponse = async (userInput: string): Promise<void> => {
    setAppState((prev) => ({
      ...prev,
      status: 'thinking',
    }));

    // Simulate thinking delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const aiResponse = getMockAIResponse(userInput);

    // Add AI message
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: aiResponse,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);

    // Speak response
    await speakWithElevenLabs(aiResponse);
  };

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !appState.isListening) {
      recognitionRef.current.start();
    }
  }, [appState.isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && appState.isListening) {
      recognitionRef.current.abort();
    }
  }, [appState.isListening]);

  // Handle text input submission
  const handleTextSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements[0] as HTMLInputElement).value;

    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    (e.currentTarget.elements[0] as HTMLInputElement).value = '';

    // Generate and speak response
    await generateAndSpeakResponse(input);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Get status color and icon
  const getStatusColor = () => {
    switch (appState.status) {
      case 'listening':
        return 'text-red-500';
      case 'thinking':
        return 'text-blue-500';
      case 'speaking':
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = () => {
    switch (appState.status) {
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      <audio ref={audioRef} />

      {/* Settings Panel */}
      <div className="max-w-4xl mx-auto mb-6">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
        >
          <Settings size={18} />
          <span>Settings</span>
          <ChevronDown
            size={18}
            className={`transition-transform ${showSettings ? 'rotate-180' : ''}`}
          />
        </button>

        {showSettings && (
          <div className="mt-4 bg-slate-800 p-6 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                ElevenLabs API Key
              </label>
              <input
                type="password"
                placeholder="sk_..."
                value={apiKeys.elevenlabs}
                onChange={(e) =>
                  setApiKeys((prev) => ({
                    ...prev,
                    elevenlabs: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Get your key from elevenlabs.io. Uses Bella voice (EXAVITQu4vr4xnSDxMaL)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                OpenAI API Key (Optional)
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKeys.openai}
                onChange={(e) =>
                  setApiKeys((prev) => ({
                    ...prev,
                    openai: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                For advanced AI responses (currently using mock responses)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Advanced Voice Assistant
          </h1>
          <p className="text-gray-300">
            Two-way voice communication with ElevenLabs TTS & Live Transcription
          </p>
        </div>

        {/* Status Indicator */}
        <div className="mb-6 p-4 bg-slate-800 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor()}`} />
            <span className="font-semibold">{getStatusLabel()}</span>
          </div>
          {apiKeys.elevenlabs && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Zap size={16} />
              <span>ElevenLabs Active</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-600 rounded-lg flex gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-200">{error}</p>
              <p className="text-sm text-red-300 mt-1">
                The app will continue working with the browser's default speech synthesis.
              </p>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 h-[500px] overflow-y-auto space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Mic size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-semibold">No messages yet</p>
              <p className="text-sm">Click the microphone below or type to start conversing</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : 'bg-slate-700 text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm font-semibold mb-1">
                      {message.role === 'user' ? 'You' : 'Whisper AI'}
                    </p>
                    <p className="break-words">{message.text}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {message.role === 'ai' && (
                      <button
                        onClick={() => copyToClipboard(message.text)}
                        className="mt-2 text-xs hover:opacity-75 transition flex items-center gap-1"
                      >
                        <Copy size={14} />
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Live Caption Overlay */}
        {liveCaption && (
          <div className="mb-6 p-4 bg-slate-800 border-2 border-purple-500 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-300">{liveCaption}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="space-y-4">
          {/* Voice Control Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={startListening}
              disabled={appState.isListening || appState.isSpeaking}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                appState.isListening
                  ? 'bg-red-600 text-white cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              <Mic size={20} />
              {appState.isListening ? 'Listening...' : 'Start Listening'}
            </button>

            {appState.isListening && (
              <button
                onClick={stopListening}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-orange-600 hover:bg-orange-700 text-white transition"
              >
                <MicOff size={20} />
                Stop
              </button>
            )}

            {appState.isSpeaking && (
              <button
                disabled
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-green-600 text-white cursor-not-allowed"
              >
                <Volume2 size={20} className="animate-pulse" />
                Speaking...
              </button>
            )}

            {appState.status === 'thinking' && (
              <button
                disabled
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white cursor-not-allowed"
              >
                <Loader size={20} className="animate-spin" />
                Thinking...
              </button>
            )}
          </div>

          {/* Text Input Form */}
          <form onSubmit={handleTextSubmit} className="flex gap-3">
            <input
              type="text"
              placeholder="Or type your message here..."
              className="flex-1 px-4 py-3 bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500"
              disabled={appState.isListening || appState.isSpeaking}
            />
            <button
              type="submit"
              disabled={appState.isListening || appState.isSpeaking}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                appState.isListening || appState.isSpeaking
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <Send size={20} />
              Send
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>
            {apiKeys.elevenlabs
              ? '✓ Using ElevenLabs for natural voice synthesis'
              : '◆ Using browser speech synthesis (Add ElevenLabs key for premium voices)'}
          </p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(100, 116, 139, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
}

export default AdvancedVoiceAssistant;
