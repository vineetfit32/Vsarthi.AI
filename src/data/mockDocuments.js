// Mock extracted document data for demo purposes
// When a user uploads a file, ocr.js returns one of these randomly (or based on filename)

export const MOCK_DOCUMENTS = [
  {
    id: 'doc_demo_1',
    name: 'Apollo_Prescription_2024.jpg',
    type: 'prescription',
    uploadDate: '2024-11-15',
    source: 'Apollo Hospitals, Delhi',
    status: 'extracted',
    extractedData: {
      diagnosis: 'Essential Hypertension, Stage 1',
      medicines: [
        { name: 'Amlodipine', dose: '5 mg', frequency: 'Once daily (morning)', duration: '3 months' },
        { name: 'Telmisartan', dose: '40 mg', frequency: 'Once daily', duration: '3 months' },
      ],
      labValues: [],
      notes: 'BP target < 130/80 mmHg. Low-salt diet advised. Review after 3 months.',
    },
    abnormal: false,
  },
  {
    id: 'doc_demo_2',
    name: 'Lab_Report_CBC_2024.pdf',
    type: 'lab_report',
    uploadDate: '2024-10-22',
    source: 'SRL Diagnostics',
    status: 'extracted',
    extractedData: {
      diagnosis: 'Complete Blood Count (CBC)',
      medicines: [],
      labValues: [
        { test: 'Hemoglobin', value: '9.8', unit: 'g/dL', normalRange: '12.0–17.0', isAbnormal: true },
        { test: 'WBC Count', value: '11,200', unit: '/µL', normalRange: '4,000–11,000', isAbnormal: true },
        { test: 'Platelet Count', value: '1,85,000', unit: '/µL', normalRange: '1,50,000–4,00,000', isAbnormal: false },
        { test: 'MCV', value: '72', unit: 'fL', normalRange: '80–100', isAbnormal: true },
        { test: 'MCH', value: '23', unit: 'pg', normalRange: '27–33', isAbnormal: true },
      ],
      notes: 'Microcytic hypochromic anemia. Suggest serum iron, TIBC, ferritin.',
    },
    abnormal: true,
  },
  {
    id: 'doc_demo_3',
    name: 'Discharge_Summary_2023.pdf',
    type: 'discharge_summary',
    uploadDate: '2023-07-08',
    source: 'Fortis Hospital, Gurgaon',
    status: 'extracted',
    extractedData: {
      diagnosis: 'Acute Appendicitis — Laparoscopic Appendectomy done',
      medicines: [
        { name: 'Amoxicillin-Clavulanate', dose: '625 mg', frequency: 'Twice daily', duration: '7 days' },
        { name: 'Pantoprazole', dose: '40 mg', frequency: 'Once daily', duration: '14 days' },
      ],
      labValues: [
        { test: 'WBC (at admission)', value: '18,500', unit: '/µL', normalRange: '4,000–11,000', isAbnormal: true },
        { test: 'CRP', value: '87', unit: 'mg/L', normalRange: '< 5', isAbnormal: true },
      ],
      notes: 'Procedure: Laparoscopic appendectomy under GA. Duration of stay: 3 days. Follow-up in 2 weeks.',
    },
    abnormal: false,
  },
  {
    id: 'doc_demo_4',
    name: 'Thyroid_Report_2024.jpg',
    type: 'lab_report',
    uploadDate: '2024-09-01',
    source: 'Thyrocare Labs',
    status: 'extracted',
    extractedData: {
      diagnosis: 'Thyroid Function Tests (TFT)',
      medicines: [],
      labValues: [
        { test: 'TSH', value: '8.9', unit: 'mIU/L', normalRange: '0.4–4.0', isAbnormal: true },
        { test: 'Free T4', value: '0.7', unit: 'ng/dL', normalRange: '0.8–1.8', isAbnormal: true },
        { test: 'Free T3', value: '2.1', unit: 'pg/mL', normalRange: '2.3–4.2', isAbnormal: true },
      ],
      notes: 'Consistent with Primary Hypothyroidism. Endocrinology referral advised.',
    },
    abnormal: true,
  },
];

export function getMockDocument(filename) {
  // Try to match by type keywords in filename
  const lower = (filename || '').toLowerCase();
  if (lower.includes('lab') || lower.includes('report') || lower.includes('blood') || lower.includes('cbc'))
    return MOCK_DOCUMENTS[1];
  if (lower.includes('discharge') || lower.includes('summary') || lower.includes('hospital'))
    return MOCK_DOCUMENTS[2];
  if (lower.includes('thyroid') || lower.includes('tft') || lower.includes('tsh'))
    return MOCK_DOCUMENTS[3];
  // Default: prescription
  return MOCK_DOCUMENTS[0];
}
