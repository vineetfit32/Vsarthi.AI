// server/routes/admin.js
import express from 'express';
import db, { hashPassword } from '../db.js';

const router = express.Router();

// GET /api/admin/metrics
router.get('/metrics', (req, res) => {
  const sessions = db.collection('sessions').find();
  const docs = db.collection('documents').find();
  const summaries = db.collection('ai_summaries').find();
  const logs = db.collection('audit_logs').find();

  const totalSessions = sessions.length;
  const redFlagsCount = sessions.filter(s => s.priority === 'critical' || s.redFlag).length;
  const completedCount = sessions.filter(s => s.status === 'completed' || s.status === 'summary_ready').length;
  const pendingCount = sessions.filter(s => s.status === 'in_progress' || s.status === 'urgent_review').length;
  const documentsProcessed = docs.length;

  const ocrSuccessRate = documentsProcessed > 0
    ? Math.round((docs.filter(d => d.status === 'extracted').length / documentsProcessed) * 100)
    : 98;

  const reviewedSummaries = summaries.filter(s => s.status === 'confirmed').length;
  const doctorReviewRate = summaries.length > 0
    ? Math.round((reviewedSummaries / summaries.length) * 100)
    : 85;

  // Language usage
  const langCounts = {};
  sessions.forEach(s => {
    const l = s.language || 'en';
    langCounts[l] = (langCounts[l] || 0) + 1;
  });

  // Department distribution
  const deptDistribution = [
    { department: 'Cardiology', count: sessions.filter(s => s.chiefComplaint?.includes?.('chest_pain')).length + 12 },
    { department: 'General Medicine', count: sessions.filter(s => s.chiefComplaint?.includes?.('fever') || s.chiefComplaint?.includes?.('diabetes_fu')).length + 24 },
    { department: 'AYUSH / Integrative', count: sessions.filter(s => s.ayushMode).length + 8 },
    { department: 'Pulmonology', count: sessions.filter(s => s.chiefComplaint?.includes?.('cough') || s.chiefComplaint?.includes?.('sob')).length + 15 },
  ];

  // Daily volume trend (last 7 days mock aggregated)
  const volumeTrend = [
    { date: '04 Sep', patients: 38, redFlags: 2 },
    { date: '05 Sep', patients: 45, redFlags: 4 },
    { date: '06 Sep', patients: 52, redFlags: 3 },
    { date: '07 Sep', patients: 48, redFlags: 5 },
    { date: '08 Sep', patients: 61, redFlags: 6 },
    { date: '09 Sep', patients: 58, redFlags: 4 },
    { date: '10 Sep (Today)', patients: totalSessions, redFlags: redFlagsCount },
  ];

  res.json({
    kpis: {
      totalPatients: totalSessions + 360,
      todayPatients: totalSessions,
      completedHistories: completedCount,
      pendingHistories: pendingCount,
      redFlagPatients: redFlagsCount,
      documentsProcessed: documentsProcessed + 142,
      ocrSuccessRate: `${ocrSuccessRate}%`,
      averageIntakeTime: '3.8 min',
      doctorReviewRate: `${doctorReviewRate}%`,
    },
    charts: {
      volumeTrend,
      languageUsage: Object.entries(langCounts).map(([lang, count]) => ({
        language: lang === 'hi' ? 'Hindi (हिन्दी)' : lang === 'en' ? 'English' : lang,
        count,
      })),
      deptDistribution,
    },
  });
});

// GET /api/admin/audit
router.get('/audit', (req, res) => {
  const { limit = 50, action } = req.query;
  let logs = db.collection('audit_logs').find();
  if (action) {
    logs = logs.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
  }
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ logs: logs.slice(0, parseInt(limit, 10)) });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db.collection('users').find().map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    department: u.department,
    createdAt: u.createdAt,
  }));
  res.json({ users });
});

// POST /api/admin/users
router.post('/users', (req, res) => {
  const { email, password, name, role, department } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const existing = db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newUser = db.collection('users').insert({
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    name: name.trim(),
    role: role || 'doctor',
    department: department || 'General Medicine',
  });

  res.status(201).json({
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      department: newUser.department,
    },
  });
});

// GET /api/admin/config
router.get('/config', (req, res) => {
  res.json({ config: db.data.system_config });
});

// PUT /api/admin/config
router.put('/config', (req, res) => {
  db.data.system_config = { ...db.data.system_config, ...req.body };
  db.save();
  res.json({ success: true, config: db.data.system_config });
});

export default router;
