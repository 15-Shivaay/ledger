const { getBilingualMessage } = require('../utils/i18nMessages');

/**
 * Global Express error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log server errors safely without leaking PII
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message || err);
  }

  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const isPhone = err.keyPattern && err.keyPattern.phoneNormalized;
    if (isPhone) {
      const msg = getBilingualMessage('DUPLICATE_PHONE');
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      code: 'DUPLICATE_RECORD',
      messageEn: 'A record with this unique identifier already exists.',
      messageHi: 'इस विशिष्ट पहचानकर्ता वाला एक रिकॉर्ड पहले से मौजूद है।'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messagesEn = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_FAILED',
      messageEn: messagesEn.join(', '),
      messageHi: 'प्रपत्र सत्यापन विफल रहा। कृपया विवरण जांचें।',
      details: messagesEn
    });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const issues = err.issues || [];
    const messagesEn = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_FAILED',
      messageEn: messagesEn || 'Invalid input provided.',
      messageHi: 'अमान्य इनपुट प्रदान किया गया है।',
      details: issues
    });
  }

  // Custom status code if provided
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const msg = getBilingualMessage('SERVER_ERROR');

  res.status(statusCode).json({
    success: false,
    error: err.name || 'Server Error',
    code: err.code || msg.code,
    messageEn: err.messageEn || err.message || msg.messageEn,
    messageHi: err.messageHi || msg.messageHi,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;

