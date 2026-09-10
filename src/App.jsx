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
import PrescriptionScannerScreen from './screens/PrescriptionScannerScreen.jsx';
import RedFlagModal from './components/RedFlagModal.jsx';
import AskVSarthiChatbot from './components/AskVSarthiChatbot.jsx';
import SystemStatusModal from './components/SystemStatusModal.jsx';
import { Stethoscope, Home, Shield, Activity } from 'lucide-react';
import clsx from 'clsx';
// DemoModeBar imported normally; rendered only in DEV mode via import.meta.env.DEV
import DemoModeBar from './components/DemoModeBar.jsx';


export default function App() {
  const { state, actions } = useApp();
  const {
    activeView, currentStep, highContrast, largeFont,
    isDemoMode, activePersonaId, interview
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
        importantAbnormals: patientRecord.redFlag ? `Alert: ${patientRecord.redFlag.name}` : 'Within clinical tolerances.',
        redFlags: patientRecord.redFlag ? `🚨 ${patientRecord.redFlag.name}: ${patientRecord.redFlag.message || ''}` : 'None triggered.',
        aiConfidenceNotes: 'VSarthi Clinical Intake Engine. AI-generated draft — Physician review required.',
      },
    });
    actions.setView('physician_review');
  };

  return (
    <div className={clsx('min-h-screen bg-slate-50 flex flex-col relative text-slate-900', highContrast && 'contrast-150')}>
      {/* Demo Mode Banner — Development Only */}
      {import.meta.env.DEV && DemoModeBar && (
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
      )}

      {/* Emergency Red-Flag Modal */}
      {interview.redFlag && !showDismissedRedFlag && (
        <RedFlagModal
          redFlag={interview.redFlag}
          onDismiss={() => setShowDismissedRedFlag(true)}
          onAlertStaff={() => setShowDismissedRedFlag(true)}
        />
      )}

      {/* Portal Navigation Bar (shown only when not on landing) */}
      {activeView !== 'landing' && activeView !== 'prescription_scanner' && (
        <div className="bg-slate-900 text-white text-xs px-3 py-1.5 shadow-md flex items-center gap-2 overflow-x-auto z-30 flex-shrink-0">
          <button
            onClick={() => actions.setView('landing')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all flex-shrink-0',
              activeView === 'landing' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Home size={12} /> Home
          </button>
          <button
            onClick={() => { actions.setView('patient'); if (activeView !== 'patient') actions.setStep('language'); }}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all flex-shrink-0',
              activeView === 'patient' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            👤 Patient Intake
          </button>
          <button
            onClick={() => actions.setView('doctor_queue')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all flex-shrink-0',
              activeView === 'doctor_queue' || activeView === 'physician_review' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Stethoscope size={12} /> Doctor Queue
          </button>
          <button
            onClick={() => actions.setView('triage')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all flex-shrink-0',
              activeView === 'triage' ? 'bg-amber-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Activity size={12} /> Nurse Triage
          </button>
          <button
            onClick={() => actions.setView('admin')}
            className={clsx('px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all flex-shrink-0',
              activeView === 'admin' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
          >
            <Shield size={12} /> Hospital Admin
          </button>
        </div>
      )}

      {/* Screen Router */}
      <div className="flex-1 flex flex-col">
        {activeView === 'landing' && (
          <LandingScreen onNavigate={(v) => actions.setView(v)} />
        )}

        {activeView === 'prescription_scanner' && (
          <PrescriptionScannerScreen onNavigate={(v) => actions.setView(v)} />
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

        {activeView === 'patient' && (
          <div className="flex-1">
            {patientScreens[currentStep] || <LanguageScreen />}
          </div>
        )}
      </div>

      {/* Persistent Floating AI Chatbot — shown on all screens */}
      <AskVSarthiChatbot />

      {/* System Status Modal */}
      <SystemStatusModal
        isOpen={state.isSystemStatusOpen}
        onClose={actions.closeSystemStatus}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-xs text-slate-500 z-20 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <button
              onClick={() => actions.openSystemStatus()}
              className="text-slate-600 hover:text-teal-700 font-semibold text-[11px]"
            >
              System Status
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 text-[11px]">
              Designed with ABDM/DPDPA 2023 considerations
            </span>
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
