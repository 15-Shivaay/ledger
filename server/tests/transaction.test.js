const request = require('supertest');
const app = require('../src/app');
const Customer = require('../src/models/Customer');
const Transaction = require('../src/models/Transaction');

describe('Transaction Ledger & Balance Calculation', () => {
  const adminHeaders = {
    'x-test-auth': 'true',
    'x-test-role': 'admin'
  };

  let testCustomer;

  beforeEach(async () => {
    testCustomer = await Customer.create({
      name: 'Vikas Malhotra',
      address: 'Chandigarh',
      phoneNormalized: '+919855555555',
      phoneDisplay: '+91 98555 55555',
      currentBalanceMinor: 0
    });
  });

  it('should record a credit and increase customer outstanding balance', async () => {
    const res = await request(app)
      .post('/api/customers/+919855555555/transactions')
      .set(adminHeaders)
      .send({
        type: 'credit',
        amount: 2500, // ₹2500 -> 250000 paise
        notes: 'Supply order'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer.currentBalanceMinor).toBe(250000);
    expect(res.body.data.transaction.amountMinor).toBe(250000);
    expect(res.body.data.transaction.type).toBe('credit');

    // Verify in database
    const updatedCustomer = await Customer.findById(testCustomer._id);
    expect(updatedCustomer.currentBalanceMinor).toBe(250000);
  });

  it('should record a debit and decrease customer balance', async () => {
    // First give customer ₹3000 credit
    await request(app)
      .post('/api/customers/+919855555555/transactions')
      .set(adminHeaders)
      .send({ type: 'credit', amount: 3000 });

    // Customer makes a partial payment of ₹1200
    const res = await request(app)
      .post('/api/customers/+919855555555/transactions')
      .set(adminHeaders)
      .send({
        type: 'debit',
        amount: 1200, // ₹1200 -> 120000 paise
        notes: 'Partial payment'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.customer.currentBalanceMinor).toBe(180000); // ₹1800 remaining

    const updatedCustomer = await Customer.findById(testCustomer._id);
    expect(updatedCustomer.currentBalanceMinor).toBe(180000);
  });

  it('should reject a debit that exceeds the current balance with a bilingual error', async () => {
    // Current balance is ₹0
    const res = await request(app)
      .post('/api/customers/+919855555555/transactions')
      .set(adminHeaders)
      .send({
        type: 'debit',
        amount: 500
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EXCESSIVE_DEBIT');
    expect(res.body.messageEn).toMatch(/cannot exceed current outstanding balance/i);
    expect(res.body.messageHi).toMatch(/वर्तमान बकाया शेष राशि से अधिक नहीं/);
  });

  it('should verify server-side balance calculation from all credit and debit records', async () => {
    // Credit ₹1000
    await request(app)
      .post('/api/customers/+919855555555/transactions')
      .set(adminHeaders)
      .send({ type: 'credit', amount: 1000 });

    // Credit ₹500
    await request(app)
      .post('/api/customers/+919855555555/transactions')
      .set(adminHeaders)
      .send({ type: 'credit', amount: 500 });

    // Debit ₹300
    await request(app)
      .post('/api/customers/+919855555555/transactions')
      .set(adminHeaders)
      .send({ type: 'debit', amount: 300 });

    const customerRes = await request(app)
      .get('/api/customers/+919855555555')
      .set(adminHeaders);

    expect(customerRes.status).toBe(200);
    // 1000 + 500 - 300 = 1200 (120000 paise)
    expect(customerRes.body.data.customer.currentBalanceMinor).toBe(120000);
    expect(customerRes.body.data.customer.totalCreditsMinor).toBe(150000);
    expect(customerRes.body.data.customer.totalDebitsMinor).toBe(30000);
    expect(customerRes.body.data.transactions.length).toBe(3);
  });
});

