// ---------------------------------------------------------------------------
// Utilidades compartidas por las funciones de /api.
// Funcionan igual en Vercel y en el servidor local de desarrollo.
// ---------------------------------------------------------------------------

const MAX_CUERPO = 64 * 1024; // 64 KB: mas que suficiente para el formulario.

/** Lee y parsea el cuerpo JSON. Lanza si excede el limite o no es JSON valido. */
export async function leerJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel ya lo parseo.
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);

  const trozos = [];
  let tamano = 0;
  for await (const t of req) {
    tamano += t.length;
    if (tamano > MAX_CUERPO) throw new Error('cuerpo demasiado grande');
    trozos.push(t);
  }
  if (!trozos.length) return {};
  return JSON.parse(Buffer.concat(trozos).toString('utf8'));
}

export function responder(res, estado, datos) {
  res.statusCode = estado;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(datos));
}

/** Verifica el metodo HTTP; si no coincide responde 405 y devuelve false. */
export function exigirMetodo(req, res, metodo) {
  if (req.method === metodo) return true;
  res.setHeader('Allow', metodo);
  responder(res, 405, { error: 'Metodo no permitido.' });
  return false;
}

/**
 * Registra un error completo en el log del servidor pero devuelve al cliente un
 * mensaje generico: los detalles internos nunca se exponen (POL-TIC-001).
 */
export function errorInterno(res, contexto, err) {
  console.error(`[${contexto}]`, err?.stack || err?.message || err);
  responder(res, 500, { error: 'Ocurrio un problema al procesar tu solicitud. Intenta de nuevo en unos minutos.' });
}
