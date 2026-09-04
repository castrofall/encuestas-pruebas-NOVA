// ---------------------------------------------------------------------------
// Controles de abuso del formulario.
//
// El techo por red es holgado a proposito: toda la oficina sale a internet por
// la misma IP publica, asi que un limite bajo bloquearia a companeros legitimos
// justo cuando mas gente responde (las horas siguientes al correo de invitacion).
// Con una veintena de participantes, 100 por hora deja margen de sobra y sigue
// frenando un envio automatizado.
//
// El control que de verdad evita respuestas repetidas de la misma persona es el
// de por correo.
// ---------------------------------------------------------------------------

export const LIMITE_POR_IP = 100;
export const VENTANA_MINUTOS = 60;
export const LIMITE_POR_CORREO_DIA = 3;

/** Resumen legible para el diagnostico de /api/salud. */
export function resumenLimites() {
  return `${LIMITE_POR_IP} por red cada ${VENTANA_MINUTOS} min · ${LIMITE_POR_CORREO_DIA} por correo al día`;
}
