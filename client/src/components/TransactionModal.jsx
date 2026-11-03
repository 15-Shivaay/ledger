import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrencyMinor, getTodayInputValue } from '../utils/formatters';
import { X, PlusCircle, MinusCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  customer,
  type = 'credit', // 'credit' | 'debit'
  zeroBalanceAction = 'delete'
}) {
  const { language, t } = useLanguage();
  const isCredit = type === 'credit';

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayInputValue());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAmount('');
    setDate(getTodayInputValue());
    setNotes('');
    setError('');
  }, [customer, type, isOpen]);

  if (!isOpen || !customer) return null;

  const currentBalanceMinor = customer.currentBalanceMinor || 0;
  const currentBalanceMajor = currentBalanceMinor / 100;
  const currentBalanceFormatted = formatCurrencyMinor(currentBalanceMinor, language);

  const parsedAmount = parseFloat(amount) || 0;
  const amountMinor = Math.round(parsedAmount * 100);

  // New balance preview
  let newBalanceMinor = currentBalanceMinor;
  if (isCredit) {
    newBalanceMinor = currentBalanceMinor + amountMinor;
  } else {
    newBalanceMinor = Math.max(0, currentBalanceMinor - amountMinor);
  }
  const newBalanceFormatted = formatCurrencyMinor(newBalanceMinor, language);

  // Excessive debit check
  const exceedsBalance = !isCredit && amountMinor > currentBalanceMinor;

  // Exact zero balance check
  const willReachZero = !isCredit && parsedAmount > 0 && amountMinor === currentBalanceMinor;

  const handlePayFull = () => {
    setAmount(currentBalanceMajor.toFixed(2));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (parsedAmount <= 0) {
      setError(t('validation.amountPositive'));
      return;
    }

    if (exceedsBalance) {
      setError(t('validation.debitExceedsBalance', { balance: currentBalanceFormatted }));
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        amountMinor,
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
        aria-labelledby="transaction-modal-title"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 ${
          isCredit ? 'bg-amber-50/50' : 'bg-emerald-50/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isCredit ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isCredit ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="transaction-modal-title" className="text-base font-bold text-slate-900">
                {isCredit ? t('modals.credit.title') : t('modals.debit.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {isCredit ? t('modals.credit.desc') : t('modals.debit.desc')}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Summary Box */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">
                {isCredit ? t('modals.credit.customer') : t('modals.debit.customer')}
              </span>
              <p className="text-sm font-bold text-slate-900">{customer.name}</p>
              <p className="text-xs text-slate-500 font-mono">{customer.phoneDisplay || customer.phoneNormalized}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">
                {isCredit ? t('modals.credit.currentBalance') : t('modals.debit.currentBalance')}
              </span>
              <p className="text-base font-bold text-slate-900 font-mono">
                {currentBalanceFormatted}
              </p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {isCredit ? t('modals.credit.amountLabel') : t('modals.debit.amountLabel')}{' '}
                <span className="text-rose-500">*</span>
              </label>
              {!isCredit && currentBalanceMinor > 0 && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  {t('modals.debit.payFull')} ({currentBalanceFormatted})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="0.00"
                className={`w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-all font-mono text-slate-900 font-semibold ${
                  exceedsBalance
                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                    : 'border-slate-200 focus:ring-emerald-500 focus:bg-white'
                }`}
              />
            </div>
            {exceedsBalance && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {t('validation.debitExceedsBalance', { balance: currentBalanceFormatted })}
              </p>
            )}
          </div>

          {/* Zero Balance Warning Notice */}
          {willReachZero && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-xs font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">
                  {zeroBalanceAction === 'archive'
                    ? t('modals.debit.zeroBalanceAlertArchive', { amount: currentBalanceFormatted })
                    : t('modals.debit.zeroBalanceAlertDelete', { amount: currentBalanceFormatted })}
                </p>
              </div>
            </div>
          )}

          {/* Business Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isCredit ? t('modals.credit.dateLabel') : t('modals.debit.dateLabel')}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 font-mono"
            />
          </div>

          {/* Notes / Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isCredit ? t('modals.credit.notesLabel') : t('modals.debit.notesLabel')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isCredit ? t('modals.credit.notesPlaceholder') : t('modals.debit.notesPlaceholder')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Balance Preview Box */}
          <div className="p-3 bg-slate-100/70 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              {isCredit ? t('modals.credit.newBalancePreview') : t('modals.debit.newBalancePreview')}
            </span>
            <span className="font-bold text-sm font-mono text-slate-900">
              {newBalanceFormatted}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isCredit ? t('modals.credit.cancel') : t('modals.debit.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || exceedsBalance || parsedAmount <= 0}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 ${
                isCredit
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              }`}
            >
              {loading ? t('app.loading') : isCredit ? t('modals.credit.submit') : t('modals.debit.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

