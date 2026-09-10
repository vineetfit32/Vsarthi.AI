// server/routes/prescription.js
// VSarthi.AI — AI Prescription Scanner Backend Route
// Processing pipeline: Image → Validation → AI Vision → Structured Extraction → Safety Check → Response
import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { scanPrescription } from '../services/aiService.js';
import { checkMedicationSafety } from '../services/safetyService.js';

const router = express.Router();

// ─── Allowed MIME Types ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif',
];

// ─── Image Validation ─────────────────────────────────────────────────────────
function validateImageData(base64, mimeType) {
  const errors = [];

  if (!base64 || typeof base64 !== 'string') {
    errors.push('No image data provided.');
  } else {
    const estimatedBytes = (base64.length * 3) / 4;
    if (estimatedBytes < 1000) {
      errors.push('Image is too small or corrupted.');
    }
    if (estimatedBytes > 8 * 1024 * 1024) {
      errors.push('Image is too large. Maximum size is 8MB. Please compress the image and try again.');
    }
    // Validate base64 format
    if (!/^[A-Za-z0-9+/=]+$/.test(base64.slice(0, 100))) {
      errors.push('Invalid image format. Please upload a valid image file.');
    }
  }

  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    errors.push(`Unsupported image type. Please upload a JPEG, PNG, or WebP image.`);
  }

  return errors;
}

// ─── Generate "What Should I Do Next?" Guidance ───────────────────────────────
function generateNextStepsGuidance(extractedData) {
  const warnings = extractedData.warnings || [];
  const medicines = extractedData.medicines || [];
  const diagnosis = extractedData.diagnosis?.value || '';
  const followUp = extractedData.followUp?.value || '';

  const guidance = {
    urgencyLevel: 'routine',
    urgencyLabel: 'Routine',
    urgencyColor: 'green',
    steps: [],
    consultationType: null,
  };

  // Check for emergency indicators in warnings or diagnosis
  const emergencyTerms = ['emergency', 'urgent', 'immediate', 'severe', 'critical', 'chest pain', 'stroke', 'sepsis'];
  const hasEmergencyIndicator = emergencyTerms.some(term =>
    diagnosis.toLowerCase().includes(term) ||
    warnings.some(w => w.toLowerCase().includes(term))
  );

  if (hasEmergencyIndicator) {
    guidance.urgencyLevel = 'emergency';
    guidance.urgencyLabel = 'Emergency';
    guidance.urgencyColor = 'red';
    guidance.steps.push('Seek immediate emergency medical care — call 112 or go to the nearest Emergency Department.');
  }

  // Standard guidance
  guidance.steps.push('Follow all instructions written by your prescribing doctor exactly as stated.');

  if (medicines.length > 0) {
    guidance.steps.push('Take all medicines at the prescribed times and doses. Do not skip or double doses.');
    guidance.steps.push('If you are unsure about any medicine instruction, ask your pharmacist before taking it.');
  }

  if (followUp.length > 0 && !followUp.includes('Unable') && !followUp.includes('Not mentioned')) {
    guidance.steps.push(`Follow-up: ${followUp}`);
  }

  if (warnings.length > 0) {
    guidance.steps.push('Review the safety flags highlighted below and discuss them with your doctor or pharmacist.');
  }

  guidance.steps.push('Do not change your dosage or stop medication without consulting your doctor.');
  guidance.steps.push('If you experience any unexpected side effects, contact your doctor or pharmacist promptly.');

  // Determine consultation type
  const diagnosisLower = diagnosis.toLowerCase();
  if (diagnosisLower.includes('hypertension') || diagnosisLower.includes('blood pressure')) {
    guidance.consultationType = { specialty: 'Cardiologist or General Physician', reason: 'Blood pressure management' };
  } else if (diagnosisLower.includes('diabetes') || diagnosisLower.includes('glyc')) {
    guidance.consultationType = { specialty: 'Endocrinologist or General Physician', reason: 'Diabetes management' };
  } else if (diagnosisLower.includes('thyroid')) {
    guidance.consultationType = { specialty: 'Endocrinologist', reason: 'Thyroid management' };
  } else if (diagnosisLower.includes('joint') || diagnosisLower.includes('arthrit')) {
    guidance.consultationType = { specialty: 'Rheumatologist or Orthopedist', reason: 'Joint condition management' };
  } else {
    guidance.consultationType = { specialty: 'General Physician', reason: 'Prescription follow-up' };
  }

  return guidance;
}

