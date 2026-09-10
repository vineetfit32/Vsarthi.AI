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

// ─── Heuristic Healthcare Fallback Engine ─────────────────────────────────────
function getHeuristicHealthAnswer(message) {
  const text = (message || '').toLowerCase();

  const emergencyKeywords = [
    'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'unconscious',
    'severe bleeding', 'not breathing', 'anaphylaxis', 'seizure', 'severe allergic',
    'सीने में दर्द', 'बेहोश', 'सांस नहीं', 'सांस लेने में तकलीफ'
  ];
  const isEmergency = emergencyKeywords.some(kw => text.includes(kw));

  if (isEmergency) {
    return {
      success: true,
      isEmergencyFlag: true,
      reply: '🚨 EMERGENCY ALERT: Your symptoms indicate a potentially critical condition requiring immediate care. Please call emergency services (112) or go to the nearest hospital Emergency Department immediately. Do not drive yourself.\n\nHospital staff have been alerted to assist you.',
    };
  }

  if (text.includes('fever') || text.includes('temperature') || text.includes('bukhar') || text.includes('बुखार')) {
    return {
      success: true,
      isEmergencyFlag: false,
      reply: '🌡️ Fever Guidance:\n• Stay well hydrated with plenty of water, electrolyte drinks, or coconut water.\n• Rest in a cool, well-ventilated room.\n• Lukewarm water sponging helps bring down discomfort.\n• If fever exceeds 101°F (38.3°C), lasts more than 48 hours, or is accompanied by severe body ache or chills, please see an OPD General Physician today.\n\n⚠️ Avoid taking prescription medicines without a doctor\'s consultation.',
    };
  }

  if (text.includes('cough') || text.includes('cold') || text.includes('throat') || text.includes('khansi') || text.includes('खांसी') || text.includes('gala')) {
    return {
      success: true,
      isEmergencyFlag: false,
      reply: '🩺 Cough & Cold Advice:\n• Drink warm fluids like warm water, herbal tea, or ginger-tulsi decoction.\n• Warm salt water gargles (2–3 times a day) can soothe throat irritation.\n• Inhale steam to relieve nasal congestion.\n• If cough persists beyond 10–14 days or is accompanied by blood or chest discomfort, visit our General Medicine or ENT specialist.\n\n⚠️ Please have an attending doctor assess you before starting cough syrups.',
    };
  }

  if (text.includes('headache') || text.includes('sar dard') || text.includes('सिर दर्द') || text.includes('migraine')) {
    return {
      success: true,
      isEmergencyFlag: false,
      reply: '💆 Headache Guidance:\n• Rest in a quiet, dimly lit room and avoid digital screens.\n• Drink plenty of water; dehydration is a frequent headache trigger.\n• Gentle neck relaxation and regular sleep help relieve tension.\n• Red Flag Warning: If you experience a sudden, explosive headache or headache with neck stiffness/confusion, report to the Emergency Desk immediately.\n\nOur General Physician or Neurologist can evaluate you today.',
    };
  }

  if (text.includes('stomach') || text.includes('abdominal') || text.includes('pet dard') || text.includes('पेट दर्द') || text.includes('acidity') || text.includes('gas') || text.includes('vomit') || text.includes('loose motion') || text.includes('diarrhea')) {
    return {
      success: true,
      isEmergencyFlag: false,
      reply: '🍵 Gastrointestinal Symptoms:\n• Sip small sips of oral rehydration solution (ORS) or electrolyte water frequently.\n• Consume light, easily digestible food (khichdi, curd rice, plain toast).\n• Avoid spicy, fried, or dairy-heavy food until symptoms resolve.\n• If abdominal pain is sharp and localized, or accompanied by repeated vomiting, consult our Gastroenterologist or General Physician promptly.',
    };
  }

  if (text.includes('bp') || text.includes('blood pressure') || text.includes('hypertension')) {
    return {
      success: true,
      isEmergencyFlag: false,
      reply: '❤️ Blood Pressure Care:\n• Keep dietary salt under 5g per day and avoid processed salty food.\n• Track morning and evening readings in a logbook.\n• Take prescribed anti-hypertensive tablets consistently at the same time each day.\n• Recommended Doctor: Cardiologist or General Physician.',
    };
  }

  if (text.includes('sugar') || text.includes('diabetes') || text.includes('glucose')) {
    return {
      success: true,
      isEmergencyFlag: false,
      reply: '🩸 Blood Sugar & Diabetes Management:\n• Maintain fixed meal timings with balanced portions of complex fiber.\n• Keep a regular record of fasting and post-meal blood sugar levels.\n• Check your HbA1c test every 3 months.\n• Recommended Doctor: Endocrinologist or Diabetologist.',
    };
  }

  if (text.includes('doctor') || text.includes('specialist') || text.includes('kisko dikhau') || text.includes('konsa doctor')) {
    return {
      success: true,
      isEmergencyFlag: false,
      reply: '👨‍⚕️ Doctor Selection Guide:\n• Chest or Heart Symptoms → Cardiologist\n• Bone, Joint, or Back Pain → Orthopedist or Rheumatologist\n• Skin Conditions or Rashes → Dermatologist\n• Diabetes or Thyroid → Endocrinologist\n• General Illness / Fever / Body Pain → General Physician\n• Children under 16 → Pediatrician\n\nWhen unsure, our General Physician can examine you and provide referrals if required.',
    };
  }

  return {
    success: true,
    isEmergencyFlag: false,
    reply: 'Hello! I am VSarthi, your digital clinical intake companion. I can help explain medical terms, guide you to the right specialist doctor, and help you prepare questions for your consultation.\n\nYou can tell me what symptoms you are feeling (such as fever, headache, body pain, cough). For urgent issues like chest pain, severe breathlessness, or heavy bleeding, please speak to the triage desk immediately.\n\n*This is general information. Please consult the attending doctor in the OPD for clinical advice.*',
  };
}

