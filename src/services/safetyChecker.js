// src/services/safetyChecker.js
// Client-side medication safety checking for instant UI feedback

export const DRUG_INTERACTIONS = [
  {
    pair: ['aspirin', 'warfarin'],
    severity: 'critical',
    title: 'Severe Bleeding Risk (Aspirin + Warfarin)',
    description: 'Concurrent anticoagulant and antiplatelet therapy significantly elevates major hemorrhagic risk.',
  },
  {
    pair: ['aspirin', 'ibuprofen'],
    severity: 'moderate',
    title: 'Reduced Antiplatelet Effect & GI Bleed Risk',
    description: 'NSAIDs like Ibuprofen can block Aspirin cardioprotective effect and exacerbate peptic ulceration.',
  },
  {
    pair: ['amlodipine', 'telmisartan'],
    severity: 'info',
    title: 'Dual Antihypertensive Combination',
    description: 'Synergistic blood pressure reduction; monitor for postural hypotension.',
  },
  {
    pair: ['metformin', 'contrast'],
    severity: 'critical',
    title: 'Lactic Acidosis Risk with Iodinated Radiocontrast',
    description: 'Metformin must be withheld prior to and 48 hours post contrast imaging.',
  },
  {
    pair: ['ciprofloxacin', 'theophylline'],
    severity: 'urgent',
    title: 'Theophylline Toxicity Risk',
    description: 'Fluoroquinolones inhibit CYP1A2, increasing theophylline serum concentrations.',
  },
];

export const ALLERGY_RULES = [
  {
    allergenKeyword: 'penicillin',
    contraindicatedDrugs: ['amoxicillin', 'ampicillin', 'amoxyclav', 'augmentin', 'piperacillin'],
    severity: 'critical',
    title: 'Penicillin Class Allergy Conflict',
    description: 'Patient reports Penicillin allergy; prescribed beta-lactam poses acute anaphylaxis risk.',
  },
  {
    allergenKeyword: 'sulfa',
    contraindicatedDrugs: ['bactrim', 'septra', 'sulfamethoxazole', 'dapsone'],
    severity: 'critical',
    title: 'Sulfonamide Class Allergy Conflict',
    description: 'Patient reports Sulfa allergy; sulfonamide antimicrobial is contraindicated.',
  },
  {
    allergenKeyword: 'nsaid',
    contraindicatedDrugs: ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'combiflam'],
    severity: 'urgent',
    title: 'NSAID Hypersensitivity Conflict',
    description: 'Patient reports NSAID allergy/asthma exacerbation.',
  },
];

export function checkMedicationSafetyClient({ medications = [], allergyHistory = '', currentMedsDetail = '' }) {
  const flags = [];
  const normalizedMeds = medications.map(m => {
    const raw = typeof m === 'string' ? m : (m.name || '');
    return { raw, clean: raw.toLowerCase().trim() };
  }).filter(m => m.clean);

  // Drug-drug interaction check
  for (const rule of DRUG_INTERACTIONS) {
    const [d1, d2] = rule.pair;
    const hasD1 = normalizedMeds.some(m => m.clean.includes(d1));
    const hasD2 = normalizedMeds.some(m => m.clean.includes(d2));
    if (hasD1 && hasD2) {
      flags.push({
        id: `ddi_${d1}_${d2}`,
        type: 'drug_interaction',
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        disclaimer: 'Potential safety flag — physician/pharmacist verification required.',
      });
    }
  }

  // Allergy check
  const allAllergy = `${allergyHistory} ${currentMedsDetail}`.toLowerCase();
  for (const rule of ALLERGY_RULES) {
    if (allAllergy.includes(rule.allergenKeyword)) {
      for (const med of normalizedMeds) {
        if (rule.contraindicatedDrugs.some(cd => med.clean.includes(cd))) {
          flags.push({
            id: `allg_${rule.allergenKeyword}_${med.clean}`,
            type: 'allergy_conflict',
            severity: rule.severity,
            title: rule.title,
            description: `${rule.description} Prescribed med: "${med.raw}".`,
            disclaimer: 'Potential safety flag — physician/pharmacist verification required.',
          });
        }
      }
    }
  }

  return flags;
}
