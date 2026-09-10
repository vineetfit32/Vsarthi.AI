// src/config/capabilities.js
// VSarthi.AI — Capability Registry Pattern
// Central declaration of all external integrations, their live/fallback status,
// and graceful degradation chains.

const isBrowserSpeechSupported = () => {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

const isBrowserTtsSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
};

// Initial capability registry definition
export const CAPABILITIES = {
  abhaAuth: {
    id: 'abhaAuth',
    name: 'ABHA / ABDM Gateway',
    category: 'Authentication & Identity',
    description: 'National Health ID verification via ABDM sandbox/production gateway.',
    live: true, 
    mode: 'SANDBOX_GATEWAY',
    fallback: 'mobile_otp',
    fallbackLabel: 'Mobile Number + SMS OTP',
    latencyMs: 380,
  },

  smsGateway: {
    id: 'smsGateway',
    name: 'SMS OTP Gateway',
    category: 'Authentication & Identity',
    description: 'Two-factor SMS verification with telecom delivery gateway.',
    live: true,
    mode: 'SIMULATED_LOCAL',
    fallback: 'email_otp',
    fallbackLabel: 'Email OTP / Magic Link',
    latencyMs: 250,
  },

  emailService: {
    id: 'emailService',
    name: 'Email Magic Link / OTP',
    category: 'Authentication & Identity',
    description: 'Transactional email authentication service.',
    live: false, // Intentionally declared unavailable to demonstrate graceful "Coming Soon" fallback
    mode: 'COMING_SOON',
    fallback: 'guest_walkin',
    fallbackLabel: 'Guest / Desk Walk-in Registration',
    latencyMs: null,
  },

  guestRegistration: {
    id: 'guestRegistration',
    name: 'Guest / Desk Walk-in Registration',
    category: 'Authentication & Identity',
    description: 'Immediate patient intake with hospital desk verification badge.',
    live: true,
    mode: 'ALWAYS_AVAILABLE',
    fallback: null,
    fallbackLabel: 'None (Final Fallback)',
    latencyMs: 50,
  },

  llmDialogue: {
    id: 'llmDialogue',
    name: 'LLM Dialogue & Summarizer',
    category: 'Clinical Intelligence',
    description: 'Conversational clinical reasoning and automated SOAP history compiler.',
    live: true,
    mode: 'CLINICAL_ONTOLOGY_ENGINE',
    fallback: 'clinical_ontology_tree',
    fallbackLabel: 'Curated Clinical Ontology Decision Tree',
    latencyMs: 620,
  },

  ocrService: {
    id: 'ocrService',
    name: 'OCR & Document Vision Engine',
    category: 'Document Digitization',
    description: 'Digitizes prescription scans, lab reports, and flags abnormal values.',
    live: true,
    mode: 'SIMULATED_NEURAL_OCR',
    fallback: 'manual_data_entry',
    fallbackLabel: 'Assisted Manual Entry',
    latencyMs: 1200,
  },

  asrSpeech: {
    id: 'asrSpeech',
    name: 'Voice Input / Speech-to-Text (STT)',
    category: 'Multimodal Input',
    description: 'Hands-free voice recognition supporting Indian accents and regional locales.',
    live: isBrowserSpeechSupported(),
    mode: isBrowserSpeechSupported() ? 'WEB_SPEECH_API' : 'UNAVAILABLE',
    fallback: 'touch_typing',
    fallbackLabel: 'Touch / Keyboard Input',
    latencyMs: 180,
  },

  ttsAudio: {
    id: 'ttsAudio',
    name: 'Voice Prompts / Speech Synthesis (TTS)',
    category: 'Multimodal Input',
    description: 'Audio guidance for elderly and low-literacy patients in their mother tongue.',
    live: isBrowserTtsSupported(),
    mode: isBrowserTtsSupported() ? 'SPEECH_SYNTHESIS_API' : 'UNAVAILABLE',
    fallback: 'silent_text',
    fallbackLabel: 'Visual Text Only',
    latencyMs: 120,
  },

  hisInteroperability: {
    id: 'hisInteroperability',
    name: 'HL7 FHIR / Hospital Info System Gateway',
    category: 'Interoperability',
    description: 'Dispatches structured FHIR R4 Bundles to hospital EMR and ABDM HIE-CM.',
    live: true,
    mode: 'FHIR_R4_ADAPTER',
    fallback: 'local_json_export',
    fallbackLabel: 'Local File / JSON Export',
    latencyMs: 440,
  },
};

// In-memory override store for interactive demo toggle testing
let capabilityOverrides = {};

export function getCapability(key) {
  const base = CAPABILITIES[key];
  if (!base) return null;
  return { ...base, ...(capabilityOverrides[key] || {}) };
}

export function getAllCapabilities() {
  return Object.keys(CAPABILITIES).map(k => getCapability(k));
}

export function setCapabilityOverride(key, overrides) {
  capabilityOverrides[key] = { ...(capabilityOverrides[key] || {}), ...overrides };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vsarthi-capability-changed', { detail: { key, overrides } }));
  }
}

export function resetCapabilityOverrides() {
  capabilityOverrides = {};
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vsarthi-capability-changed', { detail: { reset: true } }));
  }
}

export function isCapabilityLive(key) {
  const cap = getCapability(key);
  return cap ? Boolean(cap.live) : false;
}
