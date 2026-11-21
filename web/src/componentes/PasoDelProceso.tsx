/**
 * Pasos de un proceso (wizard): el estado nunca depende solo del color, cada
 * paso lleva su palabra (Listo / En curso / Pendiente).
 */
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface PasoProceso {
  numero: number
  titulo: string
  detalle: string
  estado: 'hecho' | 'en_curso' | 'pendiente'
}

export function PasoDelProceso({ pasos }: { pasos: PasoProceso[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {pasos.map((paso) => (
        <li
          key={paso.numero}
          className={cn(
            'flex flex-col gap-3 rounded-lg border bg-card p-4',
            paso.estado === 'en_curso' && 'border-brand ring-1 ring-brand',
            paso.estado === 'hecho' && 'border-line bg-paper-2',
            paso.estado === 'pendiente' && 'border-line',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink-4 num">
              {String(paso.numero).padStart(2, '0')}
            </span>
            {paso.estado === 'hecho' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-exito">
                <Check strokeWidth={2.4} className="size-3.5" aria-hidden="true" />
                Listo
              </span>
            ) : paso.estado === 'en_curso' ? (
              <span className="text-xs font-semibold text-brand">En curso</span>
            ) : (
              <span className="text-xs font-semibold text-ink-4">Pendiente</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                'text-sm font-semibold',
                paso.estado === 'pendiente' ? 'text-ink-3' : 'text-ink',
              )}
            >
              {paso.titulo}
            </span>
            <span className="text-xs leading-relaxed text-ink-3">{paso.detalle}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Barra de progreso de un wizard: n de m pasos, con el porcentaje; sin confeti. */
export function BarraProgreso({ actual, total }: { actual: number; total: number }) {
  const porcentaje = Math.round((actual / total) * 100)
  return (
    <div
      className="flex items-center gap-3"
      role="progressbar"
      aria-valuenow={actual}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <div className="h-2 flex-1 overflow-hidden rounded-pill bg-paper-3" aria-hidden="true">
        <div
          className="h-full rounded-pill bg-brand transition-[width] duration-ui"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className="shrink-0 text-xs text-ink-3 num">
        Paso {actual} de {total} · {porcentaje}%
      </span>
    </div>
  )
}
