'use strict';
const assert = require('node:assert/strict');
const { startServer, Client } = require('./helpers');
let pass = 0, failn = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { failn++; console.log('FAIL ' + name + '\n   ' + (e.stack || e).split('\n').slice(0, 4).join('\n   ')); } };
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

(async () => {
  const S = await startServer();
  const owner = new Client(S.base), alice = new Client(S.base), bob = new Client(S.base), anon = new Client(S.base);
  let ownerId, aliceId, bobId;

  await t('owner registers; others cannot take the owner name; first-come only', async () => {
    const r = await owner.register('koura'); assert.equal(r.status, 200);
    ownerId = (await owner.me()).uid; assert.ok(/^u_/.test(ownerId));
    assert.equal((await owner.me()).owner, true);
    const dup = await new Client(S.base).register('KOURA'); assert.equal(dup.status, 409);
  });
  await t('normal users register / login / wrong password / validation', async () => {
    assert.equal((await alice.register('alice')).status, 200); aliceId = (await alice.me()).uid;
    assert.equal((await bob.register('bob')).status, 200); bobId = (await bob.me()).uid;
    assert.equal((await alice.me()).owner, false); assert.equal((await alice.me()).admin, false);
    assert.equal((await new Client(S.base).register('x')).status, 400);
    assert.equal((await new Client(S.base).register('okname', 'short')).status, 400);
    const c = new Client(S.base); assert.equal((await c.post('/api/login', { login: 'alice', password: 'wrong' })).status, 401);
    assert.equal((await c.post('/api/login', { login: 'ALICE', password: 'passw0rd123' })).status, 200);
    assert.equal((await c.me()).uid, aliceId);
  });
  await t('login throttling after repeated failures', async () => {
    const c = new Client(S.base); let last;
    for (let i = 0; i < 10; i++) last = await c.post('/api/login', { login: 'bob', password: 'nope' + i });
    assert.equal(last.status, 429);
    assert.equal((await new Client(S.base).post('/api/login', { login: 'bob', password: 'passw0rd123' })).status, 429);
  });
  await t('passwords are hashed, sessions are hashed in db', async () => {
    const rows = await S.db.all('SELECT pw FROM users'); assert.ok(rows.every(r => r.pw.startsWith('scrypt$') && !r.pw.includes('passw0rd')));
    const ss = await S.db.all('SELECT h FROM sessions'); assert.ok(ss.every(s => !alice.cookie.includes(s.h) && s.h.length === 64));
  });
  await t('anonymous is blocked when login is required', async () => {
    assert.equal((await anon.post('/api/list', { path: 'profiles' })).status, 401);
    assert.ok((await anon.get('site/config')).error);
    assert.equal((await anon.req('GET', '/api/events')).status, 401);
    assert.equal((await anon.post('/api/doc/write', { op: 'set', path: 'feed/' + aliceId, data: { posts: [] } })).status, 401);
  });
  await t('csrf: cross-origin and non-json writes are rejected', async () => {
    const r1 = await alice.post('/api/doc/write', { op: 'set', path: 'likes/' + aliceId, data: { p: [] } }, { Origin: 'https://evil.example' }); assert.equal(r1.status, 403);
    const r2 = await alice.req('POST', '/api/doc/write', 'op=set', { 'Content-Type': 'text/plain' }); assert.equal(r2.status, 415);
  });

  await t('profile: create, validation, joined stamped by server, handle unique & immutable, img sanitized', async () => {
    const r = await alice.write('set', 'profiles/' + aliceId, { handle: 'alice', name: 'Alice', bio: 'hi', hue: 10, joined: 5, img: 'javascript:alert(1)', terms: 0 });
    assert.equal(r.status, 200);
    const p = (await alice.get('profiles/' + aliceId)).data;
    assert.ok(p.joined > 1e12, 'joined must be server time'); assert.equal(p.img, '');
    assert.equal((await bob.write('set', 'profiles/' + bobId, { handle: 'alice', name: 'x' })).status, 409);
    assert.equal((await bob.write('set', 'profiles/' + bobId, { handle: 'Bad Name', name: 'x' })).status, 400);
    assert.equal((await bob.write('set', 'profiles/' + bobId, { handle: 'bob', name: 'Bob', joined: 0 })).status, 200);
    assert.equal((await alice.write('update', 'profiles/' + aliceId, { handle: 'zzz' })).status, 400);
    assert.equal((await alice.write('update', 'profiles/' + aliceId, { joined: 1, name: 'Alice2' })).status, 200);
    const p2 = (await alice.get('profiles/' + aliceId)).data; assert.equal(p2.joined, p.joined); assert.equal(p2.name, 'Alice2');
    const jpg = 'data:image/jpeg;base64,/9j/4AAQ'; assert.equal((await alice.write('update', 'profiles/' + aliceId, { img: jpg })).status, 200);
    assert.equal((await alice.get('profiles/' + aliceId)).data.img, jpg);
  });
  await t("cannot write other people's own-doc paths", async () => {
    for (const p of ['profiles/' + aliceId, 'feed/' + aliceId, 'follows/' + aliceId, 'likes/' + aliceId, 'votes/' + aliceId, 'media/' + aliceId + '/items/x', 'reports/' + aliceId]) {
      const r = await bob.write('set', p, { posts: [], p: [], to: [], m: {} }); assert.equal(r.status, 403, p);
    }
    assert.equal((await bob.write('delete', 'feed/' + aliceId)).status, 403);
  });
  await t('own feed works; feed shape validated; everyone can read it', async () => {
    assert.equal((await alice.write('set', 'feed/' + aliceId, { posts: [{ id: 'p1', at: Date.now(), text: 'hello' }] })).status, 200);
    assert.equal((await alice.write('set', 'feed/' + aliceId, { posts: 'x' })).status, 400);
    const l = await bob.list('feed'); assert.equal(l.docs.length, 1); assert.equal(l.docs[0].data.posts[0].text, 'hello');
  });
  await t('admin-only collections are protected', async () => {
    for (const p of ['site/config', 'bans/' + bobId, 'staff/' + bobId, 'verified/' + bobId, 'picks/p1', 'approved/' + bobId, 'admin/audit', 'admin/reports']) {
      assert.equal((await bob.write('set', p, { x: 1 })).status, 403, 'write ' + p);
    }
    assert.equal((await bob.get('admin/audit')).exists, false);
    assert.equal((await owner.write('set', 'site/config', { name: 'Lyncs_Chat', signups: true, maxLen: 300 })).status, 200);
    assert.equal((await bob.get('site/config')).exists, true);
    assert.equal((await owner.write('set', 'verified/' + bobId, { at: 1, m: ['v'] })).status, 200);
  });
  await t('staff docs: only owner; staff becomes admin level', async () => {
    assert.equal((await alice.write('set', 'staff/' + aliceId, { at: 1 })).status, 403);
    assert.equal((await owner.write('set', 'staff/' + ownerId, { owner: true, at: 1 })).status, 200);
    assert.equal((await owner.write('set', 'staff/' + aliceId, { at: 1 })).status, 200);
    const me = await alice.me(); assert.equal(me.admin, true); assert.equal(me.owner, false);
    assert.equal((await alice.write('set', 'picks/p1', { at: 1 })).status, 200);
    assert.equal((await alice.write('set', 'staff/' + bobId, { at: 1 })).status, 403);
    assert.equal((await owner.write('delete', 'staff/' + aliceId)).status, 200);
    assert.equal((await alice.me()).admin, false);
    assert.equal((await alice.write('set', 'picks/p2', { at: 1 })).status, 403);
    await owner.write('delete', 'picks/p1');
  });
  await t('private user data (keys/prefs) readable only by self, even by owner', async () => {
    assert.equal((await alice.write('set', 'data/users/' + aliceId + '/keys', { priv: 'SECRET' })).status, 200);
    assert.equal((await bob.get('data/users/' + aliceId + '/keys')).exists, false);
    assert.equal((await owner.get('data/users/' + aliceId + '/keys')).exists, false);
    assert.equal((await bob.write('set', 'data/users/' + aliceId + '/keys', { priv: 'X' })).status, 403);
    assert.equal((await bob.list('data/users/' + aliceId)).docs.length, 0);
    assert.equal((await alice.get('data/users/' + aliceId + '/keys')).data.priv, 'SECRET');
  });
  await t('DMs: only the two participants; members are validated', async () => {
    const [a, b] = [aliceId, bobId].sort(); const conv = a + '~' + b;
    const mine = aliceId < bobId ? alice : alice;
    assert.equal((await alice.write('set', 'dm/' + conv, { members: [aliceId, bobId], last: 1, lastFrom: aliceId, seen: {} })).status, 200);
    assert.equal((await alice.post('/api/doc/write', { op: 'add', path: 'dm/' + conv + '/msgs', data: { at: 1, iv: 'x', ct: 'y' } })).status, 200);
    assert.equal((await bob.list('dm/' + conv + '/msgs')).docs.length, 1);
    const eve = new Client(S.base); await eve.register('eve'); const eveId = (await eve.me()).uid;
    assert.equal((await eve.list('dm/' + conv + '/msgs')).docs.length, 0);
    assert.equal((await eve.get('dm/' + conv)).exists, false);
    assert.equal((await owner.get('dm/' + conv)).exists, false);
    assert.equal((await eve.post('/api/doc/write', { op: 'add', path: 'dm/' + conv + '/msgs', data: { at: 1 } })).status, 403);
    const l = await eve.post('/api/list', { path: 'dm', where: [['members', 'array-contains', eveId]] }).then(r => r.json); assert.equal(l.docs.length, 0);
    const l2 = await bob.post('/api/list', { path: 'dm', where: [['members', 'array-contains', bobId]] }).then(r => r.json); assert.equal(l2.docs.length, 1);
    const forged = [eveId, aliceId].sort().join('~');
    assert.equal((await eve.write('set', 'dm/' + forged, { members: [eveId, bobId] })).status, 403, 'forged members');
    void mine;
  });
  await t('groups: members only; owner/admin can list; outsiders cannot read messages or join', async () => {
    const g = 'g1';
    assert.equal((await alice.write('set', 'groups/' + g, { name: 'G', members: [aliceId, bobId], owner: aliceId, keys: {}, created: 1, last: 1 })).status, 200);
    assert.equal((await alice.post('/api/doc/write', { op: 'add', path: 'groups/' + g + '/msgs', data: { at: 1, iv: 'a', ct: 'b' } })).status, 200);
    assert.equal((await bob.list('groups/' + g + '/msgs')).docs.length, 1);
    const eve = new Client(S.base); await eve.post('/api/login', { login: 'eve', password: 'passw0rd123' });
    assert.equal((await eve.get('groups/' + g)).exists, false);
    assert.equal((await eve.write('update', 'groups/' + g, { members: [aliceId, bobId, (await eve.me()).uid] })).status, 403);
    assert.equal((await eve.list('groups/' + g + '/msgs')).docs.length, 0);
    assert.equal((await eve.write('set', 'groups/' + g + 'x', { name: 'N', members: [aliceId], owner: aliceId })).status, 403, 'create group for others');
    assert.equal((await owner.list('groups')).docs.length, 1, 'admin lists groups');
    assert.equal((await owner.list('groups/' + g + '/msgs')).docs.length, 0, 'admin cannot read group messages');
    assert.equal((await bob.write('update', 'groups/' + g, { seen: { [bobId]: 5 } })).status, 200);
    assert.equal((await bob.get('groups/' + g)).data.seen[bobId], 5);
  });
  await t('reports: write own, nobody else reads; admin reads all', async () => {
    assert.equal((await bob.write('update', 'reports/' + bobId, { r_post_p1: { k: 'post', t: 'p1', tu: aliceId, r: 'spam', at: 1 } })).status, 200);
    assert.equal((await alice.get('reports/' + bobId)).exists, false);
    assert.equal((await alice.list('reports')).docs.length, 0);
    assert.equal((await owner.list('reports')).docs.length, 1);
  });
  await t('unknown collections and bad paths are refused', async () => {
    assert.equal((await alice.write('set', 'evil/x', { a: 1 })).status, 403);
    assert.equal((await alice.write('set', 'feed/../site/config', { a: 1 })).status, 403);
    assert.equal((await alice.write('set', 'feed/' + aliceId + '/', { a: 1 })).status, 403);
    assert.equal((await alice.write('set', 'profiles/__proto__', { a: 1 })).status, 403);
  });
  await t('doc size limit and subtree quota', async () => {
    const big = 'x'.repeat(300 * 1024);
    assert.equal((await alice.write('set', 'media/' + aliceId + '/items/a', { d: big })).status, 413);
    assert.equal((await alice.write('set', 'media/' + aliceId + '/items/b', { d: 'x'.repeat(100 * 1024) })).status, 200);
  });
  await t('banned user can no longer write (but staff are exempt)', async () => {
    assert.equal((await owner.write('set', 'bans/' + bobId, { at: 1 })).status, 200);
    assert.equal((await bob.write('set', 'feed/' + bobId, { posts: [] })).status, 403);
    assert.equal((await bob.write('set', 'likes/' + bobId, { p: [] })).status, 403);
    assert.equal((await bob.post('/api/assets', png, { 'Content-Type': 'image/png' })).status, 403);
    assert.equal((await bob.write('set', 'data/users/' + bobId + '/prefs', { mute: [] })).status, 200);
    await owner.write('delete', 'bans/' + bobId);
    assert.equal((await bob.write('set', 'feed/' + bobId, { posts: [] })).status, 200);
  });
  await t('approval mode blocks unapproved newcomers on the server', async () => {
    const cfg = (await owner.get('site/config')).data;
    await owner.write('set', 'site/config', { ...cfg, requireApproval: true, approvalSince: Date.now() - 1 });
    const n = new Client(S.base); await n.register('newbie'); const nid = (await n.me()).uid;
    assert.equal((await n.write('set', 'profiles/' + nid, { handle: 'newbie', name: 'N' })).status, 200);
    assert.equal((await n.write('set', 'feed/' + nid, { posts: [] })).status, 403);
    assert.equal((await n.write('update', 'profiles/' + nid, { joined: 0 })).status, 200);
    assert.equal((await n.write('set', 'feed/' + nid, { posts: [] })).status, 403, 'cannot dodge by editing joined');
    await owner.write('set', 'approved/' + nid, { at: 1 });
    assert.equal((await n.write('set', 'feed/' + nid, { posts: [] })).status, 200);
    await owner.write('set', 'site/config', cfg);
  });
  await t('assets: type sniffing, access control, ranges, delete rules', async () => {
    assert.equal((await alice.post('/api/assets', Buffer.from('<svg onload=alert(1)>'.padEnd(40)), { 'Content-Type': 'image/svg+xml' })).status, 415);
    assert.equal((await alice.post('/api/assets', Buffer.from('not a png at all, really not'.padEnd(40)), { 'Content-Type': 'image/png' })).status, 415);
    const up = await alice.post('/api/assets', png, { 'Content-Type': 'image/png' }); assert.equal(up.status, 200); const id = up.json.id; assert.ok(/^[0-9a-f]{32}$/.test(id));
    const g = await bob.req('GET', '/_blob/' + id); assert.equal(g.status, 200); assert.equal(g.headers.get('content-type'), 'image/png'); assert.equal(g.buf.length, png.length);
    assert.equal(g.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await anon.req('GET', '/_blob/' + id)).status, 401);
    const rg = await bob.req('GET', '/_blob/' + id, null, { Range: 'bytes=0-9' }); assert.equal(rg.status, 206); assert.equal(rg.buf.length, 10);
    assert.equal((await bob.req('DELETE', '/api/assets/' + id)).status, 403);
    assert.equal((await alice.req('DELETE', '/api/assets/' + id)).status, 200);
    assert.equal((await bob.req('GET', '/_blob/' + id)).status, 404);
    const big = Buffer.concat([png, Buffer.alloc(21 * 1024 * 1024)]);
    assert.equal((await alice.post('/api/assets', big, { 'Content-Type': 'image/png' })).status, 413);
    assert.equal((await anon.post('/api/assets', png, { 'Content-Type': 'image/png' })).status, 401);
  });
  await t('guest mode: when login is not required anonymous can read but never write', async () => {
    const cfg = (await owner.get('site/config')).data;
    await owner.write('set', 'site/config', { ...cfg, loginRequired: false });
    assert.ok((await anon.list('profiles')).docs.length >= 2);
    assert.equal((await anon.get('data/users/' + aliceId + '/keys')).exists, false);
    assert.equal((await anon.list('reports')).docs.length, 0);
    assert.equal((await anon.list('dm')).docs.length, 0);
    assert.equal((await anon.post('/api/doc/write', { op: 'set', path: 'feed/x', data: { posts: [] } })).status, 401);
    const info = (await anon.req('GET', '/api/me')).json; assert.equal(info.uid, null); assert.equal(info.canWrite, false);
    await owner.write('set', 'site/config', cfg);
  });
  await t('signups can be closed (owner exempt)', async () => {
    const cfg = (await owner.get('site/config')).data;
    await owner.write('set', 'site/config', { ...cfg, signups: false });
    assert.equal((await new Client(S.base).register('late1')).status, 403);
    await owner.write('set', 'site/config', cfg);
    assert.equal((await new Client(S.base).register('late2')).status, 200);
  });
  await t('password change signs out other sessions; logout invalidates', async () => {
    const a2 = new Client(S.base); await a2.post('/api/login', { login: 'alice', password: 'passw0rd123' });
    assert.equal((await alice.post('/api/password', { oldPassword: 'bad', newPassword: 'newpassw0rd' })).status, 401);
    assert.equal((await alice.post('/api/password', { oldPassword: 'passw0rd123', newPassword: 'newpassw0rd' })).status, 200);
    assert.equal((await a2.me()).uid, null, 'other session ended'); assert.equal((await alice.me()).uid, aliceId, 'this session stays');
    assert.equal((await new Client(S.base).post('/api/login', { login: 'alice', password: 'passw0rd123' })).status, 401);
    const tok = alice.cookie; await alice.post('/api/logout', {}); assert.equal((await alice.me()).uid, null);
    const old = new Client(S.base); old.cookie = tok; assert.equal((await old.me()).uid, null, 'cookie dead after logout');
  });
  await t('realtime events carry only the collection name; data events only reach the owner', async () => {
    const got = { b: [], a: [] };
    const listen = async (c, k) => { const r = await fetch(S.base + '/api/events', { headers: { Cookie: c.cookie } }); const rd = r.body.getReader(); (async () => { for (;;) { const { value, done } = await rd.read(); if (done) break; got[k].push(Buffer.from(value).toString()); } })().catch(() => {}); return rd; };
    const c2 = new Client(S.base); await c2.post('/api/login', { login: 'bob', password: 'passw0rd123' }).catch(() => {});
    const s1 = new Client(S.base); await s1.post('/api/login', { login: 'late2', password: 'passw0rd123' });
    const a2 = new Client(S.base); await a2.post('/api/login', { login: 'alice', password: 'newpassw0rd' });
    const r1 = await listen(s1, 'b'); const r2 = await listen(a2, 'a');
    await new Promise(r => setTimeout(r, 150));
    await a2.write('set', 'likes/' + aliceId, { p: ['z'] });
    await a2.write('set', 'data/users/' + aliceId + '/prefs', { mute: [] });
    await new Promise(r => setTimeout(r, 300));
    const jb = got.b.join(''), ja = got.a.join('');
    assert.ok(jb.includes('"c":"likes"') && !jb.includes('"c":"data"'), 'other user sees likes but not data event: ' + jb);
    assert.ok(ja.includes('"c":"data"'), 'owner gets own data event');
    assert.ok(!/z/.test(jb.replace(/"c":"likes"/g, '')), 'no payload leaked');
    r1.cancel().catch(() => {}); r2.cancel().catch(() => {});
  });
  await t('presence: online/busy shown, hidden and secret mode never listed to others', async () => {
    assert.equal((await alice.post('/api/login', { login: 'alice', password: 'newpassw0rd' })).status, 200);
    assert.equal((await anon.post('/api/presence', {})).status, 401);
    let r = await alice.post('/api/presence', { status: 'online' }); assert.equal(r.json.list[aliceId], 'online');
    r = await bob.post('/api/presence', {}); assert.equal(r.json.list[aliceId], 'online', 'bob sees alice online');
    await alice.post('/api/presence', { status: 'busy' });
    assert.equal((await bob.post('/api/presence', {})).json.list[aliceId], 'busy');
    await alice.post('/api/presence', { status: 'hidden' });
    assert.equal((await bob.post('/api/presence', {})).json.list[aliceId], undefined, 'hidden is not listed');
    await alice.post('/api/presence', { status: 'online' });
    assert.equal((await alice.write('update', 'profiles/' + aliceId, { secret: true })).status, 200);
    assert.equal((await alice.get('profiles/' + aliceId)).data.secret, true);
    assert.equal((await bob.post('/api/presence', {})).json.list[aliceId], undefined, 'secret users are not listed');
    assert.equal((await alice.post('/api/presence', {})).json.list[aliceId], 'online', 'but they see themselves');
    assert.equal((await bob.write('update', 'profiles/' + aliceId, { secret: false })).status, 403, 'others cannot flip it');
    assert.equal((await alice.write('update', 'profiles/' + aliceId, { secret: false })).status, 200);
    assert.equal((await bob.post('/api/presence', {})).json.list[aliceId], 'online');
    await alice.post('/api/presence', { status: 'off' });
    assert.equal((await bob.post('/api/presence', {})).json.list[aliceId], undefined, 'offline after leaving');
    await alice.post('/api/presence', { status: 'bogus' });
    assert.equal((await bob.post('/api/presence', {})).json.list[aliceId], undefined, 'bad status ignored');
  });
  await t('profile customization is validated (colors, frame, header must be an asset id)', async () => {
    const hid = 'a'.repeat(32);
    assert.equal((await alice.write('update', 'profiles/' + aliceId, { bg: '#ABCDEF', accent: 'red', bcol: '#12345', frame: 'rainbow', bsty: 'evil', hdr: hid })).status, 200);
    let d = (await alice.get('profiles/' + aliceId)).data;
    assert.deepEqual([d.bg, d.accent, d.bcol, d.frame, d.bsty, d.hdr], ['#abcdef', '', '', 'rainbow', '', hid]);
    await alice.write('update', 'profiles/' + aliceId, { hdr: '../../etc/passwd', frame: '<b>' });
    d = (await alice.get('profiles/' + aliceId)).data; assert.equal(d.hdr, ''); assert.equal(d.frame, '');
    assert.equal((await bob.write('update', 'profiles/' + aliceId, { accent: '#ff0000' })).status, 403);
  });
  await t('drafts are private, sanitized; due scheduled posts are published once by the server', async () => {
    const path = 'data/users/' + aliceId + '/drafts';
    const now = Date.now();
    assert.equal((await alice.write('set', path, { items: [
      { id: 'd1', text: 'scheduled hello', at: now, sched: now - 1000 },
      { id: 'd2', text: 'later', at: now, sched: now + 3600000 },
      { id: 'd3', text: 'just a draft', at: now, sched: 0 },
      { id: 'd4', text: '   ', at: now, sched: 0 }, 'junk'] })).status, 200);
    assert.equal((await alice.get(path)).data.items.length, 3, 'blank and junk items dropped');
    assert.equal((await bob.get(path)).exists, false, 'other users cannot read drafts');
    assert.equal((await bob.write('set', path, { items: [] })).status, 403);
    await S.publishDue(); await S.publishDue();
    const feed = (await alice.get('feed/' + aliceId)).data.posts;
    assert.equal(feed.filter(p => p.text === 'scheduled hello').length, 1, 'published exactly once');
    const left = (await alice.get(path)).data.items.map(x => x.id).sort();
    assert.deepEqual(left, ['d2', 'd3'], 'only the due item left the drafts');
  });
  await t('maintenance mode blocks writes for normal users, not for the owner; scheduled posts wait', async () => {
    const cfg = (await owner.get('site/config')).data || {};
    assert.equal((await owner.write('set', 'site/config', { ...cfg, maintenance: { on: true, text: '更新中です' } })).status, 200);
    const pub = (await anon.req('GET', '/api/public')).json; assert.equal(pub.maintenance.on, true); assert.equal(pub.maintenance.text, '更新中です');
    const w = await alice.write('set', 'likes/' + aliceId, { p: [] }); assert.equal(w.status, 503); assert.equal(w.json.error, '更新中です');
    assert.equal((await alice.req('POST', '/api/assets', png, { 'Content-Type': 'image/png' })).status, 503);
    assert.equal((await alice.post('/api/presence', { status: 'online' })).status, 200, 'reading and presence still work');
    assert.equal((await owner.write('set', 'likes/' + ownerId, { p: [] })).status, 200, 'owner can still write');
    const path = 'data/users/' + aliceId + '/drafts', now = Date.now();
    await owner.write('set', 'site/config', { ...cfg, maintenance: { on: true, text: '更新中です' } });
    const before = (await alice.get('feed/' + aliceId)).data.posts.length;
    await S.docs.write({ uid: aliceId, level: 2, restricted: false }, 'set', path, { items: [{ id: 'd9', text: 'during maintenance', at: now, sched: now - 10 }] });
    await S.publishDue();
    assert.equal((await alice.get('feed/' + aliceId)).data.posts.length, before, 'not published while in maintenance');
    assert.equal((await owner.write('set', 'site/config', { ...cfg, maintenance: { on: false, text: '更新中です' } })).status, 200);
    assert.equal((await anon.req('GET', '/api/public')).json.maintenance.on, false);
    await S.publishDue();
    assert.equal((await alice.get('feed/' + aliceId)).data.posts.length, before + 1, 'published after maintenance ends');
    assert.equal((await alice.write('set', 'likes/' + aliceId, { p: [] })).status, 200, 'writes work again');
  });
  await t('data survives a restart (persistence)', async () => {
    const { createApp } = require('../server/index');
    const before = (await owner.get('site/config')).data;
    await S.close();
    const app2 = await createApp(S.env); await new Promise(r => app2.server.listen(0, '127.0.0.1', r));
    const base2 = 'http://127.0.0.1:' + app2.server.address().port;
    const c = new Client(base2); const lr = await c.post('/api/login', { login: 'late2', password: 'passw0rd123' }); assert.equal(lr.status, 200);
    assert.deepEqual((await c.get('site/config')).data, before);
    assert.equal((await c.list('feed')).docs.length >= 2, true);
    const o2 = new Client(base2); o2.cookie = owner.cookie; assert.equal((await o2.me()).owner, true, 'session survives restart');
    await app2.close();
  });
  console.log('\n' + pass + ' passed, ' + failn + ' failed');
  require('node:fs').rmSync(S.dir, { recursive: true, force: true });
  process.exit(failn ? 1 : 0);
})();
