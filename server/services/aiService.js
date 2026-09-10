// server/services/aiService.js
// VSarthi.AI — Server-side AI Service (Groq API Integration)
// All API keys stay server-side. Frontend never touches AI keys.
import Groq from 'groq-sdk';

// ─── AI Client Setup ──────────────────────────────────────────────────────────
function createGroqClient() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return null;
  }
  return new Groq({ apiKey });
}

// ─── Healthcare System Prompt ─────────────────────────────────────────────────
const HEALTHCARE_SYSTEM_PROMPT = `You are VSarthi, an AI healthcare assistant for an Indian hospital OPD (Outpatient Department) intake platform. Your role is to help patients and healthcare staff.

CRITICAL SAFETY RULES:
1. You are NOT a doctor and must NEVER diagnose diseases or prescribe medicines.
2. For potentially serious symptoms (chest pain, difficulty breathing, stroke signs, severe bleeding, unconsciousness), ALWAYS recommend immediate emergency medical care (call 112 or go to Emergency Department NOW).
3. You can explain medical terminology and general health information in simple language.
4. You can help patients prepare questions for their doctor.
5. Always recommend consulting a qualified healthcare professional for medical decisions.
6. Do not make definitive medical claims. Use phrases like "generally," "typically," "a doctor can evaluate this."
7. Be empathetic, clear, and professional.
8. Respond in the language the user writes in (English or Hindi).

YOUR CAPABILITIES:
- Explain medical terms in simple language
- Describe common symptoms and what they might mean generally
- Help interpret prescription instructions (e.g., "take twice daily with food")
- Recommend the appropriate type of doctor to consult
- Explain general health and wellness information
- Guide patients through the hospital intake process
- Answer questions about the VSarthi platform

SPECIALTY REFERRAL GUIDANCE (when asked who to see):
- Heart/chest problems → Cardiologist
- Bone/joint pain → Orthopedist or Rheumatologist  
- Skin conditions → Dermatologist
- Eye problems → Ophthalmologist
- Child health → Pediatrician
- Women's health → Gynecologist
- Diabetes/thyroid → Endocrinologist
- General illness → General Physician (GP) or Family Doctor
- Dental → Dentist
- Nervous system → Neurologist
- Mental health → Psychiatrist or Psychologist
- Urinary issues → Urologist
- Stomach/digestive → Gastroenterologist
- Emergency → Emergency Department (call 112)

Always end with a reminder: "This is general information only. Please consult a qualified doctor for medical advice specific to your situation."`;

const PRESCRIPTION_EXTRACTION_PROMPT = `You are a medical document extraction assistant. Extract information from the prescription image description provided.

Extract the following fields if visible. For each field, indicate confidence level (high/medium/low) and if the field cannot be read, set value to "Unable to reliably read this field."

Return a JSON object with this exact structure:
{
  "patientName": { "value": "...", "confidence": "high|medium|low" },
  "patientAge": { "value": "...", "confidence": "high|medium|low" },
  "date": { "value": "...", "confidence": "high|medium|low" },
  "doctorName": { "value": "...", "confidence": "high|medium|low" },
  "doctorRegistration": { "value": "...", "confidence": "high|medium|low" },
  "hospitalClinic": { "value": "...", "confidence": "high|medium|low" },
  "diagnosis": { "value": "...", "confidence": "high|medium|low" },
  "clinicalNotes": { "value": "...", "confidence": "high|medium|low" },
  "medicines": [
    {
      "name": { "value": "...", "confidence": "high|medium|low" },
      "strength": { "value": "...", "confidence": "high|medium|low" },
      "frequency": { "value": "...", "confidence": "high|medium|low" },
      "duration": { "value": "...", "confidence": "high|medium|low" },
      "route": { "value": "...", "confidence": "high|medium|low" },
      "instructions": { "value": "...", "confidence": "high|medium|low" }
    }
  ],
  "investigations": { "value": "...", "confidence": "high|medium|low" },
  "followUp": { "value": "...", "confidence": "high|medium|low" },
  "overallConfidence": "high|medium|low",
  "readabilityIssues": ["list of any issues detected"],
  "warnings": ["list of any safety warnings to flag"]
}

RULES:
- Never invent information that is not visible in the prescription
- If a field is not present on the prescription, set value to "Not mentioned on prescription"
- If a field is present but illegible, set value to "Unable to reliably read this field"
- Do not guess medicine names — if unclear, say "Unable to reliably read this field"
- For the diagnosis field: only report what is explicitly written. Do not infer.`;

