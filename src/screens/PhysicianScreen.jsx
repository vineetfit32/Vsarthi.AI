import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import {
  Check, Edit3, X, ChevronDown, ChevronUp, CheckCircle,
  Stethoscope, ArrowLeft, FileSignature, AlertTriangle, ShieldCheck,
  Calendar, FileText, Pill, Send, Download
} from 'lucide-react';
import StepHeader from '../components/StepHeader.jsx';
import MedicalTimeline from '../components/MedicalTimeline.jsx';
import { checkMedicationSafetyClient } from '../services/safetyChecker.js';
import clsx from 'clsx';

const SECTION_KEYS = [
  'patientInfo', 'chiefComplaint', 'hpi', 'pastHistory', 'pastSurgical',
  'medications', 'drugAllergy', 'allergies', 'familyHistory', 'personalHistory',
  'reviewOfSystems', 'priorInvestigations', 'importantAbnormals', 'relevantTimeline',
  'redFlags', 'missingInfo', 'aiConfidenceNotes', 'ayush',
];

const SECTION_META = {
  patientInfo:        { icon: '🪪', label: 'Patient Identification' },
  chiefComplaint:     { icon: '🏥', labelKey: 'sectionCC', label: 'Chief Complaint' },
  hpi:                { icon: '📋', labelKey: 'sectionHPI', label: 'History of Present Illness' },
  pastHistory:        { icon: '📁', labelKey: 'sectionPMH', label: 'Past Medical History' },
  pastSurgical:       { icon: '🩺', label: 'Past Surgical History' },
  medications:        { icon: '💊', label: 'Current Medications' },
  drugAllergy:        { icon: '⚠️', labelKey: 'sectionDA', label: 'Drug Allergies' },
  allergies:          { icon: '⚠️', label: 'Allergies & Adverse Reactions' },
  familyHistory:      { icon: '👨‍👩‍👧', labelKey: 'sectionFH', label: 'Family History' },
  personalHistory:    { icon: '🧍', labelKey: 'sectionPH', label: 'Personal & Lifestyle History' },
  reviewOfSystems:    { icon: '🔍', labelKey: 'sectionROS', label: 'Review of Systems' },
  priorInvestigations:{ icon: '🧪', labelKey: 'sectionPI', label: 'Prior Diagnostic Reports' },
  importantAbnormals: { icon: '🚨', label: 'Important Abnormal Findings' },
  relevantTimeline:   { icon: '⏱️', label: 'Relevant Timeline Summary' },
  redFlags:           { icon: '🚨', label: 'Emergency Red Flags' },
  missingInfo:        { icon: '❓', label: 'Missing / Required Information' },
  aiConfidenceNotes:  { icon: '🤖', label: 'AI Source & Traceability Indicators' },
  ayush:              { icon: '🌿', labelKey: 'ayushMode', label: 'AYUSH Dashavidha Pariksha' },
};

