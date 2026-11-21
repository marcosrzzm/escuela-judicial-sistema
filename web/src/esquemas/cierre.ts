import { z } from 'zod'

/** Preparar un cierre: la excepción y el reemplazo piden motivo cuando aplican (lo valida el formulario y el servidor). */
export const esquemaCierre = z.object({
  requiere_autorizacion: z.boolean(),
  excepcion: z.boolean(),
  motivo_excepcion: z.string().trim().max(500, 'Máximo 500 caracteres.'),
  motivo: z.string().trim().max(500, 'Máximo 500 caracteres.'),
})
export type CierreFormulario = z.infer<typeof esquemaCierre>
