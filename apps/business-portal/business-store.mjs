import { randomBytes, randomUUID } from 'node:crypto';
import { PortalStore, sessionHash } from './store.mjs';
import * as validate from './validation.mjs';

const emptyModel = () => ({ configured: false, baseUrl: null, model: null, transport: 'responses', version: null });
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function modelInput(value) {
  validate.fields(value, ['revision', 'baseUrl', 'model', 'transport', 'apiKey']);
  const baseUrl = validate.text(value.baseUrl, 'Model endpoint', 1, 2048);
  let url;
  try { url = new URL(baseUrl); } catch { validate.fail(400, 'Enter a valid model endpoint.'); }
  if (url.username || url.password || url.search || url.hash || url.protocol !== 'https:') {
    validate.fail(400, 'Use an HTTPS model endpoint without credentials or query parameters.');
  }
  if (!['responses', 'chat-completions'].includes(value.transport)) validate.fail(400, 'Choose a supported model transport.');
  if (typeof value.apiKey !== 'string' || value.apiKey.length < 8 || value.apiKey.length > 2048 || /\s|[^\x21-\x7e]/.test(value.apiKey)) {
    validate.fail(400, 'Enter a valid model API key.');
  }
  return { revision: validate.revision(value.revision), baseUrl: url.href.replace(/\/$/, ''), model: validate.text(value.model, 'Model name', 1, 120), transport: value.transport, apiKey: value.apiKey };
}

