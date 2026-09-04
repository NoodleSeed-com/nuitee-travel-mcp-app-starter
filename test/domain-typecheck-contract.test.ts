import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

describe('repeatable domain type checking', () => {
  it('owns a pinned compiler and checks domain source and tests in the core gate', async () => {
    const rootPackage = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8'));
    expect(rootPackage.scripts['typecheck:domain']).toBe('tsc --project tsconfig.domain.json --noEmit');
    expect(rootPackage.devDependencies.typescript).toMatch(/^\d+\.\d+\.\d+$/);
    expect(rootPackage.devDependencies['@types/node']).toMatch(/^\d+\.\d+\.\d+$/);
    const commands = rootPackage.scripts['ci:core'].split(' && ');
    expect(commands).toContain('pnpm typecheck:domain');
    expect(commands.indexOf('pnpm typecheck:domain')).toBeLessThan(commands.indexOf('pnpm test'));

    const config = JSON.parse(await readFile(join(repositoryRoot, 'tsconfig.domain.json'), 'utf8'));
    const base = JSON.parse(await readFile(join(repositoryRoot, 'tsconfig.json'), 'utf8'));
    expect(config.extends).toBe('./tsconfig.json');
    expect(config.include).toEqual(['src/domain/**/*.ts', 'test/domain-*.test.ts']);
    expect(config.compilerOptions?.strict).not.toBe(false);
    expect(config.compilerOptions?.noEmit).not.toBe(false);
    expect(base.compilerOptions).toMatchObject({ strict: true, noEmit: true });
    expect(config.exclude ?? []).toEqual([]);
  });

  it('rejects a deliberate type error and emits no artifacts', async () => {
    // Probe in a private temporary directory: never mutate source while the
    // regular test runner or a parallel compiler is reading the worktree.
    const fixture = await mkdtemp(join(tmpdir(), 'wayfare-domain-typecheck-'));
    try {
      const compilerPackagePath = require.resolve('typescript/package.json');
      const compilerPackage = JSON.parse(await readFile(compilerPackagePath, 'utf8'));
      const compilerEntry = join(dirname(compilerPackagePath), compilerPackage.bin.tsc);
      await writeFile(join(fixture, 'invalid.ts'), 'export const invalid: string = 123;\n');
      await writeFile(join(fixture, 'tsconfig.json'), JSON.stringify({
        extends: join(repositoryRoot, 'tsconfig.domain.json'),
        include: ['./invalid.ts'],
      }));
      const result = spawnSync(process.execPath, [compilerEntry, '--project', join(fixture, 'tsconfig.json'), '--pretty', 'false'], {
        cwd: repositoryRoot, encoding: 'utf8', timeout: 20_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('TS2322');
      expect(result.stdout).toContain('invalid.ts');
      expect((await readdir(fixture)).sort()).toEqual(['invalid.ts', 'tsconfig.json']);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  }, 30_000);
});
