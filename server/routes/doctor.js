// server/routes/doctor.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/doctor/queue - Today's patient queue
router.get('/queue', (req, res) => {
  const { priority, status, search } = req.query;
  const sessions = db.collection('sessions').find();
  const patients = db.collection('patients').find();
  const summaries = db.collection('ai_summaries').find();

  let queue = sessions.map(sess => {
    const pat = patients.find(p => p.id === sess.patientId) || {};
    const sum = summaries.find(s => s.sessionId === sess.id);

    return {
      sessionId: sess.id,
      token: sess.token || 'N/A',
      patientId: pat.id,
      patientName: pat.name || 'Anonymous Patient',
      age: pat.age || (pat.dob ? Math.floor((Date.now() - new Date(pat.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null),
      gender: pat.gender || 'U',
      phone: pat.phone || '',
      abhaId: pat.abhaId || '',
      chiefComplaint: sess.chiefComplaintDisplay || (Array.isArray(sess.chiefComplaint) ? sess.chiefComplaint.join(', ') : (sess.chiefComplaint || 'General consultation')),
      priority: sess.priority || 'routine',
      status: sess.status || 'in_progress',
      redFlag: sess.redFlag || null,
      summaryStatus: sum ? sum.status : 'not_started',
      hasSummary: !!sum,
      summaryId: sum?.id,
      ayushMode: !!sess.ayushMode,
      isKiosk: !!sess.isKiosk,
      startedAt: sess.startedAt,
      completedAt: sess.completedAt,
    };
  });

  // Filters
  if (priority && priority !== 'all') {
    queue = queue.filter(q => q.priority === priority);
  }
  if (status && status !== 'all') {
    queue = queue.filter(q => q.status === status);
  }
  if (search) {
    const s = search.toLowerCase();
    queue = queue.filter(q =>
      q.patientName.toLowerCase().includes(s) ||
      q.token.toLowerCase().includes(s) ||
      q.chiefComplaint.toLowerCase().includes(s)
    );
  }

  // Sort: Critical first, then Urgent, then Routine, then by time
  const priorityWeight = { critical: 3, urgent: 2, routine: 1 };
  queue.sort((a, b) => {
    const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.startedAt || 0) - new Date(a.startedAt || 0);
  });

  res.json({ queue, total: queue.length });
});

// GET /api/doctor/patient/:sessionId - Full clinical overview
router.get('/patient/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = db.collection('sessions').findById(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Patient session not found' });
  }

  const patient = session.patientId ? db.collection('patients').findById(session.patientId) : {};
  const history = db.collection('clinical_histories').findOne({ sessionId }) || { answers: {} };
  const documents = db.collection('documents').find({ sessionId });
  const summary = db.collection('ai_summaries').findOne({ sessionId });
  const consent = db.collection('consents').findOne({ sessionId });
  const auditLogs = db.collection('audit_logs').find({ targetId: sessionId });

  res.json({
    session,
    patient,
    history: history.answers,
    documents,
    summary,
    consent,
    auditLogs,
  });
});

// POST /api/doctor/triage-priority
router.post('/triage-priority', (req, res) => {
  const { sessionId, priority, nurseNotes } = req.body;
  if (!sessionId || !priority) {
    return res.status(400).json({ error: 'sessionId and priority are required' });
  }

  const session = db.collection('sessions').update(sessionId, {
    priority,
    nurseNotes,
  });

  db.logAudit({
    actorRole: req.user?.role || 'nurse',
    actorId: req.user?.id || 'triage_staff',
    action: 'TRIAGE_PRIORITY_UPDATED',
    targetType: 'session',
    targetId: sessionId,
    details: { priority, nurseNotes },
  });

  res.json({ success: true, session });
});

// POST /api/doctor/start-review/:sessionId - Attending physician opens review
router.post('/start-review/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = db.collection('sessions').findById(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const updated = db.collection('sessions').update(sessionId, {
    status: 'PHYSICIAN_REVIEW',
    reviewStartedAt: new Date().toISOString(),
    attendingDoctorId: req.user?.id || 'physician_current',
  });

  db.logAudit({
    actorRole: 'doctor',
    actorId: req.user?.id || 'attending_physician',
    action: 'PHYSICIAN_REVIEW_STARTED',
    targetType: 'session',
    targetId: sessionId,
  });

  res.json({ success: true, session: updated });
});

export default router;
