import { z } from 'zod'

export const esquemaPendiente = z.object({
  materia_id: z.string().min(1, 'Elige una materia.'),
  periodo_origen_id: z.string().min(1, 'Elige el periodo de origen.'),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio.').max(500, 'Máximo 500 caracteres.'),
})
export type PendienteFormulario = z.infer<typeof esquemaPendiente>
