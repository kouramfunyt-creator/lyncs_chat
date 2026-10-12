'use strict';
const crypto = require('node:crypto');
const { HttpError } = require('./docs');

const scrypt = (pw, salt, n) => new Promise((res, rej) => crypto.scrypt(pw, salt, 32, { N: n, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function newUid() { const b = crypto.randomBytes(22); let s = 'u_'; for (const x of b) s += B62[x % 62]; return s; }

async function hashPw(pw) {
  const salt = crypto.randomBytes(16); const N = 16384;
  const k = await scrypt(pw, salt, N);
  return ['scrypt', N, salt.toString('base64'), k.toString('base64')].join('$');
}
async function checkPw(pw, stored) {
  const [alg, n, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const k = await scrypt(pw, Buffer.from(salt, 'base64'), Number(n));
  const h = Buffer.from(hash, 'base64');
  return h.length === k.length && crypto.timingSafeEqual(h, k);
}

class Limiter {
  constructor() { this.m = new Map(); }
  hit(key, max, windowMs) {
    const now = Date.now();
    const a = (this.m.get(key) || []).filter(t => now - t < windowMs);
    if (a.length >= max) { this.m.set(key, a); return false; }
    a.push(now); this.m.set(key, a);
    if (this.m.size > 20000) for (const [k, v] of this.m) if (!v.length || now - v[v.length - 1] > 3600e3) this.m.delete(k);
    return true;
  }
  count(key, windowMs) { const now = Date.now(); return (this.m.get(key) || []).filter(t => now - t < windowMs).length; }
  clear(key) { this.m.delete(key); }
}

class Auth {
  constructor(db, docs, env) {
    this.db = db; this.docs = docs; this.env = env;
    this.users = new Map(); this.byLogin = new Map(); this.sessions = new Map();
    this.limit = new Limiter();
    this.ownerName = (env.OWNER_USERNAME || '').trim().toLowerCase();
  }
  async load() {
    for (const u of await this.db.all('SELECT id, login, pw, role, created FROM users')) { this.users.set(u.id, u); this.byLogin.set(u.login.toLowerCase(), u); }
    const now = Date.now();
    for (const s of await this.db.all('SELECT h, uid, exp FROM sessions')) if (s.exp > now && this.users.has(s.uid)) this.sessions.set(s.h, s);
    await this.db.run('DELETE FROM sessions WHERE exp < ?', [now]).catch(() => {});
  }
  hasOwner() { for (const u of this.users.values()) if (u.role === 'owner') return true; return false; }

  validate(login, pw) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(login || '')) throw new HttpError(400, 'ログインIDは半角の英数字と _ で3〜20文字にしてください。');
    if (typeof pw !== 'string' || pw.length < 8 || pw.length > 128) throw new HttpError(400, 'パスワードは8文字以上、128文字以内にしてください。');
  }
  async register(login, pw, ip) {
    this.validate(login, pw);
    if (!this.limit.hit('reg:' + ip, Number(this.env.REGISTER_PER_HOUR || 10), 3600e3)) throw new HttpError(429, '登録の回数が多すぎます。しばらくしてからもう一度お試しください。');
    const lower = login.toLowerCase();
    if (this.byLogin.has(lower)) throw new HttpError(409, 'そのログインIDはすでに使われています。');
    const wantsOwner = this.ownerName ? lower === this.ownerName : !this.hasOwner();
    if (this.docs.cfg().signups === false && !wantsOwner) throw new HttpError(403, '現在、新規登録は受け付けていません。');
    if (wantsOwner && this.hasOwner()) throw new HttpError(409, 'そのログインIDはすでに使われています。');
    const u = { id: newUid(), login, pw: await hashPw(pw), role: wantsOwner ? 'owner' : 'user', created: Date.now() };
    await this.db.run('INSERT INTO users(id, login, pw, role, created) VALUES(?,?,?,?,?)', [u.id, u.login, u.pw, u.role, u.created]);
    this.users.set(u.id, u); this.byLogin.set(lower, u);
    return u;
  }
  async login(login, pw, ip) {
    const k1 = 'lf:' + ip, k2 = 'lf:' + String(login).toLowerCase();
    if (this.limit.count(k1, 600e3) >= 30 || this.limit.count(k2, 600e3) >= 8) throw new HttpError(429, 'ログインの失敗が続いたため、しばらく使えません。10分後にもう一度お試しください。');
    const u = this.byLogin.get(String(login || '').toLowerCase());
    const ok = u ? await checkPw(String(pw || ''), u.pw) : (await checkPw('x', 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(32).toString('base64')), false);
    if (!ok) { this.limit.hit(k1, 1e9, 600e3); this.limit.hit(k2, 1e9, 600e3); throw new HttpError(401, 'ログインIDまたはパスワードが違います。'); }
    this.limit.clear(k2);
    return u;
  }
  async newSession(uid) {
    const token = crypto.randomBytes(32).toString('base64url');
    const s = { h: sha(token), uid, exp: Date.now() + 30 * 86400e3 };
    await this.db.run('INSERT INTO sessions(h, uid, exp) VALUES(?,?,?)', [s.h, s.uid, s.exp]);
    this.sessions.set(s.h, s);
    return { token, exp: s.exp };
  }
  userOf(token) {
    if (!token) return null;
    const s = this.sessions.get(sha(token));
    if (!s) return null;
    if (s.exp < Date.now()) { this.sessions.delete(s.h); return null; }
    return this.users.get(s.uid) || null;
  }
  async endSession(token) { if (!token) return; const h = sha(token); this.sessions.delete(h); await this.db.run('DELETE FROM sessions WHERE h = ?', [h]).catch(() => {}); }
  async endAllSessions(uid, exceptToken) {
    const keep = exceptToken ? sha(exceptToken) : null;
    for (const [h, s] of this.sessions) if (s.uid === uid && h !== keep) this.sessions.delete(h);
    await this.db.run('DELETE FROM sessions WHERE uid = ?' + (keep ? ' AND h <> ?' : ''), keep ? [uid, keep] : [uid]);
  }
  async setPassword(uid, pw) {
    const u = this.users.get(uid); if (!u) throw new HttpError(404, 'ユーザーが見つかりません。');
    const h = await hashPw(pw);
    await this.db.run('UPDATE users SET pw = ? WHERE id = ?', [h, uid]);
    u.pw = h;
  }
  async changePassword(u, oldPw, newPw, token, ip) {
    this.validate(u.login, newPw);
    if (!this.limit.hit('pw:' + u.id, 10, 600e3)) throw new HttpError(429, '試行回数が多すぎます。しばらくしてからお試しください。');
    if (!(await checkPw(String(oldPw || ''), u.pw))) throw new HttpError(401, '現在のパスワードが違います。');
    await this.setPassword(u.id, newPw);
    await this.endAllSessions(u.id, token);
  }
  levelOf(u) {
    if (!u) return 0;
    if (u.role === 'owner') return 4;
    if (this.docs.isStaff(u.id)) return 3;
    return 2;
  }
  restricted(u) {
    if (!u || u.role === 'owner' || this.docs.isStaff(u.id)) return false;
    if (this.docs.has('bans/' + u.id)) return true;
    const c = this.docs.cfg();
    if (c.requireApproval) {
      const p = this.docs.raw('profiles/' + u.id);
      if (p && (p.joined || 0) > (c.approvalSince || 0) && !this.docs.has('approved/' + u.id)) return true;
    }
    return false;
  }
}

module.exports = { Auth, Limiter };
