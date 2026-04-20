import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const rootDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function parseArgs(argv) {
  const options = {
    packageName: 'pilot-backend',
    displayName: 'Pilot Backend',
    arch: 'x86_64',
    spkRevision: '1',
    outputDir: path.join(rootDir, 'release', 'synology'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--package-name' && next) {
      options.packageName = next;
      i += 1;
    } else if (arg === '--display-name' && next) {
      options.displayName = next;
      i += 1;
    } else if (arg === '--arch' && next) {
      options.arch = next;
      i += 1;
    } else if (arg === '--revision' && next) {
      options.spkRevision = next;
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
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function runTar(args, cwd) {
  const result = spawnSync('tar', args, {
    cwd,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`tar ${args.join(' ')} failed`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  const backendDir = path.join(rootDir, 'out', 'backend');
  const rendererDir = path.join(rootDir, 'out', 'renderer');
  const docsDir = path.join(rootDir, 'docs', 'user');
  const synologyDir = path.join(rootDir, 'synology');

  ensureExists(backendDir, 'Standalone backend build');
  ensureExists(path.join(backendDir, 'index.cjs'), 'Standalone backend entry');
  ensureExists(rendererDir, 'Renderer build');
  ensureExists(path.join(rendererDir, 'index.html'), 'Renderer index');
  ensureExists(docsDir, 'User docs');
  ensureExists(synologyDir, 'Synology assets');

  fs.mkdirSync(options.outputDir, { recursive: true });

  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-spk-'));
  const payloadRoot = path.join(stagingRoot, 'payload');
  const packageRoot = path.join(payloadRoot, 'app');
  const scriptsRoot = path.join(stagingRoot, 'scripts');
  const confRoot = path.join(stagingRoot, 'conf');

  copyDir(backendDir, path.join(packageRoot, 'backend'));
  copyDir(rendererDir, path.join(packageRoot, 'renderer'));
  copyDir(docsDir, path.join(packageRoot, 'docs', 'user'));
  copyDir(path.join(synologyDir, 'conf'), confRoot);
  copyDir(path.join(synologyDir, 'scripts'), scriptsRoot);

  const infoFile = path.join(stagingRoot, 'INFO');
  const version = `${packageJson.version}-${options.spkRevision}`;
  writeFile(
    infoFile,
      [
        `package="${options.packageName}"`,
        `version="${version}"`,
        `arch="${options.arch}"`,
        'os_min_ver="7.0-40000"',
        `displayname="${options.displayName}"`,
        'description="Pilot backend service for Synology DSM x86_64 systems. Pair Pilot desktop or browser clients to this NAS-hosted backend."',
        'maintainer="iamjairo"',
        'maintainer_url="https://github.com/iamjairo/AI-Pilot-APP"',
        'support_url="https://github.com/iamjairo/AI-Pilot-APP/issues"',
        'dep_packages="Node.js_v20"',
        'install_dep_packages="yes"',
        'thirdparty="yes"',
        'startable="yes"',
        'ctl_stop="yes"',
    ].join('\n') + '\n'
  );

  for (const scriptName of fs.readdirSync(scriptsRoot)) {
    fs.chmodSync(path.join(scriptsRoot, scriptName), 0o755);
  }

  const packageTgz = path.join(stagingRoot, 'package.tgz');
  runTar(['-czf', packageTgz, '-C', payloadRoot, '.'], stagingRoot);

  const spkFileName = `${options.packageName}-${version}.spk`;
  const spkFilePath = path.join(options.outputDir, spkFileName);
  runTar(['-cf', spkFilePath, 'INFO', 'package.tgz', 'scripts', 'conf'], stagingRoot);

  console.log(`Created Synology package: ${spkFilePath}`);
}

main();
