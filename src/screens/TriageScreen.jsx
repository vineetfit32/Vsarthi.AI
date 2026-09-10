// src/screens/TriageScreen.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';
import {
  Activity, AlertTriangle, ArrowLeft, RefreshCw, CheckCircle2,
  Clock, ShieldAlert, User, ChevronRight, Phone
} from 'lucide-react';
import clsx from 'clsx';

export default function TriageScreen({ onBackHome }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getDoctorQueue();
      setQueue(res.queue || []);
    } catch {
      setQueue([
        {
          sessionId: 'sess_101',
          token: 'A-101',
          patientName: 'Ramesh Gupta',
          age: 58,
          gender: 'male',
          chiefComplaint: 'Chest pain radiating to left arm (2-3 days)',
          priority: 'critical',
          redFlag: { name: 'Possible Acute Coronary Syndrome', message: 'Immediate ECG and cardiac assessment indicated.' },
        },
        {
          sessionId: 'sess_104',
          token: 'A-104',
          patientName: 'Aarav Sharma',
          age: 7,
          gender: 'male',
          chiefComplaint: 'High Fever & Cough (Pediatric)',
          priority: 'urgent',
          redFlag: null,
        },
        {
          sessionId: 'sess_102',
          token: 'A-102',
          patientName: 'Meera Verma',
          age: 42,
          gender: 'female',
          chiefComplaint: 'Type 2 Diabetes follow-up with fatigue',
          priority: 'routine',
          redFlag: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const updatePriority = async (sessionId, newPriority) => {
    try {
      await apiClient.updateTriagePriority({ sessionId, priority: newPriority });
      fetchQueue();
    } catch (err) {
      console.warn('Update priority failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBackHome} className="btn-ghost p-2 text-slate-500 hover:text-slate-700" title="Return to Home">
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">OPD Nursing &amp; Triage Priority Desk</h2>
              <p className="text-xs text-slate-500">Sister Priya Singh, RN · Reception Triage</p>
            </div>
          </div>

          <button onClick={fetchQueue} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} className="text-red-600" />
            <div>
              <p className="font-bold text-red-800 text-sm">Emergency Triage Protocol</p>
              <p className="text-xs text-red-700">
                Patients with triggered red flags must be immediately directed to the Emergency/ECG bay.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="tel:112" className="btn-primary bg-red-600 border-red-600 text-xs py-2 px-3">
              <Phone size={13} /> Call 112
            </a>
          </div>
        </div>

        {/* Triage Cards */}
        <div className="space-y-3">
          {queue.map(item => {
            const isCrit = item.priority === 'critical';
            const isUrg = item.priority === 'urgent';

            return (
              <div
                key={item.sessionId || item.token}
                className={clsx(
                  'card p-4 sm:p-5 bg-white border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
                  isCrit ? 'border-red-400 bg-red-50/20' : isUrg ? 'border-amber-300' : 'border-slate-200'
                )}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black text-sm flex-shrink-0',
                      isCrit ? 'bg-red-600 text-white' : isUrg ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    <span className="text-[9px] font-normal leading-none">TOKEN</span>
                    <span>{item.token}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 text-base">{item.patientName}</p>
                      <span className="text-xs text-slate-500">
                        ({item.age ? `${item.age}y` : 'Age N/A'}, {item.gender?.toUpperCase() || 'U'})
                      </span>
                      {isCrit && <span className="badge-red">CRITICAL</span>}
                      {isUrg && <span className="badge-amber">URGENT</span>}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{item.chiefComplaint}</p>
                    {item.redFlag && (
                      <p className="text-xs font-bold text-red-600 mt-1">
                        🚨 {item.redFlag.name}: {item.redFlag.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Priority Assignment Actions */}
                <div className="flex items-center gap-2 flex-wrap border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Assign Triage:</span>
                  <button
                    onClick={() => updatePriority(item.sessionId, 'critical')}
                    className={clsx(
                      'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all',
                      isCrit ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                    )}
                  >
                    Critical
                  </button>
                  <button
                    onClick={() => updatePriority(item.sessionId, 'urgent')}
                    className={clsx(
                      'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all',
                      isUrg ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
                    )}
                  >
                    Urgent
                  </button>
                  <button
                    onClick={() => updatePriority(item.sessionId, 'routine')}
                    className={clsx(
                      'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all',
                      !isCrit && !isUrg ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    Routine
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
