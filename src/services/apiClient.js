// src/services/apiClient.js
// VSarthi.AI API Client — connects to Express backend
// All sensitive operations go through the backend; no API keys in frontend

const API_BASE = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
   window.location.hostname !== 'localhost' &&
   window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:5000/api');

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('vsarthi_token') || null;
    this.serverAvailable = null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('vsarthi_token', token);
    } else {
      localStorage.removeItem('vsarthi_token');
      localStorage.removeItem('vsarthi_user');
    }
  }

  setUser(user) {
    if (user) {
      localStorage.setItem('vsarthi_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vsarthi_user');
    }
  }

  getStoredUser() {
    try {
      const raw = localStorage.getItem('vsarthi_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
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
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.serverAvailable = res.ok;
      return this.serverAvailable;
    } catch {
      this.serverAvailable = false;
      return false;
    }
  }

  async request(endpoint, options = {}, timeoutMs = 30000) {
    const url = `${API_BASE}${endpoint}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers: { ...this.getHeaders(), ...(options.headers || {}) },
        signal: AbortSignal.timeout(timeoutMs),
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = { message: await res.text() };
      }

      if (!res.ok) {
        const err = new Error(data.error || data.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.fields = data.fields || null;
        throw err;
      }

      this.serverAvailable = true;
      return data;
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        this.serverAvailable = false;
        const timeoutErr = new Error('Request timed out. Please check your connection and try again.');
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        this.serverAvailable = false;
        const networkErr = new Error('Cannot connect to server. Please ensure the backend is running.');
        networkErr.isNetwork = true;
        throw networkErr;
      }
      throw err;
    }
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  }

  async register(payload) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
    this.serverAvailable = null;
  }

  // ─── AI Chat ──────────────────────────────────────────────────────────────
  async sendChatMessage(message, conversationHistory = [], sessionId = null) {
    return this.request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, conversationHistory, sessionId }),
    }, 60000); // 60s timeout for AI responses
  }

  async getChatStatus() {
    return this.request('/chat/status');
  }

  // ─── Prescription Scanner ─────────────────────────────────────────────────
  async scanPrescription(imageBase64, mimeType = 'image/jpeg', filename = 'prescription', sessionId = null) {
    return this.request('/prescription/scan', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType, filename, sessionId }),
    }, 120000); // 2 min timeout for vision processing
  }

  async confirmPrescription(prescriptionId, confirmedData, userNotes = '') {
    return this.request(`/prescription/${prescriptionId}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({ confirmedData, userNotes }),
    });
  }

  async deletePrescription(prescriptionId) {
    return this.request(`/prescription/${prescriptionId}`, {
      method: 'DELETE',
    });
  }

  // ─── Patient ──────────────────────────────────────────────────────────────
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

  // ─── Interview ────────────────────────────────────────────────────────────
  async recordAnswer(payload) {
    return this.request('/history/answer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Documents (OCR) ─────────────────────────────────────────────────────
  async processOcr(payload) {
    return this.request('/documents/ocr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
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

  // ─── Doctor & Queue ───────────────────────────────────────────────────────
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

  // ─── Admin ────────────────────────────────────────────────────────────────
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

  async startDoctorReview(sessionId) {
    return this.request(`/doctor/start-review/${sessionId}`, {
      method: 'POST',
    });
  }

  // ─── HIS / FHIR / HL7 Export ─────────────────────────────────────────────
  async exportToHis(sessionId, format = 'fhir') {
    return this.request('/his/export', {
      method: 'POST',
      body: JSON.stringify({ sessionId, format }),
    });
  }

  async lookupHisPatient(identifier, type = 'MRN') {
    return this.request('/his/patient-lookup', {
      method: 'POST',
      body: JSON.stringify({ identifier, type }),
    });
  }

  async linkHisAppointment(payload) {
    return this.request('/his/appointment-link', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getHisExportStatus(exportId) {
    return this.request(`/his/status/${exportId}`);
  }

  async retryHisExport(exportId) {
    return this.request(`/his/retry/${exportId}`, {
      method: 'POST',
    });
  }

  getHisFhirUrl(sessionId) {
    return `${API_BASE}/his/fhir/${sessionId}`;
  }

  getHisHl7Url(sessionId) {
    return `${API_BASE}/his/hl7/${sessionId}`;
  }

  getHisProprietaryUrl(sessionId) {
    return `${API_BASE}/his/proprietary/${sessionId}`;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
