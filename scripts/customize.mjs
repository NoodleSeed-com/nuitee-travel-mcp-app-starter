import { rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { starterConfig } from '../src/starter-config.ts';

const CONFIG_PATH = fileURLToPath(new URL('../src/starter-config.ts', import.meta.url));
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const HEX_COLOR = /^#[0-9A-F]{6}$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const RESERVED_HOSTS = new Set(['example.com', 'example.net', 'example.org']);
const RESERVED_SUFFIXES = ['.example', '.invalid', '.test'];
const OPTION_KEYS = new Set([
  'brandName',
  'brandMark',
  'tagline',
  'accent',
  'surface',
  'surfaceDark',
  'productionOrigin',
  'keepLocalDemo',
]);

function fail(message) {
  throw new Error(message);
}

function object(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const keys = Object.keys(value);
  const unexpected = keys.filter((key) => !expected.includes(key));
  const missing = expected.filter((key) => !keys.includes(key));
  if (unexpected.length > 0 || missing.length > 0) fail(`${label} has unsupported fields.`);
}

function boundedText(value, label, minimum, maximum) {
  if (typeof value !== 'string' || value !== value.trim() || value.length < minimum || value.length > maximum || CONTROL_CHARACTERS.test(value)) {
    fail(`${label} must be ${minimum}-${maximum} trimmed printable characters.`);
  }
  return value;
}

function color(value, label) {
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) fail(`${label} must use uppercase #RRGGBB notation.`);
  return value;
}

function isReservedHostname(hostname) {
  const canonical = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  return canonical === 'localhost' || canonical.endsWith('.localhost') ||
    RESERVED_HOSTS.has(canonical) ||
    [...RESERVED_HOSTS].some((reserved) => canonical.endsWith(`.${reserved}`)) ||
    RESERVED_SUFFIXES.some((suffix) => canonical === suffix.slice(1) || canonical.endsWith(suffix));
}

export function validateOrigin(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('*') || value.includes('[') || value.includes(']')) {
    fail('Embedded Assistant origins must be exact non-placeholder origins.');
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail('Embedded Assistant origins must be valid URLs.');
  }
  if (value !== parsed.origin || parsed.username || parsed.password) {
    fail('Embedded Assistant origins must not include paths, credentials, query strings, fragments, or trailing slashes.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol === 'http:') {
    if (!LOCAL_HOSTS.has(hostname) || parsed.port.length === 0) {
      fail('HTTP origins are restricted to explicit localhost development ports.');
    }
  } else if (parsed.protocol === 'https:') {
    if (LOCAL_HOSTS.has(hostname) || isReservedHostname(hostname)) {
      fail('Production origins must use a real deployment-owned HTTPS hostname.');
    }
  } else {
    fail('Embedded Assistant origins must use HTTPS or explicit HTTP loopback development origins.');
  }
  return value;
}

export function validateStarterConfig(input) {
  const config = object(input, 'Starter config');
  exactKeys(config, ['brand', 'embeddedAssistant'], 'Starter config');
  const brand = object(config.brand, 'Brand config');
  exactKeys(brand, ['name', 'mark', 'tagline', 'accent', 'surface', 'surfaceDark'], 'Brand config');
  const assistant = object(config.embeddedAssistant, 'Embedded Assistant config');
  exactKeys(assistant, ['origins'], 'Embedded Assistant config');
  if (!Array.isArray(assistant.origins) || assistant.origins.length < 1 || assistant.origins.length > 5) {
    fail('Embedded Assistant origins must contain one to five exact origins.');
  }
  const origins = assistant.origins.map(validateOrigin);
  if (new Set(origins).size !== origins.length) fail('Embedded Assistant origins must be unique.');
  return {
    brand: {
      name: boundedText(brand.name, 'Brand name', 2, 60),
      mark: boundedText(brand.mark, 'Brand mark', 1, 3),
      tagline: boundedText(brand.tagline, 'Brand tagline', 3, 120),
      accent: color(brand.accent, 'Accent color'),
      surface: color(brand.surface, 'Surface color'),
      surfaceDark: color(brand.surfaceDark, 'Dark surface color'),
    },
    embeddedAssistant: { origins },
  };
}

export function renderStarterConfig(input) {
  const validated = validateStarterConfig(input);
  return `export const starterConfig = ${JSON.stringify(validated, null, 2)} as const;\n`;
}

export function applyCustomization(current, options = {}) {
  const unknown = Object.keys(options).filter((key) => !OPTION_KEYS.has(key));
  if (unknown.length > 0) fail('Customization includes unsupported fields.');
  if (options.keepLocalDemo !== undefined && typeof options.keepLocalDemo !== 'boolean') {
    fail('Local demo retention must be a boolean option.');
  }
  if (options.keepLocalDemo && options.productionOrigin === undefined) {
    fail('Local demo retention is meaningful only with a production origin.');
  }
  if (options.productionOrigin !== undefined) {
    validateOrigin(options.productionOrigin);
    if (new URL(options.productionOrigin).protocol !== 'https:') {
      fail('Production origins must use HTTPS.');
    }
  }
  const validated = validateStarterConfig(current);
  const next = {
    brand: {
      name: options.brandName ?? validated.brand.name,
      mark: options.brandMark ?? validated.brand.mark,
      tagline: options.tagline ?? validated.brand.tagline,
      accent: options.accent ?? validated.brand.accent,
      surface: options.surface ?? validated.brand.surface,
      surfaceDark: options.surfaceDark ?? validated.brand.surfaceDark,
    },
    embeddedAssistant: {
      origins: options.productionOrigin === undefined
        ? validated.embeddedAssistant.origins
        : [
            ...(options.keepLocalDemo
              ? ['http://localhost:5173']
              : []),
            options.productionOrigin,
          ],
    },
  };
  const config = validateStarterConfig(next);
  const content = renderStarterConfig(config);
  return { config, content, changed: content !== renderStarterConfig(validated) };
}

function parseArguments(argumentsList) {
  const options = {};
  let check = false;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--') continue;
    if (argument === '--check') {
      check = true;
      continue;
    }
    if (argument === '--keep-local-demo') {
      options.keepLocalDemo = true;
      continue;
    }
    const fields = {
      '--brand-name': 'brandName',
      '--brand-mark': 'brandMark',
      '--tagline': 'tagline',
      '--accent': 'accent',
      '--surface': 'surface',
      '--surface-dark': 'surfaceDark',
      '--production-origin': 'productionOrigin',
    };
    const field = fields[argument];
    if (!field) fail('Unknown customization option.');
    const value = argumentsList[index + 1];
    if (value === undefined || value.startsWith('--')) fail('Customization option is missing its value.');
    options[field] = value;
    index += 1;
  }
  return { check, options };
}

async function main() {
  const { check, options } = parseArguments(process.argv.slice(2));
  const result = applyCustomization(starterConfig, options);
  if (check) {
    if (result.changed) fail('Starter presentation config is not canonical.');
    console.log('Starter presentation config is valid.');
    return;
  }
  if (!result.changed) {
    console.log('Starter presentation config already matches the requested values.');
    return;
  }
  const temporaryPath = resolve(dirname(CONFIG_PATH), `.starter-config.${process.pid}.tmp`);
  try {
    await writeFile(temporaryPath, result.content, { encoding: 'utf8', mode: 0o644, flag: 'wx' });
    await rename(temporaryPath, CONFIG_PATH);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  console.log('Starter presentation config updated. Run the full offline checks before review.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Customization failed.');
    process.exitCode = 1;
  });
}