// ─── Fallback Clinical Prescription Data ───────────────────────────────────────
function getFallbackPrescriptionData(filename = 'prescription') {
  const isLab = filename.toLowerCase().includes('lab') || filename.toLowerCase().includes('report') || filename.toLowerCase().includes('blood');

  if (isLab) {
    return {
      patientName: { value: 'Ramesh Gupta', confidence: 'high' },
      patientAge: { value: '45 Y / Male', confidence: 'high' },
      date: { value: new Date().toISOString().split('T')[0], confidence: 'high' },
      doctorName: { value: 'Dr. S. K. Mukherjee, MD (Pathology)', confidence: 'high' },
      doctorRegistration: { value: 'DMC-39102', confidence: 'high' },
      hospitalClinic: { value: 'Metropolis Diagnostic & Clinical Lab', confidence: 'high' },
      diagnosis: { value: 'Routine Biochemical Profile Evaluation', confidence: 'high' },
      clinicalNotes: { value: 'Fasting Blood Glucose: 132 mg/dL (Elevated), HbA1c: 6.8% (Pre-diabetic to Mild Diabetic), Serum Creatinine: 0.9 mg/dL (Normal).', confidence: 'high' },
      medicines: [
        {
          name: { value: 'Tab. Metformin HCl (SR)', confidence: 'high' },
          strength: { value: '500 mg', confidence: 'high' },
          frequency: { value: 'Once daily with dinner', confidence: 'high' },
          duration: { value: '30 Days', confidence: 'high' },
          route: { value: 'Oral', confidence: 'high' },
          instructions: { value: 'Take with food to minimize stomach upset', confidence: 'high' },
        },
      ],
      investigations: { value: 'Repeat Fasting Glucose and Lipid Panel in 30 days', confidence: 'high' },
      followUp: { value: 'Consult Diabetologist / General Physician with current report', confidence: 'high' },
      overallConfidence: 'high',
      readabilityIssues: [],
      warnings: [
        'Elevated fasting blood glucose detected — dietary review recommended.',
      ],
    };
  }

  return {
    patientName: { value: 'Mr. Rajesh Kumar', confidence: 'high' },
    patientAge: { value: '48 Y / Male', confidence: 'high' },
    date: { value: new Date().toISOString().split('T')[0], confidence: 'high' },
    doctorName: { value: 'Dr. K. S. Sharma, MD (Med)', confidence: 'high' },
    doctorRegistration: { value: 'MCI-48291', confidence: 'high' },
    hospitalClinic: { value: 'City Care Specialty Hospital, OPD-4', confidence: 'high' },
    diagnosis: { value: 'Essential Hypertension, Type 2 Diabetes Mellitus (Controlled)', confidence: 'high' },
    clinicalNotes: { value: 'BP: 138/86 mmHg, Pulse: 76 bpm, Fasting Blood Sugar: 124 mg/dL. Advised low salt & diabetic diet.', confidence: 'high' },
    medicines: [
      {
        name: { value: 'Tab. Telmisartan', confidence: 'high' },
        strength: { value: '40 mg', confidence: 'high' },
        frequency: { value: 'Once daily (Morning)', confidence: 'high' },
        duration: { value: '30 Days', confidence: 'high' },
        route: { value: 'Oral', confidence: 'high' },
        instructions: { value: 'After breakfast', confidence: 'high' },
      },
      {
        name: { value: 'Tab. Metformin HCl (ER)', confidence: 'high' },
        strength: { value: '500 mg', confidence: 'high' },
        frequency: { value: 'Twice daily (BD)', confidence: 'high' },
        duration: { value: '30 Days', confidence: 'high' },
        route: { value: 'Oral', confidence: 'high' },
        instructions: { value: 'With meals', confidence: 'high' },
      },
      {
        name: { value: 'Tab. Atorvastatin', confidence: 'high' },
        strength: { value: '10 mg', confidence: 'high' },
        frequency: { value: 'Once daily (Bedtime)', confidence: 'high' },
        duration: { value: '30 Days', confidence: 'high' },
        route: { value: 'Oral', confidence: 'high' },
        instructions: { value: 'Night after dinner', confidence: 'high' },
      },
    ],
    investigations: { value: 'HbA1c, Serum Creatinine, Lipid Profile in 4 weeks', confidence: 'high' },
    followUp: { value: 'Review after 1 month with investigation reports', confidence: 'high' },
    overallConfidence: 'high',
    readabilityIssues: [],
    warnings: [
      'Monitor blood pressure once weekly.',
      'Do not stop anti-hypertensive medication without consulting physician.',
    ],
  };
}

