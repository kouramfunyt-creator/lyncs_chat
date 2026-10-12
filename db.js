'use strict';
// Storage adapters. Both speak the same SQLite dialect and use single statements only,
// so every call is atomic by itself and safe to retry.
//   - local SQLite file (node:sqlite, no dependencies)   -> DATA_DIR
//   - Turso / libSQL over HTTPS (no dependencies, fetch) -> TURSO_URL + TURSO_AUTH_TOKEN
const path = require('node:path');
const fs = require('node:fs');

function openSqlite(file) {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;');
  return {
    kind: 'sqlite',
    async all(sql, args = []) { return db.prepare(sql).all(...args).map(r => ({ ...r })); },
    async run(sql, args = []) { db.prepare(sql).run(...args); },
    close() { try { db.close(); } catch (e) { /* ignore */ } },
  };
}

function openTurso(url, token) {
  const base = String(url).replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '');
  const enc = v => {
    if (v === null || v === undefined) return { type: 'null' };
    if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: String(v) };
    if (typeof v === 'bigint') return { type: 'integer', value: String(v) };
    if (Buffer.isBuffer(v)) return { type: 'blob', base64: v.toString('base64') };
    return { type: 'text', value: String(v) };
  };
  const dec = v => {
    if (!v || v.type === 'null') return null;
    if (v.type === 'integer') return Number(v.value);
    if (v.type === 'float') return Number(v.value);
    if (v.type === 'blob') return Buffer.from(v.base64 || '', 'base64');
    return v.value;
  };
  async function exec(sql, args, attempt = 0) {
    let r;
    try {
      r = await fetch(base + '/v2/pipeline', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: args.map(enc) } }, { type: 'close' }] }),
      });
    } catch (e) {
      if (attempt < 2) { await new Promise(res => setTimeout(res, 300 * (attempt + 1))); return exec(sql, args, attempt + 1); }
      throw new Error('database unreachable: ' + e.message);
    }
    if (r.status >= 500 && attempt < 2) { await new Promise(res => setTimeout(res, 300 * (attempt + 1))); return exec(sql, args, attempt + 1); }
    if (!r.ok) throw new Error('database error ' + r.status + ': ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    const res = j.results && j.results[0];
    if (!res || res.type !== 'ok') throw new Error('database error: ' + JSON.stringify((res && res.error) || res).slice(0, 300));
    const rs = res.response.result;
    const cols = (rs.cols || []).map(c => c.name);
    return (rs.rows || []).map(row => Object.fromEntries(row.map((v, i) => [cols[i], dec(v)])));
  }
  return { kind: 'turso', all: (sql, args = []) => exec(sql, args), run: async (sql, args = []) => { await exec(sql, args); }, close() {} };
}

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, login TEXT NOT NULL UNIQUE, pw TEXT NOT NULL, role TEXT NOT NULL, created INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sessions (h TEXT PRIMARY KEY, uid TEXT NOT NULL, exp INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS blobs (id TEXT PRIMARY KEY, uid TEXT, type TEXT NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL)',
];

async function openDb(env = process.env) {
  const db = env.TURSO_URL ? openTurso(env.TURSO_URL, env.TURSO_AUTH_TOKEN || '') : openSqlite(path.join(env.DATA_DIR || path.join(process.cwd(), 'data'), 'lyncs.db'));
  for (const s of SCHEMA) await db.run(s);
  return db;
}

module.exports = { openDb, openSqlite, openTurso, SCHEMA };
