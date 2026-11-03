const { clerkClient } = require('@clerk/express');

/**
 * Checks whether a given Clerk user is an authorized admin.
 * Evaluates publicMetadata.role === 'admin', privateMetadata.role === 'admin',
 * session claims, or organization admin role.
 * 
 * @param {string} userId - Clerk user ID
 * @param {object} [sessionClaims] - Decoded Clerk JWT session claims
 * @returns {Promise<boolean>}
 */
async function isUserAdmin(userId, sessionClaims = {}) {
  if (!userId) return false;

  // 1. First check decoded session claims (fastest, no extra network call)
  const metadata = sessionClaims.metadata || sessionClaims.publicMetadata || {};
  if (metadata.role === 'admin' || sessionClaims.role === 'admin') {
    return true;
  }

  // Check organization role if using Clerk Organizations
  if (sessionClaims.org_role === 'org:admin' || sessionClaims.org_role === 'admin') {
    return true;
  }

  // 2. Fetch full user object from Clerk API to check user.publicMetadata
  try {
    const user = await clerkClient.users.getUser(userId);
    if (!user) return false;

    if (user.publicMetadata && user.publicMetadata.role === 'admin') {
      return true;
    }
    if (user.privateMetadata && user.privateMetadata.role === 'admin') {
      return true;
    }
  } catch (error) {
    console.error('Failed to verify Clerk user admin status:', error.message);
    return false;
  }

  return false;
}

module.exports = {
  isUserAdmin
};

