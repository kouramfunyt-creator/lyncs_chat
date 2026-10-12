
(async () => {
"use strict";

/* ---------- small DOM kit ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function add(e, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "on") for (const ev of Object.keys(v)) e.addEventListener(ev, v[ev]);
    else if (k === "style") e.style.cssText = v;
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  add(e, kids);
  return e;
}
const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  send: '<path d="M21 3L3 10.5l7 2.5 2.5 7z"/><path d="M10 13l11-10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  users: '<circle cx="9" cy="9" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5"/><circle cx="17" cy="8" r="2.5"/><path d="M17 13.5c2.6 0 4.2 1.4 4.8 4"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  megaphone: '<path d="M4 10v4h3l8 4V6L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  pin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h13l-2 4 2 4H5"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  reply: '<path d="M10 8V4L3 11l7 7v-4c6 0 9 1 11 6 0-7-4-12-11-12z"/>',
  quote: '<path d="M7 6v5M7 11c0 3-1 4-3 5M17 6v5M17 11c0 3-1 4-3 5"/><path d="M4 6h6v5H4zM14 6h6v5h-6z"/>',
  bell: '<path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  poll: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'
};
function icon(name, size = 20) {
  const s = h("span", { style: "display:inline-flex;flex:none", "aria-hidden": "true" });
  s.innerHTML = '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>";
  return s;
}
const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3" fill="var(--accent)"/><rect x="18" y="2" width="12" height="12" rx="3" fill="var(--ink)" opacity=".16"/><rect x="2" y="18" width="12" height="12" rx="3" fill="var(--ink)" opacity=".16"/><rect x="18" y="18" width="12" height="12" rx="3" fill="var(--ink)" opacity=".45"/></svg>';
let siteName = "Lyncs_Chat";
function brand() { const b = h("span", { class: "brand" }); b.innerHTML = MARK; b.append(h("span", { class: "brand-name" }, siteName)); return b; }
const CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--accent-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MARKS = {
  s: { label: "運営", svg: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 1.8l8.2 3v6.3c0 5-3.4 9.1-8.2 11.1-4.8-2-8.2-6.1-8.2-11.1V4.8z" fill="var(--ink)"/><path d="M12 6.3l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="var(--bg)"/></svg>' },
  v: { label: "認証済み", svg: CHECK },
  y: { label: "YouTubeマーク(YouTubeチャンネルを持っている人)", svg: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#e62117"/><path d="M10 8.8v6.4l5.5-3.2z" fill="#fff"/></svg>' },
  t: { label: "Twitchマーク(Twitchで配信している人)", svg: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 2.5h17v12.5l-5 5h-4l-3 3v-3H4z" fill="#9146ff"/><rect x="10.5" y="7" width="2" height="5.5" rx="1" fill="#fff"/><rect x="15.5" y="7" width="2" height="5.5" rx="1" fill="#fff"/></svg>' }
};
const MARK_ORDER = ["s", "v", "y", "t"];
function marksOf(uid) {
  const out = [];
  if (S.staff.has(uid)) out.push("s");
  const d = S.verified.get(uid);
  if (d) { const m = Array.isArray(d.m) ? d.m : ["v"]; ["v", "y", "t"].forEach(k => { if (m.includes(k)) out.push(k); }); }
  return out;
}
const badgeKind = uid => marksOf(uid).join("");
function badge(uid) {
  const ks = marksOf(uid);
  if (!ks.length) return null;
  const w = h("span", { class: "vbadges" });
  ks.forEach(k => { const b = h("span", { class: "vbadge" + (k === "y" || k === "t" ? " brandmark" : ""), title: MARKS[k].label, role: "img", "aria-label": MARKS[k].label }); b.innerHTML = MARKS[k].svg; w.append(b); });
  return w;
}
const canAdmin = () => S.isOwner || (S.isAdmin && S.staff.has(S.me));
$("#gate-brand").replaceWith(brand());

/* ---------- crypto (pure helpers) ---------- */
// <crypto>
const enc = new TextEncoder(), dec = new TextDecoder();
function b64(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(s) {
  const bin = atob(s), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
const EC = { name: "ECDH", namedCurve: "P-256" };
async function makePair() {
  const kp = await crypto.subtle.generateKey(EC, true, ["deriveKey"]);
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const full = await crypto.subtle.exportKey("jwk", kp.publicKey);
  return { priv, pub: { kty: full.kty, crv: full.crv, x: full.x, y: full.y } };
}
function importPriv(jwk) { return crypto.subtle.importKey("jwk", jwk, EC, false, ["deriveKey"]); }
async function deriveShared(priv, pubJwk) {
  const pub = await crypto.subtle.importKey("jwk", { kty: pubJwk.kty, crv: pubJwk.crv, x: pubJwk.x, y: pubJwk.y, ext: true }, EC, true, []);
  return crypto.subtle.deriveKey({ name: "ECDH", public: pub }, priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(ct) };
}
async function open(key, box) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.ct));
  return JSON.parse(dec.decode(pt));
}
function importGroupKey(rawB64) { return crypto.subtle.importKey("raw", unb64(rawB64), "AES-GCM", false, ["encrypt", "decrypt"]); }
// </crypto>

/* ---------- state ---------- */
const S = {
  db: null, user: null, assets: null, me: null,
  isAdmin: false, canWrite: true, cryptoOK: !!(window.crypto && crypto.subtle),
  profiles: new Map(), feeds: new Map(), follows: new Map(), likes: new Map(), bans: new Map(),
  dms: new Map(), groups: new Map(), allGroups: new Map(), staff: new Map(), verified: new Map(), picks: new Map(), votes: new Map(), approved: new Map(), reports: new Map(), reportDone: {}, prefs: { mute: [], block: [] }, guest: false, isOwner: false,
  config: {}, reads: {}, audit: [], loaded: {}, unsubs: [], presence: {}, settings: { presence: "online" }, drafts: [], onDrafts: null,
  posts: [], postById: new Map(), likeCount: new Map(), followers: new Map(),
  route: { v: "home" }, att: [], attBusy: false, posting: false,
  priv: null, pubJwk: null, gkeys: new Map(), dkeys: new Map(), mcache: new Map(), dcache: new Map(),
  thread: null, msgs: [], msgErr: null, msgTok: 0, msgUn: null,
  keySynced: false, booted: false, wantReg: false, notifs: [], replyCount: new Map(), quoteCount: new Map(), repliesOf: new Map(), tally: new Map()
};
const V = {};
const cfg = () => Object.assign({ signups: true, maxLen: 300, announce: null, name: "Lyncs_Chat", url: "", loginRequired: true, terms: "", requireApproval: false, approvalSince: 0, maintenance: null }, S.config || {});
const safeUrl = u => /^https?:\/\/[^\s<>"']+$/i.test(u || "") ? u : "";
function applyBrand() {
  siteName = (cfg().name || "").trim() || "Lyncs_Chat";
  $$(".brand-name").forEach(e => { if (e.textContent !== siteName) e.textContent = siteName; });
}
function siteLink() {
  const u = safeUrl(cfg().url);
  return u ? h("a", { class: "sitelink", href: u, target: "_blank", rel: "noopener noreferrer" }, "公式サイト: " + u.replace(/^https?:\/\//i, "").replace(/\/$/, "")) : null;
}
const prof = uid => S.profiles.get(uid) || { name: "退会したユーザー", handle: "unknown", hue: 215, bio: "" };
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const convId = (a, b) => [a, b].sort().join("~");
const isBanned = uid => S.bans.has(uid);
const pendingOf = u => !!cfg().requireApproval && !S.staff.has(u) && ((S.profiles.get(u) || {}).joined || 0) > (cfg().approvalSince || 0) && !S.approved.has(u);
const isMuted = uid => (S.prefs.mute || []).includes(uid);
const isBlocked = uid => (S.prefs.block || []).includes(uid);
const isNotice = p => p.kind === "notice" && S.staff.has(p.uid);
function needsApproval() {
  const c = cfg();
  if (!c.requireApproval || S.guest || S.isOwner || S.staff.has(S.me)) return false;
  const j = (S.profiles.get(S.me) || {}).joined || 0;
  return j > (c.approvalSince || 0) && !S.approved.has(S.me);
}

/* ---------- format ---------- */
function rel(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 45) return "たった今";
  if (s < 3600) return Math.round(s / 60) + "分前";
  if (s < 86400) return Math.round(s / 3600) + "時間前";
  const d = new Date(ts), n = new Date();
  return (d.getFullYear() === n.getFullYear() ? "" : d.getFullYear() + "年") + (d.getMonth() + 1) + "月" + d.getDate() + "日";
}
const hm = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const dayLabel = ts => { const d = new Date(ts); return (d.getMonth() + 1) + "月" + d.getDate() + "日"; };
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); };
const fullDate = ts => { const d = new Date(ts); return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + hm(ts); };

function uidOfHandle(hd) {
  hd = hd.toLowerCase();
  for (const [u, p] of S.profiles) if ((p.handle || "").toLowerCase() === hd) return u;
  return null;
}
const mentionsIn = text => new Set((String(text || "").match(/(?<![\p{L}\p{N}_@])@[A-Za-z0-9_]{3,15}/gu) || []).map(x => x.slice(1).toLowerCase()));
const tagsIn = text => [...new Set((String(text || "").match(/#[\p{L}\p{N}_]+/gu) || []).map(x => x.toLowerCase()))];
function richText(text) {
  const frag = document.createDocumentFragment();
  const re = /(https?:\/\/[^\s<>"']+)|(#[\p{L}\p{N}_]+)|((?<![\p{L}\p{N}_@])@[A-Za-z0-9_]{3,15})/gu;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
    if (m[1]) frag.append(h("a", { href: m[1], target: "_blank", rel: "noopener noreferrer" }, m[1]));
    else if (m[3]) {
      const uid = uidOfHandle(m[3].slice(1));
      if (uid) frag.append(h("button", { class: "tag mention", on: { click: () => toProfile(uid) } }, m[3])); else frag.append(document.createTextNode(m[3]));
    }
    else { const t = m[2]; frag.append(h("button", { class: "tag", on: { click: () => go({ v: "search", q: t }) } }, t)); }
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
  return frag;
}

/* ---------- toast / modal ---------- */
function toast(msg) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 3600);
}
function fail(e) {
  console.warn(e);
  const c = e && e.code;
  if (c === "invalid_argument") toast("この操作を行う権限がありません。");
  else if (c === "quota_exceeded") toast("保存容量がいっぱいです。運営に連絡してください。");
  else if (c === "resource_exhausted" || c === "rate_limited") toast("操作が多すぎます。少し待ってからやり直してください。");
  else if (c === "too_large") toast("ファイルが大きすぎます。");
  else toast((e && e.message && /[぀-鿿]/.test(e.message)) ? e.message : "保存できませんでした。もう一度お試しください。");
}
function modal(title, content, opts = {}) {
  const back = h("div", { class: "modal-back", on: { mousedown: e => { if (e.target === back) close(); } } });
  const esc = e => { if (e.key === "Escape") close(); };
  function close() { back.remove(); document.removeEventListener("keydown", esc); if (opts.onClose) opts.onClose(); }
  back.append(h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "modal-head" }, h("h2", null, title), h("button", { class: "icon-btn", "aria-label": "閉じる", on: { click: close } }, icon("x"))),
    h("div", { class: "modal-body" }, content)));
  $("#modal-root").append(back);
  applyPresence(back);
  document.addEventListener("keydown", esc);
  return close;
}
function confirmBox(msg, { ok = "OK", danger = false, reason = false } = {}) {
  return new Promise(res => {
    let field = null;
    const body = h("div", { class: "stack" },
      h("p", { class: "muted-p" }, msg),
      reason ? (field = h("textarea", { id: "confirm-reason", rows: 2, maxLength: 200, placeholder: "理由(操作ログに残ります)" })) : null,
      h("div", { class: "row end" },
        h("button", { class: "btn", on: { click: () => { res(null); close(); } } }, "キャンセル"),
        h("button", { class: "btn " + (danger ? "danger-solid" : "primary"), on: { click: () => { res({ reason: field ? field.value.trim() : "" }); close(); } } }, ok)));
    const close = modal("確認", body, { onClose: () => res(null) });
  });
}

/* ---------- avatar / rows ---------- */
const IMG_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/;
const okImg = u => typeof u === "string" && u.length < 40000 && IMG_RE.test(u);
function avatar(uid, size = 40) {
  const p = prof(uid);
  const img = okImg(p.img);
  const fr = okFrame(p.frame);
  return h("span", { class: "av" + (fr ? " fr-" + fr : ""), "data-uid": uid, style: "--s:" + size + "px;background:hsl(" + (p.hue == null ? 215 : p.hue) + " 42% 36%)" + (fr ? ";--fc:" + (okHex(p.accent) || "hsl(" + (p.hue == null ? 215 : p.hue) + " 70% 55%)") : ""), "aria-hidden": "true" },
    img ? h("img", { src: p.img, alt: "", draggable: "false" }) : (p.name || "?").trim().slice(0, 1));
}
async function prepAvatar(f) {
  if (!f.type.startsWith("image/")) throw new Error("画像を選んでください。");
  const bmp = await loadBitmap(f);
  const w = bmp.width || bmp.naturalWidth, hh = bmp.height || bmp.naturalHeight, side = Math.min(w, hh);
  for (const dim of [256, 200, 160, 120]) for (const q of [0.82, 0.66, 0.5]) {
    const c = document.createElement("canvas"); c.width = c.height = dim;
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, dim, dim);
    x.drawImage(bmp, (w - side) / 2, (hh - side) / 2, side, side, 0, 0, dim, dim);
    const url = c.toDataURL("image/jpeg", q);
    if (url.length <= 30000 && okImg(url)) return url;
  }
  throw new Error("画像が大きすぎてアイコンにできませんでした。");
}
function avatarPicker(init, name, getHue) {
  let img = init || "";
  const prev = h("span", { class: "avprev" });
  const file = h("input", { type: "file", accept: "image/*", hidden: true, id: "av-file" });
  const rm = h("button", { class: "btn small", type: "button", id: "av-rm" }, "画像を外す");
  const draw = () => {
    prev.replaceChildren(h("span", { class: "av", style: "--s:64px;background:hsl(" + getHue() + " 42% 36%)" }, okImg(img) ? h("img", { src: img, alt: "" }) : (name().trim() || "?").slice(0, 1)));
    rm.hidden = !img;
  };
  file.addEventListener("change", async () => {
    const f = file.files && file.files[0]; file.value = "";
    if (!f) return;
    try { img = await prepAvatar(f); draw(); } catch (e) { toast(e.message || "画像を読み込めませんでした。"); }
  });
  rm.addEventListener("click", () => { img = ""; draw(); });
  const pick = h("button", { class: "btn small", type: "button", id: "av-pick", on: { click: () => file.click() } }, "画像を選ぶ");
  draw();
  return { el: h("div", { class: "avpick" }, prev, pick, rm, file), get: () => img, redraw: draw };
}
function groupAvatar(name, size = 44) { return h("span", { class: "av sq", style: "--s:" + size + "px" }, icon("users", Math.round(size * .5))); }
const toProfile = uid => go({ v: "profile", id: uid });

function guard() {
  if (S.guest) { toast("登録すると使えます。「登録して参加」を押してください。"); return false; }
  if (needsApproval()) { toast("運営の承認待ちです。承認されるとポストやメッセージが使えます。"); return false; }
  if (!S.canWrite) { toast("閲覧のみのアカウントのため、この操作はできません。"); return false; }
  if (isBanned(S.me)) { toast("運営により利用が制限されています。"); return false; }
  return true;
}
function followBtn(uid, small = true) {
  const on = (S.follows.get(S.me)?.to || []).includes(uid);
  return h("button", { class: "btn " + (small ? "small " : "") + (on ? "" : "primary"), on: { click: e => { e.stopPropagation(); toggleFollow(uid); } } }, on ? "フォロー中" : "フォロー");
}
function userRow(uid, o = {}) {
  const p = prof(uid);
  return h("div", { class: "urow" + (o.compact ? " compact" : "") },
    h("button", { "aria-label": p.name, on: { click: () => toProfile(uid) } }, avatar(uid, o.compact ? 36 : 44)),
    h("div", { class: "who" },
      h("span", { style: "display:flex;align-items:center;gap:4px;min-width:0" }, h("button", { class: "name", on: { click: () => toProfile(uid) } }, p.name), badge(uid)),
      h("span", { class: "handle" }, "@" + p.handle),
      o.compact ? null : (p.bio ? h("div", { class: "bio" }, p.bio) : null)),
    uid === S.me ? null : (o.action ? o.action(uid) : followBtn(uid)));
}

/* ---------- reconcile (keeps playing videos alive) ---------- */
function reconcile(box, items, { key, sig, build, update }) {
  const old = new Map();
  for (const c of [...box.children]) if (c._k !== undefined) old.set(c._k, c);
  const keep = new Set();
  let i = 0;
  for (const it of items) {
    const k = key(it), s = sig(it);
    let n = old.get(k);
    if (!n || n._s !== s) { n = build(it); n._k = k; n._s = s; }
    if (update) update(n, it);
    keep.add(n);
    const cur = box.children[i];
    if (cur !== n) box.insertBefore(n, cur || null);
    i++;
  }
  for (const c of [...box.children]) if (!keep.has(c)) c.remove();
}

/* ---------- derived data ---------- */
function derive() {
  const posts = [];
  for (const [uid, f] of S.feeds) for (const p of (f.posts || [])) posts.push(Object.assign({}, p, { uid }));
  posts.sort((a, b) => b.at - a.at);
  S.posts = posts;
  S.postById = new Map(posts.map(p => [p.id, p]));
  S.likeCount = new Map();
  for (const l of S.likes.values()) for (const id of (l.p || [])) S.likeCount.set(id, (S.likeCount.get(id) || 0) + 1);
  S.followers = new Map();
  for (const [uid, f] of S.follows) for (const t of (f.to || [])) {
    if (!S.followers.has(t)) S.followers.set(t, new Set());
    S.followers.get(t).add(uid);
  }
  S.replyCount = new Map(); S.quoteCount = new Map(); S.repliesOf = new Map();
  for (const p of posts) {
    if (p.re) { S.replyCount.set(p.re, (S.replyCount.get(p.re) || 0) + 1); if (!S.repliesOf.has(p.re)) S.repliesOf.set(p.re, []); S.repliesOf.get(p.re).push(p); }
    if (p.q) S.quoteCount.set(p.q, (S.quoteCount.get(p.q) || 0) + 1);
  }
  S.tally = new Map();
  for (const v of S.votes.values()) for (const id of Object.keys(v.m || {})) {
    const t = S.tally.get(id) || {}; t[v.m[id]] = (t[v.m[id]] || 0) + 1; S.tally.set(id, t);
  }
  buildNotifs();
}
function buildNotifs() {
  const out = [], me = S.me;
  if (!me) { S.notifs = []; return; }
  const myHandle = ((S.profiles.get(me) || {}).handle || "").toLowerCase();
  for (const p of S.posts) {
    if (p.uid === me) continue;
    const par = p.re && S.postById.get(p.re);
    if (par && par.uid === me) out.push({ type: "reply", from: p.uid, at: p.at, post: p.id });
    const qt = p.q && S.postById.get(p.q);
    if (qt && qt.uid === me) out.push({ type: "quote", from: p.uid, at: p.at, post: p.id });
    if (!(par && par.uid === me) && !(qt && qt.uid === me) && myHandle && String(p.text || "").includes("@") && mentionsIn(p.text).has(myHandle)) out.push({ type: "mention", from: p.uid, at: p.at, post: p.id });
    if (isNotice(p) && p.at > ((S.profiles.get(me) || {}).joined || 0)) out.push({ type: "notice", from: p.uid, at: p.at, post: p.id });
  }
  for (const [uid, l] of S.likes) {
    if (uid === me) continue;
    for (const id of Object.keys(l.t || {})) { const po = S.postById.get(id); if (po && po.uid === me) out.push({ type: "like", from: uid, at: l.t[id], post: id }); }
  }
  for (const [uid, f] of S.follows) {
    if (uid !== me && f.at && f.at[me] && (f.to || []).includes(me)) out.push({ type: "follow", from: uid, at: f.at[me] });
  }
  S.notifs = out.filter(n => !isBlocked(n.from) && (n.type === "notice" || !isMuted(n.from)) && S.profiles.has(n.from)).sort((a, b) => b.at - a.at).slice(0, 100);
}
const unreadNotifs = () => (S.notifs || []).filter(n => n.at > ((S.reads || {}).n || 0)).length;
const visiblePosts = (o = {}) => S.posts.filter(p => {
  if (isBlocked(p.uid)) return false;
  if (!o.profile && isMuted(p.uid) && p.uid !== S.me) return false;
  if (!canAdmin() && isBanned(p.uid)) return false;
  return true;
});
// Secret mode: other people only see posts, display name, icon and bio (admins can see everything).
const isSecret = uid => !!(S.profiles.get(uid) || {}).secret;
const hidesFrom = uid => isSecret(uid) && uid !== S.me && !canAdmin();
const followingCount = uid => (S.follows.get(uid)?.to || []).filter(t => S.profiles.has(t) && !hidesFrom(t)).length;
const followerCount = uid => S.followers.get(uid) ? [...S.followers.get(uid)].filter(t => S.profiles.has(t) && !hidesFrom(t)).length : 0;

/* ---------- presence ---------- */
const PRES_LABEL = { online: "オンライン", busy: "取り込み中", offline: "オフライン" };
// returns "online" | "busy" | "offline", or null when nothing should be shown (secret mode / hidden self)
function presenceOf(uid) {
  if (!S.profiles.has(uid)) return null;
  if (uid === S.me) { const st = S.settings.presence || "online"; return st === "hidden" ? null : st; }
  if (isSecret(uid)) return null;
  return S.presence[uid] || "offline";
}
function applyPresence(root) {
  for (const a of $$(".av[data-uid]", root || document)) {
    const st = presenceOf(a.dataset.uid);
    let d = a.querySelector(":scope > .pdot");
    if (st === "online" || st === "busy") {
      if (!d) { d = document.createElement("i"); a.append(d); }
      d.className = "pdot " + st; d.setAttribute("title", PRES_LABEL[st]);
    } else if (d) d.remove();
  }
}
let beatBusy = false, beatAgain = false;
async function beat() {
  if (!S.booted) return;
  if (beatBusy) { beatAgain = true; return; }
  beatBusy = true;
  try {
    const body = S.me && S.loaded.settings ? { status: S.settings.presence || "online" } : {};
    const r = await fetch("/api/presence", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      const j = await r.json();
      const next = j.list || {};
      if (JSON.stringify(next) !== JSON.stringify(S.presence)) { S.presence = next; schedule(); }
    }
  } catch (e) { /* offline: try again later */ } finally { beatBusy = false; if (beatAgain) { beatAgain = false; beat(); } }
}
setInterval(() => { if (!document.hidden) beat(); }, 25000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) beat(); });
addEventListener("pagehide", () => { try { if (S.me) navigator.sendBeacon("/api/presence", new Blob(['{"status":"off"}'], { type: "application/json" })); } catch (e) { /* ignore */ } });
/* ---------- appearance helpers (colors, frames) ---------- */
const okHex = v => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : "");
function inkFor(hex) { const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0a0f14" : "#ffffff"; }
const FRAMES = [["", "なし"], ["ring", "リング"], ["double", "二重"], ["dashed", "点線"], ["glow", "光る"], ["rainbow", "虹色"]];
const BIO_STYLES = [["", "ふつう"], ["bold", "太字"], ["italic", "斜体"], ["center", "中央ぞろえ"], ["quote", "引用風"], ["card", "カード風"]];
const okFrame = f => FRAMES.some(x => x[0] && x[0] === f) ? f : "";
const okBio = f => BIO_STYLES.some(x => x[0] && x[0] === f) ? f : "";

/* ---------- level / experience / achievements (calculated from public activity, nothing to cheat) ---------- */
function statsOf(uid) {
  const mine = S.posts.filter(p => p.uid === uid && !isNotice(p));
  const st = {
    posts: mine.length, replies: mine.filter(p => p.re).length, media: mine.filter(p => (p.media || []).length).length,
    polls: mine.filter(p => p.poll).length, tags: mine.filter(p => tagsIn(p.text).length).length,
    likesGiven: (S.likes.get(uid)?.p || []).length, likesGot: 0,
    followers: S.followers.get(uid) ? [...S.followers.get(uid)].filter(t => S.profiles.has(t)).length : 0,
    following: (S.follows.get(uid)?.to || []).filter(t => S.profiles.has(t)).length,
    days: Math.max(1, Math.floor((Date.now() - ((S.profiles.get(uid) || {}).joined || Date.now())) / 86400000) + 1),
    staff: S.staff.has(uid), marked: S.verified.has(uid)
  };
  for (const p of mine) st.likesGot += S.likeCount.get(p.id) || 0;
  st.xp = st.posts * 10 + st.likesGot * 3 + st.likesGiven + st.followers * 20 + st.following * 2 + Math.min(st.days, 100) * 2;
  return st;
}
const xpNeed = n => 50 * n * (n - 1);
function levelInfo(xp) {
  const lv = Math.min(99, Math.floor((1 + Math.sqrt(1 + 4 * xp / 50)) / 2));
  const base = xpNeed(lv), next = xpNeed(lv + 1);
  return { lv, xp, base, next, pct: lv >= 99 ? 100 : Math.round((xp - base) / (next - base) * 100) };
}
const ACHIEVEMENTS = [
  ["first_post", "はじめてのポスト", "ポストを1件書く", s => s.posts >= 1],
  ["posts_10", "ポスト10件", "ポストを10件書く", s => s.posts >= 10, s => [s.posts, 10]],
  ["posts_100", "ポスト100件", "ポストを100件書く", s => s.posts >= 100, s => [s.posts, 100]],
  ["first_reply", "はじめての返信", "返信を1件書く", s => s.replies >= 1],
  ["media", "写真・動画デビュー", "画像か動画つきのポストをする", s => s.media >= 1],
  ["poll", "アンケートを作った", "アンケートつきのポストをする", s => s.polls >= 1],
  ["tag", "ハッシュタグを使った", "ハッシュタグつきのポストをする", s => s.tags >= 1],
  ["like_got_1", "はじめていいねをもらった", "いいねを1件もらう", s => s.likesGot >= 1],
  ["like_got_100", "いいね100件獲得", "いいねを合計100件もらう", s => s.likesGot >= 100, s => [s.likesGot, 100]],
  ["like_giver", "いいね上手", "いいねを50回する", s => s.likesGiven >= 50, s => [s.likesGiven, 50]],
  ["follower_1", "はじめてのフォロワー", "フォロワーが1人になる", s => s.followers >= 1],
  ["follower_10", "フォロワー10人", "フォロワーが10人になる", s => s.followers >= 10, s => [s.followers, 10]],
  ["follower_100", "フォロワー100人", "フォロワーが100人になる", s => s.followers >= 100, s => [s.followers, 100]],
  ["days_7", "登録7日", "登録から7日たつ", s => s.days >= 7, s => [s.days, 7]],
  ["days_30", "登録30日", "登録から30日たつ", s => s.days >= 30, s => [s.days, 30]],
  ["days_365", "登録1周年", "登録から365日たつ", s => s.days >= 365, s => [s.days, 365]],
  ["mark", "マーク獲得", "運営からマークをもらう", s => s.marked],
  ["staff", "運営メンバー", "運営メンバーになる", s => s.staff]
];
function achievementsOf(uid) { const st = statsOf(uid); return ACHIEVEMENTS.map(a => ({ id: a[0], title: a[1], desc: a[2], done: !!a[3](st), prog: a[4] ? a[4](st) : null })); }
function levelBox(uid) {
  const st = statsOf(uid), li = levelInfo(st.xp), ach = achievementsOf(uid), got = ach.filter(a => a.done).length;
  return h("div", { class: "levelbox", id: "levelbox" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:center" },
      h("span", { class: "lv-chip", id: "lv-chip" }, "Lv " + li.lv),
      h("button", { class: "btn small", id: "open-ach", on: { click: () => achievementsModal(uid) } }, icon("star", 14), "実績 " + got + " / " + ach.length)),
    h("div", { class: "xpbar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(li.pct), "aria-label": "次のレベルまで" }, h("i", { style: "width:" + li.pct + "%" })),
    h("div", { class: "hint" }, "経験値 " + li.xp + (li.lv >= 99 ? "(最高レベル)" : " / 次のレベルまで あと " + (li.next - li.xp))));
}
function achievementsModal(uid) {
  const list = achievementsOf(uid);
  modal(prof(uid).name + " さんの実績", h("div", { class: "stack", id: "ach-list" }, h("p", { class: "muted-p" }, "ポストやいいね、フォロワー、登録からの日数で、経験値がたまります。実績は、条件を満たすと自動で解除されます。"),
    ...list.map(a => h("div", { class: "achrow" + (a.done ? " done" : ""), "data-id": a.id }, icon(a.done ? "star" : "lock", 20),
      h("div", { style: "min-width:0;flex:1" }, h("b", null, a.title), h("div", { class: "hint" }, a.desc + (!a.done && a.prog ? "(" + Math.min(a.prog[0], a.prog[1]) + " / " + a.prog[1] + ")" : ""))),
      h("span", { class: "pill" + (a.done ? " ok" : "") }, a.done ? "解除済み" : "未解除")))));
}
function presLine(uid) {
  const st = presenceOf(uid);
  return st ? h("span", { class: "pres " + st, id: "pres-line" }, h("i"), PRES_LABEL[st]) : null;
}

/* ---------- media ---------- */
async function mediaFromDb(m) {
  const k = m.u + "/" + m.m;
  if (S.mcache.has(k)) return S.mcache.get(k);
  try {
    const snap = await S.db.doc("media/" + m.u + "/items/" + m.m).get();
    const d = snap.exists ? snap.data().d : null;
    S.mcache.set(k, d);
    return d;
  } catch (e) { return null; }
}
const ASSET_ID = /^[0-9a-f]{32}$/;
function mediaEl(m) {
  if ((m.t === "img" || m.t === "vid") && !ASSET_ID.test(String(m.a))) return h("div", { class: "pm gone" }, "表示できません");
  if (m.t === "img") return h("img", { class: "pm", loading: "lazy", alt: "添付画像", src: "/_blob/" + m.a });
  if (m.t === "vid") return h("video", { class: "pm", controls: true, preload: "metadata", playsInline: true, src: "/_blob/" + m.a });
  const img = h("img", { class: "pm", alt: "添付画像" });
  mediaFromDb(m).then(u => { if (u) img.src = u; else img.replaceWith(h("div", { class: "pm gone" }, "画像を表示できません")); });
  return img;
}
async function cleanupMedia(p) {
  for (const m of (p.media || [])) {
    try {
      if (m.t === "idb") await S.db.doc("media/" + m.u + "/items/" + m.m).delete();
      else if (S.assets) await S.assets.delete(m.a);
    } catch (e) { /* best effort */ }
  }
}

/* ---------- post node ---------- */
function postSig(p) {
  const a = prof(p.uid);
  const q = p.q ? S.postById.get(p.q) : null;
  const qa = q ? prof(q.uid) : null;
  const pv = p.poll ? JSON.stringify([S.tally.get(p.id) || {}, (S.votes.get(S.me) || {}).m?.[p.id] ?? -1, p.poll.end && Date.now() > p.poll.end, S.guest]) : "";
  return [p.id, p.text, JSON.stringify(p.media || []), a.name, a.handle, a.hue, (a.img || "").length, a.frame || "", a.accent || "", a.pin === p.id, p.ed || 0, S.guest, p.uid === S.me, (p.text || "").includes("@") ? S.profiles.size : "", canDelete(p), canAdmin() && isBanned(p.uid), badgeKind(p.uid), S.picks.has(p.id), canAdmin(),
    p.re || "", p.kind || "", S.replyCount.get(p.id) || 0, S.quoteCount.get(p.id) || 0, p.q || "", q ? q.text + (qa ? qa.name : "") + isBlocked(q.uid) : "-", pv].join("|");
}
const canDelete = p => p.uid === S.me || canAdmin();
const openPost = id => go({ v: "post", id });
function quoteBox(qid) {
  const q = S.postById.get(qid);
  if (!q || isBlocked(q.uid)) return h("div", { class: "qbox gone" }, "引用元のポストは見られません。");
  const a = prof(q.uid);
  const box = h("div", { class: "qbox", role: "link", tabIndex: 0, on: { click: e => { e.stopPropagation(); openPost(qid); }, keydown: e => { if (e.key === "Enter") openPost(qid); } } },
    h("div", { class: "meta" }, h("span", { class: "name" }, a.name), badge(q.uid), h("span", { class: "handle" }, "@" + a.handle)),
    h("p", { class: "ptext" }, (q.text || "(画像・動画)").slice(0, 140) + ((q.text || "").length > 140 ? "…" : "")));
  return box;
}
function pollBox(p) {
  const poll = p.poll, tally = S.tally.get(p.id) || {};
  const mine = (S.votes.get(S.me) || {}).m?.[p.id];
  const ended = poll.end && Date.now() > poll.end;
  const total = poll.opts.reduce((s, _, i) => s + (tally[i] || 0), 0);
  const showResult = ended || mine != null || S.guest;
  const box = h("div", { class: "poll" });
  poll.opts.forEach((o, i) => {
    const n = tally[i] || 0, pct = total ? Math.round(n / total * 100) : 0;
    if (showResult) box.append(h("div", { class: "popt res" + (mine === i ? " mine" : "") },
      h("div", { class: "pfill", style: "width:" + pct + "%" }),
      h("span", { class: "plabel" }, o, mine === i ? " ✓" : ""), h("span", { class: "ppct" }, pct + "%")));
    else box.append(h("button", { class: "popt", on: { click: e => { e.stopPropagation(); votePoll(p, i); } } }, h("span", { class: "plabel" }, o)));
  });
  box.append(h("div", { class: "pfoot" }, total + "票 · " + (ended ? "終了" : poll.end ? "あと" + remain(poll.end) : "期限なし")));
  return box;
}
function remain(end) {
  const m = Math.max(0, Math.round((end - Date.now()) / 60000));
  if (m < 60) return m + "分";
  if (m < 1440) return Math.round(m / 60) + "時間";
  return Math.round(m / 1440) + "日";
}
function postNode(p) {
  const a = prof(p.uid);
  const n = h("article", { class: "post" + (isNotice(p) ? " notice" : "") });
  n._p = p;
  n.addEventListener("click", e => { if (e.target.closest("button,a,video,input,textarea,.qbox")) return; openPost(n._p.id); });
  const meta = h("div", { class: "meta" },
    h("button", { class: "name", on: { click: () => toProfile(n._p.uid) } }, a.name),
    badge(p.uid),
    h("span", { class: "handle" }, "@" + a.handle),
    isNotice(p) ? h("span", { class: "tag-notice" }, "お知らせ") : null,
    canAdmin() && isBanned(p.uid) ? h("span", { class: "tag-ban" }, "停止中") : null,
    S.picks.has(p.id) ? h("span", { class: "tag-pick" }, "おすすめ") : null,
    a.pin === p.id ? h("span", { class: "tag-pinned" }, "ピン留め") : null,
    h("span", { class: "dot", "aria-hidden": "true" }, "·"),
    h("time", { class: "time", "data-at": p.at, title: fullDate(p.at) }, rel(p.at)),
    p.ed ? h("span", { class: "edited", title: fullDate(p.ed) }, "(編集済み)") : null);
  const body = h("div", { style: "min-width:0" }, meta);
  if (p.re) { const par = S.postById.get(p.re); body.append(h("div", { class: "replyto" }, par ? "@" + prof(par.uid).handle + " への返信" : "返信")); }
  if (p.text) { const t = h("p", { class: "ptext" }); t.append(richText(p.text)); body.append(t); }
  const media = p.media || [];
  if (media.length) body.append(h("div", { class: "pmedia m" + Math.min(media.length, 4) }, media.map(mediaEl)));
  if (p.q) body.append(quoteBox(p.q));
  if (p.poll && Array.isArray(p.poll.opts)) body.append(pollBox(p));
  n._like = h("button", { class: "act like", "aria-label": "いいね", on: { click: () => toggleLike(n._p) } }, icon("heart", 18), h("span"));
  const rc = S.replyCount.get(p.id) || 0, qc = S.quoteCount.get(p.id) || 0;
  const acts = h("div", { class: "pactions" },
    h("button", { class: "act", "aria-label": "返信", on: { click: () => openCompose({ re: n._p.id }) } }, icon("reply", 18), h("span", null, rc ? String(rc) : "")),
    h("button", { class: "act", "aria-label": "引用", on: { click: () => openCompose({ q: n._p.id }) } }, icon("quote", 18), h("span", null, qc ? String(qc) : "")),
    n._like);
  if (canAdmin()) acts.append(h("button", { class: "act pick" + (S.picks.has(p.id) ? " picked" : ""), "aria-label": S.picks.has(p.id) ? "おすすめから外す" : "おすすめに追加", "aria-pressed": S.picks.has(p.id) ? "true" : "false", on: { click: () => togglePick(n._p) } }, icon("star", 18)));
  if (p.uid === S.me && !S.guest) {
    acts.append(h("button", { class: "act", "aria-label": "編集", on: { click: () => editPost(n._p) } }, icon("edit", 18)));
    const pinned = a.pin === p.id;
    acts.append(h("button", { class: "act pin" + (pinned ? " picked" : ""), "aria-label": pinned ? "ピン留めを外す" : "プロフィールにピン留め", "aria-pressed": String(pinned), on: { click: () => togglePin(n._p) } }, icon("pin", 18)));
  } else if (!S.guest && p.uid !== S.me) acts.append(h("button", { class: "act report", "aria-label": "通報", on: { click: () => reportModal({ k: "post", t: n._p.id, tu: n._p.uid, s: n._p.text || "" }) } }, icon("flag", 18)));
  if (canDelete(p)) acts.append(h("button", { class: "act del", "aria-label": "削除", on: { click: () => deletePost(n._p) } }, icon("trash", 18)));
  body.append(acts);
  n.append(h("button", { "aria-label": a.name, on: { click: () => toProfile(n._p.uid) } }, avatar(p.uid, 40)), body);
  return n;
}
function postUpdate(n, p) {
  n._p = p;
  const liked = (S.likes.get(S.me)?.p || []).includes(p.id);
  const c = S.likeCount.get(p.id) || 0;
  n._like.classList.toggle("liked", liked);
  n._like.setAttribute("aria-pressed", liked ? "true" : "false");
  n._like.lastChild.textContent = c ? String(c) : "";
}
const postOpts = { key: p => p.id, sig: postSig, build: postNode, update: postUpdate };

/* ---------- writes ---------- */
async function toggleLike(p) {
  if (!guard()) return;
  const old = S.likes.get(S.me) || {};
  const cur = new Set(old.p || []), t = Object.assign({}, old.t || {});
  if (cur.has(p.id)) { cur.delete(p.id); delete t[p.id]; } else { cur.add(p.id); t[p.id] = Date.now(); }
  const keep = [...cur].slice(-3000), ks = new Set(keep);
  for (const k of Object.keys(t)) if (!ks.has(k)) delete t[k];
  try { await S.db.doc("likes/" + S.me).set({ p: keep, t }); } catch (e) { fail(e); }
}
async function votePoll(p, idx) {
  if (!guard()) return;
  const old = S.votes.get(S.me) || {};
  const m = Object.assign({}, old.m || {});
  if (m[p.id] != null) return;
  m[p.id] = idx;
  const ids = Object.keys(m);
  if (ids.length > 400) delete m[ids[0]];
  try { await S.db.doc("votes/" + S.me).set({ m }); } catch (e) { fail(e); }
}
async function savePrefs(next) {
  if (S.guest) return;
  S.prefs = next; schedule();
  try { await S.db.doc("data/users/" + S.me + "/prefs").set(next); } catch (e) { fail(e); }
}
function toggleMute(uid) {
  const mute = new Set(S.prefs.mute || []);
  if (mute.has(uid)) mute.delete(uid); else mute.add(uid);
  savePrefs({ mute: [...mute], block: S.prefs.block || [] });
  toast(mute.has(uid) ? "ミュートしました。この人のポストは表示されません。" : "ミュートを解除しました。");
}
async function toggleBlock(uid) {
  const block = new Set(S.prefs.block || []);
  if (!block.has(uid)) {
    const r = await confirmBox("@" + prof(uid).handle + " をブロックします。この人のポストと通知が表示されなくなり、フォローも外れます。相手には通知されません。", { ok: "ブロックする", danger: true });
    if (!r) return;
    block.add(uid);
    if ((S.follows.get(S.me)?.to || []).includes(uid)) {
      const f = S.follows.get(S.me) || {};
      const at = Object.assign({}, f.at || {}); delete at[uid];
      try { await S.db.doc("follows/" + S.me).set({ to: (f.to || []).filter(x => x !== uid), at }); } catch (e) { console.warn(e); }
    }
  } else block.delete(uid);
  savePrefs({ mute: S.prefs.mute || [], block: [...block] });
  toast(block.has(uid) ? "ブロックしました。" : "ブロックを解除しました。");
}
function prefsModal() {
  const body = h("div", { class: "stack" });
  const draw = () => {
    const sec = (title, ids, fn, label) => h("div", null, h("div", { class: "section-title", style: "padding-inline:0" }, title),
      ids.length ? ids.map(u => userRow(u, { compact: true, action: x => h("button", { class: "btn small", on: { click: () => { fn(x); setTimeout(draw, 250); } } }, label) })) : h("p", { class: "muted-p" }, "いません。"));
    body.replaceChildren(
      h("p", { class: "muted-p" }, "ミュートとブロックはあなただけの設定です。相手には分かりません。"),
      sec("ミュート中", S.prefs.mute || [], toggleMute, "解除"),
      sec("ブロック中", S.prefs.block || [], toggleBlock, "解除"));
  };
  draw();
  modal("ミュートとブロック", body);
}
async function approveUser(u, on) {
  if (!canAdmin()) return;
  try {
    if (on) await S.db.doc("approved/" + u).set({ at: Date.now(), by: S.me });
    else await S.db.doc("approved/" + u).delete();
    await logAdmin(on ? "登録を承認" : "承認を取り消し", "@" + prof(u).handle, "");
    toast(on ? "承認しました。" : "承認を取り消しました。");
  } catch (e) { fail(e); }
}
async function togglePick(p) {
  if (!canAdmin()) return;
  const on = S.picks.has(p.id);
  try {
    if (on) await S.db.doc("picks/" + p.id).delete();
    else await S.db.doc("picks/" + p.id).set({ at: Date.now(), by: S.me, uid: p.uid });
    await logAdmin(on ? "おすすめを解除" : "おすすめに追加", "@" + prof(p.uid).handle, "「" + (p.text || "(画像・動画)").slice(0, 40) + "」");
    toast(on ? "おすすめから外しました。" : "おすすめに追加しました。");
  } catch (e) { fail(e); }
}
async function setMarks(u, list) {
  if (!canAdmin()) return;
  const m = ["v", "y", "t"].filter(k => list.includes(k));
  try {
    if (!m.length) await S.db.doc("verified/" + u).delete();
    else await S.db.doc("verified/" + u).set({ at: Date.now(), by: S.me, m });
    await logAdmin("マークを変更", "@" + prof(u).handle, m.map(k => MARKS[k].label.split("(")[0]).join("・") || "なし");
    toast("マークを更新しました。");
  } catch (e) { fail(e); }
}
function marksModal(u) {
  if (!canAdmin()) return;
  const cur = new Set((marksOf(u)).filter(k => k !== "s"));
  const boxes = {};
  const rows = ["v", "y", "t"].map(k => {
    const cb = h("input", { type: "checkbox", id: "mk-" + k, checked: cur.has(k) });
    boxes[k] = cb;
    const ic = h("span", { class: "vbadge" }); ic.innerHTML = MARKS[k].svg;
    return h("label", { class: "switch-row", for: "mk-" + k }, h("span", { style: "display:flex;align-items:center;gap:8px" }, ic, MARKS[k].label), cb);
  });
  const body = h("div", { class: "stack" },
    h("p", { class: "muted-p" }, prof(u).name + " さんに付けるマークを選んでください(複数OK)。" + (S.staff.has(u) ? "運営マークは運営に自動で付きます。" : "運営マークは「運営」に追加された人に自動で付きます。")),
    ...rows,
    h("div", { class: "row end" }, h("button", { class: "btn", on: { click: () => close() } }, "キャンセル"),
      h("button", { class: "btn primary", id: "mk-save", on: { click: async () => { await setMarks(u, ["v", "y", "t"].filter(k => boxes[k].checked)); close(); } } }, "保存")));
  const close = modal("マークを付ける", body);
}
async function toggleFollow(uid) {
  if (!guard() || uid === S.me) return;
  if (isBlocked(uid)) { toast("ブロック中の相手はフォローできません。"); return; }
  const old = S.follows.get(S.me) || {};
  const cur = new Set(old.to || []), at = Object.assign({}, old.at || {});
  if (cur.has(uid)) { cur.delete(uid); delete at[uid]; } else { cur.add(uid); at[uid] = Date.now(); }
  try { await S.db.doc("follows/" + S.me).set({ to: [...cur], at }); } catch (e) { fail(e); }
}
async function deletePost(p) {
  const who = p.uid === S.me ? "このポスト" : "@" + prof(p.uid).handle + " のポスト";
  const r = await confirmBox(who + "を削除します。元に戻せません。", { ok: "削除する", danger: true, reason: p.uid !== S.me });
  if (!r) return;
  try {
    const cur = S.feeds.get(p.uid)?.posts || [];
    await S.db.doc("feed/" + p.uid).set({ posts: cur.filter(x => x.id !== p.id) });
    cleanupMedia(p);
    if (p.uid !== S.me) await logAdmin("ポスト削除", "@" + prof(p.uid).handle, (r.reason ? r.reason + " / " : "") + "「" + (p.text || "(画像・動画)").slice(0, 40) + "」");
    toast("削除しました。");
  } catch (e) { fail(e); }
}
async function editPost(p) {
  if (!guard() || p.uid !== S.me) return;
  let busy = false, close;
  const ta = h("textarea", { id: "ed-text", rows: 5, maxLength: cfg().maxLen });
  ta.value = p.text || "";
  const count = h("span", { class: "counter" });
  const btn = h("button", { class: "btn primary", id: "ed-save" }, "保存");
  const needs = !((p.media || []).length || p.poll || p.q);
  const upd = () => { count.textContent = String(cfg().maxLen - ta.value.length); btn.disabled = busy || (needs && !ta.value.trim()); };
  ta.addEventListener("input", upd); upd();
  btn.addEventListener("click", async () => {
    busy = true; upd();
    try {
      const cur = S.feeds.get(S.me)?.posts || [];
      const text = ta.value.trim();
      if (text === (p.text || "")) { close(); return; }
      await S.db.doc("feed/" + S.me).set({ posts: cur.map(x => x.id === p.id ? Object.assign({}, x, { text, ed: Date.now() }) : x) });
      close(); toast("編集しました。");
    } catch (e) { fail(e); busy = false; upd(); }
  });
  close = modal("ポストを編集", h("div", { class: "stack" }, ta, h("div", { class: "row end" }, count, btn)));
  setTimeout(() => ta.focus(), 30);
}
async function togglePin(p) {
  if (!guard() || p.uid !== S.me) return;
  const on = prof(S.me).pin === p.id;
  try { await S.db.doc("profiles/" + S.me).update({ pin: on ? "" : p.id }); toast(on ? "ピン留めを外しました。" : "プロフィールの一番上にピン留めしました。"); } catch (e) { fail(e); }
}
const REPORT_REASONS = ["スパム・宣伝", "嫌がらせ・攻撃的", "不適切な内容", "なりすまし", "その他"];
function reportModal(t) {
  if (!guard()) return;
  const sel = h("select", { id: "rp-reason" }, REPORT_REASONS.map(r => h("option", { value: r }, r)));
  const note = h("textarea", { id: "rp-note", rows: 3, maxLength: 150, placeholder: "くわしい内容(任意)" });
  let busy = false;
  const btn = h("button", { class: "btn primary", id: "rp-send" }, "通報する");
  btn.addEventListener("click", async () => {
    if (busy) return; busy = true; btn.disabled = true;
    const item = { k: t.k, t: t.t, tu: t.tu, s: String(t.s || "").slice(0, 80), r: sel.value, n: note.value.trim().slice(0, 150), at: Date.now() };
    const key = "r_" + t.k + "_" + t.t;
    try {
      const ref = S.db.doc("reports/" + S.me);
      try { await ref.update({ [key]: item }); } catch (e) { await ref.set({ [key]: item }); }
      close(); toast("通報しました。運営が確認します。");
    } catch (e) { fail(e); busy = false; btn.disabled = false; }
  });
  const label = t.k === "post" ? "このポスト" : "@" + prof(t.tu).handle;
  const close = modal("通報", h("div", { class: "stack" }, h("p", { class: "muted-p" }, label + "を運営に通報します。通報した人の名前は相手には伝わりません。"),
    h("div", { class: "field" }, h("label", { for: "rp-reason" }, "理由"), sel), h("div", { class: "field" }, h("label", { for: "rp-note" }, "補足"), note),
    h("div", { class: "row end" }, h("button", { class: "btn", on: { click: () => close() } }, "キャンセル"), btn)));
}
function reportGroups() {
  const g = new Map();
  for (const [by, d] of S.reports) for (const k of Object.keys(d || {})) {
    const it = d[k]; if (!k.startsWith("r_") || !it || !it.t) continue;
    const key = it.k + "_" + it.t;
    if (!g.has(key)) g.set(key, { key, k: it.k, t: it.t, tu: it.tu, s: it.s, list: [], last: 0 });
    const e = g.get(key); e.list.push({ by, r: it.r, n: it.n, at: it.at }); e.last = Math.max(e.last, it.at || 0);
    if (it.s && !e.s) e.s = it.s;
  }
  const out = [...g.values()].map(e => { const dn = (S.reportDone || {})[e.key]; e.done = dn && dn.at >= e.last ? dn : null; return e; });
  return out.sort((a, b) => b.last - a.last);
}
const openReports = () => reportGroups().filter(e => !e.done).length;
async function logAdmin(act, target, detail) {
  if (!S.isAdmin) return;
  const entry = { at: Date.now(), by: S.me, act, target: target || "", detail: detail || "" };
  try { await S.db.doc("admin/audit").set({ items: [entry, ...S.audit].slice(0, 300) }); } catch (e) { console.warn(e); }
}

/* ---------- keys ---------- */
let keyP = null;
function ensureKeys() {
  if (!S.cryptoOK) return Promise.resolve(null);
  if (!keyP) keyP = loadKeys().catch(e => { keyP = null; throw e; });
  return keyP;
}
async function loadKeys() {
  if (S.priv) return S.pubJwk;
  const ref = S.db.doc("data/users/" + S.me + "/keys");
  const snap = await ref.get();
  let pair;
  if (snap.exists && snap.data().priv && snap.data().pub) pair = snap.data();
  else { pair = await makePair(); await ref.set({ priv: pair.priv, pub: pair.pub }); }
  S.priv = await importPriv(pair.priv);
  S.pubJwk = pair.pub;
  return S.pubJwk;
}
async function syncKeyToProfile() {
  if (S.keySynced || !S.cryptoOK || !S.canWrite) return;
  S.keySynced = true;
  try {
    const pub = await ensureKeys();
    const mine = S.profiles.get(S.me);
    if (pub && mine && (!mine.pub || mine.pub.x !== pub.x || mine.pub.y !== pub.y)) await S.db.doc("profiles/" + S.me).update({ pub });
  } catch (e) { console.warn(e); S.keySynced = false; }
}
async function sharedWith(uid) {
  await ensureKeys();
  const p = prof(uid);
  if (!p.pub) throw new Error("このユーザーはまだメッセージを受け取れません。");
  const ck = uid + ":" + p.pub.x;
  if (!S.dkeys.has(ck)) S.dkeys.set(ck, await deriveShared(S.priv, p.pub));
  return S.dkeys.get(ck);
}
async function groupKeyOf(gid) {
  const g = S.groups.get(gid);
  const w = g && g.keys && g.keys[S.me];
  if (!w) throw new Error("グループの鍵がありません。");
  const ck = gid + ":" + w.iv;
  if (!S.gkeys.has(ck)) {
    const sh = await sharedWith(w.from);
    const { k } = await open(sh, w);
    S.gkeys.set(ck, { raw: k, key: await importGroupKey(k) });
  }
  return S.gkeys.get(ck);
}
async function wrapFor(uid, rawB64) {
  const sh = await sharedWith(uid);
  const s = await seal(sh, { k: rawB64 });
  return { from: S.me, iv: s.iv, ct: s.ct };
}
async function threadKey(t) {
  if (t.type === "dm") return sharedWith(t.peer);
  return (await groupKeyOf(t.gid)).key;
}

/* ---------- messaging data ---------- */
function threadPath(t) { return t.type === "dm" ? "dm/" + convId(S.me, t.peer) + "/msgs" : "groups/" + t.gid + "/msgs"; }
function closeMsgSub() { if (S.msgUn) { S.msgUn(); S.msgUn = null; } S.msgTok++; }
function openMsgSub(t) {
  closeMsgSub();
  const tok = S.msgTok;
  S.msgs = []; S.msgErr = null;
  S.msgUn = S.db.collection(threadPath(t)).orderBy("at", "desc").limit(150).onSnapshot(async snap => {
    let key;
    try { key = await threadKey(t); }
    catch (e) { if (tok !== S.msgTok) return; S.msgs = []; S.msgErr = e.message || "鍵を準備できませんでした。"; V.msgs.update(); return; }
    const out = [];
    for (const d of snap.docs) {
      let m = S.dcache.get(d.id);
      const v = d.data();
      if (!m) {
        try { const pl = await open(key, v); m = { id: d.id, at: v.at, from: pl.from, text: pl.t, img: /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(pl.img || "") ? pl.img : null }; S.dcache.set(d.id, m); }
        catch (e) { m = { id: d.id, at: v.at, err: true }; }
      }
      out.push(m);
    }
    if (tok !== S.msgTok) return;
    out.sort((a, b) => a.at - b.at);
    S.msgs = out; S.msgErr = null;
    V.msgs.update();
  }, err => { console.warn(err); if (tok === S.msgTok) { S.msgErr = "メッセージを読み込めませんでした。"; V.msgs.update(); } });
}
async function sendMsg(text, img) {
  const t = S.thread;
  const key = await threadKey(t);
  const at = Date.now();
  const payload = { from: S.me, t: text };
  if (img) payload.img = img;
  const box = await seal(key, payload);
  await S.db.collection(threadPath(t)).add({ at, iv: box.iv, ct: box.ct });
  if (t.type === "dm") {
    const cd = S.dms.get(convId(S.me, t.peer)) || {};
    await S.db.doc("dm/" + convId(S.me, t.peer)).set({ members: [S.me, t.peer], last: at, lastFrom: S.me, seen: Object.assign({}, cd.seen || {}, { [S.me]: at }) });
  } else await S.db.doc("groups/" + t.gid).update({ last: at, lastFrom: S.me, seen: { [S.me]: at } });
  if (S.msgs.length > 140) {
    const old = S.msgs.slice(0, 30);
    Promise.all(old.map(m => S.db.doc(threadPath(t) + "/" + m.id).delete())).catch(() => {});
  }
}
async function createGroup(name, ids) {
  const members = [S.me, ...ids];
  const raw = b64(crypto.getRandomValues(new Uint8Array(32)));
  const keys = {};
  for (const uid of members) keys[uid] = await wrapFor(uid, raw);
  const gid = "g" + rid();
  const now = Date.now();
  await S.db.doc("groups/" + gid).set({ name, members, owner: S.me, keys, created: now, last: now, lastFrom: null });
  return gid;
}
async function addMembers(gid, ids) {
  const g = S.groups.get(gid);
  const { raw } = await groupKeyOf(gid);
  const keys = {};
  for (const uid of ids) keys[uid] = await wrapFor(uid, raw);
  await S.db.doc("groups/" + gid).update({ members: [...g.members, ...ids], keys });
}
async function leaveGroup(gid) {
  const g = S.groups.get(gid);
  const rest = g.members.filter(m => m !== S.me);
  if (rest.length) await S.db.doc("groups/" + gid).update({ members: rest });
  else await S.db.doc("groups/" + gid).delete();
}
function convList() {
  const list = [];
  for (const [id, d] of S.dms) {
    const peer = (d.members || []).find(x => x !== S.me);
    if (peer) list.push({ type: "dm", id, peer, last: d.last || 0, lastFrom: d.lastFrom });
  }
  for (const [id, g] of S.groups) list.push({ type: "group", id, gid: id, name: g.name, count: (g.members || []).length, last: g.last || g.created || 0, lastFrom: g.lastFrom });
  return list.sort((a, b) => b.last - a.last);
}
const isUnread = c => c.last > (S.reads[c.id] || 0) && c.lastFrom && c.lastFrom !== S.me;
const unreadCount = () => convList().filter(isUnread).length;
async function prepDmImage(f) {
  if (!f.type.startsWith("image/")) throw new Error("画像を選んでください。");
  const bmp = await loadBitmap(f);
  for (const dim of [900, 700, 520, 400]) for (const q of [0.72, 0.56, 0.42]) {
    const url = drawTo(bmp, dim).toDataURL("image/jpeg", q);
    if (url.length <= 150000) return url;
  }
  throw new Error("画像が大きすぎて送れませんでした。");
}
let seenWriting = false;
async function markSeen(t) {
  const last = S.msgs.length ? S.msgs[S.msgs.length - 1] : null;
  if (!last || last.from === S.me || seenWriting || S.guest || !S.canWrite || isBanned(S.me) || needsApproval()) return;
  const doc = t.type === "dm" ? S.dms.get(convId(S.me, t.peer)) : S.groups.get(t.gid);
  if (!doc || ((doc.seen || {})[S.me] || 0) >= last.at) return;
  seenWriting = true;
  try { await S.db.doc((t.type === "dm" ? "dm/" + convId(S.me, t.peer) : "groups/" + t.gid)).update({ seen: { [S.me]: Date.now() } }); }
  catch (e) { console.warn(e); }
  finally { seenWriting = false; }
}
let readWriting = false;
async function markRead(c) {
  if (!c || readWriting || !isUnread(c) || !S.canWrite) return;
  readWriting = true;
  try { await S.db.doc("data/users/" + S.me + "/reads").set(Object.assign({}, S.reads, { [c.id]: c.last })); }
  catch (e) { console.warn(e); }
  finally { readWriting = false; }
}

/* ---------- chrome ---------- */
function go(route) {
  const prev = V[S.route.v];
  if (prev && prev.leave) prev.leave();
  S.route = route;
  const v = V[route.v];
  if (S.guest && !["home", "search", "post", "profile"].includes(route.v)) { S.route = { v: "home" }; return go(S.route); }
  if (route.v === "admin" && !canAdmin()) { S.route = { v: "home" }; return go(S.route); }
  $("#viewhost").replaceChildren(v.el);
  if (v.enter) v.enter(route);
  document.body.dataset.view = route.v;
  document.body.classList.toggle("in-thread", route.v === "msgs" && !!route.t);
  renderChrome();
  if (v.update) v.update();
  window.scrollTo(0, 0);
}
function renderChrome() {
  if (!S.guest && !S.profiles.get(S.me)) return;
  const items = S.guest ? [["home", "ホーム", "home"], ["search", "さがす", "search"]]
    : [["home", "ホーム", "home"], ["search", "さがす", "search"], ["notifs", "通知", "bell"], ["msgs", "メッセージ", "chat"], ["profile", "プロフィール", "user"]];
  if (canAdmin()) items.push(["admin", "運営", "shield"]);
  const unread = unreadCount(), unreadN = unreadNotifs();
  const mk = () => items.map(([v, label, ic]) => {
    const cur = S.route.v === v && !(v === "profile" && S.route.id && S.route.id !== S.me);
    return h("button", { class: "nav-item", "aria-current": cur ? "page" : null, "aria-label": label, on: { click: () => go(v === "profile" ? { v, id: S.me } : { v }) } },
      icon(ic, 22), h("span", { class: "nav-label" }, label),
      (() => { const c = v === "msgs" ? unread : v === "notifs" ? unreadN : 0; return c ? h("span", { class: "badge" }, c > 9 ? "9+" : String(c)) : null; })());
  });
  const me = prof(S.me);
  $("#rail").replaceChildren(
    h("div", { class: "brand-wrap" }, (() => { const b = brand(); b.style.padding = "6px 10px 18px"; return b; })()),
    ...mk(),
    h("button", { class: "btn primary rail-post nav-item", style: "background:var(--accent);color:var(--accent-ink);justify-content:center", on: { click: () => { if (S.guest) { startRegister(); return; } go({ v: "home" }); const t = $("#c-text"); if (t) t.focus(); } } }, icon("edit", 20), h("span", { class: "nav-label" }, S.guest ? "登録して参加" : "ポストする")),
    h("div", { class: "rail-spacer" }),
    S.guest ? null : h("button", { class: "me-chip", on: { click: () => toProfile(S.me) } }, avatar(S.me, 36),
      h("span", { class: "who" }, h("span", { class: "name", style: "display:flex;align-items:center;gap:4px" }, me.name, badge(S.me)), h("span", { class: "handle" }, "@" + me.handle))));
  $("#tabbar").replaceChildren(...mk());
  $("#tabbar").hidden = false;

  const bs = [];
  const a = cfg().announce;
  if (a && a.text) bs.push(h("div", { class: "banner" + (a.tone === "warn" ? " warn" : "") }, icon("megaphone", 18), h("p", null, a.text)));
  if (S.guest) bs.push(h("div", { class: "banner" }, icon("lock", 18), h("p", null, "ゲストとして見ています。ポスト・いいね・メッセージは、登録すると使えます。"), h("button", { class: "btn small primary", id: "guest-reg", style: "margin-left:auto", on: { click: () => startRegister() } }, "登録して参加")));
  if (needsApproval()) bs.push(h("div", { class: "banner warn" }, icon("lock", 18), h("p", null, "運営の承認待ちです。承認されるまでは、見ることだけができます。")));
  if (cfg().maintenance && cfg().maintenance.on) bs.push(h("div", { class: "banner warn", id: "maint-banner" }, icon("lock", 18), h("p", null, "メンテナンスモード中です。運営以外の人には、案内の画面が表示されています。")));
  const ban = S.bans.get(S.me);
  if (ban) bs.push(h("div", { class: "banner warn" }, icon("ban", 18), h("p", null, "このアカウントは運営により利用が制限されています。" + (ban.reason ? "\n理由: " + ban.reason : ""))));
  if (!S.canWrite) bs.push(h("div", { class: "banner" }, icon("lock", 18), h("p", null, "ゲストとして見ています。ポストやメッセージを送るには、ログインか新規登録が必要です。")));
  $("#banners").replaceChildren(...bs);
}
function renderAside() {
  const sug = suggestions(4);
  $("#aside").replaceChildren(h("div", { class: "panel" },
    h("h2", { class: "panel-title" }, "おすすめのユーザー"),
    sug.length ? sug.map(uid => userRow(uid, { compact: true })) : h("p", { class: "muted-p" }, "紹介できるユーザーはまだいません。"),
    h("div", { style: "padding:8px 16px 12px" }, h("button", { class: "btn small", id: "aside-rank", on: { click: () => go({ v: "search", rank: true }) } }, icon("poll", 16), "ランキングを見る")),
    siteLink() ? h("div", { class: "sitelink-wrap" }, siteLink()) : null));
}
function suggestions(n) {
  const mine = new Set(S.follows.get(S.me)?.to || []);
  return [...S.profiles.keys()].filter(u => u !== S.me && !mine.has(u) && (canAdmin() || !isBanned(u)))
    .sort((a, b) => followerCount(b) - followerCount(a) || (prof(b).joined || 0) - (prof(a).joined || 0)).slice(0, n);
}
function viewHead(title, { back = false, sub = null, extra = null } = {}) {
  return h("header", { class: "view-head" },
    back ? h("button", { class: "icon-btn", "aria-label": "戻る", on: { click: back } }, icon("back")) : null,
    h("h1", null, title, sub ? h("span", { class: "sub" }, sub) : null), extra);
}
function emptyBox(title, text) { return h("div", { class: "empty" }, h("strong", null, title), h("p", null, text)); }

/* ---------- views: home ---------- */
const HOME_TABS = [["all", "みんな"], ["following", "フォロー中"], ["picks", "おすすめ"], ["popular", "人気"], ["notice", "お知らせ"]];
const HOME_CAPTION = { picks: "運営が選んだ、読んでほしいポストです。", popular: "いいねが多く集まっているポストです。", notice: "運営からのお知らせです。" };
const HOME_EMPTY = {
  all: ["まだポストがありません", "最初のひとことを書いてみましょう。"],
  following: ["フォロー中のポストがここに並びます", "「さがす」から気になる人をフォローしてみましょう。"],
  picks: ["おすすめのポストはまだありません", "運営が選んだポストがここに並びます。"],
  popular: ["人気のポストはまだありません", "いいねが集まったポストがここに並びます。"],
  notice: ["お知らせはまだありません", "運営からのお知らせがここに並びます。"]
};
V.home = {
  el: h("section"), tab: "all", limit: 40,
  init() {
    const cfgLen = () => cfg().maxLen;
    this.ta = h("textarea", { id: "c-text", rows: 3, placeholder: "いま、どうしてる?", "aria-label": "ポストの本文", on: { input: () => this.syncComposer() } });
    this.thumbs = h("div", { class: "thumbs", hidden: true });
    this.count = h("span", { class: "counter" });
    this.postBtn = h("button", { class: "btn primary small", id: "c-post", on: { click: () => this.submit() } }, "ポストする");
    this.fImg = h("input", { type: "file", id: "c-img", accept: "image/*", multiple: true, hidden: true, on: { change: () => { attach(this.fImg.files); this.fImg.value = ""; } } });
    this.fVid = h("input", { type: "file", id: "c-vid", accept: "video/mp4,video/webm", hidden: true, on: { change: () => { attach(this.fVid.files); this.fVid.value = ""; } } });
    this.pollOpts = [1, 2, 3, 4].map(i => h("input", { class: "pollopt", maxLength: 40, placeholder: "選択肢" + i + (i <= 2 ? "" : "(任意)"), "aria-label": "選択肢" + i }));
    this.pollDur = h("select", { "aria-label": "投票の期間" }, h("option", { value: "86400000" }, "1日"), h("option", { value: "259200000" }, "3日"), h("option", { value: "604800000", selected: true }, "7日"), h("option", { value: "0" }, "期限なし"));
    this.pollForm = h("div", { class: "pollform", hidden: true }, ...this.pollOpts, h("div", { class: "row" }, h("span", { class: "handle" }, "期間"), this.pollDur, h("button", { class: "btn small", on: { click: () => this.togglePoll(false) } }, "アンケートをやめる")));
    this.pollBtn = h("button", { class: "icon-btn", id: "c-poll", "aria-label": "アンケートを付ける", on: { click: () => this.togglePoll() } }, icon("poll"));
    this.dcount = h("span", { class: "dcount" });
    this.draftBtn = h("button", { class: "icon-btn", id: "c-drafts", "aria-label": "下書きと予約投稿", on: { click: () => draftsModal(this.ta.value) } }, icon("clock"), this.dcount);
    this.kindSel = h("select", { id: "c-kind", class: "kindsel", "aria-label": "投稿の種類", hidden: true }, h("option", { value: "post" }, "通常ポスト"), h("option", { value: "notice" }, "お知らせ"));
    this.composer = h("div", { class: "composer" },
      h("div", { id: "c-av" }),
      h("div", { style: "min-width:0" }, this.ta, this.thumbs, this.pollForm,
        h("div", { class: "c-tools" },
          h("button", { class: "icon-btn", "aria-label": "画像を添付", on: { click: () => this.fImg.click() } }, icon("image")),
          h("button", { class: "icon-btn", "aria-label": "動画を添付", on: { click: () => { if (!S.assets) toast("動画の投稿は、編集権限のあるアカウントで使えます。"); else this.fVid.click(); } } }, icon("video")),
          this.pollBtn, this.draftBtn, h("span", { class: "grow" }), this.kindSel, this.count, this.postBtn, this.fImg, this.fVid)));
    this.tabsEl = h("div", { class: "tabs scroll", role: "tablist" }, HOME_TABS.map(([id, label]) =>
      h("button", { class: "tab", role: "tab", id: "tab-" + id, on: { click: () => { this.tab = id; this.limit = 40; this.update(); } } }, label)));
    this.caption = h("div", { class: "caption", hidden: true });
    this.list = h("div");
    this.emptyEl = h("div");
    this.moreBtn = h("div", { class: "more", hidden: true }, h("button", { class: "btn", on: { click: () => { this.limit += 40; this.update(); } } }, "もっと見る"));
    this.el.append(viewHead("ホーム"), this.composer, this.tabsEl, this.caption, this.list, this.emptyEl, this.moreBtn);
  },
  enter() { this.syncComposer(); },
  togglePoll(on) {
    on = on == null ? this.pollForm.hidden : on;
    this.pollForm.hidden = !on;
    if (!on) this.pollOpts.forEach(i => { i.value = ""; });
    this.syncComposer();
  },
  readPoll() {
    if (this.pollForm.hidden) return null;
    const opts = this.pollOpts.map(i => i.value.trim()).filter(Boolean);
    if (opts.length < 2) return false;
    const d = Number(this.pollDur.value);
    return { opts, end: d ? Date.now() + d : 0 };
  },
  syncComposer() {
    const max = cfg().maxLen;
    this.ta.maxLength = max;
    const left = max - this.ta.value.length;
    this.count.textContent = String(left);
    this.count.classList.toggle("low", left <= 20);
    const locked = !S.canWrite || isBanned(S.me);
    this.ta.disabled = locked;
    this.kindSel.hidden = !S.staff.has(S.me);
    this.dcount.textContent = S.drafts.length ? String(S.drafts.length) : "";
    this.draftBtn.setAttribute("aria-label", "下書きと予約投稿(" + S.drafts.length + "件)");
    this.postBtn.disabled = locked || S.posting || S.attBusy || (!this.ta.value.trim() && !S.att.length);
    const av = $("#c-av", this.composer);
    if (av && S.me && S.profiles.get(S.me)) av.replaceChildren(avatar(S.me, 40));
  },
  async submit() {
    if (!guard() || S.posting) return;
    const text = this.ta.value.trim();
    if (!text && !S.att.length) return;
    S.posting = true; this.syncComposer();
    try {
      const media = [];
      for (const a of S.att) media.push(await uploadAtt(a));
      const poll = this.readPoll();
      if (poll === false) { toast("アンケートの選択肢は2つ以上入力してください。"); return; }
      const extra = { text, media };
      if (poll) extra.poll = poll;
      const notice = S.staff.has(S.me) && this.kindSel.value === "notice";
      if (notice) extra.kind = "notice";
      await createPost(extra);
      this.ta.value = ""; S.att = []; renderAtt(); this.togglePoll(false);
      this.tab = notice ? "notice" : "all";
    } catch (e) { fail(e); }
    finally { S.posting = false; this.syncComposer(); this.update(); }
  },
  update() {
    $$(".tab", this.tabsEl).forEach(t => t.setAttribute("aria-selected", String(t.id === "tab-" + this.tab)));
    this.syncComposer();
    let posts = visiblePosts();
    const likes = p => S.likeCount.get(p.id) || 0;
    posts = this.tab === "notice" ? posts.filter(isNotice) : posts.filter(p => !p.re && !isNotice(p));
    if (this.tab === "following") { const f = new Set([S.me, ...(S.follows.get(S.me)?.to || [])]); posts = posts.filter(p => f.has(p.uid)); }
    else if (this.tab === "picks") posts = posts.filter(p => S.picks.has(p.id)).sort((a, b) => (S.picks.get(b.id).at || 0) - (S.picks.get(a.id).at || 0));
    else if (this.tab === "popular") posts = posts.filter(p => likes(p) > 0).sort((a, b) => likes(b) - likes(a) || b.at - a.at);
    const cap = HOME_CAPTION[this.tab];
    this.caption.hidden = !cap;
    this.caption.textContent = cap || "";
    const shown = posts.slice(0, this.limit);
    reconcile(this.list, shown, postOpts);
    this.moreBtn.hidden = posts.length <= this.limit;
    const em = HOME_EMPTY[this.tab];
    this.emptyEl.replaceChildren(shown.length ? "" : emptyBox(em[0], em[1]));
  }
};

/* ---------- compose / thread / notifications ---------- */
async function createPost(extra) {
  const post = Object.assign({ id: rid(), at: Date.now() }, extra);
  const cur = S.feeds.get(S.me)?.posts || [];
  await S.db.doc("feed/" + S.me).set({ posts: [post, ...cur].slice(0, 300) });
  return post;
}
const toLocalInput = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "T" + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
async function saveDrafts(items) {
  await S.db.doc("data/users/" + S.me + "/drafts").set({ items: items.slice(0, 30) });
  S.drafts = items.slice(0, 30);
}
function draftsModal(initial) {
  if (!guard()) return;
  let editing = null, busy = false;
  const ta = h("textarea", { id: "dr-text", rows: 4, maxLength: cfg().maxLen, placeholder: "下書きにするポスト、または予約するポスト" });
  ta.value = initial || "";
  const count = h("span", { class: "counter" });
  const when = h("input", { type: "datetime-local", id: "dr-when", "aria-label": "予約する日時" });
  const listBox = h("div", { id: "dr-list" });
  const bSave = h("button", { class: "btn", id: "dr-save" }, "下書きに保存");
  const bSched = h("button", { class: "btn primary", id: "dr-sched" }, "この日時に予約する");
  const sync = () => { count.textContent = String(cfg().maxLen - ta.value.length); const ok = !busy && !!ta.value.trim(); bSave.disabled = bSched.disabled = !ok; };
  const reset = () => { editing = null; ta.value = ""; when.value = ""; sync(); };
  const commit = async sched => {
    const text = ta.value.trim(); if (!text) return;
    if (sched) {
      if (!when.value) { toast("予約する日時を選んでください。"); return; }
      if (!(sched > Date.now() + 30000)) { toast("予約の日時は、これから先の時刻にしてください。"); return; }
    }
    busy = true; sync();
    try {
      const old = S.drafts.find(x => x.id === editing);
      const item = { id: editing || rid(), text, at: old ? old.at : Date.now(), sched: sched || 0 };
      await saveDrafts([item, ...S.drafts.filter(x => x.id !== item.id)]);
      toast(sched ? "予約しました。" : "下書きに保存しました。");
      reset(); draw();
    } catch (e) { fail(e); } finally { busy = false; sync(); }
  };
  bSave.addEventListener("click", () => commit(0));
  bSched.addEventListener("click", () => commit(when.value ? new Date(when.value).getTime() : NaN));
  ta.addEventListener("input", sync);
  const draw = () => {
    const items = [...S.drafts].sort((a, b) => (b.sched ? 1 : 0) - (a.sched ? 1 : 0) || (a.sched && b.sched ? a.sched - b.sched : b.at - a.at));
    listBox.replaceChildren(h("div", { class: "section-title", style: "padding-inline:0" }, "下書き・予約(" + items.length + "件)"),
      ...(items.length ? items.map(it => h("div", { class: "draftrow" },
        h("div", { style: "min-width:0;flex:1" }, h("div", { class: "dtext" }, it.text.slice(0, 80) + (it.text.length > 80 ? "…" : "")),
          h("div", { class: "hint" }, it.sched ? "予約: " + fullDate(it.sched) : "下書き(" + fullDate(it.at) + ")")),
        h("div", { class: "row" },
          h("button", { class: "btn small", "data-act": "edit", on: { click: () => { editing = it.id; ta.value = it.text; when.value = it.sched ? toLocalInput(new Date(it.sched)) : ""; sync(); ta.focus(); } } }, "編集"),
          h("button", { class: "btn small", "data-act": "now", on: { click: async () => { if (!guard()) return; try { await createPost({ text: it.text, media: [] }); await saveDrafts(S.drafts.filter(x => x.id !== it.id)); toast("ポストしました。"); draw(); } catch (e) { fail(e); } } } }, "今すぐ投稿"),
          h("button", { class: "btn small danger", "data-act": "del", on: { click: async () => { try { await saveDrafts(S.drafts.filter(x => x.id !== it.id)); if (editing === it.id) reset(); draw(); } catch (e) { fail(e); } } } }, "削除")))) : [h("p", { class: "muted-p" }, "まだありません。")]));
  };
  const setMin = () => { const d = new Date(Date.now() + 60000); when.min = toLocalInput(d); };
  setMin(); sync(); draw();
  S.onDrafts = () => { if (document.body.contains(listBox)) draw(); else S.onDrafts = null; };
  modal("下書きと予約投稿", h("div", { class: "stack" }, ta, h("div", { class: "row end" }, count),
    h("div", { class: "field" }, h("label", { for: "dr-when" }, "予約する日時"), when,
      h("div", { class: "hint" }, "予約できるのは、文字だけのポストです(画像やアンケートは付けられません)。指定の時刻になると、サイトが自動でポストします。サイトが眠っているとき(無料の公開先)は、次に誰かが開いたときにポストされます。")),
    h("div", { class: "row end" }, bSave, bSched), listBox), { onClose: () => { S.onDrafts = null; } });
}
function openCompose({ re, q }) {
  if (!guard()) return;
  const target = S.postById.get(re || q);
  if (!target) { toast("元のポストが見つかりません。"); return; }
  let busy = false, close;
  const ta = h("textarea", { id: "rc-text", rows: 4, maxLength: cfg().maxLen, placeholder: re ? "返信をポスト" : "コメントを追加(空でもOK)" });
  const count = h("span", { class: "counter" });
  const btn = h("button", { class: "btn primary", id: "rc-post" }, re ? "返信する" : "引用ポストする");
  const upd = () => { count.textContent = String(cfg().maxLen - ta.value.length); btn.disabled = busy || (!!re && !ta.value.trim()); };
  ta.addEventListener("input", upd); upd();
  btn.addEventListener("click", async () => {
    busy = true; upd();
    try {
      await createPost(re ? { text: ta.value.trim(), re } : { text: ta.value.trim(), q });
      close(); toast(re ? "返信しました。" : "引用ポストしました。");
    } catch (e) { fail(e); busy = false; upd(); }
  });
  close = modal(re ? "返信" : "引用ポスト", h("div", { class: "stack" }, quoteBox(target.id), ta, h("div", { class: "row end" }, count, btn)));
  setTimeout(() => ta.focus(), 30);
}
V.post = {
  el: h("section"), id: null,
  init() {
    this.bar = h("div", { style: "display:contents" });
    this.parentBox = h("div"); this.mainBox = h("div"); this.repliesBox = h("div"); this.emptyEl = h("div");
    this.replyRow = h("button", { class: "replyrow", id: "reply-open", on: { click: () => openCompose({ re: this.id }) } }, "返信をポストする…");
    this.el.append(this.bar, this.parentBox, this.mainBox, this.replyRow, this.repliesBox, this.emptyEl);
  },
  enter(r) { this.id = r.id; },
  update() {
    this.bar.replaceChildren(viewHead("ポスト", { back: () => go({ v: "home" }) }));
    const p = S.postById.get(this.id);
    const hide = !p || isBlocked(p.uid);
    this.replyRow.hidden = hide;
    if (hide) {
      reconcile(this.parentBox, [], postOpts); reconcile(this.mainBox, [], postOpts); reconcile(this.repliesBox, [], postOpts);
      this.emptyEl.replaceChildren(emptyBox("ポストが見つかりません", "削除されたか、表示できないポストです。"));
      return;
    }
    this.emptyEl.replaceChildren();
    const par = p.re ? S.postById.get(p.re) : null;
    reconcile(this.parentBox, par && !isBlocked(par.uid) ? [par] : [], postOpts);
    reconcile(this.mainBox, [p], postOpts);
    const reps = (S.repliesOf.get(p.id) || []).filter(x => !isBlocked(x.uid) && !isMuted(x.uid) && (canAdmin() || !isBanned(x.uid))).sort((a, b) => a.at - b.at);
    reconcile(this.repliesBox, reps, postOpts);
  }
};
let notifWriting = false;
async function markNotifsSeen() {
  const latest = Math.max(0, ...(S.notifs || []).map(n => n.at));
  if (notifWriting || S.guest || !S.canWrite || !latest || latest <= (S.reads.n || 0)) return;
  notifWriting = true;
  try { await S.db.doc("data/users/" + S.me + "/reads").set(Object.assign({}, S.reads, { n: latest })); }
  catch (e) { console.warn(e); }
  finally { notifWriting = false; }
}
const NOTIF_TEXT = { like: "があなたのポストにいいねしました", reply: "があなたのポストに返信しました", quote: "があなたのポストを引用しました", mention: "があなたをメンションしました", follow: "があなたをフォローしました", notice: "がお知らせを投稿しました" };
V.notifs = {
  el: h("section"), seenAt: 0,
  init() { this.list = h("div"); this.emptyEl = h("div"); this.el.append(viewHead("通知"), this.list, this.emptyEl); },
  enter() { this.seenAt = S.reads.n || 0; },
  update() {
    const items = S.notifs || [];
    this.list.replaceChildren(...items.map(n => {
      const po = n.post ? S.postById.get(n.post) : null;
      const open = () => n.type === "follow" ? toProfile(n.from) : (n.post ? openPost(n.post) : null);
      return h("button", { class: "notif" + (n.at > this.seenAt ? " fresh" : ""), on: { click: open } },
        avatar(n.from, 36),
        h("div", { style: "min-width:0" },
          h("div", null, h("b", null, prof(n.from).name), badge(n.from), NOTIF_TEXT[n.type]),
          po ? h("div", { class: "nprev" }, ((n.type === "reply" || n.type === "quote" || n.type === "notice" || n.type === "mention") ? po.text : (S.postById.get(n.post) || {}).text) || "(画像・動画)") : null),
        h("time", { class: "time" }, rel(n.at)));
    }));
    this.emptyEl.replaceChildren(items.length ? "" : emptyBox("通知はまだありません", "いいね・返信・引用・フォローがあると、ここに表示されます。"));
    markNotifsSeen();
  }
};

/* attachments */
function loadBitmap(file) {
  if (window.createImageBitmap) return createImageBitmap(file).catch(() => viaImg(file));
  return viaImg(file);
}
function viaImg(file) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(u); res(img); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("この画像は読み込めませんでした。")); };
    img.src = u;
  });
}
function drawTo(bmp, maxDim) {
  const w = bmp.width || bmp.naturalWidth, hh = bmp.height || bmp.naturalHeight;
  const sc = Math.min(1, maxDim / Math.max(w, hh));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(hh * sc));
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
const toBlob = (c, q) => new Promise(r => c.toBlob(r, "image/jpeg", q));
const MAXUP = Math.min(20, (window.__pub && window.__pub.maxUploadMB) || 20) * 1048576;
async function prepImage(f) {
  const bmp = await loadBitmap(f);
  const thumb = drawTo(bmp, 360).toDataURL("image/jpeg", 0.7);
  if (S.assets) {
    if (f.type === "image/gif" && f.size <= MAXUP) return { kind: "img", thumb, raw: f, type: "image/gif" };
    return { kind: "img", thumb, blob: await toBlob(drawTo(bmp, 2000), 0.86), type: "image/jpeg" };
  }
  for (const dim of [1280, 1024, 800, 600]) for (const q of [0.78, 0.64, 0.5]) {
    const url = drawTo(bmp, dim).toDataURL("image/jpeg", q);
    if (url.length <= 230000) return { kind: "img", thumb, dataUrl: url };
  }
  throw new Error("画像が大きすぎて保存できませんでした。");
}
async function attach(files) {
  for (const f of [...files]) {
    try {
      if (f.type.startsWith("video/")) {
        if (!S.assets) { toast("動画の投稿は、編集権限のあるアカウントで使えます。"); continue; }
        if (!/^video\/(mp4|webm)$/.test(f.type)) { toast("動画はMP4かWebM形式に対応しています。"); continue; }
        if (f.size > MAXUP) { toast("動画は" + Math.floor(MAXUP / 1048576) + "MBまでです。"); continue; }
        if (S.att.length) { toast("動画は他の添付と一緒に付けられません。"); continue; }
        S.att.push({ kind: "vid", file: f, name: f.name });
      } else if (f.type.startsWith("image/")) {
        if (S.att.some(a => a.kind === "vid") || S.att.length >= 4) { toast("画像は4枚まで。動画とは一緒に付けられません。"); continue; }
        S.attBusy = true; V.home.syncComposer();
        S.att.push(await prepImage(f));
      } else toast("画像か動画を選んでください。");
    } catch (e) { fail(e); }
    finally { S.attBusy = false; renderAtt(); }
  }
}
function renderAtt() {
  const box = V.home.thumbs;
  box.hidden = !S.att.length;
  box.replaceChildren(...S.att.map((a, i) => h("div", { class: "thumb" },
    a.kind === "img" ? h("img", { src: a.thumb, alt: "添付プレビュー" }) : h("span", null, "動画 " + (a.name || "")),
    h("button", { class: "x", "aria-label": "添付を外す", on: { click: () => { S.att.splice(i, 1); renderAtt(); } } }, icon("x", 12)))));
  V.home.syncComposer();
}
async function uploadAtt(a) {
  if (a.kind === "vid") { const r = await S.assets.upload(a.file, { type: a.file.type }); return { t: "vid", a: r.id }; }
  if (a.raw) { const r = await S.assets.upload(a.raw, { type: "image/gif" }); return { t: "img", a: r.id }; }
  if (a.blob) { const r = await S.assets.upload(a.blob, { type: "image/jpeg" }); return { t: "img", a: r.id }; }
  const mid = rid();
  await S.db.doc("media/" + S.me + "/items/" + mid).set({ d: a.dataUrl });
  return { t: "idb", u: S.me, m: mid };
}

