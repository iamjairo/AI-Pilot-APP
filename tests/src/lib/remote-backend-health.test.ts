import { describe, expect, it, vi } from 'vitest';
import { fetchRemoteBackendHealth, getRemoteBackendHealthUrl } from '../../../src/lib/remote-backend-health';

describe('remote-backend-health', () => {
  it('builds the backend health URL from a base URL', () => {
    expect(getRemoteBackendHealthUrl('https://nas.local:18088')).toBe('https://nas.local:18088/api/backend-health');
  });

  it('parses a valid backend health response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        service: 'pilot-backend',
        appVersion: '0.0.0',
        protocol: 'https',
        tokenRequired: true,
        companion: true,
      }),
    });

    await expect(fetchRemoteBackendHealth('https://nas.local:18088', fetchImpl)).resolves.toEqual({
      ok: true,
      service: 'pilot-backend',
      appVersion: '0.0.0',
      protocol: 'https',
      tokenRequired: true,
      companion: true,
    });
  });

  it('rejects an unavailable backend', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(fetchRemoteBackendHealth('https://nas.local:18088', fetchImpl)).rejects.toThrow(
      'Backend health check failed (503)'
    );
  });
});
