const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB } = require('./config/db');
const Customer = require('./models/Customer');
const Transaction = require('./models/Transaction');
const Setting = require('./models/Setting');
const { normalizePhone } = require('./utils/phoneNormalizer');
const { toMinorUnits } = require('./utils/currency');

async function seedData() {
  console.log('Connecting to database for seeding...');
  await connectDB();

  console.log('Cleaning existing demo data...');
  try {
    await Customer.collection.dropIndexes();
  } catch (err) {
    // Ignore if collection doesn't exist yet
  }
  await Customer.deleteMany({});
  await Transaction.deleteMany({});

  // Initialize settings
  await Setting.setSetting('zeroBalanceAction', 'delete', 'Action on zero balance: delete or archive');
  await Setting.setSetting('currency', 'INR', 'Default currency code');

  console.log('Seeding sample customers and ledger transactions...');

  const sampleCustomers = [
    {
      name: 'Rajesh Sharma (राजेश शर्मा)',
      address: 'Shop 14, Main Market, Chandni Chowk, Delhi - 110006',
      phone: '9811223344',
      transactions: [
        { type: 'credit', amount: 5000, daysAgo: 10, notes: 'Initial stock purchase invoice #101' },
        { type: 'debit', amount: 2000, daysAgo: 6, notes: 'Cash payment received' },
        { type: 'credit', amount: 3500, daysAgo: 2, notes: 'Additional inventory supply #142' }
      ]
    },
    {
      name: 'Pooja Verma (पूजा वर्मा)',
      address: 'Flat 302, Green Valley Apartments, Andheri West, Mumbai - 400053',
      phone: '9820112233',
      transactions: [
        { type: 'credit', amount: 12000, daysAgo: 15, notes: 'Wholesale textile order' },
        { type: 'debit', amount: 7500, daysAgo: 7, notes: 'NEFT bank transfer' }
      ]
    },
    {
      name: 'Amit Patel (अमित पटेल)',
      address: 'B-12, GIDC Electronic Estate, Gandhinagar, Gujarat - 382028',
      phone: '9898012345',
      transactions: [
        { type: 'credit', amount: 8400.5, daysAgo: 12, notes: 'Spare parts supply #512' },
        { type: 'credit', amount: 2100, daysAgo: 5, notes: 'Courier logistics fees' },
        { type: 'debit', amount: 4000, daysAgo: 1, notes: 'UPI payment received' }
      ]
    },
    {
      name: 'Sunita Rao (सुनीता राव)',
      address: 'Plot 45, Jubilee Hills, Road No. 36, Hyderabad - 500033',
      phone: '9849098765',
      transactions: [
        { type: 'credit', amount: 15000, daysAgo: 20, notes: 'Bulk spice order batch A' },
        { type: 'debit', amount: 10000, daysAgo: 14, notes: 'Cheque deposit clearance' },
        { type: 'debit', amount: 2000, daysAgo: 4, notes: 'Cash receipt' }
      ]
    },
    {
      name: 'Vikram Singh (विक्रम सिंह)',
      address: 'Shop 8, MI Road, Near Raj Mandir, Jaipur, Rajasthan - 302001',
      phone: '9829054321',
      transactions: [
        { type: 'credit', amount: 6200, daysAgo: 8, notes: 'Handicraft stock delivery' }
      ]
    }
  ];

  for (const item of sampleCustomers) {
    const phoneNorm = normalizePhone(item.phone);
    let runningBalanceMinor = 0;

    const customer = new Customer({
      name: item.name,
      address: item.address,
      phoneNormalized: phoneNorm.normalized,
      phoneDisplay: phoneNorm.display,
      currentBalanceMinor: 0,
      lastActivityAt: new Date()
    });

    await customer.save();

    for (const tx of item.transactions) {
      const amountMinor = toMinorUnits(tx.amount);
      const txDate = new Date();
      txDate.setDate(txDate.getDate() - tx.daysAgo);

      if (tx.type === 'credit') {
        runningBalanceMinor += amountMinor;
      } else {
        runningBalanceMinor -= amountMinor;
      }

      await Transaction.create({
        customerId: customer._id,
        type: tx.type,
        amountMinor,
        date: txDate,
        notes: tx.notes,
        balanceAfterMinor: runningBalanceMinor,
        createdBy: 'seed_script'
      });
    }

    customer.currentBalanceMinor = runningBalanceMinor;
    customer.lastActivityAt = new Date();
    await customer.save();

    console.log(`Created customer ${customer.name} with balance ₹${(runningBalanceMinor / 100).toFixed(2)}`);
  }

  console.log('Seeding completed successfully!');
  await disconnectDB();
  process.exit(0);
}

seedData().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

