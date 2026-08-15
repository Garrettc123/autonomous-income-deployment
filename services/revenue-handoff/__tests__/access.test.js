'use strict';

describe('generateApiAccess', () => {
  let generateApiAccess;

  beforeEach(() => {
    jest.resetModules();
    process.env.API_KEY_SALT = 'test-salt';
    generateApiAccess = require('../access').generateApiAccess;
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

  test('works without a pre-set API_KEY_SALT (auto-generates one)', async () => {
    jest.resetModules();
    delete process.env.API_KEY_SALT;
    const { generateApiAccess: gen } = require('../access');
    const access = await gen('cs_auto', { id: 'cus_auto', email: 'a@b.com' });
    expect(access.apiKey).toHaveLength(64);
  });
});
