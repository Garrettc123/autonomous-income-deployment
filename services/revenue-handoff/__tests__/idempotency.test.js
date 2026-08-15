'use strict';

const { isDuplicate, _evictOldest } = require('../idempotency');

describe('idempotency', () => {
  test('first call for a new eventId returns false', () => {
    expect(isDuplicate('evt_test_unique_1')).toBe(false);
  });

  test('second call for the same eventId returns true', () => {
    isDuplicate('evt_test_unique_2');
    expect(isDuplicate('evt_test_unique_2')).toBe(true);
  });

  test('different eventIds are independent', () => {
    expect(isDuplicate('evt_a')).toBe(false);
    expect(isDuplicate('evt_b')).toBe(false);
    expect(isDuplicate('evt_a')).toBe(true);
    expect(isDuplicate('evt_b')).toBe(true);
  });

  test('expired entry is not treated as duplicate', () => {
    jest.useFakeTimers();
    const eventId = 'evt_ttl_test';
    isDuplicate(eventId); // mark as processed

    // Advance time beyond TTL (24 h + 1 ms)
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(isDuplicate(eventId)).toBe(false);

    jest.useRealTimers();
  });

  test('_evictOldest does not throw on empty store', () => {
    expect(() => _evictOldest()).not.toThrow();
  });
});
