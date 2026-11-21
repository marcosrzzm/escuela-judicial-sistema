/** Tabla de captura: un valor de 0 a 10 por alumno; los alumnos sin derecho quedan bloqueados. */
import { Input } from '@/components/ui/input'
import { InsigniaEstado } from '@/componentes/Estados'
import { esquemaValor } from '@/esquemas/calificacion'

export interface FilaCaptura {
  alumno_id: number
  identificador: string
  nombre: string
  bloqueado: boolean
}

export function errorDeValor(texto: string): string | null {
  if (texto.trim() === '') return null
  const r = esquemaValor.safeParse(texto)
  return r.success ? null : (r.error.issues[0]?.message ?? 'Valor no válido.')
}

export function CapturaCalificaciones({
  filas,
  valores,
  alCambiar,
  deshabilitado,
  mostrarErrores,
}: {
  filas: FilaCaptura[]
  valores: Record<number, string>
  alCambiar: (alumnoId: number, valor: string) => void
  deshabilitado: boolean
  mostrarErrores: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Calificaciones por alumno, de 0 a 10 con un decimal</caption>
        <thead className="bg-paper-2 text-left text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          <tr>
            <th scope="col" className="px-3 py-2">
              Matrícula
            </th>
            <th scope="col" className="px-3 py-2">
              Alumno
            </th>
            <th scope="col" className="w-36 px-3 py-2 text-right">
              Calificación
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const texto = valores[f.alumno_id] ?? ''
            const error =
              mostrarErrores && !f.bloqueado
                ? texto.trim() === ''
                  ? 'Falta capturar.'
                  : errorDeValor(texto)
                : errorDeValor(texto)
            return (
              <tr key={f.alumno_id} className="border-t border-line">
                <td className="px-3 py-2 text-ink-3 num">{f.identificador}</td>
                <td className="px-3 py-2 text-ink">{f.nombre}</td>
                <td className="px-3 py-2 text-right">
                  {f.bloqueado ? (
                    <InsigniaEstado estado="sin_derecho" />
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <Input
                        value={texto}
                        onChange={(e) => alCambiar(f.alumno_id, e.target.value)}
                        inputMode="decimal"
                        className="w-24 text-right num"
                        disabled={deshabilitado}
                        aria-label={`Calificación de ${f.nombre}`}
                        aria-invalid={error ? true : undefined}
                      />
                      {error ? (
                        <p role="alert" className="text-xs text-error">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Valores de texto a lo que manda la API: vacío es null. */
export function aItems(valores: Record<number, string>, filas: FilaCaptura[]) {
  return filas
    .filter((f) => !f.bloqueado)
    .map((f) => ({
      alumno_id: f.alumno_id,
      valor:
        (valores[f.alumno_id] ?? '').trim() === '' ? null : (valores[f.alumno_id] ?? '').trim(),
    }))
}

export function hayErrores(
  valores: Record<number, string>,
  filas: FilaCaptura[],
  exigirTodos: boolean,
): boolean {
  return filas.some((f) => {
    if (f.bloqueado) return false
    const t = valores[f.alumno_id] ?? ''
    return (exigirTodos && t.trim() === '') || errorDeValor(t) !== null
  })
}
