import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrencyMinor, getTodayInputValue } from '../utils/formatters';
import { X, Scale, ArrowDown, ArrowUp, AlertTriangle, AlertCircle, RefreshCw, Check } from 'lucide-react';

export default function CorrectAmountModal({
  isOpen,
  onClose,
  onSubmit,
  customer,
  zeroBalanceAction = 'delete'
}) {
  const { language, t } = useLanguage();

  const [newAmount, setNewAmount] = useState('');
  const [date, setDate] = useState(getTodayInputValue());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      const currentMajor = (customer.currentBalanceMinor || 0) / 100;
      setNewAmount(currentMajor > 0 ? currentMajor.toString() : '');
      setDate(getTodayInputValue());
      setNotes('');
      setError('');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const currentBalanceMinor = customer.currentBalanceMinor || 0;
  const currentBalanceFormatted = formatCurrencyMinor(currentBalanceMinor, language);

  const parsedAmount = parseFloat(newAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 0;
  const targetMinor = isValidAmount ? Math.round(parsedAmount * 100) : currentBalanceMinor;
  const diffMinor = isValidAmount ? targetMinor - currentBalanceMinor : 0;
  const absDiffFormatted = formatCurrencyMinor(Math.abs(diffMinor), language);
  const targetFormatted = formatCurrencyMinor(targetMinor, language);

  const willReachZero = isValidAmount && targetMinor === 0 && currentBalanceMinor > 0;

  const handleSetZero = () => {
    setNewAmount('0');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidAmount) {
      setError(language === 'hi' ? 'कृपया एक मान्य राशि (० या अधिक) दर्ज करें।' : 'Please enter a valid amount (0 or greater).');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        phone: customer.phoneNormalized,
        newAmount: parsedAmount,
        newAmountMinor: targetMinor,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      const errMsg =
        err.data?.messageEn ||
        err.data?.error ||
        err.message ||
        t('notifications.error');
      setError(errMsg);
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
        aria-labelledby="correct-amount-title"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-indigo-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 id="correct-amount-title" className="text-base font-bold text-slate-900 leading-tight">
                {t('modals.correctBalance.title')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('modals.correctBalance.desc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Summary & Current Balance */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t('modals.correctBalance.customer')}
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{customer.name}</p>
              <p className="text-xs font-mono text-slate-500">{customer.phoneDisplay || customer.phoneNormalized}</p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t('modals.correctBalance.currentBalance')}
              </span>
              <p className="text-base font-bold font-mono text-slate-800 mt-0.5">
                {currentBalanceFormatted}
              </p>
            </div>
          </div>

          {/* New Due Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="new-amount-input" className="block text-xs font-bold text-slate-700">
                {t('modals.correctBalance.newBalanceLabel')} <span className="text-rose-500">*</span>
              </label>
              {currentBalanceMinor > 0 && (
                <button
                  type="button"
                  onClick={handleSetZero}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  {language === 'hi' ? 'पूरा हिसाब चुकता (₹0.00)' : 'Clear All Dues (₹0.00)'}
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm pointer-events-none">
                ₹
              </span>
              <input
                id="new-amount-input"
                type="number"
                step="0.01"
                min="0"
                value={newAmount}
                onChange={(e) => {
                  setNewAmount(e.target.value);
                  setError('');
                }}
                placeholder={t('modals.correctBalance.newBalancePlaceholder')}
                className="w-full pl-8 pr-3.5 py-2.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Live Difference / Adjustment Preview */}
          {isValidAmount && (
            <div className="p-3 rounded-xl border text-xs transition-all">
              {diffMinor < 0 ? (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50/80 border-emerald-200 p-2.5 rounded-lg border">
                  <ArrowDown className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">
                      {t('modals.correctBalance.reductionBadge', { amount: absDiffFormatted })}
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      {language === 'hi'
                        ? `बकाया राशि ${currentBalanceFormatted} से घटकर ${targetFormatted} हो जाएगी।`
                        : `Balance will decrease from ${currentBalanceFormatted} to ${targetFormatted}.`}
                    </p>
                  </div>
                </div>
              ) : diffMinor > 0 ? (
                <div className="flex items-center gap-2 text-amber-800 bg-amber-50/80 border-amber-200 p-2.5 rounded-lg border">
                  <ArrowUp className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">
                      {t('modals.correctBalance.increaseBadge', { amount: absDiffFormatted })}
                    </span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {language === 'hi'
                        ? `बकाया राशि ${currentBalanceFormatted} से बढ़कर ${targetFormatted} हो जाएगी।`
                        : `Balance will increase from ${currentBalanceFormatted} to ${targetFormatted}.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600 bg-slate-100 p-2.5 rounded-lg">
                  <Check className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-medium">{t('modals.correctBalance.noChangeBadge')}</span>
                </div>
              )}
            </div>
          )}

          {/* Zero Balance Alert Notice */}
          {willReachZero && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {zeroBalanceAction === 'archive'
                  ? t('modals.correctBalance.zeroBalanceAlertArchive')
                  : t('modals.correctBalance.zeroBalanceAlertDelete')}
              </span>
            </div>
          )}

          {/* Reason / Notes */}
          <div>
            <label htmlFor="reason-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('modals.correctBalance.reasonLabel')}
            </label>
            <input
              id="reason-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('modals.correctBalance.reasonPlaceholder')}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              maxLength={200}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              {t('modals.correctBalance.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !isValidAmount || diffMinor === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('modals.correctBalance.saving')}</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5" />
                  <span>{t('modals.correctBalance.submit')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

