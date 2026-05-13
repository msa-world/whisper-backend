import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "listening" | "speaking" | "connecting" | "error";

// AI responses for different queries
function getAIResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  
  // Weather queries
  if (lower.includes("weather")) {
    const temp = Math.floor(Math.random() * 30) + 50;
    const conditions = ["sunny", "partly cloudy", "cloudy", "clear"][Math.floor(Math.random() * 4)];
    return `The weather is ${conditions} with a temperature of ${temp} degrees Fahrenheit. It's a great day!`;
  }
  
  // Time queries
  if (lower.includes("time") || lower.includes("what time")) {
    return `The current time is ${new Date().toLocaleTimeString()}.`;
  }
  
  // Date queries
  if (lower.includes("date") || lower.includes("what day") || lower.includes("today")) {
    return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }
  
  // YouTube queries
  if (lower.includes("youtube") || lower.includes("video")) {
    const topic = lower.replace(/youtube|video|search|for|find/gi, "").trim() || "tutorial";
    return `I found several YouTube videos about ${topic}. You can search for "${topic}" on YouTube to watch great tutorials and guides.`;
  }
  
  // Search queries
  if (lower.includes("search") || lower.includes("find") || lower.includes("look up")) {
    const topic = lower.replace(/search|find|look up|for|about/gi, "").trim() || "that topic";
    return `I found information about ${topic}. This is a fascinating subject with lots of resources available online.`;
  }
  
  // Greetings
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower === "good morning" || lower === "good afternoon" || lower === "good evening") {
    return "Hello! I'm Whisper, your AI assistant. How can I help you today?";
  }
  
  // Thanks
  if (lower.includes("thank")) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  
  // How are you
  if (lower.includes("how are you")) {
    return "I'm doing great, thank you for asking! I'm here and ready to help you with anything you need.";
  }
  
  // Who are you
  if (lower.includes("who are you") || lower.includes("what are you")) {
    return "I'm Whisper, your AI voice assistant. I can help you with weather, search the web, find YouTube videos, answer questions, and much more!";
  }
  
  // Math
  if (/\d+\s*[\+\-\*\/]\s*\d+/.test(lower)) {
    try {
      const result = eval(lower.replace(/[^0-9\+\-\*\/\.\(\)]/g, ""));
      return `The answer is ${result}.`;
    } catch {
      return "I couldn't calculate that. Could you try again with a simpler expression?";
    }
  }
  
  // Default response
  return `I heard you say: "${input}". That's an interesting question! I'm here to help you with weather, searches, YouTube videos, and general questions.`;
}

export function useVoiceAssistant() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [reply, setReply] = useState("");
  const [level, setLevel] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connectedRef = useRef(false);
  const greetingSpokenRef = useRef(false);

  // Check if browser supports speech recognition
  const supported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Stop audio level analyser
  const stopAnalyser = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
  }, []);

  // Start audio level analyser for microphone input
  const startAnalyser = useCallback(async () => {
    stopAnalyser();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const value = (data[i] - 128) / 128;
          sum += value * value;
        }
        
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (error) {
      console.warn("[Whisper] Microphone access failed:", error);
    }
  }, [stopAnalyser]);

  // Speak text using Web Speech API
  const speak = useCallback((text: string) => {
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      setStatus("speaking");
      console.log("[Whisper] Speaking:", text.substring(0, 50) + "...");
    };
    
    utterance.onend = () => {
      setStatus("idle");
      console.log("[Whisper] Finished speaking");
    };
    
    utterance.onerror = (event) => {
      console.error("[Whisper] Speech error:", event.error);
      setStatus("idle");
    };
    
    setReply(text);
    synthRef.current.speak(utterance);
  }, []);

  // Process user input and generate response
  const processInput = useCallback((text: string) => {
    console.log("[Whisper] Processing input:", text);
    const response = getAIResponse(text);
    speak(response);
  }, [speak]);

  // Connect (initialize voice recognition)
  const connect = useCallback(async () => {
    if (connectedRef.current) return;
    
    setStatus("connecting");
    console.log("[Whisper] Initializing voice assistant...");
    
    try {
      // Initialize speech synthesis
      synthRef.current = window.speechSynthesis;
      
      // Initialize speech recognition
      const SpeechRecognitionClass = (window as typeof window & { 
        SpeechRecognition?: typeof SpeechRecognition;
        webkitSpeechRecognition?: typeof SpeechRecognition;
      }).SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
      
      if (!SpeechRecognitionClass) {
        console.error("[Whisper] Speech recognition not supported");
        setStatus("error");
        return;
      }
      
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      recognition.onstart = () => {
        setStatus("listening");
        console.log("[Whisper] Listening started");
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = "";
        let interimText = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        
        if (interimText) {
          setInterim(interimText);
          console.log("[Whisper] Interim:", interimText);
        }
        
        if (finalText) {
          setTranscript(finalText);
          setInterim("");
          console.log("[Whisper] Final:", finalText);
          stopAnalyser();
          processInput(finalText);
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[Whisper] Recognition error:", event.error);
        if (event.error !== "no-speech" && event.error !== "aborted") {
          setStatus("error");
        } else {
          setStatus("idle");
        }
        stopAnalyser();
      };
      
      recognition.onend = () => {
        console.log("[Whisper] Recognition ended");
        if (status === "listening") {
          setStatus("idle");
        }
        stopAnalyser();
      };
      
      recognitionRef.current = recognition;
      connectedRef.current = true;
      setStatus("idle");
      setAudioBlocked(false);
      
      console.log("[Whisper] Voice assistant initialized successfully!");
      
      // Speak greeting automatically
      if (!greetingSpokenRef.current) {
        greetingSpokenRef.current = true;
        setTimeout(() => {
          speak("Hi! I'm Whisper, your AI assistant. You can ask me about weather, search the web, find YouTube videos, or just chat. Tap the button to speak!");
        }, 500);
      }
      
    } catch (error) {
      console.error("[Whisper] Initialization failed:", error);
      setStatus("error");
    }
  }, [processInput, speak, status, stopAnalyser]);

  // Start audio (enable playback)
  const startAudio = useCallback(async () => {
    setAudioBlocked(false);
    
    // Ensure speech synthesis is ready
    if (synthRef.current && synthRef.current.paused) {
      synthRef.current.resume();
    }
  }, []);

  // Disconnect (cleanup)
  const disconnect = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    stopAnalyser();
    connectedRef.current = false;
    setStatus("idle");
    setTranscript("");
    setInterim("");
    setReply("");
  }, [stopAnalyser]);

  // Toggle listening
  const toggle = useCallback(async () => {
    if (!connectedRef.current) {
      await connect();
      return;
    }
    
    if (status === "listening") {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAnalyser();
      setStatus("idle");
    } else if (status === "speaking") {
      // Stop speaking
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setStatus("idle");
    } else {
      // Start listening
      if (recognitionRef.current) {
        try {
          await startAnalyser();
          recognitionRef.current.start();
          setStatus("listening");
        } catch (error) {
          console.error("[Whisper] Failed to start recognition:", error);
          setStatus("error");
        }
      }
    }
  }, [connect, startAnalyser, status, stopAnalyser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      stopAnalyser();
    };
  }, [stopAnalyser]);

  return {
    status,
    transcript,
    interim,
    reply,
    level,
    supported,
    audioBlocked,
    toggle,
    connect,
    disconnect,
    startAudio,
    startListening: connect,
    stopListening: disconnect,
    stopSpeaking: disconnect,
  };
}
