// services/asr.js
// Web Speech API wrapper — swap-in ready for Bhashini / AI4Bharat ASR
// Swap-in: replace startRecognition() with your ASR API call

let recognition = null;

export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startRecognition({ locale = 'en-IN', onResult, onError, onEnd }) {
  if (!isSpeechRecognitionSupported()) {
    onError?.('Speech recognition not supported in this browser. Please use Chrome or Edge.');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = locale;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    onResult?.({ final: finalTranscript, interim: interimTranscript });
  };

  recognition.onerror = (event) => {
    onError?.(event.error);
  };

  recognition.onend = () => {
    onEnd?.();
  };

  recognition.start();
  return recognition;
}

export function stopRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}