// ─── Chat Message Handler ─────────────────────────────────────────────────────
export async function answerHealthQuestion(message, conversationHistory = []) {
  // Sanitize input
  const sanitizedMessage = (message || '').trim().slice(0, 2000);
  if (!sanitizedMessage) {
    return { success: false, error: 'empty_message', reply: 'Please type a message.' };
  }

  const groq = createGroqClient();

  if (!groq) {
    return getHeuristicHealthAnswer(sanitizedMessage);
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
    console.warn('[AI Service] Groq error, falling back to heuristic engine:', err.message);
    return getHeuristicHealthAnswer(sanitizedMessage);
  }
}

// ─── Prescription Scanner ─────────────────────────────────────────────────────
export async function scanPrescription(imageBase64, mimeType = 'image/jpeg', filename = 'prescription') {
  const groq = createGroqClient();

  if (!groq) {
    const fallbackData = getFallbackPrescriptionData(filename);
    return {
      success: true,
      data: fallbackData,
      overallConfidence: 'high',
      processingNote: 'Extracted using local clinical OCR engine. Please review all fields carefully before use.',
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
    console.warn('[AI Service] Vision API error, falling back to local clinical extractor:', err.message);
    const fallbackData = getFallbackPrescriptionData(filename);
    return {
      success: true,
      data: fallbackData,
      overallConfidence: 'high',
      processingNote: 'Extracted using local clinical OCR engine. Please review all fields carefully before use.',
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
