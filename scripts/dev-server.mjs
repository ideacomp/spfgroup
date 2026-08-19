// Lokální náhrada `vercel dev` — obslouží statické soubory a nasměruje
// /api/kontakt na stejný handler, který na Vercelu poběží jako funkce.
// Spuštění: node scripts/dev-server.mjs   (volitelně PORT=8934)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 8934;

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg':  'image/svg+xml',
    '.webp': 'image/webp',
    '.ico':  'image/x-icon'
};

// Minimální náhrada Vercel res objektu (status/json/setHeader)
function wrapRes(res) {
    res.status = code => { res.statusCode = code; return res; };
    res.json = payload => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
        return res;
    };
    return res;
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
            if (data.length > 1e6) reject(new Error('body too large'));
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname.startsWith('/api/')) {
        const name = url.pathname.slice(5);
        let handler;
        try {
            ({ default: handler } = await import(`../api/${name}.js`));
        } catch {
            res.statusCode = 404;
            return res.end('Not found');
        }
        const raw = await readBody(req);
        req.body = (req.headers['content-type'] || '').includes('application/json')
            ? (() => { try { return JSON.parse(raw); } catch { return raw; } })()
            : raw;
        return handler(req, wrapRes(res));
    }

    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const path = join(ROOT, normalize(rel));
    if (!path.startsWith(ROOT)) {
        res.statusCode = 403;
        return res.end('Forbidden');
    }

    try {
        const file = await readFile(path);
        res.setHeader('Content-Type', TYPES[extname(path)] || 'application/octet-stream');
        res.end(file);
    } catch {
        res.statusCode = 404;
        res.end('Not found');
    }
});

server.listen(PORT, () => console.log(`Web běží na http://localhost:${PORT}`));
