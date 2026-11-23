/** Piezas que comparten el tablero y las páginas de grupo y de materia: Por hacer, fechas y actividad. */
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { enlaceSeguro } from '@/componentes/Avisos'
import type { Actividad, ElementoPorHacer } from '@/lib/api'
import { fechaHora, soloFecha } from '@/lib/formulario'
import { cn } from '@/lib/utils'

/** Franjas de color propias de cada tarjeta: sobrias, de la misma familia que la marca. */
const FRANJAS = ['#8a6f37', '#3d5a80', '#2f6f5e', '#7a4e63', '#5a6270', '#8a5a2b']
export const colorDe = (id: number | undefined, titulo: string): string =>
  FRANJAS[(id ?? [...titulo].reduce((a, c) => a + c.charCodeAt(0), 0)) % FRANJAS.length]!

export function Panel({
  titulo,
  children,
  className,
}: {
  titulo: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <h2 className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{titulo}</h2>
      {children}
    </section>
  )
}

export function PorHacer({ items }: { items: ElementoPorHacer[] }) {
  if (items.length === 0) return <p className="text-sm text-ink-3">Nada pendiente por ahora.</p>
  return (
    <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card">
      {items.map((i) => (
        <li key={`${i.tipo}-${i.enlace}-${i.texto}`}>
          <Link
            to={enlaceSeguro(i.enlace)}
            className="group flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-ui hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            {i.cantidad !== null ? (
              <span className="grid min-w-7 place-items-center rounded-full bg-brand-soft px-1.5 py-0.5 text-xs font-semibold text-brand-deep num">
                {i.cantidad}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block leading-snug text-ink">{i.texto}</span>
              {i.fecha ? <span className="text-xs text-ink-3">{soloFecha(i.fecha)}</span> : null}
            </span>
            <ChevronRight
              strokeWidth={2.4}
              aria-hidden="true"
              className="size-4 shrink-0 text-ink-4 transition-transform duration-ui group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function ActividadReciente({ items }: { items: Actividad[] }) {
  if (items.length === 0) return <p className="text-sm text-ink-3">Sin movimientos recientes.</p>
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((a) => (
        <li key={a.id} className="text-sm">
          <Link
            to={enlaceSeguro(a.enlace)}
            className="leading-snug text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {a.texto}
          </Link>
          <span className="block text-xs text-ink-3">{fechaHora(a.fecha)}</span>
        </li>
      ))}
    </ul>
  )
}

export function ProximasFechas({ fechas }: { fechas: { fecha: string; titulo: string }[] }) {
  if (fechas.length === 0) return <p className="text-sm text-ink-3">No hay fechas próximas.</p>
  return (
    <ul className="flex flex-col gap-2">
      {fechas.map((f) => (
        <li key={`${f.fecha}-${f.titulo}`} className="text-sm">
          <span className="block leading-snug text-ink">{f.titulo}</span>
          <span className="text-xs text-ink-3">{soloFecha(f.fecha)}</span>
        </li>
      ))}
    </ul>
  )
}
