// This is a source-distribution allowlist, not a runtime or deployment manifest.
const rootFiles = new Set([
  '.dockerignore', '.env.example', '.gitattributes', '.gitignore',
  'CHANGELOG.md', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'Dockerfile', 'LICENSE', 'NOTICE',
  'PUBLIC_RELEASE_CHECKLIST.md', 'README.md', 'SECURITY.md', 'SPEC.md', 'SUPPORT.md',
  'THIRD_PARTY_NOTICES.md', 'fly.toml', 'noodle.json', 'package.json',
  'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'starter.config.ts', 'tsconfig.json',
  'vite.config.ts', 'vitest.browser.config.ts',
]);
const publicDocs = new Set([
  'FLY_DEPLOYMENT.md', 'EMBEDDED_ASSISTANT.md', 'WAYFARE_TRAVEL_COMPANION.md',
  'architecture.md', 'canonical-domain.md', 'customization.md', 'fixture-safety.md',
  'generated-agent-guidance.md', 'nuitee-flights-contract.md', 'oauth.md',
  'privacy.md', 'session-foundation.md', 'troubleshooting.md', 'public-template-release.md',
]);
export function approvedPublicPath(path) {
  if (rootFiles.has(path)) return true;
  if (/^(?:apps|examples|src|test|scripts|security|\.github)\//.test(path)) return true;
  if (/^docs\/(?:brand|images|visual-assets)\//.test(path)) return true;
  return path.startsWith('docs/') && publicDocs.has(path.slice(5));
}
export function forbiddenPublicPath(path) {
  return path.split('/').some((part) => ['.git', '.noodle', 'node_modules', '.next', 'dist', '.worktrees', '.superpowers'].includes(part))
    || /(?:^|\/)\.env(?:\..*)?$/.test(path) && !path.endsWith('/.env.example') && path !== '.env.example'
    || /\.(?:pem|p12|pfx|key)$/i.test(path);
}
