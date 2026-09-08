import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../scripts/export-public-template.mjs', import.meta.url));
const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });
function fixture(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'travel-export-test-'));
  temporary.push(base);
  const source = join(base, 'source'); mkdirSync(source);
  execFileSync('git', ['init', '-q'], { cwd: source });
  for (const [path, value] of Object.entries(files)) {
    mkdirSync(dirname(join(source, path)), { recursive: true }); writeFileSync(join(source, path), value);
  }
  commit(source);
  return { source, out: join(base, 'public') };
}
function commit(cwd: string) {
  execFileSync('git', ['add', '-A'], { cwd });
  execFileSync('git', ['-c', 'user.name=Export Test', '-c', 'user.email=export@example.invalid', 'commit', '-qm', 'fixture'], { cwd });
}
function run(source: string, out: string) {
  const result = spawnSync(process.execPath, [script, '--', '--out', out], { cwd: source, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}
it('exports committed application files and excludes private history, generated kits, plans and untracked files', () => {
  const { source, out } = fixture({ 'README.md': 'Approved', 'src/server.ts': 'export {};', 'docs/internal/private.md': 'internal', 'docs/superpowers/plan.md': 'plan', '.agents/skills/example.md': 'generated', 'docs/architecture.md': 'public', '.env.example': `${['NUITEE', 'API', 'KEY'].join('_')}=\n` });
  writeFileSync(join(source, 'README.md'), 'Unreviewed working change');
  writeFileSync(join(source, 'untracked.txt'), 'untracked');
  expect(run(source, out).code).toBe(0);
  expect(readFileSync(join(out, 'README.md'), 'utf8')).toBe('Approved');
  expect(existsSync(join(out, 'src/server.ts'))).toBe(true);
  expect(existsSync(join(out, 'docs/architecture.md'))).toBe(true);
  for (const path of ['.git', '.agents', 'docs/internal', 'docs/superpowers', 'untracked.txt']) expect(existsSync(join(out, path))).toBe(false);
});
it('refuses to overwrite an existing destination', () => {
  const { source, out } = fixture({ 'README.md': 'Approved' });
  mkdirSync(out); writeFileSync(join(out, 'keep.txt'), 'keep');
  expect(run(source, out).code).toBe(1);
  expect(readFileSync(join(out, 'keep.txt'), 'utf8')).toBe('keep');
});
it('rejects tracked environment secrets without printing their contents', () => {
  const { source, out } = fixture({ 'README.md': 'Approved', 'apps/web/.env.local': 'SENTINEL_PRIVATE_VALUE' });
  const result = run(source, out);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('forbidden_export_path');
  expect(result.stdout + result.stderr).not.toContain('SENTINEL_PRIVATE_VALUE');
  expect(existsSync(out)).toBe(false);
});
it('rejects symlinks instead of following files outside the approved tree', () => {
  const { source, out } = fixture({ 'README.md': 'Approved', 'src/server.ts': 'export {};' });
  symlinkSync('/etc/passwd', join(source, 'src/leak')); commit(source);
  expect(run(source, out).code).toBe(1);
  expect(existsSync(out)).toBe(false);
});
it('exports only approved root surfaces and excludes an unexpected operational report', () => {
  const { source, out } = fixture({ 'README.md': 'Approved', 'operator-report.txt': 'private report' });
  expect(run(source, out).code).toBe(0);
  expect(existsSync(join(out, 'operator-report.txt'))).toBe(false);
});