/* ---------- views: search ---------- */
function trendTags() {
  const since = Date.now() - 7 * 86400000, m = new Map();
  for (const p of visiblePosts()) { if (p.at < since || !p.text) continue; for (const t of tagsIn(p.text)) m.set(t, (m.get(t) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10);
}
function allTagCounts() {
  const m = new Map();
  for (const p of visiblePosts()) { if (!p.text) continue; for (const t of tagsIn(p.text)) m.set(t, (m.get(t) || 0) + 1); }
  return m;
}
/* rankings: weekly / monthly / yearly */
const PERIODS = [["week", "週間", 7], ["month", "月間", 30], ["year", "年間", 365]];
const periodDays = k => (PERIODS.find(x => x[0] === k) || PERIODS[0])[2];
function rankHashtags(days) {
  const since = Date.now() - days * 86400000, m = new Map();
  for (const p of visiblePosts()) { if (p.at < since || !p.text) continue; for (const t of tagsIn(p.text)) m.set(t, (m.get(t) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 20);
}
function rankPosts(days) {
  const since = Date.now() - days * 86400000, sc = new Map();
  for (const l of S.likes.values()) for (const [id, t] of Object.entries(l.t || {})) if (t >= since) sc.set(id, (sc.get(id) || 0) + 1);
  const vis = new Map(visiblePosts().map(p => [p.id, p]));
  return [...sc.entries()].filter(([id]) => vis.has(id) && !isNotice(vis.get(id)))
    .map(([id, n]) => ({ p: vis.get(id), n })).sort((a, b) => b.n - a.n || b.p.at - a.p.at).slice(0, 10);
}
function rankFollowers(days) {
  const since = Date.now() - days * 86400000, g = new Map();
  for (const [u, f] of S.follows) {
    if (hidesFrom(u) || !S.profiles.has(u)) continue;
    for (const t of (f.to || [])) {
      const at = (f.at || {})[t];
      if (at >= since && t !== u && S.profiles.has(t) && !hidesFrom(t) && (canAdmin() || !isBanned(t))) g.set(t, (g.get(t) || 0) + 1);
    }
  }
  return [...g.entries()].sort((a, b) => b[1] - a[1] || followerCount(b[0]) - followerCount(a[0])).slice(0, 20);
}
const rankNum = i => h("div", { class: "rank-n" + (i < 3 ? " top" : "") }, String(i + 1));
V.search = {
  el: h("section"), mode: "search", period: "week", kind: "tag",
  init() {
    this.q = h("input", { id: "search-q", type: "search", placeholder: "名前・@ID・ポスト・#ハッシュタグを検索", "aria-label": "検索", autocomplete: "off", on: { input: () => this.update() } });
    this.trendTitle = h("div", { class: "section-title" }, "トレンド(直近7日)"); this.trendBox = h("div", { class: "trend" });
    this.tagsTitle = h("div", { class: "section-title" }, "ハッシュタグ"); this.tagsBox = h("div", { class: "trend", id: "tag-results" });
    this.users = h("div"); this.posts = h("div"); this.postsList = h("div"); this.emptyEl = h("div");
    this.postsTitle = h("div", { class: "section-title" }, "ポスト");
    this.usersTitle = h("div", { class: "section-title" });
    this.modeTabs = h("div", { class: "tabs", role: "tablist" },
      h("button", { class: "tab", role: "tab", id: "stab-search", on: { click: () => { this.mode = "search"; this.update(); } } }, "さがす"),
      h("button", { class: "tab", role: "tab", id: "stab-rank", on: { click: () => { this.mode = "rank"; this.update(); } } }, "ランキング"));
    this.searchWrap = h("div", null, h("div", { class: "search-box" }, this.q), this.trendTitle, this.trendBox, this.tagsTitle, this.tagsBox, this.usersTitle, this.users, this.postsTitle, this.postsList, this.emptyEl);
    this.periodBox = h("div", { class: "chips", role: "group", "aria-label": "期間" });
    this.kindTabs = h("div", { class: "tabs", role: "tablist" });
    this.rankNote = h("div", { class: "rank-note" });
    this.rankList = h("div", { id: "rank-list" });
    this.rankPosts = h("div", { id: "rank-posts" });
    this.rankEmpty = h("div");
    this.rankWrap = h("div", null, this.periodBox, this.kindTabs, this.rankNote, this.rankList, this.rankPosts, this.rankEmpty);
    this.el.append(viewHead("さがす"), this.modeTabs, this.searchWrap, this.rankWrap);
  },
  enter(r) { this.mode = r.rank ? "rank" : "search"; this.q.value = r.q || ""; if (r.kind) this.kind = r.kind; },
  update() {
    $$(".tab", this.modeTabs).forEach(t => t.setAttribute("aria-selected", String(t.id === "stab-" + this.mode)));
    this.searchWrap.hidden = this.mode !== "search"; this.rankWrap.hidden = this.mode !== "rank";
    if (this.mode === "rank") return this.updateRank();
    const q = this.q.value.trim().toLowerCase();
    const tr = q ? [] : trendTags();
    this.trendTitle.hidden = this.trendBox.hidden = !tr.length;
    this.trendBox.replaceChildren(...tr.map(([t, c]) => h("button", { on: { click: () => { this.q.value = t; this.update(); } } }, t, h("small", null, c + "件"))));
    if (!q) {
      this.tagsTitle.hidden = this.tagsBox.hidden = true;
      this.usersTitle.hidden = false; this.usersTitle.textContent = "おすすめのユーザー";
      const sug = suggestions(8);
      this.users.replaceChildren(...sug.map(u => userRow(u)));
      this.postsTitle.hidden = true; reconcile(this.postsList, [], postOpts);
      this.emptyEl.replaceChildren(sug.length ? "" : emptyBox("まだ他のユーザーがいません", "招待された人が登録すると、ここに表示されます。"), siteLink() ? h("div", { class: "sitelink-wrap", style: "padding:16px" }, siteLink()) : "");
      return;
    }
    const isTag = /^#[\p{L}\p{N}_]+$/u.test(q);
    const qs = q.replace(/^[#@]/, "");
    const tags = q.startsWith("@") || !qs ? [] : [...allTagCounts().entries()].filter(([t]) => t.slice(1).includes(qs)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12);
    this.tagsTitle.hidden = this.tagsBox.hidden = !tags.length;
    this.tagsBox.replaceChildren(...tags.map(([t, c]) => h("button", { on: { click: () => { this.q.value = t; this.update(); } } }, t, h("small", null, c + "件"))));
    const users = isTag ? [] : [...S.profiles.keys()].filter(u => (canAdmin() || !isBanned(u)) && ((prof(u).name || "") + " " + (prof(u).handle || "") + " " + (prof(u).bio || "")).toLowerCase().includes(qs));
    const posts = visiblePosts().filter(p => isTag ? tagsIn(p.text).includes(q) : (p.text || "").toLowerCase().includes(q)).slice(0, 60);
    this.usersTitle.hidden = !users.length; this.usersTitle.textContent = "ユーザー";
    this.users.replaceChildren(...users.slice(0, 20).map(u => userRow(u)));
    this.postsTitle.hidden = !posts.length;
    reconcile(this.postsList, posts, postOpts);
    this.emptyEl.replaceChildren(users.length || posts.length || tags.length ? "" : emptyBox("見つかりませんでした", "別のことばで探してみてください。"));
  },
  updateRank() {
    const days = periodDays(this.period), pl = (PERIODS.find(x => x[0] === this.period) || PERIODS[0])[1];
    this.periodBox.replaceChildren(...PERIODS.map(([k, label]) => h("button", { id: "per-" + k, "aria-pressed": String(this.period === k), on: { click: () => { this.period = k; this.update(); } } }, label)));
    const kinds = [["tag", "ハッシュタグ"], ["post", "ポスト"], ["follower", "フォロワー"]];
    this.kindTabs.replaceChildren(...kinds.map(([k, label]) => h("button", { class: "tab", role: "tab", id: "kind-" + k, "aria-selected": String(this.kind === k), on: { click: () => { this.kind = k; this.update(); } } }, label)));
    const note = { tag: "直近" + days + "日で、ポストに使われた回数が多い順です。", post: "直近" + days + "日に、いいねが多く集まった順です。", follower: "直近" + days + "日に、フォロワーが増えた人数の多い順です。(シークレットモードの人は載りません)" }[this.kind];
    this.rankNote.textContent = pl + "ランキング — " + note;
    let rows = [], posts = [];
    if (this.kind === "tag") {
      rows = rankHashtags(days).map(([t, c], i) => h("div", { class: "rank-line" }, rankNum(i),
        h("button", { class: "rank-tag", on: { click: () => go({ v: "search", q: t }) } }, t), h("span", { class: "rank-score" }, c + "件")));
    } else if (this.kind === "follower") {
      rows = rankFollowers(days).map(([u, n], i) => h("div", { class: "rank-line" }, rankNum(i), userRow(u, { compact: true, action: () => null }), h("span", { class: "rank-score" }, "+" + n + "人")));
    } else {
      posts = rankPosts(days).map((x, i) => Object.assign({}, x.p, { _rank: i + 1, _n: x.n }));
    }
    this.rankList.replaceChildren(...rows);
    reconcile(this.rankPosts, posts, {
      key: p => p.id, sig: p => postSig(p) + "|" + p._rank + "|" + p._n,
      build: p => { const w = h("div", { class: "rank-row" }, h("div", { class: "rank-n" }), postNode(p)); w._in = w.lastChild; return w; },
      update: (w, p) => { postUpdate(w._in, p); const n = w.firstChild; n.className = "rank-n" + (p._rank <= 3 ? " top" : ""); n.replaceChildren(String(p._rank), h("small", null, "♥" + p._n)); }
    });
    this.rankEmpty.replaceChildren(rows.length || posts.length ? "" : emptyBox("まだランキングがありません", "この期間のデータがたまると表示されます。"));
  }
};

/* ---------- views: profile ---------- */
V.profile = {
  el: h("section"), tab: "posts", uid: null,
  init() {
    this.head = h("div"); this.list = h("div"); this.emptyEl = h("div");
    this.tabsEl = h("div", { class: "tabs", role: "tablist" },
      h("button", { class: "tab", role: "tab", id: "ptab-posts", on: { click: () => { this.tab = "posts"; this.update(); } } }, "ポスト"),
      h("button", { class: "tab", role: "tab", id: "ptab-likes", on: { click: () => { this.tab = "likes"; this.update(); } } }, "いいね"));
    this.bar = h("div", { style: "display:contents" });
    this.el.append(this.bar, this.head, this.tabsEl, this.list, this.emptyEl);
  },
  enter(r) { this.uid = r.id || S.me; this.tab = "posts"; },
  update() {
    const uid = this.uid, p = prof(uid), mine = uid === S.me, secret = hidesFrom(uid);
    this.bar.replaceChildren(viewHead(p.name, { back: mine ? null : () => go({ v: "home" }), sub: S.posts.filter(x => x.uid === uid).length + "件のポスト" }));
    const f = this.head;
    const ac = okHex(p.accent), bgc = okHex(p.bg), sty = okBio(p.bsty);
    this.el.style.cssText = ac ? "--accent:" + ac + ";--accent-ink:" + inkFor(ac) + ";--accent-soft:color-mix(in srgb," + ac + " 16%,var(--bg))" : "";
    const heroBg = /^[0-9a-f]{32}$/.test(p.hdr || "") ? "url(/_blob/" + p.hdr + ") center/cover no-repeat" : (bgc || ac) ? "linear-gradient(135deg," + (bgc || ac) + "," + (ac || bgc) + ")" : "";
    const hero = heroBg ? h("div", { class: "phero", id: "phero", style: "background:" + heroBg }) : null;
    f.replaceChildren(...[hero, h("div", { class: "phead", style: bgc ? "background:color-mix(in srgb," + bgc + " 16%,var(--bg))" : null },
      h("div", { class: "top" }, avatar(uid, 72),
        h("div", { class: "row" },
          S.guest ? followBtn(uid) : mine ? [h("button", { class: "btn small", on: { click: () => editProfile() } }, icon("edit", 16), "プロフィールを編集"), h("button", { class: "btn small", id: "open-prefs", on: { click: () => prefsModal() } }, icon("gear", 16), "ミュート・ブロック"), h("button", { class: "btn small", id: "open-privacy", on: { click: () => privacyModal() } }, icon("lock", 16), "オンライン状態・シークレット"), h("button", { class: "btn small", id: "open-account", on: { click: () => accountModal() } }, icon("user", 16), "アカウント")]
            : [h("button", { class: "btn small", on: { click: () => openThread({ type: "dm", peer: uid }) } }, icon("chat", 16), "メッセージ"), followBtn(uid),
              h("button", { class: "btn small" + (isMuted(uid) ? " on" : ""), on: { click: () => toggleMute(uid) } }, isMuted(uid) ? "ミュート中" : "ミュート"),
              h("button", { class: "btn small" + (isBlocked(uid) ? " on" : " danger"), on: { click: () => toggleBlock(uid) } }, isBlocked(uid) ? "ブロック中" : "ブロック"),
              h("button", { class: "btn small", id: "rp-user", on: { click: () => reportModal({ k: "user", t: uid, tu: uid, s: p.name }) } }, icon("flag", 14), "通報")])),
      h("div", null, h("h2", { style: "display:flex;align-items:center;gap:6px" }, p.name, badge(uid)), h("div", { class: "handle" }, "@" + p.handle,
        isBanned(uid) && canAdmin() ? h("span", { class: "tag-ban", style: "margin-left:8px" }, "停止中") : null),
        presLine(uid) ? h("div", { style: "margin-top:4px" }, presLine(uid)) : null),
      p.bio ? h("p", { class: "bio" + (sty ? " s-" + sty : ""), style: okHex(p.bcol) ? "color:" + okHex(p.bcol) : null }, p.bio) : null,
      secret ? h("div", { class: "secret-note", id: "secret-note" }, icon("lock", 16), h("span", null, "このユーザーはシークレットモードです。ポスト・表示名・アイコン・自己紹介以外は公開されていません。"))
        : [h("div", { class: "counts" },
          h("button", { on: { click: () => userList("フォロー中", S.follows.get(uid)?.to || []) } }, h("b", null, followingCount(uid)), " フォロー中"),
          h("button", { on: { click: () => userList("フォロワー", [...(S.followers.get(uid) || [])]) } }, h("b", null, followerCount(uid)), " フォロワー")),
        p.joined ? h("div", { class: "handle" }, new Date(p.joined).getFullYear() + "年" + (new Date(p.joined).getMonth() + 1) + "月から利用") : null,
        levelBox(uid)])].filter(Boolean));
    if (secret && this.tab === "likes") this.tab = "posts";
    $("#ptab-likes", this.tabsEl).hidden = secret;
    $$(".tab", this.tabsEl).forEach(t => t.setAttribute("aria-selected", String(t.id === "ptab-" + this.tab)));
    let posts = visiblePosts({ profile: true });
    if (this.tab === "posts") {
      posts = posts.filter(x => x.uid === uid && !isNotice(x));
      const pi = p.pin ? posts.findIndex(x => x.id === p.pin) : -1;
      if (pi > 0) posts.unshift(posts.splice(pi, 1)[0]);
    }
    else { const l = new Set(S.likes.get(uid)?.p || []); posts = posts.filter(x => l.has(x.id)); }
    reconcile(this.list, posts.slice(0, 80), postOpts);
    this.emptyEl.replaceChildren(posts.length ? "" : emptyBox(this.tab === "posts" ? "まだポストがありません" : "まだいいねがありません", mine && this.tab === "posts" ? "ホームから最初のポストを書いてみましょう。" : ""));
  }
};
function privacyModal() {
  if (!guard()) return;
  const cur = S.settings.presence || "online";
  const opts = [["online", "オンライン", "ほかの人に緑の印が表示されます。"], ["busy", "取り込み中", "ほかの人に赤の印が表示されます。"], ["hidden", "オンライン状態を隠す", "いつでも「オフライン」に見えます。"]];
  const radios = opts.map(([k, label, hint]) => h("label", { class: "switch-row", for: "pr-" + k },
    h("span", null, h("b", null, label), h("div", { class: "hint" }, hint)),
    h("input", { type: "radio", name: "pres", id: "pr-" + k, checked: cur === k, on: { change: async () => {
      try { await S.db.doc("data/users/" + S.me + "/settings").set(Object.assign({}, S.settings, { presence: k })); S.settings.presence = k; beat(); schedule(); } catch (e) { fail(e); }
    } } })));
  const sec = h("input", { type: "checkbox", id: "pr-secret", checked: isSecret(S.me), on: { change: async () => {
    try { await S.db.doc("profiles/" + S.me).update({ secret: sec.checked }); toast(sec.checked ? "シークレットモードをオンにしました。" : "シークレットモードをオフにしました。"); beat(); } catch (e) { sec.checked = !sec.checked; fail(e); }
  } } });
  modal("オンライン状態とシークレットモード", h("div", { class: "stack" },
    h("div", { class: "section-title", style: "padding-inline:0" }, "オンライン状態"), ...radios,
    h("div", { class: "section-title", style: "padding-inline:0" }, "シークレットモード"),
    h("label", { class: "switch-row", for: "pr-secret" }, h("span", null, h("b", null, "シークレットモード"), h("div", { class: "hint" }, "オンにすると、ほかの人にはポスト・表示名・アイコン・自己紹介だけが見えます。フォロー数・フォロワー・いいね一覧・利用開始日・オンライン状態は見えなくなります。")), sec),
    h("p", { class: "muted-p" }, "※ ポストと、あなたがつけたいいね・フォローの数は、サイトの仕組み上、ポストへの反応として他の人の画面に反映されることがあります。運営はすべて見られます。")));
}
function userList(title, ids) {
  const list = ids.filter(u => S.profiles.has(u) && !hidesFrom(u));
  modal(title, list.length ? h("div", null, list.map(u => userRow(u, { compact: true }))) : h("p", { class: "muted-p" }, "まだ誰もいません。"));
}
async function prepHeader(f) {
  if (!f.type.startsWith("image/")) throw new Error("画像を選んでください。");
  const bmp = await loadBitmap(f);
  const w = bmp.width || bmp.naturalWidth, hh = bmp.height || bmp.naturalHeight, W = 1200, H = 400;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  const k = Math.max(W / w, H / hh), sw = W / k, sh = H / k;
  x.drawImage(bmp, (w - sw) / 2, (hh - sh) / 2, sw, sh, 0, 0, W, H);
  for (const q of [0.82, 0.66, 0.5]) {
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= 700 * 1024) return blob;
  }
  throw new Error("画像が大きすぎて、ヘッダー画像にできませんでした。");
}
function colorField(label, id, init, presets) {
  let val = okHex(init);
  const inp = h("input", { type: "color", id, "aria-label": label });
  const none = h("button", { class: "btn small", type: "button", id: id + "-none" }, "なし");
  const sw = h("div", { class: "swatches", role: "radiogroup", "aria-label": label });
  const draw = () => {
    inp.value = val || "#2548a6";
    sw.replaceChildren(...presets.map(c => h("button", { type: "button", class: "swatch", role: "radio", "aria-checked": String(val === c), "aria-label": "色 " + c, style: "background:" + c, on: { click: () => { val = c; draw(); } } })));
    none.disabled = !val;
  };
  inp.addEventListener("input", () => { val = inp.value.toLowerCase(); draw(); });
  none.addEventListener("click", () => { val = ""; draw(); });
  draw();
  return { el: h("div", { class: "field" }, h("label", null, label), sw, h("div", { class: "row" }, inp, none)), get: () => val };
}
function editProfile() {
  const me = prof(S.me);
  let hue = me.hue == null ? 215 : me.hue;
  const name = h("input", { id: "ep-name", value: me.name, maxLength: 24 });
  const bio = h("textarea", { id: "ep-bio", rows: 3, maxLength: 100 }, "");
  bio.value = me.bio || "";
  const sw = h("div", { class: "swatches", role: "radiogroup", "aria-label": "アイコンの色" });
  const draw = () => sw.replaceChildren(...HUES.map(x => h("button", { class: "swatch", role: "radio", "aria-checked": String(x === hue), "aria-label": "色 " + x, style: "background:hsl(" + x + " 42% 36%)", on: { click: () => { hue = x; draw(); ap.redraw(); } } })));
  const ap = avatarPicker(okImg(me.img) ? me.img : "", () => name.value, () => hue);
  draw();
  // header image
  let hdr = /^[0-9a-f]{32}$/.test(me.hdr || "") ? me.hdr : "", hdrBlob = null, hdrUrl = "";
  const hprev = h("div", { class: "hdprev", id: "hd-prev" });
  const hfile = h("input", { type: "file", accept: "image/*", hidden: true, id: "hd-file" });
  const hrm = h("button", { class: "btn small", type: "button", id: "hd-rm" }, "画像を外す");
  const hdraw = () => {
    const src = hdrUrl || (hdr ? "/_blob/" + hdr : "");
    hprev.style.background = src ? "url(" + src + ") center/cover no-repeat" : "";
    hprev.textContent = src ? "" : "ヘッダー画像なし";
    hrm.hidden = !src;
  };
  hfile.addEventListener("change", async () => {
    const f = hfile.files && hfile.files[0]; hfile.value = "";
    if (!f) return;
    try { hdrBlob = await prepHeader(f); if (hdrUrl) URL.revokeObjectURL(hdrUrl); hdrUrl = URL.createObjectURL(hdrBlob); hdraw(); } catch (e) { toast(e.message || "画像を読み込めませんでした。"); }
  });
  hrm.addEventListener("click", () => { hdr = ""; hdrBlob = null; if (hdrUrl) URL.revokeObjectURL(hdrUrl); hdrUrl = ""; hdraw(); });
  hdraw();
  const bgF = colorField("背景色", "ep-bg", me.bg, ["#f4b6c2", "#f7d794", "#b8e6c1", "#a9d6f5", "#c8b6f2", "#e0e0e0", "#ffd1a8", "#9ee7e0"]);
  const acF = colorField("テーマカラー(ボタンや強調の色)", "ep-accent", me.accent, ["#d93a3a", "#e8830c", "#1f9d55", "#2548a6", "#7a3fd1", "#d6409f", "#0e8f9a", "#333333"]);
  const frame = h("select", { id: "ep-frame" }, FRAMES.map(([k, l]) => h("option", { value: k }, l)));
  frame.value = okFrame(me.frame);
  const bsty = h("select", { id: "ep-bsty" }, BIO_STYLES.map(([k, l]) => h("option", { value: k }, l)));
  bsty.value = okBio(me.bsty);
  const bcF = colorField("自己紹介の文字色", "ep-bcol", me.bcol, ["#d93a3a", "#e8830c", "#1f9d55", "#2548a6", "#7a3fd1", "#d6409f", "#0e8f9a", "#333333"]);
  const saveBtn = h("button", { class: "btn primary", id: "ep-save" }, "保存");
  const body = h("div", { class: "stack" },
    h("div", { class: "field" }, h("label", null, "アイコン画像"), ap.el, h("div", { class: "hint" }, "好きな画像を選べます(正方形に切り抜かれます)。画像がないときは頭文字と色のアイコンになります。")),
    h("div", { class: "field" }, h("label", { for: "ep-name" }, "表示名"), name),
    h("div", { class: "field" }, h("label", { for: "ep-bio" }, "自己紹介"), bio),
    h("div", { class: "field" }, h("label", null, "アイコンの色"), sw),
    h("div", { class: "section-title", style: "padding-inline:0" }, "プロフィールの見た目"),
    h("div", { class: "field" }, h("label", null, "ヘッダー画像"), hprev, h("div", { class: "row" }, h("button", { class: "btn small", type: "button", id: "hd-pick", on: { click: () => hfile.click() } }, "画像を選ぶ"), hrm, hfile), h("div", { class: "hint" }, "プロフィールの上に表示されます(横長に切り抜かれます)。")),
    bgF.el, acF.el,
    h("div", { class: "field" }, h("label", { for: "ep-frame" }, "アイコンの枠"), frame),
    h("div", { class: "field" }, h("label", { for: "ep-bsty" }, "自己紹介の飾り"), bsty),
    bcF.el,
    h("div", { class: "row end" },
      h("button", { class: "btn", on: { click: () => close() } }, "キャンセル"),
      saveBtn));
  saveBtn.addEventListener("click", async () => {
    const n = name.value.trim();
    if (!n) { toast("表示名を入力してください。"); return; }
    if (!guard()) return;
    saveBtn.disabled = true;
    try {
      let newHdr = hdr;
      if (hdrBlob) { if (!S.assets) throw new Error("画像のアップロードは、ログインしてから使えます。"); newHdr = (await S.assets.upload(hdrBlob, { type: "image/jpeg" })).id; }
      await S.db.doc("profiles/" + S.me).update({ name: n, bio: bio.value.trim(), hue, img: ap.get(), hdr: newHdr, bg: bgF.get(), accent: acF.get(), frame: frame.value, bsty: bsty.value, bcol: bcF.get() });
      if (me.hdr && me.hdr !== newHdr && S.assets) S.assets.delete(me.hdr).catch(() => {});
      if (hdrUrl) URL.revokeObjectURL(hdrUrl);
      close(); toast("保存しました。");
    } catch (e) { fail(e); saveBtn.disabled = false; }
  });
  const close = modal("プロフィールを編集", body);
}
const HUES = [8, 38, 150, 190, 215, 255, 290, 330];

/* ---------- views: messages ---------- */
function openThread(t) {
  if (!guard()) return;
  if (t.type === "dm" && isBlocked(t.peer)) { toast("ブロック中の相手にはメッセージを送れません。"); return; }
  if (!S.cryptoOK) { toast("このブラウザでは暗号化メッセージを使えません。"); return; }
  go({ v: "msgs", t });
}
V.msgs = {
  el: h("section"), t: null,
  init() {
    this.bar = h("div", { style: "display:contents" }); this.listEl = h("div"); this.listEmpty = h("div");
    this.noteEl = h("div", { class: "note" }, icon("lock", 14), "メッセージの本文は暗号化して保存されます。");
    this.msgBox = h("div", { class: "msgbox" });
    this.statusEl = h("div");
    this.input = h("textarea", { id: "msg-input", rows: 1, maxLength: 2000, placeholder: "メッセージを入力", "aria-label": "メッセージ", on: {
      input: () => { this.input.style.height = "auto"; this.input.style.height = Math.min(140, this.input.scrollHeight) + "px"; this.syncSend(); },
      keydown: e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); this.send(); } } } });
    this.sendBtn = h("button", { class: "btn primary", id: "msg-send", "aria-label": "送信", on: { click: () => this.send() } }, icon("send", 18));
    this.pend = null;
    this.pendEl = h("div", { class: "pendimg", hidden: true });
    this.fileIn = h("input", { type: "file", id: "msg-img", accept: "image/*", hidden: true, on: { change: async () => {
      const f = this.fileIn.files[0]; this.fileIn.value = "";
      if (!f) return;
      try { this.pend = await prepDmImage(f); this.renderPend(); } catch (e) { fail(e); }
    } } });
    this.attBtn = h("button", { class: "icon-btn", id: "msg-attach", "aria-label": "画像を送る", on: { click: () => this.fileIn.click() } }, icon("image"));
    this.sendbar = h("div", { class: "sendbar" }, this.attBtn, this.input, this.sendBtn, this.fileIn);
    this.threadEl = h("div", { class: "thread", hidden: true }, this.statusEl, this.msgBox, this.pendEl, this.sendbar);
    this.listWrap = h("div", null, this.noteEl, this.listEl, this.listEmpty);
    this.el.append(this.bar, this.listWrap, this.threadEl);
  },
  enter(r) {
    this.t = r.t || null;
    this.sending = false; this.pend = null; this.renderPend();
    this.input.value = ""; this.input.style.height = "auto";
    if (this.t) {
      if (this.t.type === "group" && !S.groups.has(this.t.gid)) { this.t = null; }
      else openMsgSub(this.t);
    }
    S.thread = this.t;
    this.first = true;
  },
  leave() { closeMsgSub(); S.thread = null; },
  renderPend() {
    this.pendEl.hidden = !this.pend;
    this.pendEl.replaceChildren(...(this.pend ? [h("img", { src: this.pend, alt: "送る画像" }), h("button", { class: "icon-btn", "aria-label": "画像を外す", on: { click: () => { this.pend = null; this.renderPend(); } } }, icon("x"))] : []));
    this.syncSend();
  },
  syncSend() { this.sendBtn.disabled = this.sending || (!this.input.value.trim() && !this.pend) || !S.canWrite || isBanned(S.me) || !!S.msgErr; },
  async send() {
    const text = this.input.value.trim();
    if ((!text && !this.pend) || this.sending || !guard()) return;
    this.sending = true; this.syncSend();
    try { await sendMsg(text, this.pend); this.pend = null; this.renderPend(); this.input.value = ""; this.input.style.height = "auto"; this.stick = true; }
    catch (e) { fail(e); }
    finally { this.sending = false; this.syncSend(); }
  },
  setBar() {
    document.body.classList.toggle("in-thread", !!this.t);
    if (!this.t) { this.bar.replaceChildren(viewHead("メッセージ", { extra: h("button", { class: "btn small primary", id: "new-msg", on: { click: () => newMessage() } }, icon("plus", 16), "新規")})); return; }
    const back = () => go({ v: "msgs" });
    if (this.t.type === "dm") {
      const p = prof(this.t.peer);
      this.bar.replaceChildren(viewHead([p.name, badge(this.t.peer)], { back, sub: "@" + p.handle }));
    } else {
      const g = S.groups.get(this.t.gid) || {};
      this.bar.replaceChildren(viewHead(g.name || "グループ", { back, sub: (g.members || []).length + "人",
        extra: h("button", { class: "btn small", on: { click: () => groupInfo(this.t.gid) } }, icon("users", 16), "メンバー") }));
    }
  },
  update() {
    this.setBar();
    if (!this.t) {
      this.listWrap.hidden = false; this.threadEl.hidden = true;
      const cs = convList();
      reconcile(this.listEl, cs, {
        key: c => c.id,
        sig: c => [c.id, c.type === "dm" ? prof(c.peer).name + badgeKind(c.peer) + "|" + (prof(c.peer).img || "").length + "|" + prof(c.peer).hue : c.name, c.last, isUnread(c), c.count].join("|"),
        build: c => {
          const dm = c.type === "dm", p = dm ? prof(c.peer) : null;
          return h("button", { class: "conv", on: { click: () => openThread(dm ? { type: "dm", peer: c.peer } : { type: "group", gid: c.gid }) } },
            dm ? avatar(c.peer, 44) : groupAvatar(c.name, 44),
            h("div", { style: "min-width:0" }, h("div", { class: "name", style: "display:flex;align-items:center;gap:4px" }, dm ? p.name : c.name, dm ? badge(c.peer) : null),
              h("div", { class: "handle" }, dm ? "@" + p.handle : c.count + "人のグループ")),
            h("div", { style: "text-align:right" }, h("div", { class: "t" }, c.last ? rel(c.last) : ""), isUnread(c) ? h("span", { class: "dotu", "aria-label": "未読" }) : null));
        }
      });
      this.listEmpty.replaceChildren(cs.length ? "" : emptyBox("まだメッセージはありません", "右上の「新規」から、1対1のメッセージやグループを始められます。"));
      return;
    }
    this.listWrap.hidden = true; this.threadEl.hidden = false;
    this.statusEl.replaceChildren(S.msgErr ? h("div", { class: "banner warn" }, icon("lock", 18), h("p", null, S.msgErr)) : "");
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 140;
    let prevDay = null;
    const cdoc = this.t.type === "dm" ? S.dms.get(convId(S.me, this.t.peer)) : S.groups.get(this.t.gid);
    const seen = (cdoc && cdoc.seen) || {};
    const lastMine = [...S.msgs].reverse().find(m => m.from === S.me);
    const rows = S.msgs.map(m => {
      const d = dayKey(m.at); const label = d !== prevDay ? dayLabel(m.at) : null; prevDay = d;
      let rc = "";
      if (lastMine && m.id === lastMine.id) {
        if (this.t.type === "dm") rc = (seen[this.t.peer] || 0) >= m.at ? "既読" : "";
        else { const n = Object.keys(seen).filter(u => u !== S.me && seen[u] >= m.at).length; rc = n ? "既読 " + n : ""; }
      }
      return Object.assign({}, m, { _day: label, _rc: rc });
    });
    reconcile(this.msgBox, rows, {
      key: m => m.id,
      sig: m => [m.id, m._day, m.err, m.from === S.me, m._rc, !!m.img, m.from && this.t.type === "group" ? prof(m.from).name + badgeKind(m.from) : ""].join("|"),
      build: m => {
        const me = m.from === S.me;
        const w = h("div", { style: "display:contents" });
        if (m._day) w.append(h("div", { class: "dayline" }, m._day));
        w.append(h("div", { class: "msgrow" + (me ? " me" : "") },
          this.t.type === "group" && !me && m.from ? h("span", { class: "from" }, prof(m.from).name, badge(m.from)) : null,
          h("div", { class: "bubble" + (m.err ? " err" : "") + (m.img && !m.text ? " imgonly" : "") }, m.err ? "復号できないメッセージ" : [m.img ? h("img", { class: "dmimg", src: m.img, alt: "送られた画像", loading: "lazy" }) : null, m.text || null]),
          h("span", { class: "at" }, (m._rc ? m._rc + " · " : "") + hm(m.at))));
        return w;
      }
    });
    this.syncSend();
    const c = convList().find(x => x.id === (this.t.type === "dm" ? convId(S.me, this.t.peer) : this.t.gid));
    markRead(c); markSeen(this.t);
    if (this.first || this.stick || nearBottom) { this.first = false; this.stick = false; requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight)); }
  }
};
function pickUsers({ multi, onPick, exclude = [], needKey = true, empty = "メッセージを送れるユーザーがいません。相手が一度このサイトを開くと表示されます。" }) {
  const q = h("input", { id: "pick-q", type: "search", placeholder: "名前・@IDで絞り込む", autocomplete: "off" });
  const list = h("div", { class: "pick" });
  const sel = new Set();
  const draw = () => {
    const s = q.value.trim().toLowerCase().replace(/^@/, "");
    const ids = [...S.profiles.keys()].filter(u => u !== S.me && !exclude.includes(u) && !isBanned(u) && (!needKey || S.profiles.get(u).pub) &&
      ((prof(u).name || "") + " " + (prof(u).handle || "")).toLowerCase().includes(s));
    list.replaceChildren(...(ids.length ? ids.map(u => multi
      ? h("label", { class: "pickrow" }, h("input", { type: "checkbox", checked: sel.has(u), on: { change: e => { e.target.checked ? sel.add(u) : sel.delete(u); onPick(sel); } } }), avatar(u, 36),
        h("span", { style: "min-width:0" }, h("span", { class: "name", style: "display:block" }, prof(u).name), h("span", { class: "handle" }, "@" + prof(u).handle)))
      : h("button", { class: "pickrow single", on: { click: () => onPick(u) } }, avatar(u, 36),
        h("span", { style: "min-width:0" }, h("span", { class: "name", style: "display:block" }, prof(u).name), h("span", { class: "handle" }, "@" + prof(u).handle))))
      : [h("p", { class: "muted-p", style: "padding:12px 8px" }, empty)]));
  };
  q.addEventListener("input", draw); draw();
  return h("div", { class: "stack" }, q, list);
}
function newMessage() {
  if (!guard()) return;
  let mode = "dm", close;
  const body = h("div", { class: "stack" });
  const draw = () => {
    const tabs = h("div", { class: "tabs", role: "tablist" },
      h("button", { class: "tab", role: "tab", "aria-selected": String(mode === "dm"), on: { click: () => { mode = "dm"; draw(); } } }, "1対1"),
      h("button", { class: "tab", role: "tab", "aria-selected": String(mode === "group"), on: { click: () => { mode = "group"; draw(); } } }, "グループ"));
    if (mode === "dm") body.replaceChildren(tabs, pickUsers({ multi: false, onPick: u => { close(); openThread({ type: "dm", peer: u }); } }));
    else {
      const name = h("input", { id: "g-name", maxLength: 30, placeholder: "グループ名" });
      const btn = h("button", { class: "btn primary", id: "g-create", disabled: true }, "作成");
      let chosen = new Set();
      const check = () => { btn.disabled = !name.value.trim() || !chosen.size; };
      name.addEventListener("input", check);
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try { const gid = await createGroup(name.value.trim(), [...chosen]); close(); openThread({ type: "group", gid }); }
        catch (e) { fail(e); check(); }
      });
      body.replaceChildren(tabs, h("div", { class: "field" }, h("label", { for: "g-name" }, "グループ名"), name),
        pickUsers({ multi: true, onPick: s => { chosen = new Set(s); check(); } }), h("div", { class: "row end" }, btn));
    }
  };
  draw();
  close = modal("新しいメッセージ", body);
}
function groupInfo(gid) {
  const g = S.groups.get(gid);
  if (!g) return;
  const members = g.members || [];
  let close;
  const body = h("div", { class: "stack" },
    h("div", null, members.map(u => userRow(u, { compact: true, action: () => null }))),
    h("div", { class: "row" },
      h("button", { class: "btn small", on: { click: () => {
        close();
        let chosen = new Set();
        const add2 = h("button", { class: "btn primary", disabled: true }, "追加");
        add2.addEventListener("click", async () => {
          add2.disabled = true;
          try { await addMembers(gid, [...chosen]); c2(); toast("メンバーを追加しました。"); } catch (e) { fail(e); add2.disabled = false; }
        });
        const c2 = modal("メンバーを追加", h("div", { class: "stack" }, pickUsers({ multi: true, exclude: members, onPick: s => { chosen = new Set(s); add2.disabled = !chosen.size; } }), h("div", { class: "row end" }, add2)));
      } } }, icon("plus", 16), "メンバーを追加"),
      h("button", { class: "btn small danger", on: { click: async () => {
        const r = await confirmBox("このグループから抜けます。", { ok: "抜ける", danger: true });
        if (!r) return;
        try { close(); await leaveGroup(gid); go({ v: "msgs" }); } catch (e) { fail(e); }
      } } }, "グループから抜ける")),
    h("p", { class: "handle" }, "抜けても、これまでの鍵は手元に残ります。メンバーの削除はできません。"));
  close = modal(g.name, body);
}

