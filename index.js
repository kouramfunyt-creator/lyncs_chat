'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openDb } = require('./db');
const { Docs, HttpError, LV, UID } = require('./docs');
const { Auth } = require('./auth');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const BLOB_TYPES = {
  'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/gif': b => b.slice(0, 4).toString() === 'GIF8',
  'image/webp': b => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP',
  'video/mp4': b => b.slice(4, 8).toString() === 'ftyp',
  'video/quicktime': b => b.slice(4, 8).toString() === 'ftyp',
  'video/webm': b => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
};

async function createApp(env = process.env) {
  const db = await openDb(env);
  const docs = new Docs(db); await docs.load();
  const auth = new Auth(db, docs, env);
  await auth.load();
  const MAX_JSON = 1.3 * 1024 * 1024;
  const MAX_UPLOAD_MB = Number(env.MAX_UPLOAD_MB || (env.TURSO_URL ? 4 : 20));
  const MAX_UPLOAD = MAX_UPLOAD_MB * 1024 * 1024;
  const USER_UPLOAD_CAP = Number(env.MAX_USER_UPLOAD_MB || 200) * 1024 * 1024;
  const trustProxy = env.TRUST_PROXY ? env.TRUST_PROXY !== '0' : !!env.RENDER;
  const secureCookie = env.COOKIE_SECURE ? env.COOKIE_SECURE === '1' : !!env.RENDER || env.NODE_ENV === 'production';
  const uploaded = new Map();
  for (const r of await db.all('SELECT uid, SUM(size) AS s FROM blobs GROUP BY uid')) uploaded.set(r.uid, Number(r.s));
  const blobCache = new Map(); let blobCacheBytes = 0;
  const writeLimit = new Map();
  const maintenance = () => { const m = docs.cfg().maintenance; return m && m.on === true ? { on: true, text: String(m.text || '') } : { on: false, text: String((m && m.text) || '') }; };
  const blockedByMaintenance = c => { if (maintenance().on && c.level < LV.admin) throw new HttpError(503, maintenance().text || '現在メンテナンス中です。しばらくしてからお試しください。'); };

  // ---- presence (online / busy). Kept only in memory; hidden and secret-mode users are never listed to others ----
  const presence = new Map(); // uid -> { s: 'online'|'busy'|'hidden', t }
  const PRES_TTL = 70000;
  function presenceList(uid) {
    const now = Date.now(), out = {};
    for (const [u, e] of presence) {
      if (now - e.t > PRES_TTL || e.s === 'hidden') continue;
      const pr = docs.raw('profiles/' + u);
      if (!pr || (pr.secret && u !== uid)) continue;
      out[u] = e.s;
    }
    return out;
  }
  setInterval(() => { const now = Date.now(); for (const [u, e] of presence) if (now - e.t > 300000) presence.delete(u); }, 60000).unref();

  // ---- realtime (SSE): only the top-level collection name is announced, never data ----
  const clients = new Set();
  docs.onChange = (p) => {
    const segs = p.split('/'); const c = segs[0];
    const msg = 'data: ' + JSON.stringify({ c }) + '\n\n';
    for (const cl of clients) { if (c === 'data' && cl.uid !== segs[2]) continue; try { cl.res.write(msg); } catch (e) { clients.delete(cl); } }
  };
  setInterval(() => { for (const cl of clients) { try { cl.res.write(': ping\n\ndata: {"c":"ping"}\n\n'); } catch (e) { clients.delete(cl); } } }, 20000).unref();

  const ipOf = req => (trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
  const cookieOf = (req, n) => { const m = String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(n + '=')); return m ? decodeURIComponent(m.slice(n.length + 1)) : null; };
  function ctxOf(req) {
    const token = cookieOf(req, 'lc_sid');
    const u = auth.userOf(token);
    let level = auth.levelOf(u);
    if (!u && docs.cfg().loginRequired === false) level = LV.view;
    return { u, token, uid: u ? u.id : null, level, restricted: auth.restricted(u) };
  }
  const guestsOk = () => docs.cfg().loginRequired === false;

  function send(res, status, body, headers = {}) {
    const isStr = typeof body === 'string' || Buffer.isBuffer(body);
    res.writeHead(status, { 'Content-Type': isStr ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(isStr ? body : JSON.stringify(body));
  }
  const fail = (res, e) => {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error('internal error:', e && e.stack || e);
    return send(res, 500, { error: 'サーバーでエラーが起きました。' });
  };
  function readBody(req, max) {
    return new Promise((resolve, reject) => {
      const chunks = []; let n = 0, over = false;
      req.on('data', c => {
        n += c.length;
        if (n > max) { over = true; if (n > max * 3 + 1048576) req.destroy(); } else if (!over) chunks.push(c);
      });
      req.on('end', () => (over ? reject(new HttpError(413, 'データが大きすぎます。')) : resolve(Buffer.concat(chunks))));
      req.on('error', reject);
    });
  }
  async function readJson(req) {
    if (!/^application\/json/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'JSONで送ってください。');
    const b = await readBody(req, MAX_JSON);
    try { const j = JSON.parse(b.toString('utf8') || '{}'); if (!j || typeof j !== 'object') throw 0; return j; } catch (e) { throw new HttpError(400, 'データの形式が正しくありません。'); }
  }
  function sameOrigin(req) {
    // Cross-site writes are already blocked because every write needs Content-Type: application/json (preflight) and we send no CORS headers.
    const o = req.headers.origin; if (!o || env.RELAX_ORIGIN === '1') return true;
    try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
  }
  function setCookie(res, token, exp) {
    const parts = ['lc_sid=' + encodeURIComponent(token), 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Expires=' + new Date(exp).toUTCString()];
    if (secureCookie) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
  }
  const clearCookie = res => res.setHeader('Set-Cookie', 'lc_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + (secureCookie ? '; Secure' : ''));
  function writeAllowed(uid) {
    const now = Date.now(); const a = (writeLimit.get(uid) || []).filter(t => now - t < 60000);
    if (a.length >= Number(env.WRITES_PER_MIN || 240)) { writeLimit.set(uid, a); return false; }
    a.push(now); writeLimit.set(uid, a); return true;
  }
  const meInfo = c => c.u ? { uid: c.u.id, login: c.u.login, owner: c.u.role === 'owner', admin: c.level >= LV.admin, canWrite: true } : { uid: null, owner: false, admin: false, canWrite: false };

  const SEC = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    for (const [k, v] of Object.entries(SEC)) res.setHeader(k, v);
    if (secureCookie) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    if (req.method === 'POST' || req.method === 'DELETE') if (!sameOrigin(req)) throw new HttpError(403, '不正なリクエストです。');

    if (p === '/healthz') return send(res, 200, { ok: true });
    if (p === '/api/public' && req.method === 'GET') {
      const c = docs.cfg();
      return send(res, 200, { name: c.name || 'Lyncs_Chat', loginRequired: c.loginRequired !== false, signups: c.signups !== false, hasOwner: auth.hasOwner(), maxUploadMB: MAX_UPLOAD_MB, maintenance: maintenance().on ? maintenance() : { on: false } });
    }
    if (p === '/api/me' && req.method === 'GET') { const c = ctxOf(req); return send(res, 200, meInfo(c)); }
    if (p === '/api/register' && req.method === 'POST') {
      const b = await readJson(req);
      const u = await auth.register(String(b.login || ''), b.password, ipOf(req));
      const s = await auth.newSession(u.id); setCookie(res, s.token, s.exp);
      return send(res, 200, { ok: true, uid: u.id });
    }
    if (p === '/api/login' && req.method === 'POST') {
      const b = await readJson(req);
      const u = await auth.login(String(b.login || ''), b.password, ipOf(req));
      const s = await auth.newSession(u.id); setCookie(res, s.token, s.exp);
      return send(res, 200, { ok: true, uid: u.id });
    }
    if (p === '/api/logout' && req.method === 'POST') { await auth.endSession(cookieOf(req, 'lc_sid')); clearCookie(res); return send(res, 200, { ok: true }); }
    if (p === '/api/password' && req.method === 'POST') {
      const c = ctxOf(req); if (!c.u) throw new HttpError(401, 'ログインしてください。');
      const b = await readJson(req);
      await auth.changePassword(c.u, b.oldPassword, b.newPassword, c.token, ipOf(req));
      return send(res, 200, { ok: true });
    }

    if (p === '/api/presence' && req.method === 'POST') {
      const c = ctxOf(req); if (c.level < LV.view) throw new HttpError(401, 'ログインしてください。');
      const b = await readJson(req);
      if (c.u && typeof b.status === 'string') {
        if (b.status === 'off') presence.delete(c.uid);
        else if (['online', 'busy', 'hidden'].includes(b.status)) presence.set(c.uid, { s: c.restricted ? 'hidden' : b.status, t: Date.now() });
      }
      return send(res, 200, { list: presenceList(c.uid) });
    }

    if (p === '/api/events' && req.method === 'GET') {
      const c = ctxOf(req);
      if (c.level < LV.view) throw new HttpError(401, 'ログインしてください。');
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 3000\n\n');
      const cl = { res, uid: c.uid }; clients.add(cl);
      req.on('close', () => clients.delete(cl));
      return;
    }

    if (p === '/api/doc/get' && req.method === 'POST') {
      const c = ctxOf(req); if (c.level < LV.view) throw new HttpError(401, 'ログインしてください。');
      const b = await readJson(req); const dp = String(b.path || '');
      if (!docs.can(c, dp, 'read')) return send(res, 200, { exists: false });
      const d = docs.get(dp);
      return send(res, 200, d ? { exists: true, data: d.data, version: d.version } : { exists: false });
    }
    if (p === '/api/list' && req.method === 'POST') {
      const c = ctxOf(req); if (c.level < LV.view) throw new HttpError(401, 'ログインしてください。');
      const b = await readJson(req); const cp = String(b.path || '');
      const where = Array.isArray(b.where) ? b.where.slice(0, 5) : [];
      const list = docs.query(c, cp, where, Array.isArray(b.orderBy) ? b.orderBy : null, Number(b.limit) || 0);
      const body = JSON.stringify({ docs: list });
      const hash = crypto.createHash('sha1').update(body).digest('base64url');
      if (b.hash && b.hash === hash) return send(res, 200, { same: true });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end('{"hash":"' + hash + '",' + body.slice(1));
    }
    if (p === '/api/doc/write' && req.method === 'POST') {
      const c = ctxOf(req); if (!c.u) throw new HttpError(401, 'ログインしてください。');
      blockedByMaintenance(c);
      if (!writeAllowed(c.uid)) throw new HttpError(429, '操作が多すぎます。少し待ってからお試しください。');
      const b = await readJson(req);
      const op = String(b.op || ''); const dp = String(b.path || '');
      if (!['set', 'update', 'delete', 'add'].includes(op)) throw new HttpError(400, '操作が正しくありません。');
      if (op === 'add') {
        const id = crypto.randomBytes(10).toString('hex');
        await docs.write(c, 'set', dp + '/' + id, b.data);
        return send(res, 200, { id });
      }
      const r = await docs.write(c, op, dp, b.data);
      return send(res, 200, { ok: true, version: r.version });
    }

    if (p === '/api/assets' && req.method === 'POST') {
      const c = ctxOf(req); if (!c.u) throw new HttpError(401, 'ログインしてください。');
      if (c.restricted) throw new HttpError(403, '現在はアップロードできません。');
      blockedByMaintenance(c);
      if (!writeAllowed(c.uid)) throw new HttpError(429, '操作が多すぎます。少し待ってからお試しください。');
      const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!BLOB_TYPES[type]) throw new HttpError(415, 'この形式のファイルは使えません。');
      const buf = await readBody(req, MAX_UPLOAD);
      if (buf.length < 16 || !BLOB_TYPES[type](buf)) throw new HttpError(415, 'ファイルの中身が形式と合っていません。');
      if ((uploaded.get(c.uid) || 0) + buf.length > USER_UPLOAD_CAP) throw new HttpError(413, 'アップロードできる容量の上限に達しました。');
      const id = crypto.randomBytes(16).toString('hex');
      await db.run('INSERT INTO blobs(id, uid, type, size, data, created) VALUES(?,?,?,?,?,?)', [id, c.uid, type, buf.length, buf.toString('base64'), Date.now()]);
      uploaded.set(c.uid, (uploaded.get(c.uid) || 0) + buf.length);
      return send(res, 200, { id });
    }
    let m;
    if ((m = /^\/api\/assets\/([0-9a-f]{32})$/.exec(p)) && req.method === 'DELETE') {
      const c = ctxOf(req); if (!c.u) throw new HttpError(401, 'ログインしてください。');
      const rows = await db.all('SELECT uid, size FROM blobs WHERE id = ?', [m[1]]);
      if (!rows.length) return send(res, 200, { ok: true });
      if (rows[0].uid !== c.uid && c.level < LV.admin) throw new HttpError(403, '権限がありません。');
      await db.run('DELETE FROM blobs WHERE id = ?', [m[1]]);
      uploaded.set(rows[0].uid, Math.max(0, (uploaded.get(rows[0].uid) || 0) - Number(rows[0].size)));
      blobCache.delete(m[1]);
      return send(res, 200, { ok: true });
    }
    if ((m = /^\/_blob\/([0-9a-f]{32})$/.exec(p)) && (req.method === 'GET' || req.method === 'HEAD')) {
      const c = ctxOf(req); if (c.level < LV.view) throw new HttpError(401, 'ログインしてください。');
      let e = blobCache.get(m[1]);
      if (!e) {
        const rows = await db.all('SELECT type, data FROM blobs WHERE id = ?', [m[1]]);
        if (!rows.length) throw new HttpError(404, 'ファイルが見つかりません。');
        e = { type: rows[0].type, buf: Buffer.from(rows[0].data, 'base64') };
        if (e.buf.length < 8 * 1024 * 1024) { blobCache.set(m[1], e); blobCacheBytes += e.buf.length; while (blobCacheBytes > 48 * 1024 * 1024) { const k = blobCache.keys().next().value; blobCacheBytes -= blobCache.get(k).buf.length; blobCache.delete(k); } }
      }
      const total = e.buf.length;
      const h = { 'Content-Type': e.type, 'Cache-Control': (guestsOk() ? 'public' : 'private') + ', max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Accept-Ranges': 'bytes' };
      const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (rg && (rg[1] || rg[2])) {
        let s = rg[1] ? Number(rg[1]) : total - Number(rg[2]); let en = rg[1] && rg[2] ? Number(rg[2]) : total - 1;
        if (s < 0) s = 0; if (en >= total) en = total - 1;
        if (s > en) { res.writeHead(416, { 'Content-Range': 'bytes */' + total }); return res.end(); }
        res.writeHead(206, { ...h, 'Content-Range': `bytes ${s}-${en}/${total}`, 'Content-Length': en - s + 1 });
        return res.end(req.method === 'HEAD' ? undefined : e.buf.subarray(s, en + 1));
      }
      res.writeHead(200, { ...h, 'Content-Length': total });
      return res.end(req.method === 'HEAD' ? undefined : e.buf);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      let rel = p === '/' ? '/index.html' : p;
      const file = path.normalize(path.join(PUBLIC_DIR, rel));
      if (file.startsWith(PUBLIC_DIR + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const ext = path.extname(file);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
      }
    }
    throw new HttpError(404, 'ページが見つかりません。');
  }

  // ---- scheduled posts: publish drafts whose time has come (text only) ----
  async function publishDue() {
    if (maintenance().on) return;
    const now = Date.now(), maxLen = Number(docs.cfg().maxLen) || 300;
    for (const path of [...docs.map.keys()]) {
      const m = /^data\/users\/([^/]+)\/drafts$/.exec(path); if (!m) continue;
      const uid = m[1], d = docs.raw(path);
      if (!d || !Array.isArray(d.items) || !d.items.some(x => x.sched > 0 && x.sched <= now)) continue;
      const u = auth.users.get(uid); if (!u || auth.restricted(u)) continue;
      const ctx = { uid, level: LV.interact, restricted: false };
      try {
        const due = d.items.filter(x => x.sched > 0 && x.sched <= now).sort((a, b) => a.sched - b.sched);
        for (const it of due) {
          const feed = docs.raw('feed/' + uid) || { posts: [] };
          const posts = Array.isArray(feed.posts) ? feed.posts : [];
          const id = 'sp' + it.id;
          if (!posts.some(p => p.id === id)) {
            const post = { id, at: Date.now(), text: String(it.text).trim().slice(0, maxLen), media: [], sch: 1 };
            await docs.write(ctx, 'set', 'feed/' + uid, { posts: [post, ...posts].slice(0, 300) });
          }
          const cur = docs.raw(path) || { items: [] };
          await docs.write(ctx, 'set', path, { items: (cur.items || []).filter(x => x.id !== it.id) });
        }
      } catch (e) { console.error('scheduled post failed for ' + uid + ':', e && e.message || e); }
    }
  }
  let schedBusy = false;
  const schedTimer = setInterval(() => { if (schedBusy) return; schedBusy = true; publishDue().catch(() => {}).finally(() => { schedBusy = false; }); }, Number(env.SCHEDULE_TICK_MS || 15000));
  schedTimer.unref();

  const server = http.createServer((req, res) => { handle(req, res).catch(e => { if (!res.headersSent) fail(res, e); else res.end(); }); });
  server.keepAliveTimeout = 65000;
  return { server, db, docs, auth, publishDue, close: async () => { clearInterval(schedTimer); for (const c of clients) { try { c.res.end(); } catch (e) { /* ignore */ } } clients.clear(); await new Promise(r => server.close(r)); db.close(); } };
}

if (require.main === module) {
  const env = process.env;
  createApp(env).then(({ server, auth }) => {
    const port = Number(env.PORT || 3000);
    server.listen(port, '0.0.0.0', () => {
      console.log('Lyncs_Chat listening on :' + port + ' (db: ' + (env.TURSO_URL ? 'turso' : 'sqlite file') + ')');
      if (!env.OWNER_USERNAME) console.warn('WARNING: OWNER_USERNAME is not set. The first account to register becomes the site owner.');
      if (!env.TURSO_URL && (env.RENDER || env.DYNO)) console.warn('WARNING: running on a host with a temporary disk without TURSO_URL. Data will be lost on restart.');
      void auth;
    });
  }).catch(e => { console.error('failed to start:', e); process.exit(1); });
}
module.exports = { createApp };
