'use strict';

const crypto = require('crypto');

/**
 * Generates a single API access key tied to a checkout session.
 * Idempotent: same sessionId always produces the same key within a
 * process lifetime (use database persistence for cross-restart idempotency).
 *
 * @param {string} sessionId
 * @param {{ id: string, email: string }} customer
 * @returns {Promise<{apiKey: string, sessionId: string, createdAt: string}>}
 */
async function generateApiAccess(sessionId, customer) {
  const salt = process.env.API_KEY_SALT;
  if (!salt) {
    throw new Error('API_KEY_SALT environment variable is required');
  }
  const apiKey = crypto
    .createHmac('sha256', salt)
    .update(`${sessionId}:${customer.id}`)
    .digest('hex');

  const access = {
    apiKey,
    sessionId,
    createdAt: new Date().toISOString(),
  };

  console.info(`[access] Generated API key for session ${sessionId}`);

  // TODO: persist to database
  return access;
}

module.exports = { generateApiAccess };
