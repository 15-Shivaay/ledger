/**
 * Formatting helpers for currency and dates according to locale and language
 */

/**
 * Format currency minor units (paise) to localized string
 * @param {number} minorUnits - Amount in paise (integer)
 * @param {string} [language='en'] - 'en' or 'hi'
 * @param {string} [currency='INR']
 * @returns {string}
 */
export function formatCurrencyMinor(minorUnits, language = 'en', currency = 'INR') {
  const major = (Number(minorUnits) || 0) / 100;
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(major);
  } catch (e) {
    return `₹${major.toFixed(2)}`;
  }
}

/**
 * Format business or timestamp date
 * @param {string|Date} dateVal
 * @param {string} [language='en']
 * @param {boolean} [includeTime=false]
 * @returns {string}
 */
export function formatDate(dateVal, language = 'en', includeTime = false) {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';

  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };

  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch (e) {
    return d.toLocaleDateString();
  }
}

/**
 * Today's date in YYYY-MM-DD format for HTML date inputs
 */
export function getTodayInputValue() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

