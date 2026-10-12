'use strict';
// Adapter: gives the page the same small "db / user / assets" interface it was written against,
// but talks to this site's own server (/api/...). Access rules are enforced on the server.
(function () {
  const me = window.__me || { uid: null, owner: false, admin: false, canWrite: false };
  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ }
    if (!r.ok) { const e = new Error(j.error || ('通信エラー(' + r.status + ')')); e.status = r.status; if (r.status === 401 && me.uid) { setTimeout(() => location.reload(), 300); } throw e; }
    return j;
  }
  const subs = new Set();
  const rootOf = p => String(p).split('/')[0];

  async function refresh(s) {
    if (s.dead) return;
    if (s.busy) { s.again = true; return; }
    s.busy = true;
    try {
      if (s.kind === 'doc') {
        const j = await post('/api/doc/get', { path: s.path });
        const sig = JSON.stringify(j);
        if (sig !== s.sig) { s.sig = sig; if (!s.dead) s.cb({ id: s.path.split('/').pop(), exists: !!j.exists, data: () => JSON.parse(JSON.stringify(j.data || {})) }); }
      } else {
        const j = await post('/api/list', { path: s.path, where: s.where, orderBy: s.orderBy, limit: s.limit, hash: s.hash });
        if (!j.same) { s.hash = j.hash; if (!s.dead) s.cb({ docs: (j.docs || []).map(d => ({ id: d.id, data: () => JSON.parse(JSON.stringify(d.data)) })) }); }
      }
      s.failed = false;
    } catch (e) {
      if (!s.failed) { s.failed = true; if (s.err && !s.dead) s.err(e); }
    } finally {
      s.busy = false;
      if (s.again) { s.again = false; refresh(s); }
    }
  }
  const root = s => (s.kind === 'doc' ? rootOf(s.path) : rootOf(s.path));
  function refreshRoot(c) { for (const s of subs) if (root(s) === c) refresh(s); }
  function refreshAll() { for (const s of subs) refresh(s); }
  function add(s) { subs.add(s); refresh(s); ensureEvents(); return () => { s.dead = true; subs.delete(s); }; }

  let es = null, wasDown = false, timer = null, lastSse = 0, sseOk = false; const pending = new Set();
  function ensureEvents() {
    if (es || typeof EventSource === 'undefined') return;
    es = new EventSource('/api/events');
    es.onmessage = ev => { lastSse = Date.now(); sseOk = true; try { const m = JSON.parse(ev.data); if (m.c === 'ping') return; pending.add(m.c); clearTimeout(timer); timer = setTimeout(() => { const cs = [...pending]; pending.clear(); for (const c of cs) refreshRoot(c); }, 40); } catch (e) { /* ignore */ } };
    es.onerror = () => { wasDown = true; };
    es.onopen = () => { if (wasDown) { wasDown = false; refreshAll(); } };
  }
  setInterval(refreshAll, 20000);
  // If live notifications are not arriving (some proxies/tunnels buffer them), fall back to frequent polling.
  setInterval(() => { if (document.hidden || subs.size === 0) return; if (!(sseOk && Date.now() - lastSse < 45000)) refreshAll(); }, 3000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAll(); });

  function query(path, q) {
    const api = {
      doc: id => docRef(path + '/' + id),
      where: (f, op, v) => query(path, { ...q, where: [...(q.where || []), [f, op, v]] }),
      orderBy: (f, dir) => query(path, { ...q, orderBy: [f, dir || 'asc'] }),
      limit: n => query(path, { ...q, limit: n }),
      async add(data) { const j = await post('/api/doc/write', { op: 'add', path, data }); setTimeout(() => refreshRoot(rootOf(path)), 0); return { id: j.id }; },
      onSnapshot: (cb, err) => add({ kind: 'col', path, where: q.where || [], orderBy: q.orderBy || null, limit: q.limit || 0, cb, err }),
    };
    return api;
  }
  function docRef(path) {
    const w = async (op, data) => { const j = await post('/api/doc/write', { op, path, data }); setTimeout(() => refreshRoot(rootOf(path)), 0); return j; };
    return {
      async get() { const j = await post('/api/doc/get', { path }); return { id: path.split('/').pop(), exists: !!j.exists, data: () => JSON.parse(JSON.stringify(j.data || {})) }; },
      set: data => w('set', data), update: data => w('update', data), delete: () => w('delete'),
      collection: c => query(path + '/' + c, {}),
      onSnapshot: (cb, err) => add({ kind: 'doc', path, cb, err }),
    };
  }
  const db = { doc: docRef, collection: p => query(p, {}) };
  const user = { id: async () => me.uid, isOwner: async () => !!me.owner, canEdit: async () => !!me.admin, can: async () => !!me.canWrite };
  const assets = {
    async upload(file, opts) {
      const type = (opts && opts.type) || file.type || 'application/octet-stream';
      const r = await fetch('/api/assets', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': type }, body: file });
      let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ }
      if (!r.ok) throw new Error(j.error || 'アップロードできませんでした。');
      return { id: j.id, url: '/_blob/' + j.id };
    },
    async delete(id) { await fetch('/api/assets/' + encodeURIComponent(id), { method: 'DELETE', credentials: 'same-origin' }); },
  };
  window.claude = { use: async name => (name === 'db' ? db : name === 'user' ? user : name === 'assets' ? (me.uid ? assets : null) : null) };
})();
