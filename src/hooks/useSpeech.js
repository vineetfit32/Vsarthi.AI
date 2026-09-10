import { useState, useRef, useCallback, useEffect } from 'react';
import { startRecognition, stopRecognition, isSpeechRecognitionSupported } from '../services/asr.js';
import { speak, stopSpeaking, isTTSSupported } from '../services/tts.js';

export function useSpeech({ lang = 'en', ttsEnabled = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechError, setSpeechError] = useState(null);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const recognitionRef = useRef(null);

  const sttLocaleMap = {
    en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
  };

  const startListening = useCallback(() => {
    setSpeechError(null);
    setTranscript('');
    setInterimText('');
    setIsListening(true);

    recognitionRef.current = startRecognition({
      locale: sttLocaleMap[lang] || 'en-IN',
      onResult: ({ final, interim }) => {
        if (final) setTranscript(final);
        setInterimText(interim);
      },
      onError: (err) => {
        setSpeechError(err);
        setIsListening(false);
      },
      onEnd: () => setIsListening(false),
    });
  }, [lang]);

  const stopListening = useCallback(() => {
    stopRecognition();
    setIsListening(false);
  }, []);

  const speakText = useCallback((text) => {
    if (!ttsEnabled || !isTTSSupported()) return;
    const ttsLangMap = {
      en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
    };
    setIsSpeakingState(true);
    speak(text, {
      lang: ttsLangMap[lang] || 'en-IN',
      rate: 0.88,
      onEnd: () => setIsSpeakingState(false),
    });
  }, [lang, ttsEnabled]);

  const stopSpeak = useCallback(() => {
    stopSpeaking();
    setIsSpeakingState(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
      stopSpeaking();
    };
  }, []);

  return {
    isListening,
    transcript,
    interimText,
    speechError,
    isSpeaking: isSpeakingState,
    startListening,
    stopListening,
    speakText,
    stopSpeak,
    sttSupported: isSpeechRecognitionSupported(),
    ttsSupported: isTTSSupported(),
    clearTranscript: () => { setTranscript(''); setInterimText(''); },
  };
}
