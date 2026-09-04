// ---------------------------------------------------------------------------
// Validacion y saneado de la entrada del formulario.
// Regla: nada llega a la base de datos sin pasar por aqui.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto';

export const LIMITES = {
  nombre: 80,
  correo: 120,
  area: 60,
  texto: 2000,
  casosUso: 12,
  casoUso: 60,
};

export const AREAS = [
  'Tecnología de la Información',
  'Operaciones / Producción',
  'Cadena de Suministro / Logística',
  'Comercial / Ventas',
  'Mercadeo',
  'Finanzas / Contabilidad',
  'Talento Humano',
  'Calidad',
  'Mantenimiento',
  'Dirección / Gerencia',
  'Otra',
];

export const FRECUENCIAS = [
  'Todos los días',
  'Varias veces por semana',
  'Una vez por semana',
  'Solo la probé un par de veces',
];

export const CASOS_USO = [
  'Redactar o mejorar textos y correos',
  'Resumir documentos o reuniones',
  'Analizar datos o generar reportes',
  'Traducir contenido',
  'Programar o revisar código',
  'Buscar información interna',
  'Generar ideas o lluvia de ideas',
  'Automatizar tareas repetitivas',
  'Atender consultas de usuarios',
  'Otro',
];

export const TIEMPOS_AHORRADOS = [
  'Nada, me tomó el mismo tiempo',
  'Menos de 1 hora por semana',
  'Entre 1 y 3 horas por semana',
  'Entre 3 y 5 horas por semana',
  'Más de 5 horas por semana',
];

export const CONFIANZAS = [
  'Sí, usaría su respuesta tal cual',
  'Sí, pero siempre la reviso antes',
  'Solo para tareas de bajo riesgo',
  'Todavía no confío en sus respuestas',
];

const RE_CORREO = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const RE_NOMBRE = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ' .-]+$/;

function texto(v, max) {
  if (typeof v !== 'string') return '';
  // Descarta caracteres de control (salvo tabulador y saltos de linea) y DEL.
  let limpio = '';
  for (const ch of v) {
    const c = ch.codePointAt(0);
    if (c === 127) continue;
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) continue;
    limpio += ch;
  }
  return limpio.trim().slice(0, max);
}

function entero(v, min, max) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function deLista(v, lista) {
  const t = texto(v, 120);
  return lista.includes(t) ? t : null;
}

/**
 * Valida el cuerpo recibido. Devuelve { ok, errores, datos }.
 * `errores` es un objeto campo -> mensaje en espanol, apto para mostrar al usuario.
 */
export function validarFeedback(body, opciones = {}) {
  const dominio = (opciones.dominio || 'ternova.group').toLowerCase();
  const errores = {};
  const b = body && typeof body === 'object' ? body : {};

  const nombre = texto(b.nombre, LIMITES.nombre);
  if (nombre.length < 3) errores.nombre = 'Escribe tu nombre completo.';
  else if (!RE_NOMBRE.test(nombre)) errores.nombre = 'El nombre solo puede llevar letras, espacios, apóstrofes y guiones.';

  const correo = texto(b.correo, LIMITES.correo).toLowerCase();
  if (!correo) errores.correo = 'Escribe tu correo institucional.';
  else if (!RE_CORREO.test(correo)) errores.correo = 'Ese correo no tiene un formato válido.';
  else if (!correo.endsWith('@' + dominio)) errores.correo = `El correo debe terminar en @${dominio}.`;

  const area = deLista(b.area, AREAS);
  if (!area) errores.area = 'Selecciona tu área.';

  const satisfaccion = entero(b.satisfaccion, 1, 5);
  if (satisfaccion === null) errores.satisfaccion = 'Califica tu experiencia general.';

  const calidad = entero(b.calidad, 1, 5);
  if (calidad === null) errores.calidad = 'Califica la calidad de las respuestas.';

  const velocidad = entero(b.velocidad, 1, 5);
  if (velocidad === null) errores.velocidad = 'Califica la velocidad de respuesta.';

  const facilidad = entero(b.facilidad, 1, 5);
  if (facilidad === null) errores.facilidad = 'Califica qué tan fácil fue usarlo.';

  const nps = entero(b.nps, 0, 10);
  if (nps === null) errores.nps = 'Indica qué tan probable es que lo recomiendes.';

  // Campos en pausa: el formulario ya no los pregunta, pero se siguen aceptando
  // y guardando por si se vuelven a activar. Nunca son obligatorios.
  const frecuencia_uso = deLista(b.frecuencia_uso, FRECUENCIAS);

  const casos_uso = Array.isArray(b.casos_uso)
    ? [...new Set(b.casos_uso.map((c) => texto(c, LIMITES.casoUso)).filter((c) => CASOS_USO.includes(c)))].slice(0, LIMITES.casosUso)
    : [];

  const tiempo_ahorrado = deLista(b.tiempo_ahorrado, TIEMPOS_AHORRADOS);
  const confianza = deLista(b.confianza, CONFIANZAS);

  const lo_mejor = texto(b.lo_mejor, LIMITES.texto);
  if (lo_mejor.length < 15) errores.lo_mejor = 'Cuéntanos con un poco más de detalle (mínimo 15 caracteres).';

  const problemas = texto(b.problemas, LIMITES.texto);
  if (problemas.length < 15) errores.problemas = 'Cuéntanos con un poco más de detalle (mínimo 15 caracteres).';

  const mejoras = texto(b.mejoras, LIMITES.texto);
  if (mejoras.length < 15) errores.mejoras = 'Cuéntanos con un poco más de detalle (mínimo 15 caracteres).';

  const futuro = texto(b.futuro, LIMITES.texto);
  const comentario = texto(b.comentario, LIMITES.texto);
  const contactable = b.contactable === true || b.contactable === 'true';

  return {
    ok: Object.keys(errores).length === 0,
    errores,
    datos: {
      nombre, correo, area, frecuencia_uso,
      satisfaccion, calidad, velocidad, facilidad, nps,
      casos_uso, tiempo_ahorrado, confianza,
      lo_mejor, problemas, mejoras, futuro, comentario,
      contactable,
    },
  };
}

/** Hash con sal de la IP: permite contar abusos sin almacenar el dato personal. */
export function hashIp(ip, sal) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(String(sal || '') + '|' + ip).digest('hex').slice(0, 32);
}

/** Extrae la IP del cliente respetando la cadena de proxies de Vercel. */
export function ipDeSolicitud(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf) return xf.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || null;
}
