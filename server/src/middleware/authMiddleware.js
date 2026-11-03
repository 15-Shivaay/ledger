const { getAuth } = require('@clerk/express');
const { isUserAdmin } = require('../config/clerk');
const { getBilingualMessage } = require('../utils/i18nMessages');

/**
 * Express middleware to verify authentication and enforce admin authorization.
 * Returns 401 for unauthenticated requests.
 * Returns 403 for authenticated users lacking admin role.
 */
async function requireAdminAuth(req, res, next) {
  try {
    // 1. Support test environment bypass headers during automated tests
    if (process.env.NODE_ENV === 'test') {
      const testAuthHeader = req.headers['x-test-auth'];
      const testRoleHeader = req.headers['x-test-role'];
      const testUserId = req.headers['x-test-user-id'] || 'test_admin_user_id';

      if (!testAuthHeader || testAuthHeader === 'false') {
        const msg = getBilingualMessage('AUTH_REQUIRED');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi
        });
      }

      if (testRoleHeader !== 'admin') {
        const msg = getBilingualMessage('ADMIN_ACCESS_REQUIRED');
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi
        });
      }

      // Valid test admin
      req.auth = {
        userId: testUserId,
        sessionId: 'test_session_id',
        role: 'admin',
        sessionClaims: { metadata: { role: 'admin' } }
      };
      return next();
    }

    // 2. Production Clerk authentication verification
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      const msg = getBilingualMessage('AUTH_REQUIRED');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    // 3. Admin authorization verification
    const isAdmin = await isUserAdmin(auth.userId, auth.sessionClaims);
    if (!isAdmin) {
      const msg = getBilingualMessage('ADMIN_ACCESS_REQUIRED');
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    // Admin verified, attach auth details to request
    req.adminUser = {
      userId: auth.userId,
      sessionId: auth.sessionId
    };

    return next();
  } catch (error) {
    console.error('Error in requireAdminAuth middleware:', error);
    const msg = getBilingualMessage('INVALID_SESSION');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: msg.code,
      messageEn: msg.messageEn,
      messageHi: msg.messageHi
    });
  }
}

module.exports = {
  requireAdminAuth
};

