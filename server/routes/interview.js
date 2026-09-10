// server/routes/interview.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Red flag evaluation rules
function evaluateRedFlags(answers) {
  // 1. Acute Coronary Syndrome
  const hasChestPain = Array.isArray(answers.chiefComplaint)
    ? answers.chiefComplaint.includes('chest_pain')
    : answers.chiefComplaint === 'chest_pain';

  const associated = answers.associated || [];
  const radiation = answers.radiation || [];

  if (hasChestPain && (
    associated.some(a => ['sob', 'sweating', 'nausea'].includes(a)) ||
    radiation.some(r => ['arm', 'jaw', 'back'].includes(r)) ||
    answers.severity >= 8
  )) {
    return {
      id: 'acs',
      name: 'Possible Acute Coronary Syndrome',
      severity: 'critical',
      message: 'Chest pain with associated symptoms (dyspnea, sweating, arm/jaw radiation) — acute cardiac assessment needed immediately.',
      actionRequired: 'Alert Triage & Prepare ECG',
    };
  }

  // 2. Stroke / TIA
  if (
    associated.some(a => ['face_droop', 'arm_weakness', 'speech_slurred', 'sudden_vision_loss'].includes(a)) ||
    (answers.chiefComplaint?.includes?.('headache') && answers.onset === 'sudden' && answers.severity >= 8)
  ) {
    return {
      id: 'stroke',
      name: 'Possible Stroke / TIA',
      severity: 'critical',
      message: 'Sudden weakness, facial droop, or speech slurring — immediate emergency neurology triage required.',
      actionRequired: 'Code Stroke Protocol',
    };
  }

  // 3. Severe Allergic Reaction / Anaphylaxis
  if (
    associated.some(a => ['throat_swelling', 'difficulty_breathing', 'rash_all_over'].includes(a)) &&
    answers.onset === 'sudden'
  ) {
    return {
      id: 'anaphylaxis',
      name: 'Possible Anaphylaxis',
      severity: 'critical',
      message: 'Sudden throat swelling or respiratory distress with rash — possible anaphylaxis.',
      actionRequired: 'Immediate Epinephrine & Airway Readiness',
    };
  }

  // 4. Sepsis
  if (
    answers.chiefComplaint?.includes?.('fever') &&
    answers.severity >= 7 &&
    associated.some(a => ['confusion', 'fast_heartbeat', 'low_urine'].includes(a))
  ) {
    return {
      id: 'sepsis',
      name: 'Possible Sepsis',
      severity: 'urgent',
      message: 'High-grade fever with confusion and decreased urine output — urgent clinical evaluation required.',
      actionRequired: 'Check Lactate & Blood Cultures',
    };
  }

  return null;
}

// POST /api/history/start
router.post('/start', (req, res) => {
  const { sessionId } = req.body;
  const history = db.collection('clinical_histories').upsert(
    { sessionId },
    { sessionId, answers: {}, updatedAt: new Date().toISOString() }
  );
  res.json({ success: true, history });
});

// POST /api/history/answer - Record answer, evaluate red flag, return next question hints
router.post('/answer', (req, res) => {
  const { sessionId, key, value, allAnswers = {} } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const existingHistory = db.collection('clinical_histories').findOne({ sessionId }) || { answers: {} };
  const updatedAnswers = { ...existingHistory.answers, ...allAnswers, [key]: value };

  db.collection('clinical_histories').upsert(
    { sessionId },
    { sessionId, answers: updatedAnswers, updatedAt: new Date().toISOString() }
  );

  // Check red flags
  const redFlag = evaluateRedFlags(updatedAnswers);

  if (redFlag) {
    db.collection('sessions').update(sessionId, {
      redFlag,
      priority: redFlag.severity === 'critical' ? 'critical' : 'urgent',
      status: 'ESCALATED',
    });

    // Notify doctor & triage
    db.collection('notifications').insert({
      type: 'red_flag',
      priority: 'high',
      targetRole: 'doctor',
      message: `🚨 Emergency Red-Flag in session ${sessionId}: ${redFlag.name}`,
      sessionId,
      timestamp: new Date().toISOString(),
      isRead: false,
    });

    db.logAudit({
      actorRole: 'system',
      actorId: 'redflag_engine',
      action: 'RED_FLAG_TRIGGERED',
      targetType: 'session',
      targetId: sessionId,
      details: redFlag,
    });
  } else {
    const currentSession = db.collection('sessions').findById(sessionId);
    if (currentSession && ['REGISTERED', 'CONSENTED', 'in_progress'].includes(currentSession.status)) {
      db.collection('sessions').update(sessionId, { status: 'INTAKE_IN_PROGRESS' });
    }
  }

  res.json({
    success: true,
    answers: updatedAnswers,
    redFlag,
  });
});

// POST /api/history/redflag-alert - Patient or nurse explicit priority alert trigger
router.post('/redflag-alert', (req, res) => {
  const { sessionId, reason } = req.body;
  db.collection('sessions').update(sessionId, {
    priority: 'critical',
    status: 'urgent_review',
  });

  db.collection('notifications').insert({
    type: 'emergency_beacon',
    priority: 'high',
    targetRole: 'doctor',
    message: `🚨 PATIENT EMERGENCY BEACON: Session ${sessionId} requested immediate staff assistance.`,
    sessionId,
    timestamp: new Date().toISOString(),
    isRead: false,
  });

  res.json({ success: true, alerted: true });
});

export default router;
