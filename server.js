// ---------------------------------------------------------------------------
// Servidor de DESARROLLO. Imita el enrutamiento de Vercel: sirve public/ y
// despacha /api/<nombre> a la funcion api/<nombre>.js.
// En produccion Vercel usa esas mismas funciones; este archivo no se despliega.
// ---------------------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');

// Carga .env sin dependencias externas.
try {
  for (const linea of fs.readFileSync(path.join(RAIZ, '.env'), 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) continue;
    const valor = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = valor;
  }
} catch { /* sin .env: se usan las variables del entorno */ }

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname;

  if (ruta.startsWith('/api/')) {
    const nombre = ruta.slice(5).replace(/[^a-z0-9_-]/gi, '');
    const archivo = path.join(RAIZ, 'api', nombre + '.js');

    // El 404 se decide por la existencia del archivo, no por el error del import:
    // asi un fallo de dependencia dentro del handler no se disfraza de "no existe".
    if (!nombre || !fs.existsSync(archivo)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Endpoint no encontrado.' }));
    }

    try {
      const modulo = await import(`./api/${nombre}.js`);
      return await modulo.default(req, res);
    } catch (err) {
      console.error(`[api/${nombre}]`, err?.stack || err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Error interno. Revisa la consola del servidor.' }));
    }
  }

  // Archivos estaticos, con /  ->  index.html y /dashboard -> dashboard.html
  let relativa = ruta === '/' ? 'index.html' : decodeURIComponent(ruta).replace(/^\/+/, '');
  if (!path.extname(relativa)) relativa += '.html';

  const destino = path.join(PUBLICO, relativa);
  if (!destino.startsWith(PUBLICO)) { // defensa contra path traversal
    res.statusCode = 403;
    return res.end('Prohibido');
  }

  fs.readFile(destino, (err, datos) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end('No encontrado');
    }
    res.setHeader('Content-Type', TIPOS[path.extname(destino)] || 'application/octet-stream');
    res.end(datos);
  });
});

const PUERTO = Number(process.env.PORT) || 3020;
servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log('');
  console.log('  Feedback Nova · Grupo Ternova');
  console.log(`  Formulario   http://127.0.0.1:${PUERTO}/`);
  console.log(`  Panel        http://127.0.0.1:${PUERTO}/dashboard`);
  console.log(`  Diagnostico  http://127.0.0.1:${PUERTO}/api/salud`);
  console.log('');
  console.log(`  Base de datos: ${process.env.DATABASE_URL ? 'configurada' : 'FALTA DATABASE_URL'}`);
  console.log(`  Panel:         ${process.env.DASHBOARD_PASSWORD ? 'configurado' : 'FALTA DASHBOARD_PASSWORD'}`);
  console.log('');
});
