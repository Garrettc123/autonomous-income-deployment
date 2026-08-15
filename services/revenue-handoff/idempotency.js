'use strict';

/**
 * In-memory idempotency store.
 *
 * In production this should be backed by Redis or a database table.
 * The interface is intentionally swappable: replace `store` with any
 * Map-like object that exposes has/set/get.
 */
const store = new Map();

/**
 * Returns true if the event has already been processed.
 * Marks the event as processed on first call.
 *
 * @param {string} eventId  Stripe event id (evt_…)
 * @returns {boolean}
 */
function isDuplicate(eventId) {
  if (store.has(eventId)) {
    return true;
  }
  store.set(eventId, Date.now());
  return false;
}

module.exports = { isDuplicate };
