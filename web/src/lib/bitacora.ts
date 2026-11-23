/** Textos legibles de la bitácora: acciones y entidades con acento, y cambios como "campo: antes → después". */
const ACCIONES: Record<string, string> = {
  inicio_sesion: 'Inicio de sesión',
  acceso_denegado: 'Acceso denegado',
  alta: 'Alta',
  baja: 'Baja',
  alta_manual: 'Alta manual',
  abrir_automatico: 'Pendiente abierto por el sistema',
  resolver_automatico: 'Pendiente resuelto por el sistema',
  resolver: 'Resolución',
  decidir: 'Decisión',
  autorizar: 'Autorización',
  rechazar: 'Rechazo',
  crear: 'Creación',
  guardar_borrador: 'Borrador guardado',
  enviar: 'Envío',
  captura_excepcional: 'Captura excepcional',
  aceptar: 'Aceptación',
  devolver: 'Devolución',
  reabrir: 'Reapertura',
  preparar: 'Preparación',
  reemplazar: 'Reemplazo',
  aprobar: 'Aprobación',
  enviar_autorizacion: 'Envío a Dirección',
  generar: 'Generación',
  recibir: 'Recepción',
  cargar: 'Carga',
  linea_base: 'Línea base',
  invitacion_enviada: 'Invitación enviada',
  invitacion_reenviada: 'Invitación reenviada',
  invitacion_usada: 'Invitación usada',
  correo_no_enviado: 'Correo que no salió',
  solicitud_creada: 'Solicitud de contraseña',
  solicitud_autorizada: 'Solicitud autorizada',
  solicitud_rechazada: 'Solicitud rechazada',
  restablecer_enviado: 'Enlace de contraseña enviado',
  restablecimiento_usado: 'Contraseña restablecida con enlace',
}

const ENTIDADES: Record<string, string> = {
  sesion: 'Sesión',
  acceso: 'Acceso',
  inscripcion_grupo: 'Inscripción',
  alumno: 'Alumno',
  decision_evaluacion: 'Decisión de evaluación',
  entrega_calificaciones: 'Entrega de calificaciones',
  pendiente_academico: 'Pendiente académico',
  cierre: 'Cierre',
  lote_entrega: 'Lote',
  metrica_caso: 'Métrica',
  solicitud_acceso: 'Solicitud de contraseña',
}

const sinGuiones = (t: string) =>
  t
    .replace(/_/g, ' ')
    .replace('resolucion direccion', 'resolución de Dirección')
    .replace('autorizacion', 'autorización')
export const etiquetaAccion = (a: string) => ACCIONES[a] ?? sinGuiones(a)
export const etiquetaEntidad = (e: string) => ENTIDADES[e] ?? sinGuiones(e)

function valor(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'vacío'
  if (typeof v === 'boolean') return v ? 'sí' : 'no'
  if (Array.isArray(v)) return v.length === 0 ? 'ninguno' : v.map(valor).join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Una línea por campo que aparece antes o después. */
export function cambios(
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown> | null,
) {
  const campos = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})])]
  return campos.map((campo) => ({
    campo: sinGuiones(campo),
    antes: antes && campo in antes ? valor(antes[campo]) : null,
    despues: despues && campo in despues ? valor(despues[campo]) : null,
  }))
}
