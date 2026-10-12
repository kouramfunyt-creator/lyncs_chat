'use strict';
// 今のパソコンのデータ(アカウント・ポスト・画像)を、Turso(常時公開用のデータベース)へ引っ越します。
// 使い方: migrate-to-turso.bat をダブルクリック(Windows)、または  node scripts/migrate-to-turso.js
// 元のデータは消えません。何度実行しても、同じ内容が上書きされるだけです。
const path = require('node:path');
const readline = require('node:readline');
const { openSqlite, openTurso, SCHEMA } = require('../server/db');

async function migrate(src, dst, { log = console.log, force = false } = {}) {
  for (const s of SCHEMA) await dst.run(s);
  const have = Number((await dst.all('SELECT COUNT(*) AS n FROM users'))[0].n);
  if (have > 0 && !force) throw new Error('引っ越し先にはすでにアカウントが ' + have + ' 件あります。上書きするには、最後に --force を付けて実行してください。');
  const users = await src.all('SELECT id, login, pw, role, created FROM users');
  for (const u of users) await dst.run('INSERT INTO users(id, login, pw, role, created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET login=excluded.login, pw=excluded.pw, role=excluded.role, created=excluded.created', [u.id, u.login, u.pw, u.role, u.created]);
  log('アカウント ' + users.length + ' 件を移しました。');
  const docs = await src.all('SELECT path, data, version, updated FROM docs');
  let n = 0;
  for (const d of docs) {
    await dst.run('INSERT INTO docs(path, data, version, updated) VALUES(?,?,?,?) ON CONFLICT(path) DO UPDATE SET data=excluded.data, version=excluded.version, updated=excluded.updated', [d.path, d.data, d.version, d.updated]);
    if (++n % 50 === 0) log('  データ ' + n + ' / ' + docs.length);
  }
  log('ポストやプロフィールなどのデータ ' + docs.length + ' 件を移しました。');
  const ids = (await src.all('SELECT id FROM blobs')).map(r => r.id);
  let bad = 0;
  for (const id of ids) {
    const r = (await src.all('SELECT id, uid, type, size, data, created FROM blobs WHERE id = ?', [id]))[0];
    if (!r) continue;
    try { await dst.run('INSERT INTO blobs(id, uid, type, size, data, created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET uid=excluded.uid, type=excluded.type, size=excluded.size, data=excluded.data, created=excluded.created', [r.id, r.uid, r.type, r.size, r.data, r.created]); }
    catch (e) { bad++; log('  画像・動画 1 件を移せませんでした(大きすぎる可能性があります): ' + String(e.message).slice(0, 80)); }
  }
  log('画像・動画 ' + (ids.length - bad) + ' / ' + ids.length + ' 件を移しました。');
  return { users: users.length, docs: docs.length, blobs: ids.length - bad, failedBlobs: bad };
}

async function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, a => { rl.close(); res(a.trim()); }));
}

if (require.main === module) {
  (async () => {
    const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const file = path.join(dir, 'lyncs.db');
    if (!require('node:fs').existsSync(file)) throw new Error('今のデータが見つかりません(' + file + ')。lyncs-web フォルダの中の data フォルダがある場所で実行してください。');
    const url = process.env.TURSO_URL || await ask('Turso の URL(libsql:// で始まる文字)を貼り付けて Enter: ');
    const token = process.env.TURSO_AUTH_TOKEN || await ask('Turso のトークン(長い文字)を貼り付けて Enter: ');
    if (!/^(libsql|https):\/\//.test(url) || !token) throw new Error('URL かトークンが正しくありません。');
    const src = openSqlite(file), dst = openTurso(url, token);
    await migrate(src, dst, { force: process.argv.includes('--force') });
    console.log('\n引っ越しが終わりました。元のデータは消えていません。');
    console.log('Render のサービスで、同じ URL と トークン、OWNER_USERNAME を設定すると、いまのアカウントでそのまま使えます。');
  })().catch(e => { console.error('\nうまくいきませんでした: ' + (e.message || e)); process.exit(1); });
}
module.exports = { migrate };
