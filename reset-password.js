'use strict';
// Usage: node scripts/reset-password.js <loginId> <newPassword>
// Run it on the server (uses the same database as the site: DATA_DIR or TURSO_URL).
const { openDb } = require('../server/db');
const { Docs } = require('../server/docs');
const { Auth } = require('../server/auth');
(async () => {
  const [login, pw] = process.argv.slice(2);
  if (!login || !pw) { console.error('Usage: node scripts/reset-password.js <loginId> <newPassword>'); process.exit(2); }
  const db = await openDb(process.env);
  const docs = new Docs(db); const auth = new Auth(db, docs, process.env); await auth.load();
  const u = auth.byLogin.get(login.toLowerCase());
  if (!u) { console.error('user not found: ' + login); process.exit(1); }
  auth.validate(u.login, pw);
  await auth.setPassword(u.id, pw); await auth.endAllSessions(u.id);
  console.log('password updated for ' + u.login + ' (all sessions signed out)');
  db.close();
})().catch(e => { console.error(e.message || e); process.exit(1); });
