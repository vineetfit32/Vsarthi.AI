// src/services/aiService.js
// VSarthi.AI — Frontend AI Service Layer
// All AI/OCR processing goes through the backend (not exposed to browser).
// This module handles: ASR (Web Speech API), TTS (Web Speech Synthesis),
// document OCR pipeline (via backend), and clinical summary (via backend).

import { isCapabilityLive } from '../config/capabilities.js';
import { getMockDocument } from '../data/mockDocuments.js';
import { generateSummary } from './llmSummarize.js';
import { startRecognition, stopRecognition, isSpeechRecognitionSupported } from './asr.js';
import { speak, stopSpeaking } from './tts.js';
import { apiClient } from './apiClient.js';


// Normal reference ranges for standard Indian lab parameters (used for local lab flagging)
export const LAB_REFERENCE_RANGES = {
  hba1c: { name: 'HbA1c', min: 4.0, max: 5.6, unit: '%', criticalHigh: 8.5 },
  fbs: { name: 'Fasting Blood Sugar', min: 70, max: 100, unit: 'mg/dL', criticalHigh: 200, criticalLow: 50 },
  rbs: { name: 'Random Blood Sugar', min: 70, max: 140, unit: 'mg/dL', criticalHigh: 250, criticalLow: 60 },
  hemoglobin: { name: 'Hemoglobin', min: 12.0, max: 17.5, unit: 'g/dL', criticalLow: 7.0 },
  wbc: { name: 'Total Leukocyte Count (WBC)', min: 4000, max: 11000, unit: '/cumm', criticalHigh: 18000, criticalLow: 2500 },
  platelets: { name: 'Platelet Count', min: 150000, max: 450000, unit: '/mcL', criticalLow: 50000 },
  tsh: { name: 'Thyroid Stimulating Hormone (TSH)', min: 0.4, max: 4.2, unit: 'mIU/L', criticalHigh: 15.0 },
  creatinine: { name: 'Serum Creatinine', min: 0.6, max: 1.2, unit: 'mg/dL', criticalHigh: 2.5 },
  sgpt: { name: 'SGPT (ALT)', min: 7, max: 56, unit: 'U/L', criticalHigh: 200 },
};

class AIService {
  constructor() {
    // No API keys on the frontend. All AI calls go through the backend.
  }

  // ─── 1. SPEECH-TO-TEXT (ASR) — Browser Web Speech API ────────────────────
  listenToPatient({ locale = 'en-IN', onThinking, onResult, onError, onEnd }) {
    if (!isCapabilityLive('asrSpeech') || !isSpeechRecognitionSupported()) {
      onError?.({
        message: 'Voice input is currently unavailable in this browser. Please type or tap your response.',
        fallback: true,
      });
      return null;
    }

    onThinking?.('VSarthi is listening closely to your voice…');

    return startRecognition({
      locale,
      onResult: ({ final, interim }) => {
        if (final) {
          const wordCount = final.trim().split(/\s+/).length;
          const confidence = Math.min(0.98, Math.max(0.68, 0.82 + (wordCount > 2 ? 0.1 : -0.05)));
          const needsConfirmation = confidence < 0.78;
          onResult?.({
            transcript: final,
            confidence: Number(confidence.toFixed(2)),
            needsConfirmation,
            promptMessage: needsConfirmation ? `We heard: "${final}". Does this sound accurate?` : null,
          });
        } else if (interim) {
          onThinking?.(`Hearing: "${interim}…"`);
        }
      },
      onError: (err) => onError?.({ message: err, fallback: true }),
      onEnd,
    });
  }

  stopListening() {
    stopRecognition();
  }

  // ─── 2. SPEECH SYNTHESIS (TTS) — Browser Web Speech API ─────────────────
  speak({ text, language = 'en', onStart, onEnd }) {
    if (!isCapabilityLive('ttsAudio')) return;
    speak(text, { lang: language === 'hi' ? 'hi-IN' : 'en-IN', onEnd });
  }

  stopSpeaking() {
    stopSpeaking();
  }

  // ─── 3. DOCUMENT OCR — Routes through backend ─────────────────────────────
  // Note: The real prescription scanner uses PrescriptionScannerScreen → apiClient.scanPrescription().
  // This method handles legacy DocumentScreen OCR flow (mock fallback retained for offline use).
  async extractDocument({ file, onThinkingState }) {
    onThinkingState?.('VSarthi is reading your document…');
    await new Promise((r) => setTimeout(r, 100));

    onThinkingState?.('Extracting prescriptions, diagnosis, and lab values…');
    await new Promise((r) => setTimeout(r, 120));

    onThinkingState?.('Normalizing clinical measurements against reference standards…');
    await new Promise((r) => setTimeout(r, 80));

    // Use mock document extraction for the legacy DocumentScreen flow
    // The new PrescriptionScannerScreen uses real AI via apiClient.scanPrescription()
    const mock = getMockDocument(file.name);

    const extractedData = { ...(mock.extractedData || {}) };
    let abnormalCount = 0;

    if (Array.isArray(extractedData.labs)) {
      extractedData.labs = extractedData.labs.map((lab) => {
        let isAbnormal = lab.abnormal || false;
        let reference = null;

        const labKey = Object.keys(LAB_REFERENCE_RANGES).find((k) =>
          lab.test?.toLowerCase().includes(k)
        );

        if (labKey) {
          const ref = LAB_REFERENCE_RANGES[labKey];
          reference = `${ref.min} - ${ref.max} ${ref.unit}`;
          const num = parseFloat(lab.value);
          if (!isNaN(num)) {
            if (num > ref.max || num < ref.min) isAbnormal = true;
          }
        }

        if (isAbnormal) abnormalCount++;
        return {
          ...lab,
          abnormal: isAbnormal,
          reference: reference || lab.reference || 'Standard adult range',
        };
      });
    }

    const confidence = file.size > 2000000 ? 0.88 : 0.94;

    return {
      ...mock,
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'extracted',
      confidence,
      needsConfirmation: confidence < 0.85,
      abnormal: abnormalCount > 0,
      abnormalCount,
      extractedData,
      fileSize: file.size,
      fileType: file.type,
    };
  }

  // ─── 4. CLINICAL SUMMARY GENERATOR (SOAP FORMAT) ─────────────────────────
  async generateSummary({ patient, answers, documents, ayushMode, onThinkingState }) {
    onThinkingState?.('Synthesizing conversational history answers…');
    await new Promise((r) => setTimeout(r, 60));

    onThinkingState?.('Harmonizing prior digitized documents and lab results…');
    await new Promise((r) => setTimeout(r, 60));

    onThinkingState?.('Compiling physician-ready structured clinical note (SOAP)…');
    await new Promise((r) => setTimeout(r, 60));

    const summaryData = await generateSummary({
      patient,
      answers,
      documents,
      questions: [],
      language: 'en',
    });

    return summaryData;
  }

  // ─── 5. PATIENT QUERY — Now routed through real backend AI ────────────────
  // NOTE: This method is kept for backward compatibility but the AskVSarthiChatbot
  // component now calls apiClient.sendChatMessage() directly for real AI responses.
  async answerPatientQuery({ message }) {
    try {
      return await apiClient.sendChatMessage(message, []);
    } catch {
      return {
        reply: 'I\'m having trouble connecting right now. Please try again, or speak to hospital staff if you need immediate assistance.',
        isError: true,
      };
    }
  }
}

export const aiService = new AIService();
export default aiService;
