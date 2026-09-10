// services/abdm.js
// ABDM / ABHA ID validation and simulated push
// Swap-in: replace with real ABDM gateway API calls

const MOCK_ABHA_DB = {
  '12345678901234': { name: 'Ravi Kumar', dob: '1978-06-12', gender: 'male', phone: '9876543210' },
  '98765432109876': { name: 'Sunita Sharma', dob: '1990-11-25', gender: 'female', phone: '8765432109' },
  '11223344556677': { name: 'Arjun Mehta', dob: '2002-03-07', gender: 'male', phone: '7654321098' },
};

// Validate ABHA ID format: 14 digits (may be entered as XX-XXXX-XXXX-XXXX)
export function validateAbhaFormat(abhaId) {
  const digits = (abhaId || '').replace(/[-\s]/g, '');
  return /^\d{14}$/.test(digits);
}

export function formatAbhaId(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2)  return digits;
  if (digits.length <= 6)  return `${digits.slice(0,2)}-${digits.slice(2)}`;
  if (digits.length <= 10) return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`;
  return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6,10)}-${digits.slice(10)}`;
}

// Simulated ABHA lookup (200ms delay)
export async function lookupAbha(abhaId) {
  await new Promise(r => setTimeout(r, 800));
  const digits = abhaId.replace(/\D/g, '');
  const patient = MOCK_ABHA_DB[digits];
  if (patient) {
    return { found: true, patient: { ...patient, abhaId: digits } };
  }
  return { found: false, patient: null };
}

// Simulated push to HIS/ABHA at end of session
export async function pushToHIS(summaryData) {
  await new Promise(r => setTimeout(r, 1500));
  const token = `VSAI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  return { success: true, token, timestamp: new Date().toISOString() };
}
