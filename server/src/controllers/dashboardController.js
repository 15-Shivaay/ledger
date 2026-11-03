const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { formatCurrency } = require('../utils/currency');

/**
 * GET /api/dashboard
 * Return dashboard metrics:
 * 1. Total outstanding balance across active customers
 * 2. Number of active customers
 * 3. Number of transactions recorded during current calendar month
 */
async function getDashboardSummary(req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Parallel queries for speed and efficiency
    const [
      activeCustomerCount,
      totalBalanceAggregation,
      monthlyTxCount,
      monthlyCreditsAggregation,
      monthlyDebitsAggregation,
      zeroBalanceAction,
      currency
    ] = await Promise.all([
      // 1. Number of active customers
      Customer.countDocuments({ isArchived: false }),

      // 2. Total outstanding balance across active customers
      Customer.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: null, totalMinor: { $sum: '$currentBalanceMinor' } } }
      ]),

      // 3. Number of transactions recorded during the current calendar month
      Transaction.countDocuments({
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }),

      // Current month credit totals
      Transaction.aggregate([
        {
          $match: {
            type: 'credit',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        { $group: { _id: null, totalMinor: { $sum: '$amountMinor' } } }
      ]),

      // Current month debit totals
      Transaction.aggregate([
        {
          $match: {
            type: 'debit',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        { $group: { _id: null, totalMinor: { $sum: '$amountMinor' } } }
      ]),

      // Configuration settings
      Setting.getSetting('zeroBalanceAction', 'delete'),
      Setting.getSetting('currency', 'INR')
    ]);

    const totalOutstandingMinor =
      totalBalanceAggregation.length > 0 ? totalBalanceAggregation[0].totalMinor : 0;
    const monthlyCreditsMinor =
      monthlyCreditsAggregation.length > 0 ? monthlyCreditsAggregation[0].totalMinor : 0;
    const monthlyDebitsMinor =
      monthlyDebitsAggregation.length > 0 ? monthlyDebitsAggregation[0].totalMinor : 0;

    res.json({
      success: true,
      data: {
        totalOutstandingMinor,
        totalOutstandingFormattedEn: formatCurrency(totalOutstandingMinor, 'en-IN', currency),
        totalOutstandingFormattedHi: formatCurrency(totalOutstandingMinor, 'hi-IN', currency),
        activeCustomerCount,
        monthlyTransactionCount: monthlyTxCount,
        monthlyCreditsMinor,
        monthlyCreditsFormattedEn: formatCurrency(monthlyCreditsMinor, 'en-IN', currency),
        monthlyCreditsFormattedHi: formatCurrency(monthlyCreditsMinor, 'hi-IN', currency),
        monthlyDebitsMinor,
        monthlyDebitsFormattedEn: formatCurrency(monthlyDebitsMinor, 'en-IN', currency),
        monthlyDebitsFormattedHi: formatCurrency(monthlyDebitsMinor, 'hi-IN', currency),
        currency,
        zeroBalanceAction,
        monthNameEn: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        monthNameHi: now.toLocaleString('hi-IN', { month: 'long', year: 'numeric' })
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary
};

