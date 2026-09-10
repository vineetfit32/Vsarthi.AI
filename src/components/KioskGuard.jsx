// src/components/KioskGuard.jsx
// Inactivity monitor and privacy safeguard for hospital reception kiosks
import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, RefreshCw, X } from 'lucide-react';

export default function KioskGuard({ isKiosk, onReset, timeoutSeconds = 60 }) {
  const [remaining, setRemaining] = useState(timeoutSeconds);
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef(null);
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    if (!isKiosk) return;

    const resetTimer = () => {
      lastActiveRef.current = Date.now();
      setRemaining(timeoutSeconds);
      setShowWarning(false);
    };

    // User activity listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));

    // Tick every second
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActiveRef.current) / 1000);
      const left = Math.max(0, timeoutSeconds - elapsed);
      setRemaining(left);

      // Show countdown warning during the final 15 seconds
      if (left <= 15 && left > 0) {
        setShowWarning(true);
      } else if (left === 0) {
        clearInterval(timerRef.current);
        onReset?.();
      }
    }, 1000);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isKiosk, timeoutSeconds, onReset]);

  if (!isKiosk || !showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border-2 border-amber-400">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
          <ShieldAlert size={32} />
        </div>
        <h3 className="font-bold text-lg text-slate-800">Are you still there?</h3>
        <p className="text-slate-500 text-sm mt-1">
          To protect patient privacy, this kiosk will reset to the welcome screen in:
        </p>

        <div className="my-4 text-4xl font-black text-amber-600">
          {remaining}s
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              lastActiveRef.current = Date.now();
              setShowWarning(false);
              setRemaining(timeoutSeconds);
            }}
            className="btn-primary w-full py-3 text-sm"
          >
            I'm Still Here — Continue
          </button>
          <button
            onClick={onReset}
            className="btn-ghost w-full py-2 text-xs text-slate-400 hover:text-slate-600"
          >
            Reset Now & Clear Screen
          </button>
        </div>
      </div>
    </div>
  );
}
