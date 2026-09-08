import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { approvedPublicPath, forbiddenPublicPath } from './public-template-policy.mjs';

const entries = execFileSync('git', ['ls-files', '--stage', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean).map((entry) => {
  const [head, ...path] = entry.split('\t'); return { mode: head.split(' ')[0], path: path.join('\t') };
});
const tracked = new Set(entries.map(({ path }) => path));
const issues = [];
for (const { mode, path } of entries) {
  if ((!approvedPublicPath(path) && !['AGENTS.md', 'CLAUDE.md'].includes(path)) || forbiddenPublicPath(path) || !['100644', '100755'].includes(mode)) issues.push({ path, code: 'not_public_distribution_content' });
}
for (const { path } of entries.filter(({ path }) => path.endsWith('.md') && approvedPublicPath(path))) {
  const content = readFileSync(path, 'utf8');
  for (const match of content.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!link || /^(?:https?:|mailto:|data:)/.test(link)) continue;
    let target;
    try { target = posix.normalize(posix.join(posix.dirname(path), decodeURIComponent(link))); } catch { issues.push({ path, code: 'invalid_document_link' }); continue; }
    if (!tracked.has(target) && ![...tracked].some((file) => file.startsWith(`${target.replace(/\/$/, '')}/`))) issues.push({ path, code: 'broken_local_document_link', target });
  }
}
process.stdout.write(`${JSON.stringify(issues.length ? { ok: false, error: { code: 'public_distribution_audit_failed', issues } } : { ok: true, data: { files: entries.length, issues: 0 } })}\n`);
process.exit(issues.length ? 1 : 0);
