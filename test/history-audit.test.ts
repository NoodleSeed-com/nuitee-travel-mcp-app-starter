import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const auditScript = fileURLToPath(new URL('../scripts/audit-git-history.mjs', import.meta.url));

function repositoryWith(files: Record<string, string | Uint8Array>) {
  const directory = mkdtempSync(join(tmpdir(), 'nuitee-history-audit-'));
  execFileSync('git', ['init', '--quiet'], { cwd: directory });
  for (const [path, contents] of Object.entries(files)) writeFileSync(join(directory, path), contents);
  execFileSync('git', ['add', '.'], { cwd: directory });
  execFileSync('git', [
    '-c', 'user.name=History Audit Test',
    '-c', 'user.email=history-audit@example.invalid',
    'commit', '--quiet', '-m', 'fixture',
  ], { cwd: directory });
  return directory;
}

function audit(directory: string) {
  const result = spawnSync(process.execPath, [auditScript], {
    cwd: directory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { status: result.status, envelope: JSON.parse(result.stdout) as Record<string, any> };
}

describe('Git-history release audit', () => {
  it('detects declared secret names in structured key-value data without printing values', () => {
    const secretName = ['NUITEE', 'API', 'KEY'].join('_');
    const directory = repositoryWith({
      'config.json': JSON.stringify({ [secretName]: 'synthetic-credential-value' }),
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error.code).toBe('secret_pattern_detected');
    expect(JSON.stringify(result.envelope)).not.toContain('synthetic-credential-value');
  });

  it('fails closed on an unreviewed binary release artifact', () => {
    const directory = repositoryWith({
      'screenshot.png': Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error.code).toBe('unreviewed_binary_artifact');
    expect(result.envelope.error.paths).toEqual(['screenshot.png']);
  });
});
