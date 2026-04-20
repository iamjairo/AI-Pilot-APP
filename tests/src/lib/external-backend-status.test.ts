import { describe, expect, it } from 'vitest';
import { deriveExternalBackendStatus } from '../../../src/lib/external-backend-status';

describe('deriveExternalBackendStatus', () => {
  it('reports disabled when external backend mode is off', () => {
    expect(deriveExternalBackendStatus({
      enabled: false,
      isCompanion: false,
      hasToken: false,
      httpUrl: null,
      authenticated: false,
    })).toEqual({
      enabled: false,
      isCompanion: false,
      hasToken: false,
      httpUrl: null,
      state: 'disabled',
    });
  });

  it('requires pairing when enabled without a token', () => {
    expect(deriveExternalBackendStatus({
      enabled: true,
      isCompanion: false,
      hasToken: false,
      httpUrl: 'https://nas.local:18088/',
      authenticated: false,
    }).state).toBe('unpaired');
  });

  it('reports connecting while a paired backend is still authenticating', () => {
    expect(deriveExternalBackendStatus({
      enabled: true,
      isCompanion: true,
      hasToken: true,
      httpUrl: 'https://nas.local:18088/',
      authenticated: false,
    }).state).toBe('connecting');
  });

  it('reports connected once authentication succeeds', () => {
    expect(deriveExternalBackendStatus({
      enabled: true,
      isCompanion: false,
      hasToken: true,
      httpUrl: 'https://nas.local:18088/',
      authenticated: true,
    }).state).toBe('connected');
  });
});
