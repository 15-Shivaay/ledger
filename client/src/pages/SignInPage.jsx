import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SignIn } from '@clerk/clerk-react';
import { ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';

export default function SignInPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background radial gradient accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language switcher */}
      <div className="absolute top-6 right-6 flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-md z-10">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            language === 'en'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguage('hi')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            language === 'hi'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          हिन्दी
        </button>
      </div>

      <div className="max-w-md w-full space-y-6 text-center z-10 mb-2">
        {/* Logo and Brand */}
        <Logo className="w-16 h-16 shadow-xl shadow-emerald-950/40 rounded-2xl mx-auto" />

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('app.adminBadge')}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t('auth.signInTitle')}
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {t('auth.signInDesc')}
          </p>
        </div>

        {/* Clerk Official SignIn Component */}
        <div className="flex justify-center">
          <SignIn
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-white shadow-2xl rounded-2xl border border-slate-200',
                headerTitle: 'text-slate-900 font-bold',
                headerSubtitle: 'text-slate-500 text-xs',
                formButtonPrimary:
                  'bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-sm',
                footerActionLink: 'text-emerald-600 hover:text-emerald-700 font-semibold'
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

