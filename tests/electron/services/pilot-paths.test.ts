import { afterEach, describe, expect, it, vi } from 'vitest';

describe('pilot-paths', () => {
  afterEach(() => {
    delete process.env.PILOT_APP_DIR;
    vi.resetModules();
  });

  it('uses PILOT_APP_DIR when provided', async () => {
    process.env.PILOT_APP_DIR = '/tmp/pilot-spk-config';
    const module = await import('../../../electron/services/pilot-paths');
    expect(module.PILOT_APP_DIR).toBe('/tmp/pilot-spk-config');
  });

  it('falls back to the platform default when no override is set', async () => {
    const module = await import('../../../electron/services/pilot-paths');
    expect(module.PILOT_APP_DIR.length).toBeGreaterThan(0);
    expect(module.PILOT_APP_DIR).not.toBe('/tmp/pilot-spk-config');
  });
});
