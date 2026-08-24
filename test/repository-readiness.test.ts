import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function repositoryFile(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function repositoryJson(path: string) {
  return JSON.parse(await repositoryFile(path)) as Record<string, any>;
}

describe('public repository contracts', () => {
  it('keeps the documented flight response limits aligned with the implementation', async () => {
    const [spec, security, connector, runtime] = await Promise.all([
      repositoryFile('SPEC.md'),
      repositoryFile('SECURITY.md'),
      repositoryFile('src/flight-connectors.ts'),
      repositoryFile('src/flight-runtime.ts'),
    ]);

    expect(spec).toContain('Search alone permits up to 6 MiB');
    expect(security).toContain('Flight search alone accepts up to 6 MiB');
    expect(connector).toContain('maxResponseBytes: 6 * 1024 * 1024');
    expect(runtime).toContain('responseBody(called, 6 * 1024 * 1024)');
    expect(spec).not.toContain('Search alone permits up to 3 MiB');
    expect(security).not.toContain('Flight search alone accepts up to 3 MiB');
  });

  it('does not ship an illustrative production origin in active application source', async () => {
    const source = await repositoryFile('src/travel-server.ts');
    expect(source).not.toContain('https://app.example.com');
  });

  it('keeps Noodle runtime dependencies exact and aligned with the lockfile and install', async () => {
    const [rootPackage, hostPackage, lockfile, installedOne, installedAssistant] = await Promise.all([
      repositoryJson('package.json'),
      repositoryJson('examples/embedded-assistant-host/package.json'),
      repositoryFile('pnpm-lock.yaml'),
      repositoryJson('node_modules/@noodleseed/one/package.json'),
      repositoryJson('examples/embedded-assistant-host/node_modules/@noodleseed/assistant/package.json'),
    ]);
    const oneVersion = rootPackage.devDependencies['@noodleseed/one'];
    const assistantVersion = hostPackage.dependencies['@noodleseed/assistant'];
    expect(oneVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(assistantVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(installedOne.version).toBe(oneVersion);
    expect(installedAssistant.version).toBe(assistantVersion);
    expect(lockfile).toContain(`'@noodleseed/one':\n        specifier: ${oneVersion}\n        version: ${oneVersion}`);
    expect(lockfile).toContain(`'@noodleseed/assistant':\n        specifier: ${assistantVersion}\n        version: ${assistantVersion}`);
  });
});
