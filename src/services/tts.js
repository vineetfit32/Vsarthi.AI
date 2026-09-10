// services/tts.js
// Browser SpeechSynthesis wrapper — swap-in ready for Bhashini / AI4Bharat TTS

let currentUtterance = null;

export function isTTSSupported() {
  return 'speechSynthesis' in window;
}

export function speak(text, { lang = 'en-IN', rate = 0.9, pitch = 1, onEnd } = {}) {
  if (!isTTSSupported()) return;
  stopSpeaking();

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = lang;
  currentUtterance.rate = rate;
  currentUtterance.pitch = pitch;

  // Try to find a voice for the language
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
  if (match) currentUtterance.voice = match;

  currentUtterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(currentUtterance);
}

export function stopSpeaking() {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking() {
  return isTTSSupported() && window.speechSynthesis.speaking;
}
