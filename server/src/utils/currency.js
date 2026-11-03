/**
 * Currency utilities for minor unit conversions and calculations
 * Uses integer math (paise) to prevent floating-point rounding errors
 */

/**
 * Converts standard currency unit (Rupees) string or number to minor units (Paise)
 * Example: 150.50 -> 15050 paise, "100" -> 10000 paise
 * @param {number|string} amount
 * @returns {number} integer minor units
 */
function toMinorUnits(amount) {
  if (amount === undefined || amount === null || amount === '') {
    return 0;
  }
  let num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, '').trim());
  if (isNaN(num)) {
    throw new Error('Invalid monetary amount / अमान्य मुद्रा राशि');
  }
  // Math.round to avoid 150.50 * 100 = 15049.999999999998
  return Math.round(num * 100);
}

/**
 * Converts minor units (Paise) to major units (Rupees)
 * @param {number} minorUnits
 * @returns {number}
 */
function toMajorUnits(minorUnits) {
  if (!minorUnits || isNaN(minorUnits)) return 0;
  return Number(minorUnits) / 100;
}

/**
 * Formats minor units into localized currency string
 * @param {number} minorUnits
 * @param {string} [locale='en-IN']
 * @param {string} [currency='INR']
 * @returns {string}
 */
function formatCurrency(minorUnits, locale = 'en-IN', currency = 'INR') {
  let major = toMajorUnits(minorUnits);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(major);
  } catch (err) {
    // Fallback if locale or currency code is unsupported
    return `₹${major.toFixed(2)}`;
  }
}

module.exports = {
  toMinorUnits,
  toMajorUnits,
  formatCurrency
};

