import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const auditScript = fileURLToPath(new URL('../scripts/audit-git-history.mjs', import.meta.url));
const reviewedBinaryArtifact = readFileSync(
  fileURLToPath(new URL('../docs/images/flight-results.png', import.meta.url)),
);
const nuiteeCredentialName = ['NUITEE', 'API', 'KEY'].join('_');
const openAiCredentialName = ['OPENAI', 'API', 'KEY'].join('_');

function managedAssignment(name: string, value: string) {
  return [name, '=', value].join('');
}

const syntheticErrorAssignment = managedAssignment(
  nuiteeCredentialName,
  ['sec', 'ret https://api.example.com/search_flights'].join(''),
);
const exactSyntheticFixtureLine = `      message: '${syntheticErrorAssignment}',`;
const syntheticTaskScreenshotName = ['task', 'sk', 'browser-evidence-20260829'].join('-');
const syntheticOpenAiToken = ['sk', 'second-token-with-more-than-twenty-characters'].join('-');

function repositoryWith(files: Record<string, string | Uint8Array>) {
  const directory = mkdtempSync(join(tmpdir(), 'nuitee-history-audit-'));
  execFileSync('git', ['init', '--quiet'], { cwd: directory });
  for (const [path, contents] of Object.entries(files)) {
    const destination = join(directory, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents);
  }
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
  it('ignores a synthetic task screenshot artifact only in the browser evidence source', () => {
    const directory = repositoryWith({
      'apps/web/test/browser/travel-shell.spec.ts': [
        `path: testInfo.outputPath('${syntheticTaskScreenshotName}.png'),`,
        `await testInfo.attach('${syntheticTaskScreenshotName}', {`,
      ].join('\n'),
    });

    const result = audit(directory);

    expect(result.status).toBe(0);
    expect(result.envelope).toMatchObject({
      ok: true,
      data: { findings: 0 },
    });
  });

  it('rejects the synthetic task screenshot pattern outside the browser evidence source', () => {
    const directory = repositoryWith({
      'unrelated.ts': `const artifact = '${syntheticTaskScreenshotName}.png';\n`,
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error).toMatchObject({
      code: 'secret_pattern_detected',
      findings: [{
        detector: 'openai_key',
        paths: ['unrelated.ts'],
      }],
    });
  });

  it('rejects a suffix extension of the browser screenshot fixture line', () => {
    const directory = repositoryWith({
      'apps/web/test/browser/travel-shell.spec.ts': [
        `path: testInfo.outputPath('${syntheticTaskScreenshotName}.png'), // suffix`,
      ].join('\n'),
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error).toMatchObject({
      code: 'secret_pattern_detected',
      findings: [{
        detector: 'openai_key',
        paths: ['apps/web/test/browser/travel-shell.spec.ts'],
      }],
    });
  });

  it('rejects a second key-shaped token on the browser screenshot fixture line', () => {
    const directory = repositoryWith({
      'apps/web/test/browser/travel-shell.spec.ts': [
        `path: testInfo.outputPath('${syntheticTaskScreenshotName}.png'), '${syntheticOpenAiToken}'`,
      ].join('\n'),
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error).toMatchObject({
      code: 'secret_pattern_detected',
      findings: [{
        detector: 'openai_key',
        paths: ['apps/web/test/browser/travel-shell.spec.ts'],
      }],
    });
  });

  it('rejects a task artifact token in unrecognized browser-source context', () => {
    const directory = repositoryWith({
      'apps/web/test/browser/travel-shell.spec.ts': [
        `const artifact = '${syntheticTaskScreenshotName}.png';`,
      ].join('\n'),
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error).toMatchObject({
      code: 'secret_pattern_detected',
      findings: [{
        detector: 'openai_key',
        paths: ['apps/web/test/browser/travel-shell.spec.ts'],
      }],
    });
  });

  it('ignores only the complete synthetic Task 8 fixture source line', () => {
    const directory = repositoryWith({
      'assistant-error.test.ts': `${exactSyntheticFixtureLine}\n`,
    });

    const result = audit(directory);

    expect(result.status).toBe(0);
    expect(result.envelope).toMatchObject({
      ok: true,
      data: { findings: 0 },
    });
  });

  it('rejects a suffix extension of the synthetic fixture line', () => {
    const suffix = ' // extended';
    const directory = repositoryWith({
      'assistant-error.test.ts': `${exactSyntheticFixtureLine}${suffix}\n`,
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error).toMatchObject({
      code: 'secret_pattern_detected',
      findings: [{
        detector: 'managed_secret_assignment',
        paths: ['assistant-error.test.ts'],
      }],
    });
    expect(JSON.stringify(result.envelope)).not.toContain(syntheticErrorAssignment);
  });

  it('rejects the exact fixture followed by a second assignment on the same line', () => {
    const secondAssignment = managedAssignment(
      openAiCredentialName,
      'synthetic-second-value',
    );
    const directory = repositoryWith({
      'assistant-error.test.ts': `${exactSyntheticFixtureLine} ${secondAssignment}\n`,
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error).toMatchObject({
      code: 'secret_pattern_detected',
      findings: [{
        detector: 'managed_secret_assignment',
        paths: ['assistant-error.test.ts'],
      }],
    });
    expect(JSON.stringify(result.envelope)).not.toContain(secondAssignment);
  });

  it('still rejects a distinct Nuitee assignment without printing its value', () => {
    const distinctAssignment = managedAssignment(
      nuiteeCredentialName,
      'synthetic-non-placeholder-value',
    );
    const directory = repositoryWith({
      '.env.local': `${distinctAssignment}\n`,
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error.code).toBe('secret_pattern_detected');
    expect(result.envelope.error.findings).toEqual([
      {
        detector: 'managed_secret_assignment',
        paths: ['.env.local'],
      },
    ]);
    expect(JSON.stringify(result.envelope)).not.toContain(distinctAssignment);
  });

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

  it('requires a separate review when approved binary bytes are copied to another path', () => {
    const directory = repositoryWith({
      'docs/images/flight-results.png': reviewedBinaryArtifact,
      'docs/images/unreviewed-copy.png': reviewedBinaryArtifact,
    });

    const result = audit(directory);

    expect(result.status).toBe(1);
    expect(result.envelope.error.code).toBe('unreviewed_binary_artifact');
    expect(result.envelope.error.paths).toEqual(['docs/images/unreviewed-copy.png']);
  });
});