/** Single local business. Versioned credentials never enter release exports. */
export class BusinessStore extends PortalStore {
  constructor(dataDir) {
    super(dataDir);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS credential_versions (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('provider','model')), encrypted TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS business_publication (
        id INTEGER PRIMARY KEY CHECK(id = 1), active_release TEXT, previous_release TEXT, activated_at TEXT
      );
      INSERT OR IGNORE INTO business_publication VALUES (1, NULL, NULL, NULL);
      CREATE TABLE IF NOT EXISTS preview_tickets (
        token_hash TEXT PRIMARY KEY, owner_session TEXT NOT NULL REFERENCES sessions(id_hash) ON DELETE CASCADE,
        release_id TEXT NOT NULL REFERENCES releases(id), expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS preview_sessions (
        token_hash TEXT PRIMARY KEY, owner_session TEXT NOT NULL REFERENCES sessions(id_hash) ON DELETE CASCADE,
        release_id TEXT NOT NULL REFERENCES releases(id), expires_at INTEGER NOT NULL
      );
    `);
    if (this.owner()) this.upgradeDocument();
  }

  createOwner(input) { const owner = super.createOwner(input); this.upgradeDocument(); return owner; }

  upgradeDocument() {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const state = this.read();
      let changed = false;
      if (!state.document.modelConnection) { state.document.modelConnection = emptyModel(); changed = true; }
      if (state.encryptedKey) {
        if (!state.document.connection.version) { state.document.connection.version = randomUUID(); changed = true; }
        this.db.prepare('INSERT OR IGNORE INTO credential_versions VALUES (?, ?, ?)')
          .run(state.document.connection.version, 'provider', state.encryptedKey);
      }
      if (changed) this.db.prepare('UPDATE workspace SET revision = ?, document = ? WHERE id = 1')
        .run(state.revision + 1, JSON.stringify(state.document));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  saveConnection({ revision, apiKey, environment }) {
    return this.mutate(revision, (state, owner) => {
      const version = randomUUID();
      state.encryptedKey = this.encrypt(apiKey);
      this.db.prepare('INSERT INTO credential_versions VALUES (?, ?, ?)').run(version, 'provider', state.encryptedKey);
      state.document.connection = { configured: true, status: 'saved', environment, checkedAt: null, version };
      this.record(state.document, 'Nuitée key saved', `${owner.name} saved a new connection version. Publish a reviewed version to apply it.`);
    });
  }

  saveModel(input) {
    const { revision, apiKey, baseUrl, model, transport } = modelInput(input);
    return this.mutate(revision, (state, owner) => {
      const version = randomUUID();
      this.db.prepare('INSERT INTO credential_versions VALUES (?, ?, ?)').run(version, 'model', this.encrypt(apiKey));
      state.document.modelConnection = { configured: true, baseUrl, model, transport, version };
      this.record(state.document, 'Assistant model saved', `${owner.name} saved model settings for the next reviewed version.`);
    });
  }

  removeModel(revision) {
    return this.mutate(revision, (state, owner) => {
      state.document.modelConnection = emptyModel();
      this.db.prepare("DELETE FROM credential_versions WHERE kind = 'model'").run();
      this.clearPreviewAccess();
      this.record(state.document, 'Assistant model removed', `${owner.name} removed the model connection. Local chat is stopped.`);
    });
  }

  removeConnection(revision) {
    return this.mutate(revision, (state, owner) => {
      state.encryptedKey = null;
      state.document.connection = { configured: false, status: 'disconnected', environment: null, checkedAt: null };
      this.db.prepare("DELETE FROM credential_versions WHERE kind = 'provider'").run();
      this.clearPreviewAccess();
      this.record(state.document, 'Nuitée key removed', `${owner.name} removed all saved provider key versions. Local chat is stopped.`);
    });
  }

  runtimeSecrets(release) {
    if (!release.provider?.configured || !release.assistant?.configured) validate.fail(409, 'Save both the Nuitée connection and assistant model settings first.');
    const get = (kind, version) => {
      const row = this.db.prepare('SELECT encrypted FROM credential_versions WHERE kind = ? AND id = ?').get(kind, version);
      if (!row) validate.fail(409, 'A credential used by this version was removed. Prepare a new version with current connections.');
      return this.decrypt(row.encrypted);
    };
    return { providerKey: get('provider', release.provider.credentialVersion), modelKey: get('model', release.assistant.credentialVersion) };
  }

  publication() { return this.db.prepare('SELECT * FROM business_publication WHERE id = 1').get(); }

  activate(revision, releaseId) {
    return this.mutate(revision, (state, owner) => {
      const previous = this.publication();
      if (previous.active_release === releaseId) return;
      this.db.prepare('UPDATE business_publication SET active_release = ?, previous_release = ?, activated_at = ? WHERE id = 1')
        .run(releaseId, previous.active_release, new Date().toISOString());
      this.record(state.document, 'Traveler version published', `${owner.name} published the reviewed version to this local storefront.`);
    });
  }

  clearPreviewAccess() { this.db.exec('DELETE FROM preview_tickets; DELETE FROM preview_sessions;'); }

  previewTicket(releaseId, ownerToken) {
    if (!this.session(ownerToken)) validate.fail(401, 'Sign in to continue.');
    const now = Date.now();
    this.db.prepare('DELETE FROM preview_tickets WHERE expires_at <= ?').run(now);
    const token = randomBytes(32).toString('base64url');
    // Only one unused handoff per owner session; avoid retaining forgotten tickets.
    this.db.prepare('DELETE FROM preview_tickets WHERE owner_session = ?').run(sessionHash(ownerToken));
    this.db.prepare('INSERT INTO preview_tickets VALUES (?, ?, ?, ?)').run(sessionHash(token), sessionHash(ownerToken), releaseId, now + 60_000);
    return token;
  }

  exchangePreviewTicket(ticket) {
    if (typeof ticket !== 'string' || !TOKEN.test(ticket)) validate.fail(401, 'Open a fresh preview link from the signed-in portal.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const now = Date.now();
      const row = this.db.prepare('SELECT t.*, s.expires_at AS owner_expires FROM preview_tickets t JOIN sessions s ON s.id_hash = t.owner_session WHERE t.token_hash = ?').get(sessionHash(ticket));
      if (!row || row.expires_at <= now || row.owner_expires <= now) validate.fail(401, 'This preview link expired. Open a fresh link from the portal.');
      this.db.prepare('DELETE FROM preview_tickets WHERE token_hash = ?').run(sessionHash(ticket));
      const token = randomBytes(32).toString('base64url');
      const expiresAt = Math.min(now + 15 * 60_000, row.owner_expires);
      this.db.prepare('DELETE FROM preview_sessions WHERE expires_at <= ? OR owner_session = ?').run(now, row.owner_session);
      this.db.prepare('INSERT INTO preview_sessions VALUES (?, ?, ?, ?)').run(sessionHash(token), row.owner_session, row.release_id, expiresAt);
      this.db.exec('COMMIT');
      return { token, expiresAt: new Date(expiresAt).toISOString(), releaseId: row.release_id };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  previewSession(token) {
    if (typeof token !== 'string' || !TOKEN.test(token)) return null;
    const row = this.db.prepare('SELECT p.release_id, p.expires_at, s.expires_at AS owner_expires FROM preview_sessions p JOIN sessions s ON s.id_hash = p.owner_session WHERE p.token_hash = ?').get(sessionHash(token));
    if (!row || row.expires_at <= Date.now() || row.owner_expires <= Date.now()) return null;
    return { releaseId: row.release_id, userId: String(this.owner().id), expiresAt: row.expires_at };
  }
}
