import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';

function gitLines(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim().split('\n').filter(Boolean);
}

const tracked = new Set(gitLines(['ls-files']));
const packageFiles = [...tracked]
  .filter((path) => /^(?:\.agents|\.claude)\/skills\/noodle-seed\/examples\/[^/]+\/package\.json$/.test(path))
  .sort();

if (packageFiles.length === 0) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: { code: 'generated_examples_missing' },
  })}\n`);
  process.exit(1);
}

const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const issues = [];
for (const path of packageFiles) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    issues.push({ path, code: 'invalid_package_json' });
    continue;
  }
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      if (typeof version !== 'string' || !exactVersion.test(version)) {
        issues.push({ path, code: 'mutable_dependency', dependency: name, section });
      }
    }
  }
  if (typeof manifest.packageManager !== 'string' || !/^pnpm@\d+\.\d+\.\d+$/.test(manifest.packageManager)) {
    issues.push({ path, code: 'package_manager_not_pinned' });
  }
  const lockfile = posix.join(dirname(path), 'pnpm-lock.yaml');
  if (!tracked.has(lockfile)) issues.push({ path, code: 'lockfile_missing' });
}

if (issues.length > 0) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: {
      code: 'generated_example_dependency_policy_failed',
      message: 'Bundled runnable Agent Kit examples are outside the reviewed reproducible dependency boundary.',
      issues,
    },
  })}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  data: { packageFiles: packageFiles.length, issues: 0 },
})}\n`);
