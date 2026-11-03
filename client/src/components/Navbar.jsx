import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { UserButton } from '@clerk/clerk-react';
import { BookOpen, Globe, Settings as SettingsIcon, ShieldCheck, Database, PhoneCall, LayoutDashboard } from 'lucide-react';

export default function Navbar({ onOpenSettings, onOpenBackup, currentView = 'ledger', onToggleView }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {t('app.title')}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('app.adminBadge')}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t('app.subtitle')}
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs: Ledger vs Call List */}
          {onToggleView && (
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200" role="tablist">
              <button
                type="button"
                onClick={() => onToggleView('ledger')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  currentView === 'ledger'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                role="tab"
                aria-selected={currentView === 'ledger'}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                {t('app.backToLedger')}
              </button>
              <button
                type="button"
                onClick={() => onToggleView('calls')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  currentView === 'calls'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                role="tab"
                aria-selected={currentView === 'calls'}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                {t('app.callList')}
              </button>
            </div>
          )}

          {/* Right Controls: Language Switcher, Settings, Clerk UserButton */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile View Toggle */}
            {onToggleView && (
              <button
                type="button"
                onClick={() => onToggleView(currentView === 'ledger' ? 'calls' : 'ledger')}
                className="sm:hidden p-2 text-slate-700 bg-slate-100 rounded-lg"
                title={currentView === 'ledger' ? t('app.callList') : t('app.backToLedger')}
              >
                {currentView === 'ledger' ? (
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                ) : (
                  <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                )}
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200" role="group" aria-label={t('app.language')}>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={language === 'en'}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  language === 'hi'
                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={language === 'hi'}
              >
                हिन्दी
              </button>
            </div>

            {/* Backup (PDF) Button */}
            {onOpenBackup && (
              <button
                type="button"
                onClick={onOpenBackup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors border border-slate-200"
                title={t('app.backup')}
                aria-label={t('app.backup')}
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">{t('app.backup')}</span>
              </button>
            )}

            {/* Settings Button */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                title={t('app.settings')}
                aria-label={t('app.settings')}
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            )}

            {/* Clerk User Button */}
            <div className="pl-2 border-l border-slate-200">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-9 h-9 ring-2 ring-emerald-500/20'
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

