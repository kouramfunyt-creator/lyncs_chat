'use strict';
// Document store (in memory, write-through to the database) with server-side access rules.
const LV = { none: 0, view: 1, interact: 2, admin: 3, owner: 4 };
const ROOTS = new Set(['site', 'bans', 'staff', 'verified', 'picks', 'approved', 'admin', 'reports', 'profiles', 'feed', 'follows', 'likes', 'votes', 'media', 'dm', 'groups', 'data']);
// path pattern -> required level. {self} matches only the caller's own id; otherwise the parent rule applies.
const RULES = [
  ['site', 'view', 'admin'], ['bans', 'view', 'admin'], ['staff', 'view', 'owner'], ['verified', 'view', 'admin'],
  ['picks', 'view', 'admin'], ['approved', 'view', 'admin'], ['admin', 'admin', 'admin'],
  ['reports', 'admin', 'admin'], ['reports/{self}', 'interact', 'interact'],
  ['profiles', 'view', 'admin'], ['profiles/{self}', null, 'interact'],
  ['feed', 'view', 'admin'], ['feed/{self}', null, 'interact'],
  ['follows', 'view', 'admin'], ['follows/{self}', null, 'interact'],
  ['likes', 'view', 'admin'], ['likes/{self}', null, 'interact'],
  ['votes', 'view', 'admin'], ['votes/{self}', null, 'interact'],
  ['media', 'view', 'admin'], ['media/{self}', null, 'interact'],
].map(([p, read, write]) => ({ segs: p.split('/'), read, write }));

const MAX_DOC = 256 * 1024;
const MAX_SUBTREE = Number(process.env.MAX_USER_DOC_MB || 30) * 1024 * 1024;
const clone = o => JSON.parse(JSON.stringify(o));
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
const PATH_SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const UID = /^u_[A-Za-z0-9]{10,40}$/;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function deepMerge(base, patch) {
  const out = isObj(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (isObj(v) && v.__delete__ === true) { delete out[k]; continue; }
    if (isObj(v) && isObj(out[k])) out[k] = deepMerge(out[k], v);
    else if (isObj(v)) out[k] = deepMerge({}, v);
    else out[k] = v;
  }
  return out;
}

function checkKeys(o, depth = 0) {
  if (depth > 12) throw new HttpError(400, 'データが深すぎます。');
  if (Array.isArray(o)) { for (const x of o) checkKeys(x, depth + 1); return; }
  if (isObj(o)) for (const k of Object.keys(o)) { if (k === '__proto__') throw new HttpError(400, '使えないキーです。'); checkKeys(o[k], depth + 1); }
}

class Docs {
  constructor(db) { this.db = db; this.map = new Map(); this.kids = new Map(); this.locks = new Map(); this.handles = new Map(); this.sub = new Map(); this.onChange = () => {}; }

  async load() {
    const rows = await this.db.all('SELECT path, data, version FROM docs');
    for (const r of rows) { try { this._put(r.path, JSON.parse(r.data), Number(r.version)); } catch (e) { console.warn('skip bad doc', r.path); } }
  }
  _split(path) { const i = path.lastIndexOf('/'); return [path.slice(0, i), path.slice(i + 1)]; }
  _put(path, data, version) {
    const old = this.map.get(path);
    this.map.set(path, { data, version });
    const [parent, id] = this._split(path);
    if (!this.kids.has(parent)) this.kids.set(parent, new Set());
    this.kids.get(parent).add(id);
    if (path.startsWith('profiles/')) { if (old && old.data.handle) this.handles.delete(old.data.handle); if (data.handle) this.handles.set(data.handle, path.slice(9)); }
    const m = /^(media|data)\/(?:users\/)?([^/]+)\//.exec(path);
    if (m) { const k = m[1] + '/' + m[2]; this.sub.set(k, (this.sub.get(k) || 0) + JSON.stringify(data).length - (old ? JSON.stringify(old.data).length : 0)); }
  }
  _drop(path) {
    const old = this.map.get(path);
    this.map.delete(path);
    const [parent, id] = this._split(path);
    const s = this.kids.get(parent); if (s) { s.delete(id); if (!s.size) this.kids.delete(parent); }
    if (old && path.startsWith('profiles/') && old.data.handle) this.handles.delete(old.data.handle);
    const m = /^(media|data)\/(?:users\/)?([^/]+)\//.exec(path);
    if (m && old) { const k = m[1] + '/' + m[2]; this.sub.set(k, Math.max(0, (this.sub.get(k) || 0) - JSON.stringify(old.data).length)); }
  }
  has(path) { return this.map.has(path); }
  get(path) { const e = this.map.get(path); return e ? { data: clone(e.data), version: e.version } : null; }
  raw(path) { const e = this.map.get(path); return e ? e.data : null; }
  list(parent) { const s = this.kids.get(parent); if (!s) return []; return [...s].map(id => ({ id, path: parent + '/' + id })).filter(x => this.map.has(x.path)); }
  cfg() { return this.raw('site/config') || {}; }
  isStaff(uid) { return !!uid && this.map.has('staff/' + uid); }

