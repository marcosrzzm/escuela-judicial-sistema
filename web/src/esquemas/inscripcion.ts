import { z } from 'zod'

/** Alta de un alumno nuevo en un grupo: los mismos límites que valida el servidor. */
export const esquemaAltaNuevo = z.object({
  identificador: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,30}$/, 'Usa de 3 a 30 letras, números o guiones.'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
  observacion: z.string().trim().max(255, 'Máximo 255 caracteres.'),
})
export type AltaNuevo = z.infer<typeof esquemaAltaNuevo>
