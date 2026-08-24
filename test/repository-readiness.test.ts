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

  it('defines one complete credential-free CI command', async () => {
    const rootPackage = await repositoryJson('package.json');
    expect(rootPackage.scripts['agent:doctor']).toBe('noodle agents doctor --json');
    expect(rootPackage.scripts['agent:check']).toContain('noodle tools list --json');
    expect(rootPackage.scripts['agent:check:live']).toContain('src/live-server.ts');
    expect(rootPackage.scripts['check:embedded-host']).toContain('@nuitee-travel-starter/embedded-assistant-host');
    for (const command of [
      'pnpm agent:doctor',
      'pnpm customize:check',
      'pnpm test',
      'pnpm agent:check',
      'pnpm agent:check:live',
      'pnpm agent:check:assistant',
      'pnpm check:embedded-host',
    ]) expect(rootPackage.scripts['ci:offline']).toContain(command);
  });

  it('pins CI actions and covers application, embedded, and supply-chain gates', async () => {
    const [workflow, dependabot, workspace] = await Promise.all([
      repositoryFile('.github/workflows/ci.yml'),
      repositoryFile('.github/dependabot.yml'),
      repositoryFile('pnpm-workspace.yaml'),
    ]);
    expect(workflow).toContain('actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803');
    expect(workflow).toContain('pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86');
    expect(workflow).toContain('actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('run: pnpm ci:offline');
    expect(workflow).not.toMatch(/uses:\s+[^\s]+@v\d/);
    expect(dependabot).toContain('package-ecosystem: github-actions');
    expect(workspace).toContain('minimumReleaseAge: 1440');
    expect(workspace).toContain("'@noodleseed/one@0.136.0'");
    expect(workspace).toContain("'@noodleseed/assistant@1.22.0'");
  });
});
