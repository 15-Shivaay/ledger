const request = require('supertest');
const app = require('../src/app');
const Customer = require('../src/models/Customer');
const Transaction = require('../src/models/Transaction');
const Setting = require('../src/models/Setting');

describe('Zero Balance Handling (Automatic Deletion & Archive Modes)', () => {
  const adminHeaders = {
    'x-test-auth': 'true',
    'x-test-role': 'admin'
  };

  it('DEFAULT MODE: should automatically delete account and transactions when balance reaches zero', async () => {
    // 1. Ensure setting is 'delete'
    await Setting.setSetting('zeroBalanceAction', 'delete');

    // 2. Create customer
    const createRes = await request(app)
      .post('/api/customers')
      .set(adminHeaders)
      .send({
        name: 'Gaurav Khanna',
        address: 'Pune',
        phone: '9866666666'
      });

    // 3. Add credit ₹500
    await request(app)
      .post('/api/customers/+919866666666/transactions')
      .set(adminHeaders)
      .send({ type: 'credit', amount: 500 });

    // 4. Debit exactly ₹500 bringing balance to 0
    const debitRes = await request(app)
      .post('/api/customers/+919866666666/transactions')
      .set(adminHeaders)
      .send({ type: 'debit', amount: 500 });

    expect(debitRes.status).toBe(200);
    expect(debitRes.body.accountStatus).toBe('deleted');
    expect(debitRes.body.deleted).toBe(true);
    expect(debitRes.body.code).toBe('ZERO_BALANCE_DELETED');
    expect(debitRes.body.messageEn).toMatch(/deleted because the balance reached zero/i);
    expect(debitRes.body.messageHi).toMatch(/शेष राशि शून्य होने के कारण खाता और लेनदेन इतिहास हटा दिया गया/);

    // 5. Verify customer and transactions are deleted from database
    const customerInDb = await Customer.findOne({ phoneNormalized: '+919866666666' });
    expect(customerInDb).toBeNull();

    const transactionsInDb = await Transaction.find({ customerId: createRes.body.data.id });
    expect(transactionsInDb.length).toBe(0);
  });

  it('ARCHIVE MODE: should archive account and preserve transactions when configured', async () => {
    // 1. Configure zeroBalanceAction to 'archive'
    await Setting.setSetting('zeroBalanceAction', 'archive');

    // 2. Create customer
    const createRes = await request(app)
      .post('/api/customers')
      .set(adminHeaders)
      .send({
        name: 'Deepak Joshi',
        address: 'Jaipur',
        phone: '9877777777'
      });

    const customerId = createRes.body.data.id;

    // 3. Add credit ₹1000
    await request(app)
      .post('/api/customers/+919877777777/transactions')
      .set(adminHeaders)
      .send({ type: 'credit', amount: 1000 });

    // 4. Debit ₹1000 bringing balance to 0
    const debitRes = await request(app)
      .post('/api/customers/+919877777777/transactions')
      .set(adminHeaders)
      .send({ type: 'debit', amount: 1000 });

    expect(debitRes.status).toBe(200);
    expect(debitRes.body.accountStatus).toBe('archived');
    expect(debitRes.body.archived).toBe(true);
    expect(debitRes.body.code).toBe('ZERO_BALANCE_ARCHIVED');
    expect(debitRes.body.messageEn).toMatch(/archived because the balance reached zero/i);
    expect(debitRes.body.messageHi).toMatch(/संग्रहीत/);

    // 5. Verify customer still exists in database as archived
    const customerInDb = await Customer.findOne({ phoneNormalized: '+919877777777' });
    expect(customerInDb).not.toBeNull();
    expect(customerInDb.isArchived).toBe(true);
    expect(customerInDb.currentBalanceMinor).toBe(0);

    // 6. Verify transaction history is preserved
    const transactionsInDb = await Transaction.find({ customerId });
    expect(transactionsInDb.length).toBe(2);
  });
});

