// Sirve el build de producción con las cabeceras reales de netlify.toml, incluido el
// redirect SPA, para detectar violaciones de CSP antes de desplegar.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const RAIZ = process.argv[2];
const toml = await readFile('netlify.toml', 'utf8');
const csp = toml.match(/Content-Security-Policy = "([^"]+)"/)[1];

const TIPOS = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
  '.txt': 'text/plain', '.png': 'image/png', '.svg': 'image/svg+xml'
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let ruta = join(RAIZ, url.pathname === '/' ? 'index.html' : url.pathname);
  let cuerpo;
  try {
    cuerpo = await readFile(ruta);
  } catch {
    ruta = join(RAIZ, 'index.html');       // redirect SPA de Netlify
    cuerpo = await readFile(ruta);
  }
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', TIPOS[extname(ruta)] ?? 'application/octet-stream');
  res.end(cuerpo);
}).listen(4330, () => console.log('sirviendo con CSP:', csp.slice(0, 80) + '...'));
