/** Avisos dentro del sistema (sección 11.5): el contador de la barra, la lista y el desplegable. */
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { marcarAviso, marcarAvisos, type Aviso } from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { cn } from '@/lib/utils'

/** Solo se sigue un enlace que sea una ruta del propio sistema. */
export const enlaceSeguro = (e: string) =>
  e.startsWith('/') && !e.startsWith('//') ? e : '/avisos'

export function useNoLeidos(): number {
  const r = useDatos<{ no_leidos: number }>('/avisos/resumen', { cadaMs: 60_000 })
  return r.datos?.no_leidos ?? 0
}

export function useAvisos() {
  return useDatos<{ filas: Aviso[]; no_leidos: number }>('/avisos')
}

export function useMarcarAvisos() {
  const una = useAccion((id: number) => marcarAviso(id), {
    exito: () => 'Aviso marcado como leído',
  })
  const todas = useAccion(() => marcarAvisos(), { exito: () => 'Todos los avisos quedaron leídos' })
  return { una, todas }
}

export function FilaAviso({ aviso, alAbrir }: { aviso: Aviso; alAbrir: (a: Aviso) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => alAbrir(aviso)}
        className={cn(
          'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-ui hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
          aviso.leido ? 'text-ink-3' : 'text-ink',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-1.5 size-2 shrink-0 rounded-full',
            aviso.leido ? 'bg-transparent' : 'bg-brand',
          )}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn('leading-snug', !aviso.leido && 'font-medium')}>{aviso.texto}</span>
          <span className="text-xs text-ink-3">{fechaHora(aviso.creado_en)}</span>
        </span>
        {aviso.leido ? null : <span className="sr-only">No leído</span>}
      </button>
    </li>
  )
}

/** Abre el aviso: lo marca como leído y va a su pantalla. */
export function useAbrirAviso() {
  const navegar = useNavigate()
  const { una } = useMarcarAvisos()
  return (a: Aviso) => {
    if (!a.leido) una.ejecutar(a.id)
    void navegar(enlaceSeguro(a.enlace))
  }
}

/** Contenido del desplegable de la barra: los últimos avisos y un enlace a todos. */
export function BandejaRapida({ alNavegar }: { alNavegar?: () => void }) {
  const { datos, cargando } = useAvisos()
  const abrir = useAbrirAviso()
  const { todas } = useMarcarAvisos()
  const filas = (datos?.filas ?? []).slice(0, 6)
  return (
    <div className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 p-1">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h2 className="text-sm font-semibold text-ink">Avisos</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={todas.ocupado || (datos?.no_leidos ?? 0) === 0}
          onClick={() => todas.ejecutar(undefined)}
        >
          Marcar todos
        </Button>
      </div>
      {cargando ? <p className="px-3 py-4 text-sm text-ink-3">Cargando…</p> : null}
      {!cargando && filas.length === 0 ? (
        <p className="px-3 py-4 text-sm text-ink-3">No tienes avisos todavía.</p>
      ) : null}
      <ul className="flex max-h-80 flex-col overflow-y-auto">
        {filas.map((a) => (
          <FilaAviso
            key={a.id}
            aviso={a}
            alAbrir={(x) => {
              abrir(x)
              alNavegar?.()
            }}
          />
        ))}
      </ul>
      <Link
        to="/avisos"
        onClick={alNavegar}
        className="rounded-md px-3 py-2.5 text-center text-sm font-semibold text-brand hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        Ver todos los avisos
      </Link>
    </div>
  )
}

export const IconoAvisos = Bell
