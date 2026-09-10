// server/db.js
// Persistent embedded JSON database for VSarthi.AI
// Uses bcryptjs for password hashing (NOT SHA-256)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'vsarthi_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Password Hashing (bcrypt) ────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  // Support legacy SHA-256 hashes during migration
  if (hash && hash.length === 64 && /^[a-f0-9]+$/.test(hash)) {
    // Old SHA-256 hash — compare and note that it should be re-hashed on next login
    const sha256Hash = crypto.createHash('sha256').update(plain).digest('hex');
    return sha256Hash === hash;
  }
  return bcrypt.compareSync(plain, hash);
}

// ─── Initial seed data ─────────────────────────────────────────────────────────
function getInitialData() {
  return {
    users: [
      {
        id: 'usr_doc_1',
        email: 'dr.sharma@hospital.org',
        passwordHash: hashPassword('doctor123'),
        name: 'Dr. Ananya Sharma, MD',
        role: 'doctor',
        department: 'Cardiology / General Medicine',
        phone: '9800000001',
        createdAt: '2026-01-10T08:00:00.000Z',
        isActive: true,
      },
      {
        id: 'usr_doc_2',
        email: 'dr.patel@hospital.org',
        passwordHash: hashPassword('doctor123'),
        name: 'Dr. Vikram Patel, MS',
        role: 'doctor',
        department: 'General Surgery / Emergency',
        phone: '9800000002',
        createdAt: '2026-01-15T08:00:00.000Z',
        isActive: true,
      },
      {
        id: 'usr_nurse_1',
        email: 'nurse@hospital.org',
        passwordHash: hashPassword('nurse123'),
        name: 'Sister Priya Singh, RN',
        role: 'nurse',
        department: 'OPD Triage',
        phone: '9800000003',
        createdAt: '2026-02-01T08:00:00.000Z',
        isActive: true,
      },
      {
        id: 'usr_admin_1',
        email: 'admin@hospital.org',
        passwordHash: hashPassword('admin123'),
        name: 'OPD Administrator',
        role: 'admin',
        department: 'Hospital Administration',
        phone: '9800000004',
        createdAt: '2026-01-01T08:00:00.000Z',
        isActive: true,
      },
    ],
    patients: [
      {
        id: 'pat_101',
        token: 'A-101',
        abhaId: '12345678901234',
        name: 'Ramesh Gupta',
        dob: '1968-04-12',
        age: 58,
        gender: 'male',
        phone: '9876543210',
        createdAt: '2026-09-10T08:15:00.000Z',
      },
      {
        id: 'pat_102',
        token: 'A-102',
        abhaId: '98765432109876',
        name: 'Meera Verma',
        dob: '1984-11-25',
        age: 42,
        gender: 'female',
        phone: '8765432109',
        createdAt: '2026-09-10T08:30:00.000Z',
      },
      {
        id: 'pat_103',
        token: 'A-103',
        abhaId: '11223344556677',
        name: 'Suresh Joshi',
        dob: '1962-08-19',
        age: 64,
        gender: 'male',
        phone: '7654321098',
        createdAt: '2026-09-10T08:45:00.000Z',
      },
      {
        id: 'pat_104',
        token: 'A-104',
        abhaId: '',
        name: 'Aarav Sharma',
        dob: '2019-02-14',
        age: 7,
        gender: 'male',
        phone: '9988776655',
        createdAt: '2026-09-10T09:00:00.000Z',
      },
    ],
    sessions: [
      {
        id: 'sess_101',
        token: 'A-101',
        patientId: 'pat_101',
        status: 'urgent_review',
        priority: 'critical',
        language: 'hi',
        ayushMode: false,
        isKiosk: true,
        redFlag: {
          id: 'acs',
          name: 'Possible Acute Coronary Syndrome',
          severity: 'critical',
          message: 'सीने में दर्द के साथ बाएं हाथ में दर्द और पसीना — तत्काल हृदय जांच आवश्यक।',
          detectedAt: '2026-09-10T08:22:00.000Z',
        },
        chiefComplaint: ['chest_pain'],
        chiefComplaintDisplay: 'सीने में दर्द (Chest Pain)',
        duration: '2_3_days',
        startedAt: '2026-09-10T08:16:00.000Z',
        completedAt: '2026-09-10T08:24:00.000Z',
      },
      {
        id: 'sess_102',
        token: 'A-102',
        patientId: 'pat_102',
        status: 'summary_ready',
        priority: 'routine',
        language: 'en',
        ayushMode: false,
        isKiosk: false,
        redFlag: null,
        chiefComplaint: ['diabetes_fu', 'fatigue'],
        chiefComplaintDisplay: 'Diabetes Follow-up & Fatigue',
        duration: '1_3_months',
        startedAt: '2026-09-10T08:31:00.000Z',
        completedAt: '2026-09-10T08:42:00.000Z',
      },
      {
        id: 'sess_103',
        token: 'A-103',
        patientId: 'pat_103',
        status: 'summary_ready',
        priority: 'routine',
        language: 'hi',
        ayushMode: true,
        isKiosk: true,
        redFlag: null,
        chiefComplaint: ['joint_pain'],
        chiefComplaintDisplay: 'जोड़ों में दर्द (संधिशूल - Vata Vyadhi)',
        duration: 'over_3mo',
        startedAt: '2026-09-10T08:46:00.000Z',
        completedAt: '2026-09-10T08:58:00.000Z',
      },
      {
        id: 'sess_104',
        token: 'A-104',
        patientId: 'pat_104',
        status: 'summary_ready',
        priority: 'urgent',
        language: 'en',
        ayushMode: false,
        isKiosk: false,
        redFlag: null,
        chiefComplaint: ['fever', 'cough'],
        chiefComplaintDisplay: 'High Fever & Cough (3 days)',
        duration: '2_3_days',
        startedAt: '2026-09-10T09:01:00.000Z',
        completedAt: '2026-09-10T09:12:00.000Z',
      },
    ],
    clinical_histories: [
      {
        id: 'ch_101',
        sessionId: 'sess_101',
        answers: {
          chiefComplaint: ['chest_pain'],
          duration: '2_3_days',
          site: 'left_chest',
          onset: 'exertion',
          character: 'pressure',
          radiation: ['arm', 'jaw'],
          severity: 8,
          associated: ['sob', 'sweating'],
          relieving: ['rest'],
          pastMedical: ['hypertension'],
          pastSurgery: 'no',
          currentMeds: 'yes',
          currentMedsDetail: 'Amlodipine 5mg OD',
          drugAllergy: 'no',
          familyHistory: ['heart_disease'],
          smoking: 'former',
          alcohol: 'social',
          diet: 'vegetarian',
        },
      },
      {
        id: 'ch_102',
        sessionId: 'sess_102',
        answers: {
          chiefComplaint: ['diabetes_fu'],
          duration: 'years',
          severity: 4,
          pastMedical: ['diabetes', 'hypertension'],
          pastSurgery: 'no',
          currentMeds: 'yes',
          currentMedsDetail: 'Metformin 500mg BD, Telmisartan 40mg OD',
          drugAllergy: 'yes',
          drugAllergyDetail: 'Penicillin (Skin rash)',
          familyHistory: ['diabetes'],
          diet: 'mixed',
          exercise: 'sedentary',
        },
      },
    ],
    documents: [
      {
        id: 'doc_101_1',
        sessionId: 'sess_101',
        name: 'Apollo_Prescription_Cardio.jpg',
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
          notes: 'BP target < 130/80 mmHg. Low-salt diet advised.',
        },
        abnormal: false,
      },
      {
        id: 'doc_102_1',
        sessionId: 'sess_102',
        name: 'SRL_Lab_Report_HbA1c_CBC.pdf',
        type: 'lab_report',
        uploadDate: '2024-10-22',
        source: 'SRL Diagnostics',
        status: 'extracted',
        extractedData: {
          diagnosis: 'Diabetes Profile & CBC',
          medicines: [],
          labValues: [
            { test: 'HbA1c', value: '8.4', unit: '%', normalRange: '< 5.7', isAbnormal: true, status: 'high' },
            { test: 'Fasting Blood Sugar', value: '168', unit: 'mg/dL', normalRange: '70–100', isAbnormal: true, status: 'high' },
            { test: 'Hemoglobin', value: '10.2', unit: 'g/dL', normalRange: '12.0–15.5', isAbnormal: true, status: 'low' },
          ],
          notes: 'Poor glycemic control. Mild microcytic anemia.',
        },
        abnormal: true,
      },
    ],
    ai_summaries: [
      {
        id: 'sum_101',
        sessionId: 'sess_101',
        status: 'pending_physician_review',
        confidenceScore: 0.94,
        sections: {
          patientInfo: 'Ramesh Gupta, 58/M, ABHA: 12-3456-7890-1234, Token: A-101',
          chiefComplaint: 'Chest pain radiating to left arm and jaw of 2–3 days duration, aggravated on exertion.',
          hpi: 'Patient reports retrosternal pressure-type chest pain (8/10) radiating to left upper arm and jaw, starting 2–3 days ago with worsening on exertion. Associated with shortness of breath and cold diaphoresis. Partially relieved at rest.',
          pastMedical: 'Known case of Essential Hypertension (3 years). No prior myocardial infarction reported.',
          pastSurgical: 'No surgical history.',
          medications: 'Amlodipine 5 mg OD, Telmisartan 40 mg OD (from Apollo prescription 15/11/2024).',
          allergies: 'No known drug allergies (NKDA).',
          familyHistory: 'Significant for ischemic heart disease in father (MI at age 55).',
          personalHistory: 'Former smoker (quit 2 years ago, 15 pack-years). Occasional alcohol. Vegetarian.',
          reviewOfSystems: 'Cardiovascular: Positive for exertional chest pain & dyspnea. No syncope or ankle edema.',
          priorInvestigations: 'Prescription reviewed: Baseline BP 142/90 mmHg recorded previously.',
          importantAbnormals: 'Acute exertional chest pain with radiating features; high cardiac risk profile.',
          timelineSummary: '2024: Diagnosed with Essential HTN -> 2026: Acute onset angina pectoris.',
          redFlags: '🚨 CRITICAL RED FLAG: Possible Acute Coronary Syndrome. Immediate ECG and cardiac enzyme evaluation mandated.',
          missingInfo: 'Recent lipid profile, baseline ECG, renal function tests.',
          aiConfidenceNotes: 'AI-generated clinical intake summary — Physician review and verification required before clinical decision making.',
        },
        sectionStatus: {
          patientInfo: 'accepted', chiefComplaint: 'accepted', hpi: 'accepted',
          pastMedical: 'accepted', pastSurgical: 'accepted', medications: 'accepted',
          allergies: 'accepted', familyHistory: 'accepted', personalHistory: 'accepted',
          reviewOfSystems: 'accepted', priorInvestigations: 'accepted',
          importantAbnormals: 'accepted', timelineSummary: 'accepted',
          redFlags: 'accepted', missingInfo: 'accepted', aiConfidenceNotes: 'accepted',
        },
        physicianNotes: {},
        updatedAt: '2026-09-10T08:25:00.000Z',
      },
    ],
    consents: [
      {
        id: 'cns_101',
        sessionId: 'sess_101',
        patientId: 'pat_101',
        dataCapture: true,
        dataSharing: true,
        acceptedAt: '2026-09-10T08:15:30.000Z',
        policyVersion: 'DPDPA-2023-V2.1',
        ipAddress: '127.0.0.1',
        revoked: false,
      },
    ],
    audit_logs: [
      {
        id: 'aud_1',
        actorRole: 'patient',
        actorId: 'pat_101',
        action: 'CONSENT_GRANTED',
        targetType: 'consent',
        targetId: 'cns_101',
        timestamp: '2026-09-10T08:15:30.000Z',
        details: { policyVersion: 'DPDPA-2023-V2.1', scope: 'capture_and_share' },
      },
    ],
    notifications: [],
    prescriptions: [],
    chat_sessions: [],
    system_config: {
      hospitalName: 'VSarthi.AI OPD Platform',
      retentionDays: 90,
      emergencyNumber: '112',
      ambulanceNumber: '108',
      abdmEnvironment: 'sandbox',
      kioskInactivitySeconds: 60,
    },
  };
}