/* ---------- staff (サイト主のみ) ---------- */
function addStaff() {
  if (!S.isOwner) { toast("運営メンバーを追加できるのはサイト主だけです。"); return; }
  let chosen = new Set();
  const btn = h("button", { class: "btn primary", id: "staff-confirm", disabled: true }, "追加");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      for (const u of chosen) {
        await S.db.doc("staff/" + u).set({ at: Date.now(), by: S.me });
        await logAdmin("運営に追加", "@" + prof(u).handle, "");
      }
      close(); toast("運営メンバーを追加しました。");
    } catch (e) { fail(e); btn.disabled = false; }
  });
  const close = modal("運営メンバーを追加", h("div", { class: "stack" },
    pickUsers({ multi: true, needKey: false, exclude: [...S.staff.keys()], empty: "追加できるユーザーがいません。相手が一度このサイトを開いて登録すると表示されます。", onPick: s => { chosen = new Set(s); btn.disabled = !chosen.size; } }),
    h("div", { class: "row end" }, btn)));
}
async function removeStaff(u) {
  if (!S.isOwner) return;
  const r = await confirmBox("@" + prof(u).handle + " を運営から外します。チェックマークも消えます。", { ok: "外す", danger: true });
  if (!r) return;
  try { await S.db.doc("staff/" + u).delete(); await logAdmin("運営から外す", "@" + prof(u).handle, ""); toast("外しました。"); }
  catch (e) { fail(e); }
}

