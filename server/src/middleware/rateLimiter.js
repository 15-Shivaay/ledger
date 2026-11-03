const rateLimit = require('express-rate-limit');
const { getBilingualMessage } = require('../utils/i18nMessages');

const isTest = process.env.NODE_ENV === 'test';

const generalLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // limit each IP to 500 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        const msg = getBilingualMessage('RATE_LIMIT_EXCEEDED');
        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi
        });
      }
    });

const transactionLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 150, // limit each IP to 150 transaction requests per 5 minutes
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        const msg = getBilingualMessage('RATE_LIMIT_EXCEEDED');
        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi
        });
      }
    });

module.exports = {
  generalLimiter,
  transactionLimiter
};

