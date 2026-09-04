// ---------------------------------------------------------------------------
// Almacen EN MEMORIA para desarrollo local.
// Se activa poniendo DATABASE_URL=memoria en el .env: permite abrir el
// formulario y el panel sin conectarse a Neon. Los datos se pierden al reiniciar
// el servidor. Nunca se usa en Vercel: alli DATABASE_URL siempre apunta a Neon.
// ---------------------------------------------------------------------------

const respuestas = [];
const accesos = [];
let siguienteId = 1;

export const ES_MEMORIA = (url) => String(url || '').trim().toLowerCase() === 'memoria';

export async function guardarFeedback(r) {
  const fila = { id: siguienteId++, creado_en: new Date().toISOString(), ...r };
  respuestas.unshift(fila);
  return { id: fila.id, creado_en: fila.creado_en };
}

export async function enviosRecientesPorIp(ipHash, minutos) {
  if (!ipHash) return 0;
  const desde = Date.now() - minutos * 60_000;
  return respuestas.filter((r) => r.ip_hash === ipHash && new Date(r.creado_en).getTime() > desde).length;
}

export async function enviosRecientesPorCorreo(correo) {
  const desde = Date.now() - 24 * 3600_000;
  return respuestas.filter(
    (r) => r.correo?.toLowerCase() === correo.toLowerCase() && new Date(r.creado_en).getTime() > desde
  ).length;
}

export async function listarFeedback(limite = 1000) {
  return respuestas.slice(0, limite);
}

export async function registrarAcceso(evento, ipHash, userAgent) {
  accesos.unshift({ id: accesos.length + 1, creado_en: new Date().toISOString(), evento, ip_hash: ipHash, user_agent: userAgent });
}

export async function loginsFallidosRecientes(ipHash, minutos) {
  if (!ipHash) return 0;
  const desde = Date.now() - minutos * 60_000;
  return accesos.filter(
    (a) => a.ip_hash === ipHash && a.evento === 'login_fallido' && new Date(a.creado_en).getTime() > desde
  ).length;
}

export async function contar() {
  return respuestas.length;
}

/** Carga respuestas de ejemplo para ver el panel con contenido (solo desarrollo). */
export function sembrar(filas) {
  for (const f of filas) {
    respuestas.push({ id: siguienteId++, creado_en: f.creado_en || new Date().toISOString(), ...f });
  }
  respuestas.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
}
