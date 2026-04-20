export interface RemoteBackendConfig {
  enabled: boolean;
  httpUrl: string | null;
  wsUrl: string | null;
}

function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toWebSocketUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol === 'https:') {
    parsed.protocol = 'wss:';
  } else if (parsed.protocol === 'http:') {
    parsed.protocol = 'ws:';
  }
  return parsed.toString();
}

export function toHttpUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol === 'wss:') {
    parsed.protocol = 'https:';
  } else if (parsed.protocol === 'ws:') {
    parsed.protocol = 'http:';
  }
  return parsed.toString();
}

export function resolveRemoteBackendConfig(search: string): RemoteBackendConfig {
  const params = new URLSearchParams(search);
  const remoteBackendUrl = normalizeUrl(params.get('remoteBackendUrl'));
  const remoteBackendWsUrl = normalizeUrl(params.get('remoteBackendWsUrl'));

  const enabled = Boolean(remoteBackendUrl || remoteBackendWsUrl);
  if (!enabled) {
    return { enabled: false, httpUrl: null, wsUrl: null };
  }

  const httpUrl = remoteBackendUrl
    ? toHttpUrl(remoteBackendUrl)
    : (remoteBackendWsUrl ? toHttpUrl(remoteBackendWsUrl) : null);
  const wsUrl = remoteBackendWsUrl
    ? toWebSocketUrl(remoteBackendWsUrl)
    : (remoteBackendUrl ? toWebSocketUrl(remoteBackendUrl) : null);

  return { enabled: true, httpUrl, wsUrl };
}
