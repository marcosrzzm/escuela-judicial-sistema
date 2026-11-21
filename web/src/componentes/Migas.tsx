/**
 * Migas de pan: Inicio › Área › Pantalla, con enlaces a lo ya visitado. En
 * móvil se omite "Inicio" (queda solo Área › Pantalla) porque la pantalla es
 * angosta y el usuario ya sabe que está en el sistema.
 */
import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { migasDeRuta, type Miga } from '@/lib/navegacion'
import { cn } from '@/lib/utils'

function ListaMigas({ migas, className }: { migas: Miga[]; className?: string }) {
  if (migas.length === 0) return null
  return (
    <ol className={cn('flex min-w-0 items-center gap-1.5 text-sm', className)}>
      {migas.map((miga, indice) => {
        const esUltima = indice === migas.length - 1
        return (
          <li key={miga.ruta} className="flex min-w-0 items-center gap-1.5">
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
  const { completas, propias } = migasDeRuta(ubicacion.pathname)

  return (
    <nav aria-label="Ubicación" className="min-w-0">
      <ListaMigas migas={completas} className="hidden sm:flex" />
      <ListaMigas migas={propias.length > 0 ? propias : completas} className="flex sm:hidden" />
    </nav>
  )
}
