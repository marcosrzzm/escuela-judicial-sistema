/**
 * Pestañas segmentadas (role=tablist) para moverse entre un área y sus
 * pantallas en el layout superior. Roving tabindex: solo la pestaña activa
 * es tabulable: las flechas izquierda y derecha mueven el foco entre ellas.
 */
import { useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

export interface OpcionSegmentada {
  etiqueta: string
  ruta: string
}

export function BotonesSegmentados({
  opciones,
  activa,
}: {
  opciones: OpcionSegmentada[]
  activa: string
}) {
  const contenedorRef = useRef<HTMLDivElement>(null)

  function alTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    const tabs = Array.from(
      contenedorRef.current?.querySelectorAll<HTMLAnchorElement>('[role="tab"]') ?? [],
    )
    const indiceActual = tabs.findIndex((tab) => tab === document.activeElement)
    if (indiceActual === -1) return
    evento.preventDefault()
    const siguiente =
      evento.key === 'ArrowRight'
        ? (indiceActual + 1) % tabs.length
        : (indiceActual - 1 + tabs.length) % tabs.length
    tabs[siguiente]?.focus()
  }

  return (
    <div
      ref={contenedorRef}
      role="tablist"
      aria-label="Secciones del área"
      className="flex gap-1 overflow-x-auto border-b border-line"
      onKeyDown={alTeclado}
    >
      {opciones.map((opcion) => {
        const seleccionada = opcion.ruta === activa
        return (
          <Link
            key={opcion.ruta}
            to={opcion.ruta}
            role="tab"
            aria-selected={seleccionada}
            tabIndex={seleccionada ? 0 : -1}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-ui',
              seleccionada
                ? 'border-brand font-medium text-ink'
                : 'border-transparent text-ink-3 hover:text-ink',
            )}
          >
            {opcion.etiqueta}
          </Link>
        )
      })}
    </div>
  )
}
