const Setting = require('../models/Setting');

/**
 * GET /api/settings
 * Retrieve business settings
 */
async function getSettings(req, res, next) {
  try {
    const zeroBalanceAction = await Setting.getSetting('zeroBalanceAction', 'delete');
    const currency = await Setting.getSetting('currency', 'INR');
    const defaultCountryCode = await Setting.getSetting('defaultCountryCode', '+91');

    res.json({
      success: true,
      data: {
        zeroBalanceAction, // 'delete' | 'archive'
        currency,          // 'INR'
        defaultCountryCode // '+91'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/settings
 * Update business settings
 */
async function updateSettings(req, res, next) {
  try {
    const { zeroBalanceAction, currency } = req.body;

    if (zeroBalanceAction !== undefined) {
      if (zeroBalanceAction !== 'delete' && zeroBalanceAction !== 'archive') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          messageEn: 'zeroBalanceAction must be either "delete" or "archive"',
          messageHi: 'zeroBalanceAction या तो "delete" या "archive" होना चाहिए'
        });
      }
      await Setting.setSetting(
        'zeroBalanceAction',
        zeroBalanceAction,
        'Action taken when account balance reaches zero'
      );
    }

    if (currency !== undefined) {
      if (typeof currency !== 'string' || currency.trim().length !== 3) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          messageEn: 'currency must be a 3-letter currency code (e.g. INR)',
          messageHi: 'मुद्रा 3-अक्षर का कोड होना चाहिए (जैसे INR)'
        });
      }
      await Setting.setSetting('currency', currency.trim().toUpperCase(), 'Default currency code');
    }

    const currentZeroBalanceAction = await Setting.getSetting('zeroBalanceAction', 'delete');
    const currentCurrency = await Setting.getSetting('currency', 'INR');

    res.json({
      success: true,
      messageEn: 'Settings updated successfully.',
      messageHi: 'सेटिंग्स सफलतापूर्वक अपडेट की गईं।',
      data: {
        zeroBalanceAction: currentZeroBalanceAction,
        currency: currentCurrency
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings
};

