import { z } from 'zod'

export const RESULTADOS = [
  { valor: 'con_derecho', etiqueta: 'Con derecho' },
  { valor: 'sin_derecho', etiqueta: 'Sin derecho' },
  { valor: 'pendiente_revision', etiqueta: 'Pendiente de revisión' },
  { valor: 'requiere_autorizacion', etiqueta: 'Requiere autorización de Dirección' },
] as const

/** Los mismos límites que valida el servidor. */
export const esquemaDecision = z.object({
  resultado: z.enum(['con_derecho', 'sin_derecho', 'pendiente_revision', 'requiere_autorizacion'], {
    message: 'Elige un resultado.',
  }),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio.').max(500, 'Máximo 500 caracteres.'),
  referencia_evidencia: z.string().trim().max(255, 'Máximo 255 caracteres.'),
})
export type DecisionFormulario = z.infer<typeof esquemaDecision>
