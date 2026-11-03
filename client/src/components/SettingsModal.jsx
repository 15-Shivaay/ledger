import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Settings as SettingsIcon, Trash2, Archive, Check } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, currentSettings, onSave }) {
  const { t } = useLanguage();

  const [zeroBalanceAction, setZeroBalanceAction] = useState('delete');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentSettings?.zeroBalanceAction) {
      setZeroBalanceAction(currentSettings.zeroBalanceAction);
    }
    setSavedSuccess(false);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);
    try {
      await onSave({ zeroBalanceAction });
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="settings-modal-title" className="text-base font-bold text-slate-900">
                {t('modals.settings.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('modals.settings.desc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {t('notifications.settingsUpdated')}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              {t('modals.settings.zeroBalanceAction')}
            </label>
            <p className="text-xs text-slate-500 mb-3">
              {t('modals.settings.zeroBalanceHelp')}
            </p>

            <div className="space-y-3">
              {/* Option: Delete */}
              <label
                className={`relative flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                  zeroBalanceAction === 'delete'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="zeroBalanceAction"
                  value="delete"
                  checked={zeroBalanceAction === 'delete'}
                  onChange={() => setZeroBalanceAction('delete')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="ml-3">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    {t('modals.settings.optionDelete')}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {t('modals.settings.optionDeleteDesc')}
                  </p>
                </div>
              </label>

              {/* Option: Archive */}
              <label
                className={`relative flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                  zeroBalanceAction === 'archive'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="zeroBalanceAction"
                  value="archive"
                  checked={zeroBalanceAction === 'archive'}
                  onChange={() => setZeroBalanceAction('archive')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="ml-3">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Archive className="w-4 h-4 text-blue-500" />
                    {t('modals.settings.optionArchive')}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {t('modals.settings.optionArchiveDesc')}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Currency setting */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              {t('modals.settings.currencyLabel')}
            </label>
            <input
              type="text"
              disabled
              value={t('modals.settings.currencyDefault')}
              className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono cursor-not-allowed"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {t('modals.settings.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? t('app.loading') : t('modals.settings.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

