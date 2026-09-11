import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fail } from './validation.mjs';
import { createRelease, releaseMatches } from './releases.mjs';

export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
export const sessionHash = (token) => createHash('sha256').update(token).digest('hex');
const disconnected = () => ({ configured: false, status: 'disconnected', environment: null, checkedAt: null });

function privateFile(filename, create) {
  let descriptor;
  try {
    descriptor = openSync(filename, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    create?.(descriptor);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  const stat = lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Private storage must use regular, unlinked files.');
  chmodSync(filename, 0o600);
}

function installationKey(filename) {
  privateFile(filename, (descriptor) => writeFileSync(descriptor, randomBytes(32)));
  const descriptor = openSync(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(descriptor).isFile()) throw new Error('Invalid private key file.');
    const key = readFileSync(descriptor);
    if (key.length !== 32) throw new Error('Invalid private key file.');
    return key;
  } finally { closeSync(descriptor); }
}

export class PortalStore {
  constructor(dataDir) {
    this.dataDir = resolve(dataDir);
    mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    const directory = lstatSync(this.dataDir);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('Private storage must use a directory, not a symlink.');
    chmodSync(this.dataDir, 0o700);
    const filename = join(this.dataDir, 'portal.sqlite');
    const keyFilename = join(this.dataDir, 'installation.key');
    if (existsSync(filename) && lstatSync(filename).size > 0 && !existsSync(keyFilename)) {
      throw new Error('The existing portal installation key is missing. Restore the matching private backup.');
    }
    this.key = installationKey(keyFilename);
    privateFile(filename);
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA journal_mode = DELETE;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      PRAGMA secure_delete = ON;
      CREATE TABLE IF NOT EXISTS owner (
        id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspace (
        id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL,
        document TEXT NOT NULL, connection_secret TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id_hash TEXT PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES owner(id),
        csrf_token TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS releases (
        id TEXT PRIMARY KEY, document TEXT NOT NULL
      );
    `);
  }

  close() { this.db.close(); this.key.fill(0); }
  owner() { return this.db.prepare('SELECT * FROM owner WHERE id = 1').get(); }
  publicOwner(owner = this.owner()) { return owner ? { id: String(owner.id), name: owner.name, email: owner.email } : null; }

  createOwner({ name, email, businessName, salt, passwordHash }) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.owner()) fail(409, 'The owner account is already set up. Sign in instead.');
      this.db.prepare('INSERT INTO owner VALUES (1, ?, ?, ?, ?)').run(name, email, salt, passwordHash);
      const words = businessName.split(/\s+/);
      const initials = (words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join('') : businessName.slice(0, 2)).toUpperCase();
      const document = {
        settings: { name: businessName, initials, welcome: 'A little further. A little more you.', theme: '#66ccff',
          currency: 'CAD', language: 'English', tone: 'Warm and helpful', adults: '1 adult', nights: '1 night',
          capabilities: { flights: true, hotels: true, experiences: false, cars: false, checkout: false } },
        knowledge: [], history: [], connection: disconnected(),
      };
      this.record(document, 'Workspace created', `${name} created the business workspace.`);
      this.db.prepare('INSERT INTO workspace VALUES (1, 1, ?, NULL)').run(JSON.stringify(document));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.publicOwner();
  }

  createSession(previousToken) {
    const now = Date.now();
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (previousToken) this.deleteSession(previousToken);
      this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
      this.db.prepare('INSERT INTO sessions VALUES (?, 1, ?, ?, ?)').run(sessionHash(token), csrfToken, now, now + SESSION_DURATION_MS);
      this.db.prepare('DELETE FROM sessions WHERE id_hash NOT IN (SELECT id_hash FROM sessions ORDER BY created_at DESC, rowid DESC LIMIT 8)').run();
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { token, csrfToken, user: this.publicOwner() };
  }

  session(token) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const found = this.db.prepare('SELECT * FROM sessions WHERE id_hash = ?').get(sessionHash(token));
    if (!found) return null;
    if (found.expires_at <= Date.now()) { this.deleteSession(token); return null; }
    return { user: this.publicOwner(), csrfToken: found.csrf_token };
  }

  deleteSession(token) { this.db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(sessionHash(token)); }

  record(document, title, detail) {
    document.history.unshift({ id: randomUUID(), title, detail, time: new Date().toISOString() });
    document.history = document.history.slice(0, 200);
  }

  read() {
    const row = this.db.prepare('SELECT * FROM workspace WHERE id = 1').get();
    if (!row) fail(409, 'Create the owner account first.');
    return { revision: row.revision, document: JSON.parse(row.document), encryptedKey: row.connection_secret };
  }

  workspace() {
    const { revision, document } = this.read();
    const release = this.latestRelease();
    return { revision, ...document, release, releaseCurrent: releaseMatches(release, document) };
  }

  latestRelease() {
    const row = this.db.prepare('SELECT document FROM releases ORDER BY rowid DESC LIMIT 1').get();
    return row ? JSON.parse(row.document) : null;
  }

  release(id) {
    const row = this.db.prepare('SELECT document FROM releases WHERE id = ?').get(id);
    if (!row) fail(404, 'The reviewed version was not found.');
    return JSON.parse(row.document);
  }

  prepareRelease(revision) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const state = this.read();
      this.assertRevision(state.revision, revision);
      if (!releaseMatches(this.latestRelease(), state.document)) {
        if (this.db.prepare('SELECT COUNT(*) AS count FROM releases').get().count >= 100) {
          fail(409, 'This installation has reached its 100 reviewed-version limit. Existing versions are preserved.');
        }
        const release = createRelease(state.document, state.revision);
        this.db.prepare('INSERT INTO releases VALUES (?, ?)').run(release.id, JSON.stringify(release));
        this.record(state.document, 'Reviewed version prepared', `${this.publicOwner().name} prepared saved settings and approved knowledge. The traveler has not been updated.`);
        this.db.prepare('UPDATE workspace SET revision = ?, document = ? WHERE id = 1')
          .run(state.revision + 1, JSON.stringify(state.document));
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.workspace();
  }

  assertRevision(current, expected) {
    if (current !== expected) fail(409, 'The workspace changed. Reload it before saving again.');
  }

  mutate(expectedRevision, callback) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const state = this.read();
      this.assertRevision(state.revision, expectedRevision);
      callback(state, this.publicOwner());
      this.db.prepare('UPDATE workspace SET revision = ?, document = ?, connection_secret = ? WHERE id = 1')
        .run(state.revision + 1, JSON.stringify(state.document), state.encryptedKey);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.workspace();
  }

  saveSettings(revision, settings) {
    return this.mutate(revision, (state, owner) => {
      state.document.settings = settings;
      this.record(state.document, 'Business settings saved', `${owner.name} saved preferences in the portal. Traveler settings have not changed.`);
    });
  }

  saveKnowledge({ revision, id, title, kind, content }) {
    return this.mutate(revision, ({ document }, owner) => {
      let source = id ? document.knowledge.find((entry) => entry.id === id) : undefined;
      if (id && !source) fail(404, 'The knowledge source was not found.');
      if (source?.status === 'Published') {
        const published = source;
        source = document.knowledge.find((entry) => entry.status === 'Draft' && entry.sourceId === published.id);
        if (!source) {
          source = { id: `k_${randomUUID()}`, status: 'Draft', sourceId: published.id, version: published.version + 1 };
          if (document.knowledge.length >= 100) fail(409, 'The local workspace supports up to 100 knowledge records.');
          document.knowledge.push(source);
        }
      }
      if (!source) {
        if (document.knowledge.length >= 100) fail(409, 'The local workspace supports up to 100 knowledge records.');
        source = { id: `k_${randomUUID()}`, status: 'Draft', version: 1 };
        document.knowledge.push(source);
      }
      Object.assign(source, { title, kind, content });
      this.record(document, 'Knowledge draft saved', `${owner.name} saved a draft for review.`);
    });
  }

  publishKnowledge(revision, id) {
    return this.mutate(revision, ({ document }, owner) => {
      const draft = document.knowledge.find((entry) => entry.id === id);
      if (!draft) fail(404, 'The knowledge source was not found.');
      if (draft.status !== 'Draft') fail(409, 'Only a draft can be approved.');
      if (draft.sourceId) {
        const published = document.knowledge.find((entry) => entry.id === draft.sourceId && entry.status === 'Published');
        if (!published) fail(409, 'The original source is unavailable.');
        Object.assign(published, { title: draft.title, kind: draft.kind, content: draft.content, version: published.version + 1 });
        document.knowledge = document.knowledge.filter((entry) => entry.id !== id);
      } else { draft.status = 'Published'; }
      this.record(document, 'Knowledge approved', `${owner.name} approved a source in the portal. It has not been sent to the traveler assistant.`);
    });
  }

  encrypt(apiKey) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from('travel-business-console:nuitee:v1'));
    const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    return JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: encrypted.toString('base64') });
  }

  decrypt(encryptedKey) {
    const encrypted = JSON.parse(encryptedKey);
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(encrypted.iv, 'base64'));
    decipher.setAAD(Buffer.from('travel-business-console:nuitee:v1'));
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  saveConnection({ revision, apiKey, environment }) {
    return this.mutate(revision, (state, owner) => {
      state.encryptedKey = this.encrypt(apiKey);
      state.document.connection = { configured: true, status: 'saved', environment, checkedAt: null, version: randomUUID() };
      this.record(state.document, 'Nuitée key saved', `${owner.name} saved the provider connection. The selected environment has not been verified.`);
    });
  }

  keyForCheck(revision) {
    const state = this.read();
    this.assertRevision(state.revision, revision);
    if (!state.encryptedKey) fail(409, 'Save a Nuitée key before checking the connection.');
    return this.decrypt(state.encryptedKey);
  }

  saveConnectionCheck(revision, status) {
    return this.mutate(revision, ({ document }, owner) => {
      Object.assign(document.connection, { status, checkedAt: new Date().toISOString() });
      this.record(document, 'Nuitée connection checked', `${owner.name} checked the saved key: ${status}. Booking capabilities and selected environment were not verified.`);
    });
  }

  removeConnection(revision) {
    return this.mutate(revision, (state, owner) => {
      state.encryptedKey = null;
      state.document.connection = disconnected();
      this.record(state.document, 'Nuitée key removed', `${owner.name} removed the saved connection from this portal.`);
    });
  }
}
