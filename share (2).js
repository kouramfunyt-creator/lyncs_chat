'use strict';
// Runs scripts/share.js with a fake "cloudflared" and checks the flow:
// the tunnel only starts after the owner has registered, and the public URL is printed.
const { spawn } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const assert = require('node:assert/strict');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'share-'));
  const fake = path.join(dir, 'cloudflared'); const log = path.join(dir, 'args.txt');
  fs.writeFileSync(fake, `#!/usr/bin/env node\nrequire('fs').writeFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(' '));\nconsole.error('INF Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):');\nconsole.error('INF |  https://fake-name-123.trycloudflare.com  |');\nsetInterval(()=>{},1000);\n`); fs.chmodSync(fake, 0o755);
  const port = 3166;
  const c = spawn(process.execPath, ['--no-warnings', path.join(__dirname, '..', 'scripts', 'share.js')], { env: { ...process.env, DATA_DIR: path.join(dir, 'data'), CLOUDFLARED: fake, NO_OPEN: '1', PORT: String(port), OWNER_USERNAME: 'koura' } });
  let out = ''; c.stdout.on('data', d => out += d); c.stderr.on('data', d => out += d);
  const wait = async (re, ms = 8000) => { const t0 = Date.now(); while (!re.test(out)) { if (Date.now() - t0 > ms) throw new Error('timeout waiting for ' + re + '\n' + out); await new Promise(r => setTimeout(r, 100)); } };
  await wait(/手順1/);
  assert.ok(!fs.existsSync(log), 'tunnel must not start before the owner registers');
  const r = await fetch('http://127.0.0.1:' + port + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://fake-name-123.trycloudflare.com' }, body: JSON.stringify({ login: 'koura', password: 'passw0rd123' }) });
  assert.equal(r.status, 200, 'register through a foreign Origin works in tunnel mode');
  await wait(/fake-name-123\.trycloudflare\.com\s*\n/);
  assert.match(fs.readFileSync(log, 'utf8'), /^tunnel --url http:\/\/127\.0\.0\.1:3166 --no-autoupdate$/);
  assert.match(out, /みんなに配るURL/);
  c.kill('SIGINT'); await new Promise(r2 => c.on('exit', r2));
  assert.equal(fs.readFileSync(path.join(dir, 'data', 'owner.txt'), 'utf8'), 'koura');
  console.log('PASS share script flow'); fs.rmSync(dir, { recursive: true, force: true }); process.exit(0);
})().catch(e => { console.error('FAIL share', e.message); process.exit(1); });
