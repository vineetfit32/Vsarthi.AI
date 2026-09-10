// src/services/apiClient.js
// Dual-mode API Client: connects to Express backend (http://localhost:5000)
// or gracefully falls back to local client state if server is offline

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('vsarthi_token') || null;
    this.serverAvailable = null; // null: unknown, true, false
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('vsarthi_token', token);
    else localStorage.removeItem('vsarthi_token');
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async checkServer() {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      this.serverAvailable = res.ok;
      return this.serverAvailable;
    } catch {
      this.serverAvailable = false;
      return false;
    }
  }

  async request(endpoint, options = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: { ...this.getHeaders(), ...(options.headers || {}) },
        signal: AbortSignal.timeout(6000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      this.serverAvailable = true;
      return data;
    } catch (err) {
      // If network failure, mark server as unavailable
      if (err.name === 'AbortError' || err.message.includes('fetch')) {
        this.serverAvailable = false;
      }
      throw err;
    }
  }

  // Auth
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  // Patient
  async createSession(payload) {
    return this.request('/patient/session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async lookupAbha(abhaId) {
    return this.request(`/patient/lookup-abha/${encodeURIComponent(abhaId)}`);
  }

  async registerPatient(payload) {
    return this.request('/patient/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async saveConsent(payload) {
    return this.request('/patient/consent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTimeline(sessionId) {
    return this.request(`/patient/timeline/${sessionId}`);
  }

  // Interview
  async recordAnswer(payload) {
    return this.request('/history/answer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Documents
  async processOcr(payload) {
    return this.request('/documents/ocr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Summary
  async generateSummary(sessionId) {
    return this.request('/summary/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async updateSummary(summaryId, payload) {
    return this.request(`/summary/${summaryId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Doctor & Queue
  async getDoctorQueue(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/doctor/queue${query ? `?${query}` : ''}`);
  }

  async getPatientDossier(sessionId) {
    return this.request(`/doctor/patient/${sessionId}`);
  }

  async updateTriagePriority(payload) {
    return this.request('/doctor/triage-priority', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin
  async getAdminMetrics() {
    return this.request('/admin/metrics');
  }

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/audit${query ? `?${query}` : ''}`);
  }

  async getUsers() {
    return this.request('/admin/users');
  }

  // HIS / FHIR Export
  async exportToHis(sessionId) {
    return this.request('/his/export', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
