const request = require('supertest');
const app = require('../src/app');
const Customer = require('../src/models/Customer');
const Transaction = require('../src/models/Transaction');

describe('Database Complete Backup Endpoint', () => {
  const adminHeaders = {
    'x-test-auth': 'true',
    'x-test-role': 'admin'
  };

  it('should reject unauthenticated backup requests with 401', async () => {
    const res = await request(app).get('/api/backup');
    expect(res.status).toBe(401);
  });

  it('should extract complete database data in structured tabular format for admin', async () => {
    const customer = await Customer.create({
      name: 'Backup Test Customer',
      phoneNormalized: '+919999900001',
      phoneDisplay: '+91 99999 00001',
      address: 'Test Market, Delhi',
      currentBalanceMinor: 50000
    });

    await Transaction.create({
      customerId: customer._id,
      type: 'credit',
      amountMinor: 50000,
      balanceAfterMinor: 50000,
      notes: 'Initial credit'
    });

    const res = await request(app).get('/api/backup').set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(res.body.metadata.totalTransactions).toBeGreaterThanOrEqual(1);
    expect(res.body.metadata).toHaveProperty('totalOutstandingFormattedEn');
    expect(res.body.metadata).toHaveProperty('totalOutstandingFormattedHi');

    const found = res.body.customers.find((c) => c.phoneNormalized === '+919999900001');
    expect(found).toBeDefined();
    expect(found.name).toBe('Backup Test Customer');
    expect(found.transactions.length).toBe(1);
    expect(found.transactions[0].notes).toBe('Initial credit');
  });
});

