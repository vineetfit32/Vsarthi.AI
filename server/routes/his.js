// server/routes/his.js
// VSarthi.AI Hospital Information System (HIS / EMR) API Routes
import express from 'express';
import db from '../db.js';
import hisService from '../services/hisService.js';
import { generateFHIRBundle } from '../services/abdmService.js';

const router = express.Router();

// ─── POST /api/his/export - Export clinical summary to hospital HIS / EMR ──────
router.post('/export', async (req, res) => {
  const { sessionId, format = 'fhir' } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const result = await hisService.exportRecord({ sessionId, format });
    res.json({
      success: true,
      token: result.transactionId,
      exportId: result.exportId,
      status: result.status,
      format: result.format,
      latencyMs: result.latencyMs,
      timestamp: result.timestamp,
      bundleSummary: result.bundleSummary,
    });
  } catch (err) {
    res.status(err.message === 'Session not found' ? 404 : 500).json({
      error: err.message || 'HIS export failed',
    });
  }
});

// ─── POST /api/his/patient-lookup - Look up patient in hospital system ─────────
router.post('/patient-lookup', async (req, res) => {
  const { identifier, type = 'MRN' } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'identifier is required' });
  }

  try {
    const result = await hisService.patientLookup({ identifier, type });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/his/appointment-link - Link intake to hospital appointment ──────
router.post('/appointment-link', async (req, res) => {
  const { sessionId, appointmentId, department, doctorId } = req.body;
  if (!sessionId || !appointmentId) {
    return res.status(400).json({ error: 'sessionId and appointmentId are required' });
  }

  try {
    const result = await hisService.linkAppointment({ sessionId, appointmentId, department, doctorId });
    res.json(result);
  } catch (err) {
    res.status(err.message === 'Session not found' ? 404 : 500).json({ error: err.message });
  }
});

// ─── GET /api/his/status/:exportId - Check export delivery status ──────────────
router.get('/status/:exportId', (req, res) => {
  const { exportId } = req.params;
  try {
    const record = hisService.getExportStatus(exportId);
    res.json({ success: true, export: record });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ─── POST /api/his/retry/:exportId - Retry failed export ──────────────────────
router.post('/retry/:exportId', async (req, res) => {
  const { exportId } = req.params;
  try {
    const result = await hisService.retryExport(exportId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/his/fhir/:sessionId - Download FHIR R4 Bundle ───────────────────
router.get('/fhir/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = db.collection('sessions').findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const patient = session.patientId ? db.collection('patients').findById(session.patientId) : {};
  const summary = db.collection('ai_summaries').findOne({ sessionId }) || { sections: {} };
  const documents = db.collection('documents').find({ sessionId });

  const bundle = generateFHIRBundle({ patient, session, summary, documents });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=fhir-record-${session.token || sessionId}.json`);
  res.json(bundle);
});

// ─── GET /api/his/hl7/:sessionId - Download HL7 v2 Message ────────────────────
router.get('/hl7/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = db.collection('sessions').findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const patient = session.patientId ? db.collection('patients').findById(session.patientId) : {};
  const summary = db.collection('ai_summaries').findOne({ sessionId }) || { sections: {} };
  const documents = db.collection('documents').find({ sessionId });

  const hl7Message = hisService.generateHL7v2Message({ patient, session, summary, documents });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=hl7-oru-${session.token || sessionId}.hl7`);
  res.send(hl7Message);
});

// ─── GET /api/his/proprietary/:sessionId - Download Indian Hospital OPD JSON ───
router.get('/proprietary/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = db.collection('sessions').findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const patient = session.patientId ? db.collection('patients').findById(session.patientId) : {};
  const summary = db.collection('ai_summaries').findOne({ sessionId }) || { sections: {} };
  const documents = db.collection('documents').find({ sessionId });

  const proprietary = hisService.generateProprietaryJSON({ patient, session, summary, documents });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=hospital-record-${session.token || sessionId}.json`);
  res.json(proprietary);
});

// ─── POST /api/his/mock-receiver - Local Test Receiver ─────────────────────────
router.post('/mock-receiver', (req, res) => {
  res.json({
    status: 'RECEIVED',
    receiver: 'Hospital OPD Ingestion Hub (Mock Receiver)',
    timestamp: new Date().toISOString(),
    payloadSize: JSON.stringify(req.body).length,
  });
});

export default router;
