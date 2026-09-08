import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function requireHttpsOrigin(value, name) {
  let url;
  try { url = new URL(value); } catch { /* report only the variable name */ }
  if (!url || url.protocol !== 'https:' || value !== url.origin ||
    url.username || url.password || value.includes('*') ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error(`${name} must be an exact deployment-owned HTTPS origin without a trailing slash, credentials, path, query, or fragment.`);
  }
}

export function validateFlyDeployment(env) {
  if (env.ENABLE_FLY_DEPLOY !== 'true') throw new Error('ENABLE_FLY_DEPLOY must explicitly be true.');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(env.FLY_APP ?? '')) {
    throw new Error('FLY_APP must be your Fly app name (lowercase letters, digits, and internal hyphens).');
  }
  requireHttpsOrigin(env.FLY_DEPLOY_URL, 'FLY_DEPLOY_URL');
  requireHttpsOrigin(env.NEXT_PUBLIC_NOODLE_SERVICE_URL, 'NEXT_PUBLIC_NOODLE_SERVICE_URL');
  if (!env.NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID?.trim()) {
    throw new Error('NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID must be configured.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    validateFlyDeployment(process.env);
    console.log('Fly deployment coordinates are valid.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
