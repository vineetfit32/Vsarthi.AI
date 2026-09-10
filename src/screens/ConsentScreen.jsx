import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import { speak, stopSpeaking } from '../services/tts.js';
import { Shield, Volume2, CheckSquare, Square, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import StepHeader from '../components/StepHeader.jsx';

export default function ConsentScreen() {
  const { state, actions } = useApp();
  const { language, consent, patient } = state;
  const T = (key) => t(language, key);

  const [error, setError] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);

  const toggle = (field) => {
    actions.setConsent({ [field]: !consent[field] });
    setError('');
  };

  const handleExplain = () => {
    if (isExplaining) {
      stopSpeaking();
      setIsExplaining(false);
      return;
    }
    setIsExplaining(true);
    speak(T('consentExplainText'), {
      lang: language === 'hi' ? 'hi-IN' : 'en-IN',
      rate: 0.85,
      onEnd: () => setIsExplaining(false),
    });
  };

  const handleAccept = () => {
    if (!consent.dataCapture || !consent.dataSharing) {
      setError(T('consentRequired'));
      return;
    }
    actions.setConsent({ accepted: true });
    actions.setStep('interview');
  };

  const handleDecline = () => {
    actions.setStep('language');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <StepHeader currentStep="consent" language={language} />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <button onClick={() => actions.setStep('identity')} className="btn-ghost mb-6 text-slate-500">
            <ArrowLeft size={16} /> {T('back')}
          </button>

          {/* Patient greeting */}
          {patient.name && (
            <p className="text-slate-500 mb-4 text-base">
              Welcome, <span className="font-semibold text-slate-700">{patient.name}</span>
            </p>
          )}

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
              <Shield className="text-emerald-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{T('consentTitle')}</h2>
              <p className="text-slate-500 text-base mt-1">{T('consentSub')}</p>
            </div>
          </div>

          {/* Consent items */}
          <div className="space-y-3 mb-6">
            <ConsentItem
              checked={consent.dataCapture}
              onToggle={() => toggle('dataCapture')}
              label={T('consentCapture')}
            />
            <ConsentItem
              checked={consent.dataSharing}
              onToggle={() => toggle('dataSharing')}
              label={T('consentShare')}
            />
          </div>

          {/* Explain button */}
          <button
            onClick={handleExplain}
            className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl border-2 mb-6 font-medium text-base transition-all
              ${isExplaining
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'
              }`}
          >
            <Volume2 size={18} className={isExplaining ? 'animate-pulse' : ''} />
            {isExplaining ? 'Playing… tap to stop' : T('consentExplain')}
          </button>

          {/* Privacy note */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-slate-500 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-1">Privacy Note</p>
            <p>Your data is collected for this consultation only. Governed by the Digital Personal Data Protection Act 2023 (DPDPA) and ABDM Consent Framework. You may withdraw consent at any time.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleDecline} className="btn-secondary flex-1">
              {T('consentDecline')}
            </button>
            <button onClick={handleAccept} className="btn-primary flex-1">
              <ChevronRight size={18} /> {T('consentAccept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentItem({ checked, onToggle, label }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all
        ${checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {checked
          ? <CheckSquare className="text-emerald-500" size={22} />
          : <Square className="text-slate-400" size={22} />
        }
      </div>
      <p className={`text-base leading-relaxed ${checked ? 'text-emerald-800 font-medium' : 'text-slate-700'}`}>
        {label}
      </p>
    </button>
  );
}
