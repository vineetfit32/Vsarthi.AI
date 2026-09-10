// src/components/StepHeader.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import {
  Stethoscope, Settings, X, Sun, ZoomIn, Volume2,
  ChevronRight, Check, Activity, ShieldCheck, Clock, User
} from 'lucide-react';
import clsx from 'clsx';

const RECEPTION_STEPS = [
  { key: 'identity', label: 'Identify', icon: '🪪' },
  { key: 'interview', label: 'Converse', icon: '💬' },
  { key: 'documents', label: 'Scan', icon: '📄' },
  { key: 'summary', label: 'Summarize', icon: '📋' },
  { key: 'physician', label: 'Consult', icon: '👨‍⚕️' },
];

export default function StepHeader({ currentStep, language }) {
  const { state, actions } = useApp();
  const { highContrast, largeFont, ttsEnabled, patient, session } = state;
  const T = (key) => t(language, key);
  const [showSettings, setShowSettings] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Map sub-steps to the 5 primary journey phases
  const getActivePhaseKey = (step) => {
    if (step === 'language' || step === 'identity' || step === 'consent') return 'identity';
    if (step === 'interview') return 'interview';
    if (step === 'documents') return 'documents';
    if (step === 'summary') return 'summary';
    if (step === 'physician' || step === 'session_end') return 'physician';
    return 'identity';
  };

  const activePhase = getActivePhaseKey(currentStep);
  const phaseIndex = RECEPTION_STEPS.findIndex((s) => s.key === activePhase);

  // Session expiry countdown
  useEffect(() => {
    if (!session.expiresAt) return;
    const interval = setInterval(() => {
      const remainingMs = session.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Expired');
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session.expiresAt]);

  return (
    <header className="bg-white border-b border-teal-100 shadow-xs sticky top-0 z-30 transition-all">
      {/* Top Banner: Personalized Hospitality Greeting */}
      {patient.name && (
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800 text-white text-xs px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-2xl mx-auto w-full justify-between">
            <span className="font-medium flex items-center gap-1.5 truncate">
              <span className="text-teal-200">🙏</span>
              <span>
                Namaste, <strong>{patient.name}</strong> — let's get you ready to see the doctor today
              </span>
            </span>

            {session.expiresAt && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-teal-200 flex-shrink-0">
                <Clock size={12} />
                <span>Session: {timeLeft}</span>
                <button
                  onClick={() => actions.renewSession(15 * 60 * 1000)}
                  className="underline hover:text-white font-bold"
                >
                  Extend
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer" onClick={() => actions.setView('landing')}>
          <div className="w-9 h-9 bg-gradient-to-tr from-teal-700 to-teal-500 rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20 text-white">
            <Stethoscope size={18} />
          </div>
          <div>
            <span className="font-black text-slate-900 text-lg tracking-tight block leading-tight">
              VSarthi<span className="text-teal-600">.AI</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block -mt-0.5">
              OPD Clinical Intake
            </span>
          </div>
        </div>

        {/* 5-Step Reception Desk Progress Tracker */}
        <div className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-xl">
          {RECEPTION_STEPS.map((step, idx) => {
            const isCurrent = activePhase === step.key;
            const isDone = phaseIndex > idx;

            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => {
                    // Allow navigating to visited steps
                    if (isDone || isCurrent) {
                      actions.setStep(step.key);
                    }
                  }}
                  disabled={!isDone && !isCurrent}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                    isCurrent
                      ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20 ring-2 ring-teal-200'
                      : isDone
                      ? 'bg-teal-50 text-teal-800 hover:bg-teal-100 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-75'
                  )}
                >
                  <span className="text-sm">{isDone ? '✓' : step.icon}</span>
                  <span>{step.label}</span>
                </button>

                {idx < RECEPTION_STEPS.length - 1 && (
                  <div
                    className={clsx(
                      'h-0.5 w-4 rounded-full transition-all',
                      phaseIndex > idx ? 'bg-teal-500' : 'bg-slate-200'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Utility Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* System Status Modal Trigger */}
          <button
            onClick={() => actions.openSystemStatus()}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-teal-800 hover:border-teal-300 transition-all"
            title="View integration capabilities"
          >
            <Activity size={13} className="text-teal-600" />
            <span className="hidden sm:inline">System Status</span>
          </button>

          {/* Accessibility Settings Toggle */}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all relative"
            aria-label="Accessibility Settings"
          >
            {showSettings ? <X size={18} /> : <Settings size={18} />}
          </button>
        </div>
      </div>

      {/* Settings Drawer Panel */}
      {showSettings && (
        <div className="border-t border-slate-100 bg-slate-50/90 backdrop-blur-sm px-4 py-3 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Patient Accessibility Options:
            </span>
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                icon={<Sun size={14} />}
                label={T('highContrast')}
                active={highContrast}
                onToggle={actions.toggleHighContrast}
              />
              <ToggleChip
                icon={<ZoomIn size={14} />}
                label={T('largeFont')}
                active={largeFont}
                onToggle={actions.toggleLargeFont}
              />
              <ToggleChip
                icon={<Volume2 size={14} />}
                label={T('ttsToggle')}
                active={ttsEnabled}
                onToggle={actions.toggleTTS}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function ToggleChip({ icon, label, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
        active
          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
      )}
    >
      {icon}
      {label}
      {active && <Check size={11} className="text-white" />}
    </button>
  );
}