// ─── Chat Message Handler ─────────────────────────────────────────────────────
export async function answerHealthQuestion(message, conversationHistory = []) {
  const groq = createGroqClient();

  if (!groq) {
    return {
      success: false,
      error: 'ai_not_configured',
      reply: 'The AI assistant is currently not configured. Please contact the system administrator to set up the AI API key.',
    };
  }

  // Sanitize input
  const sanitizedMessage = (message || '').trim().slice(0, 2000);
  if (!sanitizedMessage) {
    return { success: false, error: 'empty_message', reply: 'Please type a message.' };
  }

  // Build conversation messages for context
  const messages = [
    { role: 'system', content: HEALTHCARE_SYSTEM_PROMPT },
    // Include recent history (last 10 turns max to control token usage)
    ...conversationHistory.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: sanitizedMessage },
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error('Empty response from AI service');
    }

    // Safety check: flag potential emergencies
    const emergencyKeywords = [
      'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'unconscious',
      'severe bleeding', 'not breathing', 'anaphylaxis', 'seizure', 'severe allergic',
      'सीने में दर्द', 'बेहोश', 'सांस नहीं'
    ];
    const isEmergencyQuery = emergencyKeywords.some(kw =>
      sanitizedMessage.toLowerCase().includes(kw.toLowerCase())
    );

    return {
      success: true,
      reply,
      isEmergencyFlag: isEmergencyQuery,
      usage: completion.usage,
    };
  } catch (err) {
    console.error('[AI Service] Chat error:', err.message);

    // Handle specific Groq API errors
    if (err.status === 401 || err.message?.includes('Invalid API Key')) {
      return {
        success: false,
        error: 'invalid_api_key',
        reply: 'The AI service is currently unavailable due to a configuration issue. Please try again later or contact the hospital staff for assistance.',
      };
    }

    if (err.status === 429) {
      return {
        success: false,
        error: 'rate_limited',
        reply: 'The AI assistant is experiencing high demand. Please wait a moment and try again.',
      };
    }

    return {
      success: false,
      error: 'ai_error',
      reply: 'I\'m having trouble connecting right now. Please try again in a moment, or speak to hospital staff if you need immediate help.',
    };
  }
}

