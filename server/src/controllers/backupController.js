const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { formatCurrency } = require('../utils/currency');

/**
 * GET /api/backup
 * Extracts complete database records (all customers and full transaction history)
 * Formatted for tabular representation and PDF export.
 */
async function getBackupData(req, res, next) {
  try {
    const currency = await Setting.getSetting('currency', 'INR');
    const zeroBalanceAction = await Setting.getSetting('zeroBalanceAction', 'delete');

    // Fetch all customers (both active and archived if any)
    const customers = await Customer.find({}).sort({ name: 1 }).lean();

    // Fetch all transactions grouped or sorted
    const transactions = await Transaction.find({}).sort({ date: -1, createdAt: -1 }).lean();

    // Map transactions to their customers
    const txByCustomer = {};
    for (const tx of transactions) {
      const cId = tx.customerId.toString();
      if (!txByCustomer[cId]) {
        txByCustomer[cId] = [];
      }
      txByCustomer[cId].push({
        ...tx,
        id: tx._id.toString(),
        amountFormattedEn: formatCurrency(tx.amountMinor, 'en-IN', currency),
        amountFormattedHi: formatCurrency(tx.amountMinor, 'hi-IN', currency),
        balanceAfterFormattedEn: formatCurrency(tx.balanceAfterMinor, 'en-IN', currency),
        balanceAfterFormattedHi: formatCurrency(tx.balanceAfterMinor, 'hi-IN', currency)
      });
    }

    let totalOutstandingMinor = 0;
    let totalCreditsMinor = 0;
    let totalDebitsMinor = 0;

    const enrichedCustomers = customers.map((c) => {
      const cId = c._id.toString();
      const customerTxs = txByCustomer[cId] || [];

      let custCreditsMinor = 0;
      let custDebitsMinor = 0;

      for (const t of customerTxs) {
        if (t.type === 'credit') {
          custCreditsMinor += t.amountMinor;
        } else if (t.type === 'debit') {
          custDebitsMinor += t.amountMinor;
        }
      }

      if (!c.isArchived) {
        totalOutstandingMinor += c.currentBalanceMinor || 0;
      }
      totalCreditsMinor += custCreditsMinor;
      totalDebitsMinor += custDebitsMinor;

      return {
        ...c,
        id: cId,
        balanceFormattedEn: formatCurrency(c.currentBalanceMinor, 'en-IN', currency),
        balanceFormattedHi: formatCurrency(c.currentBalanceMinor, 'hi-IN', currency),
        totalCreditsMinor: custCreditsMinor,
        totalCreditsFormattedEn: formatCurrency(custCreditsMinor, 'en-IN', currency),
        totalCreditsFormattedHi: formatCurrency(custCreditsMinor, 'hi-IN', currency),
        totalDebitsMinor: custDebitsMinor,
        totalDebitsFormattedEn: formatCurrency(custDebitsMinor, 'en-IN', currency),
        totalDebitsFormattedHi: formatCurrency(custDebitsMinor, 'hi-IN', currency),
        transactions: customerTxs
      };
    });

    const now = new Date();

    res.json({
      success: true,
      metadata: {
        generatedAt: now.toISOString(),
        generatedBy: req.auth?.userId || req.adminUser?.userId || 'Admin',
        currency,
        zeroBalanceAction,
        totalCustomers: customers.length,
        activeCustomers: customers.filter((c) => !c.isArchived).length,
        totalTransactions: transactions.length,
        totalOutstandingMinor,
        totalOutstandingFormattedEn: formatCurrency(totalOutstandingMinor, 'en-IN', currency),
        totalOutstandingFormattedHi: formatCurrency(totalOutstandingMinor, 'hi-IN', currency),
        totalCreditsMinor,
        totalCreditsFormattedEn: formatCurrency(totalCreditsMinor, 'en-IN', currency),
        totalCreditsFormattedHi: formatCurrency(totalCreditsMinor, 'hi-IN', currency),
        totalDebitsMinor,
        totalDebitsFormattedEn: formatCurrency(totalDebitsMinor, 'en-IN', currency),
        totalDebitsFormattedHi: formatCurrency(totalDebitsMinor, 'hi-IN', currency)
      },
      customers: enrichedCustomers
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBackupData
};

