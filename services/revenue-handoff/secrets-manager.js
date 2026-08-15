'use strict';

/**
 * Auto-secret bootstrap for the revenue-handoff service.
 *
 * Priority order for API_KEY_SALT:
 *   1. SECRETS_DIR/<secret-name> file  (Kubernetes secret volume mount)
 *   2. Environment variable API_KEY_SALT
 *   3. Auto-generated random value persisted to SECRETS_DIR/api-key-salt
 *
 * The auto-generated path is safe for local dev / first-boot scenarios.
 * In production, inject the value via a Kubernetes Secret volume or env var.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECRETS_DIR = process.env.SECRETS_DIR ?? path.join(process.cwd(), '.secrets');
const SALT_FILE = path.join(SECRETS_DIR, 'api-key-salt');

let _salt = null;

/**
 * Returns the API key salt, auto-generating and persisting it on first call
 * if neither a file nor the API_KEY_SALT env var is present.
 *
 * @returns {string}
 */
function getApiKeySalt() {
  if (_salt) return _salt;

  // 1. Kubernetes-style secret file mount
  if (fs.existsSync(SALT_FILE)) {
    _salt = fs.readFileSync(SALT_FILE, 'utf8').trim();
    console.info('[secrets] Loaded API_KEY_SALT from file');
    return _salt;
  }

  // 2. Environment variable
  if (process.env.API_KEY_SALT) {
    _salt = process.env.API_KEY_SALT;
    console.info('[secrets] Loaded API_KEY_SALT from environment');
    return _salt;
  }

  // 3. Auto-generate a random 256-bit salt and persist it
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(SALT_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    console.info(`[secrets] Auto-generated API_KEY_SALT saved to ${SALT_FILE}`);
  } catch (err) {
    // Write failed (read-only fs in some envs) – keep in memory only
    console.warn(`[secrets] Could not persist API_KEY_SALT (${err.message}); using in-memory value`);
  }

  _salt = generated;
  return _salt;
}

/**
 * Resets the in-memory cached salt.  Used only in tests.
 */
function _resetForTests() {
  _salt = null;
}

module.exports = { getApiKeySalt, _resetForTests };
