// ---------------------------------------------------------------------------
// Sesion del panel de respuestas.
//
// No hay SSO disponible para esta herramienta, asi que el acceso se controla con
// una contrasena compartida (variable de entorno DASHBOARD_PASSWORD) que emite un
// token firmado con HMAC-SHA256. El token caduca a los 15 minutos de inactividad,
// como exige POL-TIC-001, y se renueva en cada peticion valida.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto';

const MINUTOS_INACTIVIDAD = 15;

function secreto() {
  const pass = process.env.DASHBOARD_PASSWORD || '';
  const sal = process.env.IP_SALT || '';
  if (!pass) throw new Error('DASHBOARD_PASSWORD no esta configurada');
  // La llave de firma se deriva de la contrasena: al rotarla, los tokens vivos mueren.
  return crypto.createHash('sha256').update('feedback-nova|' + pass + '|' + sal).digest();
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deB64url(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Comparacion en tiempo constante: no filtra informacion por el tiempo de respuesta. */
export function contrasenaCorrecta(intento) {
  const esperada = process.env.DASHBOARD_PASSWORD || '';
  if (!esperada) return false;
  const a = crypto.createHash('sha256').update(String(intento ?? '')).digest();
  const b = crypto.createHash('sha256').update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}

export function emitirToken() {
  const carga = JSON.stringify({ exp: Date.now() + MINUTOS_INACTIVIDAD * 60_000 });
  const cuerpo = b64url(carga);
  const firma = b64url(crypto.createHmac('sha256', secreto()).update(cuerpo).digest());
  return cuerpo + '.' + firma;
}

/** Devuelve true si el token es autentico y no ha caducado. */
export function tokenValido(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [cuerpo, firma] = token.split('.');
  if (!cuerpo || !firma) return false;

  let esperada, recibida;
  try {
    esperada = crypto.createHmac('sha256', secreto()).update(cuerpo).digest();
    recibida = deB64url(firma);
  } catch {
    return false;
  }
  if (recibida.length !== esperada.length) return false;
  if (!crypto.timingSafeEqual(recibida, esperada)) return false;

  try {
    const { exp } = JSON.parse(deB64url(cuerpo).toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}

/** Lee el token del encabezado Authorization: Bearer <token>. */
export function tokenDeSolicitud(req) {
  const h = req.headers?.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

export const SESION = { MINUTOS_INACTIVIDAD };
