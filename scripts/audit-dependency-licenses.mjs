import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['licenses', 'list', '--json'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.status !== 0) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: { code: 'dependency_license_command_failed' },
  })}\n`);
  process.exit(1);
}

let groups;
try {
  groups = JSON.parse(result.stdout);
} catch {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: { code: 'dependency_license_output_invalid' },
  })}\n`);
  process.exit(1);
}

const unknownGroups = Object.keys(groups).filter((license) =>
  license.trim().length === 0 || /unknown|unlicensed|undefined|none/i.test(license));

if (unknownGroups.length > 0) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: {
      code: 'dependency_license_metadata_missing',
      groups: unknownGroups.sort(),
    },
  })}\n`);
  process.exit(1);
}

const packages = new Set();
for (const entries of Object.values(groups)) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') continue;
    const versions = Array.isArray(entry.versions) ? entry.versions : [];
    for (const version of versions) packages.add(`${entry.name}@${String(version)}`);
  }
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  data: {
    licenseGroups: Object.keys(groups).sort(),
    packages: packages.size,
    missingLicenseGroups: 0,
    legalReviewStillRequired: true,
  },
})}\n`);
