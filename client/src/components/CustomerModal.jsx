import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Lock, UserPlus, Edit3 } from 'lucide-react';

export default function CustomerModal({ isOpen, onClose, onSubmit, customer = null }) {
  const { t } = useLanguage();
  const isEditing = Boolean(customer);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phoneDisplay || customer.phoneNormalized || '');
      setAddress(customer.address || '');
    } else {
      setName('');
      setPhone('');
      setAddress('');
    }
    setError('');
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError(t('validation.nameRequired'));
      return;
    }

    if (!isEditing) {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        setError(t('validation.phoneRequired'));
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditing) {
        await onSubmit({
          name: name.trim(),
          address: address.trim()
        });
      } else {
        await onSubmit({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim()
        });
      }
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
        aria-labelledby="customer-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="customer-modal-title" className="text-base font-bold text-slate-900">
                {isEditing ? t('modals.editCustomer.title') : t('modals.addCustomer.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? t('modals.editCustomer.desc') : t('modals.addCustomer.desc')}
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
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEditing ? t('modals.editCustomer.nameLabel') : t('modals.addCustomer.nameLabel')}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('modals.addCustomer.namePlaceholder')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEditing ? t('modals.editCustomer.phoneLabel') : t('modals.addCustomer.phoneLabel')}{' '}
              {!isEditing && <span className="text-rose-500">*</span>}
            </label>
            {isEditing ? (
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={phone}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono cursor-not-allowed select-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <p className="mt-1 text-xs text-amber-600 font-medium">
                  {t('modals.editCustomer.phoneLockedNotice')}
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('modals.addCustomer.phonePlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono text-slate-900 placeholder:text-slate-400"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t('modals.addCustomer.phoneHelp')}
                </p>
              </div>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEditing ? t('modals.editCustomer.addressLabel') : t('modals.addCustomer.addressLabel')}
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('modals.addCustomer.addressPlaceholder')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isEditing ? t('modals.editCustomer.cancel') : t('modals.addCustomer.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? t('app.loading') : isEditing ? t('modals.editCustomer.submit') : t('modals.addCustomer.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

