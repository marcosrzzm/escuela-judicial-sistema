import { z } from 'zod'

/** Caso de línea base medido fuera del sistema; los mismos límites que valida el servidor. */
export const esquemaLineaBase = z.object({
  tipo: z.enum(['lista', 'cierre'], { message: 'Elige el tipo de caso.' }),
  grupo_id: z.string(),
  campos_recapturados: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, 'Escribe un entero de 0 a 9999.'),
  minutos: z
    .string()
    .trim()
    .regex(/^\d{1,4}(\.\d)?$/, 'Escribe los minutos activos, por ejemplo 45 o 12.5.'),
  nota: z.string().trim().max(500, 'Máximo 500 caracteres.'),
})
export type LineaBaseFormulario = z.infer<typeof esquemaLineaBase>
