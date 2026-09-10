// services/llmSummarize.js
// Simulated LLM-based clinical summary generation
// Swap-in: replace generateSummary() with GPT-4 / Claude / AI4Bharat API call

import { SECTIONS } from '../data/questions.js';

// Helper: label lookup for answer values
function labelFor(question, value, lang = 'en') {
  if (!question?.options) return value;
  const opt = question.options.find(o =>
    Array.isArray(value) ? value.includes(o.value) : o.value === value
  );
  return opt?.label?.[lang] || opt?.label?.en || value;
}

function labelsFor(question, values, lang = 'en') {
  if (!Array.isArray(values)) return labelFor(question, values, lang);
  return values.map(v => {
    const opt = question?.options?.find(o => o.value === v);
    return opt?.label?.[lang] || opt?.label?.en || v;
  }).join(', ');
}

// Build section text from interview answers
function buildHPIText(answers, questions) {
  const hpiQs = questions.filter(q => q.section === SECTIONS.HPI);
  const parts = [];

  const chief = (answers.chiefComplaint || []).join(', ').replace(/_/g, ' ');
  const duration = answers.duration?.replace(/_/g, ' ') || 'unspecified duration';

  parts.push(`The patient presents with ${chief} of ${duration}.`);

  if (answers.onset) parts.push(`Onset: ${answers.onset.replace(/_/g, ' ')}.`);
  if (answers.character) parts.push(`Character: ${answers.character.replace(/_/g, ' ')}.`);
  if (answers.site) parts.push(`Site: ${answers.site.replace(/_/g, ' ')}.`);
  if (answers.radiation && !answers.radiation.includes('no_radiation')) {
    parts.push(`Radiation to: ${answers.radiation.join(', ').replace(/_/g, ' ')}.`);
  }
  if (answers.associated && !answers.associated.includes('none')) {
    parts.push(`Associated symptoms: ${answers.associated.join(', ').replace(/_/g, ' ')}.`);
  }
  if (answers.severity !== undefined) {
    parts.push(`Severity: ${answers.severity}/10.`);
  }
  if (answers.relieving && !answers.relieving.includes('nothing')) {
    parts.push(`Modifying factors: ${answers.relieving.join(', ').replace(/_/g, ' ')}.`);
  }
  if (answers.feverGrade) parts.push(`Fever grade: ${answers.feverGrade.replace(/_/g, ' ')}.`);
  if (answers.feverPattern) parts.push(`Fever pattern: ${answers.feverPattern.replace(/_/g, ' ')}.`);

  return parts.join(' ') || 'History as per presenting complaints.';
}

function buildPastHistoryText(answers) {
  const conditions = answers.pastMedical || [];
  if (conditions.includes('none') || !conditions.length) return 'No significant past medical history reported.';
  
  let text = `Known case of: ${conditions.filter(c => c !== 'none').join(', ').replace(/_/g, ' ')}.`;
  if (answers.pastSurgery === 'yes' && answers.pastSurgeryDetail) {
    text += ` Surgical history: ${answers.pastSurgeryDetail}.`;
  } else {
    text += ' No significant surgical history.';
  }
  return text;
}

function buildDrugAllergyText(answers) {
  const medsPart = answers.currentMeds === 'yes'
    ? `Current medications: ${answers.currentMedsDetail || 'As listed by patient.'}`
    : 'No regular medications.';
  
  const allergyPart = answers.drugAllergy === 'yes'
    ? `Allergy: ${answers.drugAllergyDetail || 'Details as reported by patient.'} — NKDA otherwise.`
    : 'No known drug allergies (NKDA).';

  return `${medsPart} ${allergyPart}`;
}

function buildFamilyHistoryText(answers) {
  const fh = answers.familyHistory || [];
  if (fh.includes('none') || !fh.length) return 'No significant family history.';
  return `Family history significant for: ${fh.filter(f => f !== 'none').join(', ').replace(/_/g, ' ')}.`;
}

