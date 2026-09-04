// GET /api/respuestas          ->  metricas agregadas + respuestas (requiere token)
// GET /api/respuestas?formato=csv ->  exporta todo a CSV
import { tokenValido, tokenDeSolicitud, emitirToken } from '../lib/sesion.js';
import { listarFeedback, registrarAcceso, hayBaseDeDatos } from '../lib/db.js';
import { construirMetricas, aCsv } from '../lib/metricas.js';
import { hashIp, ipDeSolicitud } from '../lib/validacion.js';
import { responder, exigirMetodo, errorInterno } from '../lib/http.js';

export default async function handler(req, res) {
  if (!exigirMetodo(req, res, 'GET')) return;

  if (!tokenValido(tokenDeSolicitud(req))) {
    return responder(res, 401, { error: 'Sesion expirada. Vuelve a ingresar la contrasena.' });
  }

  if (!hayBaseDeDatos()) {
    return responder(res, 503, { error: 'El panel aun no esta conectado a la base de datos.' });
  }

  const url = new URL(req.url, 'http://local');
  const formato = url.searchParams.get('formato');

  try {
    const filas = await listarFeedback(5000);

    if (formato === 'csv') {
      const ip_hash = hashIp(ipDeSolicitud(req), process.env.IP_SALT);
      await registrarAcceso('export_csv', ip_hash, String(req.headers['user-agent'] || '').slice(0, 300));

      const hoy = new Date().toISOString().slice(0, 10);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="feedback-nova-${hoy}.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.end(aCsv(filas));
    }

    return responder(res, 200, {
      ok: true,
      // Token renovado: la sesion se extiende mientras el panel siga en uso.
      token: emitirToken(),
      metricas: construirMetricas(filas),
      respuestas: filas,
    });
  } catch (err) {
    return errorInterno(res, 'respuestas', err);
  }
}
