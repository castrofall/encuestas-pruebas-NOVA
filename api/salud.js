// GET /api/salud  ->  diagnostico de configuracion. No expone ningun secreto.
import { hayBaseDeDatos, esModoMemoria, contarFeedback } from '../lib/db.js';
import { responder, exigirMetodo } from '../lib/http.js';

export default async function handler(req, res) {
  if (!exigirMetodo(req, res, 'GET')) return;

  const estado = {
    ok: true,
    base_de_datos: !hayBaseDeDatos() ? 'falta DATABASE_URL' : esModoMemoria() ? 'modo memoria (solo desarrollo)' : 'Neon',
    panel: process.env.DASHBOARD_PASSWORD ? 'configurado' : 'falta DASHBOARD_PASSWORD',
    sal_ip: process.env.IP_SALT ? 'configurada' : 'falta IP_SALT',
    dominio: process.env.DOMINIO_PERMITIDO || 'ternova.group',
    conexion: 'sin probar',
    respuestas: null,
  };

  if (!hayBaseDeDatos()) {
    estado.ok = false;
    return responder(res, 503, estado);
  }

  try {
    estado.respuestas = await contarFeedback();
    estado.conexion = 'ok';
  } catch (err) {
    estado.ok = false;
    estado.conexion = /relation .* does not exist/i.test(err.message)
      ? 'la tabla feedback_nova no existe: ejecuta schema.sql en Neon'
      : 'no se pudo consultar la base de datos';
    // Al log va el detalle; al cliente solo el tipo de fallo.
    console.error('[salud]', err.message);
  }

  return responder(res, estado.ok ? 200 : 503, estado);
}
