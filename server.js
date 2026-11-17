'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { validPlannerData } = require('./sync.js');
const { createNewsReader } = require('./news.js');

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/fitness.css', ['fitness.css', 'text/css']],
  ['/discover.css', ['discover.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/planner.js', ['planner.js', 'text/javascript']],
  ['/courses.js', ['courses.js', 'text/javascript']],
  ['/sync.js', ['sync.js', 'text/javascript']],
  ['/fitness.js', ['fitness.js', 'text/javascript']],
  ['/discover.js', ['discover.js', 'text/javascript']],
  ['/personal.js', ['personal.js', 'text/javascript']],
]);
const maxPayload = 4 * 1024 * 1024;

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on('data', chunk => {
      bytes += chunk.length;
      if (bytes <= maxPayload) chunks.push(chunk);
      else reject(Object.assign(new Error('Plan too large'), { status: 413 }));
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(Object.assign(error, { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function readSnapshot(file) {
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof record.revision !== 'string' || !validPlannerData(record.data)) throw new Error('Plan dosyası geçersiz.');
    return record;
  } catch (error) {
    if (error.code === 'ENOENT') return { revision: null, data: null };
    throw error;
  }
}

function createPlannerServer(directory, code) {
  const dailyNews = createNewsReader();
  const file = path.join(directory, 'plan.json');
  const expected = Buffer.from('Bearer ' + code);
  let record = readSnapshot(file);
  const server = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const pathname = request.url?.split('?', 1)[0];
    if (pathname === '/api/news' && request.method === 'GET') {
      const news = await dailyNews();
      sendJson(response, news.checked ? 200 : 503, news);
      return;
    }
    if (pathname !== '/api/sync') {
      const asset = assets.get(pathname);
      if (!asset || !['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(404).end();
        return;
      }
      const [name, type] = asset;
      response.writeHead(200, {
        'Content-Type': type + '; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(path.join(__dirname, name)).on('error', () => response.destroy()).pipe(response);
      return;
    }

    const origin = request.headers.origin;
    if (origin && origin !== 'http://' + request.headers.host) {
      sendJson(response, 403, { error: 'origin' });
      return;
    }
    const actual = Buffer.from(request.headers.authorization ?? '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      sendJson(response, 401, { error: 'code' });
      return;
    }
    if (request.method === 'GET') {
      sendJson(response, 200, record);
      return;
    }
    if (request.method !== 'PUT' || !request.headers['content-type']?.startsWith('application/json')) {
      sendJson(response, 405, { error: 'method' });
      return;
    }
    try {
      const body = await readBody(request);
      if (!body || !validPlannerData(body.data)) {
        sendJson(response, 400, { error: 'data' });
        return;
      }
      if (body.revision !== record.revision) {
        sendJson(response, 409, { error: 'revision', revision: record.revision });
        return;
      }
      const next = { revision: randomBytes(16).toString('hex'), data: body.data };
      fs.mkdirSync(directory, { recursive: true });
      const temporary = path.join(directory, 'plan-' + next.revision + '.tmp');
      try {
        fs.writeFileSync(temporary, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
        fs.renameSync(temporary, file);
      } catch (error) {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        throw error;
      }
      record = next;
      sendJson(response, 200, { revision: record.revision });
    } catch (error) {
      if (!response.destroyed) sendJson(response, error.status ?? 500, { error: 'save' });
    }
  });
  server.requestTimeout = 15000;
  return server;
}

if (require.main === module) {
  const lan = process.argv.includes('--lan');
  const directory = process.env.EVERYTHING_APP_DATA_DIR ?? path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'EverythingApp');
  const code = randomBytes(18).toString('base64url');
  const port = 4173;
  const server = createPlannerServer(directory, code);
  server.on('error', error => {
    console.error('Sunucu açılamadı:', error.message);
    process.exitCode = 1;
  });
  server.listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
    console.log('Bu bilgisayar: http://127.0.0.1:' + port);
    if (lan) {
      for (const address of Object.values(os.networkInterfaces()).flat()) {
        if (address.family === 'IPv4' && !address.internal) console.log('Ağ adresi: http://' + address.address + ':' + port);
      }
    }
    console.log('Eşitleme kodu: ' + code);
  });
}

module.exports = { createPlannerServer };
