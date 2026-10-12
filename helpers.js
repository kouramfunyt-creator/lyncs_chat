'use strict';
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { createApp } = require('../server/index');
async function startServer(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-'));
  const env = { DATA_DIR: dir, OWNER_USERNAME: 'koura', WRITES_PER_MIN: '100000', REGISTER_PER_HOUR: '1000', ...extra };
  const app = await createApp(env);
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  return { ...app, base, dir, env, stop: async () => { await app.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}
class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async req(method, url, body, headers = {}) {
    const h = { ...headers }; if (this.cookie) h.Cookie = this.cookie;
    let b = body;
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) { h['Content-Type'] = h['Content-Type'] || 'application/json'; b = JSON.stringify(body); }
    const r = await fetch(this.base + url, { method, headers: h, body: b });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = /lc_sid=([^;]*)/.exec(sc); if (m) this.cookie = m[1] ? 'lc_sid=' + m[1] : ''; }
    const ct = r.headers.get('content-type') || ''; let j = null; let buf = null;
    if (ct.includes('json')) j = await r.json().catch(() => null); else buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, json: j, buf, headers: r.headers };
  }
  post(url, body, h) { return this.req('POST', url, body, h); }
  async register(login, password = 'passw0rd123') { const r = await this.post('/api/register', { login, password }); return r; }
  async me() { return (await this.req('GET', '/api/me')).json; }
  get(path) { return this.post('/api/doc/get', { path }).then(r => r.json); }
  write(op, path, data) { return this.post('/api/doc/write', { op, path, data }); }
  list(path, extra = {}) { return this.post('/api/list', { path, ...extra }).then(r => r.json); }
}
module.exports = { startServer, Client };
