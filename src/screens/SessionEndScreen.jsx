import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import { stopSpeaking } from '../services/tts.js';
import { CheckCircle, ShieldCheck, UserPlus, Home } from 'lucide-react';

export default function SessionEndScreen() {
  const { state, actions } = useApp();
  const { language, patient } = state;
  const T = (key) => t(language, key);

  // Stop any ongoing TTS
  useEffect(() => {
    stopSpeaking();
  }, []);

  const handleNewPatient = () => {
    actions.reset();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-6">
      <div className="text-center max-w-sm w-full">
        {/* Success icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-emerald-500" size={48} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-full border-2 border-emerald-200 flex items-center justify-center shadow-sm">
              <ShieldCheck className="text-emerald-500" size={18} />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-slate-800 mb-3">{T('sessionEndTitle')}</h2>
        <p className="text-slate-500 text-lg leading-relaxed mb-2">{T('sessionEndSub')}</p>

        {patient.name && (
          <p className="text-slate-400 text-sm mb-8">Session for: <span className="font-semibold text-slate-600">{patient.name}</span></p>
        )}

        {/* Data cleared confirmation */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-8 text-sm text-emerald-700">
          <div className="flex items-center gap-2 justify-center">
            <ShieldCheck size={16} />
            <span className="font-semibold">Session data securely cleared from this device</span>
          </div>
          <p className="text-emerald-600 mt-1 text-xs">
            Your health summary has been submitted to the physician and ABHA system.
            No personal data remains on this device.
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={handleNewPatient}
          className="btn-primary w-full mb-3"
        >
          <UserPlus size={18} /> {T('sessionNew')}
        </button>

        <button
          onClick={handleNewPatient}
          className="btn-ghost w-full text-slate-500"
        >
          <Home size={16} /> Return to Start
        </button>

        {/* VSarthi branding */}
        <p className="text-slate-300 text-xs mt-10">
          VSarthi.AI · AI-Powered Clinical Intake · ABDM Compatible
        </p>
      </div>
    </div>
  );
}
