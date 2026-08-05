import {
  annotations,
  connector,
  customerAuth,
  customerEndpoint,
  embeddedAssistant,
  openAICompatible,
  secret,
  server,
  tool,
  variable,
  z,
} from '@noodleseed/one';

const customerApi = customerEndpoint('customer_api', {
  allowedHttpsHostSuffixes: ['api.noodleseed.dev'],
});

const noodleseedApi = connector('noodleseed_app_api')
  .version('1.0.0')
  .http({
    baseUrl: customerApi,
    auth: {
      kind: 'delegatedTokenExchange',
      tokenUrl: 'https://id.noodleseed.dev/oauth/token',
      clientId: variable('CUSTOMER_API_CLIENT_ID'),
      clientSecret: secret('CUSTOMER_API_CLIENT_SECRET'),
      scopes: ['organizations:read', 'org_apps:read', 'org_apps:write'],
      audience: 'noodleseed-customer-api',
    },
    operations: {
      list_org_apps: {
        type: 'read',
        method: 'GET',
        path: '/api/organizations/${args.org_id}/apps',
        query: ['skip', 'limit'],
        input: z.object({
          org_id: z.string(),
          skip: z.number().optional(),
          limit: z.number().optional(),
        }),
        output: z.object({ result: z.unknown().optional() }),
        response: {
          result: '${response}',
        },
      },
      list_organizations: {
        type: 'read',
        method: 'GET',
        path: '/api/organizations',
        output: z.object({ organizations: z.array(z.unknown()).optional() }),
        response: {
          organizations: '${response.organizations}',
        },
      },
      archive_org_app: {
        type: 'action',
        method: 'POST',
        path: '/api/organizations/${args.org_id}/apps/${args.app_id}/archive',
        input: z.object({
          org_id: z.string(),
          app_id: z.string(),
        }),
        output: z.object({ archived: z.boolean() }),
        response: {
          archived: '${response.archived}',
        },
      },
    },
  });

export default server(
  'noodleseed_customer_auth',
  {
    title: 'NoodleSeed.com Customer Auth',
    version: '1.0.0',
    branding: {
      name: 'Noodle Seed Assistant',
      accent: '#E85D24',
      surface: '#FFFFFF',
      surfaceDark: '#171310',
      colorScheme: 'auto',
      theme: {
        light: { accentText: '#FFFFFF', text: '#1C1714' },
        dark: { accent: '#FF8A4C', accentText: '#1C100A', text: '#FFF8F2' },
      },
    },
    use: { app_api: noodleseedApi },
    interactions: { confirmationFallback: 'host' },
    auth: customerAuth.oidc({
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
    }),
    instructions:
      'Direct/federated MCP OIDC demo. The customer IdP proves identity and privately selects the tenant API base URL, while the broker supplies delegated credentials and confirmed actions stay bound to the reviewed route.',
    assistant: embeddedAssistant({
      model: openAICompatible({
        baseUrl: variable('ASSISTANT_MODEL_BASE_URL'),
        model: variable('ASSISTANT_MODEL'),
        apiKey: secret('ASSISTANT_MODEL_API_KEY'),
      }),
      // Production origins are exact HTTPS; http://localhost:<port> is allowed for local development.
      allowedOrigins: [
        'https://app.noodleseed.com',
        'https://dev.noodleseed.com',
        'http://localhost:3000',
      ],
      layout: { mode: 'floating', position: 'bottom-right', panelWidth: 420 },
      labels: {
        welcomeHeading: 'How can I help with Noodle Seed?',
        composerPlaceholder: 'Ask about your apps…',
      },
      presentation: {
        panel: { surface: 'glass', elevation: 'soft', border: 'subtle' },
        launcher: { icon: 'brand-mark', status: 'session', effect: 'pulse' },
        header: {
          mark: 'status',
          badge: { text: 'Workspace online', tone: 'success', indicator: true },
        },
        composer: { leadingIcon: 'brand-mark', shape: 'pill' },
      },
      suggestedPrompts: ['Explain how to connect this customer-authenticated MCP server'],
    }),
  },
  [
    tool('list_org_apps', {
      title: 'List organization apps',
      description: 'List NoodleSeed.com apps for an organization from its customer API.',
      authorization: {
        requiredScopes: ['org_apps:read'],
        allowedRoles: ['org_admin', 'org_member'],
      },
      input: z.object({
        org_id: z.string().meta({ title: 'Organization' }),
        skip: z.number().int().min(0).optional().meta({ title: 'Starting item' }),
        limit: z.number().int().min(1).max(100).optional().meta({ title: 'Maximum results' }),
      }),
      output: z.object({
        result: z.unknown(),
      }),
      annotations: annotations.readOnly(),
      fulfil({ input, connectors }) {
        const apps = connectors.app_api.listOrgApps({
          org_id: input.org_id,
          skip: input.skip,
          limit: input.limit,
        });
        return {
          result: apps.result,
        };
      },
    }),
    tool('list_my_organizations', {
      title: 'List my organizations',
      description: 'List the NoodleSeed.com organizations the signed-in customer belongs to.',
      contextProvider: true,
      input: z.object({}),
      // The customer API returns every organization for the signed-in customer in one response, with no
      // page parameter to pass through, so the bound is declared on the shape. A customer belongs to a
      // handful of organizations; `noodle check` reports an unbounded list as
      // `tool_design_output_bounds`.
      output: z.object({
        organizations: z.array(z.unknown()).max(100),
      }),
      annotations: annotations.readOnly(),
      fulfil({ connectors }) {
        const organizations = connectors.app_api.listOrganizations();
        return {
          organizations: organizations.organizations,
        };
      },
    }),
    tool('archive_org_app', {
      title: 'Archive organization app',
      description: 'Archive one NoodleSeed.com app through its customer API after confirmation.',
      authorization: {
        requiredScopes: ['org_apps:write'],
        allowedRoles: ['org_admin'],
      },
      input: z.object({
        org_id: z.string().meta({ title: 'Organization' }),
        app_id: z.string().meta({ title: 'App' }),
      }),
      output: z.object({
        archived: z.boolean(),
      }),
      annotations: annotations.openAction({ destructive: false, confirm: true }),
      fulfil({ input, connectors }) {
        const result = connectors.app_api.archiveOrgApp({
          org_id: input.org_id,
          app_id: input.app_id,
        });
        return {
          archived: result.archived,
        };
      },
    }),
  ],
);