  lock(path, fn) {
    const prev = this.locks.get(path) || Promise.resolve();
    const next = prev.then(fn, fn);
    const tail = next.catch(() => {});
    this.locks.set(path, tail);
    tail.then(() => { if (this.locks.get(path) === tail) this.locks.delete(path); });
    return next;
  }

  async _persist(path, data, version) {
    await this.db.run('INSERT INTO docs(path, data, version, updated) VALUES(?,?,?,?) ON CONFLICT(path) DO UPDATE SET data=excluded.data, version=excluded.version, updated=excluded.updated', [path, JSON.stringify(data), version, Date.now()]);
  }

  // ----- access control -----
  ruleLevel(segs, uid, which) {
    let best = null, bestLen = -1;
    for (const r of RULES) {
      if (r.segs.length > segs.length || r.segs.length <= bestLen) continue;
      let ok = true;
      for (let i = 0; i < r.segs.length; i++) {
        const rs = r.segs[i];
        if (rs === '{self}') { if (!uid || segs[i] !== uid) { ok = false; break; } } else if (rs !== segs[i]) { ok = false; break; }
      }
      if (ok) { best = r; bestLen = r.segs.length; }
    }
    // inherit: if the best rule lacks the level, look for the longest rule that has it
    let found = best && best[which];
    if (!found) {
      let l2 = -1;
      for (const r of RULES) {
        if (!r[which] || r.segs.length > segs.length || r.segs.length <= l2) continue;
        let ok = true;
        for (let i = 0; i < r.segs.length; i++) { const rs = r.segs[i]; if (rs === '{self}') { if (!uid || segs[i] !== uid) { ok = false; break; } } else if (rs !== segs[i]) { ok = false; break; } }
        if (ok) { found = r[which]; l2 = r.segs.length; }
      }
    }
    return found || null;
  }

