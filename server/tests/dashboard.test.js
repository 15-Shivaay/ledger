const request = require('supertest');
const app = require('../src/app');
const Customer = require('../src/models/Customer');
const Transaction = require('../src/models/Transaction');

describe('Dashboard Metrics & Aggregations', () => {
  const adminHeaders = {
    'x-test-auth': 'true',
    'x-test-role': 'admin'
  };

  it('should return accurate dashboard statistics across active customers', async () => {
    // Create active customers
    const c1 = await Customer.create({
      name: 'Customer 1',
      phoneNormalized: '+919900000001',
      phoneDisplay: '+91 99000 00001',
      currentBalanceMinor: 400000 // ₹4000
    });

    const c2 = await Customer.create({
      name: 'Customer 2',
      phoneNormalized: '+919900000002',
      phoneDisplay: '+91 99000 00002',
      currentBalanceMinor: 600000 // ₹6000
    });

    // Create archived customer (should not count towards active metrics)
    await Customer.create({
      name: 'Archived Customer',
      phoneNormalized: '+919900000003',
      phoneDisplay: '+91 99000 00003',
      currentBalanceMinor: 0,
      isArchived: true
    });

    // Create transactions in current month
    await Transaction.create([
      {
        customerId: c1._id,
        type: 'credit',
        amountMinor: 400000,
        date: new Date(),
        balanceAfterMinor: 400000
      },
      {
        customerId: c2._id,
        type: 'credit',
        amountMinor: 600000,
        date: new Date(),
        balanceAfterMinor: 600000
      }
    ]);

    const res = await request(app).get('/api/dashboard').set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Active customers count should be 2
    expect(res.body.data.activeCustomerCount).toBe(2);
    // Total outstanding: 400000 + 600000 = 1000000 paise (₹10,000)
    expect(res.body.data.totalOutstandingMinor).toBe(1000000);
    expect(res.body.data.monthlyTransactionCount).toBe(2);
    expect(res.body.data).toHaveProperty('totalOutstandingFormattedEn');
    expect(res.body.data).toHaveProperty('totalOutstandingFormattedHi');
  });
});

