import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrencyMinor, formatDate } from '../utils/formatters';
import { X, BookOpen, PlusCircle, MinusCircle, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function CustomerLedgerModal({
  isOpen,
  onClose,
  customerData,
  onAddCredit,
  onAddDebit
}) {
  const { language, t } = useLanguage();

  if (!isOpen || !customerData) return null;

  const { customer, transactions = [] } = customerData;
  const balanceMinor = customer.currentBalanceMinor || 0;
  const totalCreditsMinor = customer.totalCreditsMinor || 0;
  const totalDebitsMinor = customer.totalDebitsMinor || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 id="ledger-modal-title" className="text-base font-bold text-slate-900">
                {t('modals.ledger.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {customer.name} &bull; <span className="font-mono">{customer.phoneDisplay || customer.phoneNormalized}</span>
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

        {/* Account Summary Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Outstanding Balance */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {t('modals.ledger.balanceDue')}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-700">
                {formatCurrencyMinor(balanceMinor, language)}
              </span>
            </div>

            {/* Total Credits Billed */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {t('modals.ledger.totalCredits')}
              </span>
              <span className="text-lg font-bold font-mono text-amber-700">
                {formatCurrencyMinor(totalCreditsMinor, language)}
              </span>
            </div>

            {/* Total Payments Received */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {t('modals.ledger.totalDebits')}
              </span>
              <span className="text-lg font-bold font-mono text-blue-700">
                {formatCurrencyMinor(totalDebitsMinor, language)}
              </span>
            </div>
          </div>

          {customer.address && (
            <p className="mt-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">{t('modals.ledger.address')}:</span>{' '}
              {customer.address}
            </p>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            {transactions.length} {t('dashboard.monthlyTransactions')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddCredit(customer);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {t('customers.creditBtn')}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddDebit(customer);
              }}
              disabled={balanceMinor <= 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              {t('customers.debitBtn')}
            </button>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="overflow-y-auto flex-1 p-6">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {t('modals.ledger.emptyTx')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t('modals.ledger.addTxPrompt')}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      {t('modals.ledger.colDate')}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('modals.ledger.colType')}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('modals.ledger.colNotes')}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      {t('modals.ledger.colAmount')}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      {t('modals.ledger.colBalanceAfter')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <tr key={tx.id || tx._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(tx.date, language)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isCredit ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <ArrowUpRight className="w-3 h-3" />
                              {t('modals.ledger.creditType')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ArrowDownLeft className="w-3 h-3" />
                              {t('modals.ledger.debitType')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                          {tx.notes || <span className="text-slate-400 italic">-</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${
                          isCredit ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {isCredit ? '+' : '-'} {formatCurrencyMinor(tx.amountMinor, language)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrencyMinor(tx.balanceAfterMinor, language)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            {t('modals.ledger.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

