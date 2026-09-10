// src/components/MedicalTimeline.jsx
import React, { useState } from 'react';
import {
  Calendar, FileText, FlaskConical, Stethoscope, AlertTriangle,
  ChevronDown, ChevronUp, Pill, Building2, CheckCircle2, Clock
} from 'lucide-react';
import clsx from 'clsx';

export default function MedicalTimeline({ events = [], onEventClick }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'prescription' | 'lab_report' | 'consultation'
  const [expandedId, setExpandedId] = useState(null);

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
        <Clock className="mx-auto mb-2 text-slate-300" size={24} />
        No prior medical timeline entries recorded.
      </div>
    );
  }

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.type === filter || (filter === 'prescription' && e.type === 'document'));

  const typeConfig = {
    prescription: { icon: Pill, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Prescription' },
    lab_report:   { icon: FlaskConical, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Lab Report' },
    consultation: { icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Consultation' },
    past_medical: { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Past Medical' },
    document:     { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Medical Document' },
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter chips */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="text-primary-600" size={18} />
          <h4 className="font-bold text-slate-800 text-base">Chronological Medical Timeline</h4>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: 'All Events' },
            { key: 'prescription', label: '💊 Prescriptions' },
            { key: 'lab_report', label: '🧪 Lab Reports' },
            { key: 'consultation', label: '🩺 Visits' },
          ].map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={clsx(
                'text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                filter === btn.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline spine */}
      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
        {filtered.map((ev, idx) => {
          const cfg = typeConfig[ev.type] || typeConfig.document;
          const Icon = cfg.icon;
          const isExpanded = expandedId === ev.id;

          return (
            <div key={ev.id || idx} className="relative group">
              {/* Dot on spine */}
              <div
                className={clsx(
                  'absolute -left-[31px] top-1.5 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-all',
                  ev.abnormal ? 'border-red-500 text-red-500' : 'border-primary-500 text-primary-600'
                )}
              >
                <Icon size={12} />
              </div>

              {/* Event card */}
              <div
                className={clsx(
                  'rounded-2xl border bg-white p-4 transition-all shadow-sm hover:shadow-md cursor-pointer',
                  ev.abnormal ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                )}
                onClick={() => setExpandedId(isExpanded ? null : ev.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {ev.date || 'Recent'}
                      </span>
                      <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color, cfg.border)}>
                        {cfg.label}
                      </span>
                      {ev.abnormal && (
                        <span className="badge-red text-[10px]">
                          <AlertTriangle size={10} /> Abnormal Findings
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 text-sm">{ev.title || 'Medical Event'}</p>
                    {ev.source && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Building2 size={11} /> {ev.source}
                      </p>
                    )}
                  </div>
                  <button className="text-slate-400 p-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    {ev.medicines && ev.medicines.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-700">Prescribed Medicines:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ev.medicines.map((m, i) => (
                            <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                              {m.name} {m.dose} ({m.frequency || 'Daily'})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {ev.labValues && ev.labValues.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-700">Extracted Lab Parameters:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                          {ev.labValues.map((lv, i) => (
                            <div
                              key={i}
                              className={clsx(
                                'p-1.5 rounded border flex items-center justify-between',
                                lv.isAbnormal ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                              )}
                            >
                              <span className="font-medium">{lv.test}:</span>
                              <span className="font-bold">{lv.value} {lv.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ev.notes && (
                      <p className="text-slate-500 italic mt-1">Note: {ev.notes}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
