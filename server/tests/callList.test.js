const request = require('supertest');
const app = require('../src/app');
const Customer = require('../src/models/Customer');

describe('Daily Call Queue & Circular 50-Customer List', () => {
  const adminHeaders = {
    'x-test-auth': 'true',
    'x-test-role': 'admin'
  };

  it('should return call list ordered with respect to last updated date with newer customers at the end', async () => {
    // Create customers with spaced out updated times
    const c1 = await Customer.create({
      name: 'Oldest Updated Customer',
      phoneNormalized: '+919800000001',
      phoneDisplay: '+91 98000 00001',
      currentBalanceMinor: 20000,
      updatedAt: new Date('2026-01-01T10:00:00Z')
    });

    const c2 = await Customer.create({
      name: 'Middle Updated Customer',
      phoneNormalized: '+919800000002',
      phoneDisplay: '+91 98000 00002',
      currentBalanceMinor: 40000,
      updatedAt: new Date('2026-02-01T10:00:00Z')
    });

    const c3 = await Customer.create({
      name: 'Newest Customer (Should be at end)',
      phoneNormalized: '+919800000003',
      phoneDisplay: '+91 98000 00003',
      currentBalanceMinor: 60000,
      updatedAt: new Date('2026-03-01T10:00:00Z')
    });

    // Fetch with limit=2 to test page 1 (Day 1)
    const resDay1 = await request(app)
      .get('/api/customers/call-list?day=1&limit=2')
      .set(adminHeaders);

    expect(resDay1.status).toBe(200);
    expect(resDay1.body.success).toBe(true);
    expect(resDay1.body.data.length).toBe(2);
    expect(resDay1.body.data[0].name).toBe('Oldest Updated Customer');
    expect(resDay1.body.data[1].name).toBe('Middle Updated Customer');
    expect(resDay1.body.pagination.day).toBe(1);
    expect(resDay1.body.pagination.nextDay).toBe(2);

    // Fetch Day 2 (should circularly wrap around to provide limit=2)
    const resDay2 = await request(app)
      .get('/api/customers/call-list?day=2&limit=2')
      .set(adminHeaders);

    expect(resDay2.status).toBe(200);
    expect(resDay2.body.data[0].name).toBe('Newest Customer (Should be at end)');
    // Wraps around to start
    expect(resDay2.body.data[1].name).toBe('Oldest Updated Customer');
    expect(resDay2.body.pagination.nextDay).toBe(1); // Circular next day wraps to Day 1
  });

  it('should update customer remarks and save call history', async () => {
    await Customer.create({
      name: 'Ramesh Call Test',
      phoneNormalized: '+919800000010',
      phoneDisplay: '+91 98000 00010',
      currentBalanceMinor: 15000
    });

    const res = await request(app)
      .patch('/api/customers/+919800000010/remarks')
      .set(adminHeaders)
      .send({
        remark: 'Called customer, promised to pay ₹150 tomorrow'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.remarks).toBe('Called customer, promised to pay ₹150 tomorrow');
    expect(res.body.data.lastCalledAt).toBeDefined();

    // Verify in database
    const inDb = await Customer.findOne({ phoneNormalized: '+919800000010' });
    expect(inDb.remarks).toBe('Called customer, promised to pay ₹150 tomorrow');
    expect(inDb.callHistory.length).toBe(1);
    expect(inDb.callHistory[0].remark).toBe('Called customer, promised to pay ₹150 tomorrow');
  });
});

