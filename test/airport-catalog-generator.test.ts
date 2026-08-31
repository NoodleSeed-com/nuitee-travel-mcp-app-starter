import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFile = promisify(execFileCallback);
const temporaryDirectories: string[] = [];

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'wayfare-airports-'));
  temporaryDirectories.push(directory);
  const input = path.join(directory, 'airports.csv');
  const output = path.join(directory, 'airports.generated.ts');
  const source = [
    'type,scheduled_service,iata_code,iso_country,municipality,name,latitude_deg,longitude_deg',
    'large_airport,yes,ISB,PK,Attock,Islamabad International Airport,33.6167,73.0992',
    'small_airport,yes,AAA,PF,Anaa,Anaa Airport,-17.3526,-145.51',
    '',
  ].join('\n');
  await writeFile(input, source, 'utf8');
  return { input, output, source };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { recursive: true, force: true })
  )));
});

describe('airport catalog generator', () => {
  it('fails closed when the claimed snapshot hash does not match the CSV bytes', async () => {
    const { input, output } = await fixture();

    const failure = await execFile(process.execPath, [
      'scripts/generate-airport-catalog.mjs',
      '--input', input,
      '--output', output,
      '--snapshot', '2026-08-31',
      '--sha256', '0'.repeat(64),
    ]).then(
      () => undefined,
      (error) => error as { stderr?: string },
    );

    expect(failure).toBeDefined();
    expect(failure?.stderr).toMatch(/SHA-256 mismatch/u);
  });

  it('emits only eligible airports after verifying the source hash', async () => {
    const { input, output, source } = await fixture();
    const sha256 = createHash('sha256').update(source).digest('hex');

    const result = await execFile(process.execPath, [
      'scripts/generate-airport-catalog.mjs',
      '--input', input,
      '--output', output,
      '--snapshot', '2026-08-31',
      '--sha256', sha256,
    ]);

    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, airports: 1 });
    const generated = await readFile(output, 'utf8');
    expect(generated).toContain(`Source SHA-256: ${sha256}`);
    expect(generated).toContain('city: "Islamabad"');
    expect(generated).not.toContain('iata: "AAA"');
  });
});
