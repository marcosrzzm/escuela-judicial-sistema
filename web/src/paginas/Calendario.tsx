/** Calendario (especificación, 11.4): mes y lista, con filtro por grupo; cada evento lleva a su lugar. */
import { ChevronLeft, ChevronRight, List, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { CampoSelect } from '@/componentes/CampoFormulario'
import { enlaceSeguro } from '@/componentes/Avisos'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import type { Calendario as DatosCalendario, EventoCalendario } from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { soloFecha } from '@/lib/formulario'
import { cn } from '@/lib/utils'

const TIPOS: Record<EventoCalendario['tipo'], { etiqueta: string; color: string }> = {
  periodo_inicio: { etiqueta: 'Periodo', color: '#5a6270' },
  periodo_fin: { etiqueta: 'Periodo', color: '#5a6270' },
  entrega: { etiqueta: 'Entrega', color: '#3d5a80' },
  cierre: { etiqueta: 'Cierre', color: '#8a6f37' },
}

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function Evento({ e }: { e: EventoCalendario }) {
  return (
    <li>
      <Link
        to={enlaceSeguro(e.enlace)}
        className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: TIPOS[e.tipo].color }}
        />
        <span className="min-w-0 flex-1 leading-snug">{e.titulo}</span>
        <span className="text-xs text-ink-3">{TIPOS[e.tipo].etiqueta}</span>
      </Link>
    </li>
  )
}

