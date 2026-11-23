/**
 * Migas de pan. Fuera de un grupo: Tablero › Pantalla. Dentro de un grupo la página las declara
 * (periodo › grupo › sección). En móvil solo se muestran las dos últimas para no desbordar.
 */
import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useMigasPropias } from '@/lib/migas'
import { migasDeRuta, type Miga } from '@/lib/navegacion'
import { cn } from '@/lib/utils'

function ListaMigas({ migas, className }: { migas: Miga[]; className?: string }) {
  if (migas.length === 0) return null
  return (
    <ol className={cn('flex min-w-0 items-center gap-1.5 text-sm', className)}>
      {migas.map((miga, indice) => {
        const esUltima = indice === migas.length - 1
        return (
          <li key={`${miga.ruta}-${indice}`} className="flex min-w-0 items-center gap-1.5">
            {indice > 0 ? (
              <ChevronRight
                strokeWidth={2.4}
                aria-hidden="true"
                className="size-3.5 shrink-0 text-ink-4"
              />
            ) : null}
            {esUltima ? (
              <span className="truncate font-medium text-ink" aria-current="page">
                {miga.etiqueta}
              </span>
            ) : (
              <Link
                to={miga.ruta}
                className="truncate rounded-sm text-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {miga.etiqueta}
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function Migas() {
  const ubicacion = useLocation()
  const propias = useMigasPropias()
  const { completas, propias: deRuta } = migasDeRuta(ubicacion.pathname)
  const migas = propias ?? completas

  return (
    <nav aria-label="Ubicación" className="min-w-0">
      <ListaMigas migas={migas} className="hidden sm:flex" />
      <ListaMigas
        migas={propias ? propias.slice(-2) : deRuta.length > 0 ? deRuta : completas}
        className="flex sm:hidden"
      />
    </nav>
  )
}
