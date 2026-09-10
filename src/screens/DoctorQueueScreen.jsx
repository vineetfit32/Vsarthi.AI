// src/screens/DoctorQueueScreen.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import apiClient from '../services/apiClient.js';
import {
  Stethoscope, AlertTriangle, CheckCircle2, Clock, Search,
  Filter, ChevronRight, User, RefreshCw, ArrowLeft, Building2,
  FileText, ShieldCheck, Activity, LogOut
} from 'lucide-react';
import clsx from 'clsx';

export default function DoctorQueueScreen({ onSelectPatient, onLogout, onBackHome }) {
  const { state } = useApp();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('all'); // 'all' | 'critical' | 'urgent' | 'routine'
  const [search, setSearch] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getDoctorQueue({
        priority: filterPriority !== 'all' ? filterPriority : undefined,
        search: search || undefined,
      });
      setQueue(res.queue || []);
    } catch {
      // Offline fallback: load mock seed records
      setQueue([
        {
          sessionId: 'sess_101',
          token: 'A-101',
          patientName: 'Ramesh Gupta',
          age: 58,
          gender: 'male',
          chiefComplaint: 'Chest pain radiating to left arm (2-3 days)',
          priority: 'critical',
          status: 'urgent_review',
          redFlag: { name: 'Possible Acute Coronary Syndrome' },
          hasSummary: true,
          summaryStatus: 'pending_physician_review',
          startedAt: new Date().toISOString(),
        },
        {
          sessionId: 'sess_102',
          token: 'A-102',
          patientName: 'Meera Verma',
          age: 42,
          gender: 'female',
          chiefComplaint: 'Type 2 Diabetes follow-up with fatigue',
          priority: 'routine',
          status: 'summary_ready',
          redFlag: null,
          hasSummary: true,
          summaryStatus: 'pending_physician_review',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          sessionId: 'sess_103',
          token: 'A-103',
          patientName: 'Suresh Joshi',
          age: 64,
          gender: 'male',
          chiefComplaint: 'Chronic Joint Pain & Digestion (AYUSH)',
          priority: 'routine',
          status: 'summary_ready',
          redFlag: null,
          hasSummary: true,
          summaryStatus: 'pending_physician_review',
          ayushMode: true,
          startedAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          sessionId: 'sess_104',
          token: 'A-104',
          patientName: 'Aarav Sharma',
          age: 7,
          gender: 'male',
          chiefComplaint: 'High Fever & Cough (Pediatric)',
          priority: 'urgent',
          status: 'summary_ready',
          redFlag: null,
          hasSummary: true,
          summaryStatus: 'pending_physician_review',
          startedAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filterPriority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQueue();
  };

  const criticalCount = queue.filter(p => p.priority === 'critical').length;
  const urgentCount = queue.filter(p => p.priority === 'urgent').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Doctor Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBackHome} className="btn-ghost p-2 text-slate-500 hover:text-slate-700" title="Return to Home">
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">Physician OPD Queue</h2>
              <p className="text-xs text-slate-500">Dr. Ananya Sharma, MD · AIIMS OPD</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchQueue}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={onLogout}
              className="btn-ghost text-xs text-red-600 hover:bg-red-50 p-2"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Queue Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 bg-white flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Waiting</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{queue.length}</p>
            </div>
            <User className="text-slate-400" size={24} />
          </div>

          <div className="card p-4 bg-red-50/50 border-red-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 font-bold">Critical Red Flags</p>
              <p className="text-2xl font-black text-red-600 mt-0.5">{criticalCount}</p>
            </div>
            <AlertTriangle className="text-red-500" size={24} />
          </div>

          <div className="card p-4 bg-amber-50/50 border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 font-bold">Urgent Attention</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{urgentCount}</p>
            </div>
            <Activity className="text-amber-500" size={24} />
          </div>

          <div className="card p-4 bg-emerald-50/50 border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 font-bold">AI Summaries Ready</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">
                {queue.filter(q => q.hasSummary).length}
              </p>
            </div>
            <CheckCircle2 className="text-emerald-500" size={24} />
          </div>
        </div>

        {/* Priority Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Patients' },
              { id: 'critical', label: '🚨 Critical Triage', count: criticalCount },
              { id: 'urgent', label: '⚡ Urgent', count: urgentCount },
              { id: 'routine', label: 'Routine OPD' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterPriority(tab.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                  filterPriority === tab.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={clsx(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                    filterPriority === tab.id ? 'bg-primary-800 text-white' : 'bg-red-100 text-red-700'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search token, name, complaint..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </form>
        </div>

        {/* Patient Queue Cards */}
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="card p-10 text-center text-slate-400 bg-white">
              <User className="mx-auto mb-2 text-slate-300" size={32} />
              <p className="font-semibold text-slate-600 text-base">No patients found in queue</p>
              <p className="text-xs mt-1">Patients will appear here once intake interview begins.</p>
            </div>
          ) : (
            queue.map(item => {
              const isCrit = item.priority === 'critical';
              const isUrg = item.priority === 'urgent';

              return (
                <div
                  key={item.sessionId || item.token}
                  onClick={() => onSelectPatient(item)}
                  className={clsx(
                    'card p-4 sm:p-5 bg-white border-2 hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
                    isCrit ? 'border-red-400 bg-red-50/20' : isUrg ? 'border-amber-300' : 'border-slate-200 hover:border-primary-400'
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Token Badge */}
                    <div
                      className={clsx(
                        'w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black text-sm flex-shrink-0',
                        isCrit ? 'bg-red-600 text-white shadow-md shadow-red-200' : isUrg ? 'bg-amber-500 text-white' : 'bg-primary-100 text-primary-800'
                      )}
                    >
                      <span className="text-[10px] font-normal leading-none">TOKEN</span>
                      <span>{item.token}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">{item.patientName}</h3>
                        <span className="text-xs text-slate-500">
                          ({item.age ? `${item.age}y` : 'Age N/A'}, {item.gender?.toUpperCase() || 'U'})
                        </span>

                        {isCrit && (
                          <span className="badge-red animate-pulse">
                            <AlertTriangle size={11} /> CRITICAL RED FLAG
                          </span>
                        )}
                        {isUrg && (
                          <span className="badge-amber">
                            <Activity size={11} /> URGENT
                          </span>
                        )}
                        {item.ayushMode && (
                          <span className="badge-green">
                            🌿 AYUSH
                          </span>
                        )}
                        {item.isKiosk && (
                          <span className="badge-blue text-[10px]">
                            OPD Kiosk
                          </span>
                        )}
                      </div>

                      {/* Chief Complaint */}
                      <p className="text-sm font-medium text-slate-700 mt-1 truncate">
                        {item.chiefComplaint}
                      </p>

                      {/* Red flag subtitle */}
                      {item.redFlag && (
                        <p className="text-xs font-bold text-red-600 mt-0.5 flex items-center gap-1">
                          🚨 {item.redFlag.name || item.redFlag.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Status & Open Review CTA */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-left sm:text-right text-xs">
                      <span className={clsx(
                        'inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full',
                        item.hasSummary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      )}>
                        <FileText size={12} />
                        {item.hasSummary ? 'Summary Ready' : 'Intake In Progress'}
                      </span>
                    </div>

                    <button className="btn-primary text-xs py-2 px-4 min-h-[38px] flex items-center gap-1">
                      Review <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
