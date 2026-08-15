'use strict';

/**
 * In-memory idempotency store with TTL expiry and size cap.
 *
 * In production this should be backed by Redis or a database table.
 * The interface is intentionally swappable: replace `store` with any
 * Map-like object that exposes has/set/get/delete/keys.
 *
 * TTL: entries older than EVENT_TTL_MS are ignored as stale duplicates
 *      (Stripe guarantees delivery within 72 h, so 24 h is conservative).
 * Cap: once MAX_STORE_SIZE is reached the oldest 10 % of entries are
 *      evicted to prevent unbounded memory growth.
 */

const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STORE_SIZE = 10_000;
const EVICT_COUNT = Math.ceil(MAX_STORE_SIZE * 0.1);

const store = new Map();

/**
 * Evict the EVICT_COUNT oldest entries from the store.
 * @private
 */
function _evictOldest() {
  let removed = 0;
  for (const key of store.keys()) {
    store.delete(key);
    if (++removed >= EVICT_COUNT) break;
  }
}

/**
 * Returns true if the event has already been processed (or is too old to
 * be retried). Marks the event as processed on first call.
 *
 * @param {string} eventId  Stripe event id (evt_…)
 * @returns {boolean}
 */
function isDuplicate(eventId) {
  const now = Date.now();

  if (store.has(eventId)) {
    const ts = store.get(eventId);
    // Treat unexpectedly stale entries as expired (not duplicates)
    return now - ts < EVENT_TTL_MS;
  }

  // Evict oldest entries before inserting if we're at capacity
  if (store.size >= MAX_STORE_SIZE) {
    _evictOldest();
  }

  store.set(eventId, now);
  return false;
}

module.exports = { isDuplicate, _evictOldest };
