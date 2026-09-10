// src/components/Toast.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast = {
      id,
      type: toast.type || 'info', // 'info' | 'success' | 'warning' | 'error'
      title: toast.title,
      message: toast.message,
      duration: toast.duration || 4500,
      action: toast.action,
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 transition-all duration-200 transform translate-y-0',
              toast.type === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-900',
              toast.type === 'warning' && 'bg-amber-50 border-amber-200 text-amber-900',
              toast.type === 'error' && 'bg-red-50 border-red-200 text-red-900',
              toast.type === 'info' && 'bg-teal-50 border-teal-200 text-teal-900'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600" />}
              {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-600" />}
              {toast.type === 'error' && <AlertCircle size={18} className="text-red-600" />}
              {toast.type === 'info' && <Info size={18} className="text-teal-600" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <p className="text-xs font-bold uppercase tracking-wider">{toast.title}</p>}
              <p className="text-xs font-medium mt-0.5 leading-relaxed">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action.onClick?.();
                    removeToast(toast.id);
                  }}
                  className="mt-2 text-xs font-bold underline hover:opacity-80"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: (t) => console.log('Toast:', t),
      removeToast: () => {},
    };
  }
  return ctx;
}
