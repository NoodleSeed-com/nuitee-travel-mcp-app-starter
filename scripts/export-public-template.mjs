import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { approvedPublicPath, forbiddenPublicPath } from './public-template-policy.mjs';

function git(args) { return execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
function fail(code, paths) { process.stdout.write(`${JSON.stringify({ ok: false, error: { code, ...(paths ? { paths } : {}) } })}\n`); process.exit(1); }
const args = process.argv.slice(2).filter((arg) => arg !== '--');
let ref = 'HEAD'; let destination;
for (let i = 0; i < args.length; i += 2) {
  if (!args[i + 1]) fail('usage_export_public_template_out_directory_optional_ref_commit');
  if (args[i] === '--out') destination = args[i + 1];
  else if (args[i] === '--ref') ref = args[i + 1];
  else fail('unknown_argument');
}
if (!destination) fail('destination_required');
const out = resolve(destination);
if (existsSync(out)) fail('destination_exists');
let created = false;
try {
  // Resolve once, then read blobs from that immutable commit. Working files and
  // untracked content can never enter the export, even during a concurrent edit.
  const commit = git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).toString().trim();
  const entries = git(['ls-tree', '-rz', '--full-tree', commit]).toString().split('\0').filter(Boolean).map((entry) => {
    const [header, ...rest] = entry.split('\t');
    const [mode, type, oid] = header.split(' ');
    return { mode, type, oid, path: rest.join('\t') };
  });
  const selected = entries.filter(({ path }) => approvedPublicPath(path));
  const unsafe = selected.filter(({ path, mode, type }) => forbiddenPublicPath(path) || !['100644', '100755'].includes(mode) || type !== 'blob');
  if (unsafe.length) fail('forbidden_export_path', unsafe.map(({ path }) => path));
  mkdirSync(out); created = true;
  for (const { path, oid, mode } of selected) {
    const target = join(out, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, git(['cat-file', 'blob', oid]), { mode: mode === '100755' ? 0o755 : 0o644, flag: 'wx' });
  }
  const context = entries.find(({ path }) => path === 'scripts/public-template/AGENTS.md');
  if (context) for (const name of ['AGENTS.md', 'CLAUDE.md']) writeFileSync(join(out, name), git(['cat-file', 'blob', context.oid]), { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ ok: true, data: { commit, destination: out, files: selected.length, historyIncluded: false, excluded: entries.length - selected.length } })}\n`);
} catch {
  if (created) rmSync(out, { recursive: true, force: true });
  fail('export_failed');
}
