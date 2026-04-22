function normalizeProtocol(protocol: string): string | null {
  switch (protocol) {
    case 'https:':
    case 'wss:':
      return 'secure';
    case 'http:':
    case 'ws:':
      return 'insecure';
    default:
      return null;
  }
}

function getEffectivePort(url: URL): string {
  if (url.port) {
    return url.port;
  }

  switch (url.protocol) {
    case 'https:':
    case 'wss:':
      return '443';
    case 'http:':
    case 'ws:':
      return '80';
    default:
      return '';
  }
}

function parseUrl(value: string | null): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function shouldTrustRemoteBackendCertificate(
  requestUrl: string,
  configuredRemoteBackendUrl: string | null
): boolean {
  const request = parseUrl(requestUrl);
  const configured = parseUrl(configuredRemoteBackendUrl);

  if (!request || !configured) {
    return false;
  }

  if (normalizeProtocol(request.protocol) !== 'secure') {
    return false;
  }

  if (normalizeProtocol(configured.protocol) !== 'secure') {
    return false;
  }

  return request.hostname === configured.hostname
    && getEffectivePort(request) === getEffectivePort(configured);
}
