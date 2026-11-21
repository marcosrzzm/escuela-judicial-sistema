/**
 * Catálogo único de estados del sistema: mismo nombre, mismo color, mismo significado en cada
 * pantalla, y siempre con su palabra junto al color.
 */
export type ClaveEstado = keyof typeof DEFINICIONES

interface DefinicionEstado {
  etiqueta: string
  hex: string
  clases: string
}

const EXITO = { hex: '#0F7B4F', clases: 'bg-exito-soft text-exito' }
const ALERTA = { hex: '#8A5A00', clases: 'bg-alerta-soft text-alerta' }
const PROCESO = { hex: '#1A5CFF', clases: 'bg-proceso-soft text-proceso' }
const ERROR = { hex: '#B42318', clases: 'bg-error-soft text-error' }
const NEUTRO = { hex: '#5A6270', clases: 'bg-neutro-soft text-neutro' }

const DEFINICIONES = {
  // Entrega de calificaciones
  borrador: { etiqueta: 'Borrador', ...NEUTRO },
  enviada: { etiqueta: 'Enviada', ...PROCESO },
  aceptada: { etiqueta: 'Aceptada', ...EXITO },
  devuelta: { etiqueta: 'Devuelta', ...ALERTA },
  reabierta: { etiqueta: 'Reabierta', ...ALERTA },
  sin_entrega: { etiqueta: 'Sin entrega', ...NEUTRO },
  // Decisión de evaluación
  con_derecho: { etiqueta: 'Con derecho', ...EXITO },
  sin_derecho: { etiqueta: 'Sin derecho', ...ERROR },
  pendiente_revision: { etiqueta: 'Pendiente de revisión', ...ALERTA },
  requiere_autorizacion: { etiqueta: 'Requiere autorización', ...PROCESO },
  autorizada: { etiqueta: 'Autorizada', ...EXITO },
  rechazada: { etiqueta: 'Rechazada', ...ERROR },
  // Calificación
  acreditada: { etiqueta: 'Acreditada', ...EXITO },
  no_acreditada: { etiqueta: 'No acreditada', ...ERROR },
  // Cierre
  preparado: { etiqueta: 'Preparado', ...NEUTRO },
  en_autorizacion: { etiqueta: 'En autorización', ...PROCESO },
  aprobado: { etiqueta: 'Aprobado', ...EXITO },
  devuelto: { etiqueta: 'Devuelto', ...ALERTA },
  reemplazado: { etiqueta: 'Reemplazado', ...NEUTRO },
  // Lote y traspaso
  generado: { etiqueta: 'Generado', ...NEUTRO },
  recibido: { etiqueta: 'Recibido', ...PROCESO },
  cargado: { etiqueta: 'Cargado', ...EXITO },
  con_discrepancias: { etiqueta: 'Con discrepancias', ...ERROR },
  // Inscripción, pendiente y periodo
  activa: { etiqueta: 'Activa', ...EXITO },
  baja: { etiqueta: 'Baja', ...NEUTRO },
  abierto: { etiqueta: 'Abierto', ...ALERTA },
  resuelto: { etiqueta: 'Resuelto', ...EXITO },
  cerrado: { etiqueta: 'Cerrado', ...NEUTRO },
  activo: { etiqueta: 'Activo', ...EXITO },
} as const satisfies Record<string, DefinicionEstado>

export function definicionEstado(estado: string): DefinicionEstado {
  return (
    (DEFINICIONES as Record<string, DefinicionEstado>)[estado] ?? { etiqueta: estado, ...NEUTRO }
  )
}

export function etiquetaEstado(estado: string): string {
  return definicionEstado(estado).etiqueta
}

export function hexEstado(estado: string): string {
  return definicionEstado(estado).hex
}
