import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import { LANGUAGES } from '../data/languages.js';
import { Settings } from 'lucide-react';

export default function LanguageScreen() {
  const { state, actions } = useApp();

  function selectLanguage(code) {
    actions.setLanguage(code);
    actions.setStep('identity');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img
            src="/vsarthi-logo.jpg"
            alt="VSarthi.AI Logo"
            className="w-14 h-14 rounded-2xl object-contain shadow-lg shadow-primary-200"
          />
          <div>
            <h1 className="text-4xl font-black text-primary-700 tracking-tight">VSarthi.AI</h1>
            <p className="text-sm font-medium text-primary-400 tracking-wide uppercase">Clinical Intake Platform</p>
          </div>
        </div>
        <p className="text-slate-500 text-lg mt-4 max-w-sm mx-auto">
          Smart health history — before you see the doctor
        </p>
        <p className="text-slate-400 text-base mt-1">
          अपनी भाषा में स्वास्थ्य इतिहास
        </p>
      </div>

      {/* Language Grid */}
      <div className="w-full max-w-lg">
        <p className="text-center text-slate-600 font-semibold text-xl mb-5">
          Select Your Language / अपनी भाषा चुनें
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LANGUAGES.map((lang) => {
            const isPlaceholder = lang.code === 'ta' || lang.code === 'te' || lang.code === 'mr';
            return (
              <button
                key={lang.code}
                onClick={() => !isPlaceholder && selectLanguage(lang.code)}
                disabled={isPlaceholder}
                className={`
                  relative flex items-center gap-4 p-5 rounded-2xl border-2 text-left
                  transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-primary-300
                  min-h-[80px] shadow-sm
                  ${isPlaceholder
                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : 'border-slate-200 bg-white hover:border-primary-400 hover:bg-primary-50 hover:shadow-md active:scale-98'}
                `}
              >
                <span className="text-4xl">{lang.flag}</span>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{lang.nativeLabel}</p>
                  <p className="text-slate-400 text-sm">{lang.label}</p>
                </div>
                {isPlaceholder && (
                  <span className="absolute top-2 right-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Coming soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accessibility toggle (quick access) */}
      <button
        onClick={() => {
          actions.toggleLargeFont();
        }}
        className="mt-6 btn-ghost text-sm text-slate-400"
        aria-label="Toggle large text"
      >
        <Settings size={14} />
        Large Text / बड़ा टेक्स्ट
      </button>
    </div>
  );
}
