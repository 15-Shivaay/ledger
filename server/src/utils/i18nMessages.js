/**
 * Bilingual (English & Hindi) response helper dictionary for server-side responses
 */

const MESSAGES = {
  // Auth & Permissions
  AUTH_REQUIRED: {
    en: 'Authentication required. Please sign in.',
    hi: 'प्रमाणीकरण आवश्यक है। कृपया साइन इन करें।'
  },
  ADMIN_ACCESS_REQUIRED: {
    en: 'Admin access required. You do not have permission to view or manage customer accounts.',
    hi: 'व्यवस्थापक (एडमिन) पहुंच आवश्यक है। आपको ग्राहक खाते देखने या प्रबंधित करने की अनुमति नहीं है।'
  },
  INVALID_SESSION: {
    en: 'Your session has expired or is invalid. Please sign in again.',
    hi: 'आपका सत्र समाप्त हो गया है या अमान्य है। कृपया पुनः साइन इन करें।'
  },

  // Customer messages
  CUSTOMER_NOT_FOUND: {
    en: 'Customer account not found.',
    hi: 'ग्राहक खाता नहीं मिला।'
  },
  DUPLICATE_PHONE: {
    en: 'A customer account with this phone number already exists.',
    hi: 'इस फ़ोन नंबर वाला ग्राहक खाता पहले से मौजूद है।'
  },
  CUSTOMER_CREATED: {
    en: 'Customer account created successfully.',
    hi: 'ग्राहक खाता सफलतापूर्वक बनाया गया।'
  },
  CUSTOMER_UPDATED: {
    en: 'Customer details updated successfully.',
    hi: 'ग्राहक विवरण सफलतापूर्वक अपडेट किया गया।'
  },
  CUSTOMER_ARCHIVED: {
    en: 'Customer account has been archived.',
    hi: 'ग्राहक खाते को संग्रहीत (आर्काइव) कर दिया गया है।'
  },
  PHONE_CANNOT_BE_CHANGED: {
    en: 'Customer phone number is a unique account identifier and cannot be modified.',
    hi: 'ग्राहक फ़ोन नंबर एक विशिष्ट पहचानकर्ता है और इसे बदला नहीं जा सकता।'
  },

  // Transactions
  TRANSACTION_SUCCESS: {
    en: 'Transaction recorded successfully.',
    hi: 'लेनदेन सफलतापूर्वक दर्ज किया गया।'
  },
  EXCESSIVE_DEBIT: {
    en: 'Debit amount cannot exceed current outstanding balance.',
    hi: 'डेबिट राशि वर्तमान बकाया शेष राशि से अधिक नहीं हो सकती।'
  },
  ZERO_BALANCE_DELETED: {
    en: 'Account and transaction history were deleted because the balance reached zero.',
    hi: 'शेष राशि शून्य होने के कारण खाता और लेनदेन इतिहास हटा दिया गया।'
  },
  ZERO_BALANCE_ARCHIVED: {
    en: 'Account has been archived because the balance reached zero. Transaction history preserved.',
    hi: 'शेष राशि शून्य होने के कारण खाते को संग्रहीत (आर्काइव) कर दिया गया है। लेनदेन इतिहास सुरक्षित है।'
  },
  INVALID_AMOUNT: {
    en: 'Transaction amount must be a positive number greater than zero.',
    hi: 'लेनदेन राशि शून्य से अधिक धनात्मक संख्या होनी चाहिए।'
  },
  INVALID_TX_TYPE: {
    en: 'Invalid transaction type. Must be either credit or debit.',
    hi: 'अमान्य लेनदेन प्रकार। यह या तो क्रेडिट या डेबिट होना चाहिए।'
  },

  // General Validation
  INVALID_NAME: {
    en: 'Customer name is required (between 2 and 100 characters).',
    hi: 'ग्राहक का नाम आवश्यक है (2 से 100 अक्षरों के बीच)।'
  },
  INVALID_PHONE: {
    en: 'Please provide a valid phone number (10 to 15 digits).',
    hi: 'कृपया एक मान्य फ़ोन नंबर प्रदान करें (10 से 15 अंक)।'
  },
  RATE_LIMIT_EXCEEDED: {
    en: 'Too many requests. Please try again later.',
    hi: 'बहुत सारे अनुरोध। कृपया कुछ समय बाद पुनः प्रयास करें।'
  },
  SERVER_ERROR: {
    en: 'An internal server error occurred. Please try again.',
    hi: 'एक आंतरिक सर्वर त्रुटि हुई। कृपया पुनः प्रयास करें।'
  }
};

/**
 * Returns a bilingual response payload
 * @param {keyof typeof MESSAGES} code
 * @param {object} [extra={}]
 */
function getBilingualMessage(code, extra = {}) {
  let msg = MESSAGES[code] || {
    en: code,
    hi: code
  };

  return {
    code,
    messageEn: msg.en,
    messageHi: msg.hi,
    ...extra
  };
}

module.exports = {
  MESSAGES,
  getBilingualMessage
};

