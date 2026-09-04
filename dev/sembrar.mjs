// ---------------------------------------------------------------------------
// Siembra respuestas de ejemplo contra el servidor LOCAL para revisar el panel
// con contenido. Envia peticiones reales a /api/feedback, asi que recorre la
// misma validacion y el mismo guardado que usarian los usuarios.
//
//   node dev/sembrar.mjs [cantidad]
//
// Solo para desarrollo. Nunca apuntarlo al despliegue de produccion.
// ---------------------------------------------------------------------------

const BASE = process.env.BASE || 'http://127.0.0.1:3020';
const CANTIDAD = Number(process.argv[2]) || 14;

const PERSONAS = [
  ['Ana María Rodríguez', 'Mercadeo'],
  ['Carlos Alberto Méndez', 'Operaciones / Producción'],
  ['Lucía Fernanda Portillo', 'Tecnología de la Información'],
  ['Roberto Enrique Salazar', 'Finanzas / Contabilidad'],
  ['Gabriela Sofía Cruz', 'Talento Humano'],
  ['Diego Armando Villalta', 'Cadena de Suministro / Logística'],
  ['Marta Elena Ayala', 'Comercial / Ventas'],
  ['Jorge Luis Peña', 'Calidad'],
  ['Sandra Patricia Melgar', 'Dirección / Gerencia'],
  ['Óscar Iván Bonilla', 'Mantenimiento'],
  ['Verónica Isabel Ramos', 'Tecnología de la Información'],
  ['Fernando José Guzmán', 'Operaciones / Producción'],
  ['Claudia Beatriz Orellana', 'Mercadeo'],
  ['Héctor Mauricio Solís', 'Comercial / Ventas'],
];


const MEJOR = [
  'Me resumió un informe de 40 páginas en tres párrafos que sí pude usar en la reunión.',
  'La velocidad. Preguntaba algo y en un segundo ya tenía por dónde empezar.',
  'Que me ayudó a redactar correos difíciles sin sonar cortante.',
  'Poder preguntarle en español y que entienda el contexto de la planta.',
  'Me destrabó dos veces cuando no sabía cómo estructurar un reporte.',
  'Lo práctico que es tenerla ahí sin pedir permiso a nadie para usarla.',
  'La usé para traducir fichas técnicas y quedaron mejor que con el traductor de siempre.',
];

const PROBLEMAS = [
  'Le pedí un dato de un centro de costo y se inventó un número que no existe.',
  'Pierde el hilo cuando cambio de tema y regreso al anterior.',
  'A veces responde muy largo y termino leyendo más de lo que necesitaba.',
  'No conoce nada de nuestros sistemas internos, así que para eso no me sirvió.',
  '',
  'Se tardó bastante cuando le pegué un documento largo.',
  'Repite información que ya le había dado en el mismo chat.',
];

const MEJORAS = [
  'Que no invente datos. Prefiero que diga "no sé" a que me dé un número falso.',
  'Que recuerde el contexto de conversaciones anteriores sin repetirle todo.',
  'Respuestas más cortas por defecto, con opción de pedir el detalle.',
  'Que conozca los procesos y catálogos internos de Ternova.',
  'Que sea más rápida con documentos grandes.',
  'Que pueda leer archivos de Excel directamente.',
  'Poder usarla desde el celular cuando ando en planta.',
];

const FUTURO = [
  'Que se conecte a ClickUp y me arme el reporte semanal sin que yo lo pida.',
  'Que lea los correos y me diga qué es urgente antes de entrar a Outlook.',
  'Integración con Epicor para consultar inventario sin abrir el sistema.',
  'Que genere presentaciones con la plantilla de la marca ya aplicada.',
  '',
  'Un asistente por área, que sepa lo que hace cada quien.',
  'Que me avise de vencimientos y pendientes sin que yo revise.',
];

const azar = (a) => a[Math.floor(Math.random() * a.length)];

function correoDe(nombre) {
  // Descompone los acentos y descarta los signos combinantes (U+0300 a U+036F).
  const sinAcentos = [...nombre.toLowerCase().normalize('NFD')]
    .filter((c) => { const n = c.codePointAt(0); return n < 0x300 || n > 0x36f; })
    .join('');
  const p = sinAcentos.split(' ');
  return p[0][0] + p[p.length - 1] + '@ternova.group';
}

function generar(i) {
  const [nombre, area] = PERSONAS[i % PERSONAS.length];
  // Distribución con sesgo positivo, como suele salir en una prueba piloto.
  const base = azar([3, 4, 4, 4, 5, 5, 2, 5, 3, 4]);
  const cerca = (n) => Math.max(1, Math.min(5, n + azar([-1, 0, 0, 0, 1])));

  return {
    nombre,
    correo: correoDe(nombre),
    area,
    satisfaccion: base,
    calidad: cerca(base),
    velocidad: cerca(base),
    facilidad: cerca(base + 1),
    nps: Math.max(0, Math.min(10, base * 2 + azar([-2, -1, 0, 0, 1]))),
    lo_mejor: azar(MEJOR),
    problemas: azar(PROBLEMAS),
    mejoras: azar(MEJORAS),
    futuro: azar(FUTURO),
    comentario: Math.random() < 0.3 ? 'Gracias por tomarnos en cuenta para la prueba.' : '',
    contactable: Math.random() < 0.45,
  };
}

console.log(`Sembrando ${CANTIDAD} respuestas en ${BASE} …\n`);

let ok = 0;
let fallos = 0;

for (let i = 0; i < CANTIDAD; i++) {
  const datos = generar(i);
  try {
    const r = await fetch(BASE + '/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // IP distinta por respuesta: evita el limite por red al sembrar.
        'X-Forwarded-For': `10.0.${Math.floor(i / 250)}.${(i % 250) + 1}`,
      },
      body: JSON.stringify(datos),
    });
    const c = await r.json().catch(() => ({}));
    if (r.ok) {
      ok++;
      console.log(`  ✓ #${c.id}  ${datos.nombre}  ·  ${datos.satisfaccion}/5  ·  NPS ${datos.nps}`);
    } else {
      fallos++;
      console.log(`  ✗ ${datos.nombre}: ${c.error}${c.errores ? ' → ' + JSON.stringify(c.errores) : ''}`);
    }
  } catch (e) {
    fallos++;
    console.log(`  ✗ ${datos.nombre}: ${e.message}`);
  }
}

console.log(`\n${ok} guardadas, ${fallos} rechazadas.`);
if (fallos) process.exitCode = 1;