// ─── POST /api/prescription/scan ─────────────────────────────────────────────
router.post('/scan', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg', filename = 'prescription', sessionId } = req.body;

  // Validate image input
  const validationErrors = validateImageData(imageBase64, mimeType);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: 'validation_failed',
      message: validationErrors[0],
      details: validationErrors,
    });
  }

  // Sanitize filename
  const safeFilename = (filename || 'prescription')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);

  try {
    // Call AI vision service
    const scanResult = await scanPrescription(imageBase64, mimeType, safeFilename);

    if (!scanResult.success) {
      return res.status(502).json({
        error: scanResult.error || 'scan_failed',
        message: scanResult.message || 'We could not analyze this prescription. Please try again.',
        isAIError: true,
      });
    }

    const extractedData = scanResult.data;

    // Run medication safety checks
    const medicineNames = (extractedData.medicines || [])
      .map(med => ({ name: med.name?.value || '' }))
      .filter(med => med.name && !med.name.includes('Unable'));

    const safetyFlags = checkMedicationSafety({
      medications: medicineNames,
      allergyHistory: '',
      currentMedsDetail: '',
    });

    // Generate next steps guidance
    const guidance = generateNextStepsGuidance(extractedData);

    // Store the scan result in database
    const prescriptionRecord = db.collection('prescriptions').insert({
      sessionId: sessionId || null,
      filename: safeFilename,
      mimeType,
      status: 'extracted',
      extractedData,
      safetyFlags,
      guidance,
      overallConfidence: scanResult.overallConfidence || 'medium',
      userConfirmed: false,
      confirmedData: null,
      imageStoredAt: null, // We don't store images for privacy
      scannedAt: new Date().toISOString(),
    });

    db.logAudit({
      actorRole: 'patient',
      actorId: sessionId || 'anonymous',
      action: 'PRESCRIPTION_SCANNED',
      targetType: 'prescription',
      targetId: prescriptionRecord.id,
      details: {
        filename: safeFilename,
        medicinesFound: medicineNames.length,
        safetyFlagsCount: safetyFlags.length,
        confidence: scanResult.overallConfidence,
      },
    });

    return res.status(201).json({
      success: true,
      prescriptionId: prescriptionRecord.id,
      extractedData,
      safetyFlags,
      guidance,
      overallConfidence: scanResult.overallConfidence || 'medium',
      processingNote: 'AI-extracted data requires user review before clinical use. Please verify all fields.',
    });

  } catch (err) {
    console.error('[Prescription Route] Error:', err.message);
    return res.status(500).json({
      error: 'unexpected_error',
      message: 'We couldn\'t process this prescription. Please try again with a clearer image.',
    });
  }
});

// ─── GET /api/prescription/:id ────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const record = db.collection('prescriptions').findById(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Prescription scan not found.' });
  }
  res.json({ success: true, prescription: record });
});

// ─── PUT /api/prescription/:id/confirm ───────────────────────────────────────
// User reviews and confirms (possibly corrected) OCR results
router.put('/:id/confirm', (req, res) => {
  const { confirmedData, userNotes } = req.body;

  const record = db.collection('prescriptions').findById(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Prescription scan not found.' });
  }

  const updated = db.collection('prescriptions').update(req.params.id, {
    userConfirmed: true,
    confirmedData: confirmedData || record.extractedData,
    userNotes: (userNotes || '').slice(0, 1000),
    confirmedAt: new Date().toISOString(),
  });

  db.logAudit({
    actorRole: 'patient',
    actorId: record.sessionId || 'anonymous',
    action: 'PRESCRIPTION_CONFIRMED',
    targetType: 'prescription',
    targetId: record.id,
    details: { userConfirmed: true, hasCorrections: !!confirmedData },
  });

  res.json({ success: true, prescription: updated });
});

// ─── DELETE /api/prescription/:id ────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const record = db.collection('prescriptions').findById(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Prescription scan not found.' });
  }

  db.collection('prescriptions').delete(req.params.id);

  db.logAudit({
    actorRole: 'patient',
    actorId: record.sessionId || 'anonymous',
    action: 'PRESCRIPTION_DELETED',
    targetType: 'prescription',
    targetId: req.params.id,
    details: { filename: record.filename },
  });

  res.json({ success: true, message: 'Prescription scan deleted.' });
});

export default router;
