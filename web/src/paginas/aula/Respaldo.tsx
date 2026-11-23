/** Último respaldo de la base (12.11): fecha y tamaño, solo para Coordinación y sin descarga. */
import { DatabaseBackup } from 'lucide-react'

import { useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'
import { tamanoLegible } from '@/lib/aula'

export function UltimoRespaldo() {
  const { puede } = useSesion()
  const d = useDatos<{ ultimo: { fecha: string; bytes: number } | null }>(puede('usuario', 'crear') ? '/respaldo/ultimo' : null)
  if (!puede('usuario', 'crear')) return null
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-line bg-card p-4" aria-labelledby="titulo-respaldo">
      <h2 id="titulo-respaldo" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <DatabaseBackup strokeWidth={2.4} className="size-4" aria-hidden="true" />
        Respaldo de la base
      </h2>
      {d.error ? (
        <p className="text-sm text-error" role="alert">No se pudo consultar el respaldo: {d.error.message}</p>
      ) : d.cargando ? (
        <p className="text-sm text-ink-3">Consultando…</p>
      ) : d.datos?.ultimo ? (
        <p className="text-sm text-ink-2">Último respaldo: <span className="font-medium text-ink">{fechaHora(d.datos.ultimo.fecha)}</span> · <span className="num">{tamanoLegible(d.datos.ultimo.bytes)}</span>. Se hace uno al día y se guardan 14; no se descarga desde aquí.</p>
      ) : (
        <p className="text-sm text-alerta">Todavía no hay ningún respaldo. Confirma que la tarea diaria del hosting esté programada.</p>
      )}
    </section>
  )
}