// ─── Database Engine ──────────────────────────────────────────────────────────
class Database {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure new collections exist (migration)
        if (!this.data.prescriptions) this.data.prescriptions = [];
        if (!this.data.chat_sessions) this.data.chat_sessions = [];
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch (err) {
      console.warn('Could not read DB file, initializing with fresh seed data:', err.message);
      this.data = getInitialData();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write to DB file:', err.message);
    }
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    const list = this.data[name];
    const self = this;

    return {
      find(filter = {}) {
        return list.filter(item => {
          return Object.entries(filter).every(([k, v]) => {
            if (typeof v === 'function') return v(item[k]);
            return item[k] === v;
          });
        });
      },
      findOne(filter = {}) {
        return this.find(filter)[0] || null;
      },
      findById(id) {
        return list.find(item => item.id === id) || null;
      },
      insert(record) {
        const item = {
          id: record.id || `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          createdAt: new Date().toISOString(),
          ...record,
        };
        list.push(item);
        self.save();
        return item;
      },
      update(id, updates) {
        const idx = list.findIndex(item => item.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
        self.save();
        return list[idx];
      },
      upsert(filter, record) {
        const existing = this.findOne(filter);
        if (existing) {
          return this.update(existing.id, record);
        }
        return this.insert({ ...filter, ...record });
      },
      delete(id) {
        const idx = list.findIndex(item => item.id === id);
        if (idx === -1) return false;
        list.splice(idx, 1);
        self.save();
        return true;
      },
      count(filter = {}) {
        return this.find(filter).length;
      },
    };
  }

  logAudit({ actorRole, actorId, action, targetType, targetId, details = {} }) {
    return this.collection('audit_logs').insert({
      actorRole,
      actorId,
      action,
      targetType,
      targetId,
      timestamp: new Date().toISOString(),
      details,
    });
  }

  reset() {
    this.data = getInitialData();
    this.save();
    return this.data;
  }
}

export const db = new Database();
export default db;
