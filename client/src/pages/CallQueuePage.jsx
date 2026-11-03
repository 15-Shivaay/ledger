import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import CustomerLedgerModal from '../components/CustomerLedgerModal';
import CorrectAmountModal from '../components/CorrectAmountModal';
import Toast from '../components/Toast';
import { formatCurrencyMinor, formatDate } from '../utils/formatters';
import html2pdf from 'html2pdf.js';
import {
  Phone,
  PhoneCall,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Edit3,
  Calendar,
  Clock,
  RotateCw,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  User,
  MapPin,
  AlertCircle,
  Printer,
  Download,
  X,
  Scale
} from 'lucide-react';

export default function CallQueuePage({
  onBackToLedger,
  onOpenSettings,
  onOpenBackup,
  targetCustomer,
  onClearTargetCustomer
}) {
  const { language, t } = useLanguage();

  const [day, setDay] = useState(() => {
    try {
      const saved = localStorage.getItem('ledger_active_call_day');
      return saved ? parseInt(saved, 10) || 1 : 1;
    } catch {
      return 1;
    }
  });
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    day: 1,
    totalDays: 1,
    totalCustomers: 0,
    limit: 50,
    nextDay: 1,
    prevDay: 1,
    isWrapped: false
  });
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState(null);

  // Copy tracking: customer id -> boolean
  const [copiedId, setCopiedId] = useState(null);

  // Remarks editing: customer id -> boolean
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [remarkText, setRemarkText] = useState('');
  const [savingRemarkId, setSavingRemarkId] = useState(null);

  // Ledger modal
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);

  // Correct Amount modal
  const [correctingCustomer, setCorrectingCustomer] = useState(null);

  // PDF Preview & Download modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const printTableRef = useRef(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Fetch 50 customers for specified day
  const fetchCallList = useCallback(async (targetDay) => {
    setLoading(true);
    try {
      const res = await api.getCallList(targetDay, 50);
      if (res.success) {
        let list = res.data;
        if (targetCustomer) {
          const targetId = targetCustomer.id || targetCustomer._id;
          const exists = list.some((c) => (c.id || c._id) === targetId);
          if (!exists) {
            list = [{ ...targetCustomer, isManuallyAdded: true, queuePosition: '+1' }, ...list];
          }
        }
        setCustomers(list);
        setPagination(res.pagination);
        setDay(res.pagination.day);
        try {
          localStorage.setItem('ledger_active_call_day', res.pagination.day);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to fetch call list:', err);
      setToast({
        type: 'error',
        message: err.data?.messageEn || t('notifications.networkError')
      });
    } finally {
      setLoading(false);
    }
  }, [t, targetCustomer]);

  useEffect(() => {
    fetchCallList(day);
  }, []);

  // Handle Next Day: update active day and load next 50 customers
  const handleNextDay = async () => {
    const next = pagination.nextDay;
    setDay(next);
    try {
      localStorage.setItem('ledger_active_call_day', next);
    } catch {}
    api.setCallQueueDay(next).catch((e) => console.warn('Could not persist day on server:', e));
    fetchCallList(next);
  };

  // Handle Previous Day: update active day and load previous 50 customers
  const handlePrevDay = async () => {
    const prev = pagination.prevDay;
    setDay(prev);
    try {
      localStorage.setItem('ledger_active_call_day', prev);
    } catch {}
    api.setCallQueueDay(prev).catch((e) => console.warn('Could not persist day on server:', e));
    fetchCallList(prev);
  };

  // Handle Target Customer navigation from Dashboard without resetting day
  useEffect(() => {
    if (targetCustomer) {
      const targetId = targetCustomer.id || targetCustomer._id;
      setHighlightedId(targetId);

      // Optimistically add to customers if not present
      setCustomers((prev) => {
        const exists = prev.some((c) => (c.id || c._id) === targetId);
        if (exists) return prev;
        return [{ ...targetCustomer, isManuallyAdded: true, queuePosition: '+1' }, ...prev];
      });

      // Smoothly scroll to the target customer's card
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`customer-card-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);

      const highlightTimer = setTimeout(() => {
        setHighlightedId(null);
        if (onClearTargetCustomer) onClearTargetCustomer();
      }, 4000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(highlightTimer);
      };
    }
  }, [targetCustomer, onClearTargetCustomer]);

  // Handle Copy Phone Number to Clipboard (copies 10-digit number only, excluding +91)
  const handleCopyPhone = async (customer) => {
    const rawDigits = (customer.phoneNormalized || customer.phoneDisplay || '').replace(/\D/g, '');
    const tenDigitPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tenDigitPhone);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = tenDigitPhone;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopiedId(customer.id || customer._id);
      setTimeout(() => setCopiedId(null), 2500);

      setToast({
        type: 'success',
        title: t('calls.copied'),
        message: t('calls.phoneCopied', { phone: tenDigitPhone })
      });
    } catch (err) {
      console.error('Failed to copy phone:', err);
    }
  };

  // Start editing remark
  const handleStartEditRemark = (customer) => {
    setEditingRemarkId(customer.id || customer._id);
    setRemarkText(customer.remarks || '');
  };

  // Save remark to database
  const handleSaveRemark = async (customer) => {
    const custId = customer.id || customer._id;
    setSavingRemarkId(custId);
    try {
      const res = await api.updateCustomerRemark(customer.phoneNormalized, {
        remark: remarkText.trim(),
        markCalled: true
      });

      if (res.success) {
        // Update customer in local state
        setCustomers((prev) =>
          prev.map((c) =>
            (c.id || c._id) === custId || c.phoneNormalized === customer.phoneNormalized
              ? {
                  ...c,
                  remarks: remarkText.trim(),
                  lastCalledAt: new Date().toISOString()
                }
              : c
          )
        );

        setEditingRemarkId(null);
        setToast({
          type: 'success',
          message: t('calls.remarkUpdated', { name: customer.name })
        });
      }
    } catch (err) {
      console.error('Failed to save remark:', err);
      setToast({
        type: 'error',
        message: err.data?.messageEn || t('notifications.networkError')
      });
    } finally {
      setSavingRemarkId(null);
    }
  };

  // Open Ledger Modal
  const handleOpenLedger = async (customer) => {
    try {
      const res = await api.getCustomer(customer.phoneNormalized);
      if (res.success) {
        setSelectedLedgerCustomer(res.data);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    }
  };

  // Handle Correct Due Amount for a customer
  const handleCorrectBalance = async (data) => {
    if (!correctingCustomer) return;
    const custId = correctingCustomer.id || correctingCustomer._id;
    const res = await api.correctCustomerBalance(correctingCustomer.phoneNormalized, {
      newAmount: data.newAmount,
      newAmountMinor: data.newAmountMinor,
      date: data.date,
      notes: data.notes
    });

    if (res.accountStatus === 'deleted') {
      setCustomers((prev) => prev.filter((cust) => (cust.id || cust._id) !== custId));
      setToast({
        type: 'warning',
        title: t('notifications.success'),
        message: language === 'hi' ? res.messageHi : res.messageEn || t('notifications.balanceCorrectedZeroDeleted')
      });
    } else {
      const newBalMinor = data.newAmountMinor;
      setCustomers((prev) =>
        prev.map((cust) =>
          (cust.id || cust._id) === custId || cust.phoneNormalized === correctingCustomer.phoneNormalized
            ? {
                ...cust,
                currentBalanceMinor: newBalMinor,
                balanceFormattedEn: res.data?.customer?.balanceFormattedEn || formatCurrencyMinor(newBalMinor, 'en'),
                balanceFormattedHi: res.data?.customer?.balanceFormattedHi || formatCurrencyMinor(newBalMinor, 'hi')
              }
            : cust
        )
      );
      setToast({
        type: 'success',
        title: t('notifications.success'),
        message: language === 'hi' ? res.messageHi : res.messageEn || t('notifications.balanceCorrected', { amount: res.data?.customer?.balanceFormattedEn })
      });
    }
  };

  // Direct print window fallback
  const handlePrintFallback = () => {
    if (!printTableRef.current) return;
    const printContent = printTableRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('calls.pdfTableTitle', { day: pagination.day })} - ${new Date().toISOString().split('T')[0]}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif; color: #0f172a; margin: 15px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 700; color: #334155; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            @media print {
              body { margin: 0; }
              @page { size: A4 portrait; margin: 8mm; }
              tr { page-break-inside: avoid; break-inside: avoid; }
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

  // Handle Download PDF for current day's 50 customers
  const handleDownloadCallListPdf = async () => {
    if (!printTableRef.current || customers.length === 0) return;
    setDownloadingPdf(true);

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `customer-call-list-day-${pagination.day}-${dateStr}.pdf`;

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

      await html2pdf().set(opt).from(printTableRef.current).save();

      setToast({
        type: 'success',
        message: t('calls.pdfDownloadSuccess', { day: pagination.day })
      });
    } catch (err) {
      console.error('Failed to generate call list PDF, falling back to print dialog:', err);
      handlePrintFallback();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Open modal and auto-download PDF
  const handleOpenPrintModal = () => {
    setIsPrintModalOpen(true);
  };

  // Auto-download PDF when modal opens
  useEffect(() => {
    if (isPrintModalOpen && printTableRef.current && !downloadingPdf) {
      const timer = setTimeout(() => {
        handleDownloadCallListPdf();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isPrintModalOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenSettings={onOpenSettings}
        onOpenBackup={onOpenBackup}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Navigation Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={onBackToLedger}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('app.backToLedger')}
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {t('app.callList')}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-emerald-600" />
              {t('calls.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {t('calls.subtitle')}
            </p>
          </div>

          {/* Day Navigation Controls */}
          <div className="flex items-center gap-2.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            {/* Previous Day Button */}
            <button
              type="button"
              onClick={handlePrevDay}
              disabled={loading || pagination.totalDays <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={t('calls.prevDay')}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('calls.prevDay')}</span>
            </button>

            {/* Current Day Badge */}
            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="text-xs font-bold text-emerald-800 font-mono block">
                {t('calls.dayBadge', {
                  day: pagination.day,
                  totalDays: pagination.totalDays
                })}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block">
                {t('calls.totalInQueue', {
                  count: customers.length,
                  day: pagination.day,
                  total: pagination.totalCustomers
                })}
              </span>
            </div>

            {/* Next Day Button (Circular) */}
            <button
              type="button"
              onClick={handleNextDay}
              disabled={loading || pagination.totalDays <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={t('calls.nextDay')}
            >
              <span>{t('calls.nextDay')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Circular Queue Helper Info Banner */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900 gap-2">
          <div className="flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('calls.circularNotice')}</span>
          </div>
          {pagination.isWrapped && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <AlertCircle className="w-3 h-3" />
              {t('calls.wrappedBadge')}
            </span>
          )}
        </div>

        {/* Customer Cards Grid (50 per page) */}
        {loading ? (
          <div className="py-28 text-center bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">{t('app.loading')}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl border border-slate-200 p-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Phone className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {t('calls.emptyTitle')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {t('calls.emptyDesc')}
            </p>
            <button
              type="button"
              onClick={onBackToLedger}
              className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              {t('app.backToLedger')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customers.map((c, idx) => {
              const custId = c.id || c._id;
              const isCopied = copiedId === custId;
              const isEditingRemark = editingRemarkId === custId;
              const isSaving = savingRemarkId === custId;
              const isHighlighted = highlightedId === custId;
              const balanceFormatted =
                language === 'hi' ? c.balanceFormattedHi : c.balanceFormattedEn;

              return (
                <div
                  id={`customer-card-${c.id || c._id}`}
                  key={c.id || c._id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                    isHighlighted
                      ? 'border-emerald-500 ring-4 ring-emerald-500/25 bg-emerald-50/20 shadow-md'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header: Queue Position, Name, Balance */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {c.queuePosition || idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {c.name}
                        </h3>
                        {c.isManuallyAdded && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {t('calls.addedTodayBadge')}
                          </span>
                        )}
                      </div>

                      {/* Outstanding Balance Due */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {t('calls.balanceDue')}
                        </span>
                        <span className="text-base font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                          {balanceFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info: Phone & Address */}
                    <div className="space-y-1.5 text-xs text-slate-600 mt-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono font-semibold text-slate-800 text-sm">
                          {c.phoneDisplay || c.phoneNormalized}
                        </span>
                      </div>

                      {c.address && (
                        <div className="flex items-start gap-2 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remarks / Notes Section */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        {t('calls.remarks')}
                      </span>
                      {!isEditingRemark && (
                        <button
                          type="button"
                          onClick={() => handleStartEditRemark(c)}
                          className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          {c.remarks ? t('calls.editRemark') : t('calls.addRemark')}
                        </button>
                      )}
                    </div>

                    {isEditingRemark ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          rows={2}
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder={t('calls.remarkPlaceholder')}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingRemarkId(null)}
                            disabled={isSaving}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md"
                          >
                            {t('calls.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveRemark(c)}
                            disabled={isSaving}
                            className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors flex items-center gap-1"
                          >
                            {isSaving ? t('calls.saving') : t('calls.saveRemark')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {c.remarks ? (
                          <p className="text-slate-800 font-medium italic">
                            "{c.remarks}"
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">
                            {t('calls.noRemark')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Timestamp info */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {t('calls.lastUpdated')}{' '}
                        {formatDate(c.updatedAt || c.lastActivityAt, language)}
                      </span>
                      {c.lastCalledAt && (
                        <span>
                          {t('calls.lastCalled')}{' '}
                          {formatDate(c.lastCalledAt, language, true)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row: Direct Dial (Main) & Copy Phone (Icon) */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {/* Primary Button -> Now Direct Dials */}
                    <a
                      href={`tel:${c.phoneNormalized || c.phoneDisplay}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{t('calls.callOption')}</span>
                    </a>

                    {/* Secondary Icon Button -> Now Copies Phone Number */}
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(c)}
                      className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                        isCopied
                          ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                          : 'text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title={isCopied ? t('calls.copied') : t('calls.copyPhone')}
                      aria-label={t('calls.copyPhone')}
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <PhoneCall className="w-4 h-4" />
                      )}
                    </button>

                    {/* Open Customer Ledger Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenLedger(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
                      title={t('calls.viewHistory')}
                    >
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      <span className="hidden sm:inline">{t('calls.viewHistory')}</span>
                    </button>

                    {/* Correct Due Amount Button */}
                    <button
                      type="button"
                      onClick={() => setCorrectingCustomer(c)}
                      className="p-2.5 rounded-xl transition-colors text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shrink-0 cursor-pointer"
                      title={t('customers.correctDueTooltip')}
                      aria-label={t('customers.correctDueTooltip')}
                    >
                      <Scale className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Actions & Pagination directly after 50 Customers List */}
        {customers.length > 0 && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">
                {t('calls.totalInQueue', {
                  count: customers.length,
                  day: pagination.day,
                  total: pagination.totalCustomers
                })}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-end">
              {/* Print / Download PDF Button after 50 customers */}
              <button
                type="button"
                onClick={handleOpenPrintModal}
                disabled={downloadingPdf || loading || customers.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 rounded-xl transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={t('calls.printCallListPdf')}
              >
                {downloadingPdf ? (
                  <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 text-emerald-700" />
                )}
                <span>
                  {downloadingPdf ? t('calls.generatingPdf') : t('calls.printCallListPdf')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDay(pagination.prevDay)}
                disabled={loading || pagination.totalDays <= 1}
                className="px-3.5 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                {t('calls.prevDay')}
              </button>

              <button
                type="button"
                onClick={() => setDay(pagination.nextDay)}
                disabled={loading || pagination.totalDays <= 1}
                className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                {t('calls.nextDay')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Customer Ledger Modal for inspecting transaction details */}
      <CustomerLedgerModal
        isOpen={Boolean(selectedLedgerCustomer)}
        onClose={() => setSelectedLedgerCustomer(null)}
        customerData={selectedLedgerCustomer}
        onAddCredit={() => {}}
        onAddDebit={() => {}}
      />

      {/* Correct / Update Due Amount Modal */}
      <CorrectAmountModal
        isOpen={Boolean(correctingCustomer)}
        onClose={() => setCorrectingCustomer(null)}
        onSubmit={handleCorrectBalance}
        customer={correctingCustomer}
      />

      {/* Toast Alert */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Call List Print & PDF Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div
            className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="print-modal-title"
          >
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="print-modal-title" className="text-base font-bold text-slate-900">
                    {t('calls.pdfTableTitle', { day: pagination.day })}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('calls.totalInQueue', {
                      count: customers.length,
                      day: pagination.day,
                      total: pagination.totalCustomers
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={handleDownloadCallListPdf}
                  disabled={downloadingPdf || customers.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  title={t('calls.printCallListPdf')}
                >
                  {downloadingPdf ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{downloadingPdf ? t('calls.generatingPdf') : t('calls.printCallListPdf')}</span>
                </button>

                {/* Print Direct */}
                <button
                  type="button"
                  onClick={handlePrintFallback}
                  disabled={customers.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable Printable Container */}
            <div className="overflow-y-auto flex-1 p-6 bg-slate-100/60">
              <div
                ref={printTableRef}
                id="call-list-print-table"
                className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-900 max-w-4xl mx-auto"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif'
                }}
              >
                {/* Document Header */}
                <div className="border-b-2 border-emerald-600 pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      {language === 'hi' ? 'ग्राहक खाता बही • दैनिक कॉल सूची' : 'Customer Account Ledger • Daily Call List'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('calls.pdfTableTitle', { day: pagination.day })} &bull; {customers.length} {language === 'hi' ? 'ग्राहक' : 'Customers'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 font-mono">
                    <p className="font-semibold text-slate-800">
                      {language === 'hi' ? 'तैयार किया गया:' : 'Generated:'} {formatDate(new Date().toISOString(), language, true)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'hi'
                        ? `दिन ${pagination.day} / ${pagination.totalDays} (कुल खाते: ${pagination.totalCustomers})`
                        : `Day ${pagination.day} of ${pagination.totalDays} (Total: ${pagination.totalCustomers})`}
                    </p>
                  </div>
                </div>

                {/* 5-Column Table: Name, Phone, Address, Balance, Response */}
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="border border-slate-300 px-2 py-2 text-center w-10 font-bold text-slate-700">
                        {t('calls.pdfColIndex')}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                        {t('calls.pdfColName')}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 whitespace-nowrap">
                        {t('calls.pdfColPhone')}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                        {t('calls.pdfColAddress')}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700 whitespace-nowrap">
                        {t('calls.pdfColBalance')}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                        {t('calls.pdfColResponse')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, idx) => {
                      const balanceFormatted =
                        language === 'hi'
                          ? c.balanceFormattedHi || formatCurrencyMinor(c.currentBalanceMinor || 0, 'hi')
                          : c.balanceFormattedEn || formatCurrencyMinor(c.currentBalanceMinor || 0, 'en');
                      const phone = c.phoneDisplay || c.phoneNormalized || '-';
                      const address = c.address && c.address.trim() ? c.address.trim() : '-';
                      const response = c.remarks && c.remarks.trim() ? c.remarks.trim() : '-';

                      return (
                        <tr
                          key={c.id || idx}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                          style={{ pageBreakInside: 'avoid' }}
                        >
                          <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                            {c.name}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                            {phone}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-600 break-words">
                            {address}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-bold whitespace-nowrap font-mono text-amber-700">
                            {balanceFormatted}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-700 break-words">
                            {response}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Document Footer */}
                <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between text-[11px] text-slate-400">
                  <span>Customer Ledger Management System</span>
                  <span>
                    {language === 'hi'
                      ? `दिन ${pagination.day} कॉल सूची • कुल ${customers.length} ग्राहक`
                      : `Day ${pagination.day} Call Queue • Total ${customers.length} Customers`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