  /** ctx = { uid, level, restricted } */
  can(ctx, path, action, newData) {
    const segs = path.split('/');
    if (segs.length < 2 || !segs.every(s => PATH_SEG.test(s))) return false;
    const root = segs[0];
    if (!ROOTS.has(root)) return false;
    const uid = ctx.uid;
    const write = action !== 'read';
    if (write) {
      if (!uid) return false;
      if (ctx.restricted) {
        const own = (root === 'profiles' && segs.length === 2 && segs[1] === uid) || (root === 'data' && segs[1] === 'users' && segs[2] === uid);
        if (!own) return false;
      }
    }
    if (root === 'data') return !!uid && segs[1] === 'users' && segs[2] === uid && segs.length >= 4;
    if (root === 'dm') {
      if (!uid || segs.length < 2) return false;
      const halves = segs[1].split('~');
      if (halves.length !== 2 || !halves.every(h => UID.test(h)) || !halves.includes(uid) || halves[0] >= halves[1]) return false;
      if (segs.length === 2 && write && action !== 'delete' && newData) {
        const m = newData.members;
        if (!Array.isArray(m) || m.length !== 2 || [...m].sort().join('~') !== segs[1]) return false;
      }
      return segs.length === 2 || (segs.length === 4 && segs[2] === 'msgs');
    }
    if (root === 'groups') {
      if (!uid) return false;
      const g = this.raw('groups/' + segs[1]);
      if (segs.length === 2) {
        if (!g) return write && action !== 'delete' && !!newData && Array.isArray(newData.members) && newData.members.includes(uid) && newData.owner === uid && ctx.level >= LV.interact;
        const member = Array.isArray(g.members) && g.members.includes(uid);
        if (member) return ctx.level >= LV.interact;
        return ctx.level >= LV.admin && (action === 'read' || action === 'delete');
      }
      if (segs.length === 4 && segs[2] === 'msgs') return !!g && Array.isArray(g.members) && g.members.includes(uid) && ctx.level >= LV.interact;
      return false;
    }
    const need = this.ruleLevel(segs, uid, write ? 'write' : 'read');
    const dflt = write ? 'interact' : 'view';
    return ctx.level >= LV[need || dflt];
  }

