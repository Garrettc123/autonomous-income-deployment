'use strict';

const { generateApiAccess } = require('../access');

describe('generateApiAccess', () => {
  beforeEach(() => {
    process.env.API_KEY_SALT = 'test-salt';
  });

  test('returns an object with apiKey, sessionId, and createdAt', async () => {
    const access = await generateApiAccess('cs_test_1', { id: 'cus_1', email: 'a@b.com' });
    expect(access).toMatchObject({
      sessionId: 'cs_test_1',
    });
    expect(typeof access.apiKey).toBe('string');
    expect(access.apiKey).toHaveLength(64); // sha256 hex
    expect(typeof access.createdAt).toBe('string');
  });

  test('same input produces the same apiKey (deterministic)', async () => {
    const a1 = await generateApiAccess('cs_same', { id: 'cus_same', email: 'x@y.com' });
    const a2 = await generateApiAccess('cs_same', { id: 'cus_same', email: 'x@y.com' });
    expect(a1.apiKey).toBe(a2.apiKey);
  });

  test('different sessions produce different apiKeys', async () => {
    const a1 = await generateApiAccess('cs_x', { id: 'cus_1', email: 'x@y.com' });
    const a2 = await generateApiAccess('cs_y', { id: 'cus_1', email: 'x@y.com' });
    expect(a1.apiKey).not.toBe(a2.apiKey);
  });
});
