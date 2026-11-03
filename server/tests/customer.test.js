const request = require('supertest');
const app = require('../src/app');
const Customer = require('../src/models/Customer');

describe('Customer Management Endpoints', () => {
  const adminHeaders = {
    'x-test-auth': 'true',
    'x-test-role': 'admin'
  };

  it('should successfully create a new customer and normalize phone number', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(adminHeaders)
      .send({
        name: 'Arjun Mehta',
        address: 'Sector 15, Noida',
        phone: '9876543210'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Arjun Mehta');
    expect(res.body.data.phoneNormalized).toBe('+919876543210');
    expect(res.body.data.phoneDisplay).toBe('+91 98765 43210');
    expect(res.body.data.currentBalanceMinor).toBe(0);
  });

  it('should reject invalid customer data (short name or invalid phone)', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(adminHeaders)
      .send({
        name: 'A',
        phone: '123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject duplicate phone numbers with a bilingual 409 conflict error', async () => {
    // First creation
    await request(app)
      .post('/api/customers')
      .set(adminHeaders)
      .send({
        name: 'Customer One',
        phone: '9876543210'
      });

    // Duplicate attempt (even with formatting like dashes and country code)
    const res = await request(app)
      .post('/api/customers')
      .set(adminHeaders)
      .send({
        name: 'Customer Two',
        phone: '+91 98765-43210'
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_PHONE');
    expect(res.body.messageEn).toMatch(/already exists/i);
    expect(res.body.messageHi).toMatch(/पहले से मौजूद है/);
  });

  it('should list customers with search, sort, and pagination', async () => {
    await Customer.create([
      {
        name: 'Zara Khan',
        address: 'Delhi',
        phoneNormalized: '+919811111111',
        phoneDisplay: '+91 98111 11111',
        currentBalanceMinor: 500000 // ₹5000
      },
      {
        name: 'Aarav Sharma',
        address: 'Mumbai',
        phoneNormalized: '+919822222222',
        phoneDisplay: '+91 98222 22222',
        currentBalanceMinor: 200000 // ₹2000
      }
    ]);

    // Test sort by name ascending
    const resSortName = await request(app)
      .get('/api/customers?sortBy=name_asc')
      .set(adminHeaders);

    expect(resSortName.status).toBe(200);
    expect(resSortName.body.data[0].name).toBe('Aarav Sharma');
    expect(resSortName.body.data[1].name).toBe('Zara Khan');

    // Test sort by balance descending
    const resSortBalance = await request(app)
      .get('/api/customers?sortBy=balance_desc')
      .set(adminHeaders);

    expect(resSortBalance.status).toBe(200);
    expect(resSortBalance.body.data[0].name).toBe('Zara Khan');
    expect(resSortBalance.body.data[1].name).toBe('Aarav Sharma');

    // Test search by term
    const resSearch = await request(app)
      .get('/api/customers?search=Mumbai')
      .set(adminHeaders);

    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBe(1);
    expect(resSearch.body.data[0].name).toBe('Aarav Sharma');
  });

  it('should retrieve customer account and transaction history by phone', async () => {
    await Customer.create({
      name: 'Rohan Gupta',
      address: 'Bengaluru',
      phoneNormalized: '+919833333333',
      phoneDisplay: '+91 98333 33333',
      currentBalanceMinor: 0
    });

    const res = await request(app)
      .get('/api/customers/+919833333333')
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.customer.name).toBe('Rohan Gupta');
    expect(Array.isArray(res.body.data.transactions)).toBe(true);
  });

  it('should update customer name and address, but forbid phone changes', async () => {
    await Customer.create({
      name: 'Meera Iyer',
      address: 'Chennai',
      phoneNormalized: '+919844444444',
      phoneDisplay: '+91 98444 44444'
    });

    // Valid update
    const updateRes = await request(app)
      .patch('/api/customers/+919844444444')
      .set(adminHeaders)
      .send({
        name: 'Meera Iyer Raman',
        address: 'Chennai Central'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Meera Iyer Raman');
    expect(updateRes.body.data.address).toBe('Chennai Central');

    // Attempting to change phone number
    const forbidRes = await request(app)
      .patch('/api/customers/+919844444444')
      .set(adminHeaders)
      .send({
        phone: '9999999999'
      });

    expect(forbidRes.status).toBe(400);
    expect(forbidRes.body.code).toBe('PHONE_CANNOT_BE_CHANGED');
    expect(forbidRes.body.messageEn).toMatch(/cannot be modified/i);
    expect(forbidRes.body.messageHi).toMatch(/बदला नहीं जा सकता/);
  });
});