/* ---------- views: admin ---------- */
const ADMIN_TABS = [["overview", "概要"], ["users", "ユーザー"], ["posts", "ポスト"], ["reports", "通報"], ["groups", "グループ"], ["staff", "運営メンバー"], ["settings", "サイト設定"], ["log", "操作ログ"]];
V.admin = {
  el: h("section"), tab: "overview",
  init() {
    this.tabsEl = h("div", { class: "admin-tabs", role: "tablist" }, ADMIN_TABS.filter(([id]) => id !== "staff" || S.isOwner).map(([id, label]) =>
      h("button", { class: "tab", role: "tab", id: "atab-" + id, on: { click: () => { this.tab = id; this.show(); } } }, label)));
    this.body = h("div");
    // overview
    this.ovStats = h("div", { class: "stats" }); this.ovChart = h("div");
    this.ov = h("div", { class: "pad" }, this.ovStats, h("div", null, this.ovChart));
    // users
    this.uq = h("input", { id: "admin-uq", type: "search", placeholder: "ユーザーを検索", on: { input: () => this.update() } });
    this.uTable = h("div", { class: "tbl-wrap" });
    this.us = h("div", { class: "pad" }, this.uq,
      h("p", { class: "muted-p" }, "停止すると、そのユーザーはポスト・いいね・フォロー・メッセージ送信ができなくなり、ポストは一般ユーザーから見えなくなります。サーバー側でも書き込みが止まります。"), this.uTable);
    // posts
    this.pq = h("input", { id: "admin-pq", type: "search", placeholder: "ポストを検索", on: { input: () => this.update() } });
    this.pTable = h("div", { class: "tbl-wrap" });
    this.ps = h("div", { class: "pad" }, this.pq, this.pTable);
    // reports
    this.rpList = h("div", { class: "tbl-wrap" });
    this.rp = h("div", { class: "pad" }, h("p", { class: "muted-p" }, "ユーザーから届いた通報です。内容を確認して、ポストの削除や利用停止などの対応をして、「対応済み」にしてください。同じ相手への新しい通報があると、また未対応に戻ります。"), this.rpList);
    // groups
    this.gTable = h("div", { class: "tbl-wrap" });
    this.gs = h("div", { class: "pad" }, h("p", { class: "muted-p" }, "グループ名と人数だけを表示します。メッセージの本文は暗号化されており、ここからは読めません。"), this.gTable);
    // staff (サイト主のみ)
    this.sfList = h("div", { class: "tbl-wrap" });
    this.sf = h("div", { class: "pad" },
      h("p", { class: "muted-p" }, "運営メンバーには名前の横にチェックマークが付き、運営画面が使えるようになります。追加と削除ができるのはサイト主だけです。運営以外の人にチェックマークを付けたいときは、「ユーザー」タブの「認証する」を使います。"),
      h("p", { class: "muted-p" }, "運営メンバーに追加すると、その人は運営画面で投稿の削除や利用停止などができるようになります。"),
      h("div", { class: "row" }, h("button", { class: "btn primary", id: "staff-add", on: { click: () => addStaff() } }, icon("plus", 16), "運営メンバーを追加")),
      this.sfList);
    // settings
    this.sName = h("input", { id: "set-name", maxLength: 20, placeholder: "Lyncs_Chat" });
    this.sUrl = h("input", { id: "set-url", type: "url", placeholder: "https://example.com", autocomplete: "off" });
    this.aText = h("textarea", { id: "set-announce", rows: 3, maxLength: 300, placeholder: "全員の画面上部に表示するお知らせ" });
    this.aTone = h("select", { id: "set-tone" }, h("option", { value: "info" }, "通常のお知らせ"), h("option", { value: "warn" }, "注意(目立つ色)"));
    this.sSign = h("input", { type: "checkbox", id: "set-signups" });
    this.sLen = h("input", { type: "number", id: "set-maxlen", min: 50, max: 1000, step: 10 });
    this.sLogin = h("select", { id: "set-login" }, h("option", { value: "1" }, "ログインが必要(登録した人だけが見られる)"), h("option", { value: "0" }, "ログイン不要(登録しなくても見られる。見るだけ)"));
    this.sTerms = h("textarea", { id: "set-terms", rows: 5, maxLength: 3000, placeholder: "登録のときに表示する利用規約。空にすると表示しません。" });
    this.sApprove = h("input", { type: "checkbox", id: "set-approve" });
    this.sMaint = h("input", { type: "checkbox", id: "set-maint" });
    this.sMaintText = h("textarea", { id: "set-maint-text", rows: 3, maxLength: 300, placeholder: "例: 14時まで更新作業をしています。終わるまでお待ちください。" });
    this.st = h("div", { class: "pad" },
      h("div", { class: "field" }, h("label", { for: "set-name" }, "サイト名"), this.sName, h("div", { class: "hint" }, "ロゴの横や登録画面に表示されます。")),
      h("div", { class: "field" }, h("label", { for: "set-url" }, "サイトのURL"), this.sUrl, h("div", { class: "hint" }, "ここに入れたアドレスが、左メニューや検索画面の「公式サイト」リンクになります。いつでも自由に変更できます(http:// か https:// で始まる形)。")),
      h("div", { class: "hint", style: "margin:-4px 0 14px" }, "このページ自体のアドレス(いま見ているURL)は、公開した場所のサービス側で決まるため、サイト内からは書き換えられません。独自のURLで見せたい場合は、上の「サイトのURL」にそのアドレスを入れてください。"),
      h("div", { class: "field" }, h("label", { for: "set-announce" }, "お知らせ"), this.aText, this.aTone),
      h("label", { class: "switch-row", for: "set-signups" }, h("span", null, "新規登録を受け付ける", h("span", { class: "hint", style: "display:block;font-size:12px;color:var(--ink3)" }, "オフにすると、まだ登録していない人は始められません。")), this.sSign),
      h("div", { class: "field" }, h("label", { for: "set-maxlen" }, "ポストの最大文字数"), this.sLen),
      h("div", { class: "field" }, h("label", { for: "set-login" }, "ログイン"), this.sLogin, h("div", { class: "hint" }, "「不要」にすると、ログインしていない人もポストを見られます(見るだけ。ポスト・いいね・メッセージは登録が必要)。「必要」にすると、ログインしていない人には何も表示されません。")),
      h("div", { class: "field" }, h("label", { for: "set-terms" }, "利用規約"), this.sTerms, h("div", { class: "hint" }, "登録のときに「同意する」にチェックしてもらいます。すでに登録している人には、次に開いたときに一度だけ表示します。")),
      h("label", { class: "switch-row", for: "set-approve" }, h("span", null, "登録を承認制にする", h("span", { class: "hint", style: "display:block;font-size:12px;color:var(--ink3)" }, "オンにしたあとに登録した人は、運営が「ユーザー」タブで承認するまで、見ることだけができます。それ以前に登録した人は、そのまま使えます。")), this.sApprove),
      h("label", { class: "switch-row", for: "set-maint" }, h("span", null, "メンテナンスモード", h("span", { class: "hint", style: "display:block;font-size:12px;color:var(--ink3)" }, "オンにすると、運営以外の人には案内の画面だけが表示され、ポストなどの書き込みもできなくなります。運営は、いつもどおり使えます。更新が終わったら、オフに戻してください。")), this.sMaint),
      h("div", { class: "field" }, h("label", { for: "set-maint-text" }, "メンテナンスの案内文"), this.sMaintText),
      h("div", { class: "row end" },
        h("button", { class: "btn", on: { click: () => this.clearAnnounce() } }, "お知らせを消す"),
        h("button", { class: "btn primary", id: "set-save", on: { click: () => this.saveSettings() } }, "保存する")));
    // log
    this.lg = h("div", { class: "pad" });
    this.el.append(viewHead("運営", { sub: "運営メンバーだけに表示される画面です" }), this.tabsEl, this.body);
  },
  enter(r) { if (r.tab) this.tab = r.tab; this.fillSettings(); },
  fillSettings() {
    const c = cfg();
    this.sName.value = c.name || "";
    this.sUrl.value = c.url || "";
    this.aText.value = c.announce?.text || "";
    this.aTone.value = c.announce?.tone || "info";
    this.sSign.checked = c.signups !== false;
    this.sLen.value = c.maxLen;
    this.sLogin.value = c.loginRequired ? "1" : "0";
    this.sTerms.value = c.terms || "";
    this.sApprove.checked = !!c.requireApproval;
    this.sMaint.checked = !!(c.maintenance && c.maintenance.on);
    this.sMaintText.value = (c.maintenance && c.maintenance.text) || "";
  },
  async saveSettings() {
    const text = this.aText.value.trim();
    const len = Math.min(1000, Math.max(50, parseInt(this.sLen.value, 10) || 300));
    const name = this.sName.value.trim() || "Lyncs_Chat";
    const url = this.sUrl.value.trim();
    if (url && !safeUrl(url)) { toast("サイトのURLは http:// か https:// で始まる形式で入力してください。"); return; }
    const was = cfg();
    const approve = this.sApprove.checked;
    const next = { name, url, signups: this.sSign.checked, maxLen: len, loginRequired: this.sLogin.value === "1", terms: this.sTerms.value.trim(), requireApproval: approve, approvalSince: approve && !was.requireApproval ? Date.now() : (was.approvalSince || 0), announce: text ? { text, tone: this.aTone.value, at: Date.now() } : null, maintenance: { on: this.sMaint.checked, text: this.sMaintText.value.trim() } };
    try { await S.db.doc("site/config").set(next); await logAdmin("設定を保存", "", "メンテナンス" + (next.maintenance.on ? "オン" : "オフ") + " / サイト名「" + name + "」 / お知らせ" + (text ? "あり" : "なし") + " / 登録" + (next.signups ? "受付" : "停止") + " / " + len + "文字" + " / ログイン" + (next.loginRequired ? "必要" : "不要") + " / 承認制" + (approve ? "オン" : "オフ")); toast("保存しました。"); }
    catch (e) { fail(e); }
  },
  async clearAnnounce() {
    try { await S.db.doc("site/config").set(Object.assign({}, cfg(), { announce: null })); this.aText.value = ""; await logAdmin("お知らせを削除", "", ""); toast("お知らせを消しました。"); }
    catch (e) { fail(e); }
  },
  show() {
    $$(".tab", this.tabsEl).forEach(t => t.setAttribute("aria-selected", String(t.id === "atab-" + this.tab)));
    const map = { overview: this.ov, users: this.us, posts: this.ps, reports: this.rp, groups: this.gs, staff: this.sf, settings: this.st, log: this.lg };
    if (this.tab === "staff" && !S.isOwner) this.tab = "overview";
    const el = map[this.tab];
    if (this.body.firstChild !== el) this.body.replaceChildren(el);
    this.update();
  },
  update() {
    if (!canAdmin()) return;
    if (!this.body.firstChild) { this.show(); return; }
    $$(".tab", this.tabsEl).forEach(t => t.setAttribute("aria-selected", String(t.id === "atab-" + this.tab)));
    { const n = openReports(), tb = $("#atab-reports", this.tabsEl); if (tb) { const txt = "通報" + (n ? "(" + n + ")" : ""); if (tb.textContent !== txt) tb.textContent = txt; } }
    if (this.tab === "overview") this.renderOverview();
    else if (this.tab === "users") this.renderUsers();
    else if (this.tab === "posts") this.renderPosts();
    else if (this.tab === "reports") this.renderReports();
    else if (this.tab === "groups") this.renderGroups();
    else if (this.tab === "staff") this.renderStaff();
    else if (this.tab === "log") this.renderLog();
  },
  renderReports() {
    const gs = reportGroups();
    const rows = gs.map(e => {
      const po = e.k === "post" ? S.postById.get(e.t) : null;
      const who = prof(e.tu);
      const open = e.k === "post" ? () => (po ? openPost(e.t) : toast("このポストはすでに削除されています。")) : () => toProfile(e.tu);
      return h("tr", { class: e.done ? "done-row" : "" },
        h("td", null, h("div", { class: "name" }, e.k === "post" ? "ポスト" : "ユーザー"), h("div", { class: "handle" }, who.name + " @" + who.handle)),
        h("td", { class: "cell-text" }, e.k === "post" ? (po ? (po.text || "(画像・動画)") : "(削除済み)  " + (e.s || "")) : (e.s || who.name)),
        h("td", null, e.list.map(x => h("div", { class: "handle" }, x.r + (x.n ? ":" + x.n : "") + "(@" + prof(x.by).handle + ")"))),
        h("td", null, h("div", { class: "row", style: "flex-wrap:nowrap" },
          h("button", { class: "btn small", on: { click: open } }, "開く"),
          e.k === "post" && po ? h("button", { class: "btn small danger", on: { click: () => deletePost(po) } }, icon("trash", 14), "削除") : null,
          e.k === "user" && !S.bans.has(e.tu) && e.tu !== S.me ? h("button", { class: "btn small danger", on: { click: () => this.ban(e.tu) } }, icon("ban", 14), "停止") : null,
          e.done ? h("span", { class: "pill ok" }, "対応済み") : h("button", { class: "btn small primary rp-done", on: { click: () => this.resolve(e) } }, "対応済み"))));
    });
    this.rpList.replaceChildren(h("table", { class: "tbl" },
      h("thead", null, h("tr", null, ["対象", "内容", "理由(通報した人)", ""].map(t => h("th", null, t)))),
      h("tbody", null, rows.length ? rows : h("tr", null, h("td", { colSpan: 4 }, "通報はまだありません。")))));
  },
  async resolve(e) {
    const done = Object.assign({}, S.reportDone);
    done[e.key] = { at: Date.now(), by: S.me };
    const keys = Object.keys(done);
    if (keys.length > 300) keys.sort((a, b) => done[a].at - done[b].at).slice(0, keys.length - 300).forEach(k => delete done[k]);
    try { await S.db.doc("admin/reports").set({ done }); await logAdmin("通報を対応済みに", e.k === "post" ? "ポスト" : "@" + prof(e.tu).handle, ""); toast("対応済みにしました。"); }
    catch (er) { fail(er); }
  },
  renderStaff() {
    const ids = [...S.staff.keys()].sort((a, b) => (S.staff.get(a).at || 0) - (S.staff.get(b).at || 0));
    const rows = ids.map(u => {
      const d = S.staff.get(u), p = prof(u);
      return h("tr", null,
        h("td", null, h("div", { class: "cell-user" }, avatar(u, 30), h("div", null, h("div", { class: "name", style: "display:flex;align-items:center;gap:4px" }, p.name, badge(u)), h("div", { class: "handle" }, "@" + p.handle)))),
        h("td", null, d.owner ? h("span", { class: "pill ok" }, "サイト主") : h("span", { class: "pill" }, "運営")),
        h("td", null, d.at ? new Date(d.at).toLocaleDateString("ja-JP") : "-"),
        h("td", null, d.owner ? "" : h("button", { class: "btn small danger", on: { click: () => removeStaff(u) } }, "外す")));
    });
    this.sfList.replaceChildren(h("table", { class: "tbl" },
      h("thead", null, h("tr", null, ["メンバー", "役割", "追加日", ""].map(t => h("th", null, t)))),
      h("tbody", null, rows.length ? rows : h("tr", null, h("td", { colSpan: 4 }, "まだ運営メンバーはいません。")))));
  },
  renderOverview() {
    const day = 86400000, now = Date.now();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const mk = () => { const bs = []; for (let i = 13; i >= 0; i--) { const d = new Date(start); d.setDate(d.getDate() - i); bs.push({ t: d.getTime(), c: 0, label: (d.getMonth() + 1) + "/" + d.getDate() }); } return bs; };
    const idx = (bs, t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); const i = Math.round((d.getTime() - bs[0].t) / day); return i >= 0 && i < 14 ? i : -1; };
    const posts = mk(), joins = mk(), act = mk(), actSets = act.map(() => new Set());
    for (const p of S.posts) { const i = idx(posts, p.at); if (i >= 0) { posts[i].c++; actSets[i].add(p.uid); } }
    for (const [u, p] of S.profiles) { if (!p.joined) continue; const i = idx(joins, p.joined); if (i >= 0) joins[i].c++; }
    for (const [u, l] of S.likes) for (const id of Object.keys(l.t || {})) { const i = idx(act, l.t[id]); if (i >= 0) actSets[i].add(u); }
    act.forEach((b, i) => { b.c = actSets[i].size; });
    const w7 = new Set(); for (let i = 7; i < 14; i++) actSets[i].forEach(u => w7.add(u));
    const likes = [...S.likeCount.values()].reduce((a, b) => a + b, 0);
    const stat = (n, l) => h("div", { class: "stat" }, h("b", null, n), h("span", null, l));
    this.ovStats.replaceChildren(
      stat(S.profiles.size, "ユーザー"), stat(S.posts.length, "ポスト"),
      stat(S.posts.filter(p => now - p.at < day).length, "24時間のポスト"),
      stat(actSets[13].size, "今日のアクティブ"), stat(w7.size, "7日間のアクティブ"), stat(joins[13].c, "今日の新規登録"),
      stat(likes, "いいね"), stat(S.allGroups.size, "グループ"), stat(S.bans.size, "停止中"), stat([...S.profiles.keys()].filter(pendingOf).length, "承認待ち"), stat(openReports(), "未対応の通報"));
    const chart = (bs, label) => h("div", { class: "bars", role: "img", "aria-label": label }, (() => {
      const max = Math.max(1, ...bs.map(b => b.c));
      return bs.map((b, i) => h("div", { class: "bar-col", title: b.label + ": " + b.c }, h("span", { class: "bar-n" }, b.c ? String(b.c) : ""),
        h("div", { class: "bar-track" }, h("div", { class: "bar", style: "height:" + (b.c ? Math.max(4, b.c / max * 100) : 0) + "%" })),
        h("span", { class: "bar-l" }, i % 2 === 1 || i === 13 ? b.label : "")));
    })());
    this.ovChart.replaceChildren(
      h("h2", { class: "panel-title" }, "ポスト数(直近14日)"), chart(posts, "直近14日のポスト数"),
      h("h2", { class: "panel-title", style: "margin-top:22px" }, "アクティブ人数(ポストかいいねをした人・直近14日)"), chart(act, "直近14日のアクティブ人数"),
      h("h2", { class: "panel-title", style: "margin-top:22px" }, "新規登録(直近14日)"), chart(joins, "直近14日の新規登録"));
  },
  renderUsers() {
    const q = this.uq.value.trim().toLowerCase().replace(/^@/, "");
    const ids = [...S.profiles.keys()].filter(u => !q || ((prof(u).name || "") + " " + (prof(u).handle || "")).toLowerCase().includes(q))
      .sort((a, b) => (prof(b).joined || 0) - (prof(a).joined || 0));
    const rows = ids.map(u => {
      const p = prof(u), ban = S.bans.get(u);
      return h("tr", null,
        h("td", null, h("div", { class: "cell-user" }, avatar(u, 30), h("div", null, h("div", { class: "name", style: "display:flex;align-items:center;gap:4px" }, p.name, badge(u)), h("div", { class: "handle" }, "@" + p.handle)))),
        h("td", null, p.joined ? new Date(p.joined).toLocaleDateString("ja-JP") : "-"),
        h("td", { class: "num" }, S.posts.filter(x => x.uid === u).length),
        h("td", { class: "num" }, followerCount(u)),
        h("td", null, h("div", { class: "row", style: "gap:4px" },
          ban ? h("span", { class: "pill warn" }, "停止中") : h("span", { class: "pill ok" }, "通常"),
          S.staff.has(u) ? h("span", { class: "pill" }, "運営") : null,
          marksOf(u).filter(k => k !== "s").map(k => h("span", { class: "pill" }, MARKS[k].label.split("(")[0])),
          pendingOf(u) ? h("span", { class: "pill warn" }, "承認待ち") : null)),
        h("td", null, h("div", { class: "row", style: "flex-wrap:nowrap" },
          pendingOf(u) ? h("button", { class: "btn small primary", on: { click: () => approveUser(u, true) } }, "承認") : null,
          h("button", { class: "btn small mk-btn" + (S.verified.has(u) ? " on" : ""), on: { click: () => marksModal(u) } }, "マーク"),
          u === S.me ? null : (ban
            ? h("button", { class: "btn small", on: { click: () => this.unban(u) } }, "停止を解除")
            : h("button", { class: "btn small danger", on: { click: () => this.ban(u) } }, icon("ban", 14), "停止")))));
    });
    this.uTable.replaceChildren(h("table", { class: "tbl" },
      h("thead", null, h("tr", null, ["ユーザー", "登録日", "ポスト", "フォロワー", "状態", ""].map(t => h("th", null, t)))),
      h("tbody", null, rows.length ? rows : h("tr", null, h("td", { colSpan: 6 }, "該当するユーザーがいません。")))));
  },
  async ban(u) {
    const r = await confirmBox("@" + prof(u).handle + " の利用を停止します。", { ok: "停止する", danger: true, reason: true });
    if (!r) return;
    try { await S.db.doc("bans/" + u).set({ at: Date.now(), by: S.me, reason: r.reason }); await logAdmin("利用停止", "@" + prof(u).handle, r.reason); toast("停止しました。"); }
    catch (e) { fail(e); }
  },
  async unban(u) {
    try { await S.db.doc("bans/" + u).delete(); await logAdmin("停止を解除", "@" + prof(u).handle, ""); toast("解除しました。"); }
    catch (e) { fail(e); }
  },
  renderPosts() {
    const q = this.pq.value.trim().toLowerCase();
    const posts = S.posts.filter(p => !q || (p.text || "").toLowerCase().includes(q) || (prof(p.uid).handle || "").toLowerCase().includes(q.replace(/^@/, ""))).slice(0, 100);
    const rows = posts.map(p => h("tr", null,
      h("td", null, h("div", { class: "cell-user" }, avatar(p.uid, 30), h("div", null, h("div", { class: "name" }, prof(p.uid).name), h("div", { class: "handle" }, "@" + prof(p.uid).handle)))),
      h("td", { class: "cell-text" }, p.text || "", (p.media || []).length ? h("div", { class: "handle" }, "添付 " + p.media.length + "件") : null),
      h("td", { class: "num" }, S.likeCount.get(p.id) || 0),
      h("td", null, fullDate(p.at)),
      h("td", null, h("div", { class: "row", style: "flex-wrap:nowrap" },
        h("button", { class: "btn small" + (S.picks.has(p.id) ? " on" : ""), on: { click: () => togglePick(p) } }, icon("star", 14), S.picks.has(p.id) ? "おすすめ中" : "おすすめ"),
        h("button", { class: "btn small danger", on: { click: () => deletePost(p) } }, icon("trash", 14), "削除")))));
    this.pTable.replaceChildren(h("table", { class: "tbl" },
      h("thead", null, h("tr", null, ["投稿者", "内容", "いいね", "日時", ""].map(t => h("th", null, t)))),
      h("tbody", null, rows.length ? rows : h("tr", null, h("td", { colSpan: 5 }, "該当するポストがありません。")))));
  },
  renderGroups() {
    const gs = [...S.allGroups.entries()].sort((a, b) => (b[1].created || 0) - (a[1].created || 0));
    const rows = gs.map(([id, g]) => h("tr", null,
      h("td", null, g.name), h("td", { class: "num" }, (g.members || []).length),
      h("td", null, "@" + prof(g.owner).handle), h("td", null, g.created ? new Date(g.created).toLocaleDateString("ja-JP") : "-"),
      h("td", null, h("button", { class: "btn small danger", on: { click: async () => {
        const r = await confirmBox("グループ「" + g.name + "」を削除します。メンバーの一覧から消えます。", { ok: "削除する", danger: true, reason: true });
        if (!r) return;
        try { await S.db.doc("groups/" + id).delete(); await logAdmin("グループ削除", g.name, r.reason); toast("削除しました。"); } catch (e) { fail(e); }
      } } }, icon("trash", 14), "削除"))));
    this.gTable.replaceChildren(h("table", { class: "tbl" },
      h("thead", null, h("tr", null, ["グループ名", "人数", "作成者", "作成日", ""].map(t => h("th", null, t)))),
      h("tbody", null, rows.length ? rows : h("tr", null, h("td", { colSpan: 5 }, "グループはまだありません。")))));
  },
  renderLog() {
    this.lg.replaceChildren(S.audit.length ? S.audit.map(e => h("div", { class: "logline" },
      h("time", null, fullDate(e.at)),
      h("div", null, h("b", null, e.act), e.target ? " " + e.target : "", e.detail ? h("div", { class: "handle" }, e.detail) : null,
        h("div", { class: "handle" }, "担当: " + (prof(e.by).name)))))
      : emptyBox("まだ操作の記録はありません", "ポストの削除や利用停止などを行うと、ここに残ります。"));
  }
};

