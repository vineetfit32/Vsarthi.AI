import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import { validateAbhaFormat, formatAbhaId, lookupAbha } from '../services/abdm.js';
import { ChevronRight, User, CreditCard, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import StepHeader from '../components/StepHeader.jsx';

export default function IdentityScreen() {
  const { state, actions } = useApp();
  const { language, patient } = state;
  const T = (key) => t(language, key);

  const [mode, setMode] = useState('choice'); // 'choice' | 'abha' | 'new'
  const [abhaInput, setAbhaInput] = useState('');
  const [abhaError, setAbhaError] = useState('');
  const [abhaStatus, setAbhaStatus] = useState('idle'); // 'idle'|'verifying'|'verified'|'not_found'

  // New patient form
  const [form, setForm] = useState({ name: '', dob: '', gender: '', phone: '' });
  const [formErrors, setFormErrors] = useState({});

  const handleAbhaInput = (e) => {
    const formatted = formatAbhaId(e.target.value);
    setAbhaInput(formatted);
    setAbhaError('');
    setAbhaStatus('idle');
  };

  const handleAbhaSubmit = useCallback(async () => {
    if (!validateAbhaFormat(abhaInput)) {
      setAbhaError(T('abhaError'));
      return;
    }
    setAbhaStatus('verifying');
    const result = await lookupAbha(abhaInput);
    if (result.found) {
      setAbhaStatus('verified');
      actions.setPatient({ ...result.patient, isNew: false, isVerified: true });
      setTimeout(() => actions.setStep('consent'), 700);
    } else {
      setAbhaStatus('not_found');
      actions.setPatient({ abhaId: abhaInput.replace(/\D/g, ''), isNew: true, isVerified: false });
      setTimeout(() => setMode('new'), 800);
    }
  }, [abhaInput, language]);

  const validateNewForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.dob) errors.dob = 'Date of birth is required';
    if (!form.gender) errors.gender = 'Please select a gender';
    if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) errors.phone = T('phoneError');
    setFormErrors(errors);
    return !Object.keys(errors).length;
  };

  const handleNewPatientSubmit = () => {
    if (!validateNewForm()) return;
    actions.setPatient({ ...form, isNew: true, isVerified: false });
    actions.setStep('consent');
  };

  // ─── Choice screen ─────────────────────────────────────────────────────────
  if (mode === 'choice') {
    return (
      <div className="min-h-screen flex flex-col">
        <StepHeader currentStep="identity" language={language} />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">{T('abhaTitle')}</h2>
            <p className="text-slate-500 mb-8">Choose how to identify yourself</p>

            <button
              onClick={() => setMode('abha')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-primary-400 hover:bg-primary-50 transition-all mb-4 shadow-sm"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="text-primary-600" size={22} />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-slate-800 text-lg">ABHA ID / आभा आईडी</p>
                <p className="text-slate-500 text-sm">14-digit health account number</p>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-slate-50 text-slate-400 text-sm">{T('abhaOr')}</span>
              </div>
            </div>

            <button
              onClick={() => setMode('new')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all shadow-sm"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="text-emerald-600" size={22} />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-slate-800 text-lg">{T('abhaNew')}</p>
                <p className="text-slate-500 text-sm">Fill in your basic details</p>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ABHA entry screen ─────────────────────────────────────────────────────
  if (mode === 'abha') {
    return (
      <div className="min-h-screen flex flex-col">
        <StepHeader currentStep="identity" language={language} />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md">
            <button onClick={() => setMode('choice')} className="btn-ghost mb-6 text-slate-500">
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Enter ABHA ID</h2>
            <p className="text-slate-500 mb-8">Your 14-digit Ayushman Bharat Health Account number</p>

            <label className="block text-slate-700 font-semibold mb-2 text-base">{T('abhaLabel')}</label>
            <input
              type="text"
              inputMode="numeric"
              value={abhaInput}
              onChange={handleAbhaInput}
              placeholder={T('abhaPlaceholder')}
              maxLength={19}
              className={`input-field text-2xl font-mono tracking-widest mb-2 ${abhaError ? 'input-error' : ''}`}
              disabled={abhaStatus === 'verifying' || abhaStatus === 'verified'}
            />
            {abhaError && <p className="text-red-600 text-sm mb-3 flex items-center gap-1"><AlertCircle size={14} />{abhaError}</p>}

            {/* Status feedback */}
            {abhaStatus === 'verifying' && (
              <div className="flex items-center gap-2 text-primary-600 text-sm mb-4">
                <Loader2 size={16} className="animate-spin" /> {T('abhaVerifying')}
              </div>
            )}
            {abhaStatus === 'verified' && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm mb-4">
                <CheckCircle size={16} /> {T('abhaVerified')} — {patient.name}
              </div>
            )}
            {abhaStatus === 'not_found' && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-4">
                <AlertCircle size={16} /> {T('abhaNotFound')}
              </div>
            )}

            <button
              onClick={handleAbhaSubmit}
              disabled={abhaStatus === 'verifying' || abhaStatus === 'verified'}
              className="btn-primary w-full mt-2"
            >
              {abhaStatus === 'verifying' ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
              {T('continue')}
            </button>

            <p className="text-center text-slate-400 text-sm mt-4">
              Try: <span className="font-mono">12-3456-7890-1234</span> (demo)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── New patient registration ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <StepHeader currentStep="identity" language={language} />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => setMode('choice')} className="btn-ghost mb-6 text-slate-500">
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">{T('newPatientTitle')}</h2>
          <p className="text-slate-500 mb-6">Please fill in your basic details</p>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">{T('nameLabel')}</label>
              <input
                type="text"
                placeholder={T('namePlaceholder')}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={`input-field ${formErrors.name ? 'input-error' : ''}`}
              />
              {formErrors.name && <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>}
            </div>

            {/* DOB */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">{T('dobLabel')}</label>
              <input
                type="date"
                value={form.dob}
                onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className={`input-field ${formErrors.dob ? 'input-error' : ''}`}
              />
              {formErrors.dob && <p className="text-red-600 text-sm mt-1">{formErrors.dob}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">{T('genderLabel')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['male', 'female', 'other'].map(g => (
                  <button
                    key={g}
                    onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`py-3 px-2 rounded-xl border-2 font-medium text-base transition-all
                      ${form.gender === g
                        ? 'border-primary-500 bg-primary-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300'
                      }`}
                  >
                    {g === 'male' ? T('male') : g === 'female' ? T('female') : T('other')}
                  </button>
                ))}
              </div>
              {formErrors.gender && <p className="text-red-600 text-sm mt-1">{formErrors.gender}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">{T('phoneLabel')}</label>
              <div className="flex gap-2">
                <span className="input-field w-16 text-center bg-slate-100 text-slate-500 font-semibold flex-shrink-0">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder={T('phonePlaceholder')}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className={`input-field flex-1 ${formErrors.phone ? 'input-error' : ''}`}
                />
              </div>
              {formErrors.phone && <p className="text-red-600 text-sm mt-1">{formErrors.phone}</p>}
            </div>
          </div>

          <button onClick={handleNewPatientSubmit} className="btn-primary w-full mt-6">
            <ChevronRight size={18} /> {T('continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
