const request = require('supertest');
const app = require('../src/app');

describe('Authentication & Admin Authorization Endpoints', () => {
  it('should return 401 Unauthorized with bilingual message for unauthenticated request', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.messageEn).toMatch(/Authentication required/i);
    expect(res.body.messageHi).toMatch(/प्रमाणीकरण आवश्यक है/);
  });

  it('should return 403 Forbidden with bilingual message for non-admin user', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('x-test-auth', 'true')
      .set('x-test-role', 'member');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.messageEn).toMatch(/Admin access required/i);
    expect(res.body.messageHi).toMatch(/व्यवस्थापक/);
  });

  it('should allow access to dashboard for authorized admin user', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('x-test-auth', 'true')
      .set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('activeCustomerCount');
    expect(res.body.data).toHaveProperty('totalOutstandingMinor');
  });

  it('should allow unauthenticated access to health check endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

