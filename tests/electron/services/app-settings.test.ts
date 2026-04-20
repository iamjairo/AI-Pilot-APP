import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getEffectiveCompanionSettings', () => {
  afterEach(() => {
    delete process.env.PILOT_COMPANION_PORT;
    delete process.env.PILOT_COMPANION_PROTOCOL;
    delete process.env.PILOT_COMPANION_AUTO_START;
    delete process.env.PILOT_APP_DIR;
    vi.resetModules();
  });

  it('uses saved settings when no environment overrides are present', async () => {
    const tmpDir = `/tmp/pilot-settings-${Date.now()}`;
    process.env.PILOT_APP_DIR = tmpDir;
    const fs = await import('fs');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(`${tmpDir}/app-settings.json`, JSON.stringify({
      companionPort: 18123,
      companionProtocol: 'http',
      companionAutoStart: true,
    }));

    const module = await import('../../../electron/services/app-settings');
    expect(module.getEffectiveCompanionSettings()).toEqual({
      port: 18123,
      protocol: 'http',
      autoStart: true,
    });
  });

  it('prefers environment overrides over saved settings', async () => {
    process.env.PILOT_COMPANION_PORT = '19088';
    process.env.PILOT_COMPANION_PROTOCOL = 'http';
    process.env.PILOT_COMPANION_AUTO_START = 'true';

    const module = await import('../../../electron/services/app-settings');
    expect(module.getEffectiveCompanionSettings()).toEqual({
      port: 19088,
      protocol: 'http',
      autoStart: true,
    });
  });
});
