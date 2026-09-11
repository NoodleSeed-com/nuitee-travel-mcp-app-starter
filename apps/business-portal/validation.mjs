export class PortalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function fail(status, message) { throw new PortalError(status, message); }

export function fields(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || required.some((key) => !Object.hasOwn(value, key))
      || Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))) {
    fail(400, 'The request contains missing or unsupported fields.');
  }
  return value;
}

export function text(value, label, min, max) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail(400, `${label} is invalid.`);
  }
  const result = value.trim();
  if (result.length < min) fail(400, `${label} is required.`);
  return result;
}

function choice(value, allowed, label) {
  if (!allowed.includes(value)) fail(400, `${label} is not supported.`);
  return value;
}

export function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, 'A valid workspace revision is required.');
  return value;
}

export function email(value) {
  const result = text(value, 'Email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, 'Enter a valid email address.');
  return result;
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 || value.includes('\0')) {
    fail(400, 'Use a password between 12 and 128 characters.');
  }
  return value;
}

export function settings(value) {
  fields(value, ['name', 'initials', 'welcome', 'theme', 'currency', 'language', 'tone', 'adults', 'nights', 'capabilities']);
  fields(value.capabilities, ['flights', 'hotels', 'experiences', 'cars', 'checkout']);
  if (Object.values(value.capabilities).some((entry) => typeof entry !== 'boolean')) fail(400, 'Capability preferences must be true or false.');
  if (typeof value.theme !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value.theme)) fail(400, 'Choose a valid accent color.');
  return {
    name: text(value.name, 'Business name', 1, 40),
    initials: text(value.initials, 'Brand initials', 1, 3),
    welcome: text(value.welcome, 'Welcome message', 1, 90),
    theme: value.theme.toLowerCase(),
    currency: choice(value.currency, ['CAD', 'USD', 'GBP', 'EUR'], 'Currency'),
    language: choice(value.language, ['English', 'French', 'Spanish'], 'Language'),
    tone: choice(value.tone, ['Warm and helpful', 'Concise and practical', 'Thoughtful and detailed'], 'Tone'),
    adults: choice(value.adults, ['1 adult', '2 adults'], 'Adult default'),
    nights: choice(value.nights, ['1 night', '2 nights', '3 nights'], 'Stay length default'),
    capabilities: { ...value.capabilities },
  };
}

export function knowledge(value) {
  fields(value, ['revision', 'title', 'kind', 'content'], ['id']);
  if (value.id !== undefined && (typeof value.id !== 'string' || !/^k_[a-f0-9-]{36}$/.test(value.id))) fail(400, 'The knowledge source is invalid.');
  return {
    revision: revision(value.revision),
    ...(value.id === undefined ? {} : { id: value.id }),
    title: text(value.title, 'Source title', 1, 100),
    kind: choice(value.kind, ['Business', 'FAQ', 'Policy'], 'Knowledge type'),
    content: text(value.content, 'Source content', 1, 4000),
  };
}

export function connection(value) {
  fields(value, ['revision', 'apiKey', 'environment']);
  if (typeof value.apiKey !== 'string' || value.apiKey.length < 8 || value.apiKey.length > 512 || /\s|[^\x21-\x7e]/.test(value.apiKey)) {
    fail(400, 'Enter a valid Nuitée key.');
  }
  return {
    revision: revision(value.revision), apiKey: value.apiKey,
    environment: choice(value.environment, ['sandbox', 'production'], 'Environment'),
  };
}

export function travelerUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid traveler URL configuration.');
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('Invalid traveler URL configuration.'); }
  if (value !== value.trim() || parsed.username || parsed.password || parsed.hash || parsed.search || parsed.hostname === '127.0.0.1'
      || !(['http:', 'https:'].includes(parsed.protocol))
      || parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('Traveler URL requires HTTPS or localhost HTTP, without credentials, query or fragment; use a different hostname from the portal.');
  }
  return parsed.href;
}
