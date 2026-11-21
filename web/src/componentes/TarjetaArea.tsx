/**
 * Tarjeta grande de un área: toda la tarjeta navega a `ruta` con la técnica de
 * "stretched link" (el único <a> real es el de la etiqueta, con un ::after
 * que cubre la tarjeta), y el botón principal vive por encima con su propio
 * enlace, en z-10, para que su propio clic no quede atrapado por el enlace grande.
 */
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function TarjetaArea({
  icono: Icono,
  etiqueta,
  descripcion,
  ruta,
  cifras = [],
  accion,
  className,
}: {
  icono: LucideIcon
  etiqueta: string
  descripcion: string
  ruta: string
  cifras?: string[]
  accion: { etiqueta: string; ruta: string }
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-lg border border-line bg-card p-5 shadow-sm transition-colors hover:border-line-strong hover:bg-paper-2',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"
          aria-hidden="true"
        >
          <Icono strokeWidth={2.4} />
        </span>
        <div className="flex min-w-0 flex-col gap-1 pt-1">
          <Link
            to={ruta}
            className="rounded-sm text-base font-semibold text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {etiqueta}
          </Link>
          <p className="text-sm leading-relaxed text-ink-3">{descripcion}</p>
        </div>
      </div>

      {cifras.length > 0 ? (
        <dl className="flex flex-col gap-1">
          {cifras.map((cifra) => (
            <dd key={cifra} className="text-sm font-medium text-ink-2">
              {cifra}
            </dd>
          ))}
        </dl>
      ) : null}

      <Button asChild size="sm" className="relative z-10 mt-auto w-fit">
        <Link to={accion.ruta}>{accion.etiqueta}</Link>
      </Button>
    </div>
  )
}
