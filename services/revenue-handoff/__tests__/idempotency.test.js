'use strict';

const { isDuplicate } = require('../idempotency');

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
});
