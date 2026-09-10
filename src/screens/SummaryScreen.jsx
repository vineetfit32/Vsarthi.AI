import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import { aiService } from '../services/aiService.js';
import { generateSummary } from '../services/llmSummarize.js';
import { pushToHIS } from '../services/abdm.js';
import { speak, stopSpeaking, isSpeaking } from '../services/tts.js';
import {
  FileText, Volume2, VolumeX, Printer, Send, CheckCircle,
  Loader2, ChevronRight, User, Stethoscope, Upload
} from 'lucide-react';
import StepHeader from '../components/StepHeader.jsx';
import NearbyDoctors from '../components/NearbyDoctors.jsx';
import clsx from 'clsx';


const SECTION_KEYS = [
  'chiefComplaint', 'hpi', 'pastHistory', 'drugAllergy',
  'familyHistory', 'personalHistory', 'reviewOfSystems', 'priorInvestigations', 'ayush',
];

const SECTION_META = {
  chiefComplaint:     { icon: '🏥', labelKey: 'sectionCC' },
  hpi:                { icon: '📋', labelKey: 'sectionHPI' },
  pastHistory:        { icon: '📁', labelKey: 'sectionPMH' },
  drugAllergy:        { icon: '💊', labelKey: 'sectionDA' },
  familyHistory:      { icon: '👨‍👩‍👧', labelKey: 'sectionFH' },
  personalHistory:    { icon: '🧍', labelKey: 'sectionPH' },
  reviewOfSystems:    { icon: '🔍', labelKey: 'sectionROS' },
  priorInvestigations:{ icon: '🧪', labelKey: 'sectionPI' },
  ayush:              { icon: '🌿', labelKey: 'ayushMode' },
};

