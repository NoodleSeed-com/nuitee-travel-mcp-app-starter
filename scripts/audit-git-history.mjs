import { execFileSync, spawnSync } from 'node:child_process';

const credentialNames = [
  'NUITEE_API_KEY',
  'ASSISTANT_MODEL_API_KEY',
  'NOODLE_ASSISTANT_CLIENT_SECRET',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
].join('|');

const detectors = [
  {
    name: 'private_key',
    pattern: ['-----BEGIN ', '(RSA |EC |OPENSSH |DSA )?', 'PRIVATE KEY-----'].join(''),
  },
  { name: 'github_token', pattern: '(gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{20,})' },
  { name: 'aws_access_key', pattern: 'AKIA[0-9A-Z]{16}' },
  { name: 'openai_key', pattern: 'sk-[A-Za-z0-9_-]{20,}' },
  { name: 'slack_token', pattern: 'xox[baprs]-[A-Za-z0-9-]{20,}' },
  { name: 'google_api_key', pattern: 'AIza[0-9A-Za-z_-]{35}' },
  { name: 'stripe_secret', pattern: 'sk_(live|test)_[0-9A-Za-z]{16,}' },
  {
    name: 'managed_secret_assignment',
    pattern: `(${credentialNames})[[:space:]]*=[[:space:]]*[^[:space:]#<][^[:space:]]+`,
  },
];

function gitOutput(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function pathsFromMatches(output) {
  return [...new Set(output.split('\n').filter(Boolean).map((line) => {
    const separator = line.indexOf(':');
    return separator >= 0 ? line.slice(separator + 1) : line;
  }))].sort();
}

const commits = gitOutput(['rev-list', '--all']).split('\n').filter(Boolean);
if (commits.length === 0) {
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code: 'git_history_empty' } })}\n`);
  process.exit(1);
}

const findings = [];
for (const detector of detectors) {
  const result = spawnSync('git', [
    'grep', '-I', '-l', '-E', '-e', detector.pattern, ...commits, '--',
  ], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status === 0) {
    findings.push({ detector: detector.name, paths: pathsFromMatches(result.stdout) });
  } else if (result.status !== 1) {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      error: { code: 'git_history_scan_failed', detector: detector.name },
    })}\n`);
    process.exit(1);
  }
}

if (findings.length > 0) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: {
      code: 'secret_pattern_detected',
      message: 'Potential credential material exists in reachable Git history. Matched values are intentionally omitted.',
      findings,
    },
  })}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  data: {
    commitsScanned: commits.length,
    detectorsRun: detectors.length,
    findings: 0,
  },
})}\n`);
