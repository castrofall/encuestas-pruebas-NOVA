// ---------------------------------------------------------------------------
// Agregados que alimentan el panel de respuestas.
// Se calculan en el servidor para que el navegador solo reciba numeros listos.
// ---------------------------------------------------------------------------
import { CASOS_USO, AREAS, FRECUENCIAS, TIEMPOS_AHORRADOS, CONFIANZAS } from './validacion.js';

const DIMENSIONES = [
  { clave: 'satisfaccion', etiqueta: 'Experiencia general' },
  { clave: 'calidad', etiqueta: 'Calidad de las respuestas' },
  { clave: 'velocidad', etiqueta: 'Velocidad' },
  { clave: 'facilidad', etiqueta: 'Facilidad de uso' },
];

function promedio(valores) {
  const v = valores.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
}

/** Cuenta ocurrencias respetando el orden del catalogo, para que el color no baile. */
function conteoOrdenado(filas, campo, catalogo) {
  const mapa = new Map(catalogo.map((c) => [c, 0]));
  for (const f of filas) {
    const v = f[campo];
    if (v && mapa.has(v)) mapa.set(v, mapa.get(v) + 1);
  }
  return [...mapa.entries()]
    .map(([etiqueta, n]) => ({ etiqueta, n }))
    .filter((x) => x.n > 0);
}

function conteoCasosUso(filas) {
  const mapa = new Map(CASOS_USO.map((c) => [c, 0]));
  for (const f of filas) {
    const lista = Array.isArray(f.casos_uso) ? f.casos_uso : [];
    for (const c of lista) if (mapa.has(c)) mapa.set(c, mapa.get(c) + 1);
  }
  return [...mapa.entries()]
    .map(([etiqueta, n]) => ({ etiqueta, n }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
}

/** Distribucion 1..5 de una dimension. */
function distribucion5(filas, campo) {
  const cubos = [0, 0, 0, 0, 0];
  for (const f of filas) {
    const v = f[campo];
    if (Number.isInteger(v) && v >= 1 && v <= 5) cubos[v - 1] += 1;
  }
  return cubos.map((n, i) => ({ etiqueta: String(i + 1), n }));
}

/**
 * NPS estandar: % promotores (9-10) menos % detractores (0-6).
 * Los pasivos (7-8) cuentan en el total pero no suman ni restan.
 */
function calcularNps(filas) {
  const valores = filas.map((f) => f.nps).filter((n) => Number.isInteger(n));
  if (!valores.length) return { puntaje: null, promotores: 0, pasivos: 0, detractores: 0, total: 0 };
  const promotores = valores.filter((n) => n >= 9).length;
  const pasivos = valores.filter((n) => n >= 7 && n <= 8).length;
  const detractores = valores.filter((n) => n <= 6).length;
  const puntaje = Math.round(((promotores - detractores) / valores.length) * 100);
  return { puntaje, promotores, pasivos, detractores, total: valores.length };
}

/** Serie diaria de respuestas para ver el ritmo de participacion. */
function porDia(filas) {
  const mapa = new Map();
  for (const f of filas) {
    const d = new Date(f.creado_en);
    if (Number.isNaN(d.getTime())) continue;
    const clave = d.toISOString().slice(0, 10);
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([fecha, n]) => ({ fecha, n }));
}

export function construirMetricas(filas) {
  const total = filas.length;

  return {
    total,
    participantes: new Set(filas.map((f) => (f.correo || '').toLowerCase())).size,
    ultima: total ? filas[0].creado_en : null,
    contactables: filas.filter((f) => f.contactable).length,
    nps: calcularNps(filas),
    dimensiones: DIMENSIONES.map((d) => ({
      ...d,
      promedio: promedio(filas.map((f) => f[d.clave])),
      distribucion: distribucion5(filas, d.clave),
    })),
    areas: conteoOrdenado(filas, 'area', AREAS).sort((a, b) => b.n - a.n),
    frecuencias: conteoOrdenado(filas, 'frecuencia_uso', FRECUENCIAS),
    tiempos: conteoOrdenado(filas, 'tiempo_ahorrado', TIEMPOS_AHORRADOS),
    confianzas: conteoOrdenado(filas, 'confianza', CONFIANZAS),
    casosUso: conteoCasosUso(filas),
    porDia: porDia(filas),
  };
}

/** Serializa las respuestas a CSV (separador coma, comillas dobles escapadas). */
export function aCsv(filas) {
  const columnas = [
    'id', 'creado_en', 'nombre', 'correo', 'area', 'frecuencia_uso',
    'satisfaccion', 'calidad', 'velocidad', 'facilidad', 'nps',
    'casos_uso', 'tiempo_ahorrado', 'confianza',
    'lo_mejor', 'problemas', 'mejoras', 'futuro', 'comentario', 'contactable',
  ];

  const celda = (v) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join(' | ') : v instanceof Date ? v.toISOString() : String(v);
    // Prefijo defensivo: impide que Excel ejecute una celda que empiece con = + - @
    const seguro = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
    return '"' + seguro.replace(/"/g, '""') + '"';
  };

  const lineas = [columnas.join(',')];
  for (const f of filas) lineas.push(columnas.map((c) => celda(f[c])).join(','));
  // BOM para que Excel en Windows respete los acentos.
  return '﻿' + lineas.join('\r\n');
}
