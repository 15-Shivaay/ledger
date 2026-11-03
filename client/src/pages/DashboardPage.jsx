import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import CustomerModal from '../components/CustomerModal';
import TransactionModal from '../components/TransactionModal';
import CustomerLedgerModal from '../components/CustomerLedgerModal';
import SettingsModal from '../components/SettingsModal';
import BackupModal from '../components/BackupModal';
import Toast from '../components/Toast';
import { formatCurrencyMinor, formatDate } from '../utils/formatters';
import {
  Wallet,
  Users,
  Receipt,
  Search,
  Plus,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  BookOpen,
  Edit2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Database,
  PhoneCall
} from 'lucide-react';

export default function DashboardPage({ onToggleView, currentView = 'ledger' }) {
  const { language, t } = useLanguage();

  // State
  const [dashboardData, setDashboardData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [settings, setSettings] = useState({ zeroBalanceAction: 'delete', currency: 'INR' });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('activity_desc');
  const [page, setPage] = useState(1);

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeTransactionCustomer, setActiveTransactionCustomer] = useState(null);
  const [transactionType, setTransactionType] = useState('credit'); // 'credit' | 'debit'
  const [ledgerCustomerData, setLedgerCustomerData] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Load dashboard stats
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setDashboardData(res.data);
        if (res.data.zeroBalanceAction) {
          setSettings((prev) => ({
            ...prev,
            zeroBalanceAction: res.data.zeroBalanceAction,
            currency: res.data.currency || 'INR'
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }, []);

  // Load customers
  const fetchCustomers = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.getCustomers({
        search,
        sortBy,
        page,
        limit: 10
      });
      if (res.success) {
        setCustomers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
      setToast({
        type: 'error',
        message: err.data?.messageEn || t('notifications.networkError')
      });
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [search, sortBy, page, t]);

  useEffect(() => {
    fetchDashboard();
    fetchCustomers();
  }, [fetchDashboard, fetchCustomers]);

  // Handle Search Input Debounce
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Handle Create Customer
  const handleCreateCustomer = async (formData) => {
    const res = await api.createCustomer(formData);
    setToast({
      type: 'success',
      message: language === 'hi' ? res.messageHi : res.messageEn || t('notifications.customerCreated')
    });
    fetchDashboard();
    fetchCustomers();
  };

  // Handle Update Customer
  const handleUpdateCustomer = async (formData) => {
    if (!editingCustomer) return;
    const res = await api.updateCustomer(editingCustomer.phoneNormalized, formData);
    setToast({
      type: 'success',
      message: language === 'hi' ? res.messageHi : res.messageEn || t('notifications.customerUpdated')
    });
    fetchCustomers();
  };

  // Handle Add Transaction (Credit / Debit)
  const handleRecordTransaction = async (txData) => {
    if (!activeTransactionCustomer) return;
    const res = await api.addTransaction(activeTransactionCustomer.phoneNormalized, txData);

    // Check if account was deleted or archived upon zero balance
    if (res.accountStatus === 'deleted') {
      setToast({
        type: 'warning',
        title: t('notifications.success'),
        message: language === 'hi' ? res.messageHi : res.messageEn || t('notifications.zeroBalanceDeletedNotice')
      });
    } else if (res.accountStatus === 'archived') {
      setToast({
        type: 'warning',
        title: t('notifications.success'),
        message: language === 'hi' ? res.messageHi : res.messageEn || t('notifications.zeroBalanceArchivedNotice')
      });
    } else {
      const amountStr = formatCurrencyMinor(txData.amountMinor, language);
      setToast({
        type: 'success',
        message:
          txData.type === 'credit'
            ? t('notifications.creditAdded', { amount: amountStr })
            : t('notifications.debitAdded', { amount: amountStr })
      });
    }

    // Refresh metrics and customer table
    fetchDashboard();
    fetchCustomers();
  };

  // Handle Open Ledger
  const handleOpenLedger = async (customer) => {
    try {
      const res = await api.getCustomer(customer.phoneNormalized);
      if (res.success) {
        setLedgerCustomerData(res.data);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.data?.messageEn || t('notifications.error')
      });
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (newSettings) => {
    const res = await api.updateSettings(newSettings);
    if (res.success) {
      setSettings(res.data);
      setToast({
        type: 'success',
        message: language === 'hi' ? res.messageHi : res.messageEn || t('notifications.settingsUpdated')
      });
      fetchDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        currentView={currentView}
        onToggleView={onToggleView}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('dashboard.statsTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('dashboard.currencyNote')} &bull;{' '}
              {dashboardData?.monthNameEn && (
                <span>
                  {language === 'hi' ? dashboardData.monthNameHi : dashboardData.monthNameEn}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                fetchDashboard();
                fetchCustomers();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-colors"
              title={t('app.refresh')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('app.refresh')}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleView && onToggleView('calls')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-xs transition-colors"
              title={t('app.callList')}
            >
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>{t('app.callList')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-colors"
              title={t('app.backup')}
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>{t('app.backup')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('app.addCustomer')}
            </button>
          </div>
        </div>

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Total Outstanding Balance */}
          <StatCard
            title={t('dashboard.totalOutstanding')}
            value={
              dashboardData
                ? language === 'hi'
                  ? dashboardData.totalOutstandingFormattedHi
                  : dashboardData.totalOutstandingFormattedEn
                : '₹0.00'
            }
            helpText={t('dashboard.totalOutstandingHelp')}
            icon={Wallet}
            color="emerald"
          />

          {/* Card 2: Active Customers Count */}
          <StatCard
            title={t('dashboard.activeCustomers')}
            value={dashboardData?.activeCustomerCount ?? 0}
            helpText={t('dashboard.activeCustomersHelp')}
            icon={Users}
            color="blue"
          />

          {/* Card 3: Monthly Transactions Recorded */}
          <StatCard
            title={t('dashboard.monthlyTransactions')}
            value={dashboardData?.monthlyTransactionCount ?? 0}
            helpText={`${t('dashboard.monthlyTransactionsHelp')} (${
              language === 'hi' ? dashboardData?.monthNameHi || '' : dashboardData?.monthNameEn || ''
            })`}
            icon={Receipt}
            color="purple"
          />
        </div>

        {/* Customer Accounts Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Section Toolbar: Search, Sort */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {t('customers.title')}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {pagination.total}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder={t('customers.searchPlaceholder')}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  <option value="activity_desc">{t('customers.sortActivityDesc')}</option>
                  <option value="balance_desc">{t('customers.sortBalanceDesc')}</option>
                  <option value="balance_asc">{t('customers.sortBalanceAsc')}</option>
                  <option value="name_asc">{t('customers.sortNameAsc')}</option>
                  <option value="name_desc">{t('customers.sortNameDesc')}</option>
                  <option value="address_asc">{t('customers.sortAddressAsc')}</option>
                  <option value="address_desc">{t('customers.sortAddressDesc')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customers Table / List */}
          <div className="overflow-x-auto">
            {tableLoading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">{t('app.loading')}</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="py-20 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Inbox className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  {search ? t('customers.emptySearchTitle') : t('customers.emptyTitle')}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                  {search ? t('customers.emptySearchDesc') : t('customers.emptyDesc')}
                </p>
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    {t('customers.clearSearch')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('app.addCustomer')}
                  </button>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      {t('customers.colName')}
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      {t('customers.colPhone')}
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      {t('customers.colAddress')}
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      {t('customers.colBalance')}
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      {t('customers.colLastActivity')}
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      {t('customers.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {customers.map((c) => {
                    const balance = c.currentBalanceMinor || 0;
                    const balanceFormatted =
                      language === 'hi' ? c.balanceFormattedHi : c.balanceFormattedEn;

                    return (
                      <tr key={c.id || c._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name */}
                        <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          {c.name}
                        </td>

                        {/* Phone */}
                        <td className="px-6 py-4 font-mono text-slate-600 whitespace-nowrap">
                          {c.phoneDisplay || c.phoneNormalized}
                        </td>

                        {/* Address */}
                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                          {c.address || <span className="text-slate-400 italic">-</span>}
                        </td>

                        {/* Balance Due */}
                        <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold text-sm">
                          <span
                            className={
                              balance > 0
                                ? 'text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200'
                                : 'text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg'
                            }
                          >
                            {balanceFormatted}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {formatDate(c.lastActivityAt || c.updatedAt, language)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Add Credit */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTransactionCustomer(c);
                                setTransactionType('credit');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                              title={t('customers.creditBtn')}
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{t('customers.creditBtn')}</span>
                            </button>

                            {/* Add Debit / Pay */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTransactionCustomer(c);
                                setTransactionType('debit');
                              }}
                              disabled={balance <= 0}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={t('customers.debitBtn')}
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{t('customers.debitBtn')}</span>
                            </button>

                            {/* View Ledger */}
                            <button
                              type="button"
                              onClick={() => handleOpenLedger(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              title={t('customers.viewLedgerBtn')}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">{t('customers.viewLedgerBtn')}</span>
                            </button>

                            {/* Edit Details */}
                            <button
                              type="button"
                              onClick={() => setEditingCustomer(c)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title={t('customers.editBtn')}
                              aria-label={t('customers.editBtn')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
              <span>
                {t('customers.showingResults', {
                  count: customers.length,
                  total: pagination.total
                })}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('customers.prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-800">
                  {t('customers.page', {
                    page: pagination.page,
                    pages: pagination.totalPages
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('customers.next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Customer Modal */}
      <CustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSubmit={handleCreateCustomer}
        customer={null}
      />

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        onSubmit={handleUpdateCustomer}
        customer={editingCustomer}
      />

      {/* Transaction Modal (Credit / Debit) */}
      <TransactionModal
        isOpen={Boolean(activeTransactionCustomer)}
        onClose={() => setActiveTransactionCustomer(null)}
        onSubmit={handleRecordTransaction}
        customer={activeTransactionCustomer}
        type={transactionType}
        zeroBalanceAction={settings.zeroBalanceAction}
      />

      {/* Customer Ledger Modal */}
      <CustomerLedgerModal
        isOpen={Boolean(ledgerCustomerData)}
        onClose={() => setLedgerCustomerData(null)}
        customerData={ledgerCustomerData}
        onAddCredit={(cust) => {
          setActiveTransactionCustomer(cust);
          setTransactionType('credit');
        }}
        onAddDebit={(cust) => {
          setActiveTransactionCustomer(cust);
          setTransactionType('debit');
        }}
      />

      {/* Business Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSave={handleSaveSettings}
      />

      {/* Database Backup & PDF Export Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />

      {/* Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

