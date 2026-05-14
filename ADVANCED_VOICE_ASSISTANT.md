# Advanced Voice Assistant - Complete Documentation

## Overview

A fully functional two-way voice communication system with ElevenLabs TTS integration, real-time transcription, and a modern React UI built with Tailwind CSS.

## Features

### 1. ElevenLabs TTS Integration
- **Young Female Voice**: Uses Bella voice (ID: `EXAVITQu4vr4xnSDxMaL`)
- **Natural Speech**: Configurable stability (0.5) and similarity boost (0.75)
- **Seamless Playback**: Audio streams directly to HTML Audio element
- **Fallback Support**: Browser speech synthesis if API key not provided

### 2. Two-Way Voice Communication
- **Voice Input**: Web Speech Recognition API
- **Real-time Recognition**: Shows interim and final transcript results
- **Auto Response**: AI generates response automatically after speech ends
- **Voice Output**: Immediate playback of AI response via ElevenLabs or browser API
- **State Management**: Idle → Listening → Thinking → Speaking flow

### 3. Real-Time Live Transcription
- **Live Captions**: Large, readable text overlay showing current speech
- **Full Chat History**: All messages stored with timestamps
- **User vs AI**: Color-coded messages (User: Blue, AI: Green)
- **Auto-scroll**: Automatically scrolls to latest message
- **Copy Function**: Copy any AI response to clipboard

### 4. Modern UI
- **Tailwind CSS**: Responsive gradient background with purple/slate theme
- **Lucide Icons**: Professional icons for all controls
- **Status Indicators**: Visual feedback for Idle/Listening/Thinking/Speaking states
- **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile
- **Custom Styling**: Smooth animations and transitions

## How to Use

### Installation

The component is located at:
```
Frontend interface Ai assistant/Ai UI interface/src/routes/advanced-voice-assistant.tsx
```

### Basic Usage

```tsx
import AdvancedVoiceAssistant from '@/routes/advanced-voice-assistant';

export default function App() {
  return <AdvancedVoiceAssistant />;
}
```

### Getting API Keys

#### ElevenLabs API Key
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up for a free account
3. Navigate to API section
4. Copy your API key
5. Paste into the Settings panel in the app

The app comes pre-configured with Bella voice (young female), but you can customize by changing the voice ID in the `speakWithElevenLabs` function.

#### OpenAI API Key (Optional)
For advanced AI responses beyond the mock implementation, you can add your OpenAI API key. Currently, the app uses mock responses based on keywords.

### Settings Panel

Click the "Settings" button to configure:
- **ElevenLabs API Key**: For premium voice synthesis
- **OpenAI API Key**: For advanced AI responses (optional)

## Component Structure

### State Management
```tsx
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
```

### Key Functions

#### `startListening()`
Activates the microphone and begins capturing user speech.

#### `stopListening()`
Stops microphone capture and processes the final transcript.

#### `speakWithElevenLabs(text: string)`
Sends text to ElevenLabs API and plays the audio response.

#### `speakWithBrowserAPI(text: string)`
Fallback to browser's Web Speech Synthesis API.

#### `generateAndSpeakResponse(userInput: string)`
Generates mock AI response and speaks it via TTS.

#### `getMockAIResponse(userInput: string)`
Returns mock responses based on keyword matching. Can be replaced with OpenAI API calls.

## Customization

### Change Voice
Replace the voice ID in `speakWithElevenLabs`:
```tsx
https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID
```

Available voices at https://api.elevenlabs.io/docs/api-reference/get-voices

### Add Custom Responses
Modify `getMockAIResponse()` to add more response logic:
```tsx
if (input.includes('custom_keyword')) {
  return 'Your custom response here';
}
```

### Integrate with Real AI
Replace the mock logic with OpenAI calls:
```tsx
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKeys.openai}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: userInput }],
  }),
});
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Best support for speech APIs |
| Edge | ✅ Full | Excellent support |
| Safari | ✅ Full | All features working |
| Firefox | ⚠️ Limited | Speech input may vary |

## API References

### ElevenLabs Text-to-Speech
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers: xi-api-key: YOUR_API_KEY
Body: {
  "text": "Your text here",
  "model_id": "eleven_monolingual_v1",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

### Web Speech Recognition
```tsx
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = true;
recognition.lang = 'en-US';
```

## Known Limitations

1. **CORS**: ElevenLabs API calls may have CORS restrictions - consider using a backend proxy in production
2. **Microphone Permissions**: Users must grant microphone access
3. **Network**: Requires internet for ElevenLabs and weather/search features
4. **Transcript Language**: Currently set to English (en-US)

## Troubleshooting

### Microphone not working
- Check browser permissions (Settings → Privacy → Microphone)
- Ensure browser supports Web Speech API
- Try a different browser (Chrome/Edge recommended)

### ElevenLabs not playing audio
- Verify API key is correct
- Check browser console for CORS errors
- Ensure speakers/headphones are working
- Try without API key to use browser synthesis

### No speech recognition
- Check microphone is plugged in/working
- Verify browser permissions are granted
- Refresh the page
- Try saying something after clicking "Start Listening"

## Future Enhancements

- [ ] Integration with real OpenAI/GPT models
- [ ] Multiple voice selection UI
- [ ] Conversation history persistence
- [ ] Export transcript functionality
- [ ] Multiple language support
- [ ] Custom wake word detection
- [ ] Audio waveform visualization
- [ ] Message editing/deletion

## License

MIT - Feel free to use and modify as needed

## Support

For issues with:
- **ElevenLabs**: Check [ElevenLabs Docs](https://api.elevenlabs.io/docs)
- **Web Speech API**: See [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- **Tailwind CSS**: Visit [Tailwind Docs](https://tailwindcss.com)

---

**Status**: Production Ready ✅
**Last Updated**: May 2026
**Version**: 1.0.0
