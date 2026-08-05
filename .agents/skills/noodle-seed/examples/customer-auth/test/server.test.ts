import { describe, expect, it } from 'vitest';
import app from '../src/server.js';

describe('customer-auth example', () => {
  it('exports a customer-authenticated, customer-branded embedded assistant', async () => {
    expect(typeof app.toManifest).toBe('function');
    const manifest = await app.toManifest();
    expect(manifest.server.assistant).toMatchObject({
      model: { kind: 'openai-compatible', apiKey: 'ASSISTANT_MODEL_API_KEY' },
      layout: { mode: 'floating' },
      presentation: {
        panel: { surface: 'glass', elevation: 'soft', border: 'subtle' },
        launcher: { icon: 'brand-mark', status: 'session', effect: 'pulse' },
        header: { mark: 'status', badge: { text: 'Workspace online', tone: 'success' } },
      },
    });
    expect(
      manifest.server.assistant?.allowedOrigins.every(
        (origin) => origin.startsWith('https://') || origin.startsWith('http://localhost:'),
      ),
    ).toBe(true);
    expect(manifest.server.branding).toMatchObject({
      name: 'Noodle Seed Assistant',
      colorScheme: 'auto',
    });
    expect(manifest.server.auth).toEqual({
      kind: 'oidc',
      issuer: 'https://id.noodleseed.dev',
      audience: 'noodleseed-customer-auth-prod',
      claims: {
        id: 'sub',
        email: 'email',
        name: 'name',
        orgs: 'permissions.orgs',
        roles: 'permissions.roles',
        scopes: 'permissions.scopes',
      },
      routing: {
        endpoints: {
          customer_api: { claim: 'tenant.api_base_url' },
        },
      },
    });
    expect(manifest.server.interactions).toEqual({ confirmationFallback: 'host' });
    const catalog = app.toConnectorCatalog();
    expect(catalog?.connectors).toHaveLength(1);
    expect(catalog?.connectors[0]?.http).toMatchObject({
      baseUrl: {
        kind: 'customerEndpoint',
        name: 'customer_api',
        policy: { allowedHttpsHostSuffixes: ['api.noodleseed.dev'] },
      },
      auth: {
        kind: 'delegatedTokenExchange',
        tokenUrl: 'https://id.noodleseed.dev/oauth/token',
        clientId: '${env.CUSTOMER_API_CLIENT_ID}',
        clientSecret: 'CUSTOMER_API_CLIENT_SECRET',
      },
    });
    expect(catalog?.connectors[0]?.operations).toMatchObject({
      list_org_apps: { type: 'read' },
      list_organizations: { type: 'read' },
      archive_org_app: { type: 'action', method: 'POST' },
    });
    expect(catalog?.connectors[0]?.http).not.toHaveProperty('allowedOrigins');
    expect(JSON.stringify({ manifest, catalog })).not.toContain('tenant-a.api.noodleseed.dev');
    expect(manifest.tools.find((tool) => tool.name === 'list_org_apps')?.authorization).toEqual({
      requiredScopes: ['org_apps:read'],
      allowedRoles: ['org_admin', 'org_member'],
    });
    expect(
      manifest.tools.find((tool) => tool.name === 'list_my_organizations')?.authorization,
    ).toBeUndefined();
    expect(manifest.tools.find((tool) => tool.name === 'archive_org_app')).toMatchObject({
      authorization: {
        requiredScopes: ['org_apps:write'],
        allowedRoles: ['org_admin'],
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
        confirm: true,
      },
    });
  });
});