function buildPersonalHistoryText(answers) {
  const parts = [];
  if (answers.smoking) parts.push(`Smoking: ${answers.smoking.replace(/_/g, ' ')}`);
  if (answers.alcohol)  parts.push(`Alcohol: ${answers.alcohol.replace(/_/g, ' ')}`);
  if (answers.diet)     parts.push(`Diet: ${answers.diet}`);
  if (answers.exercise) parts.push(`Activity level: ${answers.exercise.replace(/_/g, ' ')}`);
  return parts.length ? parts.join('. ') + '.' : 'Personal history not significant.';
}

function buildROSText(answers) {
  const ros = answers.rosSymptoms || [];
  if (ros.includes('none') || !ros.length) return 'Review of systems: no additional positive findings.';
  return `Positive ROS findings: ${ros.filter(r => r !== 'none').join(', ').replace(/_/g, ' ')}.`;
}

function buildPriorInvestigationsText(documents) {
  if (!documents.length) return 'No prior investigations provided.';
  return documents.map(doc => {
    const d = doc.extractedData;
    let text = `[${doc.uploadDate}] ${d?.diagnosis || doc.name} (Source: ${d?.source || doc.source || 'Unknown'}).`;
    if (d?.labValues?.length) {
      const abnormals = d.labValues.filter(lv => lv.isAbnormal);
      if (abnormals.length) {
        text += ` Abnormal values: ${abnormals.map(lv => `${lv.test} ${lv.value} ${lv.unit}`).join(', ')}.`;
      }
    }
    if (d?.medicines?.length) {
      text += ` Prescribed: ${d.medicines.map(m => `${m.name} ${m.dose}`).join(', ')}.`;
    }
    return text;
  }).join('\n');
}

function buildAYUSHText(answers) {
  if (!answers.prakriti) return null;
  const parts = [];
  if (answers.prakriti) parts.push(`Prakriti: ${answers.prakriti.replace(/_/g, '-')}`);
  if (answers.agni)     parts.push(`Agni (Digestive capacity): ${answers.agni}`);
  if (answers.satmya)   parts.push(`Satmya: ${(answers.satmya || []).join(', ')}`);
  if (answers.vyayamaShakti) parts.push(`Vyayama Shakti: ${answers.vyayamaShakti}`);
  if (answers.sattva)   parts.push(`Sattva: ${answers.sattva}`);
  if (answers.aharaVihara) parts.push(`Ahara-Vihara: ${answers.aharaVihara}`);
  return parts.join('. ') + '.';
}

// Main summary generation function
export async function generateSummary({ patient, answers, documents, questions, language = 'en' }) {
  // Rapid processing with zero lag
  await new Promise(r => setTimeout(r, 50));

  const chiefComplaints = (answers.chiefComplaint || []).join(', ').replace(/_/g, ' ');
  const ayushText = buildAYUSHText(answers);

  const sections = {
    chiefComplaint: chiefComplaints
      ? `${chiefComplaints} — duration ${(answers.duration || 'unspecified').replace(/_/g, ' ')}.`
      : 'Chief complaint not specified.',

    hpi: buildHPIText(answers, questions),
    pastHistory: buildPastHistoryText(answers),
    drugAllergy: buildDrugAllergyText(answers),
    familyHistory: buildFamilyHistoryText(answers),
    personalHistory: buildPersonalHistoryText(answers),
    reviewOfSystems: buildROSText(answers),
    priorInvestigations: buildPriorInvestigationsText(documents),
    ...(ayushText ? { ayush: ayushText } : {}),
  };

  // Patient-friendly version (simplified language)
  const patientFriendly = {
    chiefComplaint: `You came in today because of: ${chiefComplaints || 'your concern'}.`,
    hpi: `Your symptoms started ${(answers.duration || '').replace(/_/g, ' ')} ago. ${answers.severity !== undefined ? `The severity is ${answers.severity} out of 10.` : ''}`,
    pastHistory: sections.pastHistory,
    drugAllergy: sections.drugAllergy,
    familyHistory: sections.familyHistory,
    personalHistory: sections.personalHistory,
    reviewOfSystems: sections.reviewOfSystems,
    priorInvestigations: documents.length
      ? `You have shared ${documents.length} medical document(s) from the past.`
      : 'No past documents were shared.',
  };

  return { sections, patientFriendly };
}
