const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required / ग्राहक का नाम आवश्यक है'],
      trim: true,
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    address: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    phoneNormalized: {
      type: String,
      required: [true, 'Normalized phone number is required'],
      unique: true,
      trim: true,
      index: true
    },
    phoneDisplay: {
      type: String,
      required: [true, 'Display phone number is required'],
      trim: true
    },
    // Current outstanding balance stored in integer minor units (paise)
    // Server-calculated from transactions: total credits minus total debits
    currentBalanceMinor: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative / शेष राशि ऋणात्मक नहीं हो सकती'],
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date,
      default: null
    },
    // Latest note or remark recorded by the admin during calls
    remarks: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Remarks cannot exceed 1000 characters']
    },
    // Timestamp when the customer was last called or remark updated
    lastCalledAt: {
      type: Date,
      default: null,
      index: true
    },
    // Call log history
    callHistory: [
      {
        remark: { type: String, trim: true },
        calledAt: { type: Date, default: Date.now },
        calledBy: { type: String, default: 'admin' }
      }
    ],
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Helpful index patterns for sorting and searching
customerSchema.index({ isArchived: 1, currentBalanceMinor: -1 });
customerSchema.index({ isArchived: 1, name: 1 });
customerSchema.index({ isArchived: 1, address: 1 });
customerSchema.index({ isArchived: 1, lastActivityAt: -1 });
customerSchema.index({ isArchived: 1, updatedAt: 1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;

