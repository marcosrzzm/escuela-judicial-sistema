import type { FieldValues, Resolver } from 'react-hook-form'
import type { ZodType } from 'zod'

/** Resolver mínimo de zod para react-hook-form: el primer error de cada campo, en español. */
export function resolverZod<T extends FieldValues>(esquema: ZodType<T>): Resolver<T> {
  return (valores) => {
    const r = esquema.safeParse(valores)
    if (r.success) return { values: r.data, errors: {} }
    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of r.error.issues) {
      const campo = String(issue.path[0] ?? 'root')
      errors[campo] ??= { type: issue.code, message: issue.message }
    }
    return { values: {}, errors } as ReturnType<Resolver<T>> extends Promise<infer X> ? X : never
  }
}

export function fechaHora(iso: string | null): string {
  if (!iso) return 'Sin fecha'
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') || iso.length <= 10 ? '' : 'Z'))
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export function soloFecha(iso: string | null): string {
  if (!iso) return 'Sin fecha'
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', {
    dateStyle: 'medium',
  })
}

/** "1 alumno", "5 alumnos". */
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function minutos(segundos: number): string {
  return (segundos / 60).toLocaleString('es-MX', { maximumFractionDigits: 1 })
}

/** Quita espacios y caracteres invisibles que se cuelan al copiar y pegar un correo. */
export const limpiarCorreo = (v: string) =>
  v.replace(/[\s\u00A0\u00AD\u200B-\u200F\u2060\uFEFF]/g, '')