// ─── Prescription Scanner ─────────────────────────────────────────────────────
export async function scanPrescription(imageBase64, mimeType = 'image/jpeg', filename = 'prescription') {
  const groq = createGroqClient();

  if (!groq) {
    return {
      success: false,
      error: 'ai_not_configured',
      message: 'AI service is not configured. Please set AI_API_KEY in server environment.',
    };
  }

  // Validate image data
  if (!imageBase64 || imageBase64.length < 100) {
    return {
      success: false,
      error: 'invalid_image',
      message: 'Invalid image data received.',
    };
  }

  // Check file size (limit to ~5MB base64 = ~3.75MB file)
  const estimatedBytes = (imageBase64.length * 3) / 4;
  if (estimatedBytes > 5 * 1024 * 1024) {
    return {
      success: false,
      error: 'image_too_large',
      message: 'Image is too large. Please upload an image smaller than 5MB.',
    };
  }

  try {
    // Use Groq vision model (llama-4-scout or llava-v1.5-7b-4096-preview)
    // If vision model is not available, fall back to describing the document type
    const visionModel = 'meta-llama/llama-4-scout-17b-16e-instruct';

    const completion = await groq.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: PRESCRIPTION_EXTRACTION_PROMPT + `\n\nFilename hint: ${filename}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1, // Low temperature for factual extraction
    });

    const responseText = completion.choices?.[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error('Empty response from vision AI');
    }

    // Parse JSON response
    let extracted;
    try {
      // Extract JSON from response (it may have surrounding text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // If JSON parsing fails, return a structured error
      return {
        success: false,
        error: 'parse_error',
        message: 'Could not parse the prescription data. The image may be unclear or not a prescription.',
        rawResponse: responseText,
      };
    }

    // Validate and sanitize the extracted data
    const sanitized = sanitizePrescriptionData(extracted);

    return {
      success: true,
      data: sanitized,
      overallConfidence: sanitized.overallConfidence || 'medium',
      processingNote: 'Extracted using AI vision. Please review all fields carefully before use.',
    };

  } catch (err) {
    console.error('[AI Service] Prescription scan error:', err.message);

    if (err.status === 400 || err.message?.includes('image')) {
      return {
        success: false,
        error: 'image_processing_failed',
        message: 'We could not process this image. Please ensure it is a clear, well-lit photo of a prescription and try again.',
      };
    }

    if (err.status === 429) {
      return {
        success: false,
        error: 'rate_limited',
        message: 'The scanning service is busy. Please try again in a moment.',
      };
    }

    // Model may not support vision — fall back gracefully
    if (err.message?.includes('model') || err.status === 404) {
      return {
        success: false,
        error: 'vision_unavailable',
        message: 'Prescription image analysis is temporarily unavailable. Please manually enter the prescription details or try again later.',
      };
    }

    return {
      success: false,
      error: 'scan_failed',
      message: 'We couldn\'t analyze this prescription. Please try again with a clearer image, or enter the details manually.',
    };
  }
}

// ─── Sanitize / Validate Extracted Data ──────────────────────────────────────
function sanitizePrescriptionData(raw) {
  const safeField = (field) => {
    if (!field || typeof field !== 'object') {
      return { value: 'Unable to reliably read this field.', confidence: 'low' };
    }
    const val = (field.value || '').trim();
    return {
      value: val || 'Unable to reliably read this field.',
      confidence: ['high', 'medium', 'low'].includes(field.confidence) ? field.confidence : 'low',
    };
  };

  const safeMedicines = (meds) => {
    if (!Array.isArray(meds)) return [];
    return meds.map(med => ({
      name: safeField(med?.name),
      strength: safeField(med?.strength),
      frequency: safeField(med?.frequency),
      duration: safeField(med?.duration),
      route: safeField(med?.route),
      instructions: safeField(med?.instructions),
    })).filter(med => {
      // Keep only medicines where name is not empty/unreadable
      return med.name.value && !med.name.value.includes('Unable to reliably');
    });
  };

  return {
    patientName: safeField(raw.patientName),
    patientAge: safeField(raw.patientAge),
    date: safeField(raw.date),
    doctorName: safeField(raw.doctorName),
    doctorRegistration: safeField(raw.doctorRegistration),
    hospitalClinic: safeField(raw.hospitalClinic),
    diagnosis: safeField(raw.diagnosis),
    clinicalNotes: safeField(raw.clinicalNotes),
    medicines: safeMedicines(raw.medicines),
    investigations: safeField(raw.investigations),
    followUp: safeField(raw.followUp),
    overallConfidence: ['high', 'medium', 'low'].includes(raw.overallConfidence) ? raw.overallConfidence : 'medium',
    readabilityIssues: Array.isArray(raw.readabilityIssues) ? raw.readabilityIssues.filter(i => typeof i === 'string') : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings.filter(w => typeof w === 'string').slice(0, 10) : [],
  };
}

export default { answerHealthQuestion, scanPrescription };
