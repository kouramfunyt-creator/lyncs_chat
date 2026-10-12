'use strict';
// "Easy publish": starts the site on this PC and gives it a temporary public https address
// using a Cloudflare Quick Tunnel (no account needed). Intended for trying the site with friends.
const fs = require('node:fs'); const path = require('node:path'); const readline = require('node:readline');
const { spawn, exec } = require('node:child_process');
const { createApp } = require('../server/index');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const ask = q => new Promise(res => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, a => { rl.close(); res(a.trim()); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const line = s => console.log(s);
const openBrowser = url => { if (process.env.NO_OPEN === '1') return; const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`; exec(cmd, () => {}); };

function findCloudflared() {
  const names = process.platform === 'win32' ? ['cloudflared.exe'] : ['cloudflared'];
  if (process.env.CLOUDFLARED && fs.existsSync(process.env.CLOUDFLARED)) return process.env.CLOUDFLARED;
  for (const n of names) { const p = path.join(ROOT, n); if (fs.existsSync(p)) return p; }
  for (const d of (process.env.PATH || '').split(path.delimiter)) for (const n of names) { const p = path.join(d, n); if (d && fs.existsSync(p)) return p; }
  return null;
}
async function downloadCloudflared() {
  const asset = process.platform === 'win32' ? 'cloudflared-windows-amd64.exe' : process.platform === 'linux' ? 'cloudflared-linux-amd64' : null;
  if (!asset || process.arch !== 'x64') return null;
  const dest = path.join(ROOT, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  line('cloudflared(公開用の小さなプログラム)をダウンロードしています…');
  const r = await fetch('https://github.com/cloudflare/cloudflared/releases/latest/download/' + asset, { redirect: 'follow' });
  if (!r.ok) throw new Error('download failed: HTTP ' + r.status);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); if (process.platform !== 'win32') fs.chmodSync(dest, 0o755);
  return dest;
}

(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const ownerFile = path.join(DATA_DIR, 'owner.txt');
  let owner = (process.env.OWNER_USERNAME || '').trim() || (fs.existsSync(ownerFile) ? fs.readFileSync(ownerFile, 'utf8').trim() : '');
  while (!/^[A-Za-z0-9_]{3,20}$/.test(owner)) {
    if (owner) line('ログインIDは、半角の英数字と _ だけで、3〜20文字にしてください。');
    owner = await ask('サイト主(あなた)のログインIDを決めて、入力して Enter を押してください(例: koura): ');
  }
  fs.writeFileSync(ownerFile, owner);

  let cf = findCloudflared();
  if (!cf) {
    const a = (await ask('公開用プログラム(cloudflared)がまだありません。自動でダウンロードしますか? [Y/n] ')).toLowerCase();
    if (a !== 'n') { try { cf = await downloadCloudflared(); } catch (e) { line('ダウンロードできませんでした: ' + e.message); } }
    if (!cf) { line('\n手動で用意する場合: https://github.com/cloudflare/cloudflared/releases/latest から cloudflared-windows-amd64.exe を取り、名前を cloudflared.exe に変えて、このフォルダ(' + ROOT + ')に置いてください。'); process.exit(1); }
  }

  const env = { ...process.env, DATA_DIR, OWNER_USERNAME: owner, TRUST_PROXY: '1', RELAX_ORIGIN: '1' };
  const app = await createApp(env);
  let port = Number(process.env.PORT || 3000);
  await new Promise((res, rej) => { const tryListen = () => { app.server.once('error', e => { if (e.code === 'EADDRINUSE' && port < 3050) { port++; tryListen(); } else rej(e); }); app.server.listen(port, '127.0.0.1', res); }; tryListen(); });
  const local = 'http://localhost:' + port;
  line('\n=== Lyncs_Chat を起動しました ===');
  if (!app.auth.hasOwner()) {
    line('\n【手順1】いま開いたブラウザで「新規登録」を選び、ログインIDを「' + owner + '」にして登録してください。');
    line('        (あなたが登録を終えるまで、外には公開しません)');
    openBrowser(local);
    while (!app.auth.hasOwner()) await sleep(1000);
    line('\nサイト主の登録を確認しました。');
  } else openBrowser(local);

  line('外に公開しています…(10〜30秒かかることがあります)');
  const child = spawn(cf, ['tunnel', '--url', 'http://127.0.0.1:' + port, '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let shown = false, tail = '';
  const onData = d => {
    tail = (tail + d.toString()).slice(-4000);
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(tail);
    if (m && !shown) {
      shown = true;
      line('\n==================================================');
      line(' みんなに配るURL(このURLを送ってください):\n');
      line('    ' + m[0] + '\n');
      line(' ・このウィンドウを閉じると、公開が止まります。');
      line(' ・パソコンの電源を切ったり、スリープすると、他の人は使えません。');
      line(' ・次に起動したときは、URLが変わります。');
      line(' ・URLを知っている人は、誰でも新規登録できます。');
      line('   止めたいときは、運営画面の「サイト設定」で新規登録を止めてください。');
      line('==================================================\n');
    }
  };
  child.stdout.on('data', onData); child.stderr.on('data', onData);
  child.on('exit', code => { line('公開用プログラムが終了しました(コード ' + code + ')。' + (shown ? '' : '\n接続できませんでした。インターネット接続や、会社・学校のネットワークの制限を確認してください。')); shutdown(1); });
  let closing = false;
  async function shutdown(code) { if (closing) return; closing = true; try { child.kill(); } catch (e) { /* ignore */ } try { await app.close(); } catch (e) { /* ignore */ } process.exit(code || 0); }
  process.on('SIGINT', () => shutdown(0)); process.on('SIGTERM', () => shutdown(0));
})().catch(e => { console.error('起動できませんでした:', e && e.message || e); process.exit(1); });
