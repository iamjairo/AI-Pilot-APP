import { describe, expect, it } from 'vitest';
import { getRemoteBackendUrl, isBackendOnlyMode, resolveRemoteBackendUrl } from '../../../electron/utils/runtime-mode';

describe('isBackendOnlyMode', () => {
  it('returns false by default', () => {
    expect(isBackendOnlyMode(['electron', '.'], {})).toBe(false);
  });

  it('returns true when the backend-only CLI flag is present', () => {
    expect(isBackendOnlyMode(['electron', '.', '--backend-only'], {})).toBe(true);
  });

  it('returns true when PILOT_BACKEND_ONLY is enabled', () => {
    expect(isBackendOnlyMode(['electron', '.'], { PILOT_BACKEND_ONLY: 'true' })).toBe(true);
  });

  it('accepts common truthy environment values', () => {
    expect(isBackendOnlyMode(['electron', '.'], { PILOT_BACKEND_ONLY: '1' })).toBe(true);
    expect(isBackendOnlyMode(['electron', '.'], { PILOT_BACKEND_ONLY: 'YES' })).toBe(true);
    expect(isBackendOnlyMode(['electron', '.'], { PILOT_BACKEND_ONLY: 'On' })).toBe(true);
  });

  it('prefers explicit false-like env values as disabled when flag is absent', () => {
    expect(isBackendOnlyMode(['electron', '.'], { PILOT_BACKEND_ONLY: 'false' })).toBe(false);
    expect(isBackendOnlyMode(['electron', '.'], { PILOT_BACKEND_ONLY: '0' })).toBe(false);
  });
});

describe('getRemoteBackendUrl', () => {
  it('returns null by default', () => {
    expect(getRemoteBackendUrl(['electron', '.'], {})).toBeNull();
  });

  it('reads the remote backend url from CLI args', () => {
    expect(getRemoteBackendUrl(['electron', '.', '--remote-backend-url=https://nas.local:18088'], {})).toBe('https://nas.local:18088');
  });

  it('reads the remote backend url from env', () => {
    expect(getRemoteBackendUrl(['electron', '.'], { PILOT_REMOTE_BACKEND_URL: 'https://nas.local:18088' })).toBe('https://nas.local:18088');
  });
});

describe('resolveRemoteBackendUrl', () => {
  it('prefers CLI and env over saved settings', () => {
    expect(resolveRemoteBackendUrl(
      ['electron', '.', '--remote-backend-url=https://cli.local:18088'],
      { PILOT_REMOTE_BACKEND_URL: 'https://env.local:18088' },
      'https://settings.local:18088'
    )).toBe('https://cli.local:18088');

    expect(resolveRemoteBackendUrl(
      ['electron', '.'],
      { PILOT_REMOTE_BACKEND_URL: 'https://env.local:18088' },
      'https://settings.local:18088'
    )).toBe('https://env.local:18088');
  });

  it('falls back to saved settings when no override is present', () => {
    expect(resolveRemoteBackendUrl(['electron', '.'], {}, 'https://settings.local:18088')).toBe('https://settings.local:18088');
  });
});
