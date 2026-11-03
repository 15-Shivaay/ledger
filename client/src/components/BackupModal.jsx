import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { formatCurrencyMinor, formatDate } from '../utils/formatters';
import html2pdf from 'html2pdf.js';
import {
  X,
  Download,
  Printer,
  FileJson,
  Database,
  RefreshCw,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck
} from 'lucide-react';

export default function BackupModal({ isOpen, onClose }) {
  const { language, t } = useLanguage();
  const reportRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [backupData, setBackupData] = useState(null);
  const [error, setError] = useState('');

  const fetchBackup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getBackupData();
      if (res.success) {
        setBackupData(res);
      }
    } catch (err) {
      console.error('Failed to extract backup data:', err);
      setError(err.data?.messageEn || t('notifications.networkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackup();
    } else {
      setBackupData(null);
      setError('');
      setDownloadingPdf(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Download PDF with html2pdf
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setDownloadingPdf(true);

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `customer-ledger-backup-${dateStr}.pdf`;

      const opt = {
        margin: [10, 8, 10, 8],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('PDF generation encountered an issue. Using Print dialog as fallback.');
      handlePrint();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Handle Print / Save as PDF
  const handlePrint = () => {
    if (!reportRef.current) return;
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('backup.title')} - ${new Date().toISOString().split('T')[0]}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif; color: #0f172a; margin: 20px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 700; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .bg-header { background: #059669; color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
            .stat-box { display: inline-block; width: 23%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; margin-right: 1%; vertical-align: top; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .badge-credit { background: #fef3c7; color: #b45309; }
            .badge-debit { background: #d1fae5; color: #047857; }
            @media print {
              body { margin: 0; }
              @page { size: A4; margin: 10mm; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle Export Raw JSON
  const handleExportJson = () => {
    if (!backupData) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `customer-ledger-data-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const metadata = backupData?.metadata || {};
  const customers = backupData?.customers || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div
        className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-modal-title"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 id="backup-modal-title" className="text-base font-bold text-slate-900">
                {t('backup.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('backup.desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || downloadingPdf || !backupData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              title={t('backup.downloadPdf')}
            >
              {downloadingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadingPdf ? t('backup.generatingPdf') : t('backup.downloadPdf')}</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !backupData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              title={t('backup.printPdf')}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{t('backup.printPdf')}</span>
            </button>

            {/* Export JSON Button */}
            <button
              type="button"
              onClick={handleExportJson}
              disabled={loading || !backupData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              title={t('backup.exportJson')}
            >
              <FileJson className="w-4 h-4" />
              <span className="hidden md:inline">{t('backup.exportJson')}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors ml-1"
              aria-label={t('backup.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 bg-slate-100/60">
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-9 h-9 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                {t('backup.extractingData')}
              </p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 font-semibold text-sm">
              {error}
            </div>
          ) : !backupData ? null : (
            /* Printable Report Container */
            <div
              ref={reportRef}
              id="backup-report-content"
              className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-900 max-w-4xl mx-auto"
            >
              {/* Report Header */}
              <div className="border-b-2 border-emerald-600 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      {t('app.title')} &bull; {t('backup.title')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('app.subtitle')} &bull; Database: <span className="font-mono">ledger_db</span>
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 font-mono">
                    <p className="font-semibold text-slate-800">
                      {t('backup.reportGenerated')}{' '}
                      {formatDate(metadata.generatedAt, language, true)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Currency: {metadata.currency || 'INR'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Metrics Banner */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-8">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  {t('backup.summaryTitle')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      {t('backup.totalOutstanding')}
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-700">
                      {language === 'hi'
                        ? metadata.totalOutstandingFormattedHi
                        : metadata.totalOutstandingFormattedEn}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      {t('backup.activeAccounts')}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {metadata.activeCustomers} / {metadata.totalCustomers}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      {t('backup.colCredits')}
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-700">
                      {language === 'hi'
                        ? metadata.totalCreditsFormattedHi
                        : metadata.totalCreditsFormattedEn}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      {t('backup.colPayments')}
                    </span>
                    <span className="text-lg font-bold font-mono text-blue-700">
                      {language === 'hi'
                        ? metadata.totalDebitsFormattedHi
                        : metadata.totalDebitsFormattedEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Customer Accounts Overview Table */}
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                  {t('backup.customerTableTitle')}
                </h2>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">{t('backup.colCustomer')}</th>
                        <th className="px-3 py-2.5">{t('backup.colPhone')}</th>
                        <th className="px-3 py-2.5">{t('backup.colAddress')}</th>
                        <th className="px-3 py-2.5 text-right">{t('backup.colCredits')}</th>
                        <th className="px-3 py-2.5 text-right">{t('backup.colPayments')}</th>
                        <th className="px-3 py-2.5 text-right">{t('backup.colBalance')}</th>
                        <th className="px-3 py-2.5 text-center">{t('backup.colStatus')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.map((c) => (
                        <tr key={c.id}>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {c.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                            {c.phoneDisplay || c.phoneNormalized}
                          </td>
                          <td className="px-3 py-2 text-slate-600 max-w-xs truncate">
                            {c.address || '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-amber-700">
                            {language === 'hi' ? c.totalCreditsFormattedHi : c.totalCreditsFormattedEn}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-blue-700">
                            {language === 'hi' ? c.totalDebitsFormattedHi : c.totalDebitsFormattedEn}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                            {language === 'hi' ? c.balanceFormattedHi : c.balanceFormattedEn}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.isArchived
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {c.isArchived ? t('backup.archived') : t('backup.active')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Detailed Customer Transaction Ledgers */}
              <div>
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  {t('backup.ledgerDetailsTitle')}
                </h2>

                <div className="space-y-6">
                  {customers.map((c, idx) => (
                    <div
                      key={c.id}
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50/40 break-inside-avoid"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-slate-200 gap-1">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">
                            {idx + 1}. {c.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {c.phoneDisplay || c.phoneNormalized}{' '}
                            {c.address ? `• ${c.address}` : ''}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-slate-500 font-medium">
                            {t('backup.colBalance')}:{' '}
                          </span>
                          <span className="font-bold font-mono text-emerald-700">
                            {language === 'hi' ? c.balanceFormattedHi : c.balanceFormattedEn}
                          </span>
                        </div>
                      </div>

                      {c.transactions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          {t('backup.noTxs')}
                        </p>
                      ) : (
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs bg-white border border-slate-200 rounded">
                          <thead className="bg-slate-100/70 font-semibold text-slate-600 text-[11px]">
                            <tr>
                              <th className="px-2.5 py-1.5">{t('modals.ledger.colDate')}</th>
                              <th className="px-2.5 py-1.5">{t('modals.ledger.colType')}</th>
                              <th className="px-2.5 py-1.5">{t('modals.ledger.colNotes')}</th>
                              <th className="px-2.5 py-1.5 text-right">{t('modals.ledger.colAmount')}</th>
                              <th className="px-2.5 py-1.5 text-right">{t('modals.ledger.colBalanceAfter')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {c.transactions.map((tx) => {
                              const isCredit = tx.type === 'credit';
                              return (
                                <tr key={tx.id}>
                                  <td className="px-2.5 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                                    {formatDate(tx.date, language)}
                                  </td>
                                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        isCredit
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      {isCredit ? t('modals.ledger.creditType') : t('modals.ledger.debitType')}
                                    </span>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-700">
                                    {tx.notes || '-'}
                                  </td>
                                  <td
                                    className={`px-2.5 py-1.5 text-right font-mono font-bold whitespace-nowrap ${
                                      isCredit ? 'text-amber-700' : 'text-emerald-700'
                                    }`}
                                  >
                                    {isCredit ? '+' : '-'} {language === 'hi' ? tx.amountFormattedHi : tx.amountFormattedEn}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono text-slate-800 whitespace-nowrap">
                                    {language === 'hi' ? tx.balanceAfterFormattedHi : tx.balanceAfterFormattedEn}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {t('app.adminBadge')} &bull; {t('backup.title')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-colors"
          >
            {t('backup.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

