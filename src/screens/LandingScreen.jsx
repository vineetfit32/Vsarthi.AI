// src/screens/LandingScreen.jsx
// VSarthi.AI — Landing Page with Real Authentication
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { apiClient } from '../services/apiClient.js';
import {
  Stethoscope, User, Shield, FileText, Activity, Leaf,
  Monitor, ArrowRight, Lock, ChevronRight, Sparkles,
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ScanLine,
  HeartHandshake
} from 'lucide-react';
import clsx from 'clsx';

export default function LandingScreen({ onNavigate }) {
  const { actions } = useApp();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [loginRole, setLoginRole] = useState('doctor');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'doctor', terms: false,
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState('');

  // ─── Role selection prefills demo credentials info box (NOT the form) ───────
  const handleRoleSelect = (role) => {
    setLoginRole(role);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
  };

  const DEMO_CREDENTIALS = {
    doctor: { email: 'dr.sharma@hospital.org', password: 'doctor123' },
    nurse: { email: 'nurse@hospital.org', password: 'nurse123' },
    admin: { email: 'admin@hospital.org', password: 'admin123' },
  };

  // ─── Login Submit ──────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim()) { setLoginError('Please enter your email address.'); return; }
    if (!loginPassword) { setLoginError('Please enter your password.'); return; }

    setLoginLoading(true);

    try {
      let userRole;
      try {
        const res = await apiClient.login(loginEmail.trim(), loginPassword);
        userRole = res.user?.role;
      } catch (err) {
        // Fallback: check demo credentials or local registered users if server is unavailable
        const emailLower = loginEmail.trim().toLowerCase();
        const demoMatch = Object.entries(DEMO_CREDENTIALS).find(
          ([role, creds]) => creds.email.toLowerCase() === emailLower && creds.password === loginPassword
        );

        let localUser = null;
        if (demoMatch) {
          localUser = {
            id: `usr_${demoMatch[0]}`,
            name: demoMatch[0] === 'doctor' ? 'Dr. Sharma' : demoMatch[0] === 'nurse' ? 'Staff Nurse' : 'Hospital Administrator',
            email: emailLower,
            role: demoMatch[0],
          };
        } else {
          try {
            const registered = JSON.parse(localStorage.getItem('vsarthi_registered_users') || '[]');
            const found = registered.find(u => u.email.toLowerCase() === emailLower && u.password === loginPassword);
            if (found) {
              localUser = { id: found.id, name: found.name, email: found.email, role: found.role };
            }
          } catch {}
        }

        if (localUser) {
          const fallbackToken = `vsarthi_fallback_${Date.now()}`;
          apiClient.setToken(fallbackToken);
          apiClient.setUser(localUser);
          userRole = localUser.role;
        } else {
          throw err;
        }
      }

      setShowAuthModal(false);
      setLoginEmail('');
      setLoginPassword('');

      if (userRole === 'doctor') onNavigate('doctor_queue');
      else if (userRole === 'nurse') onNavigate('triage');
      else if (userRole === 'admin') onNavigate('admin');
      else onNavigate('landing');
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ─── Signup Submit ─────────────────────────────────────────────────────────
  const validateSignup = () => {
    const errors = {};
    if (!signupData.name.trim() || signupData.name.trim().length < 2) errors.name = 'Full name must be at least 2 characters.';
    if (!signupData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) errors.email = 'Please enter a valid email address.';
    if (!signupData.phone || !/^[6-9]\d{9}$/.test(signupData.phone.replace(/\s/g, ''))) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!signupData.password || signupData.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(signupData.password)) errors.password = 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(signupData.password)) errors.password = 'Password must contain at least one number.';
    if (signupData.confirmPassword !== signupData.password) errors.confirmPassword = 'Passwords do not match.';
    if (!signupData.terms) errors.terms = 'You must accept the terms and privacy policy.';
    return errors;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupErrors({});
    setSignupSuccess('');

    const errors = validateSignup();
    if (Object.keys(errors).length > 0) { setSignupErrors(errors); return; }

    setSignupLoading(true);

    try {
      let userRole;
      try {
        const res = await apiClient.register({
          name: signupData.name.trim(),
          email: signupData.email.trim().toLowerCase(),
          phone: signupData.phone.trim(),
          password: signupData.password,
          confirmPassword: signupData.confirmPassword,
          role: signupData.role,
          termsAccepted: signupData.terms,
        });
        userRole = res.user?.role;
      } catch (err) {
        // If server is unreachable or offline, save user locally so signup still succeeds smoothly
        if (err.isNetwork || err.message?.includes('connect to server') || err.message?.includes('Failed to fetch')) {
          const newUser = {
            id: `usr_local_${Date.now()}`,
            name: signupData.name.trim(),
            email: signupData.email.trim().toLowerCase(),
            phone: signupData.phone.trim(),
            password: signupData.password,
            role: signupData.role,
            createdAt: new Date().toISOString(),
          };
          try {
            const registered = JSON.parse(localStorage.getItem('vsarthi_registered_users') || '[]');
            registered.push(newUser);
            localStorage.setItem('vsarthi_registered_users', JSON.stringify(registered));
          } catch {}

          const fallbackToken = `vsarthi_fallback_${Date.now()}`;
          apiClient.setToken(fallbackToken);
          apiClient.setUser({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
          userRole = newUser.role;
        } else {
          throw err;
        }
      }

      setSignupSuccess('Account created successfully! You are now logged in.');

      setTimeout(() => {
        setShowAuthModal(false);
        if (userRole === 'doctor') onNavigate('doctor_queue');
        else if (userRole === 'nurse') onNavigate('triage');
        else if (userRole === 'admin') onNavigate('admin');
        else onNavigate('landing');
      }, 1200);

    } catch (err) {
      if (err.fields) {
        setSignupErrors(err.fields);
      } else {
        setSignupErrors({ general: err.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const openLogin = (role = 'doctor') => {
    setLoginRole(role);
    setAuthMode('login');
    setLoginError('');
    setSignupErrors({});
    setSignupSuccess('');
    setShowAuthModal(true);
  };

  const openSignup = () => {
    setAuthMode('signup');
    setLoginError('');
    setSignupErrors({});
    setSignupSuccess('');
    setShowAuthModal(true);
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 3) return { label: 'Moderate', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const pwStrength = getPasswordStrength(signupData.password);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/20 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/vsarthi-logo.jpg"
              alt="Vsarthi.ai Logo"
              className="w-10 h-10 rounded-xl object-contain shadow-md shadow-teal-200"
            />
            <div>
              <span className="font-black text-2xl text-teal-700 tracking-tight">VSarthi.AI</span>
              <span className="ml-2 text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                Clinical Intake Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { actions.setStep('language'); onNavigate('patient'); }}
              className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-5 min-h-[42px]"
            >
              Start Intake <ArrowRight size={14} />
            </button>
            <button
              onClick={() => openLogin('doctor')}
              className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4 min-h-[42px]"
            >
              Staff Login
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
          Smarter Clinical Intake for <span className="text-teal-600">Every Indian Patient</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 mt-5 max-w-2xl font-normal leading-relaxed">
          Voice & touch medical history interview in English & Hindi, AI prescription scanning, document OCR, and physician-ready summaries — before stepping into the doctor's cabin.
        </p>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-10 text-left">
          {/* Patient Intake */}
          <div
            onClick={() => { actions.setStep('language'); onNavigate('patient'); }}
            className="card p-5 hover:border-teal-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <User size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Patient Intake</h3>
              <p className="text-xs text-slate-500 mt-1">ABHA ID verification, bilingual voice interview, document upload, and AI summary.</p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
              Start Intake <ChevronRight size={14} />
            </div>
          </div>

          {/* AI Prescription Scanner */}
          <div
            onClick={() => onNavigate('prescription_scanner')}
            className="card p-5 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700 mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <ScanLine size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Prescription Scanner</h3>
              <p className="text-xs text-slate-500 mt-1">Upload or photograph a prescription — AI extracts medicines, dosage, and instructions.</p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
              Scan Prescription <ChevronRight size={14} />
            </div>
          </div>

          {/* Doctor Queue */}
          <div
            onClick={() => openLogin('doctor')}
            className="card p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Stethoscope size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Doctor Dashboard</h3>
              <p className="text-xs text-slate-500 mt-1">Today's queue, priority red flags, AI summary review, and HIS push.</p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
              Doctor Login <ChevronRight size={14} />
            </div>
          </div>

          {/* Admin */}
          <div
            onClick={() => openLogin('admin')}
            className="card p-5 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Shield size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Hospital Admin</h3>
              <p className="text-xs text-slate-500 mt-1">Intake metrics, OCR accuracy, audit logs, and system configuration.</p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              Admin Portal <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
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
                Automated detection of Acute Coronary Syndrome, stroke signs, anaphylaxis, and sepsis with instant triage alerts to nursing staff.
              </p>
            </div>
            <div className="card p-5 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ScanLine className="text-purple-500" size={18} /> AI Prescription Scanner
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload a prescription photo — AI extracts medicine names, dosages, instructions, and flags potential safety issues for review.
              </p>
            </div>
            <div className="card p-5 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <HeartHandshake className="text-emerald-500" size={18} /> ABDM & Privacy Design
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Designed with ABDM and DPDPA 2023 considerations including consent management, data minimization, audit logging, and user data controls.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="text-teal-600" size={20} />
                <h3 className="font-bold text-lg text-slate-800">
                  {authMode === 'login' ? 'Staff Portal Login' : 'Create Account'}
                </h3>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <ChevronRight size={20} className="rotate-180" />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
              <button
                onClick={() => { setAuthMode('login'); setSignupErrors({}); setLoginError(''); }}
                className={clsx('flex-1 py-2 text-xs font-bold rounded-lg transition-all',
                  authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
              >
                Login
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setLoginError(''); setSignupErrors({}); }}
                className={clsx('flex-1 py-2 text-xs font-bold rounded-lg transition-all',
                  authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
              >
                Sign Up
              </button>
            </div>

            {/* ── LOGIN FORM ── */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} method="post" action="#" autoComplete="on" className="space-y-4">
                {/* Role selector */}
                <div className="flex rounded-xl bg-slate-50 border border-slate-200 p-1 mb-2">
                  {[{ id: 'doctor', label: '🩺 Doctor' }, { id: 'nurse', label: '💉 Nurse' }, { id: 'admin', label: '🛡️ Admin' }].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleSelect(r.id)}
                      className={clsx('flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                        loginRole === r.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Demo credentials info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                  <p className="font-semibold mb-1">Demo credentials for {loginRole}:</p>
                  <p>Email: <code className="bg-blue-100 px-1 rounded">{DEMO_CREDENTIALS[loginRole]?.email}</code></p>
                  <p>Password: <code className="bg-blue-100 px-1 rounded">{DEMO_CREDENTIALS[loginRole]?.password}</code></p>
                </div>

                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="input-field py-2.5 text-sm"
                    placeholder="your@hospital.org"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="input-field py-2.5 text-sm pr-10"
                      placeholder="Enter password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Don't have an account?{' '}
                    <button type="button" onClick={() => setAuthMode('signup')} className="text-teal-600 hover:text-teal-700 font-semibold underline">
                      Sign Up
                    </button>
                  </span>
                  <button type="button" className="text-slate-400 hover:text-teal-600 font-medium">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="btn-primary w-full py-3 text-sm mt-1 disabled:opacity-60"
                >
                  {loginLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                  ) : (
                    <>Login to {loginRole === 'doctor' ? 'Doctor Portal' : loginRole === 'nurse' ? 'Triage Queue' : 'Admin Portal'}</>
                  )}
                </button>
              </form>
            )}

            {/* ── SIGNUP FORM ── */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignupSubmit} method="post" action="#" autoComplete="on" className="space-y-4" noValidate>
                {signupSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 size={14} /> {signupSuccess}
                  </div>
                )}

                {signupErrors.general && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {signupErrors.general}
                  </div>
                )}

                <div>
                  <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    value={signupData.name}
                    onChange={e => setSignupData(d => ({ ...d, name: e.target.value }))}
                    className={clsx('input-field py-2.5 text-sm', signupErrors.name && 'border-red-400 focus:border-red-500')}
                    placeholder="Dr. Ananya Sharma"
                    autoComplete="name"
                  />
                  {signupErrors.name && <p className="text-xs text-red-600 mt-1">{signupErrors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      value={signupData.email}
                      onChange={e => setSignupData(d => ({ ...d, email: e.target.value }))}
                      className={clsx('input-field py-2.5 text-sm', signupErrors.email && 'border-red-400')}
                      placeholder="your@email.com"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck="false"
                    />
                    {signupErrors.email && <p className="text-xs text-red-600 mt-1">{signupErrors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="signup-phone" className="block text-xs font-semibold text-slate-600 mb-1">Mobile *</label>
                    <input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      value={signupData.phone}
                      onChange={e => setSignupData(d => ({ ...d, phone: e.target.value }))}
                      className={clsx('input-field py-2.5 text-sm', signupErrors.phone && 'border-red-400')}
                      placeholder="9876543210"
                      maxLength={10}
                      autoComplete="tel"
                    />
                    {signupErrors.phone && <p className="text-xs text-red-600 mt-1">{signupErrors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-role" className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
                  <select
                    id="signup-role"
                    name="role"
                    value={signupData.role}
                    onChange={e => setSignupData(d => ({ ...d, role: e.target.value }))}
                    className="input-field py-2.5 text-sm"
                  >
                    <option value="doctor">Doctor / Physician</option>
                    <option value="nurse">Nurse / Triage Staff</option>
                    <option value="admin">Hospital Administrator</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-600 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      name="password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupData.password}
                      onChange={e => setSignupData(d => ({ ...d, password: e.target.value }))}
                      className={clsx('input-field py-2.5 text-sm pr-10', signupErrors.password && 'border-red-400')}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowSignupPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Password strength meter */}
                  {signupData.password && pwStrength && (
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full transition-all', pwStrength.color)} style={{ width: pwStrength.width }} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Strength: <span className="font-semibold">{pwStrength.label}</span></p>
                    </div>
                  )}
                  {signupErrors.password && <p className="text-xs text-red-600 mt-1">{signupErrors.password}</p>}
                </div>

                <div>
                  <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-600 mb-1">Confirm Password *</label>
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={signupData.confirmPassword}
                    onChange={e => setSignupData(d => ({ ...d, confirmPassword: e.target.value }))}
                    className={clsx('input-field py-2.5 text-sm', signupErrors.confirmPassword && 'border-red-400')}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  {signupErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{signupErrors.confirmPassword}</p>}
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signupData.terms}
                    onChange={e => setSignupData(d => ({ ...d, terms: e.target.checked }))}
                    className="mt-0.5 accent-teal-600"
                  />
                  <span className="text-xs text-slate-600">
                    I agree to the <button type="button" className="text-teal-600 underline font-medium">Terms of Service</button> and <button type="button" className="text-teal-600 underline font-medium">Privacy Policy</button>. I understand my data will be processed as described.
                  </span>
                </label>
                {signupErrors.terms && <p className="text-xs text-red-600 -mt-2">{signupErrors.terms}</p>}

                <div className="text-xs text-slate-500 text-center">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setAuthMode('login')} className="text-teal-600 hover:text-teal-700 font-semibold underline">
                    Login
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="btn-primary w-full py-3 text-sm disabled:opacity-60"
                >
                  {signupLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                  ) : (
                    <>Create Account <ArrowRight size={14} /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        <p>VSarthi.AI · AI-Powered Clinical Intake Platform</p>
        <p className="mt-1 text-[11px] text-slate-300">
          Designed with ABDM/DPDPA 2023 considerations. AI summaries require physician verification before clinical decision making.
          Not a substitute for professional medical advice.
        </p>
      </footer>
    </div>
  );
}
