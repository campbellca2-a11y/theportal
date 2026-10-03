// Capacity limits: per-file cap, inbox cap, free-disk floor, and that the
// API reports the limits the UI displays.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = process.env.PORTAL_TEST_SOURCE === '1' ? 'server.mjs' : 'ThePortal.runtime.mjs';
const PORT = 48836;
const base = 'http://127.0.0.1:' + PORT;
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log('PASS ' + message);
}

async function withServer(env, run) {
  const data = join(root, 'work', 'limits-test-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  await mkdir(data, { recursive: true });
  const child = spawn(process.execPath, [join(root, entry)], {
    env: { ...process.env, PORTAL_PORT: String(PORT), PORTAL_DATA_DIR: data, PORTAL_LOCAL_ONLY: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  try {
    let up = false;
    for (let i = 0; i < 100 && !up; i++) {
      try {
        up = (await fetch(base + '/api/health')).ok;
      } catch {}
      if (!up) {
        if (child.exitCode !== null) throw new Error(log);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!up) throw new Error('Test server did not start: ' + log);
    const r = await fetch(base + '/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local: true }),
    });
    const cookie = r.headers.get('set-cookie').split(';')[0];
    const send = (bytes, name = 'f.bin') =>
      fetch(base + '/api/items', {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/octet-stream', 'X-File-Name': name },
        body: Buffer.alloc(bytes, 7),
      });
    await run({ cookie, send });
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, 'exit');
    }
    await rm(data, { recursive: true, force: true });
  }
}

// Defaults are reported to the UI.
await withServer({}, async ({ cookie }) => {
  const info = await (await fetch(base + '/api/info', { headers: { Cookie: cookie } })).json();
  check(info.maxFile === 2 * 1024 ** 3, 'default per-file limit is 2 GB');
  check(info.maxTotal === 10 * 1024 ** 3, 'default inbox limit is 10 GB');
});

// Small limits so the caps can be exercised with tiny files.
await withServer({ PORTAL_MAX_FILE: '1000', PORTAL_MAX_TOTAL: '2500', PORTAL_MIN_FREE: '1' }, async ({ cookie, send }) => {
  const info = await (await fetch(base + '/api/info', { headers: { Cookie: cookie } })).json();
  check(info.maxFile === 1000 && info.maxTotal === 2500, 'configured limits are reported to the UI');
  check((await send(1000)).status === 201, 'file exactly at the per-file limit is accepted');
  let r = await send(1001);
  check(r.status === 413, 'file over the per-file limit is refused');
  check(!/proof/i.test((await r.json()).error), 'limit message has no prototype wording');
  check((await send(1000)).status === 201, 'second file fits in the inbox');
  r = await send(600);
  check(r.status === 507 && /full/.test((await r.json()).error), 'inbox limit is enforced');
});

// Free-disk floor: demand more free space than any disk has.
await withServer({ PORTAL_MIN_FREE: String(2 ** 52) }, async ({ send }) => {
  const r = await send(10);
  check(r.status === 507 && /disk space/.test((await r.json()).error), 'upload is refused when it would leave too little free disk');
});

console.log('All ' + checks + ' limit checks passed.');
