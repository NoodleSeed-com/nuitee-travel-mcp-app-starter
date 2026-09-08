import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

if (packageFiles.length === 0 && ![...tracked].some((path) => /^(?:\.agents|\.claude)\//.test(path))) {
  process.stdout.write(`${JSON.stringify({ ok: true, data: { packageFiles: 0, managedKits: 0, issues: 0, distribution: 'no-bundled-generated-guidance' } })}\n`);
  process.exit(0);
}

const issues = [];
const managedRoots = [
  {
    root: '.agents/skills/',
    manifestPath: '.agents/skills/.noodle-managed.json',
    target: 'codex',
  },
  {
    root: '.claude/skills/',
    manifestPath: '.claude/skills/.noodle-managed.json',
    target: 'claude-code',
  },
];
const manifests = new Map();

for (const managed of managedRoots) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(managed.manifestPath, 'utf8'));
  } catch {
    issues.push({ path: managed.manifestPath, code: 'invalid_managed_manifest' });
    continue;
  }
  if (
    manifest.schemaVersion !== 1
    || manifest.target !== managed.target
    || typeof manifest.packageVersion !== 'string'
    || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.packageVersion)
    || !Array.isArray(manifest.files)
  ) {
    issues.push({ path: managed.manifestPath, code: 'invalid_managed_manifest' });
    continue;
  }
  manifests.set(managed.root, {
    packageVersion: manifest.packageVersion,
    files: new Map(manifest.files.map((entry) => [entry.path, entry])),
  });
}

for (const path of packageFiles) {
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) issues.push({ path, code: 'mutable_dependency', dependency: name });
    }
    if (typeof pkg.packageManager !== 'string' || !/^pnpm@\d+\.\d+\.\d+$/.test(pkg.packageManager)) issues.push({ path, code: 'package_manager_not_pinned' });
    if (!existsSync(join(dirname(path), 'pnpm-lock.yaml'))) issues.push({ path, code: 'example_lockfile_missing' });
  } catch {
    issues.push({ path, code: 'invalid_package_json' });
    continue;
  }
  const managedRoot = managedRoots.find(({ root }) => path.startsWith(root));
  const manifest = managedRoot ? manifests.get(managedRoot.root) : undefined;
  const entry = manifest?.files.get(path);
  if (!manifest || !entry) {
    issues.push({ path, code: 'unmanaged_generated_example' });
    continue;
  }
  const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (
    entry.sha256 !== digest
    || entry.skill !== 'noodle-seed'
    || entry.skillVersion !== manifest.packageVersion
  ) {
    issues.push({ path, code: 'managed_content_mismatch' });
  }
}

if (issues.length > 0) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: {
      code: 'generated_example_provenance_failed',
      message: 'Bundled Agent Kit examples fail managed provenance or reproducible-install requirements.',
      issues,
    },
  })}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  data: {
    packageFiles: packageFiles.length,
    managedKits: manifests.size,
    issues: 0,
  },
})}\n`);
