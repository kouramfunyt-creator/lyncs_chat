'use strict';
// When live notifications (SSE) do not work, the page still updates by polling.
const { chromium } = require('playwright'); const { startServer } = require('./helpers');
(async () => {
  const S = await startServer(); const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const mk = async (blockSse) => { const p = await (await b.newContext()).newPage(); if (blockSse) await p.route('**/api/events', r => r.abort()); return p; };
  const reg = async (p, login, name, handle) => { await p.goto(S.base + '/'); await p.waitForSelector('#au-login'); await p.click('#au-t-register'); await p.fill('#au-login', login); await p.fill('#au-pw', 'passw0rd123'); await p.fill('#au-pw2', 'passw0rd123'); await p.click('#au-go'); await p.waitForSelector('#ob-name'); await p.fill('#ob-name', name); await p.fill('#ob-handle', handle); await p.click('#ob-go'); await p.waitForSelector('#c-text'); };
  const A = await mk(false), B = await mk(true);
  await reg(A, 'koura', 'Koura', 'koura'); await reg(B, 'bob', 'Bob', 'bob');
  await A.fill('#c-text', 'polling works'); await A.click('#c-post');
  const t0 = Date.now(); await B.waitForSelector('.post:has-text("polling works")', { timeout: 12000 });
  console.log('PASS update without SSE after ' + (Date.now() - t0) + ' ms'); await b.close(); await S.stop(); process.exit(0);
})().catch(e => { console.error('FAIL nosse', e.message); process.exit(1); });
