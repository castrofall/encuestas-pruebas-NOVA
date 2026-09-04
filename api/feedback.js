// POST /api/feedback  ->  guarda una respuesta del formulario.
import { validarFeedback, hashIp, ipDeSolicitud } from '../lib/validacion.js';
import { guardarFeedback, enviosRecientesPorIp, enviosRecientesPorCorreo, hayBaseDeDatos } from '../lib/db.js';
import { leerJson, responder, exigirMetodo, errorInterno } from '../lib/http.js';

// Control de abuso: techo por origen de red y techo por persona.
//
// El techo por red es holgado a propósito. Toda la oficina sale a internet por
// la misma IP pública, así que un límite bajo bloquearía a compañeros legítimos
// justo cuando más gente responde (las horas siguientes al correo de invitación).
// Con ~20 participantes, 100 por hora deja margen de sobra y sigue frenando un
// envío automatizado. El control que de verdad evita respuestas repetidas de la
// misma persona es el de por correo, más abajo.
const LIMITE_POR_IP = 100;
const VENTANA_MINUTOS = 60;
const LIMITE_POR_CORREO_DIA = 3;

export default async function handler(req, res) {
  if (!exigirMetodo(req, res, 'POST')) return;

  if (!hayBaseDeDatos()) {
    return responder(res, 503, { error: 'El formulario aun no esta conectado a la base de datos.' });
  }

  let cuerpo;
  try {
    cuerpo = await leerJson(req);
  } catch {
    return responder(res, 400, { error: 'No pudimos leer los datos enviados.' });
  }

  const { ok, errores, datos } = validarFeedback(cuerpo, { dominio: process.env.DOMINIO_PERMITIDO });
  if (!ok) {
    return responder(res, 400, { error: 'Revisa los campos marcados.', errores });
  }

  const ip_hash = hashIp(ipDeSolicitud(req), process.env.IP_SALT);

  try {
    if (await enviosRecientesPorIp(ip_hash, VENTANA_MINUTOS) >= LIMITE_POR_IP) {
      return responder(res, 429, { error: 'Se recibieron demasiados envios desde esta red. Intenta de nuevo en una hora.' });
    }
    if (await enviosRecientesPorCorreo(datos.correo) >= LIMITE_POR_CORREO_DIA) {
      return responder(res, 429, { error: 'Ya registramos varias respuestas con este correo hoy. Gracias por tu interes.' });
    }

    const guardado = await guardarFeedback({
      ...datos,
      ip_hash,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    });

    console.log(`[feedback] respuesta #${guardado.id} registrada`);
    return responder(res, 201, { ok: true, id: guardado.id });
  } catch (err) {
    return errorInterno(res, 'feedback', err);
  }
}
