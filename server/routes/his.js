// server/routes/his.js
import express from 'express';
import db from '../db.js';
import { generateFHIRBundle, getABDMAdapter } from '../services/abdmService.js';

const router = express.Router();

// POST /api/his/export - Export clinical summary to hospital HIS / EMR
router.post('/export', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = db.collection('sessions').findById(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const patient = session.patientId ? db.collection('patients').findById(session.patientId) : {};
  const summary = db.collection('ai_summaries').findOne({ sessionId }) || { sections: {} };
  const documents = db.collection('documents').find({ sessionId });

  const fhirBundle = generateFHIRBundle({ patient, session, summary, documents });

  const adapter = getABDMAdapter();
  const pushResult = await adapter.pushHealthRecord(fhirBundle);

  db.collection('sessions').update(sessionId, {
    hisExported: true,
    hisToken: pushResult.transactionId,
    hisTimestamp: pushResult.timestamp,
  });

  db.logAudit({
    actorRole: req.user?.role || 'system',
    actorId: req.user?.id || 'his_adapter',
    action: 'HIS_EMR_EXPORT_DISPATCHED',
    targetType: 'session',
    targetId: sessionId,
    details: { transactionId: pushResult.transactionId, mode: pushResult.mode },
  });

  res.json({
    success: true,
    token: pushResult.transactionId,
    timestamp: pushResult.timestamp,
    adapterMode: pushResult.mode,
    fhirBundleId: fhirBundle.id,
    bundleSummary: {
      patientName: patient.name,
      entriesCount: fhirBundle.entry.length,
      status: 'DISPATCHED_TO_HIS',
    },
  });
});

// GET /api/his/fhir/:sessionId - Download FHIR R4 Bundle
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

export default router;