  // ----- validation -----
  validate(path, oldData, data, ctx) {
    const segs = path.split('/');
    checkKeys(data);
    const size = JSON.stringify(data).length;
    if (size > MAX_DOC) throw new HttpError(413, 'データが大きすぎます。');
    const sk = (segs[0] === 'media' || segs[0] === 'reports' || segs[0] === 'feed' || segs[0] === 'follows' || segs[0] === 'likes' || segs[0] === 'votes') ? segs[0] + '/' + segs[1] : null;
    if (segs[0] === 'media' && segs.length > 2) {
      const used = this.sub.get('media/' + segs[1]) || 0;
      if (used + size - (oldData ? JSON.stringify(oldData).length : 0) > MAX_SUBTREE) throw new HttpError(413, '保存できる容量の上限に達しました。');
    }
    void sk;
    if (segs[0] === 'profiles' && segs.length === 2) {
      const d = data;
      const keep = {};
      const str = (v, n) => String(v == null ? '' : v).slice(0, n);
      if (d.handle !== undefined) {
        if (!/^[a-z0-9_]{3,15}$/.test(String(d.handle))) throw new HttpError(400, 'ユーザーIDは半角の英小文字・数字・_ で3〜15文字にしてください。');
        if (oldData && oldData.handle && oldData.handle !== d.handle) throw new HttpError(400, 'ユーザーIDは変更できません。');
        const owner = this.handles.get(d.handle);
        if (owner && owner !== segs[1]) throw new HttpError(409, 'そのユーザーIDはすでに使われています。');
        keep.handle = d.handle;
      } else if (oldData && oldData.handle) keep.handle = oldData.handle;
      else throw new HttpError(400, 'ユーザーIDが必要です。');
      keep.name = str(d.name, 24).trim() || keep.handle;
      keep.bio = str(d.bio, 100);
      keep.hue = Number.isFinite(Number(d.hue)) ? Math.max(0, Math.min(360, Number(d.hue))) : 215;
      keep.img = typeof d.img === 'string' && d.img.length < 40000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d.img) ? d.img : '';
      keep.pin = str(d.pin, 40);
      keep.secret = d.secret === true;
      const hex = v => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v).toLowerCase() : '');
      const oneOf = (v, list) => (list.includes(String(v || '')) ? String(v || '') : '');
      keep.hdr = /^[0-9a-f]{32}$/.test(String(d.hdr || '')) ? d.hdr : '';
      keep.bg = hex(d.bg); keep.accent = hex(d.accent); keep.bcol = hex(d.bcol);
      keep.frame = oneOf(d.frame, ['ring', 'double', 'dashed', 'glow', 'rainbow']);
      keep.bsty = oneOf(d.bsty, ['bold', 'italic', 'center', 'quote', 'card']);
      if (d.pub && isObj(d.pub)) keep.pub = { kty: str(d.pub.kty, 8), crv: str(d.pub.crv, 12), x: str(d.pub.x, 100), y: str(d.pub.y, 100) }; else if (oldData && oldData.pub) keep.pub = oldData.pub; else keep.pub = null;
      keep.joined = oldData && oldData.joined ? oldData.joined : Date.now();
      const t = Number(d.terms); keep.terms = Number.isFinite(t) && t > 0 ? Math.min(t, Date.now()) : (oldData && oldData.terms) || 0;
      return keep;
    }
    if (segs[0] === 'feed' && segs.length === 2) {
      if (!Array.isArray(data.posts) || data.posts.length > 300) throw new HttpError(400, 'ポストの形式が正しくありません。');
      for (const p of data.posts) if (!isObj(p) || typeof p.id !== 'string' || !Number.isFinite(p.at)) throw new HttpError(400, 'ポストの形式が正しくありません。');
    }
    if (segs[0] === 'data' && segs.length === 4 && segs[3] === 'drafts') {
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length > 30) throw new HttpError(400, '下書きは30件までです。');
      const out = [];
      for (const it of items) {
        if (!isObj(it) || typeof it.id !== 'string') continue;
        const text = String(it.text == null ? '' : it.text).slice(0, 1000);
        if (!text.trim()) continue;
        const sched = Number(it.sched); const at = Number(it.at);
        out.push({ id: it.id.slice(0, 40), text, at: Number.isFinite(at) ? at : Date.now(), sched: Number.isFinite(sched) && sched > 0 ? Math.min(sched, Date.now() + 400 * 86400000) : 0 });
      }
      return { items: out };
    }
    if (segs[0] === 'staff' && segs.length === 2 && !UID.test(segs[1])) throw new HttpError(400, 'IDが正しくありません。');
    return data;
  }

  // ----- operations -----
  async write(ctx, op, path, input) {
    return this.lock(path, async () => {
      const cur = this.map.get(path);
      const oldData = cur ? cur.data : null;
      if (op === 'delete') {
        if (!this.can(ctx, path, 'delete')) throw new HttpError(403, '権限がありません。');
        if (!cur) return { version: 0 };
        await this.db.run('DELETE FROM docs WHERE path = ?', [path]);
        this._drop(path); this.onChange(path, ctx);
        return { version: 0 };
      }
      if (!isObj(input)) throw new HttpError(400, 'データが正しくありません。');
      let data = op === 'update' ? deepMerge(oldData || {}, input) : clone(input);
      // access is checked against the data being written (for create rules) and the stored doc
      if (!this.can(ctx, path, op, data)) throw new HttpError(403, '権限がありません。');
      data = this.validate(path, oldData, data, ctx);
      const version = (cur ? cur.version : 0) + 1;
      await this._persist(path, data, version);
      this._put(path, data, version);
      this.onChange(path, ctx);
      return { version };
    });
  }

  query(ctx, parent, where, orderBy, limit) {
    const out = [];
    for (const k of this.list(parent)) {
      if (!this.can(ctx, k.path, 'read')) continue;
      const e = this.map.get(k.path);
      let ok = true;
      for (const w of (where || [])) {
        const [f, op, v] = w;
        const val = e.data[f];
        if (op === 'array-contains') ok = Array.isArray(val) && val.includes(v);
        else if (op === '==' || op === 'eq') ok = val === v;
        else ok = false;
        if (!ok) break;
      }
      if (ok) out.push({ id: k.id, data: clone(e.data), version: e.version });
    }
    if (orderBy && orderBy[0]) { const [f, dir] = orderBy; out.sort((a, b) => (dir === 'desc' ? -1 : 1) * ((a.data[f] > b.data[f]) - (a.data[f] < b.data[f]))); }
    return limit ? out.slice(0, Math.min(1000, limit)) : out.slice(0, 5000);
  }
}

module.exports = { Docs, HttpError, LV, UID };
