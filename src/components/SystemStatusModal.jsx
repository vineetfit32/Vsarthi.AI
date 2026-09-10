// src/components/SystemStatusModal.jsx
import React, { useState, useEffect } from 'react';
import { getAllCapabilities, setCapabilityOverride, resetCapabilityOverrides } from '../config/capabilities.js';
import { Activity, CheckCircle2, Clock, X, RefreshCw, Server, ShieldCheck, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function SystemStatusModal({ isOpen, onClose }) {
  const [capabilities, setCapabilities] = useState(getAllCapabilities());

  const refresh = () => {
    setCapabilities(getAllCapabilities());
  };

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener('vsarthi-capability-changed', handleUpdate);
    return () => window.removeEventListener('vsarthi-capability-changed', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const liveCount = capabilities.filter((c) => c.live).length;
  const totalCount = capabilities.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">System Status & Integration Registry</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                  {liveCount}/{totalCount} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tier capability registry with automated graceful fallbacks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-teal-50 border-b border-teal-100 px-5 py-3 flex items-center justify-between text-xs text-teal-900">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-teal-600" />
            DPDPA 2023 & ABDM Compliant Architecture. No external key required for demo.
          </span>
          <button
            onClick={() => {
              resetCapabilityOverrides();
              refresh();
            }}
            className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold underline"
          >
            <RefreshCw size={12} /> Reset Defaults
          </button>
        </div>

        {/* Integration List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {capabilities.map((cap) => {
            const isLive = cap.live;
            return (
              <div
                key={cap.id}
                className={clsx(
                  'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  isLive ? 'bg-white border-slate-200 shadow-sm' : 'bg-amber-50/50 border-amber-200'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse',
                        isLive ? 'bg-emerald-500' : 'bg-amber-500'
                      )}
                    />
                    <h4 className="font-bold text-slate-800 text-sm">{cap.name}</h4>
                    <span
                      className={clsx(
                        'text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full',
                        isLive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {isLive ? '● Live' : '○ Coming Soon / Fallback'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{cap.description}</p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-500">Mode: {cap.mode}</span>
                    {cap.latencyMs && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock size={11} /> ~{cap.latencyMs}ms latency
                      </span>
                    )}
                    {cap.fallback && (
                      <span className="text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                        Fallback: {cap.fallbackLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Demo Simulation Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium">Demo State:</span>
                  <button
                    onClick={() => {
                      setCapabilityOverride(cap.id, { live: !cap.live });
                      refresh();
                    }}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                      isLive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                    )}
                  >
                    {isLive ? 'Simulate Outage' : 'Simulate Live'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Engine Version: 2.1.0 • Node/Express Backend + React SPA</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all"
          >
            Close Status
          </button>
        </div>
      </div>
    </div>
  );
}
