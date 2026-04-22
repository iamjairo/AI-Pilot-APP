import { execSync, spawn, ChildProcess } from 'child_process';
import { accessSync, constants, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { networkInterfaces } from 'os';
import { PILOT_APP_DIR } from './pilot-paths';

export interface CaddyProxyInfo {
  url: string;
  process: ChildProcess;
  configPath: string;
  dispose: () => void;
}

function getLanAddress(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

export function findCaddyBinary(): string | null {
  const candidates = [
    process.platform === 'win32' ? 'where caddy' : 'which caddy',
    '/var/packages/caddy/target/app/bin/caddy',
    '/volume1/@appstore/caddy/app/bin/caddy',
  ];

  try {
    const whichResult = execSync(candidates[0], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (whichResult) {
      return whichResult.split(/\r?\n/)[0];
    }
  } catch {
    // fall through to DSM package paths
  }

  for (const candidate of candidates.slice(1)) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // keep searching
    }
  }

  return null;
}

function resolveSiteAddress(): string {
  return process.env.PILOT_CADDY_SITE_ADDRESS?.trim() || ':20181';
}

function resolvePublicUrl(siteAddress: string): string {
  if (/^https?:\/\//i.test(siteAddress)) {
    return siteAddress;
  }

  if (siteAddress.startsWith(':')) {
    const host = getLanAddress() || 'localhost';
    return `http://${host}${siteAddress}`;
  }

  return `https://${siteAddress}`;
}

export async function setupCaddyProxy(
  port: number,
  onTunnelOutput?: (provider: 'tailscale' | 'cloudflare' | 'caddy', text: string) => void
): Promise<CaddyProxyInfo | null> {
  const caddyBinary = findCaddyBinary();
  if (!caddyBinary) {
    return null;
  }

  const caddyDir = join(PILOT_APP_DIR, 'caddy');
  mkdirSync(caddyDir, { recursive: true });

  const siteAddress = resolveSiteAddress();
  const configPath = join(caddyDir, 'Caddyfile');
  writeFileSync(
    configPath,
    `${siteAddress} {\n    reverse_proxy localhost:${port}\n}\n`,
    'utf8'
  );

  return new Promise((resolve) => {
    const proc = spawn(caddyBinary, ['run', '--config', configPath, '--adapter', 'caddyfile'], {
      stdio: 'pipe',
    });

    let settled = false;
    let output = '';
    const readyTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        url: resolvePublicUrl(siteAddress),
        process: proc,
        configPath,
        dispose: () => {
          if (!proc.killed) {
            proc.kill();
          }
        },
      });
    }, 2000);

    const onData = (data: Buffer) => {
      const text = data.toString();
      output += text;
      onTunnelOutput?.('caddy', text);
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    proc.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(readyTimer);
      resolve(null);
    });

    proc.on('exit', () => {
      if (settled) return;
      settled = true;
      clearTimeout(readyTimer);
      console.error('[CompanionRemote] Caddy exited before becoming ready:', output.trim());
      resolve(null);
    });
  });
}
