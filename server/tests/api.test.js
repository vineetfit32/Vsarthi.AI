// server/tests/api.test.js
// Automated verification test suite for VSarthi.AI API & Clinical Engines
import app from '../index.js';
import db from '../db.js';
import { checkMedicationSafety } from '../services/safetyService.js';
import { extractMedicalEntities } from '../routes/documents.js';
import { generateFHIRBundle } from '../services/abdmService.js';
import http from 'http';

let server;
const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function post(url, data, headers = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

async function get(url, headers = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return { status: res.status, body: await res.json() };
}

async function runTests() {
  console.log('--- STARTING AUTOMATED BACKEND VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Start temporary test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      resolve();
    });
  });

  try {
    // 1. Health Check
    const health = await get('/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'Health check responds 200 OK');

    // 2. Auth Login (Doctor)
    const docLogin = await post('/api/auth/login', {
      email: 'dr.sharma@hospital.org',
      password: 'doctor123',
    });
    assert(docLogin.status === 200 && docLogin.body.token, 'Doctor login succeeds and issues token');
    const docToken = docLogin.body.token;

    // 3. Auth Login (Invalid)
    const badLogin = await post('/api/auth/login', {
      email: 'dr.sharma@hospital.org',
      password: 'wrong_password',
    });
    assert(badLogin.status === 401, 'Invalid password correctly rejected with 401');

    // 4. Patient Session Creation
    const sessRes = await post('/api/patient/session', {
      language: 'hi',
      ayushMode: false,
      isKiosk: true,
    });
    assert(sessRes.status === 201 && sessRes.body.session?.token, 'Patient session created with token');
    const sessionId = sessRes.body.session.id;

    // 5. ABHA Lookup
    const abhaRes = await get('/api/patient/lookup-abha/12345678901234');
    assert(abhaRes.status === 200 && abhaRes.body.found && abhaRes.body.patient?.name === 'Ramesh Gupta', 'ABHA lookup retrieves existing record');

    // 6. DPDPA Consent Recording
    const consentRes = await post('/api/consent', {
      sessionId,
      patientId: 'pat_101',
      dataCapture: true,
      dataSharing: true,
      policyVersion: 'DPDPA-2023-V2.1',
    });
    assert(consentRes.status === 201 && consentRes.body.success, 'DPDPA 2023 consent successfully recorded');

    // 7. Red-Flag Detection (Acute Coronary Syndrome)
    const answerRes = await post('/api/history/answer', {
      sessionId,
      key: 'chiefComplaint',
      value: ['chest_pain'],
      allAnswers: {
        chiefComplaint: ['chest_pain'],
        severity: 9,
        radiation: ['arm', 'jaw'],
        associated: ['sob', 'sweating'],
      },
    });
    assert(answerRes.status === 200 && answerRes.body.redFlag?.id === 'acs', 'Red-flag engine flags Acute Coronary Syndrome on chest pain + arm radiation + SOB');

    // 8. Document OCR Entity Extraction
    const ocrSample = 'Rx Apollo Hospitals. Pt diagnosed with Essential Hypertension. Amlodipine 5mg OD. Telmisartan 40mg OD.';
    const entities = extractMedicalEntities(ocrSample, 'prescription_apollo.jpg');
    assert(entities.medicines.length >= 2, 'Medical entity extraction identified prescribed medicines from text');

    // 9. Medication Safety Checker (DDI and Allergy)
    const safetyResult = checkMedicationSafety({
      medications: [{ name: 'Aspirin 75mg' }, { name: 'Warfarin 2mg' }, { name: 'Amoxicillin 500mg' }],
      allergyHistory: 'Patient allergic to Penicillin',
    });
    const hasBleedRisk = safetyResult.some(f => f.id.includes('aspirin_warfarin'));
    const hasAllergyConflict = safetyResult.some(f => f.type === 'allergy_conflict');
    assert(hasBleedRisk, 'Medication safety engine detected Aspirin + Warfarin bleeding risk');
    assert(hasAllergyConflict, 'Medication safety engine flagged Penicillin allergy conflict against Amoxicillin');

    // 10. Summary Generation
    const summaryRes = await post('/api/summary/generate', { sessionId });
    assert(summaryRes.status === 200 && summaryRes.body.summary?.sections?.chiefComplaint, 'Structured 16-section clinical summary generated');

    // 11. Doctor Queue
    const queueRes = await get('/api/doctor/queue');
    assert(queueRes.status === 200 && queueRes.body.queue?.length > 0, 'Doctor queue returns patient cards with priority triage');

    // 12. HIS / FHIR Export
    const hisRes = await post('/api/his/export', { sessionId });
    assert(hisRes.status === 200 && hisRes.body.success && hisRes.body.token, 'HIS / EMR export dispatched with token');

    // 13. Admin Metrics & Audit
    const adminMetrics = await get('/api/admin/metrics');
    assert(adminMetrics.status === 200 && adminMetrics.body.kpis?.totalPatients > 0, 'Admin metrics endpoint returns operational KPIs');

    const auditRes = await get('/api/admin/audit');
    assert(auditRes.status === 200 && auditRes.body.logs?.length > 0, 'Audit log endpoint records and returns security events');

    console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    if (failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
    setTimeout(() => {
      process.exit(failed > 0 ? 1 : 0);
    }, 200);
  }
}

runTests();