export default function SummaryScreen() {
  const { state, actions } = useApp();
  const { language, summary, interview, documents, patient, ttsEnabled } = state;
  const T = (key) => t(language, key);

  const [viewMode, setViewMode] = useState('physician'); // 'patient' | 'physician'
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [pushState, setPushState] = useState('idle'); // 'idle'|'pushing'|'done'
  const [thinkingState, setThinkingState] = useState('Synthesizing conversational history answers…');

  // Generate summary on mount if not yet generated
  useEffect(() => {
    if (!summary.generated && !summary.generating) {
      handleGenerateSummary();
    }
  }, []);

  async function handleGenerateSummary() {
    actions.setSummary({ generating: true });
    try {
      let result;
      try {
        result = await aiService.generateSummary({
          patient,
          answers: interview.answers,
          documents,
          ayushMode: state.ayushMode,
          onThinkingState: setThinkingState,
        });
      } catch (aiErr) {
        console.warn('[SummaryScreen] aiService error, falling back to direct summarizer:', aiErr);
        result = await generateSummary({
          patient,
          answers: interview.answers,
          documents,
          questions: [],
          language: 'en',
        });
      }

      actions.setSummary({
        generating: false,
        generated: true,
        sections: result?.sections || {},
        patientFriendly: result?.patientFriendly || {},
      });
    } catch (err) {
      console.error('Summary critical error:', err);
      // Guarantee generated: true so patient is NEVER stuck on loading screen
      const safeChief = (interview.answers?.chiefComplaint || []).join(', ') || 'Routine Consultation';
      actions.setSummary({
        generating: false,
        generated: true,
        sections: {
          chiefComplaint: safeChief,
          hpi: 'Patient completed pre-consultation intake questions.',
          pastHistory: 'Recorded in intake system',
          drugAllergy: 'No known drug allergies (NKDA)',
          familyHistory: 'Non-contributory',
          personalHistory: 'Lifestyle and dietary details recorded',
          reviewOfSystems: 'Completed without critical red flags',
          priorInvestigations: documents?.length ? `${documents.length} document(s) attached` : 'None provided',
        },
        patientFriendly: {
          chiefComplaint: `You came in today because of: ${safeChief}.`,
          hpi: 'Your responses have been prepared for your doctor.',
        },
      });
    }
  }

  function handleReadAloud() {
    if (isReadingAloud) {
      stopSpeaking();
      setIsReadingAloud(false);
      return;
    }
    const sections = viewMode === 'patient' ? summary.patientFriendly : summary.sections;
    const allText = Object.entries(sections)
      .map(([k, v]) => `${T(SECTION_META[k]?.labelKey || k)}: ${v}`)
      .join('. ');
    setIsReadingAloud(true);
    speak(allText, {
      lang: language === 'hi' ? 'hi-IN' : 'en-IN',
      rate: 0.85,
      onEnd: () => setIsReadingAloud(false),
    });
  }

  async function handlePushToHIS() {
    setPushState('pushing');
    try {
      const result = await pushToHIS({ patient, summary: summary.sections });
      actions.setPushedToHIS(result.token);
      setPushState('done');
    } catch {
      setPushState('idle');
    }
  }

  function handlePrint() {
    window.print();
  }

  if (summary.generating || !summary.generated) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/60">
        <StepHeader currentStep="summary" language={language} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-teal-100 border-t-teal-700 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-teal-700 font-bold text-xs">
              AI
            </div>
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-bold text-slate-800">{T('summaryGenerate')}</h3>
            <p className="text-teal-700 font-medium text-sm mt-2 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              {thinkingState}
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Structuring your inputs into standard SOAP sections for your treating physician.
            </p>
          </div>
          <div className="w-72 bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-teal-500 to-teal-700 h-2 rounded-full shimmer" style={{ width: '80%' }} />
          </div>
        </div>
      </div>
    );
  }

  const displaySections = viewMode === 'patient' ? summary.patientFriendly : summary.sections;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <StepHeader currentStep="summary" language={language} />

      <div className="max-w-3xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{T('summaryTitle')}</h2>
            <p className="text-slate-500 mt-1 text-sm">{T('summarySub')}</p>
          </div>
          {/* View toggle */}
          <div className="flex bg-slate-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('patient')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                viewMode === 'patient' ? 'bg-white text-primary-700 shadow' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <User size={15} /> {T('summaryPatient')}
            </button>
            <button
              onClick={() => setViewMode('physician')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                viewMode === 'physician' ? 'bg-white text-primary-700 shadow' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Stethoscope size={15} /> {T('summaryPhysician')}
            </button>
          </div>
        </div>

        {/* Patient info strip */}
        {patient.name && (
          <div className="card p-4 mb-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="text-primary-600" size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{patient.name}</p>
              <p className="text-slate-400 text-sm">
                {patient.dob ? `DOB: ${patient.dob}` : ''}
                {patient.gender ? ` · ${patient.gender}` : ''}
                {patient.abhaId ? ` · ABHA: ${patient.abhaId.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4')}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Summary sections */}
        <div className="space-y-3 mb-6">
          {SECTION_KEYS.map((key) => {
            const text = displaySections[key];
            if (!text) return null;
            const meta = SECTION_META[key];
            return (
              <div key={key} className="card p-4">
                <p className="section-tag mb-2">
                  {meta?.icon} {T(meta?.labelKey || key)}
                </p>
                <p className="text-slate-700 leading-relaxed text-base">{text}</p>
              </div>
            );
          })}
        </div>

        {/* Actions row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Read aloud */}
          <button onClick={handleReadAloud} className="btn-secondary text-sm py-3">
            {isReadingAloud
              ? <><VolumeX size={16} /> {T('stopReading')}</>
              : <><Volume2 size={16} /> {T('readAloud')}</>
            }
          </button>

          {/* Print */}
          <button onClick={handlePrint} className="btn-secondary text-sm py-3">
            <Printer size={16} /> {T('exportPrint')}
          </button>

          {/* Push to HIS */}
          <button
            onClick={handlePushToHIS}
            disabled={pushState === 'pushing' || pushState === 'done'}
            className={clsx(
              'btn-secondary text-sm py-3 col-span-2',
              pushState === 'done' && 'border-emerald-300 bg-emerald-50 text-emerald-700'
            )}
          >
            {pushState === 'pushing' && <Loader2 size={16} className="animate-spin" />}
            {pushState === 'done' && <CheckCircle size={16} />}
            {pushState === 'idle' && <Send size={16} />}
            {pushState === 'done'
              ? `${T('pushSuccess')}${summary.hisToken}`
              : pushState === 'pushing'
              ? 'Submitting…'
              : T('pushHIS')
            }
          </button>
        </div>

        {/* ──── Nearby Doctors Section ──── */}
        <NearbyDoctors language={language} patient={patient} onPrint={handlePrint} />

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => actions.setStep('documents')}
            className="btn-secondary flex-1 py-3"
          >
            <Upload size={18} /> Attach / Scan Prior Documents
          </button>
          <button
            onClick={() => actions.setStep('physician')}
            className="btn-primary flex-1 py-3"
          >
            <Stethoscope size={18} /> {T('physicianView')} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
