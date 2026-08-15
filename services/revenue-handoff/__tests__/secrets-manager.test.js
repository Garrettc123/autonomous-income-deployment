'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('secrets-manager', () => {
  let tmpDir;
  let originalEnv;
  let secretsManager;

  beforeEach(() => {
    // Isolate each test with a fresh temp dir and clean env
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-test-'));
    originalEnv = { ...process.env };
    delete process.env.API_KEY_SALT;
    process.env.SECRETS_DIR = tmpDir;

    // Force fresh module load
    jest.resetModules();
    secretsManager = require('../secrets-manager');
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('auto-generates a salt when no file or env var exists', () => {
    const salt = secretsManager.getApiKeySalt();
    expect(typeof salt).toBe('string');
    expect(salt).toHaveLength(64); // 32 bytes hex
  });

  test('persists the auto-generated salt to file', () => {
    const salt = secretsManager.getApiKeySalt();
    const saved = fs.readFileSync(path.join(tmpDir, 'api-key-salt'), 'utf8').trim();
    expect(saved).toBe(salt);
  });

  test('returns the same salt on repeated calls (in-memory cache)', () => {
    const s1 = secretsManager.getApiKeySalt();
    const s2 = secretsManager.getApiKeySalt();
    expect(s1).toBe(s2);
  });

  test('loads salt from env var when set', () => {
    process.env.API_KEY_SALT = 'env-provided-salt';
    jest.resetModules();
    const sm = require('../secrets-manager');
    expect(sm.getApiKeySalt()).toBe('env-provided-salt');
  });

  test('loads salt from file when file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'api-key-salt'), 'file-salt', { mode: 0o600 });
    jest.resetModules();
    const sm = require('../secrets-manager');
    expect(sm.getApiKeySalt()).toBe('file-salt');
  });

  test('file takes priority over env var', () => {
    process.env.API_KEY_SALT = 'env-salt';
    fs.writeFileSync(path.join(tmpDir, 'api-key-salt'), 'file-wins', { mode: 0o600 });
    jest.resetModules();
    const sm = require('../secrets-manager');
    expect(sm.getApiKeySalt()).toBe('file-wins');
  });
});
