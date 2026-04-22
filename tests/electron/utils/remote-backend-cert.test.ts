import { describe, expect, it } from 'vitest';
import { shouldTrustRemoteBackendCertificate } from '../../../electron/utils/remote-backend-cert';

describe('shouldTrustRemoteBackendCertificate', () => {
  it('allows secure requests to the configured backend host and port', () => {
    expect(
      shouldTrustRemoteBackendCertificate(
        'https://nas.local:18088/api/backend-health',
        'https://nas.local:18088'
      )
    ).toBe(true);

    expect(
      shouldTrustRemoteBackendCertificate(
        'wss://nas.local:18088/ws',
        'https://nas.local:18088'
      )
    ).toBe(true);
  });

  it('rejects requests for a different host or port', () => {
    expect(
      shouldTrustRemoteBackendCertificate(
        'https://other.local:18088/api/backend-health',
        'https://nas.local:18088'
      )
    ).toBe(false);

    expect(
      shouldTrustRemoteBackendCertificate(
        'https://nas.local:443/api/backend-health',
        'https://nas.local:18088'
      )
    ).toBe(false);
  });

  it('rejects invalid or insecure URLs', () => {
    expect(
      shouldTrustRemoteBackendCertificate(
        'http://nas.local:18088/api/backend-health',
        'https://nas.local:18088'
      )
    ).toBe(false);

    expect(
      shouldTrustRemoteBackendCertificate(
        'not-a-url',
        'https://nas.local:18088'
      )
    ).toBe(false);
  });
});
