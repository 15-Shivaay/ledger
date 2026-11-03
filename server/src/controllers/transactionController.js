const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { normalizePhone } = require('../utils/phoneNormalizer');
const { toMinorUnits, formatCurrency } = require('../utils/currency');
const { getBilingualMessage } = require('../utils/i18nMessages');

/**
 * POST /api/customers/:phone/transactions
 * Add a credit or debit transaction to a customer account.
 * Atomically handles zero-balance automatic deletion or archiving.
 */
async function addTransaction(req, res, next) {
  try {
    const rawPhone = decodeURIComponent(req.params.phone);
    const phoneValidation = normalizePhone(rawPhone);
    const lookupPhone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone;

    const customer = await Customer.findOne({
      $or: [{ phoneNormalized: lookupPhone }, { phoneNormalized: rawPhone }]
    });

    if (!customer) {
      const msg = getBilingualMessage('CUSTOMER_NOT_FOUND');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    if (customer.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'ACCOUNT_ARCHIVED',
        messageEn: 'Cannot add transactions to an archived customer account.',
        messageHi: 'संग्रहीत (आर्काइव) ग्राहक खाते में लेनदेन नहीं जोड़ा जा सकता।'
      });
    }

    const { type, amount, amountMinor: rawAmountMinor, date, notes = '' } = req.body;

    // Validate transaction type
    if (!type || (type !== 'credit' && type !== 'debit')) {
      const msg = getBilingualMessage('INVALID_TX_TYPE');
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    // Determine amount in integer minor units (paise)
    let amountMinor;
    if (rawAmountMinor !== undefined && rawAmountMinor !== null) {
      amountMinor = parseInt(rawAmountMinor, 10);
    } else if (amount !== undefined && amount !== null && amount !== '') {
      amountMinor = toMinorUnits(amount);
    } else {
      amountMinor = 0;
    }

    if (!amountMinor || isNaN(amountMinor) || amountMinor <= 0) {
      const msg = getBilingualMessage('INVALID_AMOUNT');
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    // Parse business date (defaults to now)
    let businessDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        businessDate = parsedDate;
      }
    }

    // Current balance check
    const currentBalanceMinor = customer.currentBalanceMinor || 0;

    // Validate that a debit does not exceed current balance
    if (type === 'debit' && amountMinor > currentBalanceMinor) {
      const msg = getBilingualMessage('EXCESSIVE_DEBIT');
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi,
        currentBalanceMinor,
        attemptedDebitMinor: amountMinor
      });
    }

    // Calculate new balance
    const newBalanceMinor =
      type === 'credit'
        ? currentBalanceMinor + amountMinor
        : currentBalanceMinor - amountMinor;

    const zeroBalanceAction = await Setting.getSetting('zeroBalanceAction', 'delete');
    const currency = await Setting.getSetting('currency', 'INR');
    const createdBy = req.auth?.userId || req.adminUser?.userId || 'admin';

    // Check if debit brought balance exactly to zero
    const reachesZero = type === 'debit' && newBalanceMinor === 0;

    // Determine if replica set transactions are supported by current MongoDB connection
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    const supportsReplicaSetTransactions =
      topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    let session = null;
    let useTransaction = false;

    if (supportsReplicaSetTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch (err) {
        if (session) {
          await session.endSession().catch(() => {});
          session = null;
        }
        useTransaction = false;
      }
    }

    try {
      if (reachesZero && zeroBalanceAction === 'delete') {
        // CASE 1: Balance reaches zero and default action is DELETE
        if (useTransaction && session) {
          await Transaction.deleteMany({ customerId: customer._id }, { session });
          await Customer.deleteOne({ _id: customer._id }, { session });
          await session.commitTransaction();
        } else {
          // Atomic sequential execution on standalone
          await Transaction.deleteMany({ customerId: customer._id });
          await Customer.deleteOne({ _id: customer._id });
        }

        const msg = getBilingualMessage('ZERO_BALANCE_DELETED');

        return res.status(200).json({
          success: true,
          accountStatus: 'deleted',
          deleted: true,
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi,
          data: {
            customerId: customer._id.toString(),
            phoneNormalized: customer.phoneNormalized,
            name: customer.name,
            finalBalanceMinor: 0
          }
        });
      } else if (reachesZero && zeroBalanceAction === 'archive') {
        // CASE 2: Balance reaches zero and action is ARCHIVE
        let savedTx;
        if (useTransaction && session) {
          const txDocs = await Transaction.create(
            [
              {
                customerId: customer._id,
                type,
                amountMinor,
                date: businessDate,
                notes: notes ? notes.trim() : '',
                balanceAfterMinor: 0,
                createdBy
              }
            ],
            { session }
          );
          savedTx = txDocs[0];

          customer.currentBalanceMinor = 0;
          customer.isArchived = true;
          customer.archivedAt = new Date();
          customer.lastActivityAt = businessDate;
          await customer.save({ session });

          await session.commitTransaction();
        } else {
          savedTx = await Transaction.create({
            customerId: customer._id,
            type,
            amountMinor,
            date: businessDate,
            notes: notes ? notes.trim() : '',
            balanceAfterMinor: 0,
            createdBy
          });

          customer.currentBalanceMinor = 0;
          customer.isArchived = true;
          customer.archivedAt = new Date();
          customer.lastActivityAt = businessDate;
          await customer.save();
        }

        const msg = getBilingualMessage('ZERO_BALANCE_ARCHIVED');

        return res.status(200).json({
          success: true,
          accountStatus: 'archived',
          archived: true,
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi,
          data: {
            customer: {
              ...customer.toObject(),
              id: customer._id.toString(),
              balanceFormattedEn: formatCurrency(0, 'en-IN', currency),
              balanceFormattedHi: formatCurrency(0, 'hi-IN', currency)
            },
            transaction: {
              ...savedTx.toObject(),
              id: savedTx._id.toString(),
              amountFormattedEn: formatCurrency(savedTx.amountMinor, 'en-IN', currency),
              amountFormattedHi: formatCurrency(savedTx.amountMinor, 'hi-IN', currency)
            }
          }
        });
      } else {
        // CASE 3: Normal credit or debit (balance remains > 0)
        let savedTx;
        if (useTransaction && session) {
          const txDocs = await Transaction.create(
            [
              {
                customerId: customer._id,
                type,
                amountMinor,
                date: businessDate,
                notes: notes ? notes.trim() : '',
                balanceAfterMinor: newBalanceMinor,
                createdBy
              }
            ],
            { session }
          );
          savedTx = txDocs[0];

          customer.currentBalanceMinor = newBalanceMinor;
          customer.lastActivityAt = businessDate;
          await customer.save({ session });

          await session.commitTransaction();
        } else {
          savedTx = await Transaction.create({
            customerId: customer._id,
            type,
            amountMinor,
            date: businessDate,
            notes: notes ? notes.trim() : '',
            balanceAfterMinor: newBalanceMinor,
            createdBy
          });

          customer.currentBalanceMinor = newBalanceMinor;
          customer.lastActivityAt = businessDate;
          await customer.save();
        }

        const msg = getBilingualMessage('TRANSACTION_SUCCESS');

        return res.status(201).json({
          success: true,
          accountStatus: 'active',
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi,
          data: {
            customer: {
              ...customer.toObject(),
              id: customer._id.toString(),
              balanceFormattedEn: formatCurrency(newBalanceMinor, 'en-IN', currency),
              balanceFormattedHi: formatCurrency(newBalanceMinor, 'hi-IN', currency)
            },
            transaction: {
              ...savedTx.toObject(),
              id: savedTx._id.toString(),
              amountFormattedEn: formatCurrency(savedTx.amountMinor, 'en-IN', currency),
              amountFormattedHi: formatCurrency(savedTx.amountMinor, 'hi-IN', currency),
              balanceAfterFormattedEn: formatCurrency(newBalanceMinor, 'en-IN', currency),
              balanceAfterFormattedHi: formatCurrency(newBalanceMinor, 'hi-IN', currency)
            }
          }
        });
      }
    } catch (opErr) {
      if (useTransaction && session) {
        await session.abortTransaction().catch(() => {});
      }
      throw opErr;
    } finally {
      if (session) {
        session.endSession().catch(() => {});
      }
    }
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/customers/:phone/correct-balance
 * Correct or update the outstanding due amount for a customer
 * (e.g. reconciling calculation differences with customer notebook).
 * Automatically calculates difference, logs an audit transaction, and updates balance.
 */