/* ---------- onboarding ---------- */
function buildOnboard() {
  const box = $("#onboard");
  if (box.dataset.built) return;
  box.dataset.built = "1";
  let hue = HUES[Math.floor(Math.random() * HUES.length)];
  const name = h("input", { id: "ob-name", maxLength: 24, placeholder: "例: ことは", autocomplete: "off" });
  const handle = h("input", { id: "ob-handle", maxLength: 15, placeholder: "kotoha_01", autocomplete: "off" });
  const bio = h("textarea", { id: "ob-bio", rows: 2, maxLength: 100, placeholder: "ひとこと(あとで変えられます)" });
  const err = h("div", { class: "err" });
  const sw = h("div", { class: "swatches", role: "radiogroup", "aria-label": "アイコンの色" });
  const draw = () => sw.replaceChildren(...HUES.map(x => h("button", { class: "swatch", role: "radio", "aria-checked": String(x === hue), "aria-label": "色 " + x, style: "background:hsl(" + x + " 42% 36%)", on: { click: () => { hue = x; draw(); ap.redraw(); } } })));
  draw();
  const ap = avatarPicker("", () => name.value, () => hue);
  const go1 = h("button", { class: "btn primary", id: "ob-go", style: "width:100%;padding:11px" }, "はじめる");
  const closed = h("p", { class: "muted-p", hidden: true }, "現在、新規登録は受け付けていません。運営に連絡してください。");
  const agree = h("input", { type: "checkbox", id: "ob-agree" });
  const termsBox = h("div", { class: "termsbox" });
  const termsWrap = h("div", { class: "field", hidden: true }, h("label", null, "利用規約"), termsBox, h("label", { class: "agree" }, agree, h("span", null, "利用規約に同意します")));
  const back = h("button", { class: "btn", id: "ob-back", hidden: true, style: "width:100%", on: { click: () => { S.wantReg = false; schedule(); } } }, "ゲストのまま見る");
  S.ob = { agree, termsBox, termsWrap, back, closed, err };
  go1.addEventListener("click", async () => {
    err.textContent = "";
    const n = name.value.trim(), hd = handle.value.trim().toLowerCase();
    if (!n) { err.textContent = "表示名を入力してください。"; return; }
    if (!/^[a-z0-9_]{3,15}$/.test(hd)) { err.textContent = "ユーザーIDは半角の英小文字・数字・_ で3〜15文字にしてください。"; return; }
    if ([...S.profiles.values()].some(p => p.handle === hd)) { err.textContent = "そのユーザーIDはすでに使われています。"; return; }
    if (!cfg().signups && !S.isAdmin) { closed.hidden = false; return; }
    if (!S.canWrite) { err.textContent = "閲覧のみのアカウントのため、登録できません。"; return; }
    if (cfg().terms && !agree.checked) { err.textContent = "利用規約への同意が必要です。"; return; }
    go1.disabled = true;
    try {
      const pub = await ensureKeys();
      await S.db.doc("profiles/" + S.me).set({ handle: hd, name: n, bio: bio.value.trim(), hue, img: ap.get(), pub: pub || null, joined: Date.now(), terms: cfg().terms ? Date.now() : 0 });
    } catch (e) { fail(e); go1.disabled = false; }
  });
  box.append(h("div", { class: "card stack", style: "text-align:left" },
    h("div", { style: "display:flex;justify-content:center" }, brand()),
    h("h1", { style: "font:700 20px var(--font-d);text-align:center" }, siteName + "へようこそ"),
    h("p", { class: "muted-p", style: "text-align:center" }, "ここで使う名前を決めてください。"),
    h("div", { class: "field" }, h("label", { for: "ob-name" }, "表示名"), name),
    h("div", { class: "field" }, h("label", { for: "ob-handle" }, "ユーザーID"), h("div", { class: "prefix" }, h("span", null, "@"), handle), h("div", { class: "hint" }, "半角の英小文字・数字・_ / 3〜15文字。あとから変更できません。")),
    h("div", { class: "field" }, h("label", null, "アイコン画像(任意)"), ap.el),
    h("div", { class: "field" }, h("label", { for: "ob-bio" }, "自己紹介(任意)"), bio),
    h("div", { class: "field" }, h("label", null, "アイコンの色"), sw),
    termsWrap, err, closed, go1, back));
}
function updateOnboard() {
  if (!S.ob) return;
  const c = cfg();
  S.ob.termsWrap.hidden = !c.terms;
  if (S.ob.termsBox.textContent !== c.terms) S.ob.termsBox.textContent = c.terms || "";
  S.ob.back.hidden = !!c.loginRequired;
  S.ob.closed.hidden = c.signups || S.isAdmin;
  const done = $("#ob-go"); if (done && c.requireApproval && !S.isOwner) done.textContent = "登録を申し込む";
}

