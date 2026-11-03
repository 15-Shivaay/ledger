import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useClerk, useUser } from '@clerk/clerk-react';
import { ShieldAlert, LogOut, Copy, Check } from 'lucide-react';

export default function AccessDenied() {
  const { language, setLanguage, t } = useLanguage();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [copied, setCopied] = React.useState(false);

  const userId = user?.id || 'Unknown';
  const email = user?.primaryEmailAddress?.emailAddress || 'Unknown';

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      {/* Language Switcher on Access Denied page */}
      <div className="absolute top-4 right-4 flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            language === 'en'
              ? 'bg-slate-100 text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguage('hi')}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            language === 'hi'
              ? 'bg-slate-100 text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          हिन्दी
        </button>
      </div>

      <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-5 border border-rose-100 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {t('auth.accessDeniedTitle')}
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {t('auth.accessDeniedMessage')}
        </p>

        {/* User Identity Details Box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs mb-6 space-y-2">
          <div>
            <span className="text-slate-500 font-semibold block">{t('auth.email')}</span>
            <span className="text-slate-800 font-medium font-mono">{email}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block">{t('auth.userId')}</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-slate-800 font-mono select-all truncate">{userId}</span>
              <button
                type="button"
                onClick={copyUserId}
                className="text-slate-500 hover:text-slate-800 p-1 rounded transition-colors ml-2 shrink-0"
                title="Copy User ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* How to Designate Admin Instructions */}
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200 text-left text-xs mb-6">
          <p className="font-bold text-amber-900 mb-2">
            {t('auth.howToFix')}
          </p>
          <ol className="text-amber-800 space-y-1.5 list-none font-medium">
            <li>{t('auth.step1')}</li>
            <li>{t('auth.step2')}</li>
            <li>{t('auth.step3')}</li>
            <li>{t('auth.step4')}</li>
          </ol>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          {t('auth.signOut')}
        </button>
      </div>
    </div>
  );
}

