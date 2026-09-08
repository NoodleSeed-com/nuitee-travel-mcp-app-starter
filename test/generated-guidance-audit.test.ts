import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
const script = fileURLToPath(new URL('../scripts/audit-generated-agent-kit.mjs', import.meta.url));
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { force: true, recursive: true }); });
function repo() { const dir = mkdtempSync(join(tmpdir(), 'guidance-audit-')); dirs.push(dir); execFileSync('git', ['init', '-q'], { cwd: dir }); return dir; }
function audit(cwd: string) { const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' }); return { code: result.status, output: JSON.parse(result.stdout) }; }
it('accepts a public distribution with no bundled generated kits or examples', () => {
  const result = audit(repo());
  expect(result.code).toBe(0);
  expect(result.output.data.packageFiles).toBe(0);
});
it('rejects mutable runnable dependencies even when managed integrity hashes match', () => {
  const dir = repo();
  for (const [root, target] of [['.agents', 'codex'], ['.claude', 'claude-code']]) {
    const path = `${root}/skills/noodle-seed/examples/hello/package.json`;
    mkdirSync(join(dir, root, 'skills/noodle-seed/examples/hello'), { recursive: true });
    const content = JSON.stringify({ name: 'hello', devDependencies: { vitest: 'latest' } });
    writeFileSync(join(dir, path), content);
    writeFileSync(join(dir, root, 'skills/.noodle-managed.json'), JSON.stringify({ schemaVersion: 1, target, packageVersion: '1.0.0', files: [{ path, sha256: createHash('sha256').update(content).digest('hex'), skill: 'noodle-seed', skillVersion: '1.0.0' }] }));
  }
  execFileSync('git', ['add', '.'], { cwd: dir });
  const result = audit(dir);
  expect(result.code).toBe(1);
  expect(result.output.error.issues.some((issue: { code: string }) => issue.code === 'mutable_dependency')).toBe(true);
});
