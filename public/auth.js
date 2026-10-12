'use strict';
// Login / registration screen, then loads the app.
(function () {
  const $ = s => document.querySelector(s);
  let started = false;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.body.append(s); }); }
  async function start() { if (started) return; started = true; await loadScript('/shim.js'); await loadScript('/app.js'); }
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'on') for (const [e, f] of Object.entries(v)) n.addEventListener(e, f); else if (v === true) n.setAttribute(k, ''); else if (v !== false && v != null) n.setAttribute(k, v); }
    for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  }
  function show(mode) {
    let box = $('#auth');
    if (box) box.remove();
    for (const id of ['gate', 'loading', 'onboard', 'app']) { const e = $('#' + id); if (e) e.hidden = true; }
    const pub = window.__pub || {};
    let m = mode === 'register' ? 'register' : 'login';
    const login = el('input', { id: 'au-login', autocomplete: 'username', maxlength: '20', autocapitalize: 'none', spellcheck: 'false' });
    const pw = el('input', { id: 'au-pw', type: 'password', autocomplete: 'current-password' });
    const pw2 = el('input', { id: 'au-pw2', type: 'password', autocomplete: 'new-password' });
    const err = el('div', { class: 'err', id: 'au-err', role: 'alert' });
    const go = el('button', { class: 'btn primary', id: 'au-go', type: 'submit', style: 'width:100%;padding:11px' });
    const f2 = el('div', { class: 'field', id: 'au-f2' }, el('label', { for: 'au-pw2' }, 'パスワード(もう一度)'), pw2);
    const note = el('p', { class: 'muted-p', id: 'au-note' });
    const t1 = el('button', { class: 'tab', type: 'button', role: 'tab', id: 'au-t-login' }, 'ログイン');
    const t2 = el('button', { class: 'tab', type: 'button', role: 'tab', id: 'au-t-register' }, '新規登録');
    const draw = () => {
      t1.setAttribute('aria-selected', String(m === 'login')); t2.setAttribute('aria-selected', String(m === 'register'));
      f2.hidden = m === 'login'; go.textContent = m === 'login' ? 'ログイン' : '登録して始める';
      pw.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password'); err.textContent = '';
      note.textContent = m === 'register' ? (pub.signups === false ? '現在、新規登録は受け付けていません。' : (pub.hasOwner ? 'ログインIDは半角の英数字と _ で3〜20文字、パスワードは8文字以上です。ログインIDは他の人には表示されません。' : 'まだサイト主が登録されていません。サイト主用のログインIDで登録してください。')) : '';
    };
    t1.addEventListener('click', () => { m = 'login'; draw(); }); t2.addEventListener('click', () => { m = 'register'; draw(); });
    const form = el('form', { class: 'stack', novalidate: true, on: { submit: async ev => {
      ev.preventDefault(); err.textContent = '';
      if (m === 'register' && pw.value !== pw2.value) { err.textContent = 'パスワードが一致しません。'; return; }
      go.disabled = true;
      try {
        const r = await fetch(m === 'login' ? '/api/login' : '/api/register', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: login.value.trim(), password: pw.value }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || '失敗しました。');
        location.reload();
      } catch (e) { err.textContent = e.message; go.disabled = false; }
    } } },
      el('div', { class: 'field' }, el('label', { for: 'au-login' }, 'ログインID'), login),
      el('div', { class: 'field' }, el('label', { for: 'au-pw' }, 'パスワード'), pw), f2, err, note, go,
      !pub.loginRequired && !started ? el('button', { class: 'btn', type: 'button', id: 'au-guest', style: 'width:100%', on: { click: () => { box.remove(); start(); } } }, 'ログインせずに見る') : null,
      pub.loginRequired === false && started ? el('button', { class: 'btn', type: 'button', style: 'width:100%', on: { click: () => { box.remove(); const a = $('#app'); if (a) a.hidden = false; } } }, '閉じる') : null);
    box = el('div', { id: 'auth', class: 'stage center' }, el('div', { class: 'card stack', style: 'text-align:left;max-width:380px;width:100%' },
      el('h1', { style: 'font:700 20px var(--font-d);text-align:center' }, pub.name || 'Lyncs_Chat'), pub.maintenance && pub.maintenance.on ? el('p', { class: 'muted-p', id: 'au-maint', style: 'text-align:center;font-weight:700' }, 'メンテナンス中です。' + (pub.maintenance.text ? ' ' + pub.maintenance.text : '')) : null, el('div', { class: 'tabs', role: 'tablist' }, t1, t2), form));
    document.body.append(box); draw(); login.focus();
  }
  window.__auth = { show };
  document.addEventListener('click', e => { if (e.target && e.target.id === 'gate-login') show('login'); });
  (async function () {
    try {
      window.__pub = await fetch('/api/public').then(r => r.json());
      window.__me = await fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json());
    } catch (e) { window.__pub = { loginRequired: true }; window.__me = { uid: null }; }
    document.title = (window.__pub && window.__pub.name) || document.title;
    if (window.__me.uid) return start();
    if (window.__pub.loginRequired === false) return start();
    show('login');
  })();
})();
