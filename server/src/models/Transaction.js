const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['credit', 'debit'],
        message: 'Transaction type must be credit or debit / लेनदेन प्रकार क्रेडिट या डेबिट होना चाहिए'
      },
      required: [true, 'Transaction type is required']
    },
    // Amount in minor units (integer paise)
    amountMinor: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than zero / राशि शून्य से अधिक होनी चाहिए'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer in minor currency units (paise)'
      }
    },
    // Business date of the transaction
    date: {
      type: Date,
      required: [true, 'Transaction business date is required'],
      default: Date.now,
      index: true
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    // Customer balance immediately after this transaction
    balanceAfterMinor: {
      type: Number,
      required: true
    },
    // Clerk user ID of the admin who created the transaction
    createdBy: {
      type: String,
      default: 'system'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for transaction history and dashboard queries
transactionSchema.index({ customerId: 1, date: -1, createdAt: -1 });
transactionSchema.index({ date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;

