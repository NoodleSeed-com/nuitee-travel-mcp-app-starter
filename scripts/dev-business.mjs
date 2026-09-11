import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ports = [3100, 3103, 3105, 3106, 3107];
for (const port of ports) {
  await new Promise((done, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(port, port === 3100 ? 'localhost' : '127.0.0.1', () => server.close(done));
  }).catch(() => { console.error(`Local port ${port} is occupied. Stop only your previous combined workspace instance, then retry.`); process.exit(1); });
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true; process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
}
const portal = spawn(process.execPath, ['apps/business-portal/server.mjs'], { cwd: root, stdio: 'inherit', env: {
  ...process.env, PORT: '3103', DATA_DIR: process.env.WAYFARE_BUSINESS_DATA_DIR || resolve(root, '.local/business-portal'),
  WAYFARE_BUSINESS_ROOT: root, WAYFARE_STOREFRONT_ORIGIN: 'http://localhost:3100', PORTAL_TRAVELER_URL: 'http://localhost:3100',
} });
children.push(portal);
const web = spawn(process.execPath, [resolve(root, 'apps/web/node_modules/next/dist/bin/next'), 'dev', '--hostname', 'localhost', '--port', '3100'], {
  cwd: resolve(root, 'apps/web'), stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', WAYFARE_BUSINESS_PORTAL_ORIGIN: 'http://127.0.0.1:3103',
    WAYFARE_STOREFRONT_ORIGIN: 'http://localhost:3100', WAYFARE_BUSINESS_RUNTIME_ORIGINS: ports.slice(2).map(port => `http://127.0.0.1:${port}`).join(',') },
});
children.push(web);
for (const child of children) {
  child.once('error', () => stop(1));
  child.once('exit', code => { if (!stopping) stop(code || 1); });
}
process.once('SIGINT', () => stop()); process.once('SIGTERM', () => stop());
console.log('Storefront: http://localhost:3100\nBusiness portal: http://127.0.0.1:3103\nPrivate chat starts only after you configure and preview a saved version.');
