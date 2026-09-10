// src/screens/LandingScreen.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  Stethoscope, User, Shield, FileText, Activity, Leaf,
  CreditCard, ArrowRight, Monitor, PlayCircle, Lock,
  ChevronRight, Sparkles, Building2, PhoneCall, CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';

export default function LandingScreen({ onNavigate }) {
  const { state, actions } = useApp();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState('doctor'); // 'doctor' | 'nurse' | 'admin'
  const [email, setEmail] = useState('dr.sharma@hospital.org');
  const [password, setPassword] = useState('doctor123');

  const handleRoleSelect = (role) => {
    setLoginRole(role);
    if (role === 'doctor') {
      setEmail('dr.sharma@hospital.org');
      setPassword('doctor123');
    } else if (role === 'nurse') {
      setEmail('nurse@hospital.org');
      setPassword('nurse123');
    } else if (role === 'admin') {
      setEmail('admin@hospital.org');
      setPassword('admin123');
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setShowLoginModal(false);
    if (loginRole === 'doctor') {
      onNavigate('doctor_queue');
    } else if (loginRole === 'nurse') {
      onNavigate('triage');
    } else if (loginRole === 'admin') {
      onNavigate('admin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-primary-50/20 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-200">
              <Stethoscope className="text-white" size={20} />
            </div>
            <div>
              <span className="font-black text-2xl text-primary-700 tracking-tight">VSarthi.AI</span>
              <span className="ml-2 text-[10px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full border border-primary-200">
                ABDM &amp; DPDPA Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                actions.setStep('language');
                onNavigate('patient');
              }}
              className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-5 min-h-[42px]"
            >
              Start Intake <ArrowRight size={14} />
            </button>
            <button
              onClick={() => {
                handleRoleSelect('doctor');
                setShowLoginModal(true);
              }}
              className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4 min-h-[42px]"
            >
              Doctor Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 shadow-sm">
          <Sparkles size={14} className="text-blue-500" />
          AI-Powered Multilingual Clinical Intake Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-3xl leading-tight">
          Smarter, Faster Clinical Intake for <span className="text-primary-600">Every Indian Patient</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 mt-5 max-w-2xl font-normal leading-relaxed">
          Voice &amp; touch medical history interview in English &amp; Hindi, document OCR, chronological timeline, and physician-ready summaries before stepping into the doctor's cabin.
        </p>

        {/* Quick Launch Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-10 text-left">
          {/* Card 1: Patient Intake */}
          <div
            onClick={() => {
              actions.setStep('language');
              onNavigate('patient');
            }}
            className="card p-5 hover:border-primary-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 mb-3 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <User size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Patient Intake</h3>
              <p className="text-xs text-slate-500 mt-1">
                ABHA ID verification, bilingual voice interview, and document upload.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-primary-600 group-hover:translate-x-1 transition-transform">
              Launch Patient Flow <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 2: Doctor Queue */}
          <div
            onClick={() => {
              handleRoleSelect('doctor');
              setShowLoginModal(true);
            }}
            className="card p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Stethoscope size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Doctor Dashboard</h3>
              <p className="text-xs text-slate-500 mt-1">
                Today's Queue, priority red flags, AI summary review, and HIS push.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
              Doctor Login <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 3: OPD Kiosk Mode */}
          <div
            onClick={() => {
              actions.setStep('language');
              onNavigate('kiosk');
            }}
            className="card p-5 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Monitor size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">OPD Kiosk Mode</h3>
              <p className="text-xs text-slate-500 mt-1">
                Full-screen reception mode with 60s auto-reset for patient privacy.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              Start Reception Kiosk <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 4: Admin & Analytics */}
          <div
            onClick={() => {
              handleRoleSelect('admin');
              setShowLoginModal(true);
            }}
            className="card p-5 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700 mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Shield size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Hospital Admin</h3>
              <p className="text-xs text-slate-500 mt-1">
                Intake metrics, OCR accuracy, audit logs, and system configuration.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
              Admin Portal <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* Feature Matrix */}
        <div className="w-full mt-16 pt-10 border-t border-slate-200 text-left">
          <h2 className="text-2xl font-black text-slate-800 text-center mb-8">
            Complete Clinical Intake Architecture
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-5 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Activity className="text-red-500" size={18} /> Emergency Red-Flag Triage
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automated detection of Acute Coronary Syndrome, stroke signs, anaphylaxis, and sepsis with instant triage beacon alerts.
              </p>
            </div>

            <div className="card p-5 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <FileText className="text-indigo-500" size={18} /> Document OCR &amp; Lab Intelligence
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Extracts diagnoses, prescriptions, and lab tests. Automatically flags abnormal values against Indian diagnostic reference ranges.
              </p>
            </div>

            <div className="card p-5 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Leaf className="text-emerald-500" size={18} /> AYUSH Dashavidha Pariksha
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dedicated 14-parameter Ayurvedic clinical intake (Prakriti, Vikriti, Agni, Sara, Samhanana, Ahara-Vihara) without polluting allopathic records.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Role Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="text-primary-600" size={20} />
                <h3 className="font-bold text-lg text-slate-800">Staff Portal Authentication</h3>
              </div>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            {/* Role selector tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
              {[
                { id: 'doctor', label: 'Doctor' },
                { id: 'nurse', label: 'Nurse / Triage' },
                { id: 'admin', label: 'Admin' },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id)}
                  className={clsx(
                    'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                    loginRole === r.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email / Hospital ID</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field py-2.5 text-sm"
                  required
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                Demo Credentials preloaded for <strong>{loginRole.toUpperCase()}</strong>. Tap Continue to log in.
              </div>

              <button type="submit" className="btn-primary w-full py-3 text-sm mt-2">
                Enter {loginRole === 'doctor' ? 'Doctor Portal' : loginRole === 'nurse' ? 'Triage Queue' : 'Admin Portal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        <p>VSarthi.AI · AI-Powered Clinical Intake Platform · ABDM &amp; DPDPA 2023 Compliant</p>
        <p className="mt-1 text-[11px] text-slate-300">
          Disclaimer: AI summaries are generated drafts requiring physician verification before clinical decision making.
        </p>
      </footer>
    </div>
  );
}
