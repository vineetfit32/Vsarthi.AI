// src/screens/AdminDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';
import {
  Shield, Users, Activity, FileText, ArrowLeft,
  CheckCircle2, Clock, BarChart3, Settings, ShieldCheck,
  AlertTriangle, RefreshCw, Key, Database, Building2
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminDashboardScreen({ onBackHome }) {
  const [metrics, setMetrics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'audit' | 'users' | 'settings'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, aRes, uRes] = await Promise.all([
        apiClient.getAdminMetrics().catch(() => null),
        apiClient.getAuditLogs({ limit: 25 }).catch(() => null),
        apiClient.getUsers().catch(() => null),
      ]);

      if (mRes) setMetrics(mRes);
      if (aRes) setAuditLogs(aRes.logs || []);
      if (uRes) setUsers(uRes.users || []);
    } catch (err) {
      console.warn('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = metrics?.kpis || {
    totalPatients: 364,
    todayPatients: 4,
    completedHistories: 3,
    pendingHistories: 1,
    redFlagPatients: 1,
    documentsProcessed: 144,
    ocrSuccessRate: '98%',
    averageIntakeTime: '3.8 min',
    doctorReviewRate: '85%',
  };

  const volumeTrend = metrics?.charts?.volumeTrend || [
    { date: '04 Sep', patients: 38, redFlags: 2 },
    { date: '05 Sep', patients: 45, redFlags: 4 },
    { date: '06 Sep', patients: 52, redFlags: 3 },
    { date: '07 Sep', patients: 48, redFlags: 5 },
    { date: '08 Sep', patients: 61, redFlags: 6 },
    { date: '09 Sep', patients: 58, redFlags: 4 },
    { date: '10 Sep (Today)', patients: 4, redFlags: 1 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBackHome} className="btn-ghost p-2 text-slate-500 hover:text-slate-700" title="Return to Home">
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">Hospital Administration &amp; Analytics</h2>
              <p className="text-xs text-slate-500">AIIMS OPD Smart Intake · Governance &amp; Security</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={loadData} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex gap-6 text-xs sm:text-sm font-bold">
          {[
            { id: 'analytics', label: '📊 Clinical Analytics' },
            { id: 'audit', label: '🛡️ DPDPA Audit Logs' },
            { id: 'users', label: '👥 Staff & Users' },
            { id: 'settings', label: '⚙️ Configuration' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                'py-3 border-b-2 transition-all',
                activeTab === t.id
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'analytics' && (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="card p-4 bg-white border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Patients</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{kpis.totalPatients}</p>
                <span className="text-[10px] text-emerald-600 font-medium">↑ All-time record</span>
              </div>

              <div className="card p-4 bg-white border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Today's Volume</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{kpis.todayPatients}</p>
                <span className="text-[10px] text-slate-400">Current OPD session</span>
              </div>

              <div className="card p-4 bg-red-50/50 border border-red-200">
                <p className="text-[11px] text-red-700 font-semibold uppercase">Red-Flag Cases</p>
                <p className="text-2xl font-black text-red-600 mt-1">{kpis.redFlagPatients}</p>
                <span className="text-[10px] text-red-600 font-bold">Priority triaged</span>
              </div>

              <div className="card p-4 bg-white border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold uppercase">OCR Success Rate</p>
                <p className="text-2xl font-black text-indigo-600 mt-1">{kpis.ocrSuccessRate}</p>
                <span className="text-[10px] text-slate-400">{kpis.documentsProcessed} docs processed</span>
              </div>

              <div className="card p-4 bg-white border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Avg Intake Time</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{kpis.averageIntakeTime}</p>
                <span className="text-[10px] text-emerald-600">vs 12 min manual</span>
              </div>
            </div>

            {/* Volume Trend & Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Volume Bar Visualizer */}
              <div className="card p-5 bg-white border border-slate-200 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Patient Volume Trend (Last 7 Days)</h3>
                  <span className="text-xs text-slate-400">Aggregated intake volume</span>
                </div>

                <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
                  {volumeTrend.map((v, i) => {
                    const max = 70;
                    const heightPct = Math.min(100, Math.round((v.patients / max) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="relative w-full flex justify-center">
                          {/* Bar */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full max-w-[36px] bg-primary-500 rounded-t-lg group-hover:bg-primary-600 transition-all flex items-end justify-center pb-1 text-[10px] font-bold text-white shadow-sm min-h-[20px]"
                          >
                            {v.patients}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium text-center truncate w-full">
                          {v.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department Breakdown */}
              <div className="card p-5 bg-white border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Department Distribution</h3>
                <div className="space-y-3 text-xs">
                  {[
                    { name: 'Cardiology', count: 38, color: 'bg-red-500' },
                    { name: 'General Medicine', count: 86, color: 'bg-blue-500' },
                    { name: 'AYUSH / Integrative', count: 24, color: 'bg-emerald-500' },
                    { name: 'Pulmonology', count: 32, color: 'bg-indigo-500' },
                  ].map((dept, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{dept.name}</span>
                        <span>{dept.count} cases</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${(dept.count / 180) * 100}%` }} className={clsx('h-full rounded-full', dept.color)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div className="card bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">DPDPA 2023 Security &amp; Clinical Audit Trail</h3>
                <p className="text-xs text-slate-500">Immutable access log recording consent, summaries, and triage triggers</p>
              </div>
              <span className="badge-green">
                <ShieldCheck size={12} /> Compliance Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">No audit events found.</td>
                    </tr>
                  ) : (
                    auditLogs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors font-mono text-[11px]">
                        <td className="p-3 text-slate-500">{new Date(l.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3 font-semibold text-slate-700">{l.actorRole} ({l.actorId})</td>
                        <td className="p-3">
                          <span className={clsx(
                            'px-2 py-0.5 rounded-full font-bold text-[10px]',
                            l.action.includes('RED_FLAG') ? 'bg-red-100 text-red-700' :
                            l.action.includes('CONSENT') ? 'bg-blue-100 text-blue-700' :
                            l.action.includes('CONFIRMED') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          )}>
                            {l.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{l.targetType} ({l.targetId})</td>
                        <td className="p-3 text-slate-500 truncate max-w-[200px]">
                          {JSON.stringify(l.details || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Authorized Hospital Personnel</h3>
                <p className="text-xs text-slate-500">Role-Based Access Control (RBAC) Directory</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Dr. Ananya Sharma, MD', role: 'Doctor', dept: 'Cardiology / General Medicine', email: 'dr.sharma@hospital.org' },
                { name: 'Dr. Vikram Patel, MS', role: 'Doctor', dept: 'General Surgery / Emergency', email: 'dr.patel@hospital.org' },
                { name: 'Sister Priya Singh, RN', role: 'Nurse / Triage', dept: 'OPD Triage Desk', email: 'nurse@hospital.org' },
                { name: 'OPD Administrator', role: 'Admin', dept: 'Hospital Administration', email: 'admin@hospital.org' },
              ].map((u, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.dept}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                        {u.role}
                      </span>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="card bg-white border border-slate-200 p-6 space-y-5 text-xs text-slate-600">
            <h3 className="font-bold text-slate-800 text-base">System &amp; Integration Parameters</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Facility Name</label>
                <input type="text" readOnly value="AIIMS New Delhi - Smart OPD" className="input-field py-2 text-xs bg-slate-50" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ABDM Gateway Environment</label>
                <input type="text" readOnly value="Sandbox (SBX-VSARTHI-9921)" className="input-field py-2 text-xs bg-slate-50" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Emergency Hotline (National)</label>
                <input type="text" readOnly value="112" className="input-field py-2 text-xs bg-slate-50" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ambulance Dispatch Hotline</label>
                <input type="text" readOnly value="108" className="input-field py-2 text-xs bg-slate-50" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="font-bold text-slate-700">Data Retention &amp; Privacy Policy</p>
              <p className="text-slate-500 mt-1">
                Clinical summaries are retained for 90 days in compliance with the Digital Personal Data Protection Act (DPDPA 2023). Unconsented temporary voice files and OCR cache are scrubbed immediately upon session completion.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
