// server/services/abdmService.js
// ABDM (Ayushman Bharat Digital Mission) Integration & FHIR R4 Bundle Generator
// Implements Adapter pattern: MockAdapter (development) vs ProductionAdapter (gateway)

import crypto from 'crypto';

export class ABDMAdapter {
  async verifyAbha(abhaId) { throw new Error('Not implemented'); }
  async registerConsent(consentData) { throw new Error('Not implemented'); }
  async pushHealthRecord(bundle) { throw new Error('Not implemented'); }
}

// Development Mock Adapter
export class ABDMMockAdapter extends ABDMAdapter {
  constructor() {
    super();
    this.isProduction = false;
    this.name = 'ABDM Sandbox / Development Mock Adapter';
  }

  async verifyAbha(abhaId) {
    await new Promise(r => setTimeout(r, 400));
    const digits = (abhaId || '').replace(/\D/g, '');
    const validMap = {
      '12345678901234': { name: 'Ramesh Gupta', dob: '1968-04-12', gender: 'M', phone: '9876543210' },
      '98765432109876': { name: 'Meera Verma', dob: '1984-11-25', gender: 'F', phone: '8765432109' },
      '11223344556677': { name: 'Suresh Joshi', dob: '1962-08-19', gender: 'M', phone: '7654321098' },
    };
    if (validMap[digits]) {
      return {
        status: 'VERIFIED',
        mode: 'MOCK_SANDBOX',
        patient: { ...validMap[digits], abhaId: digits },
        verifiedAt: new Date().toISOString(),
      };
    }
    return {
      status: digits.length === 14 ? 'NEW_ABHA_CREATION_ELIGIBLE' : 'INVALID_FORMAT',
      mode: 'MOCK_SANDBOX',
      patient: null,
    };
  }

  async registerConsent(consentData) {
    await new Promise(r => setTimeout(r, 300));
    return {
      consentId: `ABDM-CNS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      status: 'GRANTED',
      mode: 'MOCK_SANDBOX',
      timestamp: new Date().toISOString(),
      expiry: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    };
  }

  async pushHealthRecord(fhirBundle) {
    await new Promise(r => setTimeout(r, 500));
    const txnId = `ABDM-TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return {
      success: true,
      transactionId: txnId,
      mode: 'MOCK_SANDBOX',
      timestamp: new Date().toISOString(),
      bundleId: fhirBundle.id,
      entriesCount: fhirBundle.entry?.length || 0,
      note: 'Stored in VSarthi sandbox ABDM gateway registry. Ready for production credentials.',
    };
  }
}

// Production Adapter (connects to actual ABDM Milestone 1 & 2 Gateway endpoints)
export class ABDMProductionAdapter extends ABDMAdapter {
  constructor(config = {}) {
    super();
    this.isProduction = true;
    this.name = 'ABDM National Health Authority Production Gateway';
    this.clientId = config.clientId || process.env.ABDM_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.ABDM_CLIENT_SECRET;
    this.baseUrl = config.baseUrl || 'https://dev.abdm.gov.in/gateway';
  }

  async verifyAbha(abhaId) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('ABDM Production Adapter requires valid ABDM_CLIENT_ID and ABDM_CLIENT_SECRET');
    }
    // Production fetch logic when live credentials provided
    const res = await fetch(`${this.baseUrl}/v0.5/users/auth/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CM-ID': 'sbx',
      },
      body: JSON.stringify({ id: abhaId, authMode: 'MOBILE_OTP' }),
    });
    return res.json();
  }

  async registerConsent(consentData) {
    // Production consent artefact creation
    throw new Error('Production ABDM Gateway consent requires active gateway session token');
  }

  async pushHealthRecord(fhirBundle) {
    throw new Error('Production ABDM Health Information Provider (HIP) push requires active certificate');
  }
}

// Factory returning active adapter based on env
export function getABDMAdapter() {
  if (process.env.NODE_ENV === 'production' && process.env.ABDM_CLIENT_ID && process.env.ABDM_CLIENT_SECRET) {
    return new ABDMProductionAdapter();
  }
  return new ABDMMockAdapter();
}

// Convert VSarthi Clinical Summary to standard HL7 FHIR R4 Bundle
export function generateFHIRBundle({ patient, session, summary, documents = [] }) {
  const bundleId = `urn:uuid:${crypto.randomUUID()}`;
  const timestamp = new Date().toISOString();

  const entries = [
    // 1. Patient Resource
    {
      fullUrl: `urn:uuid:patient-${patient.id}`,
      resource: {
        resourceType: 'Patient',
        id: patient.id,
        identifier: [
          ...(patient.abhaId ? [{
            system: 'https://healthid.abdm.gov.in',
            value: patient.abhaId,
            type: { text: 'ABHA Number' },
          }] : []),
          {
            system: 'urn:vsarthi:token',
            value: session.token || patient.token,
          },
        ],
        name: [{ text: patient.name }],
        gender: patient.gender || 'unknown',
        birthDate: patient.dob || undefined,
        telecom: patient.phone ? [{ system: 'phone', value: patient.phone }] : [],
      },
    },

    // 2. Composition (Clinical Intake Document)
    {
      fullUrl: `urn:uuid:composition-${session.id}`,
      resource: {
        resourceType: 'Composition',
        id: `comp-${session.id}`,
        status: 'preliminary', // 'preliminary' until physician confirmed
        type: {
          coding: [{
            system: 'http://loinc.org',
            code: '34133-9',
            display: 'Summary of episode note',
          }],
          text: 'AI-Generated Clinical History Intake',
        },
        subject: { reference: `urn:uuid:patient-${patient.id}`, display: patient.name },
        date: timestamp,
        title: 'VSarthi.AI Clinical Intake Summary',
        section: Object.entries(summary.sections || {}).map(([key, content]) => ({
          title: key.toUpperCase(),
          code: { text: key },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${content}</p></div>`,
          },
        })),
      },
    },
  ];

  // 3. Observations for Red Flags
  if (session.redFlag) {
    entries.push({
      fullUrl: `urn:uuid:observation-redflag-${session.id}`,
      resource: {
        resourceType: 'Observation',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'exam' }] }],
        code: { text: 'Emergency Red-Flag Finding' },
        valueString: `${session.redFlag.name}: ${session.redFlag.message}`,
        interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'AA', display: 'Critical abnormal' }] }],
      },
    });
  }

  return {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp,
    entry: entries,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
    },
  };
}
