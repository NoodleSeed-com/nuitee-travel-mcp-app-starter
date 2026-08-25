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
    expect(workflow).toContain('actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1');
    expect(workflow).toContain('pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86');
    expect(workflow).toContain('actions/setup-node@820762786026740c76f36085b0efc47a31fe5020');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('run: pnpm ci:offline');
    expect(workflow).not.toMatch(/uses:\s+[^\s]+@v\d/);
    expect(dependabot).toContain('package-ecosystem: github-actions');
    expect(workspace).toContain('minimumReleaseAge: 1440');
    expect(workspace).toContain("'@noodleseed/one@0.138.0'");
    expect(workspace).toContain("'@noodleseed/assistant@1.24.0'");
  });

  it('ships sanitized community intake and identifies generated guidance', async () => {
    const [attributes, pullRequest, bugReport, featureRequest, generatedGuide, releaseChecklist, changelog] = await Promise.all([
      repositoryFile('.gitattributes'),
      repositoryFile('.github/PULL_REQUEST_TEMPLATE.md'),
      repositoryFile('.github/ISSUE_TEMPLATE/bug_report.yml'),
      repositoryFile('.github/ISSUE_TEMPLATE/feature_request.yml'),
      repositoryFile('docs/generated-agent-guidance.md'),
      repositoryFile('PUBLIC_RELEASE_CHECKLIST.md'),
      repositoryFile('CHANGELOG.md'),
    ]);
    expect(attributes).toContain('.agents/** linguist-generated=true');
    expect(attributes).toContain('.claude/** linguist-generated=true');
    expect(pullRequest).toContain('No credentials, provider bodies, customer data, or private URLs');
    expect(bugReport).toContain('Do not paste credentials');
    expect(featureRequest).toContain('Version-one boundary');
    expect(generatedGuide).toContain('pnpm exec noodle agents setup --write');
    expect(releaseChecklist).toContain('Owner decision required');
    expect(releaseChecklist).toContain('license');
    expect(changelog).toContain('## Unreleased');
  });

  it('declares the approved source license and repository owners', async () => {
    const [rootPackage, license, codeowners, readme, contributing] = await Promise.all([
      repositoryJson('package.json'),
      repositoryFile('LICENSE'),
      repositoryFile('.github/CODEOWNERS'),
      repositoryFile('README.md'),
      repositoryFile('CONTRIBUTING.md'),
    ]);

    expect(rootPackage.license).toBe('Apache-2.0');
    expect(rootPackage.private).toBe(true);
    expect(license).toContain('Apache License');
    expect(license).toContain('Version 2.0, January 2004');
    expect(codeowners.trim()).toBe('* @WahabShah23 @asadatnoodle');
    expect(readme).toContain('licensed under the [Apache License 2.0]');
    expect(contributing).toContain('Apache License 2.0');
  });

  it('keeps hosted Embedded Assistant proof outside the first release boundary', async () => {
    const [readme, guide, checklist] = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('docs/EMBEDDED_ASSISTANT.md'),
      repositoryFile('PUBLIC_RELEASE_CHECKLIST.md'),
    ]);

    expect(readme).toContain('excluded from the first public release');
    expect(guide).toContain('First-release status');
    expect(checklist).toContain('[x] Exclude hosted Embedded Assistant end-to-end claims');
  });

  it('keeps public-facing docs free of private upstream trackers and internal feedback IDs', async () => {
    const docs = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('IMPLEMENTATION_PLAN.md'),
      repositoryFile('PUBLIC_RELEASE_CHECKLIST.md'),
      repositoryFile('docs/live-smoke-evidence.md'),
      repositoryFile('docs/troubleshooting.md'),
    ]);
    const combined = docs.join('\n');
    const privateTrackerPath = ['github.com', 'NoodleSeed-com', 'noodle-borg'].join('/');

    expect(combined).not.toContain(privateTrackerPath);
    expect(combined).not.toMatch(/\bfb-\d+\b/i);
  });
});
