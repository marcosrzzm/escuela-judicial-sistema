/**
 * Distribución de una página con secciones (grupo y materia), como una plataforma escolar: a la izquierda
 * una lista de texto con las secciones (la activa lleva una regla fina y negritas; los conteos, en
 * insignias grises), al centro el contenido y a la derecha una columna de unos 260 px. Un botón contrae el
 * menú. En celular el menú es un selector y la columna derecha pasa debajo.
 */
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SeccionMenu {
  clave: string
  etiqueta: string
  ruta: string
  conteo?: number
}

export function LayoutSeccion({
  encabezado,
  secciones,
  activa,
  derecha,
  children,
}: {
  encabezado: string
  secciones: SeccionMenu[]
  activa: string
  derecha?: ReactNode
  children: ReactNode
}) {
  const [oculto, setOculto] = useState(false)
  const navegar = useNavigate()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-line pb-3" data-no-imprimir>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hidden md:inline-flex"
          aria-label={oculto ? 'Mostrar el menú de secciones' : 'Ocultar el menú de secciones'}
          aria-expanded={!oculto}
          onClick={() => setOculto(!oculto)}
        >
          {oculto ? <PanelLeftOpen strokeWidth={2.4} /> : <PanelLeftClose strokeWidth={2.4} />}
        </Button>
        <p className="min-w-0 truncate font-serif text-lg font-semibold text-ink">{encabezado}</p>
        <label className="ml-auto md:hidden">
          <span className="sr-only">Sección</span>
          <select
            value={activa}
            onChange={(e) => {
              const s = secciones.find((x) => x.clave === e.target.value)
              if (s) void navegar(s.ruta)
            }}
            className="h-9 rounded-lg border border-line-strong bg-card px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            {secciones.map((s) => (
              <option key={s.clave} value={s.clave}>
                {s.etiqueta}
                {s.conteo ? ` (${s.conteo})` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={cn(
          'grid gap-8',
          derecha
            ? oculto
              ? 'md:grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_16.25rem]'
              : 'md:grid-cols-[10.5rem_minmax(0,1fr)] xl:grid-cols-[10.5rem_minmax(0,1fr)_16.25rem]'
            : oculto
              ? 'md:grid-cols-[minmax(0,1fr)]'
              : 'md:grid-cols-[10.5rem_minmax(0,1fr)]',
        )}
      >
        {oculto ? null : (
          <nav aria-label="Secciones" className="hidden md:block" data-no-imprimir>
            <ul className="flex flex-col">
              {secciones.map((s) => {
                const esActiva = s.clave === activa
                return (
                  <li key={s.clave}>
                    <Link
                      to={s.ruta}
                      aria-current={esActiva ? 'page' : undefined}
                      className={cn(
                        "relative flex min-h-10 items-center justify-between gap-2 px-3 text-sm transition-colors duration-ui before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:content-[''] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        esActiva
                          ? 'font-semibold text-ink before:bg-brand'
                          : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
                      )}
                    >
                      {s.etiqueta}
                      {s.conteo ? (
                        <span className="rounded-full bg-paper-4 px-1.5 text-[11px] leading-5 font-semibold text-ink-2 num">
                          {s.conteo}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
        {derecha ? (
          <aside
            aria-label="Acciones y pendientes"
            className="col-span-full flex min-w-0 flex-col gap-6 xl:col-span-1"
            data-no-imprimir
          >
            {derecha}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
