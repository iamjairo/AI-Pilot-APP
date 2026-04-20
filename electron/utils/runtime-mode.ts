const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ENABLED_VALUES.has(value.trim().toLowerCase());
}

export function isBackendOnlyMode(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env): boolean {
  return argv.includes('--backend-only') || isEnabled(env.PILOT_BACKEND_ONLY);
}

export function getRemoteBackendUrl(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env): string | null {
  const argValue = argv.find((arg) => arg.startsWith('--remote-backend-url='));
  if (argValue) {
    const value = argValue.slice('--remote-backend-url='.length).trim();
    return value.length > 0 ? value : null;
  }

  const envValue = env.PILOT_REMOTE_BACKEND_URL?.trim();
  return envValue ? envValue : null;
}

export function resolveRemoteBackendUrl(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
  settingsUrl?: string
): string | null {
  const configuredUrl = settingsUrl?.trim();
  return getRemoteBackendUrl(argv, env) ?? (configuredUrl ? configuredUrl : null);
}
