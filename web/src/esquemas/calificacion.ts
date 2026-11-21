import { z } from 'zod'

/** Los mismos límites que valida el servidor: de 0 a 10 con un decimal. */
export const esquemaValor = z
  .string()
  .trim()
  .regex(/^(10(\.0)?|\d(\.\d)?)$/, 'Usa un valor de 0 a 10 con un decimal.')