export default function PhysicianScreen() {
  const { state, actions } = useApp();
  const { language, summary, patient, documents, interview } = state;
  const T = (key) => t(language, key);

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'timeline' | 'documents'
  const [confirmed, setConfirmed] = useState(false);
  const [expandedSections, setExpandedSections] = useState(
    Object.fromEntries(SECTION_KEYS.map(k => [k, true]))
  );

  // Compute medication safety flags
  const docMeds = documents.flatMap(d => d.extractedData?.medicines || []);
  const safetyFlags = checkMedicationSafetyClient({
    medications: docMeds,
    allergyHistory: summary.sections?.allergies || summary.sections?.drugAllergy || '',
    currentMedsDetail: interview?.answers?.currentMedsDetail || '',
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const acceptAll = () => {
    SECTION_KEYS.forEach(key => {
      if (summary.sections[key]) {
        actions.setSectionStatus(key, 'accepted');
      }
    });
  };

  const handleConfirm = () => {
    setConfirmed(true);
    // After brief delay, end session
    setTimeout(() => {
      actions.setStep('session_end');
    }, 2500);
  };

  // Build timeline events
  const timelineEvents = documents.map(d => ({
    id: d.id,
    date: d.uploadDate || '2024',
    type: d.type || 'document',
    title: d.extractedData?.diagnosis || d.name,
    source: d.source || 'Medical Facility',
    medicines: d.extractedData?.medicines || [],
    labValues: d.extractedData?.labValues || [],
    abnormal: d.abnormal,
    notes: d.extractedData?.notes,
  }));

  if (interview?.answers?.pastMedical) {
    const pasts = Array.isArray(interview.answers.pastMedical)
      ? interview.answers.pastMedical.filter(c => c !== 'none')
      : [interview.answers.pastMedical];
    pasts.forEach(cond => {
      timelineEvents.push({
        id: `pmh_${cond}`,
        date: 'Prior',
        type: 'past_medical',
        title: `Known ${cond.replace(/_/g, ' ')}`,
        source: 'Self-Reported History',
        abnormal: false,
      });
    });
  }

  if (!summary.generated) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-slate-500 p-6">
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-lg font-semibold">No summary available yet.</p>
        <button onClick={() => actions.setStep('summary')} className="btn-primary">
          <ArrowLeft size={16} /> Go to Summary
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Physician header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => actions.setStep('summary')} className="btn-ghost text-slate-500 p-2 flex-shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Stethoscope className="text-white" size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-base sm:text-lg">{T('physicianTitle')}</p>
              <p className="text-xs text-slate-400 truncate">{T('physicianSub')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={acceptAll} className="btn-secondary flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-3 sm:px-4 min-h-[44px]">
              <Check size={14} /> {T('acceptAll')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmed}
              className={clsx(
                'btn-primary flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-3 sm:px-4 min-h-[44px]',
                confirmed && 'bg-emerald-500 border-emerald-500'
              )}
            >
              {confirmed
                ? <><CheckCircle size={14} /> {T('confirmed')}</>
                : <><FileSignature size={14} /> {T('confirmSummary')}</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Patient strip */}
      <div className="bg-primary-700 text-white px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="font-semibold">{patient.name || 'Anonymous Patient'}</span>
          {patient.dob && <span className="text-primary-200">DOB: {patient.dob}</span>}
          {patient.gender && <span className="text-primary-200 capitalize">{patient.gender}</span>}
          {patient.abhaId && (
            <span className="text-primary-300 font-mono text-[11px] sm:text-xs">
              ABHA: {patient.abhaId.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4')}
            </span>
          )}
          {summary.hisToken && (
            <span className="ml-auto bg-emerald-500 text-white text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-semibold">
              ✓ HIS: {summary.hisToken}
            </span>
          )}
        </div>
      </div>

      {/* Mandatory Regulatory Watermark Banner */}
      <div className="bg-amber-500 text-slate-900 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider">
        AI-generated draft — Physician review required before clinical decision making
      </div>

      {/* View Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex gap-6 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('summary')}
            className={clsx(
              'py-3 border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'summary' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <FileText size={15} /> 16-Section Clinical Summary
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={clsx(
              'py-3 border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'timeline' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Calendar size={15} /> Medical Timeline ({timelineEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={clsx(
              'py-3 border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'documents' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Pill size={15} /> Uploaded Records &amp; OCR ({documents.length})
          </button>
        </div>
      </div>

      {/* Progress summary */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-2">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500">
          <SectionStatusPill label="Accepted" count={SECTION_KEYS.filter(k => summary.sectionStatus[k] === 'accepted').length} color="emerald" />
          <SectionStatusPill label="Amended" count={SECTION_KEYS.filter(k => summary.sectionStatus[k] === 'amended').length} color="amber" />
          <SectionStatusPill label="Rejected" count={SECTION_KEYS.filter(k => summary.sectionStatus[k] === 'rejected').length} color="red" />
          <SectionStatusPill label="Pending" count={SECTION_KEYS.filter(k => !summary.sectionStatus[k] || summary.sectionStatus[k] === 'pending').length} color="slate" />
        </div>
      </div>

      {/* Content based on Active Tab */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-4">
        {activeTab === 'summary' && (
          <>
            {/* Medication Safety Flags Banner */}
            {safetyFlags.length > 0 && (
              <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-600 flex-shrink-0" size={18} />
                  <h4 className="font-bold text-red-800 text-sm">
                    Medication Safety Flags Detected ({safetyFlags.length})
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {safetyFlags.map(flag => (
                    <div key={flag.id} className="bg-white/90 p-2.5 rounded-xl border border-red-200 text-xs">
                      <p className="font-bold text-red-700">{flag.title}</p>
                      <p className="text-slate-600 mt-0.5">{flag.description}</p>
                      <p className="text-[10px] text-amber-700 font-semibold mt-1">
                        ⚠️ {flag.disclaimer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-3">
              {SECTION_KEYS.map((key) => {
                const text = summary.sections[key];
                if (!text) return null;
                const meta = SECTION_META[key];
                const status = summary.sectionStatus[key] || 'pending';
                const note = summary.physicianNotes[key] || '';
                const isExpanded = expandedSections[key];

                return (
                  <SectionCard
                    key={key}
                    sectionKey={key}
                    text={text}
                    meta={meta}
                    status={status}
                    note={note}
                    isExpanded={isExpanded}
                    language={language}
                    T={T}
                    onToggle={() => toggleSection(key)}
                    onAccept={() => actions.setSectionStatus(key, 'accepted')}
                    onAmend={(note) => {
                      actions.setSectionStatus(key, 'amended');
                      actions.setPhysicianNote(key, note);
                    }}
                    onReject={() => actions.setSectionStatus(key, 'rejected')}
                  />
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'timeline' && (
          <div className="card p-6 bg-white border border-slate-200">
            <MedicalTimeline events={timelineEvents} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            {documents.length === 0 ? (
              <div className="card p-8 text-center text-slate-400 bg-white">
                <FileText className="mx-auto mb-2 text-slate-300" size={32} />
                <p className="font-semibold text-slate-600">No medical records uploaded for this session.</p>
              </div>
            ) : (
              documents.map(doc => {
                const d = doc.extractedData || {};
                return (
                  <div key={doc.id} className="card p-5 bg-white border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                          {doc.type?.toUpperCase() || 'DOCUMENT'}
                        </span>
                        <h4 className="font-bold text-slate-800 text-base mt-1">{d.diagnosis || doc.name}</h4>
                        <p className="text-xs text-slate-500">{doc.source || 'Medical Center'} · {doc.uploadDate}</p>
                      </div>
                      {doc.abnormal && (
                        <span className="badge-red">
                          <AlertTriangle size={11} /> Abnormal Result
                        </span>
                      )}
                    </div>

                    {d.medicines && d.medicines.length > 0 && (
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-700">Prescribed Medicines:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.medicines.map((m, i) => (
                            <span key={i} className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-medium">
                              {m.name} {m.dose} ({m.frequency})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.labValues && d.labValues.length > 0 && (
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-700">Diagnostic Parameters:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {d.labValues.map((lv, i) => (
                            <div key={i} className={clsx('p-2 rounded-xl border flex items-center justify-between', lv.isAbnormal ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700')}>
                              <span className="font-medium">{lv.test}</span>
                              <span className="font-bold">{lv.value} {lv.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Confirmation state */}
        {confirmed && (
          <div className="card p-6 text-center border-2 border-emerald-300 bg-emerald-50">
            <CheckCircle className="text-emerald-500 mx-auto mb-3" size={40} />
            <p className="text-xl font-bold text-emerald-700">{T('confirmed')}</p>
            <p className="text-emerald-600 text-sm mt-1">Summary locked &amp; dispatched to HIS. Redirecting…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
function SectionCard({ sectionKey, text, meta, status, note, isExpanded, language, T, onToggle, onAccept, onAmend, onReject }) {
  const [amendMode, setAmendMode] = useState(false);
  const [amendText, setAmendText] = useState(note);

  const statusColors = {
    pending:  'border-slate-200 bg-white',
    accepted: 'border-emerald-200 bg-emerald-50',
    amended:  'border-amber-200 bg-amber-50',
    rejected: 'border-red-200 bg-red-50 opacity-70',
  };

  const statusBadge = {
    pending:  null,
    accepted: <span className="badge-green flex items-center gap-1"><Check size={10} /> Accepted</span>,
    amended:  <span className="badge-amber flex items-center gap-1"><Edit3 size={10} /> Amended</span>,
    rejected: <span className="badge-red flex items-center gap-1"><X size={10} /> Rejected</span>,
  }[status];

  return (
    <div className={clsx('rounded-2xl border-2 transition-all', statusColors[status])}>
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-xl flex-shrink-0">{meta?.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-700">{T(meta?.labelKey || sectionKey)}</p>
            {statusBadge}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          {/* Main text */}
          <p className="text-slate-700 leading-relaxed text-sm mb-4">{text}</p>

          {/* Amend mode */}
          {amendMode && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Physician Note / Amendment</label>
              <textarea
                value={amendText}
                onChange={e => setAmendText(e.target.value)}
                placeholder={T('amendNote')}
                rows={3}
                className="input-field text-sm resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { onAmend(amendText); setAmendMode(false); }}
                  className="btn-primary text-sm py-2 px-4"
                >
                  <Check size={14} /> Save Amendment
                </button>
                <button
                  onClick={() => setAmendMode(false)}
                  className="btn-ghost text-slate-500 text-sm py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Physician note display */}
          {note && !amendMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-sm text-amber-800">
              <p className="font-semibold text-xs text-amber-600 mb-0.5">Physician Note</p>
              {note}
            </div>
          )}

          {/* Action buttons */}
          {!amendMode && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onAccept}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 font-semibold text-xs sm:text-sm transition-all min-h-[42px]',
                  status === 'accepted'
                    ? 'border-emerald-400 bg-emerald-500 text-white'
                    : 'border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50'
                )}
              >
                <Check size={15} /> {T('accept')}
              </button>
              <button
                onClick={() => setAmendMode(true)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 font-semibold text-xs sm:text-sm transition-all min-h-[42px]',
                  status === 'amended'
                    ? 'border-amber-400 bg-amber-500 text-white'
                    : 'border-amber-300 text-amber-700 bg-white hover:bg-amber-50'
                )}
              >
                <Edit3 size={15} /> {T('amend')}
              </button>
              <button
                onClick={onReject}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 font-semibold text-xs sm:text-sm transition-all min-h-[42px]',
                  status === 'rejected'
                    ? 'border-red-400 bg-red-500 text-white'
                    : 'border-red-200 text-red-600 bg-white hover:bg-red-50'
                )}
              >
                <X size={15} /> {T('reject')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionStatusPill({ label, count, color }) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber:   'bg-amber-100 text-amber-700',
    red:     'bg-red-100 text-red-700',
    slate:   'bg-slate-100 text-slate-500',
  };
  return (
    <span className={clsx('px-2 py-0.5 rounded-full font-medium', colors[color])}>
      {count} {label}
    </span>
  );
}
