import { describe, expect, it } from 'vitest';
import { getRemoteBackendCompatibility, PILOT_APP_VERSION } from '../../../src/lib/remote-backend-compatibility';

describe('remote-backend-compatibility', () => {
  it('accepts matching backend versions', () => {
    expect(getRemoteBackendCompatibility({
      ok: true,
      service: 'pilot-backend',
      appVersion: PILOT_APP_VERSION,
      protocol: 'https',
      tokenRequired: true,
      companion: true,
    })).toEqual({
      status: 'compatible',
      message: `Compatible with Pilot ${PILOT_APP_VERSION}`,
    });
  });

  it('flags mismatched backend versions', () => {
    expect(getRemoteBackendCompatibility({
      ok: true,
      service: 'pilot-backend',
      appVersion: '9.9.9',
      protocol: 'https',
      tokenRequired: true,
      companion: true,
    }).status).toBe('incompatible');
  });
});
