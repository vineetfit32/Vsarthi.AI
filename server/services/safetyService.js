// server/services/safetyService.js
// Medication safety checker: duplicate detection, drug interactions, allergy conflicts

// Known active ingredient alias map
const INGREDIENT_MAP = {
  paracetamol: ['paracetamol', 'acetaminophen', 'crocin', 'calpol', 'dolo', 'pacimol'],
  aspirin: ['aspirin', 'ecosprin', 'disprin', 'acetylsalicylic acid'],
  amlodipine: ['amlodipine', 'amlong', 'amlovas', 'stamlo'],
  telmisartan: ['telmisartan', 'telma', 'telpres', 'telsartan'],
  metformin: ['metformin', 'glycomet', 'glyciphage', 'obimet'],
  atorvastatin: ['atorvastatin', 'atorva', 'lipitor', 'storvas'],
  pantoprazole: ['pantoprazole', 'pantocid', 'pan-40', 'pantodac'],
  amoxicillin: ['amoxicillin', 'mox', 'novamox', 'amoxyclav', 'augmentin'],
  ibuprofen: ['ibuprofen', 'brufen', 'combiflam'],
  diclofenac: ['diclofenac', 'voveran', 'volini'],
  warfarin: ['warfarin', 'coumadin'],
  clopidogrel: ['clopidogrel', 'clopilet', 'plavix'],
  ciprofloxacin: ['ciprofloxacin', 'cifran', 'ciro'],
};

// Drug-drug interaction rules
const DRUG_INTERACTION_RULES = [
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

// Allergy cross-sensitivities
const ALLERGY_RULES = [
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

function normalizeDrugName(raw) {
  const clean = (raw || '').toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(INGREDIENT_MAP)) {
    if (aliases.some(a => clean.includes(a))) {
      return canonical;
    }
  }
  return clean.split(/[\s\d]/)[0] || clean;
}

export function checkMedicationSafety({ medications = [], allergyHistory = '', currentMedsDetail = '' }) {
  const flags = [];
  const normalizedMeds = medications.map(m => {
    const rawName = typeof m === 'string' ? m : (m.name || '');
    return {
      raw: rawName,
      canonical: normalizeDrugName(rawName),
      dose: typeof m === 'object' ? m.dose : '',
    };
  }).filter(m => m.canonical);

  // 1. Check Duplicate Active Ingredients
  const seen = {};
  for (const med of normalizedMeds) {
    if (seen[med.canonical]) {
      flags.push({
        id: `dup_${med.canonical}`,
        type: 'duplicate_ingredient',
        severity: 'urgent',
        title: `Duplicate Active Ingredient: ${med.canonical.toUpperCase()}`,
        description: `Prescribed multiple formulations containing ${med.canonical} ("${seen[med.canonical]}" and "${med.raw}"). Potential accidental toxicity.`,
        disclaimer: 'Potential safety flag — physician/pharmacist verification required.',
      });
    } else {
      seen[med.canonical] = med.raw;
    }
  }

  // 2. Check Drug-Drug Interactions
  const canonicalList = normalizedMeds.map(m => m.canonical);
  for (const rule of DRUG_INTERACTION_RULES) {
    const [d1, d2] = rule.pair;
    if (canonicalList.includes(d1) && canonicalList.includes(d2)) {
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

  // 3. Check Allergy Conflicts
  const allergyText = `${allergyHistory} ${currentMedsDetail}`.toLowerCase();
  for (const rule of ALLERGY_RULES) {
    if (allergyText.includes(rule.allergenKeyword)) {
      for (const med of normalizedMeds) {
        if (rule.contraindicatedDrugs.includes(med.canonical)) {
          flags.push({
            id: `allg_${rule.allergenKeyword}_${med.canonical}`,
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
