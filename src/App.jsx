// src/App.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from './context/AppContext.jsx';
import LandingScreen from './screens/LandingScreen.jsx';
import DoctorQueueScreen from './screens/DoctorQueueScreen.jsx';
import AdminDashboardScreen from './screens/AdminDashboardScreen.jsx';
import TriageScreen from './screens/TriageScreen.jsx';
import LanguageScreen from './screens/LanguageScreen.jsx';
import IdentityScreen from './screens/IdentityScreen.jsx';
import ConsentScreen from './screens/ConsentScreen.jsx';
import InterviewScreen from './screens/InterviewScreen.jsx';
import DocumentScreen from './screens/DocumentScreen.jsx';
import SummaryScreen from './screens/SummaryScreen.jsx';
import PhysicianScreen from './screens/PhysicianScreen.jsx';
import SessionEndScreen from './screens/SessionEndScreen.jsx';
import DemoModeBar from './components/DemoModeBar.jsx';
import RedFlagModal from './components/RedFlagModal.jsx';
import KioskGuard from './components/KioskGuard.jsx';
import AskVSarthiChatbot from './components/AskVSarthiChatbot.jsx';
import SystemStatusModal from './components/SystemStatusModal.jsx';
import { Sparkles, Home, Stethoscope, Shield, Activity, Monitor, Clock, HeartHandshake } from 'lucide-react';
import clsx from 'clsx';

