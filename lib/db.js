// ---------------------------------------------------------------------------
// Acceso a datos.
//
// En produccion usa Neon (PostgreSQL sobre HTTP). Todas las consultas usan
// plantillas etiquetadas -> los valores viajan como parametros ligados, nunca
// concatenados (defensa contra inyeccion SQL).
//
// Si DATABASE_URL vale exactamente "memoria", se usa el almacen en memoria de
// lib/memoria.js para poder desarrollar sin base de datos.
// ---------------------------------------------------------------------------
import * as memoria from './memoria.js';

let _sql = null;

const enMemoria = () => memoria.ES_MEMORIA(process.env.DATABASE_URL);

/**
 * Cliente de Neon. El driver se importa de forma perezosa para que el modo
 * memoria funcione aunque el paquete no este instalado (util cuando la red
 * corporativa bloquea el registro de npm).
 */
export async function sql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no esta configurada');
  if (enMemoria()) throw new Error('El modo memoria no expone SQL directo');
  const { neon } = await import('@neondatabase/serverless');
  _sql = neon(url);
  return _sql;
}

export function hayBaseDeDatos() {
  return Boolean(process.env.DATABASE_URL);
}

export function esModoMemoria() {
  return enMemoria();
}

/** Inserta una respuesta y devuelve su id y fecha. */
export async function guardarFeedback(r) {
  if (enMemoria()) return memoria.guardarFeedback(r);
  const q = await sql();
  const filas = await q`
    INSERT INTO feedback_nova (
      nombre, correo, area, frecuencia_uso,
      satisfaccion, calidad, velocidad, facilidad, nps,
      casos_uso, tiempo_ahorrado, confianza,
      lo_mejor, problemas, mejoras, futuro, comentario,
      contactable, ip_hash, user_agent
    ) VALUES (
      ${r.nombre}, ${r.correo}, ${r.area}, ${r.frecuencia_uso},
      ${r.satisfaccion}, ${r.calidad}, ${r.velocidad}, ${r.facilidad}, ${r.nps},
      ${r.casos_uso}, ${r.tiempo_ahorrado}, ${r.confianza},
      ${r.lo_mejor}, ${r.problemas}, ${r.mejoras}, ${r.futuro}, ${r.comentario},
      ${r.contactable}, ${r.ip_hash}, ${r.user_agent}
    )
    RETURNING id, creado_en`;
  return filas[0];
}

/** Cuantos envios lleva esta IP en los ultimos N minutos (control de abuso). */
export async function enviosRecientesPorIp(ipHash, minutos) {
  if (enMemoria()) return memoria.enviosRecientesPorIp(ipHash, minutos);
  if (!ipHash) return 0;
  const q = await sql();
  const filas = await q`
    SELECT count(*)::int AS n FROM feedback_nova
    WHERE ip_hash = ${ipHash}
      AND creado_en > now() - (${minutos} * INTERVAL '1 minute')`;
  return filas[0]?.n ?? 0;
}

/** Cuantos envios lleva este correo en las ultimas 24 horas. */
export async function enviosRecientesPorCorreo(correo) {
  if (enMemoria()) return memoria.enviosRecientesPorCorreo(correo);
  const q = await sql();
  const filas = await q`
    SELECT count(*)::int AS n FROM feedback_nova
    WHERE lower(correo) = lower(${correo})
      AND creado_en > now() - INTERVAL '24 hours'`;
  return filas[0]?.n ?? 0;
}

/** Todas las respuestas, mas recientes primero. */
export async function listarFeedback(limite = 1000) {
  if (enMemoria()) return memoria.listarFeedback(limite);
  const q = await sql();
  return await q`
    SELECT * FROM feedback_nova
    ORDER BY creado_en DESC
    LIMIT ${limite}`;
}

/** Registra un evento en la bitacora de accesos al panel. */
export async function registrarAcceso(evento, ipHash, userAgent) {
  try {
    if (enMemoria()) return await memoria.registrarAcceso(evento, ipHash, userAgent);
    const q = await sql();
    await q`
      INSERT INTO feedback_nova_accesos (evento, ip_hash, user_agent)
      VALUES (${evento}, ${ipHash}, ${userAgent})`;
  } catch (e) {
    // La bitacora nunca debe tumbar la peticion principal.
    console.error('[bitacora] no se pudo registrar el acceso:', e.message);
  }
}

/** Intentos de login fallidos de esta IP en los ultimos N minutos. */
export async function loginsFallidosRecientes(ipHash, minutos) {
  try {
    if (enMemoria()) return await memoria.loginsFallidosRecientes(ipHash, minutos);
    if (!ipHash) return 0;
    const q = await sql();
    const filas = await q`
      SELECT count(*)::int AS n FROM feedback_nova_accesos
      WHERE ip_hash = ${ipHash} AND evento = 'login_fallido'
        AND creado_en > now() - (${minutos} * INTERVAL '1 minute')`;
    return filas[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

/** Cuenta total de respuestas. La usa el diagnostico /api/salud. */
export async function contarFeedback() {
  if (enMemoria()) return memoria.contar();
  const q = await sql();
  const filas = await q`SELECT count(*)::int AS n FROM feedback_nova`;
  return filas[0].n;
}
