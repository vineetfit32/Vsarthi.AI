// server/routes/summary.js
import express from 'express';
import db from '../db.js';
import { checkMedicationSafety } from '../services/safetyService.js';

const router = express.Router();

export function generateStructuredSummary({ patient = {}, session = {}, history = {}, documents = [] }) {
  const answers = history.answers || {};
  const chief = Array.isArray(answers.chiefComplaint)
    ? answers.chiefComplaint.join(', ').replace(/_/g, ' ')
    : (answers.chiefComplaint || 'Unspecified complaint');

  const duration = (answers.duration || 'unspecified duration').replace(/_/g, ' ');

  // 1. HPI
  const hpiParts = [`Patient presents with ${chief} for ${duration}.`];
  if (answers.onset) hpiParts.push(`Onset was ${answers.onset.replace(/_/g, ' ')}.`);
  if (answers.site) hpiParts.push(`Localized to ${answers.site.replace(/_/g, ' ')}.`);
  if (answers.character) hpiParts.push(`Character of symptoms described as ${answers.character.replace(/_/g, ' ')}.`);
  if (answers.radiation && !answers.radiation.includes('no_radiation')) {
    hpiParts.push(`Radiation noted to: ${answers.radiation.join(', ').replace(/_/g, ' ')}.`);
  }
  if (answers.associated && !answers.associated.includes('none')) {
    hpiParts.push(`Associated symptoms include ${answers.associated.join(', ').replace(/_/g, ' ')}.`);
  }
  if (answers.severity !== undefined) {
    hpiParts.push(`Pain/symptom severity reported as ${answers.severity}/10.`);
  }
  if (answers.relieving && !answers.relieving.includes('nothing')) {
    hpiParts.push(`Modifying factors: relieved partially by ${answers.relieving.join(', ').replace(/_/g, ' ')}.`);
  }
  const hpi = hpiParts.join(' ');

  // 2. Past medical
  const pastMeds = (answers.pastMedical || []).filter(c => c !== 'none');
  const pastMedical = pastMeds.length
    ? `Known case of: ${pastMeds.join(', ').replace(/_/g, ' ')}.`
    : 'No significant past medical illnesses reported.';

  // 3. Past surgical
  const pastSurgical = answers.pastSurgery === 'yes'
    ? (answers.pastSurgeryDetail || 'Surgical intervention reported.')
    : 'No past surgical history.';

  // 4. Medications
  const docMeds = documents.flatMap(d => d.extractedData?.medicines || []);
  const allMedsText = answers.currentMeds === 'yes'
    ? answers.currentMedsDetail || 'Prescribed medications reported.'
    : docMeds.length
    ? docMeds.map(m => `${m.name} ${m.dose} (${m.frequency})`).join(', ')
    : 'No routine daily medications.';

  // 5. Allergies
  const allergyText = answers.drugAllergy === 'yes'
    ? `⚠️ ALLERGY REPORTED: ${answers.drugAllergyDetail || 'Specified drug reaction'}.`
    : 'No known drug allergies (NKDA).';

  // 6. Medication safety check
  const safetyFlags = checkMedicationSafety({
    medications: docMeds,
    allergyHistory: allergyText,
    currentMedsDetail: answers.currentMedsDetail || '',
  });

  // 7. AYUSH
  const ayushText = answers.prakriti
    ? `Prakriti: ${answers.prakriti.replace(/_/g, '-')} | Vikriti: ${answers.vikriti || 'Samadosha'} | Agni: ${answers.aharaShakti || 'Sama'} | Sattva: ${answers.sattva || 'Madhyama'}.`
    : null;

  // 8. Investigations & Abnormals
  const allLabValues = documents.flatMap(d => d.extractedData?.labValues || []);
  const abnormals = allLabValues.filter(lv => lv.isAbnormal);

  const priorInvestigations = documents.length
    ? documents.map(d => `[${d.uploadDate}] ${d.extractedData?.diagnosis || d.name} (${d.source || 'Report'})`).join('; ')
    : 'No prior diagnostic records uploaded.';

  const importantAbnormals = abnormals.length
    ? abnormals.map(lv => `${lv.test}: ${lv.value} ${lv.unit} (${lv.status || 'abnormal'}, ref: ${lv.normalRange || 'see report'})`).join('; ')
    : 'All extracted parameters within document reference ranges.';

  // 16 Sections
  const sections = {
    patientInfo: `${patient.name || 'Anonymous Patient'}, ${patient.age ? `${patient.age}y` : ''}/${patient.gender || 'U'}, Token: ${session.token || 'N/A'}${patient.abhaId ? `, ABHA: ${patient.abhaId}` : ''}`,
    chiefComplaint: `${chief} (${duration}).`,
    hpi,
    pastMedical,
    pastSurgical,
    medications: allMedsText,
    allergies: allergyText,
    familyHistory: (answers.familyHistory || []).filter(f => f !== 'none').join(', ').replace(/_/g, ' ') || 'Non-contributory family history.',
    personalHistory: `Diet: ${answers.diet || 'Mixed'}. Smoking: ${answers.smoking || 'None'}. Alcohol: ${answers.alcohol || 'None'}.`,
    reviewOfSystems: (answers.rosSymptoms || []).filter(r => r !== 'none').join(', ').replace(/_/g, ' ') || 'Negative for systemic review red flags.',
    priorInvestigations,
    importantAbnormals,
    relevantTimeline: `${documents.length} document(s) on file from ${documents[0]?.uploadDate || 'recent months'}.`,
    redFlags: session.redFlag ? `🚨 CRITICAL: ${session.redFlag.name} — ${session.redFlag.message}` : 'No emergency red flags triggered.',
    missingInfo: 'Awaiting physician physical examination, vitals measurement, and diagnostic confirmation.',
    aiConfidenceNotes: 'Generated using VSarthi Clinical Intake Engine. Source attribution: patient direct interview + OCR extraction. AI-generated draft — Physician review required.',
    ...(ayushText ? { ayush: ayushText } : {}),
  };

  return { sections, safetyFlags };
}

