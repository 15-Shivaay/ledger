/**
 * Phone number normalization and formatting utility
 * Standardizes phone numbers to E.164-compatible format for unique identification
 */

/**
 * Normalizes an input phone number string into consistent E.164-compatible format
 * @param {string} rawPhone
 * @param {string} [defaultCountryCode='+91']
 * @returns {{ isValid: boolean, normalized: string, display: string, error?: string }}
 */
function normalizePhone(rawPhone, defaultCountryCode = '+91') {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      normalized: '',
      display: '',
      error: 'Phone number is required / फ़ोन नंबर आवश्यक है'
    };
  }

  // Remove whitespace, dashes, brackets, dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  let hasPlus = cleaned.startsWith('+');
  let digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      isValid: false,
      normalized: '',
      display: '',
      error: 'Phone number must contain between 10 and 15 digits / फ़ोन नंबर में 10 से 15 अंक होने चाहिए'
    };
  }

  let normalized;
  if (hasPlus) {
    normalized = `+${digitsOnly}`;
  } else if (digitsOnly.length === 10) {
    // Default country code (India +91)
    let prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
    normalized = `${prefix}${digitsOnly}`;
  } else if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    // 0 followed by 10 digits
    let prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
    normalized = `${prefix}${digitsOnly.slice(1)}`;
  } else {
    normalized = `+${digitsOnly}`;
  }

  // Generate clean display format
  let display = formatDisplayPhone(normalized);

  return {
    isValid: true,
    normalized,
    display
  };
}

/**
 * Formats normalized phone for human presentation
 * e.g., +919876543210 -> +91 98765 43210
 */
function formatDisplayPhone(normalized) {
  if (!normalized) return '';
  if (normalized.startsWith('+91') && normalized.length === 13) {
    return `+91 ${normalized.slice(3, 8)} ${normalized.slice(8)}`;
  }
  if (normalized.startsWith('+1') && normalized.length === 12) {
    return `+1 (${normalized.slice(2, 5)}) ${normalized.slice(5, 8)}-${normalized.slice(8)}`;
  }
  // Generic grouping
  if (normalized.length > 6) {
    let countryEnd = normalized.length > 11 ? normalized.length - 10 : 3;
    let cc = normalized.slice(0, countryEnd);
    let rest = normalized.slice(countryEnd);
    let mid = Math.floor(rest.length / 2);
    return `${cc} ${rest.slice(0, mid)} ${rest.slice(mid)}`;
  }
  return normalized;
}

module.exports = {
  normalizePhone,
  formatDisplayPhone
};

