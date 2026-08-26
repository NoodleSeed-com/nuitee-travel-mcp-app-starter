import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  {
    name: 'managed_secret_structured_value',
    pattern: `["']?(${credentialNames})["']?[[:space:]]*:[[:space:]]*["'][^"'[:space:]][^"']*["']`,
    ignoredLinePatterns: [
      /NOODLE_ASSISTANT_CLIENT_SECRET:\s*'client-secret-sentinel'/,
    ],
  },
];

const binaryArtifactExtension = /\.(?:7z|bin|bmp|docx?|gif|gz|ico|jpe?g|mov|mp3|mp4|otf|pdf|png|pptx?|tar|tgz|ttf|wasm|webm|webp|woff2?|xlsx?|zip)$/i;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewedBinaryBlobs = new Set(
  readFileSync(resolve(repositoryRoot, 'security/reviewed-binary-blobs.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);

function gitOutput(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function pathsFromMatches(output, ignoredLinePatterns = []) {
  const paths = [];
  for (const line of output.split('\n').filter(Boolean)) {
    const match = /^[^:]+:(.+?):\d+:(.*)$/.exec(line);
    if (!match || ignoredLinePatterns.some((pattern) => pattern.test(match[2]))) continue;
    paths.push(match[1]);
  }
  return [...new Set(paths)].sort();
}

const commits = gitOutput(['rev-list', '--all']).split('\n').filter(Boolean);
if (commits.length === 0) {
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code: 'git_history_empty' } })}\n`);
  process.exit(1);
}

const unreviewedBinaryPaths = [...new Set(
  gitOutput(['rev-list', '--objects', '--all'])
    .split('\n')
    .map((line) => {
      const separator = line.indexOf(' ');
      if (separator < 0) return undefined;
      const objectId = line.slice(0, separator);
      const path = line.slice(separator + 1);
      return binaryArtifactExtension.test(path) && !reviewedBinaryBlobs.has(`${objectId} ${path}`)
        ? path
        : undefined;
    })
    .filter(Boolean),
)].sort();

if (unreviewedBinaryPaths.length > 0) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: {
      code: 'unreviewed_binary_artifact',
      message: 'A reachable binary artifact has not completed exact-blob human review.',
      paths: unreviewedBinaryPaths,
    },
  })}\n`);
  process.exit(1);
}

const findings = [];
for (const detector of detectors) {
  const result = spawnSync('git', [
    'grep', '-n', '-E', '-e', detector.pattern, ...commits, '--',
  ], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status === 0) {
    const paths = pathsFromMatches(result.stdout, detector.ignoredLinePatterns);
    if (paths.length > 0) findings.push({ detector: detector.name, paths });
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