function Mes({
  eventos,
  mes,
  alCambiar,
}: {
  eventos: EventoCalendario[]
  mes: Date
  alCambiar: (d: Date) => void
}) {
  const [dia, setDia] = useState<string | null>(null)
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1)
  const desfase = (primero.getDay() + 6) % 7
  const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celdas = Array.from({ length: Math.ceil((desfase + total) / 7) * 7 }, (_, i) => {
    const n = i - desfase + 1
    return n >= 1 && n <= total ? new Date(mes.getFullYear(), mes.getMonth(), n) : null
  })
  const porDia = new Map<string, EventoCalendario[]>()
  for (const e of eventos) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e])
  const hoy = iso(new Date())
  const delDia = dia ? (porDia.get(dia) ?? []) : []
  const titulo = mes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink first-letter:uppercase">{titulo}</h2>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => alCambiar(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          >
            <ChevronLeft strokeWidth={2.4} />
          </Button>
          <Button type="button" variant="outline" onClick={() => alCambiar(new Date())}>
            Hoy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => alCambiar(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          >
            <ChevronRight strokeWidth={2.4} />
          </Button>
        </div>
      </div>
      <div
        role="grid"
        aria-label={titulo}
        className="grid grid-cols-7 overflow-hidden rounded-lg border border-line bg-card"
      >
        {DIAS.map((d) => (
          <div
            key={d}
            role="columnheader"
            className="border-b border-line bg-paper-2 py-1.5 text-center text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
          >
            {d}
          </div>
        ))}
        {celdas.map((c, i) => {
          const f = c ? iso(c) : null
          const lista = f ? (porDia.get(f) ?? []) : []
          return (
            <button
              key={f ?? `v${i}`}
              type="button"
              role="gridcell"
              disabled={!c}
              onClick={() => f && setDia(f)}
              aria-label={f ? `${soloFecha(f)}, ${lista.length} eventos` : undefined}
              className={cn(
                'flex min-h-14 flex-col items-start gap-1 border-t border-r border-line p-1.5 text-left transition-colors duration-ui last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:min-h-24',
                c ? 'hover:bg-paper-2' : 'bg-paper-2/50',
                f === dia && 'bg-brand-soft',
              )}
            >
              {c ? (
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-xs num',
                    f === hoy ? 'bg-ink font-semibold text-white' : 'text-ink-2',
                  )}
                >
                  {c.getDate()}
                </span>
              ) : null}
              <span className="flex w-full flex-col gap-0.5">
                {lista.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className="hidden w-full truncate rounded-sm px-1 text-[11px] leading-5 text-white sm:block"
                    style={{ backgroundColor: TIPOS[e.tipo].color }}
                  >
                    {e.titulo}
                  </span>
                ))}
                {lista.length > 0 ? (
                  <span className="flex gap-0.5 sm:hidden" aria-hidden="true">
                    {lista.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: TIPOS[e.tipo].color }}
                      />
                    ))}
                  </span>
                ) : null}
                {lista.length > 2 ? (
                  <span className="hidden text-[11px] text-ink-3 sm:block">
                    +{lista.length - 2} más
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
      {dia ? (
        <section aria-live="polite" className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-ink">{soloFecha(dia)}</h3>
          {delDia.length === 0 ? (
            <p className="text-sm text-ink-3">No hay eventos ese día.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card">
              {delDia.map((e) => (
                <Evento key={e.id} e={e} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}

function Lista({ eventos }: { eventos: EventoCalendario[] }) {
  if (eventos.length === 0)
    return (
      <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-10 text-center text-sm text-ink-3">
        No hay fechas para mostrar.
      </p>
    )
  const hoy = iso(new Date())
  const porDia = new Map<string, EventoCalendario[]>()
  for (const e of eventos) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e])
  return (
    <div className="flex flex-col gap-5">
      {[...porDia.entries()].map(([fecha, lista]) => (
        <section key={fecha} className="flex flex-col gap-1.5">
          <h3
            className={cn(
              'text-sm font-semibold first-letter:uppercase',
              fecha < hoy ? 'text-ink-3' : 'text-ink',
            )}
          >
            {new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card">
            {lista.map((e) => (
              <Evento key={e.id} e={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function Calendario() {
  const [params, setParams] = useSearchParams()
  const grupo = Number(params.get('grupo')) || null
  const [vista, setVista] = useState<'mes' | 'lista'>('mes')
  const [mes, setMes] = useState(() => new Date())
  const c = useDatos<DatosCalendario>(grupo ? `/calendario?grupo_id=${grupo}` : '/calendario')
  const eventos = c.datos?.eventos ?? []
  const listaVisible = vista === 'lista' ? eventos : eventos
  return (
    <Pagina
      titulo="Calendario"
      descripcion="Inicio y fin de los periodos, fechas límite de entrega y cierres de grupo. Solo ves lo de tus grupos."
      acciones={
        <div className="flex flex-wrap items-end gap-2">
          {c.datos && c.datos.grupos.length > 0 ? (
            <div className="w-52">
              <CampoSelect
                etiqueta="Grupo"
                valor={grupo ? String(grupo) : 'todos'}
                alCambiar={(v) => setParams(v === 'todos' ? {} : { grupo: v }, { replace: true })}
                opciones={[
                  { valor: 'todos', etiqueta: 'Todos los grupos' },
                  ...c.datos.grupos.map((g) => ({
                    valor: String(g.id),
                    etiqueta: `${g.clave} · ${g.periodo}`,
                  })),
                ]}
              />
            </div>
          ) : null}
          <div
            role="group"
            aria-label="Vista"
            className="flex overflow-hidden rounded-lg border border-line bg-card"
          >
            {(
              [
                ['mes', 'Mes', CalendarDays],
                ['lista', 'Lista', List],
              ] as const
            ).map(([clave, etiqueta, Icono]) => (
              <button
                key={clave}
                type="button"
                aria-pressed={vista === clave}
                onClick={() => setVista(clave)}
                className={cn(
                  'flex h-9 items-center gap-1.5 px-3 text-sm transition-colors duration-ui focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                  vista === clave
                    ? 'bg-ink font-semibold text-white'
                    : 'text-ink-2 hover:bg-paper-2',
                )}
              >
                <Icono strokeWidth={2.4} className="size-4" aria-hidden="true" />
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {c.error ? <ErrorDatos error={c.error} reintentar={c.reintentar} /> : null}
      {c.cargando ? <Cargando /> : null}
      {c.datos ? (
        vista === 'mes' ? (
          <Mes eventos={eventos} mes={mes} alCambiar={setMes} />
        ) : (
          <Lista eventos={listaVisible} />
        )
      ) : null}
    </Pagina>
  )
}
