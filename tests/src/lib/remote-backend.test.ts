import { describe, expect, it } from 'vitest';
import { resolveRemoteBackendConfig, toHttpUrl, toWebSocketUrl } from '../../../src/lib/remote-backend';

describe('remote backend config', () => {
  it('returns disabled config when no query params are present', () => {
    expect(resolveRemoteBackendConfig('')).toEqual({
      enabled: false,
      httpUrl: null,
      wsUrl: null,
    });
  });

  it('derives websocket url from an http backend url', () => {
    expect(resolveRemoteBackendConfig('?remoteBackendUrl=https://nas.local:18088')).toEqual({
      enabled: true,
      httpUrl: 'https://nas.local:18088/',
      wsUrl: 'wss://nas.local:18088/',
    });
  });

  it('derives http url from a websocket backend url', () => {
    expect(resolveRemoteBackendConfig('?remoteBackendWsUrl=wss://nas.local:18088')).toEqual({
      enabled: true,
      httpUrl: 'https://nas.local:18088/',
      wsUrl: 'wss://nas.local:18088/',
    });
  });

  it('normalizes both urls when both are present', () => {
    expect(resolveRemoteBackendConfig('?remoteBackendUrl=http://127.0.0.1:18088&remoteBackendWsUrl=ws://127.0.0.1:18088')).toEqual({
      enabled: true,
      httpUrl: 'http://127.0.0.1:18088/',
      wsUrl: 'ws://127.0.0.1:18088/',
    });
  });

  it('converts http and ws protocols correctly', () => {
    expect(toWebSocketUrl('http://example.com')).toBe('ws://example.com/');
    expect(toWebSocketUrl('https://example.com')).toBe('wss://example.com/');
    expect(toHttpUrl('ws://example.com')).toBe('http://example.com/');
    expect(toHttpUrl('wss://example.com')).toBe('https://example.com/');
  });
});
