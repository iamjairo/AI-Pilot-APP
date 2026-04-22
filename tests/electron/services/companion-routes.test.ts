import { createServer } from 'http';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { setupCompanionRoutes } from '../../../electron/services/companion-routes';

class FakeCompanionAuth {
  private activePairing: { pin: string; createdAt: number; expiresAt: number } | null = null;

  async pair(credential: string): Promise<string | null> {
    return this.activePairing?.pin === credential ? 'paired-token' : null;
  }

  generatePIN(): string {
    this.activePairing = {
      pin: '123456',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30_000,
    };
    return this.activePairing.pin;
  }

  getActivePairing() {
    return this.activePairing;
  }

  getDevices() {
    return [{ sessionId: 'device-1', deviceName: 'Pilot Desktop', lastSeen: Date.now() }];
  }

  async validateToken(): Promise<{ sessionId: string; deviceName: string } | null> {
    return { sessionId: 'device-1', deviceName: 'Pilot Desktop' };
  }
}

describe('setupCompanionRoutes', () => {
  const servers: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    })));
  });

  it('serves Synology admin HTML and PIN status endpoints', async () => {
    const auth = new FakeCompanionAuth();
    const app = express();
    const bundleDir = mkdtempSync(join(tmpdir(), 'pilot-companion-routes-'));
    writeFileSync(join(bundleDir, 'index.html'), '<!doctype html><html><body>Pilot</body></html>', 'utf8');

    setupCompanionRoutes(app, {
      port: 18088,
      protocol: 'https',
      reactBundlePath: bundleDir,
      auth,
    });

    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve server address');
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const html = await fetch(`${baseUrl}/synology`).then((response) => response.text());
    expect(html).toContain('Pilot Backend Admin');
    expect(html).toContain('/api/backend-admin/generate-pin');

    const initialStatus = await fetch(`${baseUrl}/api/backend-admin/status`).then((response) => response.json());
    expect(initialStatus.activePairing).toBeNull();
    expect(initialStatus.pairedDeviceCount).toBe(1);

    const generatedStatus = await fetch(`${baseUrl}/api/backend-admin/generate-pin`, {
      method: 'POST',
    }).then((response) => response.json());
    expect(generatedStatus.activePairing.pin).toBe('123456');
    expect(generatedStatus.activePairing.secondsRemaining).toBeGreaterThan(0);
  });
});
