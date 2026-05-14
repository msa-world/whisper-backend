import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "listening" | "speaking" | "connecting" | "error";

// Backend API URL - use hardcoded localhost for development
const API_BASE = "http://localhost:8000";

// Offline fallback responses
function getOfflineResponse(input: string): string {
  const lower = input.toLowerCase().trim();

  if (["hello", "hi", "hey", "greetings"].some((w) => lower.includes(w))) {
    return "Hi! I'm Whisper. I'm your AI assistant with a beautiful young girl voice!";
  }
  if (["time", "what's the time", "current time"].some((w) => lower.includes(w))) {
    return `The current time is ${new Date().toLocaleTimeString()}.`;
  }
  if (["date", "what's the date", "today"].some((w) => lower.includes(w))) {
    return `Today is ${new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}.`;
  }
  if (["+", "-", "*", "/"].some((w) => lower.includes(w))) {
    try {
      const result = eval(lower.replace(/[^0-9+\-*/.()]/g, ""));
      return `The answer is ${result}.`;
    } catch {
      return "I can help with math. Could you rephrase your question?";
    }
  }

  return "I'm working offline right now. Please ensure you have an internet connection to use Groq and Gemini APIs for full responses.";
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

  // Speak text using ElevenLabs TTS via backend (with browser fallback)
  const speak = useCallback(async (text: string) => {
    console.log("[Whisper] Speaking via TTS:", text.substring(0, 50) + "...");
    setStatus("speaking");
    setReply(text);

    try {
      // Try ElevenLabs TTS via backend API
      const response = await fetch(`${API_BASE}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setStatus("idle");
          console.log("[Whisper] Finished speaking (ElevenLabs)");
        };

        audio.onerror = () => {
          console.warn("[Whisper] Audio playback failed, falling back to browser TTS");
          useBrowserTTS(text);
        };

        audio.play().catch(() => {
          console.warn("[Whisper] Could not play audio, using browser TTS");
          useBrowserTTS(text);
        });
      } else {
        console.warn("[Whisper] ElevenLabs API failed, using browser TTS");
        useBrowserTTS(text);
      }
    } catch (error) {
      console.warn("[Whisper] TTS error:", error);
      useBrowserTTS(text);
    }
  }, []);

  // Browser speech synthesis fallback
  const useBrowserTTS = useCallback((text: string) => {
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.2; // Higher pitch for young girl voice effect
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log("[Whisper] Speaking via browser TTS");
    };

    utterance.onend = () => {
      setStatus("idle");
      console.log("[Whisper] Finished speaking (browser TTS)");
    };

    utterance.onerror = (event) => {
      console.error("[Whisper] Speech error:", event.error);
      setStatus("idle");
    };

    synthRef.current.speak(utterance);
  }, []);

  // Process user input and generate response via backend API (Groq/Gemini)
  const processInput = useCallback(
    async (text: string) => {
      console.log("[Whisper] Processing input via Groq/Gemini API:", text);

      try {
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("[Whisper] API response:", data);
        await speak(data.ai_response);
      } catch (error) {
        console.error("[Whisper] API error:", error);
        // Fallback to offline response
        const fallbackResponse = getOfflineResponse(text);
        console.log("[Whisper] Using offline fallback response");
        await speak(fallbackResponse);
      }
    },
    [speak]
  );

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
      
      // Speak greeting automatically with backend TTS
      if (!greetingSpokenRef.current) {
        greetingSpokenRef.current = true;
        setTimeout(async () => {
          await speak(
            "Hi! I'm Whisper, your AI assistant with a beautiful young girl voice! I'm powered by Groq and Gemini AI. You can ask me about weather, search the web, find videos, or just chat. Tap the button to speak!"
          );
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
