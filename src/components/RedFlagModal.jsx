// src/components/RedFlagModal.jsx
import React from 'react';
import { AlertTriangle, Phone, Bell, ShieldAlert, Check } from 'lucide-react';

export default function RedFlagModal({ redFlag, onDismiss, onAlertStaff }) {
  if (!redFlag) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl border-4 border-red-500 shadow-2xl overflow-hidden text-slate-800">
        {/* Top Emergency Banner */}
        <div className="bg-red-600 text-white p-5 text-center relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-red-400 opacity-40"></span>
            <ShieldAlert size={36} className="relative z-10" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-wide">
            🚨 Emergency / Priority Alert
          </h3>
          <p className="text-red-100 text-sm mt-1 font-medium">
            तत्काल आपातकालीन सूचना · Immediate Medical Attention Required
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-bold text-red-800 uppercase tracking-wide">
              {redFlag.name || 'Critical Symptom Pattern Detected'}
            </p>
            <p className="text-base text-red-900 font-semibold mt-1">
              {redFlag.message?.[window.currentLanguage || 'en'] || redFlag.message?.en || redFlag.message}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-700 text-sm">Required Immediate Actions:</p>
            <p>• Show this screen immediately to the OPD triage nurse or reception desk.</p>
            <p>• Do not leave the hospital waiting area unassisted.</p>
            <p className="text-red-600 font-semibold">• Triage staff have been flagged on the central priority dashboard.</p>
          </div>

          {/* Emergency Helpline Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 bg-red-100 border border-red-300 rounded-2xl p-3 text-red-800 font-bold hover:bg-red-200 transition-colors"
            >
              <Phone size={18} />
              <div>
                <p className="text-lg leading-none">112</p>
                <p className="text-[10px] font-normal text-red-600">National Emergency</p>
              </div>
            </a>
            <a
              href="tel:108"
              className="flex items-center justify-center gap-2 bg-orange-100 border border-orange-300 rounded-2xl p-3 text-orange-800 font-bold hover:bg-orange-200 transition-colors"
            >
              <Phone size={18} />
              <div>
                <p className="text-lg leading-none">108</p>
                <p className="text-[10px] font-normal text-orange-600">Ambulance (EMRI)</p>
              </div>
            </a>
          </div>

          <div className="text-[11px] text-slate-400 text-center italic">
            Notice: VSarthi.AI is an intake prioritization engine, not an autonomous diagnostic device. Physician review required immediately.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                onAlertStaff?.();
                onDismiss?.();
              }}
              className="btn-primary w-full bg-red-600 hover:bg-red-700 border-red-600 shadow-red-200 text-sm py-3.5"
            >
              <Bell size={16} /> I have informed hospital staff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
