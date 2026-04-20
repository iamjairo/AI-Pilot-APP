import type { RemoteBackendHealthResponse } from '../../shared/types';

export function getRemoteBackendHealthUrl(baseUrl: string): string {
  return new URL('/api/backend-health', baseUrl).toString();
}

export async function fetchRemoteBackendHealth(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<RemoteBackendHealthResponse> {
  const response = await fetchImpl(getRemoteBackendHealthUrl(baseUrl), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed (${response.status})`);
  }

  const payload = await response.json() as Partial<RemoteBackendHealthResponse>;
  if (!payload.ok || payload.service !== 'pilot-backend') {
    throw new Error('Invalid backend health response');
  }
  if (typeof payload.appVersion !== 'string' || payload.appVersion.length === 0) {
    throw new Error('Invalid backend health response');
  }

  return payload as RemoteBackendHealthResponse;
}
