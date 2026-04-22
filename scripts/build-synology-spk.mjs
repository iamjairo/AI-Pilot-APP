import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const rootDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const wettyDockerImage = process.env.WETTY_DOCKER_IMAGE || 'node:20-bullseye';
const wettyDockerPlatform = process.env.WETTY_DOCKER_PLATFORM || 'linux/amd64';

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function parseArgs(argv) {
  const options = {
    app: 'pilot',
    arch: 'x86_64',
    outputDir: path.join(rootDir, 'release', 'synology'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--app' && next) {
      options.app = next;
      i += 1;
    } else if (arg === '--arch' && next) {
      options.arch = next;
      i += 1;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = path.resolve(next);
      i += 1;
    }
  }

  return options;
}

function writeFile(targetPath, contents, mode) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents, 'utf8');
  if (mode) {
    fs.chmodSync(targetPath, mode);
  }
}

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(sourcePath), destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function downloadFile(url, destination) {
  runCommand('curl', ['-fsSL', url, '-o', destination]);
}

function extractTarball(archivePath, destination) {
  fs.mkdirSync(destination, { recursive: true });
  runCommand('tar', ['-xf', archivePath, '-C', destination]);
}

function findSingleDirectory(parentDir) {
  const entries = fs.readdirSync(parentDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  if (entries.length !== 1) {
    throw new Error(`Expected exactly one extracted directory in ${parentDir}, found ${entries.length}`);
  }
  return path.join(parentDir, entries[0].name);
}

function buildPilot(packageRoot) {
  const backendDir = path.join(rootDir, 'out', 'backend');
  const rendererDir = path.join(rootDir, 'out', 'renderer');
  const docsDir = path.join(rootDir, 'docs', 'user');

  ensureExists(backendDir, 'Standalone backend build');
  ensureExists(path.join(backendDir, 'index.cjs'), 'Standalone backend entry');
  ensureExists(rendererDir, 'Renderer build');
  ensureExists(path.join(rendererDir, 'index.html'), 'Renderer index');
  ensureExists(docsDir, 'User docs');

  copyDir(backendDir, path.join(packageRoot, 'backend'));
  copyDir(rendererDir, path.join(packageRoot, 'renderer'));
  copyDir(docsDir, path.join(packageRoot, 'docs', 'user'));
}

function buildCaddy(packageRoot, workspaceDir, arch) {
  if (arch !== 'x86_64') {
    throw new Error('Caddy packaging is currently implemented only for x86_64');
  }

  const version = '2.11.2';
  const archiveName = `caddy_${version}_linux_amd64.tar.gz`;
  const archivePath = path.join(workspaceDir, archiveName);
  downloadFile(
    `https://github.com/caddyserver/caddy/releases/download/v${version}/${archiveName}`,
    archivePath
  );

  const extractDir = path.join(workspaceDir, 'extract');
  extractTarball(archivePath, extractDir);
  ensureExists(path.join(extractDir, 'caddy'), 'Caddy binary');

  fs.mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
  fs.copyFileSync(path.join(extractDir, 'caddy'), path.join(packageRoot, 'bin', 'caddy'));
  fs.chmodSync(path.join(packageRoot, 'bin', 'caddy'), 0o755);
}

function buildCodeServer(packageRoot, workspaceDir, arch) {
  if (arch !== 'x86_64') {
    throw new Error('code-server packaging is currently implemented only for x86_64');
  }

  const version = '4.116.0';
  const archiveName = `code-server-${version}-linux-amd64.tar.gz`;
  const archivePath = path.join(workspaceDir, archiveName);
  downloadFile(
    `https://github.com/coder/code-server/releases/download/v${version}/${archiveName}`,
    archivePath
  );

  const extractDir = path.join(workspaceDir, 'extract');
  extractTarball(archivePath, extractDir);
  const sourceDir = findSingleDirectory(extractDir);
  copyDir(sourceDir, path.join(packageRoot, 'code-server'));
}

function buildWetty(packageRoot, workspaceDir, arch) {
  if (arch !== 'x86_64') {
    throw new Error('Wetty packaging is currently implemented only for x86_64');
  }

  const version = '2.7.0';
  const packageStagingDir = path.join(workspaceDir, 'package-src');
  fs.mkdirSync(packageStagingDir, { recursive: true });
  runCommand('npm', ['pack', `wetty@${version}`, '--pack-destination', packageStagingDir], { cwd: rootDir });

  const tgzPath = path.join(packageStagingDir, `wetty-${version}.tgz`);
  ensureExists(tgzPath, 'Wetty npm package');

  const extractDir = path.join(workspaceDir, 'extract');
  extractTarball(tgzPath, extractDir);
  const sourceDir = path.join(extractDir, 'package');
  ensureExists(path.join(sourceDir, 'package.json'), 'Extracted Wetty package');

  try {
    runCommand(
      'docker',
      [
        'run',
        '--rm',
        '--platform',
        wettyDockerPlatform,
        '-v',
        `${sourceDir}:/app`,
        '-w',
        '/app',
        wettyDockerImage,
        'bash',
        '-lc',
        'apt-get update >/dev/null && apt-get install -y --no-install-recommends python3 make g++ >/dev/null && npm_config_build_from_source=true npm install --omit=dev --no-audit --no-fund >/dev/null',
      ],
      { cwd: rootDir }
    );
  } catch (error) {
    throw new Error(
      [
        'Wetty packaging requires a Linux-native Docker build so node-pty is compiled for linux/amd64.',
        `Expected Docker image: ${wettyDockerImage} (${wettyDockerPlatform}).`,
        'Run this on a Linux host or Synology NAS with Docker/Container Manager enabled, then rerun `npm run build:spk:wetty`.',
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
      ].join(' ')
    );
  }

  copyDir(sourceDir, path.join(packageRoot, 'wetty'));
}

const APP_CONFIGS = {
  pilot: {
    packageName: 'pilot-backend',
    displayName: 'Pilot Backend',
    version: packageJson.version,
    revision: '12',
    description: 'Pilot backend service for Synology DSM x86_64 systems. Pair Pilot desktop or browser clients to this NAS-hosted backend.',
    infoLines: [
      'install_dep_packages="Node.js_v20"',
      'reloadui="yes"',
      'adminprotocol="https"',
      'adminport="18088"',
      'adminurl="synology"',
      'thirdparty="yes"',
      'startable="yes"',
      'ctl_stop="yes"',
    ],
    assetsDir: path.join(rootDir, 'synology'),
    buildPayload: buildPilot,
  },
  caddy: {
    packageName: 'caddy',
    displayName: 'Caddy',
    version: '2.11.2',
    revision: '1',
    description: 'Caddy web server and reverse proxy packaged for Synology DSM x86_64.',
    infoLines: [
      'reloadui="yes"',
      'adminprotocol="http"',
      'adminport="20180"',
      'adminurl="/"',
      'thirdparty="yes"',
      'startable="yes"',
      'ctl_stop="yes"',
    ],
    assetsDir: path.join(rootDir, 'synology', 'apps', 'caddy'),
    buildPayload: buildCaddy,
  },
  'code-server': {
    packageName: 'code-server',
    displayName: 'code-server',
    version: '4.116.0',
    revision: '1',
    description: 'Browser-based VS Code environment packaged for Synology DSM x86_64.',
    infoLines: [
      'reloadui="yes"',
      'adminprotocol="http"',
      'adminport="13337"',
      'adminurl="/"',
      'thirdparty="yes"',
      'startable="yes"',
      'ctl_stop="yes"',
    ],
    assetsDir: path.join(rootDir, 'synology', 'apps', 'code-server'),
    buildPayload: buildCodeServer,
  },
  wetty: {
    packageName: 'wetty-terminal',
    displayName: 'Wetty Terminal',
    version: '2.7.0',
    revision: '1',
    description: 'Browser terminal for Synology DSM x86_64 powered by Wetty.',
    infoLines: [
      'install_dep_packages="Node.js_v20"',
      'reloadui="yes"',
      'adminprotocol="http"',
      'adminport="3000"',
      'adminurl="/"',
      'thirdparty="yes"',
      'startable="yes"',
      'ctl_stop="yes"',
    ],
    assetsDir: path.join(rootDir, 'synology', 'apps', 'wetty'),
    buildPayload: buildWetty,
  },
};

function buildInfoFile(config, arch) {
  const version = `${config.version}-${config.revision}`;
  return [
    `package="${config.packageName}"`,
    `version="${version}"`,
    `arch="${arch}"`,
    'os_min_ver="7.0-40000"',
    `displayname="${config.displayName}"`,
    `description="${config.description}"`,
    'maintainer="iamjairo"',
    'maintainer_url="https://github.com/iamjairo/AI-Pilot-APP"',
    'support_url="https://github.com/iamjairo/AI-Pilot-APP/issues"',
    ...config.infoLines,
  ].join('\n') + '\n';
}

function copyPackageAssets(assetsDir, stagingRoot) {
  ensureExists(assetsDir, 'Synology app assets');

  const confDir = path.join(assetsDir, 'conf');
  const scriptsDir = path.join(assetsDir, 'scripts');
  ensureExists(path.join(confDir, 'privilege'), 'Synology privilege file');
  ensureExists(scriptsDir, 'Synology scripts directory');

  const confRoot = path.join(stagingRoot, 'conf');
  const scriptsRoot = path.join(stagingRoot, 'scripts');

  copyDir(confDir, confRoot);
  copyDir(scriptsDir, scriptsRoot);
  fs.copyFileSync(path.join(confDir, 'privilege'), path.join(stagingRoot, 'privilege'));

  for (const scriptName of fs.readdirSync(scriptsRoot)) {
    fs.chmodSync(path.join(scriptsRoot, scriptName), 0o755);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = APP_CONFIGS[options.app];

  if (!config) {
    throw new Error(`Unknown Synology app "${options.app}". Supported: ${Object.keys(APP_CONFIGS).join(', ')}`);
  }

  fs.mkdirSync(options.outputDir, { recursive: true });

  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), `synology-${options.app}-`));
  const payloadRoot = path.join(stagingRoot, 'payload');
  const packageRoot = path.join(payloadRoot, 'app');
  const workspaceDir = path.join(stagingRoot, 'workspace');

  fs.mkdirSync(packageRoot, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  config.buildPayload(packageRoot, workspaceDir, options.arch);
  copyPackageAssets(config.assetsDir, stagingRoot);
  writeFile(path.join(stagingRoot, 'INFO'), buildInfoFile(config, options.arch));

  const packageTgz = path.join(stagingRoot, 'package.tgz');
  runCommand('tar', ['-czf', packageTgz, '-C', payloadRoot, '.'], { cwd: stagingRoot });

  const spkFileName = `${config.packageName}-${config.version}-${config.revision}.spk`;
  const spkFilePath = path.join(options.outputDir, spkFileName);
  runCommand('tar', ['-cf', spkFilePath, 'INFO', 'package.tgz', 'scripts', 'conf', 'privilege'], { cwd: stagingRoot });

  console.log(`Created Synology package: ${spkFilePath}`);
}

main();