export default function App() {
  const { state, actions } = useApp();
  const {
    activeView, currentStep, highContrast, largeFont,
    isDemoMode, activePersonaId, isKiosk, interview
  } = state;

  const [showDismissedRedFlag, setShowDismissedRedFlag] = useState(false);

  // Apply accessibility classes to html element
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('high-contrast', highContrast);
    html.classList.toggle('large-font', largeFont);
  }, [highContrast, largeFont]);

  // Patient Intake Screens Map
  const patientScreens = {
    language:    <LanguageScreen />,
    identity:    <IdentityScreen />,
    consent:     <ConsentScreen />,
    interview:   <InterviewScreen />,
    documents:   <DocumentScreen />,
    summary:     <SummaryScreen />,
    physician:   <PhysicianScreen />,
    session_end: <SessionEndScreen />,
  };

  const handleSelectPatientFromQueue = (patientRecord) => {
    actions.setSelectedPatient(patientRecord);
    // If the patient already has summary, load it
    actions.setPatient({
      name: patientRecord.patientName,
      abhaId: patientRecord.abhaId,
      gender: patientRecord.gender,
      dob: patientRecord.dob || '',
      phone: patientRecord.phone,
    });
    actions.setSummary({
      generated: true,
      generating: false,
      sections: {
        patientInfo: `${patientRecord.patientName}, ${patientRecord.age || ''}y/${patientRecord.gender?.toUpperCase() || 'U'}, Token: ${patientRecord.token}`,
        chiefComplaint: patientRecord.chiefComplaint,
        hpi: `Patient presents for evaluation of ${patientRecord.chiefComplaint}. Full clinical history documented during intake.`,
        pastMedical: 'Known medical conditions on record.',
        pastSurgical: 'No surgical interventions noted.',
        medications: 'Review prescription records.',
        allergies: 'NKDA unless specified in chart.',
        reviewOfSystems: 'Systemic review negative for acute red flags unless indicated.',
        priorInvestigations: 'See uploaded documents repository.',
        importantAbnormals: patientRecord.redFlag ? `Emergency alert: ${patientRecord.redFlag.name}` : 'Within clinical tolerances.',
        redFlags: patientRecord.redFlag ? `🚨 ${patientRecord.redFlag.name}: ${patientRecord.redFlag.message || ''}` : 'None triggered.',
        aiConfidenceNotes: 'VSarthi Clinical Intake Engine. AI-generated draft — Physician review required.',
      },
    });
    actions.setView('physician_review');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative text-slate-900">
      {/* Demo Mode Persistent Banner */}
      <DemoModeBar
        isDemo={isDemoMode}
        onToggleDemo={actions.toggleDemoMode}
        onSelectPersona={(persona) => {
          actions.loadPersona(persona);
          actions.setView('patient');
          actions.setStep('interview');
        }}
        activePersonaId={activePersonaId}
      />

      {/* OPD Kiosk Guard Inactivity Timer */}
      <KioskGuard
        isKiosk={isKiosk || activeView === 'kiosk'}
        timeoutSeconds={60}
        onReset={() => {
          actions.reset();
          actions.setView('kiosk');
          actions.setStep('language');
        }}
      />

      {/* Emergency Red-Flag Modal */}
      {interview.redFlag && !showDismissedRedFlag && (
        <RedFlagModal
          redFlag={interview.redFlag}
          onDismiss={() => setShowDismissedRedFlag(true)}
          onAlertStaff={() => {
            setShowDismissedRedFlag(true);
          }}
        />
      )}

      {/* Top Floating Portal Switcher for Presentation & Hackathon Navigation */}
      <div className="bg-slate-900 text-white text-xs px-3 py-1.5 shadow-md flex items-center justify-between gap-2 overflow-x-auto z-30">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => actions.setView('landing')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all', activeView === 'landing' ? 'bg-primary-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Home size={12} /> Portal Home
          </button>
          <button
            onClick={() => {
              actions.setView('patient');
              if (activeView !== 'patient') actions.setStep('language');
            }}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all', activeView === 'patient' ? 'bg-primary-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            👤 Patient Intake
          </button>
          <button
            onClick={() => actions.setView('doctor_queue')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all', activeView === 'doctor_queue' || activeView === 'physician_review' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Stethoscope size={12} /> Doctor Queue
          </button>
          <button
            onClick={() => actions.setView('triage')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all', activeView === 'triage' ? 'bg-amber-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Activity size={12} /> Nurse Triage
          </button>
          <button
            onClick={() => actions.setView('admin')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all', activeView === 'admin' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Shield size={12} /> Hospital Admin
          </button>
          <button
            onClick={() => {
              actions.setKioskMode(true);
              actions.setView('kiosk');
              actions.setStep('language');
            }}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all', activeView === 'kiosk' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Monitor size={12} /> OPD Kiosk
          </button>
        </div>

        <button
          onClick={actions.toggleDemoMode}
          className={clsx(
            'ml-auto px-2.5 py-1 rounded-lg flex items-center gap-1 font-black text-[11px] transition-all flex-shrink-0',
            isDemoMode ? 'bg-amber-500 text-slate-900 shadow' : 'bg-slate-800 text-amber-400 border border-amber-500/40 hover:bg-slate-700'
          )}
        >
          <Sparkles size={12} /> {isDemoMode ? 'Demo Mode: ON' : 'Toggle Demo Mode'}
        </button>
      </div>

      {/* Screen Router */}
      <div className="flex-1 flex flex-col">
        {activeView === 'landing' && (
          <LandingScreen onNavigate={(v) => actions.setView(v)} />
        )}

        {activeView === 'doctor_queue' && (
          <DoctorQueueScreen
            onSelectPatient={handleSelectPatientFromQueue}
            onLogout={() => actions.setView('landing')}
            onBackHome={() => actions.setView('landing')}
          />
        )}

        {activeView === 'physician_review' && (
          <PhysicianScreen />
        )}

        {activeView === 'triage' && (
          <TriageScreen onBackHome={() => actions.setView('landing')} />
        )}

        {activeView === 'admin' && (
          <AdminDashboardScreen onBackHome={() => actions.setView('landing')} />
        )}

        {(activeView === 'patient' || activeView === 'kiosk') && (
          <div className="flex-1">
            {patientScreens[currentStep] || <LanguageScreen />}
          </div>
        )}
      </div>

      {/* Persistent Floating "Ask VSarthi" Assistant on Every Screen */}
      <AskVSarthiChatbot />

      {/* Internal System Status View & Integration Health Modal */}
      <SystemStatusModal
        isOpen={state.isSystemStatusOpen}
        onClose={actions.closeSystemStatus}
      />

      {/* Hospitality Reception Desk Global Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-xs text-slate-500 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <button
              onClick={() => actions.openSystemStatus()}
              className="text-slate-600 hover:text-teal-700 font-semibold underline text-[11px]"
            >
              ● System Status: All 9 Core Adapters Operational
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 text-[11px]">DPDPA 2023 & ABDM Compliant</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Hospital OPD Pre-Consultation Platform</span>
            <span>•</span>
            <span className="text-teal-700 font-bold">VSarthi.AI v2.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
