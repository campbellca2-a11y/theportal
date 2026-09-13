import http from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  readdir,
  stat,
} from 'node:fs/promises';
import {
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import QRCode from 'qrcode';
import { openTally } from './lib/tally.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(process.env.PORTAL_DATA_DIR || join(ROOT, '.portal-data'));
const ITEMS = join(DATA, 'items');
const PORT = Number(process.env.PORTAL_PORT || 48831);
const MAX_FILE = 100 * 1024 * 1024;
const MAX_TOTAL = 1024 * 1024 * 1024;
const interfaces = Object.entries(networkInterfaces()).flatMap(
  ([name, values]) =>
    (values || [])
      .filter(
        (v) =>
          v.family === 'IPv4' &&
          !v.internal &&
          !/vpn|nord|virtual|vethernet|wsl|docker/i.test(name),
      )
      .map((v) => ({ ...v, name })),
);
const lan =
  interfaces.find((v) => v.address === process.env.PORTAL_LAN_IP) ||
  interfaces.find((v) => /ethernet|wi-?fi|wlan/i.test(v.name)) ||
  interfaces[0];
const LOCAL_ONLY = process.env.PORTAL_LOCAL_ONLY === '1';
await mkdir(ITEMS, { recursive: true });
let access;
try {
  access = JSON.parse(await readFile(join(DATA, 'access.json'), 'utf8')).token;
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  access = randomBytes(32).toString('hex');
  await writeFile(
    join(DATA, 'access.json'),
    JSON.stringify({ token: access }),
    { flag: 'wx' },
  );
}
if (!/^[a-f0-9]{64}$/.test(access))
  throw new Error('Invalid portal access file.');
const records = new Map();
let recoveryBytes = 0;
for (const name of await readdir(ITEMS)) {
  if (!/^[a-f0-9-]{36}\.json$/.test(name)) continue;
  try {
    const item = JSON.parse(await readFile(join(ITEMS, name), 'utf8'));
    if (
      item.id !== name.slice(0, -5) ||
      !Number.isSafeInteger(item.size) ||
      item.size < 0 ||
      typeof item.name !== 'string' ||
      typeof item.mime !== 'string' ||
      !Number.isFinite(item.created)
    )
      throw new Error('Invalid item metadata');
    const file = await stat(join(ITEMS, item.id + '.bin')).catch(() => null);
    if (file && file.size === item.size) records.set(item.id, item);
    else throw new Error('File does not match its metadata');
  } catch (e) {
    const file = await stat(join(ITEMS, name.slice(0, -5) + '.bin')).catch(
      () => null,
    );
    recoveryBytes += file?.size || 0;
    console.warn('Preserved a damaged record for manual recovery:', name);
  }
}
// These incomplete transfers never received a success response.
for (const name of await readdir(ITEMS)) {
  if (/^[a-f0-9-]{36}\.(?:part|json\.part)$/.test(name))
    await unlink(join(ITEMS, name));
  if (
    /^[a-f0-9-]{36}\.bin$/.test(name) &&
    !(await stat(join(ITEMS, name.slice(0, -4) + '.json')).catch(() => null))
  )
    await unlink(join(ITEMS, name));
}
const tally = await openTally(DATA, records);
let reserved = 0;
let pairing;
const attempts = new Map();
function freshPairing() {
  if (!pairing || pairing.expires < Date.now())
    pairing = {
      token: randomBytes(24).toString('hex'),
      code: String(randomInt(100000, 1000000)),
      expires: Date.now() + 10 * 60 * 1000,
    };
  return pairing;
}
function eq(a, b) {
  return (
    typeof a === 'string' &&
    typeof b === 'string' &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
function local(req) {
  return (
    req.socket.remoteAddress === '127.0.0.1' ||
    req.socket.remoteAddress === '::1'
  );
}
function ipNumber(ip) {
  return ip.split('.').reduce((n, b) => (n << 8) | Number(b), 0);
}
function sameLan(req) {
  return (
    local(req) ||
    (lan &&
      (ipNumber(req.socket.remoteAddress || '') & ipNumber(lan.netmask)) ===
        (ipNumber(lan.address) & ipNumber(lan.netmask)))
  );
}
function auth(req) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('portal_access='));
  return eq(cookie?.slice(14), access);
}
function cookie(res) {
  res.setHeader(
    'Set-Cookie',
    'portal_access=' +
      access +
      '; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000',
  );
}
function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(value));
}
async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096)
      throw Object.assign(new Error('Request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid request.'), { status: 400 });
  }
}
const inlineMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp',
]);
const staticMime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};
async function handle(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  const allowedHosts = new Set([
    '127.0.0.1:' + PORT,
    'localhost:' + PORT,
    '127.0.0.1:48832',
    ...(lan ? [lan.address + ':' + PORT] : []),
  ]);
  if (!allowedHosts.has(req.headers.host) || !sameLan(req))
    return json(res, 403, { error: 'Use this PC or the same home network.' });
  if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host)
    return json(res, 403, { error: 'Cross-site request blocked.' });
  if (req.headers['sec-fetch-site'] === 'cross-site')
    return json(res, 403, { error: 'Cross-site request blocked.' });
  const url = new URL(req.url, 'http://' + req.headers.host);
  if (url.pathname === '/api/health' && req.method === 'GET')
    return json(res, 200, { ready: true, app: 'ThePortal' });
  if (url.pathname === '/api/connect' && req.method === 'POST') {
    const input = await body(req);
    if (local(req) && input.local === true) {
      cookie(res);
      return json(res, 200, { connected: true });
    }
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    const attempt = attempts.get(ip);
    if (attempt && attempt.until > now && attempt.count >= 5)
      return json(res, 429, {
        error: 'Too many attempts. Try again in 10 minutes.',
      });
    const p = pairing;
    const valid =
      p &&
      p.expires > now &&
      (eq(input.token, p.token) || eq(input.code, p.code));
    if (!valid) {
      attempts.set(ip, {
        count: attempt && attempt.until > now ? attempt.count + 1 : 1,
        until: attempt && attempt.until > now ? attempt.until : now + 600000,
      });
      return json(res, 401, {
        error: 'That code is incorrect or expired. Check the code on your PC.',
      });
    }
    attempts.delete(ip);
    cookie(res);
    return json(res, 200, { connected: true });
  }
  if (url.pathname.startsWith('/api/') && !auth(req))
    return json(res, 401, {
      error: 'Pair this device using the code on your PC.',
    });
  if (url.pathname === '/api/info' && req.method === 'GET') {
    const info = {
      maxFile: MAX_FILE,
      maxTotal: MAX_TOTAL,
      local: local(req),
      address: lan ? 'http://' + lan.address + ':' + PORT : null,
    };
    if (local(req) && lan) {
      const p = freshPairing();
      info.pair = {
        code: p.code,
        expires: p.expires,
        qr: await QRCode.toDataURL(info.address + '/#pair=' + p.token, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: 'M',
        }),
      };
    }
    return json(res, 200, info);
  }
  if (url.pathname === '/api/items' && req.method === 'GET') {
    return json(res, 200, {
      items: [...records.values()].sort((a, b) => b.created - a.created),
      used: [...records.values()].reduce((n, r) => n + r.size, 0),
      tally: tally.snapshot(),
    });
  }
  if (url.pathname === '/api/tally/reset' && req.method === 'POST') {
    return json(res, 200, { tally: await tally.reset() });
  }
  if (url.pathname === '/api/items' && req.method === 'POST') {
    const length = Number(req.headers['content-length']);
    if (!Number.isSafeInteger(length) || length < 0)
      return json(res, 411, { error: 'A file size is required.' });
    if (length > MAX_FILE)
      return json(res, 413, {
        error: 'This proof accepts files up to 100 MB.',
      });
    if (
      [...records.values()].reduce((n, r) => n + r.size, 0) +
        recoveryBytes +
        reserved +
        length >
      MAX_TOTAL
    )
      return json(res, 507, {
        error: 'The portal is full (1 GB). Remove some portal copies first.',
      });
    let name;
    try {
      name = decodeURIComponent(req.headers['x-file-name'] || 'file');
    } catch {
      return json(res, 400, { error: 'Invalid file name.' });
    }
    name =
      name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 220) || 'file';
    const mime = String(
      req.headers['content-type'] || 'application/octet-stream',
    )
      .split(';')[0]
      .toLowerCase();
    const id = randomUUID();
    const temp = join(ITEMS, id + '.part');
    const file = join(ITEMS, id + '.bin');
    const meta = join(ITEMS, id + '.json');
    const metaTemp = join(ITEMS, id + '.json.part');
    const item = {
      id,
      name,
      mime,
      size: length,
      created: Date.now(),
      source: local(req) ? 'PC' : 'Phone / device',
    };
    reserved += length;
    let received = 0;
    let committed = false;
    try {
      await pipeline(
        req,
        new Transform({
          transform(chunk, enc, callback) {
            received += chunk.length;
            callback(
              received > length || received > MAX_FILE
                ? new Error('File exceeds its declared size.')
                : null,
              chunk,
            );
          },
        }),
        createWriteStream(temp, { flags: 'wx' }),
      );
      if (received !== length)
        throw new Error('Transfer was interrupted. Send the file again.');
      const currentTally = await tally.run(async () => {
        item.sequence = tally.snapshot().total + 1;
        await rename(temp, file);
        await writeFile(metaTemp, JSON.stringify(item), { flag: 'wx' });
        await rename(metaTemp, meta);
        const updated = await tally.complete();
        records.set(id, item);
        committed = true;
        return updated;
      });
      return json(res, 201, { ...item, tally: currentTally });
    } catch (e) {
      if (!committed)
        await Promise.all(
          [temp, file, meta, metaTemp].map((p) => unlink(p).catch(() => {})),
        );
      if (!res.destroyed) return json(res, 400, { error: e.message });
    } finally {
      reserved -= length;
    }
    return;
  }
  const match = url.pathname.match(
    /^\/api\/items\/([a-f0-9-]{36})(?:\/(file))?$/,
  );
  if (match) {
    const item = records.get(match[1]);
    if (!item)
      return json(res, 404, { error: 'This item is no longer in the portal.' });
    if (req.method === 'DELETE' && !match[2]) {
      await unlink(join(ITEMS, item.id + '.json'));
      records.delete(item.id);
      await unlink(join(ITEMS, item.id + '.bin')).catch(() => {});
      return json(res, 200, { removed: true });
    }
    if (req.method === 'GET' && match[2]) {
      const download =
        url.searchParams.has('download') || !inlineMimes.has(item.mime);
      const asciiName = item.name.replace(/[^\x20-\x7e]|["\\]/g, '_');
      const encoded = encodeURIComponent(item.name).replace(
        /['()*]/g,
        (c) => '%' + c.charCodeAt(0).toString(16),
      );
      res.writeHead(200, {
        'Content-Type': inlineMimes.has(item.mime)
          ? item.mime
          : 'application/octet-stream',
        'Content-Length': item.size,
        'Content-Disposition':
          (download ? 'attachment' : 'inline') +
          '; filename="' +
          asciiName +
          '"; filename*=UTF-8' +
          "''" +
          encoded,
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "sandbox; default-src 'none'",
      });
      await pipeline(createReadStream(join(ITEMS, item.id + '.bin')), res);
      return;
    }
  }
  if (url.pathname.startsWith('/api/'))
    return json(res, 404, { error: 'Not found.' });
  if (!['GET', 'HEAD'].includes(req.method))
    return json(res, 405, { error: 'Method not allowed.' });
  const staticRoot = join(ROOT, 'dist', 'client');
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { error: 'Invalid path.' });
  }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = resolve(staticRoot, relative);
  if (
    !filePath.startsWith(staticRoot + '\\') &&
    !filePath.startsWith(staticRoot + '/')
  )
    return json(res, 403, { error: 'Invalid path.' });
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile())
    return json(res, 404, {
      error: 'Page not found. Run the build if this is a fresh installation.',
    });
  res.writeHead(200, {
    'Content-Type': staticMime[extname(filePath)] || 'application/octet-stream',
    'Content-Length': fileStat.size,
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  await pipeline(createReadStream(filePath), res);
}
const servers = [];
const binds = ['127.0.0.1', ...(!LOCAL_ONLY && lan ? [lan.address] : [])];
for (const host of binds) {
  const server = http.createServer((req, res) =>
    handle(req, res).catch((e) => {
      console.error('Request failed:', e.message);
      if (!res.headersSent && !res.destroyed)
        json(res, e.status || 500, {
          error: 'The PC could not finish that request. Try again.',
        });
      else res.destroy();
    }),
  );
  server.requestTimeout = 5 * 60 * 1000;
  server.headersTimeout = 30000;
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(PORT, host, ok);
  });
  servers.push(server);
}
console.log('ThePortal is running.');
console.log('PC: http://127.0.0.1:' + PORT + '/');
if (!LOCAL_ONLY && lan)
  console.log('Phone: http://' + lan.address + ':' + PORT + '/');
console.log('Copies are stored in ' + DATA);
function shutdown() {
  for (const server of servers) server.close();
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
