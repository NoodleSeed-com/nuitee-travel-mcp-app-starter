import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const CITY_OVERRIDES = {
  ISB: 'Islamabad',
};

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/u, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/u, ''));
    rows.push(row);
  }
  return rows;
}

const inputPath = path.resolve(argument('--input'));
const outputPath = path.resolve(argument('--output'));
const snapshot = argument('--snapshot');
const sha256 = argument('--sha256').toLowerCase();
if (!/^\d{4}-\d{2}-\d{2}$/u.test(snapshot)) {
  throw new Error('Snapshot must be YYYY-MM-DD');
}
if (!/^[a-f0-9]{64}$/u.test(sha256)) {
  throw new Error('SHA-256 must be 64 lowercase hexadecimal characters');
}

const rows = parseCsv(await readFile(inputPath, 'utf8'));
const header = rows.shift();
if (!header) throw new Error('Airport CSV is empty');
const column = Object.fromEntries(header.map((name, index) => [name, index]));
for (const required of [
  'type', 'scheduled_service', 'iata_code', 'iso_country',
  'municipality', 'name', 'latitude_deg', 'longitude_deg',
]) {
  if (column[required] === undefined) {
    throw new Error(`Airport CSV is missing ${required}`);
  }
}

const airports = rows.flatMap((entry) => {
  if (
    entry[column.type] !== 'large_airport'
    || entry[column.scheduled_service] !== 'yes'
  ) return [];
  const iata = entry[column.iata_code]?.trim().toUpperCase();
  const country = entry[column.iso_country]?.trim().toUpperCase();
  const city = (CITY_OVERRIDES[iata]
    || entry[column.municipality]
    || entry[column.name])?.trim();
  const latitude = Number(entry[column.latitude_deg]);
  const longitude = Number(entry[column.longitude_deg]);
  if (
    !/^[A-Z]{3}$/u.test(iata)
    || !/^[A-Z]{2}$/u.test(country)
    || !city
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) return [];
  return [{ iata, city, country, latitude, longitude }];
}).sort((left, right) => (
  left.iata.localeCompare(right.iata)
  || left.country.localeCompare(right.country)
  || left.city.localeCompare(right.city)
));

const lines = airports.map((airport) => (
  `  { iata: ${JSON.stringify(airport.iata)}, city: ${JSON.stringify(airport.city)}, country: ${JSON.stringify(airport.country)}, latitude: ${airport.latitude}, longitude: ${airport.longitude} },`
));
const output = [
  '// Generated file. Do not edit by hand.',
  '// Source: https://ourairports.com/data/',
  '// License: https://github.com/davidmegginson/ourairports-data/blob/main/LICENSE (public domain)',
  `// Snapshot: ${snapshot}`,
  `// Source SHA-256: ${sha256}`,
  '// Filter: large_airport + scheduled_service=yes + valid IATA/country/coordinates; ISB passenger city label normalized to Islamabad.',
  'export const AIRPORTS = [',
  ...lines,
  '] as const;',
  '',
].join('\n');

await writeFile(outputPath, output, 'utf8');
process.stdout.write(JSON.stringify({ ok: true, airports: airports.length, output: outputPath }) + '\n');
