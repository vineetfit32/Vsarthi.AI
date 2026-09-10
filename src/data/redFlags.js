// Red flag detection rules
// Each rule: { id, name, condition(answers) => bool, severity: 'critical'|'urgent', message: {en,hi} }

export const RED_FLAG_RULES = [
  {
    id: 'acs',
    name: 'Possible Acute Coronary Syndrome',
    severity: 'critical',
    condition: (a) =>
      a.chiefComplaint?.includes('chest_pain') &&
      (a.associated?.some(v => ['sob', 'sweating', 'nausea'].includes(v)) ||
        a.radiation?.includes('arm') || a.radiation?.includes('jaw')),
    message: {
      en: 'Chest pain with associated symptoms (shortness of breath, sweating, arm/jaw pain) — possible cardiac emergency.',
      hi: 'सीने में दर्द के साथ अन्य लक्षण — संभावित हृदय आपात स्थिति।',
    },
  },
  {
    id: 'stroke',
    name: 'Possible Stroke / TIA',
    severity: 'critical',
    condition: (a) =>
      a.associated?.some(v => ['face_droop', 'arm_weakness', 'speech_slurred', 'sudden_vision_loss'].includes(v)) ||
      (a.chiefComplaint?.includes('headache') && a.onset === 'sudden' && a.severity >= 8),
    message: {
      en: 'Sudden weakness, facial droop, or speech difficulty — possible stroke. Seek emergency care immediately.',
      hi: 'अचानक कमजोरी, चेहरा लटकना या बोलने में कठिनाई — संभावित स्ट्रोक। तुरंत आपातकालीन देखभाल लें।',
    },
  },
  {
    id: 'anaphylaxis',
    name: 'Possible Anaphylaxis',
    severity: 'critical',
    condition: (a) =>
      a.associated?.some(v => ['throat_swelling', 'difficulty_breathing', 'rash_all_over'].includes(v)) &&
      a.onset === 'sudden',
    message: {
      en: 'Sudden rash with throat swelling or breathing difficulty — possible severe allergic reaction.',
      hi: 'गले की सूजन या सांस लेने में कठिनाई के साथ अचानक चकत्ते — संभावित गंभीर एलर्जी।',
    },
  },
  {
    id: 'high_bp',
    name: 'Hypertensive Emergency',
    severity: 'urgent',
    condition: (a) =>
      a.chiefComplaint?.includes('headache') &&
      a.associated?.some(v => ['vision_change', 'confusion', 'chest_pain'].includes(v)) &&
      a.pastMedical?.includes('hypertension'),
    message: {
      en: 'Headache with visual changes in a hypertensive patient — possible hypertensive emergency.',
      hi: 'उच्च रक्तचाप के रोगी में सिरदर्द और दृष्टि परिवर्तन — संभावित उच्च रक्तचाप आपात।',
    },
  },
  {
    id: 'sepsis',
    name: 'Possible Sepsis',
    severity: 'urgent',
    condition: (a) =>
      a.chiefComplaint?.includes('fever') &&
      a.severity >= 7 &&
      a.associated?.some(v => ['confusion', 'fast_heartbeat', 'low_urine'].includes(v)),
    message: {
      en: 'High fever with confusion and reduced urine output — possible sepsis. Urgent assessment needed.',
      hi: 'भ्रम और कम मूत्र उत्पादन के साथ तेज बुखार — संभावित सेप्सिस। तत्काल मूल्यांकन आवश्यक।',
    },
  },
  {
    id: 'meningitis',
    name: 'Possible Meningitis',
    severity: 'critical',
    condition: (a) =>
      a.chiefComplaint?.includes('headache') &&
      a.associated?.some(v => ['neck_stiffness', 'photophobia', 'rash_all_over'].includes(v)) &&
      a.chiefComplaint?.includes('fever'),
    message: {
      en: 'Headache with neck stiffness, fever and light sensitivity — possible meningitis.',
      hi: 'गर्दन की अकड़न, बुखार और प्रकाश संवेदनशीलता के साथ सिरदर्द — संभावित मेनिनजाइटिस।',
    },
  },
];

export function checkRedFlags(answers) {
  for (const rule of RED_FLAG_RULES) {
    try {
      if (rule.condition(answers)) return rule;
    } catch (_) { /* ignore evaluation errors */ }
  }
  return null;
}