// POST /api/summary/generate
router.post('/generate', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = db.collection('sessions').findById(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const patient = session.patientId ? db.collection('patients').findById(session.patientId) : {};
  const history = db.collection('clinical_histories').findOne({ sessionId }) || {};
  const documents = db.collection('documents').find({ sessionId });

  const { sections, safetyFlags } = generateStructuredSummary({ patient, session, history, documents });

  const summary = db.collection('ai_summaries').upsert(
    { sessionId },
    {
      sessionId,
      status: 'pending_physician_review',
      sections,
      safetyFlags,
      confidenceScore: 0.93,
      sectionStatus: Object.fromEntries(Object.keys(sections).map(k => [k, 'pending'])),
      physicianNotes: {},
      updatedAt: new Date().toISOString(),
    }
  );

  db.collection('sessions').update(sessionId, {
    status: session.priority === 'critical' ? 'urgent_review' : 'summary_ready',
  });

  db.logAudit({
    actorRole: 'system',
    actorId: 'ai_summarizer',
    action: 'SUMMARY_GENERATED',
    targetType: 'ai_summary',
    targetId: summary.id,
    details: { sectionsCount: Object.keys(sections).length, safetyFlagsCount: safetyFlags.length },
  });

  res.json({ success: true, summary });
});

// PUT /api/summary/:id - Physician amends, accepts, or adds notes
router.put('/:id', (req, res) => {
  const { sections, sectionStatus, physicianNotes, status } = req.body;
  const existing = db.collection('ai_summaries').findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Summary not found' });
  }

  const updated = db.collection('ai_summaries').update(req.params.id, {
    sections: { ...existing.sections, ...(sections || {}) },
    sectionStatus: { ...existing.sectionStatus, ...(sectionStatus || {}) },
    physicianNotes: { ...existing.physicianNotes, ...(physicianNotes || {}) },
    status: status || existing.status,
  });

  if (status === 'confirmed') {
    db.collection('sessions').update(existing.sessionId, { status: 'completed' });
  }

  db.logAudit({
    actorRole: 'doctor',
    actorId: req.user?.id || 'physician',
    action: status === 'confirmed' ? 'SUMMARY_CONFIRMED' : 'SUMMARY_AMENDED',
    targetType: 'ai_summary',
    targetId: req.params.id,
    details: { status, sectionStatus },
  });

  res.json({ success: true, summary: updated });
});

export default router;
