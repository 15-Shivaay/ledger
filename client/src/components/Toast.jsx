import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div
        className={`rounded-2xl p-4 shadow-xl border flex items-start gap-3 ${
          isError
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : isWarning
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
        role="alert"
      >
        <div className="shrink-0 mt-0.5">
          {isError ? (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          ) : isWarning ? (
            <Info className="w-5 h-5 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          )}
        </div>
        <div className="flex-1 text-xs">
          {toast.title && <p className="font-bold mb-0.5">{toast.title}</p>}
          <p className="font-medium leading-relaxed">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

