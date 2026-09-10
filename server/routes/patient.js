// server/routes/patient.js
import express from 'express';
import db from '../db.js';
import { getABDMAdapter } from '../services/abdmService.js';

const router = express.Router();

// Generate next token (e.g. A-105)
function generateTokenNumber() {
  const existingCount = db.collection('sessions').count();
  return `A-${100 + existingCount + 1}`;
}

// POST /api/patient/session - Initialize new intake session
router.post('/session', (req, res) => {
  const { language = 'en', ayushMode = false, isKiosk = false } = req.body;
  const token = generateTokenNumber();

  const session = db.collection('sessions').insert({
    token,
    status: 'REGISTERED',
    priority: 'routine',
    language,
    ayushMode,
    isKiosk,
    redFlag: null,
    startedAt: new Date().toISOString(),
  });

  db.logAudit({
    actorRole: 'patient',
    actorId: session.id,
    action: 'SESSION_INITIALIZED',
    targetType: 'session',
    targetId: session.id,
    details: { token, language, isKiosk },
  });

  res.status(201).json({ session });
});

// GET /api/patient/lookup-abha/:abhaId
router.get('/lookup-abha/:abhaId', async (req, res) => {
  const { abhaId } = req.params;
  try {
    const adapter = getABDMAdapter();
    const result = await adapter.verifyAbha(abhaId);

    // Also check local database patients
    const cleanDigits = abhaId.replace(/\D/g, '');
    const localPatient = db.collection('patients').findOne({ abhaId: cleanDigits });

    if (localPatient) {
      return res.json({
        found: true,
        patient: localPatient,
        adapterMode: adapter.name,
      });
    }

    if (result.status === 'VERIFIED' && result.patient) {
      return res.json({
        found: true,
        patient: result.patient,
        adapterMode: adapter.name,
      });
    }

    return res.json({
      found: false,
      patient: null,
      message: 'ABHA ID not found in current directory. Please register.',
      adapterMode: adapter.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patient/register - Register patient or link to session
router.post('/register', (req, res) => {
  const { sessionId, name, dob, gender, phone, abhaId } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Patient name is required' });
  }

  const cleanAbha = (abhaId || '').replace(/\D/g, '');
  let patient = cleanAbha ? db.collection('patients').findOne({ abhaId: cleanAbha }) : null;

  if (!patient) {
    patient = db.collection('patients').insert({
      abhaId: cleanAbha,
      name: name.trim(),
      dob: dob || '',
      gender: gender || 'other',
      phone: phone || '',
    });
  }

  if (sessionId) {
    db.collection('sessions').update(sessionId, {
      patientId: patient.id,
      patientName: patient.name,
    });
  }

  res.status(201).json({ patient });
});

// POST /api/consent - Save DPDPA 2023 versioned consent
router.post('/consent', (req, res) => {
  const { sessionId, patientId, dataCapture, dataSharing, policyVersion = 'DPDPA-2023-V2.1' } = req.body;

  if (!dataCapture || !dataSharing) {
    return res.status(400).json({ error: 'Both data capture and sharing consents are required to proceed' });
  }

  const consent = db.collection('consents').insert({
    sessionId,
    patientId,
    dataCapture,
    dataSharing,
    policyVersion,
    acceptedAt: new Date().toISOString(),
    ipAddress: req.ip,
    revoked: false,
  });

  if (sessionId) {
    db.collection('sessions').update(sessionId, { status: 'CONSENTED' });
  }

  db.logAudit({
    actorRole: 'patient',
    actorId: patientId || sessionId || 'anonymous',
    action: 'CONSENT_RECORDED',
    targetType: 'consent',
    targetId: consent.id,
    details: { policyVersion, ip: req.ip },
  });

  res.status(201).json({ success: true, consent });
});

// GET /api/patient/timeline/:sessionId - Chronological medical timeline
router.get('/timeline/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const docs = db.collection('documents').find({ sessionId });
  const history = db.collection('clinical_histories').findOne({ sessionId });
  const session = db.collection('sessions').findById(sessionId);

  const timelineEvents = [];

  // 1. Documents events
  docs.forEach(doc => {
    const d = doc.extractedData || {};
    timelineEvents.push({
      id: doc.id,
      date: doc.uploadDate || '2024',
      type: doc.type || 'document',
      title: d.diagnosis || doc.name,
      source: doc.source || 'Medical Facility',
      medicines: d.medicines || [],
      labValues: d.labValues || [],
      abnormal: doc.abnormal || false,
      notes: d.notes || '',
    });
  });

  // 2. Self-reported past medical events
  if (history?.answers?.pastMedical) {
    const conditions = Array.isArray(history.answers.pastMedical)
      ? history.answers.pastMedical.filter(c => c !== 'none')
      : [history.answers.pastMedical];

    conditions.forEach(cond => {
      timelineEvents.push({
        id: `pmh_${cond}`,
        date: 'Prior History',
        type: 'past_medical',
        title: `Known ${cond.replace(/_/g, ' ')}`,
        source: 'Patient Direct History',
        abnormal: false,
      });
    });
  }

  // 3. Current consultation
  if (session) {
    timelineEvents.push({
      id: `current_${session.id}`,
      date: 'Today',
      type: 'consultation',
      title: session.chiefComplaintDisplay || 'Current Intake Consultation',
      source: 'VSarthi.AI Intake',
      abnormal: session.priority === 'critical',
      priority: session.priority,
    });
  }

  res.json({ events: timelineEvents });
});

export default router;
