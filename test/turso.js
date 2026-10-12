'use strict';
// Runs the server against a fake Turso (libSQL HTTP "/v2/pipeline") built from the documented wire format,
// to check the adapter end to end without the real service.
const http = require('node:http'); const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('../server/index'); const { Client } = require('./helpers');
(async () => {
  const sql = new DatabaseSync(':memory:'); let calls = 0, badAuth = 0;
  const dec = a => a.type === 'null' ? null : a.type === 'integer' ? Number(a.value) : a.type === 'float' ? Number(a.value) : a.type === 'blob' ? Buffer.from(a.base64, 'base64') : a.value;
  const fake = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      if (req.headers.authorization !== 'Bearer tok123') { badAuth++; res.writeHead(401); return res.end('{"error":"unauthorized"}'); }
      calls++;
      const body = JSON.parse(b); const results = [];
      for (const r of body.requests) {
        if (r.type === 'close') { results.push({ type: 'ok', response: { type: 'close' } }); continue; }
        try {
          const st = sql.prepare(r.stmt.sql); const args = (r.stmt.args || []).map(dec);
          if (/^\s*select/i.test(r.stmt.sql)) {
            const rows = st.all(...args); const cols = rows.length ? Object.keys(rows[0]) : [];
            const enc = v => v === null ? { type: 'null' } : typeof v === 'number' ? (Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: String(v) }) : { type: 'text', value: String(v) };
            results.push({ type: 'ok', response: { type: 'execute', result: { cols: cols.map(name => ({ name, decltype: null })), rows: rows.map(r2 => cols.map(c => enc(r2[c]))), affected_row_count: 0 } } });
          } else { st.run(...args); results.push({ type: 'ok', response: { type: 'execute', result: { cols: [], rows: [], affected_row_count: 1 } } }); }
        } catch (e) { results.push({ type: 'error', error: { message: e.message } }); }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ baton: null, base_url: null, results }));
    });
  });
  await new Promise(r => fake.listen(0, '127.0.0.1', r));
  const env = { TURSO_URL: 'http://127.0.0.1:' + fake.address().port, TURSO_AUTH_TOKEN: 'tok123', OWNER_USERNAME: 'koura', REGISTER_PER_HOUR: '1000' };
  let app = await createApp(env); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  let base = 'http://127.0.0.1:' + app.server.address().port;
  const o = new Client(base); assert.equal((await o.register('koura')).status, 200);
  const id = (await o.me()).uid;
  assert.equal((await o.write('set', 'profiles/' + id, { handle: 'koura', name: 'K' })).status, 200);
  assert.equal((await o.write('set', 'feed/' + id, { posts: [{ id: 'p', at: Date.now(), text: 'via turso' }] })).status, 200);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(100, 7)]);
  const up = await o.post('/api/assets', png, { 'Content-Type': 'image/png' }); assert.equal(up.status, 200);
  assert.equal((await o.req('GET', '/_blob/' + up.json.id)).buf.length, png.length);
  assert.equal((await new Client(base).post('/api/assets', png, { 'Content-Type': 'image/png' })).status, 401);
  const pub = (await new Client(base).req('GET', '/api/public')).json; assert.equal(pub.maxUploadMB, 4, 'upload limit is lower with Turso');
  await app.close();
  // restart: everything is reloaded from the (fake) remote database
  app = await createApp(env); await new Promise(r => app.server.listen(0, '127.0.0.1', r)); base = 'http://127.0.0.1:' + app.server.address().port;
  const o2 = new Client(base); o2.cookie = o.cookie;
  assert.equal((await o2.me()).owner, true, 'session restored from remote db');
  assert.equal((await o2.list('feed')).docs[0].data.posts[0].text, 'via turso');
  assert.equal((await o2.req('GET', '/_blob/' + up.json.id)).buf.length, png.length, 'blob restored');
  assert.equal((await new Client(base).post('/api/login', { login: 'koura', password: 'passw0rd123' })).status, 200);
  assert.equal(badAuth, 0);
  console.log('PASS turso adapter flow (' + calls + ' remote calls)');
  await app.close(); fake.close(); process.exit(0);
})().catch(e => { console.error('FAIL turso', e); process.exit(1); });
