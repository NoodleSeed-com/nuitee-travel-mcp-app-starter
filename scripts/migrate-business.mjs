import { backup, DatabaseSync } from 'node:sqlite';
import { constants, lstatSync, openSync, closeSync, readFileSync, writeFileSync, mkdirSync, chmodSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BusinessStore } from '../apps/business-portal/business-store.mjs';

/** Copy a live SQLite snapshot and its matching encryption key. Source is read-only. */
export async function migrateBusiness(sourceDir, destinationDir) {
  const source = resolve(sourceDir), destination = resolve(destinationDir);
  if (source === destination || destination.startsWith(`${source}/`) || source.startsWith(`${destination}/`)) throw Error('Use separate source and destination directories.');
  const sourceStat = lstatSync(source);
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) throw Error('Source must be a regular private directory.');
  const databasePath = join(source, 'portal.sqlite'), keyPath = join(source, 'installation.key');
  for (const filename of [databasePath, keyPath]) {
    const stat = lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw Error('Source files must be regular private files.');
  }
  const descriptor = openSync(keyPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let key;
  try { key = readFileSync(descriptor); } finally { closeSync(descriptor); }
  if (key.length !== 32) { key.fill(0); throw Error('The matching installation key is invalid.'); }
  let created = false, sourceDb, destinationStore;
  try {
    mkdirSync(destination, { mode: 0o700 }); // Must not overwrite even an empty destination.
    created = true;
    writeFileSync(join(destination, 'installation.key'), key, { flag: 'wx', mode: 0o600 });
    writeFileSync(join(destination, 'portal.sqlite'), '', { flag: 'wx', mode: 0o600 });
    sourceDb = new DatabaseSync(databasePath, { readOnly: true });
    await backup(sourceDb, join(destination, 'portal.sqlite'));
    chmodSync(join(destination, 'portal.sqlite'), 0o600);
    destinationStore = new BusinessStore(destination);
    if (destinationStore.db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Database integrity verification failed.');
    if (!destinationStore.owner()) throw Error('Source has no owner account to migrate.');
    const state = destinationStore.read();
    if (state.encryptedKey) destinationStore.decrypt(state.encryptedKey); // Verify the pair without exposing the value.
    destinationStore.db.exec('DELETE FROM sessions'); // New application requires a fresh sign-in.
    const report = { migrated: true, sourceUnchanged: true, signInRequired: true,
      knowledgeRecords: state.document.knowledge.length,
      reviewedVersions: destinationStore.db.prepare('SELECT COUNT(*) AS count FROM releases').get().count };
    destinationStore.close(); destinationStore = null;
    return report;
  } catch (error) {
    destinationStore?.close();
    if (created) rmSync(destination, { recursive: true, force: true });
    throw error;
  } finally { sourceDb?.close(); key.fill(0); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2) { console.error('Usage: pnpm migrate:business <source-data-directory> <new-destination-directory>'); process.exitCode = 1; }
  else {
    try { console.log(JSON.stringify(await migrateBusiness(args[0], args[1]))); }
    catch { console.error('Migration did not complete. The source was preserved. Check source files, the matching key and a nonexistent destination directory.'); process.exitCode = 1; }
  }
}