async function correctCustomerBalance(req, res, next) {
  try {
    const rawPhone = decodeURIComponent(req.params.phone);
    const phoneValidation = normalizePhone(rawPhone);
    const lookupPhone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone;

    const customer = await Customer.findOne({
      $or: [{ phoneNormalized: lookupPhone }, { phoneNormalized: rawPhone }]
    });

    if (!customer) {
      const msg = getBilingualMessage('CUSTOMER_NOT_FOUND');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    if (customer.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'ACCOUNT_ARCHIVED',
        messageEn: 'Cannot correct balance of an archived customer account.',
        messageHi: 'संग्रहीत (आर्काइव) ग्राहक खाते की बकाया राशि नहीं बदली जा सकती।'
      });
    }

    const { newAmount, newAmountMinor: rawNewMinor, notes = '', date } = req.body;

    let targetMinor;
    if (rawNewMinor !== undefined && rawNewMinor !== null) {
      targetMinor = parseInt(rawNewMinor, 10);
    } else if (newAmount !== undefined && newAmount !== null && newAmount !== '') {
      targetMinor = toMinorUnits(newAmount);
    } else {
      targetMinor = NaN;
    }

    if (isNaN(targetMinor) || targetMinor < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        messageEn: 'Valid target due amount (zero or greater) is required.',
        messageHi: 'वैध नई बकाया राशि (शून्य या अधिक) आवश्यक है।'
      });
    }

    const currentBalanceMinor = customer.currentBalanceMinor || 0;
    const diffMinor = targetMinor - currentBalanceMinor;
    const currency = await Setting.getSetting('currency', 'INR');
    const createdBy = req.auth?.userId || req.adminUser?.userId || 'admin';

    // If no change in balance
    if (diffMinor === 0) {
      return res.status(200).json({
        success: true,
        noChange: true,
        accountStatus: 'active',
        messageEn: 'Balance is already equal to the target amount. No adjustment needed.',
        messageHi: 'बकाया राशि पहले से ही लक्षित राशि के बराबर है। कोई बदलाव आवश्यक नहीं है।',
        data: {
          customer: {
            ...customer.toObject(),
            id: customer._id.toString(),
            balanceFormattedEn: formatCurrency(currentBalanceMinor, 'en-IN', currency),
            balanceFormattedHi: formatCurrency(currentBalanceMinor, 'hi-IN', currency)
          }
        }
      });
    }

    // Determine adjustment transaction type:
    // If targetMinor > currentBalanceMinor: diff > 0 -> credit adjustment
    // If targetMinor < currentBalanceMinor: diff < 0 -> debit adjustment
    const txType = diffMinor > 0 ? 'credit' : 'debit';
    const txAmountMinor = Math.abs(diffMinor);

    let businessDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        businessDate = parsedDate;
      }
    }

    const defaultNote = `Due amount correction: ${formatCurrency(currentBalanceMinor, 'en-IN', currency)} → ${formatCurrency(targetMinor, 'en-IN', currency)}${notes && notes.trim() ? ` (${notes.trim()})` : ''}`;

    const zeroBalanceAction = await Setting.getSetting('zeroBalanceAction', 'delete');
    const reachesZero = targetMinor === 0;

    // Topology check for transactions
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    const supportsReplicaSetTransactions =
      topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    let session = null;
    let useTransaction = false;

    if (supportsReplicaSetTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch (err) {
        if (session) {
          await session.endSession().catch(() => {});
          session = null;
        }
        useTransaction = false;
      }
    }

    try {
      if (reachesZero && zeroBalanceAction === 'delete') {
        if (useTransaction && session) {
          await Transaction.deleteMany({ customerId: customer._id }, { session });
          await Customer.deleteOne({ _id: customer._id }, { session });
          await session.commitTransaction();
        } else {
          await Transaction.deleteMany({ customerId: customer._id });
          await Customer.deleteOne({ _id: customer._id });
        }

        return res.status(200).json({
          success: true,
          accountStatus: 'deleted',
          deleted: true,
          messageEn: 'Balance corrected to zero. Account deleted per system policy.',
          messageHi: 'बकाया राशि शून्य पर सुधारी गई। खाता हटा दिया गया।',
          data: {
            customerId: customer._id.toString(),
            phoneNormalized: customer.phoneNormalized,
            name: customer.name,
            finalBalanceMinor: 0
          }
        });
      } else if (reachesZero && zeroBalanceAction === 'archive') {
        let savedTx;
        if (useTransaction && session) {
          const txDocs = await Transaction.create(
            [
              {
                customerId: customer._id,
                type: txType,
                amountMinor: txAmountMinor,
                date: businessDate,
                notes: defaultNote,
                balanceAfterMinor: 0,
                createdBy
              }
            ],
            { session }
          );
          savedTx = txDocs[0];

          customer.currentBalanceMinor = 0;
          customer.isArchived = true;
          customer.archivedAt = new Date();
          customer.lastActivityAt = businessDate;
          await customer.save({ session });
          await session.commitTransaction();
        } else {
          savedTx = await Transaction.create({
            customerId: customer._id,
            type: txType,
            amountMinor: txAmountMinor,
            date: businessDate,
            notes: defaultNote,
            balanceAfterMinor: 0,
            createdBy
          });

          customer.currentBalanceMinor = 0;
          customer.isArchived = true;
          customer.archivedAt = new Date();
          customer.lastActivityAt = businessDate;
          await customer.save();
        }

        return res.status(200).json({
          success: true,
          accountStatus: 'archived',
          archived: true,
          messageEn: 'Balance corrected to zero. Account archived per system policy.',
          messageHi: 'बकाया राशि शून्य पर सुधारी गई। खाता संग्रहीत किया गया।',
          data: {
            customer: {
              ...customer.toObject(),
              id: customer._id.toString(),
              balanceFormattedEn: formatCurrency(0, 'en-IN', currency),
              balanceFormattedHi: formatCurrency(0, 'hi-IN', currency)
            },
            transaction: {
              ...savedTx.toObject(),
              id: savedTx._id.toString(),
              amountFormattedEn: formatCurrency(savedTx.amountMinor, 'en-IN', currency),
              amountFormattedHi: formatCurrency(savedTx.amountMinor, 'hi-IN', currency)
            }
          }
        });
      } else {
        // Normal balance correction (targetMinor > 0)
        let savedTx;
        if (useTransaction && session) {
          const txDocs = await Transaction.create(
            [
              {
                customerId: customer._id,
                type: txType,
                amountMinor: txAmountMinor,
                date: businessDate,
                notes: defaultNote,
                balanceAfterMinor: targetMinor,
                createdBy
              }
            ],
            { session }
          );
          savedTx = txDocs[0];

          customer.currentBalanceMinor = targetMinor;
          customer.lastActivityAt = businessDate;
          await customer.save({ session });
          await session.commitTransaction();
        } else {
          savedTx = await Transaction.create({
            customerId: customer._id,
            type: txType,
            amountMinor: txAmountMinor,
            date: businessDate,
            notes: defaultNote,
            balanceAfterMinor: targetMinor,
            createdBy
          });

          customer.currentBalanceMinor = targetMinor;
          customer.lastActivityAt = businessDate;
          await customer.save();
        }

        return res.status(200).json({
          success: true,
          accountStatus: 'active',
          messageEn: `Due amount corrected to ${formatCurrency(targetMinor, 'en-IN', currency)} successfully.`,
          messageHi: `बकाया राशि सफलतापूर्वक सुधारकर ${formatCurrency(targetMinor, 'hi-IN', currency)} कर दी गई।`,
          data: {
            customer: {
              ...customer.toObject(),
              id: customer._id.toString(),
              balanceFormattedEn: formatCurrency(targetMinor, 'en-IN', currency),
              balanceFormattedHi: formatCurrency(targetMinor, 'hi-IN', currency)
            },
            transaction: {
              ...savedTx.toObject(),
              id: savedTx._id.toString(),
              amountFormattedEn: formatCurrency(savedTx.amountMinor, 'en-IN', currency),
              amountFormattedHi: formatCurrency(savedTx.amountMinor, 'hi-IN', currency),
              balanceAfterFormattedEn: formatCurrency(targetMinor, 'en-IN', currency),
              balanceAfterFormattedHi: formatCurrency(targetMinor, 'hi-IN', currency)
            }
          }
        });
      }
    } catch (opErr) {
      if (useTransaction && session) {
        await session.abortTransaction().catch(() => {});
      }
      throw opErr;
    } finally {
      if (session) {
        session.endSession().catch(() => {});
      }
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addTransaction,
  correctCustomerBalance
};
