'use strict';
// Usage: node scripts/export.js backup.json
// Writes all documents and the account list (WITHOUT password hashes) to a JSON file.
const fs = require('node:fs');
const { openDb } = require('../server/db');
(async () => {
  const out = process.argv[2] || 'lyncs-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  const db = await openDb(process.env);
  const docs = (await db.all('SELECT path, data, version, updated FROM docs')).map(r => ({ path: r.path, version: r.version, updated: r.updated, data: JSON.parse(r.data) }));
  const users = await db.all('SELECT id, login, role, created FROM users');
  fs.writeFileSync(out, JSON.stringify({ exported: new Date().toISOString(), users, docs }, null, 1));
  console.log('wrote ' + out + ' (' + docs.length + ' documents, ' + users.length + ' accounts). Uploaded images/videos are not included.');
  db.close();
})().catch(e => { console.error(e.message || e); process.exit(1); });
