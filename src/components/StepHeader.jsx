import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import {
  Stethoscope, Settings, X, Sun, ZoomIn, Volume2,
  ChevronRight, Check
} from 'lucide-react';
import clsx from 'clsx';

const STEPS = ['language', 'identity', 'consent', 'interview', 'documents', 'summary', 'physician'];
const STEP_LABELS = {
  language:  { labelKey: 'step1', icon: '🌐' },
  identity:  { labelKey: 'step1', icon: '🪪' },
  consent:   { labelKey: 'step1', icon: '🛡' },
  interview: { labelKey: 'step2', icon: '💬' },
  documents: { labelKey: 'step3', icon: '📄' },
  summary:   { labelKey: 'step4', icon: '📋' },
  physician: { labelKey: 'step5', icon: '👨‍⚕️' },
};

const PROGRESS_STEPS = [
  { key: 'identity',  labelKey: 'step1' },
  { key: 'interview', labelKey: 'step2' },
  { key: 'documents', labelKey: 'step3' },
  { key: 'summary',   labelKey: 'step4' },
  { key: 'physician', labelKey: 'step5' },
];

export default function StepHeader({ currentStep, language }) {
  const { state, actions } = useApp();
  const { highContrast, largeFont, ttsEnabled } = state;
  const T = (key) => t(language, key);
  const [showSettings, setShowSettings] = useState(false);

  const stepOrder = ['identity', 'consent', 'interview', 'documents', 'summary', 'physician'];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="text-white" size={16} />
          </div>
          <span className="font-black text-primary-700 text-lg tracking-tight">{T('appName')}</span>
        </div>

        {/* Progress dots */}
        <div className="hidden sm:flex items-center gap-1.5 flex-1 justify-center">
          {PROGRESS_STEPS.map((step, idx) => {
            const stepIdx = stepOrder.indexOf(step.key);
            const isCurrent = currentStep === step.key || (step.key === 'identity' && (currentStep === 'identity' || currentStep === 'consent'));
            const isDone = currentIdx > stepIdx;
            return (
              <React.Fragment key={step.key}>
                <div
                  className={clsx(
                    'flex items-center justify-center rounded-full font-semibold text-xs transition-all',
                    isCurrent
                      ? 'w-7 h-7 bg-primary-600 text-white shadow-md shadow-primary-200'
                      : isDone
                      ? 'w-6 h-6 bg-emerald-500 text-white'
                      : 'w-6 h-6 bg-slate-100 text-slate-400'
                  )}
                >
                  {isDone ? <Check size={12} /> : idx + 1}
                </div>
                {idx < PROGRESS_STEPS.length - 1 && (
                  <div className={clsx(
                    'h-0.5 flex-1 max-w-[2rem] transition-all',
                    isDone ? 'bg-emerald-400' : 'bg-slate-200'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Settings button */}
        <button
          onClick={() => setShowSettings(s => !s)}
          className="btn-ghost p-2 relative flex-shrink-0"
          aria-label="Settings"
        >
          {showSettings ? <X size={18} /> : <Settings size={18} />}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-3">
            {/* High contrast */}
            <ToggleChip
              icon={<Sun size={14} />}
              label={T('highContrast')}
              active={highContrast}
              onToggle={actions.toggleHighContrast}
            />
            {/* Large font */}
            <ToggleChip
              icon={<ZoomIn size={14} />}
              label={T('largeFont')}
              active={largeFont}
              onToggle={actions.toggleLargeFont}
            />
            {/* TTS */}
            <ToggleChip
              icon={<Volume2 size={14} />}
              label={T('ttsToggle')}
              active={ttsEnabled}
              onToggle={actions.toggleTTS}
            />
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
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
        active
          ? 'bg-primary-100 text-primary-700 border-primary-300'
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
      )}
    >
      {icon}
      {label}
      {active && <Check size={10} className="text-primary-500" />}
    </button>
  );
}
