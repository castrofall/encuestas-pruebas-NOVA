// POST /api/acceso  ->  valida la contrasena del panel y emite un token de sesion.
import { contrasenaCorrecta, emitirToken, SESION } from '../lib/sesion.js';
import { hashIp, ipDeSolicitud } from '../lib/validacion.js';
import { registrarAcceso, loginsFallidosRecientes, hayBaseDeDatos } from '../lib/db.js';
import { leerJson, responder, exigirMetodo, errorInterno } from '../lib/http.js';

// Bloqueo tras intentos fallidos, alineado con POL-TIC-001.
const MAX_INTENTOS = 4;
const VENTANA_BLOQUEO_MIN = 30;

export default async function handler(req, res) {
  if (!exigirMetodo(req, res, 'POST')) return;

  if (!process.env.DASHBOARD_PASSWORD) {
    return responder(res, 503, { error: 'El panel aun no tiene contrasena configurada.' });
  }

  let cuerpo;
  try {
    cuerpo = await leerJson(req);
  } catch {
    return responder(res, 400, { error: 'Solicitud invalida.' });
  }

  const ip_hash = hashIp(ipDeSolicitud(req), process.env.IP_SALT);
  const ua = String(req.headers['user-agent'] || '').slice(0, 300);

  try {
    if (hayBaseDeDatos() && (await loginsFallidosRecientes(ip_hash, VENTANA_BLOQUEO_MIN)) >= MAX_INTENTOS) {
      return responder(res, 429, {
        error: `Demasiados intentos fallidos. Espera ${VENTANA_BLOQUEO_MIN} minutos antes de volver a intentar.`,
      });
    }

    if (!contrasenaCorrecta(cuerpo.password)) {
      if (hayBaseDeDatos()) await registrarAcceso('login_fallido', ip_hash, ua);
      // Mensaje deliberadamente vago: no revela si la contrasena existe o esta cerca.
      return responder(res, 401, { error: 'Contrasena incorrecta.' });
    }

    if (hayBaseDeDatos()) await registrarAcceso('login_ok', ip_hash, ua);
    return responder(res, 200, { ok: true, token: emitirToken(), minutos: SESION.MINUTOS_INACTIVIDAD });
  } catch (err) {
    return errorInterno(res, 'acceso', err);
  }
}
