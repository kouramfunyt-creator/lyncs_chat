'use strict';
const { chromium } = require('playwright');
const { startServer } = require('./helpers');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
let pass = 0, failn = 0;
const ok = (c, m) => { if (c) pass++; else failn++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const S = await startServer({ SCHEDULE_TICK_MS: '500' });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const errs = [];
  async function device(name) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ' PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts|favicon|Failed to load resource|ERR_/.test(m.text())) errs.push(name + ' ' + m.text()); });
    return { ctx, p, name };
  }
  async function signup(d, login, display, handle) {
    const p = d.p;
    await p.goto(S.base + '/');
    await p.waitForSelector('#au-login');
    await p.click('#au-t-register');
    await p.fill('#au-login', login); await p.fill('#au-pw', 'passw0rd123'); await p.fill('#au-pw2', 'passw0rd123');
    await p.click('#au-go');
    await p.waitForSelector('#ob-name');
    await p.fill('#ob-name', display); await p.fill('#ob-handle', handle);
    await p.click('#ob-go');
    await p.waitForSelector('#c-text');
  }
  const png = fs.mkdtempSync(path.join(os.tmpdir(), 'png-')) + '/a.png';
  const A = await device('owner'), B = await device('alice'), C = await device('bob');
  await A.p.goto(S.base + '/'); await A.p.waitForSelector('#au-login');
  ok(await A.p.locator('#au-note').count() === 1, 'login screen shown to a visitor who is not logged in');
  const hdr = await fetch(S.base + '/').then(r => r.headers.get('content-security-policy') || '');
  ok(/script-src 'self'(;|$)/.test(hdr) && !/unsafe-inline[^;]*;[^]*script/.test(hdr.split('style-src')[0]), 'CSP: scripts only from the site itself');
  await signup(A, 'koura', 'Koura', 'koura');
  ok((await (await fetch(S.base + '/api/me', { headers: { Cookie: (await A.ctx.cookies()).map(c => c.name + '=' + c.value).join('; ') } })).json()).owner === true, 'first account is site owner');
  await signup(B, 'alice', 'Alice', 'alice');
  await signup(C, 'bob', 'Bob', 'bob');

  // post on device B, appears on C without reload
  await B.p.fill('#c-text', 'hello @bob from alice #news');
  await B.p.click('#c-post');
  await C.p.waitForSelector('.post:has-text("hello")', { timeout: 8000 });
  ok(true, 'post appears on another device without reload');
  ok(await C.p.locator('.post .mention', { hasText: '@bob' }).count() === 1, 'mention is a link');
  // notification for bob
  await C.p.locator('#rail .nav-item[aria-label=通知]').click();
  await C.p.waitForSelector('.notif:has-text("メンション")', { timeout: 8000 });
  ok(true, 'mention notification delivered to bob');
  await C.p.locator('#rail .nav-item[aria-label=ホーム]').click();
  // like + reply
  await C.p.locator('.post', { hasText: 'hello' }).locator('[aria-label="いいね"]').click();
  await B.p.waitForFunction(() => [...document.querySelectorAll('.post')].some(n => /hello/.test(n.textContent) && n.querySelector('.act.like.liked, .act.like')?.textContent.trim() === '1'), null, { timeout: 8000 });
  ok(true, 'like count visible on the author\'s device');
  await C.p.locator('.post', { hasText: 'hello' }).locator('[aria-label="返信"]').click();
  await C.p.fill('#rc-text', 'nice one'); await C.p.click('#rc-post');
  await B.p.locator('#rail .nav-item[aria-label=通知]').click();
  await B.p.waitForSelector('.notif:has-text("返信")', { timeout: 8000 });
  ok(true, 'reply notification shared');
  // follow
  await C.p.locator('.post', { hasText: 'hello' }).locator('.name').first().click();
  await C.p.waitForSelector('.phead');
  await C.p.locator('.phead').getByRole('button', { name: 'フォロー', exact: true }).click();
  await B.p.locator('#rail .nav-item[aria-label=プロフィール]').click();
  await B.p.waitForFunction(() => /1\s*フォロワー/.test(document.querySelector('.phead')?.textContent || ''), null, { timeout: 8000 });
  ok(true, 'follower count updates for the followed user');
  // user search
  await B.p.locator('#rail .nav-item[aria-label=さがす]').click(); await B.p.fill('#search-q', 'bob');
  await B.p.waitForSelector('.urow:has-text("Bob")');
  ok(true, 'user search finds other users');
  // DM
  await C.p.locator('.phead').getByRole('button', { name: /メッセージ/ }).click();
  await C.p.waitForSelector('#msg-input');
  await C.p.fill('#msg-input', 'secret hi'); await C.p.click('#msg-send');
  await B.p.locator('#rail .nav-item[aria-label=メッセージ]').click();
  await B.p.waitForSelector('.conv:has-text("Bob")', { timeout: 8000 });
  await B.p.locator('.conv', { hasText: 'Bob' }).click();
  await B.p.waitForSelector('.bubble:has-text("secret hi"), .msg:has-text("secret hi")', { timeout: 8000 });
  ok(true, 'DM delivered and decrypted on the other device');
  await C.p.waitForSelector('text=既読', { timeout: 8000 });
  ok(true, 'read receipt shown');
  const stored = await S.db.all("SELECT data FROM docs WHERE path LIKE 'dm/%/msgs/%'");
  ok(stored.length >= 1 && stored.every(r => !r.data.includes('secret hi')), 'DM text is not stored in plaintext');
  // avatar
  await B.p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 400, 300); window.__png = c.toDataURL('image/png').split(',')[1]; });
  fs.writeFileSync(png, Buffer.from(await B.p.evaluate(() => window.__png), 'base64'));
  await B.p.locator('#rail .nav-item[aria-label=プロフィール]').click();
  await B.p.getByRole('button', { name: /プロフィールを編集/ }).click();
  await B.p.setInputFiles('#modal-root #av-file', png); await B.p.waitForSelector('#modal-root .avprev img');
  await B.p.getByRole('button', { name: '保存', exact: true }).click();
  await C.p.locator('#rail .nav-item[aria-label=ホーム]').click();
  await C.p.waitForSelector('.post .av img', { timeout: 8000 });
  ok(true, 'avatar image shown on another device');
  // image post (asset upload)
  await B.p.locator('#rail .nav-item[aria-label=ホーム]').click();
  await B.p.setInputFiles('#c-img', png);
  await B.p.waitForSelector('#c-post:not([disabled])');
  await B.p.fill('#c-text', 'with picture'); await B.p.waitForTimeout(500); await B.p.click('#c-post');
  await C.p.waitForSelector('.post:has-text("with picture") img.pm', { timeout: 10000 });
  const src = await C.p.locator('.post:has-text("with picture") img.pm').first().getAttribute('src');
  ok(/^\/_blob\/[0-9a-f]{32}$/.test(src), 'image post stored as server asset: ' + src);
  await C.p.waitForFunction(() => { const i = document.querySelector('.post img.pm'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 });
  ok(true, 'asset image loads on another device');
  // report -> owner sees it
  await B.p.reload(); await B.p.waitForSelector('#c-text');
  await B.p.locator('#rail .nav-item[aria-label=通知]').click();
  await B.p.locator('.notif', { hasText: '返信' }).first().click();
  await B.p.waitForSelector('.post:has-text("nice one")', { timeout: 8000 });
  ok(true, 'reply visible in the thread');
  await B.p.locator('.post', { hasText: 'nice one' }).first().locator('[aria-label="通報"]').click();
  await B.p.selectOption('#rp-reason', 'スパム・宣伝'); await B.p.click('#rp-send');
  await A.p.locator('#rail .nav-item[aria-label=運営]').click();
  await A.p.waitForFunction(() => /通報\(1\)/.test(document.querySelector('#atab-reports')?.textContent || ''), null, { timeout: 8000 });
  ok(true, 'report reaches the owner\'s admin screen');
  // owner gives alice a YouTube mark; bob sees it
  await A.p.locator('#atab-users').click();
  await A.p.locator('tr', { hasText: '@alice' }).locator('.mk-btn').click();
  await A.p.locator('#mk-y').check(); await A.p.locator('#mk-save').click();
  await C.p.waitForSelector('.post [aria-label^="YouTube"]', { timeout: 8000 });
  ok(true, 'marks granted by the owner show on others\' screens');
  // non-admin cannot see admin nav
  ok(await C.p.locator('#rail .nav-item[aria-label=運営]').count() === 0, 'normal users have no admin screen');
  // owner makes alice staff, then she gets the admin screen after reload
  await A.p.locator('#atab-staff').click(); await A.p.click('#staff-add');
  await A.p.locator('.pickrow', { hasText: 'Alice' }).click().catch(async () => { await A.p.locator('.pickrow', { hasText: 'Alice' }).locator('input').check(); });
  await A.p.click('#staff-confirm');
  await B.p.reload(); await B.p.waitForSelector('#c-text');
  await B.p.locator('#rail .nav-item[aria-label=運営]').waitFor({ timeout: 8000 });
  ok(true, 'adding a staff member in the app grants the admin screen (no separate sharing step)');
  // ---- hashtag search, rankings, presence, secret mode ----
  const beatNow = async d => { await d.p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await sleep(500); };
  await C.p.locator('#rail .nav-item[aria-label=さがす]').click();
  await C.p.fill('#search-q', 'ne');
  await C.p.waitForSelector('#tag-results button:has-text("#news")', { timeout: 8000 });
  ok(true, 'search suggests matching hashtags');
  await C.p.locator('#tag-results button', { hasText: '#news' }).click();
  await C.p.waitForSelector('.post:has-text("hello")', { timeout: 8000 });
  ok(true, 'clicking a hashtag shows its posts');
  await C.p.fill('#search-q', ''); await C.p.click('#stab-rank');
  await C.p.waitForSelector('#rank-list .rank-line:has-text("#news")', { timeout: 8000 });
  ok(true, 'weekly hashtag ranking lists #news');
  await C.p.click('#per-month'); await C.p.click('#per-year');
  ok(await C.p.locator('#rank-list .rank-line:has-text("#news")').count() === 1, 'monthly / yearly hashtag rankings work');
  await C.p.click('#kind-post');
  await C.p.waitForSelector('#rank-posts .rank-row:has-text("hello")', { timeout: 8000 });
  ok((await C.p.locator('#rank-posts .rank-row .rank-n').first().textContent()).startsWith('1'), 'post ranking shows rank 1 for the liked post');
  await C.p.locator('#rail .nav-item[aria-label=さがす]').click();
  await C.p.click('#stab-rank'); await C.p.click('#kind-follower');
  await C.p.waitForSelector('#rank-list .rank-line:has-text("Alice")', { timeout: 8000 });
  ok(/\+1/.test(await C.p.locator('#rank-list .rank-line:has-text("Alice")').textContent()), 'follower ranking counts the new follower');
  // presence
  await C.p.locator('.nav-item[aria-label=ホーム]').first().click();
  await C.p.locator('.post', { hasText: 'hello' }).locator('button.name').first().click();
  await beatNow(C);
  await C.p.waitForFunction(() => /オンライン/.test(document.querySelector('#pres-line')?.textContent || ''), null, { timeout: 8000 });
  ok(await C.p.locator('.phead .av .pdot.online').count() === 1, 'online dot on the avatar and online label on the profile');
  await B.p.locator('#rail .nav-item[aria-label=プロフィール]').click();
  await B.p.click('#open-privacy'); await B.p.locator('#pr-busy').check();
  await sleep(600); await beatNow(C);
  await C.p.waitForFunction(() => /取り込み中/.test(document.querySelector('#pres-line')?.textContent || ''), null, { timeout: 8000 });
  ok(await C.p.locator('.phead .av .pdot.busy').count() === 1, 'busy status shows on another device');
  await B.p.locator('#pr-hidden').check(); await sleep(600); await beatNow(C);
  await C.p.waitForFunction(() => /オフライン/.test(document.querySelector('#pres-line')?.textContent || ''), null, { timeout: 8000 });
  ok(await C.p.locator('.phead .av .pdot').count() === 0, 'hiding the online status makes the user look offline');
  await B.p.locator('#pr-online').check(); await sleep(400);
  // secret mode
  await B.p.locator('#pr-secret').check(); await sleep(800);
  await C.p.waitForSelector('#secret-note', { timeout: 8000 });
  ok(await C.p.locator('.phead .counts').count() === 0 && await C.p.locator('#levelbox').count() === 0 && await C.p.locator('#pres-line').count() === 0 && !(await C.p.locator('#ptab-likes').isVisible()), 'secret mode hides counts, online state and likes from others');
  ok(await C.p.locator('.phead h2', { hasText: 'Alice' }).count() === 1 && await C.p.locator('.post:has-text("hello")').count() >= 1, 'secret mode still shows name, bio and posts');
  await B.p.keyboard.press('Escape');
  ok(await B.p.locator('.phead .counts').count() === 1, 'secret users still see their own counts');
  await B.p.locator('#open-privacy').click(); await B.p.locator('#pr-secret').uncheck(); await sleep(600); await B.p.keyboard.press('Escape');
  await C.p.waitForFunction(() => !document.querySelector('#secret-note'), null, { timeout: 8000 });
  ok(true, 'turning secret mode off restores the profile');
  // ---- level / achievements, profile customization ----
  await C.p.locator('#rail .nav-item[aria-label=ホーム]').click();
  await C.p.locator('.post', { hasText: 'hello' }).locator('button.name').first().click();
  await C.p.waitForSelector('#levelbox', { timeout: 8000 });
  ok(/^Lv \d+$/.test((await C.p.locator('#lv-chip').textContent()).trim()), 'profile shows a level');
  await C.p.click('#open-ach');
  await C.p.waitForSelector('#ach-list .achrow.done[data-id="first_post"]', { timeout: 8000 });
  ok(await C.p.locator('#ach-list .achrow.done[data-id="first_reply"]').count() === 0 && await C.p.locator('#ach-list .achrow:not(.done)[data-id="posts_100"]').count() === 1, 'achievements unlock only when the condition is met');
  await C.p.keyboard.press('Escape');
  await B.p.locator('#rail .nav-item[aria-label=プロフィール]').click();
  await B.p.getByRole('button', { name: /プロフィールを編集/ }).click();
  await B.p.setInputFiles('#modal-root #hd-file', png); await B.p.waitForFunction(() => /url\(/.test(document.querySelector('#hd-prev')?.style.background || ''), null, { timeout: 8000 });
  await B.p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }; set('ep-accent', '#d6409f'); set('ep-bg', '#a9d6f5'); set('ep-bcol', '#1f9d55'); });
  await B.p.fill('#ep-bio', 'ようこそ!'); await B.p.selectOption('#ep-frame', 'rainbow'); await B.p.selectOption('#ep-bsty', 'card');
  await B.p.getByRole('button', { name: '保存', exact: true }).click();
  await B.p.waitForSelector('.toast:has-text("保存しました")');
  await C.p.waitForFunction(() => document.querySelector('#phero')?.style.background.includes('/_blob/'), null, { timeout: 10000 });
  ok(true, 'header image shows on another device');
  const look = await C.p.evaluate(() => ({ accent: document.querySelector('#viewhost section')?.style.getPropertyValue('--accent').trim(), bio: document.querySelector('.phead .bio')?.className, frame: !!document.querySelector('.av.fr-rainbow'), bg: document.querySelector('.phead')?.style.background }));
  ok(look.accent === '#d6409f' && /s-card/.test(look.bio || '') && look.frame && /color-mix/.test(look.bg || ''), 'theme color, background tint, bio decoration and avatar frame are applied: ' + JSON.stringify(look));
  // ---- drafts and scheduled posts ----
  await B.p.locator('#rail .nav-item[aria-label=ホーム]').click();
  await B.p.fill('#c-text', 'posted now from draft');
  await B.p.click('#c-drafts'); await B.p.waitForSelector('#dr-text');
  ok((await B.p.inputValue('#dr-text')) === 'posted now from draft', 'the draft box starts with what was typed in the composer');
  await B.p.click('#dr-save'); await B.p.waitForSelector('#dr-list .draftrow:has-text("posted now from draft")');
  await B.p.fill('#dr-text', 'scheduled by ui');
  const t2 = new Date(Date.now() + 2 * 3600e3), pad = n => String(n).padStart(2, '0');
  await B.p.fill('#dr-when', t2.getFullYear() + '-' + pad(t2.getMonth() + 1) + '-' + pad(t2.getDate()) + 'T' + pad(t2.getHours()) + ':' + pad(t2.getMinutes()));
  await B.p.click('#dr-sched'); await B.p.waitForSelector('#dr-list .draftrow:has-text("scheduled by ui")');
  ok(/予約:/.test(await B.p.locator('#dr-list .draftrow', { hasText: 'scheduled by ui' }).textContent()), 'a scheduled post is listed with its time');
  ok(await C.p.locator('.post:has-text("scheduled by ui")').count() === 0, 'scheduled post is not visible before its time');
  await B.p.locator('#dr-list .draftrow', { hasText: 'posted now from draft' }).locator('[data-act="now"]').click();
  await C.p.waitForSelector('.post:has-text("posted now from draft")', { timeout: 8000 });
  ok(true, '"post now" publishes a draft');
  // time passes: move the schedule into the past, the server publishes it by itself
  const dpath = 'data/users/' + (await B.p.evaluate(() => window.__me.uid)) + '/drafts';
  const cur = S.docs.raw(dpath);
  await S.docs.write({ uid: dpath.split('/')[2], level: 2, restricted: false }, 'set', dpath, { items: cur.items.map(x => ({ ...x, sched: x.sched ? Date.now() - 1000 : 0 })) });
  await C.p.waitForSelector('.post:has-text("scheduled by ui")', { timeout: 10000 });
  ok(true, 'the server publishes a scheduled post when its time comes (no one has to be online)');
  await B.p.keyboard.press('Escape');
  // ---- maintenance mode ----
  await A.p.locator('#rail .nav-item[aria-label=運営]').click(); await A.p.locator('#atab-settings').click();
  await A.p.locator('#set-maint').check(); await A.p.fill('#set-maint-text', '点検中です。もうすぐ終わります。');
  await A.p.click('#set-save'); await A.p.waitForSelector('.toast:has-text("保存しました")');
  await C.p.waitForSelector('#maint', { timeout: 10000 });
  ok(/点検中です/.test(await C.p.locator('#maint-text').textContent()), 'normal users see the maintenance notice');
  ok(await A.p.locator('#maint-banner').count() === 1 && await A.p.locator('#maint').count() === 0, 'staff keep using the site and see a maintenance banner');
  const mw = await fetch(S.base + '/api/doc/write', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: (await C.ctx.cookies()).map(c => c.name + '=' + c.value).join('; ') }, body: JSON.stringify({ op: 'set', path: 'likes/' + (await C.p.evaluate(() => window.__me.uid)), data: { p: [] } }) });
  ok(mw.status === 503, 'the server also refuses writes during maintenance');
  await A.p.locator('#set-maint').uncheck(); await A.p.click('#set-save'); await A.p.waitForSelector('.toast:has-text("保存しました")');
  await C.p.waitForFunction(() => !document.querySelector('#maint'), null, { timeout: 10000 });
  ok(true, 'the notice disappears when maintenance ends');
  // logout / login again, password change
  await C.p.locator('#rail .nav-item[aria-label=プロフィール]').click();
  await C.p.click('#open-account'); await C.p.fill('#ac-old', 'passw0rd123'); await C.p.fill('#ac-new', 'brandnew-pass1'); await C.p.click('#ac-save');
  await C.p.waitForSelector('.toast:has-text("変更しました")');
  ok(true, 'password changed from the app');
  await C.p.keyboard.press('Escape'); await C.p.locator('#open-account').click().catch(() => {});
  await C.p.click('#ac-logout').catch(async () => { await C.p.getByRole('button', { name: 'ログアウト' }).click(); });
  await C.p.waitForSelector('#au-login');
  await C.p.fill('#au-login', 'bob'); await C.p.fill('#au-pw', 'brandnew-pass1'); await C.p.click('#au-go');
  await C.p.waitForSelector('#c-text');
  ok(true, 'logout then login with the new password');
  // guest mode
  const cfgBefore = JSON.parse((await S.db.all("SELECT data FROM docs WHERE path='site/config'"))[0]?.data || '{}');
  await A.p.locator('#atab-settings').click();
  await A.p.selectOption('#set-login', '0'); await A.p.click('#set-save');
  await A.p.waitForSelector('.toast:has-text("保存しました")');
  const G = await device('guest');
  await G.p.goto(S.base + '/');
  await G.p.waitForSelector('.post:has-text("hello")', { timeout: 8000 });
  ok(true, 'guests can read when login is not required');
  ok(await G.p.locator('#c-text').count() === 0 || await G.p.locator('#c-post').isDisabled().catch(() => true), 'guests cannot post');
  await G.p.getByRole('button', { name: /登録して参加/ }).first().click();
  await G.p.waitForSelector('#au-login');
  ok(true, 'guest "join" button opens the registration screen');
  void cfgBefore;
  console.log('console/page errors:', errs);
  console.log('\n' + pass + ' passed, ' + failn + ' failed');
  await b.close(); await S.stop();
  process.exit(failn || errs.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
