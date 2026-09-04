import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, open, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

async function repositoryFile(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function repositoryJson(path: string) {
  return JSON.parse(await repositoryFile(path)) as Record<string, any>;
}

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker && marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += length + 2;
  }
  throw new Error('JPEG dimensions were not found');
}

async function noodleValidate() {
  const executable = fileURLToPath(new URL('../node_modules/.bin/noodle', import.meta.url));
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'nuitee-noodle-validate-'));
  const stdoutPath = join(temporaryDirectory, 'stdout.json');
  const stdoutFile = await open(stdoutPath, 'w');
  try {
    const result = await new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
      const child = spawn(executable, ['validate', '--json'], {
        cwd,
        stdio: ['ignore', stdoutFile.fd, 'pipe'],
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.once('error', reject);
      child.once('close', (code) => resolve({ code, stderr }));
    });
    await stdoutFile.close();
    return { ...result, stdout: await readFile(stdoutPath, 'utf8') };
  } finally {
    await stdoutFile.close().catch(() => undefined);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

describe('public repository contracts', () => {
  it('ships a pinned public-domain airport catalog without runtime lookup', async () => {
    const [guide, catalog, generator, resolver] = await Promise.all([
      repositoryFile('docs/airport-data.md'),
      repositoryFile('apps/web/src/data/airports.generated.ts'),
      repositoryFile('scripts/generate-airport-catalog.mjs'),
      repositoryFile('apps/web/src/lib/travel-defaults.ts'),
    ]);

    for (const artifact of [guide, catalog]) {
      expect(artifact).toContain('https://ourairports.com/data/');
      expect(artifact).toContain(
        'https://github.com/davidmegginson/ourairports-data/blob/main/LICENSE',
      );
      expect(artifact).toContain('2026-08-31');
      expect(artifact).toContain(
        'e56b20ecaa187ef954f3cce670a5559147ad071ff962915fdd72fb885f826da4',
      );
    }
    expect(guide).toContain('`large_airport`');
    expect(guide).toContain('`scheduled_service=yes`');
    expect(guide).toContain('ISB');
    expect(guide).toContain('Islamabad');
    expect(generator).toContain('CITY_OVERRIDES');
    expect(resolver).not.toContain('ourairports.com');
    expect(resolver).not.toMatch(/fetch\s*\(/u);
  });

  it('documents the optional browser-location privacy boundary', async () => {
    const [privacy, architecture, embed, customization] = await Promise.all([
      repositoryFile('docs/privacy.md'),
      repositoryFile('docs/architecture.md'),
      repositoryFile('docs/EMBEDDED_ASSISTANT.md'),
      repositoryFile('docs/customization.md'),
    ]);

    expect(privacy).toMatch(/optional browser location permission/i);
    expect(privacy).toMatch(/coordinates[^.]*memory/i);
    expect(privacy).toMatch(/derived[^.]*airport[^.]*currency/i);
    expect(privacy).toMatch(/no[^.]*third-party[^.]*location lookup/i);
    expect(privacy).toMatch(/not persisted|no application persistence/i);
    expect(privacy).toMatch(/den(?:y|ied|ial)[^.]*flight search/i);
    for (const guide of [architecture, embed, customization]) {
      expect(guide).toContain('docs/privacy.md');
      expect(guide).toContain('untrusted');
    }
  });

  it('keeps the public five-capability projection exact in active release guidance', async () => {
    const [server, checklist, architecture, implementationPlan, spec] = await Promise.all([
      repositoryFile('src/travel-server.ts'),
      repositoryFile('PUBLIC_RELEASE_CHECKLIST.md'),
      repositoryFile('docs/architecture.md'),
      repositoryFile('IMPLEMENTATION_PLAN.md'),
      repositoryFile('SPEC.md'),
    ]);
    const capabilityNames = [
      'open_travel_starter',
      'plan_flight_search',
      'search_flights',
      'verify_flight_offer',
      'select_flight_offer',
    ] as const;

    expect(server).toContain('publicSurface: [open, plan, search, verify, select]');
    for (const guide of [checklist, architecture, implementationPlan, spec]) {
      expect(guide).toContain('four model-visible tools plus one App-only helper');
      for (const capability of capabilityNames) expect(guide).toContain(capability);
      expect(guide).not.toMatch(/exact three-tool|only open, search, and verify|four-capability public projection/i);
    }
  });

  it('documents only the current editorial fields, CSS tokens, and verification label', async () => {
    const [readme, customization] = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('docs/customization.md'),
    ]);
    const activeGuidance = `${readme}\n${customization}`;

    expect(customization).toContain('passive editorial `heading` and `support`');
    expect(customization).toContain('destination `prompt` remains available to `/experience`');
    expect(customization).not.toContain('`heading`, `support`, `action`, and `prompt`');
    expect(customization).toContain('direct CSS custom properties');
    expect(activeGuidance).toContain('Verify current fare');
    expect(activeGuidance).not.toContain('Verify selected fare');
    expect(customization).not.toContain("`landingEditorialFeature`, change `eyebrow`");
    expect(customization).not.toMatch(/Tailwind(?:'s)? Neutral/i);
  });

  it('keeps current preview provenance tied to stable product labels and exact reviewed bytes', async () => {
    const [previewGuide, fixtureGuide, readme, reviewedBlobs] = await Promise.all([
      repositoryFile('docs/images/README.md'),
      repositoryFile('docs/fixture-safety.md'),
      repositoryFile('README.md'),
      repositoryFile('security/reviewed-binary-blobs.txt'),
    ]);
    const previews = [
      ['docs/images/travel-home.png', 'Where will you go next?', 'Wayfare route mark'],
      ['docs/images/flight-results.png', 'Current flight options', 'Verify current fare'],
    ] as const;

    for (const [path, firstLabel, secondLabel] of previews) {
      const bytes = await readFile(new URL(`../${path}`, import.meta.url));
      const blob = createHash('sha1').update(Buffer.concat([
        Buffer.from(`blob ${bytes.length}\0`),
        bytes,
      ])).digest('hex');
      expect(previewGuide).toContain(path.split('/').at(-1)!);
      expect(previewGuide).toContain(firstLabel);
      expect(previewGuide).toContain(secondLabel);
      expect(reviewedBlobs).toContain(`${blob} ${path}`);
    }
    expect(fixtureGuide).toContain('current deterministic product previews');
    expect(readme).toContain('current local Wayfare product');
    expect(previewGuide).not.toMatch(/Choose your flight|Lowest shown|Verify selected fare/);
  });

  it('never describes the accepted Wayfare images as literal 4K in active release copy', async () => {
    const [changelog, readme, customization, architecture] = await Promise.all([
      repositoryFile('CHANGELOG.md'),
      repositoryFile('README.md'),
      repositoryFile('docs/customization.md'),
      repositoryFile('docs/architecture.md'),
    ]);

    expect(changelog).toContain('native `1672 × 941` high-resolution');
    expect([changelog, readme, customization, architecture].join('\n'))
      .not.toMatch(/generated 4K|4K coastline artwork|4K-grade/i);
  });

  it('records exact provenance for the Wayfare premium image masters', async () => {
    const ledger = await repositoryFile('docs/visual-assets/wayfare-premium-concierge.md');
    const expectedMasters = [
      'apps/web/public/images/wayfare-hybrid-hero-v2.jpg',
      'apps/web/public/images/destinations/rome-editorial-v2.jpg',
      'apps/web/public/images/destinations/london-editorial-v2.jpg',
      'apps/web/public/images/destinations/istanbul-editorial-v2.jpg',
    ] as const;

    for (const path of expectedMasters) {
      const bytes = await readFile(new URL(`../${path}`, import.meta.url));
      const dimensions = jpegDimensions(bytes);
      const hash = createHash('sha256').update(bytes).digest('hex');
      expect(ledger).toContain(path);
      expect(ledger).toContain(`${dimensions.width} x ${dimensions.height}`);
      expect(ledger).toContain(hash);
    }

    for (const [path, hash] of [
      [
        'apps/web/public/images/immersive/wayfare-explore-windows-v2.png',
        '4f28eb6b9f00c101cb9a66d7731a07ae760d4cf61b436750a7e6172b0b98e41a',
      ],
      [
        'apps/web/public/images/immersive/wayfare-cockpit-v2.png',
        'cca500fbae39d3d593cc379f319ca64eae484ccbce5582a9620e571b66bac1a4',
      ],
      [
        'apps/web/public/images/immersive/wayfare-insurance-v1.png',
        '0750cee8fea894960331b79502ea6de460a6d7b84e2ca20a1cacb94ccdf537b0',
      ],
    ] as const) {
      expect(ledger).toContain(path);
      expect(ledger).toContain('1672 x 941');
      expect(ledger).toContain(hash);
    }
  });

  it('makes the Next.js guest website the primary README path', async () => {
    const readme = await repositoryFile('README.md');

    expect(readme).toContain('pnpm dev:web');
    expect(readme).toContain('External MCP hosts');
    expect(readme.indexOf('pnpm dev:web')).toBeLessThan(
      readme.indexOf('External MCP hosts'),
    );
    expect(readme).toContain('Search → Select → Verify');
    expect(readme).toContain('does not book');
  });

  it('ships the approved layered Wayfare homepage without the obsolete shader dependency', async () => {
    const [
      readme,
      customization,
      heroViewAsset,
      heroCabinAsset,
      webPackage,
    ] = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('docs/customization.md'),
      stat(new URL('../apps/web/public/images/immersive/wayfare-window-view-v1.png', import.meta.url)),
      stat(new URL('../apps/web/public/images/immersive/wayfare-cabin-frame-v1.png', import.meta.url)),
      repositoryJson('apps/web/package.json'),
    ]);

    expect(heroViewAsset.size).toBeGreaterThan(0);
    expect(heroCabinAsset.size).toBeGreaterThan(0);
    expect(webPackage.dependencies['@paper-design/shaders-react']).toBeUndefined();
    expect(readme).toContain('single-entry cinematic landing');
    expect(readme).toContain('Search → Select → Verify');
    expect(customization).toContain('## Wayfare image system');
    await expect(access(new URL(
      '../apps/web/src/components/workspace-atmosphere.tsx',
      import.meta.url,
    ))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(new URL(
      '../apps/web/src/components/workspace-atmosphere-canvas.tsx',
      import.meta.url,
    ))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('documents the agent-led homepage without overstating available tools', async () => {
    const [readme, spec, architecture, customization, companion] = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('SPEC.md'),
      repositoryFile('docs/architecture.md'),
      repositoryFile('docs/customization.md'),
      repositoryFile('docs/WAYFARE_TRAVEL_COMPANION.md'),
    ]);
    const activeDocs = [readme, architecture, customization, companion].join('\n');

    expect(readme).toContain('single-entry cinematic landing');
    expect(spec).toContain('one general travel composer');
    expect(architecture).toContain('capability choice stays inside the agent');
    expect(customization).toContain('passive destination inspiration');
    expect(companion).toContain('one natural-language starting composer');
    expect(companion).toContain('Flights remain provider-backed');
    expect(activeDocs).not.toMatch(/offers accessible entry points for each|choose a planning view/i);
    expect(spec).toContain('Flights are the only operational travel domain.');
    expect(spec).toContain('It produces no checkout or handoff URL.');
  });

  it('keeps active template guidance aligned with the Wayfare premium conversation', async () => {
    const [readme, architecture, customization, embeddedGuide, assetGuide] = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('docs/architecture.md'),
      repositoryFile('docs/customization.md'),
      repositoryFile('docs/EMBEDDED_ASSISTANT.md'),
      repositoryFile('docs/visual-assets/airline-editorial-homepage.md'),
    ]);
    const activeDocs = [readme, architecture, customization, embeddedGuide].join('\n');

    expect(readme).toContain('Wayfare');
    expect(readme).toContain('conversation');
    expect(architecture).toContain('inline MCP Apps');
    expect(customization).toContain('wayfare-mark.tsx');
    expect(embeddedGuide).not.toMatch(/right[- ]side|Flight workspace|side canvas/iu);
    expect(activeDocs).not.toMatch(/Cedar & Cloud|route-orbit|full-bleed hero/iu);
    expect(assetGuide).toContain('wayfare-premium-concierge.md');
  });

  it('documents OAuth without claiming that login consumption is an OIDC issuer', async () => {
    const oauth = await repositoryFile('docs/oauth.md');

    expect(oauth).toContain('Website login');
    expect(oauth).toContain('createAssistantSession');
    expect(oauth).toContain('authenticatedWebsite({');
    expect(oauth).toContain('capabilities: [...capabilities.publicSurface]');
    expect(oauth).toContain('publicWebsite({ signIn: true');
    expect(oauth).toContain('On sign-out or an account, principal, or tenant change');
    expect(oauth).toContain('unmount and reset the current Assistant client and session');
    expect(oauth).toContain('clear the transcript, trip projection, and activity');
    expect(oauth).toContain('fresh principal-scoped session');
    expect(oauth).toContain('customerAuth.oidc');
    expect(oauth).toContain('does not make your website an OIDC authorization server');
  });

  it('describes the embedded entrypoint as the primary guest Next.js surface', async () => {
    const [entrypoint, server] = await Promise.all([
      repositoryFile('src/embedded-server.ts'),
      repositoryFile('src/travel-server.ts'),
    ]);
    const comments = `${entrypoint}\n${server}`;

    expect(comments).toContain('primary guest Next.js website');
    expect(comments).toContain('exact Next.js loopback origin');
    expect(comments).not.toContain('companion demo');
    expect(comments).not.toContain('Optional website/SaaS entrypoint');
  });

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

  it('keeps Noodle validation able to load the canonical authoring config', async () => {
    const result = await noodleValidate();

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true });
  }, 15_000);

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

  it('runs the primary website in the offline repository gate', async () => {
    const rootPackage = await repositoryJson('package.json');

    expect(rootPackage.scripts['dev:web']).toBe(
      'pnpm --filter @nuitee-travel-starter/web dev',
    );
    expect(rootPackage.scripts['build:web']).toBe(
      'pnpm --filter @nuitee-travel-starter/web build',
    );
    expect(rootPackage.scripts['test:web']).toBe(
      'pnpm --filter @nuitee-travel-starter/web test',
    );
    expect(rootPackage.scripts['check:web']).toContain(
      '@nuitee-travel-starter/web typecheck',
    );
    expect(rootPackage.scripts['check:web']).toContain(
      '@nuitee-travel-starter/web test',
    );
    expect(rootPackage.scripts['check:web']).toContain(
      '@nuitee-travel-starter/web test:browser',
    );
    expect(rootPackage.scripts['check:web']).toContain(
      '@nuitee-travel-starter/web build',
    );
    expect(rootPackage.scripts['ci:offline']).toContain('pnpm check:web');
    expect(rootPackage.scripts['ci:offline']).toContain(
      'pnpm check:embedded-host',
    );
  });

  it('keeps website environment examples within the public credential boundary', async () => {
    const [rootEnvironment, websiteEnvironment] = await Promise.all([
      repositoryFile('.env.example'),
      repositoryFile('apps/web/.env.example'),
    ]);

    expect(rootEnvironment).not.toMatch(/NOODLE_ASSISTANT_CLIENT_(?:ID|SECRET)/);
    expect(rootEnvironment).not.toContain('NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID');
    expect(websiteEnvironment.trim().split('\n')).toEqual([
      'NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID=',
      'NEXT_PUBLIC_NOODLE_SERVICE_URL=https://cloud.noodleseed.dev',
    ]);
    expect(websiteEnvironment).not.toMatch(/CLIENT_(?:ID|SECRET)|NUITEE_API_KEY/);
  });

  it('keeps mutable generated examples behind a fail-closed release-only gate', async () => {
    const [rootPackage, checklist, generatedGuide] = await Promise.all([
      repositoryJson('package.json'),
      repositoryFile('PUBLIC_RELEASE_CHECKLIST.md'),
      repositoryFile('docs/generated-agent-guidance.md'),
    ]);

    expect(rootPackage.scripts['audit:release']).toContain('pnpm audit:generated-guidance');
    expect(rootPackage.scripts['ci:offline']).not.toContain('audit:generated-guidance');
    expect(checklist).toContain('[ ] Replace every mutable dependency selector in bundled runnable Agent Kit examples');
    expect(generatedGuide).toContain('must stay private');
    expect(generatedGuide).toContain('Do not hand-edit the generated copies');
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
    expect(workflow).toContain('merge_group:');
    expect(workflow).toContain('run: pnpm ci:offline');
    expect(workflow).not.toMatch(/uses:\s+[^\s]+@v\d/);
    expect(dependabot).toContain('package-ecosystem: github-actions');
    expect(workspace).toContain('minimumReleaseAge: 1440');
    expect(workspace).toContain("'@noodleseed/one@0.151.1'");
    expect(workspace).toContain("'@noodleseed/assistant@1.27.0'");
  });

  it('gates Fly production deployment behind main-branch quality checks', async () => {
    const workflow = await repositoryFile('.github/workflows/ci.yml');

    expect(workflow).toContain('deploy-fly-experience:');
    expect(workflow).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(workflow).toContain('needs: offline-quality-gates');
    expect(workflow).toContain('name: production');
    expect(workflow).toContain('url: https://wayfare-experience.fly.dev');
    expect(workflow).toContain('group: fly-production');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain(
      'superfly/flyctl-actions/setup-flyctl@ed8efb33836e8b2096c7fd3ba1c8afe303ebbff1',
    );
    expect(workflow).toContain('version: 0.4.97');
    expect(workflow).toContain('FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}');
    expect(workflow).toContain(
      'NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: ${{ vars.NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID }}',
    );
    expect(workflow).toContain(
      'NEXT_PUBLIC_NOODLE_SERVICE_URL: ${{ vars.NEXT_PUBLIC_NOODLE_SERVICE_URL }}',
    );
    expect(workflow).toContain('flyctl deploy --remote-only');
    expect(workflow).toContain('flyctl status --app "$FLY_APP"');
    expect(workflow).toContain('curl --fail --silent --show-error');
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
    expect(codeowners.trim()).toBe('* @WahabShah23 @asadatnoodle @hassan50306');
    expect(readme).toContain('licensed under the [Apache License 2.0]');
    expect(contributing).toContain('Apache License 2.0');
  });

  it('keeps generated-guidance provenance review distinct from the declared source license', async () => {
    const generatedGuide = await repositoryFile('docs/generated-agent-guidance.md');

    expect(generatedGuide).not.toContain('private and unlicensed');
    expect(generatedGuide).toContain('does not by itself complete the owner/legal provenance review');
  });

  it('documents the approved community support and DCO policy', async () => {
    const [support, contributing, checklist] = await Promise.all([
      repositoryFile('SUPPORT.md'),
      repositoryFile('CONTRIBUTING.md'),
      repositoryFile('PUBLIC_RELEASE_CHECKLIST.md'),
    ]);

    expect(support).toContain('GitHub Discussions');
    expect(support).toMatch(/does not\s+provide a support SLA/);
    expect(contributing).toContain('Developer Certificate of Origin');
    expect(contributing).toContain('git commit --signoff');
    expect(contributing).toMatch(/does not use a Contributor License\s+Agreement/);
    expect(contributing).toContain('GitHub\'s Merge Queue');
    expect(checklist).toContain('[x] Use the Developer Certificate of Origin');
    expect(checklist).toContain('[x] Keep squash merge as the only enabled merge method');
  });

  it('records the enforced and proven merge queue gate', async () => {
    const checklist = await repositoryFile('PUBLIC_RELEASE_CHECKLIST.md');

    expect(checklist).toContain('[x] Require GitHub Merge Queue');
    expect(checklist).toContain('passes `offline-quality-gates`');
  });

  it('separates private ready-to-toggle gates from unauthorized transition-day actions', async () => {
    const checklist = await repositoryFile('PUBLIC_RELEASE_CHECKLIST.md');

    expect(checklist).toContain('## Private ready-to-toggle gates');
    expect(checklist).toContain('## Transition-day actions — not authorized');
    expect(checklist).toContain('Do not execute any transition-day action without separate explicit authorization.');
    expect(checklist).toContain('- [ ] Switch repository visibility to public.');
    expect(checklist).toContain('- [ ] Enable GitHub template status last.');
    expect(checklist).toContain('- [ ] Publish or deploy only under separate explicit authorization.');
  });

  it('makes hosted guest-assistant proof an explicit promotion gate', async () => {
    const [readme, guide, checklist] = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('docs/EMBEDDED_ASSISTANT.md'),
      repositoryFile('PUBLIC_RELEASE_CHECKLIST.md'),
    ]);

    expect(readme).toContain('primary guest website');
    expect(guide).toContain('Guest-first architecture');
    expect(guide).toContain('temporary authenticated migration reference');
    expect(checklist).toContain('[ ] Configure one real public embed ID');
    expect(checklist).toContain('[ ] Configure and monitor a real HTTPS privacy URL');
    expect(checklist).toContain('[ ] Prove the 30-minute selection TTL');
  });

  it('keeps the primary website on the exact-pair inline conversation architecture', async () => {
    const [
      conversation,
      message,
      registry,
      policy,
      architecture,
    ] = await Promise.all([
      repositoryFile('apps/web/src/components/travel-conversation.tsx'),
      repositoryFile('apps/web/src/components/travel-message.tsx'),
      repositoryFile('apps/web/src/components/travel-view-registry.tsx'),
      repositoryFile('apps/web/src/lib/travel-view-policy.ts'),
      repositoryFile('docs/architecture.md'),
    ]);

    expect(conversation).toContain('aria-label="Travel conversation"');
    expect(message).toContain('<TravelViewRegistry client={client} view={part.data} />');
    expect(registry).toContain('isInlineTravelView(view)');
    expect(registry).toContain('<NoodleAppView client={client} theme="light" view={view} />');
    expect(policy).toContain("search_flights: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget'");
    expect(policy).toContain("open_travel_starter: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget'");
    expect(architecture).toContain('Every distinct view ID is a distinct chronological invocation');
    await expect(access(new URL(
      '../apps/web/src/components/travel-journey-canvas.tsx',
      import.meta.url,
    ))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(new URL(
      '../apps/web/src/lib/journey-view.ts',
      import.meta.url,
    ))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps active developer guides on the inline exact-pair presentation contract', async () => {
    const activeGuides = await Promise.all([
      repositoryFile('docs/oauth.md'),
      repositoryFile('docs/nuitee-flights-contract.md'),
      repositoryFile('docs/PREMIUM_UI_PLAN.md'),
    ]);

    for (const guide of activeGuides) {
      expect(guide).toContain('one centered chronological conversation');
      expect(guide).toContain('Linked Apps stay inline at their original message-part positions.');
      expect(guide).toContain('Distinct view IDs are not generically deduplicated.');
      expect(guide).toContain(
        '`search_flights` + `ui://nuitee_travel_mcp_app_starter/search_flights_widget`',
      );
      expect(guide).toContain(
        '`open_travel_starter` + `ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget`',
      );
      expect(guide).toContain('Mismatched tool/resource pairs fail closed.');
      expect(guide).toMatch(/Current trip[^.]*inside the conversation\./);
      expect(guide).toContain('Local proof is not hosted proof.');
      expect(guide).not.toMatch(/journey[- ]canvas/i);
      expect(guide).not.toMatch(/newest(?: exact)? (?:FlightResults )?view/i);
      expect(guide).not.toMatch(/persistent current flight-results slot/i);
      expect(guide).not.toMatch(/known linked (?:Apps|views)[^.]*transcript/i);
      expect(guide).not.toContain('outside the conversation');
    }
  });

  it('records generic and app-mapped public preflights without claiming hosted readiness', async () => {
    const checklist = await repositoryFile('PUBLIC_RELEASE_CHECKLIST.md');

    expect(checklist).toContain('Exact generic host preflight');
    expect(checklist).toContain('App-mapped local preflight');
    expect(checklist).toContain(
      '`NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID` as the only missing name',
    );
    expect(checklist).toContain('process-only loopback coordinates');
    expect(checklist).toContain('does not prove hosted readiness');
  });

  it('documents the safe widget-domain customization path without claiming a default domain', async () => {
    const [readme, customization, config] = await Promise.all([
      repositoryFile('README.md'),
      repositoryFile('docs/customization.md'),
      repositoryFile('src/starter-config.ts'),
    ]);

    expect(readme).toContain('pnpm customize -- --widget-domain');
    expect(customization).toContain('--widget-domain "$DEPLOYMENT_WIDGET_ORIGIN"');
    expect(config).toContain('domain: null');
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
