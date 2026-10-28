// שרת HTTP: API + קבצי הממשק
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ptachDb } from './db.js';
import { Sherut, ShgiatKelet } from './sherut.js';

const SHORESH = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(SHORESH, 'public');
const SUGIM = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

export function tzorShrat(sherut) {
  const nitivim = [];
  const nativ = (method, pattern, fn) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    nitivim.push({ method, re, keys, fn });
  };

  nativ('GET', '/api/klali', () => sherut.klali());
  nativ('POST', '/api/ovdim', (_, b) => ({ id: sherut.shmorOved(b) }));
  nativ('DELETE', '/api/ovdim/:id', (p) => { sherut.mechakOved(Number(p.id)); return { ok: true }; });
  nativ('PUT', '/api/hagdarot', (_, b) => sherut.shmorHagdarot(b));
  nativ('PUT', '/api/matzav-ptiha', (_, b) => sherut.shmorMatzavPtiha(b));
  nativ('GET', '/api/nochechut/:taarich', (p) => sherut.nochechut(p.taarich));
  nativ('PUT', '/api/nochechut/:taarich', (p, b) => sherut.shmorNochechut(p.taarich, b.statusim || {}));
  nativ('POST', '/api/hatamat-shemot', (_, b) => sherut.hatamatShemot(b.txt));
  nativ('GET', '/api/nidrash/:taarich', (p) => sherut.nidrash(p.taarich));
  nativ('GET', '/api/shibutz/:taarich', (p) => sherut.shibutz(p.taarich));
  nativ('POST', '/api/shibutz/:taarich/yetzira', (p) => sherut.yetzorTyuta(p.taarich));
  nativ('PUT', '/api/shibutz/:taarich', (p, b) => sherut.edkenShibutz(p.taarich, b.shinuyim || []));
  nativ('POST', '/api/shibutz/:taarich/mechadash', (p, b) => sherut.shabetzMechadash(p.taarich, b.shaa));
  nativ('POST', '/api/shibutz/:taarich/pirsum', (p, b) => sherut.pirsum(p.taarich, !!b.ishur));
  nativ('GET', '/api/shibutz/:taarich/yetzu', (p) => ({ txt: sherut.yetzu(p.taarich) }));
  nativ('GET', '/api/shibutzim', () => sherut.yemeiShibutz());
  nativ('GET', '/api/historia', (_, __, q) => sherut.historia(Object.fromEntries(q)));
  nativ('GET', '/api/hogenut', () => sherut.hogenut());

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname.startsWith('/api/')) {
        const n = nitivim.find((x) => x.method === req.method && x.re.test(url.pathname));
        if (!n) return shlach(res, 404, { shgia: 'לא נמצא' });
        const m = url.pathname.match(n.re);
        const p = Object.fromEntries(n.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        let guf = {};
        if (req.method !== 'GET') {
          let raw = '';
          for await (const c of req) raw += c;
          guf = raw ? JSON.parse(raw) : {};
        }
        return shlach(res, 200, await n.fn(p, guf, url.searchParams) ?? null);
      }
      const nativKovetz = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
      const kovetz = join(PUBLIC, nativKovetz);
      if (!kovetz.startsWith(PUBLIC)) return shlach(res, 403, { shgia: 'אסור' });
      const tochen = await readFile(kovetz).catch(() => null);
      if (!tochen) return shlach(res, 404, { shgia: 'לא נמצא' });
      res.writeHead(200, { 'content-type': SUGIM[extname(kovetz)] || 'application/octet-stream' });
      res.end(tochen);
    } catch (e) {
      if (e instanceof ShgiatKelet) return shlach(res, 400, { shgia: e.message, pratim: e.pratim });
      console.error(e);
      shlach(res, 500, { shgia: 'שגיאת שרת: ' + e.message });
    }
  });
}

function shlach(res, kod, guf) {
  res.writeHead(kod, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(guf));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = ptachDb(process.env.DB_PATH || join(SHORESH, 'data', 'shibutz.db'));
  const port = Number(process.env.PORT) || 3000;
  tzorShrat(new Sherut(db)).listen(port, () => console.log(`שיבוץ צוות מטבח: http://localhost:${port}`));
}
