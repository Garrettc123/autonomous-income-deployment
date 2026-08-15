'use strict';

const { upsertCustomer } = require('../customer');

describe('upsertCustomer', () => {
  test('extracts email and name from customer_details', async () => {
    const session = {
      id: 'cs_test_1',
      customer: 'cus_test_1',
      amount_total: 4700,
      currency: 'usd',
      customer_details: { email: 'test@example.com', name: 'Test User' },
    };
    const result = await upsertCustomer(session);
    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
    expect(result.id).toBe('cus_test_1');
    expect(result.amountTotal).toBe(4700);
    expect(result.currency).toBe('USD');
  });

  test('falls back to customer_email when customer_details is absent', async () => {
    const session = {
      id: 'cs_test_2',
      customer: null,
      amount_total: 53800,
      currency: 'usd',
      customer_email: 'fallback@example.com',
    };
    const result = await upsertCustomer(session);
    expect(result.email).toBe('fallback@example.com');
    expect(result.id).toBe('cs_test_2');
  });

  test('throws when email is missing', async () => {
    const session = {
      id: 'cs_test_noemail',
      customer: 'cus_1',
      amount_total: 1000,
      currency: 'usd',
    };
    await expect(upsertCustomer(session)).rejects.toThrow(/Invalid or missing email/);
  });

  test('throws when email format is invalid', async () => {
    const session = {
      id: 'cs_test_bademail',
      customer: 'cus_2',
      amount_total: 1000,
      currency: 'usd',
      customer_details: { email: 'not-an-email', name: 'Bad' },
    };
    await expect(upsertCustomer(session)).rejects.toThrow(/Invalid or missing email/);
  });
});
