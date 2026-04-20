import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import packageJson from '../../package.json';
import { initLogger, getLogger, shutdownLogger } from '../services/logger';
import { StandaloneBackendRuntime } from './runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimeRoot = resolve(process.env.PILOT_APP_ROOT ?? resolve(__dirname, '..'));
const rendererDir = resolve(process.env.PILOT_RENDERER_DIR ?? resolve(runtimeRoot, 'renderer'));
const docsDir = resolve(process.env.PILOT_DOCS_DIR ?? resolve(runtimeRoot, '../docs/user'));

const backendRuntime = new StandaloneBackendRuntime();

async function main(): Promise<void> {
  initLogger();
  const log = getLogger('standalone-backend');

  log.info('Pilot standalone backend starting', {
    version: packageJson.version,
    platform: process.platform,
    pid: process.pid,
    runtimeRoot,
    rendererDir,
    docsDir,
    pilotAppDir: process.env.PILOT_APP_DIR,
  });

  await backendRuntime.start({
    docsDir,
    reactBundlePath: rendererDir,
  });
}

async function shutdown(signal: string): Promise<void> {
  const log = getLogger('standalone-backend');
  log.info(`Pilot standalone backend shutting down (${signal})`);
  backendRuntime.dispose();
  shutdownLogger();
}

process.on('SIGINT', () => {
  void shutdown('SIGINT').finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM').finally(() => process.exit(0));
});

void main().catch(async (error) => {
  console.error('[StandaloneBackend] Failed to start:', error);
  await shutdown('startup-error');
  process.exit(1);
});
