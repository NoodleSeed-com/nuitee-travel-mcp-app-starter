import { createHash, randomUUID } from 'node:crypto';

// Portable, deterministic JSON. This is a content checksum, not a signature.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// An explicit projection keeps secrets, sessions, history and unapproved drafts out.
export function releaseContent(document) {
  const { settings, knowledge, connection, modelConnection } = document;
  return {
    settings: structuredClone(settings),
    knowledge: knowledge.filter(source => source.status === 'Published').map(({ id, title, kind, content, version }) => ({ id, title, kind, content, version })),
    provider: {
      configured: connection.configured, environment: connection.environment,
      status: connection.status, credentialVersion: connection.version || null,
    },
    ...(modelConnection ? { assistant: {
      configured: modelConnection.configured, baseUrl: modelConnection.baseUrl,
      model: modelConnection.model, transport: modelConnection.transport,
      credentialVersion: modelConnection.version,
    } } : {}),
  };
}

export function createRelease(document, sourceRevision) {
  const payload = { schemaVersion: document.modelConnection ? 2 : 1, sourceRevision, ...releaseContent(document) };
  return {
    ...payload, id: `r_${randomUUID()}`, createdAt: new Date().toISOString(),
    digest: createHash('sha256').update(canonicalJson(payload)).digest('hex'),
  };
}

export function releaseMatches(release, document) {
  if (!release) return false;
  const { settings, knowledge, provider, assistant } = release;
  return canonicalJson({ settings, knowledge, provider, ...(assistant ? { assistant } : {}) }) === canonicalJson(releaseContent(document));
}
