import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { demoTripReviewSchema } from '../src/demo-schemas.js';

const execute = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

describe('fresh local trip review through MCP', () => {
  it('returns an incomplete review before any flight or stay is selected', async () => {
    // The public CLI boots a fresh in-memory loopback runtime. This invokes the
    // shipped credential-free profile, including state reads and gateway input
    // validation, not a copied compute function or a mocked selection store.
    // No search, state write, provider credential, or hosted target is involved.
    const result = await execute('pnpm', [
      'exec', 'noodle', 'tools', 'call', 'review_trip',
      'src/demo-preview-server.ts', '--args', '{}', '--json',
    ], { cwd: projectRoot, timeout: 30_000, maxBuffer: 262_144 })
      .then(({ stdout, stderr }) => ({ code: 0, stdout, stderr }))
      .catch((error: { code: unknown; stdout?: string; stderr?: string }) => ({
        code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '',
      }));

    expect(result.stderr).toBe('');
    const envelope = JSON.parse(result.stdout);
    expect(result.code, JSON.stringify(envelope)).toBe(0);
    expect(envelope.ok).toBe(true);
    expect(envelope.data.result.isError).not.toBe(true);
    const review = demoTripReviewSchema.parse(envelope.data.result.structuredContent);
    expect(review.status).toBe('incomplete');
    expect(review.missing).toEqual(['flight', 'stay']);
    expect(review.flight).toBeUndefined();
    expect(review.stay).toBeUndefined();
    expect(review.fallback).toContain('No booking, payment, or points action occurred.');
    expect(review.disclosure).not.toMatch(/flight remains a current|selections came from current/i);
  }, 40_000);
});