/* ---------- subscriptions & boot ---------- */
let raf = 0;
function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
function onErr(path, e) { console.warn(path, e); S.loaded[path] = true; schedule(); }
function subColl(path, store, key, q) {
  const ref = q || S.db.collection(path);
  S.unsubs.push(ref.onSnapshot(snap => {
    store.clear();
    snap.docs.forEach(d => store.set(d.id, d.data()));
    S.loaded[key || path] = true; schedule();
  }, e => onErr(key || path, e)));
}
function subscribeAll() {
  const db = S.db;
  subColl("profiles", S.profiles);
  subColl("feed", S.feeds);
  subColl("follows", S.follows);
  subColl("likes", S.likes);
  subColl("bans", S.bans);
  subColl("staff", S.staff);
  subColl("verified", S.verified);
  subColl("picks", S.picks);
  subColl("votes", S.votes);
  subColl("approved", S.approved);
  S.unsubs.push(db.doc("site/config").onSnapshot(s => { S.config = s.exists ? s.data() : {}; S.loaded.config = true; schedule(); }, e => onErr("config", e)));
  if (S.isAdmin) {
    subColl("groups", S.allGroups, "allgroups", db.collection("groups"));
    subColl("reports", S.reports);
    S.unsubs.push(db.doc("admin/reports").onSnapshot(s => { S.reportDone = s.exists ? (s.data().done || {}) : {}; schedule(); }, e => console.warn(e)));
    S.unsubs.push(db.doc("admin/audit").onSnapshot(s => { S.audit = s.exists ? (s.data().items || []) : []; schedule(); }, e => console.warn(e)));
  }
}
let userSubbed = false;
function subscribeUser() {
  if (userSubbed || !S.me) return;
  userSubbed = true;
  const db = S.db;
  subColl("dm", S.dms, "dm", db.collection("dm").where("members", "array-contains", S.me));
  subColl("groups", S.groups, "groups", db.collection("groups").where("members", "array-contains", S.me));
  S.unsubs.push(db.doc("data/users/" + S.me + "/reads").onSnapshot(s => { S.reads = s.exists ? s.data() : {}; schedule(); }, e => console.warn(e)));
  S.unsubs.push(db.doc("data/users/" + S.me + "/settings").onSnapshot(s => { S.settings = Object.assign({ presence: "online" }, s.exists ? s.data() : {}); S.loaded.settings = true; schedule(); beat(); }, e => { S.loaded.settings = true; console.warn(e); }));
  S.unsubs.push(db.doc("data/users/" + S.me + "/drafts").onSnapshot(s => { S.drafts = s.exists ? (s.data().items || []) : []; if (S.onDrafts) S.onDrafts(); schedule(); }, e => console.warn(e)));
  S.unsubs.push(db.doc("data/users/" + S.me + "/prefs").onSnapshot(s => { S.prefs = Object.assign({ mute: [], block: [] }, s.exists ? s.data() : {}); schedule(); }, e => console.warn(e)));
}
function startRegister() {
  if (!S.me) { window.__auth.show("register"); return; }
  S.wantReg = true; schedule();
}
function accountModal() {
  const me = window.__me || {};
  const oldPw = h("input", { id: "ac-old", type: "password", autocomplete: "current-password" });
  const newPw = h("input", { id: "ac-new", type: "password", autocomplete: "new-password", placeholder: "8文字以上" });
  const msg = h("div", { class: "err", id: "ac-msg" });
  const save = h("button", { class: "btn primary", id: "ac-save", on: { click: async () => {
    msg.textContent = ""; save.disabled = true;
    try {
      const r = await fetch("/api/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldPassword: oldPw.value, newPassword: newPw.value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "変更できませんでした。");
      oldPw.value = ""; newPw.value = ""; toast("パスワードを変更しました。他の端末ではログアウトされます。");
    } catch (e) { msg.textContent = e.message; } finally { save.disabled = false; }
  } } }, "パスワードを変更");
  const out = h("button", { class: "btn danger", id: "ac-logout", on: { click: async () => { try { await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch (e) { /* ignore */ } location.reload(); } } }, "ログアウト");
  modal("アカウント", h("div", { class: "stack" },
    h("p", { class: "muted-p" }, "ログインID: " + (me.login || "")),
    h("div", { class: "field" }, h("label", { for: "ac-old" }, "いまのパスワード"), oldPw),
    h("div", { class: "field" }, h("label", { for: "ac-new" }, "新しいパスワード"), newPw),
    msg, h("div", { class: "row end" }, save), h("hr"), h("div", { class: "row" }, out)));
}
let appShown = false, ownerSeeded = false;
function stage(name) {
  for (const id of ["gate", "loading", "onboard", "app"]) $("#" + id).hidden = id !== name;
  if (name !== "app") $("#tabbar").hidden = true;
}
let termsAsked = false;
function termsPrompt() {
  termsAsked = true;
  let close;
  const box = h("div", { class: "termsbox" }, cfg().terms);
  const ok = h("button", { class: "btn primary", id: "terms-ok" }, "同意する");
  ok.addEventListener("click", async () => {
    ok.disabled = true;
    try { await S.db.doc("profiles/" + S.me).update({ terms: Date.now() }); close(); } catch (e) { fail(e); ok.disabled = false; }
  });
  close = modal("利用規約", h("div", { class: "stack" }, h("p", { class: "muted-p" }, "利用規約が設定されました。内容を確認して、同意してください。"), box, h("div", { class: "row end" }, ok)));
}
function maintScreen(on, text) {
  let m = $("#maint");
  if (!on) { if (m) m.remove(); return; }
  const msg = (text || "").trim() || "ただいま、サイトの更新作業をしています。しばらくしてから、もう一度開いてください。";
  if (!m) {
    m = h("div", { id: "maint", class: "maint", role: "alert" }, h("div", { class: "card stack", style: "max-width:420px;text-align:center" },
      h("h1", { style: "font:700 22px var(--font-d)" }, "メンテナンス中"), h("p", { class: "muted-p", id: "maint-text", style: "white-space:pre-wrap" }),
      h("button", { class: "btn primary", id: "maint-reload", on: { click: () => location.reload() } }, "再読み込み")));
    document.body.append(m);
  }
  $("#maint-text", m).textContent = msg;
}
function render() {
  if (!S.booted) return;
  if (!S.loaded.profiles || !S.loaded.feed || !S.loaded.config) { stage("loading"); return; }
  applyBrand();
  const mt = cfg().maintenance, inMaint = !!(mt && mt.on) && !(S.isAdmin || S.isOwner);
  maintScreen(inMaint, mt && mt.text);
  if (inMaint) return;
  const c = cfg();
  const mine = S.me ? S.profiles.get(S.me) : null;
  if (!mine) {
    const canGuest = !c.loginRequired && !S.wantReg;
    if (!S.me && c.loginRequired) { stage("gate"); return; }
    if (!canGuest) { stage("onboard"); buildOnboard(); updateOnboard(); return; }
    S.guest = true;
  } else {
    S.guest = false; S.wantReg = false;
    subscribeUser();
  }
  derive();
  applyBrand();
  if (!S.guest && c.terms && !mine.terms && !termsAsked && !S.isOwner) termsPrompt();
  if (S.isOwner && S.loaded.staff && !S.staff.has(S.me) && S.canWrite && !ownerSeeded && !S.guest) {
    ownerSeeded = true;
    S.db.doc("staff/" + S.me).set({ owner: true, at: Date.now(), by: S.me }).catch(e => { ownerSeeded = false; console.warn(e); });
  }
  if (!appShown) {
    appShown = true;
    for (const k of Object.keys(V)) if (V[k].init) V[k].init();
    stage("app");
    go({ v: "home" });
    renderAside();
    syncKeyToProfile();
    applyPresence(); beat();
    return;
  }
  stage("app");
  syncKeyToProfile();
  renderChrome();
  renderAside();
  const v = V[S.route.v];
  if (S.guest && !["home", "search", "post", "profile"].includes(S.route.v)) { go({ v: "home" }); return; }
  if (v && v.update) v.update();
  applyPresence();
}
setInterval(() => $$("time[data-at]").forEach(t => { t.textContent = rel(Number(t.dataset.at)); }), 30000);

(async function boot() {
  const api = window.claude;
  let db = null, user = null, assets = null;
  if (api && api.use) {
    [db, user, assets] = await Promise.all([api.use("db"), api.use("user"), api.use("assets")]);
  }
  if (!db || !user) { stage("gate"); return; }
  const me = await user.id();
  S.db = db; S.user = user; S.assets = assets; S.me = me || null;
  S.isAdmin = await user.canEdit();
  S.isOwner = await user.isOwner();
  S.canWrite = (await user.can("data.write")) !== false;
  S.booted = true;
  subscribeAll();
  schedule();
})();
})();
