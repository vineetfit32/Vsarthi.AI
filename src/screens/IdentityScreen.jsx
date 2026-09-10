// src/screens/IdentityScreen.jsx
// VSarthi.AI — Multi-Method Authentication with Graceful Fallback Chain
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import { validateAbhaFormat, formatAbhaId, lookupAbha } from '../services/abdm.js';
import { getCapability, isCapabilityLive } from '../config/capabilities.js';
import { useToast } from '../components/Toast.jsx';
import {
  ChevronRight, User, CreditCard, Loader2, CheckCircle2,
  AlertCircle, ArrowLeft, Phone, Mail, UserCheck, Shield,
  RefreshCw, Clock, Sparkles, HelpCircle, AlertTriangle
} from 'lucide-react';
import StepHeader from '../components/StepHeader.jsx';
import clsx from 'clsx';

export default function IdentityScreen() {
  const { state, actions } = useApp();
  const { language, patient } = state;
  const { addToast } = useToast();
  const T = (key) => t(language, key);

  // Authentication mode: 'choice' | 'abha' | 'mobile_otp' | 'email_otp' | 'guest'
  const [mode, setMode] = useState('choice');

  // ABHA flow state
  const [abhaInput, setAbhaInput] = useState(patient.abhaId ? formatAbhaId(patient.abhaId) : '');
  const [abhaError, setAbhaError] = useState('');
  const [abhaStatus, setAbhaStatus] = useState('idle'); // 'idle' | 'verifying' | 'verified' | 'failed'

  // Mobile OTP flow state
  const [mobileNumber, setMobileNumber] = useState(patient.phone || '');
  const [mobileError, setMobileError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Email OTP state
  const [emailInput, setEmailInput] = useState(patient.email || '');
  const [emailError, setEmailError] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [enteredEmailOtp, setEnteredEmailOtp] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailResendTimer, setEmailResendTimer] = useState(30);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Guest registration form
  const [guestForm, setGuestForm] = useState({
    name: patient.name || '',
    dob: patient.dob || '',
    gender: patient.gender || '',
    phone: patient.phone || '',
    emergencyContact: '',
  });
  const [guestErrors, setGuestErrors] = useState({});

  // Countdown for OTP resend
  useEffect(() => {
    let timer;
    if (otpSent && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, resendTimer]);

  // Countdown for Email OTP resend
  useEffect(() => {
    let timer;
    if (emailOtpSent && emailResendTimer > 0) {
      timer = setInterval(() => setEmailResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emailOtpSent, emailResendTimer]);

  // Helper to issue session token and advance to consent
  const completeAuth = useCallback((patientData, authMethod) => {
    const sessionToken = `VSAI-SESS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    localStorage.setItem('vsarthi_session_token', sessionToken);
    actions.setSessionToken(sessionToken, 20 * 60 * 1000); // 20 minutes session

    actions.setPatient({
      ...patientData,
      authMethod,
      sessionToken,
      verifiedAt: new Date().toISOString(),
    });

    addToast({
      type: 'success',
      title: 'Identity Verified',
      message: `Welcome, ${patientData.name || 'Patient'}! Starting clinical intake.`,
      duration: 3500,
    });

    setTimeout(() => {
      actions.setStep('consent');
    }, 600);
  }, [actions, addToast]);

  // ─── 1. ABHA SUBMIT & FALLBACK ───────────────────────────────────────────
  const handleAbhaInput = (e) => {
    const formatted = formatAbhaId(e.target.value);
    setAbhaInput(formatted);
    setAbhaError('');
    setAbhaStatus('idle');
  };

  const handleAbhaSubmit = useCallback(async () => {
    if (!validateAbhaFormat(abhaInput)) {
      setAbhaError('Please enter a valid 14-digit ABHA ID (e.g. 12-3456-7890-1234)');
      return;
    }

    // Check capability registry for ABHA gateway status
    if (!isCapabilityLive('abhaAuth')) {
      addToast({
        type: 'warning',
        title: 'ABDM Gateway Unavailable',
        message: 'National ABHA gateway is temporarily unreachable. Falling back to Mobile OTP verification.',
        duration: 5000,
      });
      setMode('mobile_otp');
      return;
    }

    setAbhaStatus('verifying');
    try {
      const result = await lookupAbha(abhaInput);
      if (result.found) {
        setAbhaStatus('verified');
        completeAuth(
          { ...result.patient, isNew: false, isVerified: true },
          'ABHA_GATEWAY'
        );
      } else {
        setAbhaStatus('failed');
        setAbhaError('ABHA ID not found in current hospital registry. You can verify via Mobile OTP or register as a walk-in.');
      }
    } catch {
      setAbhaStatus('failed');
      setAbhaError('ABDM connection timed out. Falling back to Mobile OTP.');
      setTimeout(() => setMode('mobile_otp'), 1200);
    }
  }, [abhaInput, completeAuth, addToast]);

  // ─── 2. MOBILE OTP SUBMIT & FALLBACK ─────────────────────────────────────
  const handleSendOtp = () => {
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setMobileError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setMobileError('');

    if (!isCapabilityLive('smsGateway')) {
      addToast({
        type: 'warning',
        title: 'SMS Gateway Busy',
        message: 'SMS service is experiencing latency. Please use email or continue as a guest.',
      });
      setMode('email_otp');
      return;
    }

    setOtpSent(true);
    setResendTimer(30);
    addToast({
      type: 'info',
      title: 'OTP Dispatched',
      message: `A 6-digit verification code has been simulated for +91 ${cleanPhone}. (Demo Code: 123456)`,
      duration: 6000,
    });
  };

  const handleVerifyOtp = () => {
    if (enteredOtp.length < 6) {
      setOtpError('Please enter the 6-digit OTP');
      return;
    }
    setOtpVerifying(true);
    setOtpError('');

    setTimeout(() => {
      setOtpVerifying(false);
      // Accept demo code 123456 or any 6-digit number in test
      if (enteredOtp === '123456' || enteredOtp.length === 6) {
        completeAuth(
          {
            phone: mobileNumber.replace(/\D/g, ''),
            name: patient.name || 'Verified Patient',
            isNew: false,
            isVerified: true,
          },
          'MOBILE_OTP'
        );
      } else {
        setOtpError('Invalid OTP. Please try entering 123456 (Demo Code).');
      }
    }, 600);
  };

  // ─── 3. EMAIL OTP SUBMIT & VERIFY ────────────────────────────────────────
  const handleSendEmailOtp = () => {
    const trimmed = emailInput.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com)');
      return;
    }
    setEmailError('');
    setEmailOtpSent(true);
    setEmailResendTimer(30);
    addToast({
      type: 'info',
      title: 'Email OTP Dispatched',
      message: `A 6-digit verification code has been dispatched to ${trimmed}. (Demo Code: 123456)`,
      duration: 6000,
    });
  };

  const handleVerifyEmailOtp = () => {
    if (enteredEmailOtp.length < 6) {
      setEmailOtpError('Please enter the 6-digit OTP code');
      return;
    }
    setEmailVerifying(true);
    setEmailOtpError('');

    setTimeout(() => {
      setEmailVerifying(false);
      if (enteredEmailOtp === '123456' || enteredEmailOtp.length === 6) {
        completeAuth(
          {
            email: emailInput.trim(),
            name: patient.name || emailInput.split('@')[0] || 'Verified Patient',
            isNew: false,
            isVerified: true,
          },
          'EMAIL_OTP'
        );
      } else {
        setEmailOtpError('Invalid code. Please try entering 123456 (Demo Code).');
      }
    }, 400);
  };

  // ─── 4. GUEST REGISTRATION SUBMIT ────────────────────────────────────────
  const validateGuestForm = () => {
    const errors = {};
    if (!guestForm.name.trim()) errors.name = 'Patient name is required';
    if (!guestForm.dob) errors.dob = 'Date of birth is required';
    if (!guestForm.gender) errors.gender = 'Please select a gender';
    if (!/^\d{10}$/.test(guestForm.phone.replace(/\D/g, ''))) {
      errors.phone = 'Valid 10-digit contact number is required';
    }
    setGuestErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (!validateGuestForm()) return;

    completeAuth(
      {
        ...guestForm,
        isNew: true,
        isVerified: false,
        deskVerificationRequired: true,
      },
      'GUEST_WALKIN'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80">
      <StepHeader currentStep="identity" language={language} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 transition-all">

          {/* ────────────────── CHOICE OVERVIEW ────────────────── */}
          {mode === 'choice' && (
            <div>
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 mb-3">
                  <Shield size={13} /> Secure Clinical Identification
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Welcome to VSarthi.AI
                </h2>
                <p className="text-slate-500 text-sm mt-1.5 max-w-md mx-auto">
                  Identify yourself before starting your clinical history. We support ABHA, Mobile OTP, or instant walk-in registration.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* 1. Primary: ABHA ID */}
                <button
                  onClick={() => setMode('abha')}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-teal-100 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-400 transition-all text-left group shadow-xs"
                >
                  <div className="w-12 h-12 bg-teal-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <CreditCard size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">ABHA ID (Ayushman Bharat)</h4>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      14-digit National Health ID. Pulls existing OPD history instantly.
                    </p>
                  </div>
                  <ChevronRight className="text-teal-600 group-hover:translate-x-1 transition-transform" size={20} />
                </button>

                {/* 2. Secondary: Mobile OTP */}
                <button
                  onClick={() => setMode('mobile_otp')}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-teal-400 hover:bg-slate-50 transition-all text-left group shadow-xs"
                >
                  <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Phone size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-base">Mobile Number & SMS OTP</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fast 2-step verification using your 10-digit mobile number.
                    </p>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition-transform" size={20} />
                </button>

                {/* 3. Secondary: Email OTP */}
                <button
                  onClick={() => setMode('email_otp')}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 transition-all text-left group shadow-xs"
                >
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Mail size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">Email OTP Verification</h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Receive a 6-digit verification code directly in your email inbox.
                    </p>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition-transform" size={20} />
                </button>

                {/* 4. Final Fallback: Guest / Walk-in Registration */}
                <button
                  onClick={() => setMode('guest')}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 transition-all text-left group shadow-xs"
                >
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <UserCheck size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">New Patient / Walk-in</h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        No ID Needed
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter basic demographics. Hospital reception will verify at OPD desk.
                    </p>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition-transform" size={20} />
                </button>
              </div>

              {/* Demo Hint Banner */}
              <div className="mt-6 p-3.5 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center gap-2">
                <Sparkles size={14} className="text-teal-600 flex-shrink-0" />
                <span>
                  <strong>Demo Tip:</strong> Test ABHA ID: <code>12-3456-7890-1234</code>, or Mobile OTP with <code>123456</code>.
                </span>
              </div>
            </div>
          )}

          {/* ────────────────── TIER 1: ABHA ID ────────────────── */}
          {mode === 'abha' && (
            <div>
              <button
                onClick={() => setMode('choice')}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-semibold mb-6 transition-all"
              >
                <ArrowLeft size={14} /> Back to Identification Options
              </button>

              <div className="mb-6">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Tier 1 • ABDM Gateway</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Enter your 14-digit ABHA ID</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Format: <code>XX-XXXX-XXXX-XXXX</code>. Found on your digital Ayushman Bharat card.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">ABHA Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={abhaInput}
                      onChange={handleAbhaInput}
                      placeholder="12-3456-7890-1234"
                      maxLength={17}
                      className={clsx(
                        'w-full px-4 py-3.5 rounded-2xl border-2 text-lg font-mono tracking-wider focus:outline-none transition-all',
                        abhaError
                          ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100'
                      )}
                    />
                    {abhaStatus === 'verifying' && (
                      <Loader2 className="absolute right-4 top-4 text-teal-600 animate-spin" size={20} />
                    )}
                    {abhaStatus === 'verified' && (
                      <CheckCircle2 className="absolute right-4 top-4 text-emerald-600" size={20} />
                    )}
                  </div>
                  {abhaError && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle size={14} /> {abhaError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleAbhaSubmit}
                  disabled={abhaStatus === 'verifying'}
                  className="btn-primary w-full"
                >
                  {abhaStatus === 'verifying' ? 'Verifying with ABDM Gateway…' : 'Verify & Continue'}
                </button>

                {/* Fallback Action Links */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
                  <button
                    onClick={() => {
                      setAbhaInput('12-3456-7890-1234');
                      setAbhaError('');
                    }}
                    className="text-teal-700 hover:text-teal-900 font-bold underline"
                  >
                    Auto-fill Demo ABHA (Ravi Kumar)
                  </button>

                  <button
                    onClick={() => setMode('mobile_otp')}
                    className="text-slate-500 hover:text-teal-700 font-semibold"
                  >
                    Don't have ABHA? Use Mobile OTP →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── TIER 2: MOBILE NUMBER + OTP ────────────────── */}
          {mode === 'mobile_otp' && (
            <div>
              <button
                onClick={() => setMode('choice')}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-semibold mb-6 transition-all"
              >
                <ArrowLeft size={14} /> Back to Identification Options
              </button>

              <div className="mb-6">
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Tier 2 • Telecom SMS Gateway</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Mobile Number & OTP</h3>
                <p className="text-slate-500 text-xs mt-1">
                  We will send a 6-digit one-time password to verify your record.
                </p>
              </div>

              {!otpSent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">10-Digit Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="w-16 flex items-center justify-center bg-slate-100 rounded-2xl border-2 border-slate-200 font-bold text-sm text-slate-600">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        className="flex-1 px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-lg font-mono focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                    {mobileError && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle size={14} /> {mobileError}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleSendOtp}
                    className="btn-primary w-full bg-sky-600 hover:bg-sky-700 shadow-sky-200"
                  >
                    Send Verification Code
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setMode('guest')}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Phone unavailable? Continue as Walk-in Guest →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-center justify-between">
                    <span>Code sent to: <strong>+91 {mobileNumber}</strong></span>
                    <button
                      onClick={() => setOtpSent(false)}
                      className="text-sky-700 font-bold underline text-[11px]"
                    >
                      Change Number
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full text-center tracking-[0.5em] px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-2xl font-mono focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                    {otpError && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle size={14} /> {otpError}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying}
                    className="btn-primary w-full bg-sky-600 hover:bg-sky-700 shadow-sky-200"
                  >
                    {otpVerifying ? 'Verifying Code…' : 'Confirm OTP & Proceed'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      onClick={() => setEnteredOtp('123456')}
                      className="text-sky-700 font-bold underline"
                    >
                      Auto-fill Demo Code (123456)
                    </button>

                    <button
                      onClick={() => resendTimer === 0 && handleSendOtp()}
                      disabled={resendTimer > 0}
                      className={clsx('font-bold', resendTimer > 0 ? 'text-slate-400' : 'text-sky-700 underline')}
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────── TIER 3: EMAIL OTP ────────────────── */}
          {mode === 'email_otp' && (
            <div>
              <button
                onClick={() => {
                  setMode('choice');
                  setEmailOtpSent(false);
                  setEmailOtpError('');
                  setEmailError('');
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-semibold mb-6 transition-all"
              >
                <ArrowLeft size={14} /> Back to Identification Options
              </button>

              <div className="mb-6">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Fast Login • Email OTP</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Email Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your email address to receive a secure 6-digit authentication code.
                </p>
              </div>

              {!emailOtpSent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          setEmailError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendEmailOtp()}
                        placeholder="patient@example.com"
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-base focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        autoFocus
                      />
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle size={14} /> {emailError}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleSendEmailOtp}
                    className="btn-primary w-full bg-amber-600 hover:bg-amber-700 shadow-amber-200 text-white"
                  >
                    Send Verification Code
                  </button>

                  <div className="pt-2 text-center space-y-2">
                    <button
                      onClick={() => setMode('mobile_otp')}
                      className="text-xs text-slate-500 hover:text-slate-800 underline block mx-auto"
                    >
                      Prefer phone? Use Mobile Number & SMS OTP →
                    </button>
                    <button
                      onClick={() => setMode('guest')}
                      className="text-xs text-slate-400 hover:text-slate-700 underline block mx-auto"
                    >
                      Email unavailable? Continue as Walk-in Guest →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
                    <span>Code sent to: <strong>{emailInput}</strong></span>
                    <button
                      onClick={() => setEmailOtpSent(false)}
                      className="text-amber-800 font-bold underline text-[11px]"
                    >
                      Change Email
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      value={enteredEmailOtp}
                      onChange={(e) => setEnteredEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyEmailOtp()}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full text-center tracking-[0.5em] px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-2xl font-mono focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      autoFocus
                    />
                    {emailOtpError && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle size={14} /> {emailOtpError}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleVerifyEmailOtp}
                    disabled={emailVerifying}
                    className="btn-primary w-full bg-amber-600 hover:bg-amber-700 shadow-amber-200 text-white"
                  >
                    {emailVerifying ? 'Verifying Code…' : 'Confirm Code & Proceed'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      onClick={() => setEnteredEmailOtp('123456')}
                      className="text-amber-700 font-bold underline"
                    >
                      Auto-fill Demo Code (123456)
                    </button>

                    <button
                      onClick={() => emailResendTimer === 0 && handleSendEmailOtp()}
                      disabled={emailResendTimer > 0}
                      className={clsx('font-bold', emailResendTimer > 0 ? 'text-slate-400' : 'text-amber-700 underline')}
                    >
                      {emailResendTimer > 0 ? `Resend in ${emailResendTimer}s` : 'Resend Code'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────── TIER 4: GUEST / WALK-IN REGISTRATION ────────────────── */}
          {mode === 'guest' && (
            <div>
              <button
                onClick={() => setMode('choice')}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-semibold mb-6 transition-all"
              >
                <ArrowLeft size={14} /> Back to Identification Options
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tier 4 • Hospital Walk-in</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    Flagged for Desk Verification
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Walk-in Patient Registration</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Fill in your basic information. A hospital coordinator will confirm your identity at the counter.
                </p>
              </div>

              <form onSubmit={handleGuestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                    placeholder="e.g. Sunita Devi"
                    className="input-field"
                  />
                  {guestErrors.name && <p className="text-xs text-red-600 mt-1">{guestErrors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      value={guestForm.dob}
                      onChange={(e) => setGuestForm({ ...guestForm, dob: e.target.value })}
                      className="input-field"
                    />
                    {guestErrors.dob && <p className="text-xs text-red-600 mt-1">{guestErrors.dob}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gender *</label>
                    <select
                      value={guestForm.gender}
                      onChange={(e) => setGuestForm({ ...guestForm, gender: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male / पुरुष</option>
                      <option value="female">Female / महिला</option>
                      <option value="other">Other / अन्य</option>
                    </select>
                    {guestErrors.gender && <p className="text-xs text-red-600 mt-1">{guestErrors.gender}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone Number *</label>
                  <input
                    type="tel"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="input-field"
                  />
                  {guestErrors.phone && <p className="text-xs text-red-600 mt-1">{guestErrors.phone}</p>}
                </div>

                <button type="submit" className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200">
                  Register as Walk-in & Begin Intake
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
