/** Tablero (especificación, 11.2): tarjetas por grupo o materia, Por hacer y actividad reciente. */
import { CalendarDays, LayoutGrid, ListTodo } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { CampoSelect } from '@/componentes/CampoFormulario'
import { enlaceSeguro } from '@/componentes/Avisos'
import { Pagina } from '@/componentes/Pagina'
import { ActividadReciente, colorDe, Panel, PorHacer } from '@/componentes/Plataforma'
import type {
  Calendario,
  EventoCalendario,
  Tablero as DatosTablero,
  TarjetaTablero,
} from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { plural, soloFecha } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'react-router-dom'

function Tarjeta({ t }: { t: TarjetaTablero }) {
  const color = colorDe(t.id, t.titulo)
  return (
    <li>
      <Link
        to={enlaceSeguro(t.enlace)}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm transition-[border-color,box-shadow] duration-ui hover:border-line-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span aria-hidden="true" className="block h-2" style={{ backgroundColor: color }} />
        <span className="flex flex-1 flex-col gap-3 p-4">
          <span className="flex flex-col gap-0.5">
            <span className="font-serif text-lg leading-snug font-semibold text-balance text-ink group-hover:underline">
              {t.titulo}
            </span>
            <span className="text-sm text-ink-3">
              {t.tipo === 'grupo' ? t.programa : `${t.grupo} · ${t.programa}`}
            </span>
            <span className="text-xs text-ink-3">
              {t.periodo}
              {t.turno ? ` · ${t.turno}` : ''}
              {t.docente ? ` · ${t.docente}` : ''}
            </span>
          </span>
          <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-2">
            {t.tipo === 'grupo' && t.entregas_esperadas !== undefined ? (
              <>
                <span className="num">
                  Entregas {t.entregas_recibidas} de {t.entregas_esperadas}
                </span>
                <span className="text-ink-3">
                  {t.cierre ? `Cierre ${t.cierre.replace('_', ' ')}` : 'Sin cierre todavía'}
                </span>
              </>
            ) : null}
            {t.tipo === 'grupo' &&
            t.entregas_esperadas === undefined &&
            t.alumnos_activos !== undefined ? (
              <span className="num">{plural(t.alumnos_activos, 'alumno', 'alumnos')}</span>
            ) : null}
            {t.tipo === 'asignacion' ? (
              <>
                <InsigniaEstado estado={t.entrega?.estado ?? 'sin_entrega'} />
                {t.fecha_limite ? (
                  <span className="num">Entrega: {soloFecha(t.fecha_limite)}</span>
                ) : null}
              </>
            ) : null}
            {t.tipo === 'materia' ? (
              <>
                {t.calificacion ? (
                  <>
                    <span className="text-base font-semibold text-ink num">
                      {t.calificacion.valor === null
                        ? 'Sin valor'
                        : t.calificacion.valor.toFixed(1)}
                    </span>
                    <InsigniaEstado estado={t.calificacion.estatus} />
                  </>
                ) : (
                  <span className="text-ink-3">Sin calificación publicada</span>
                )}
                {t.derecho ? (
                  <span className="text-ink-3">
                    Derecho a evaluación:{' '}
                    {t.derecho === 'con_derecho'
                      ? 'con derecho'
                      : t.derecho === 'sin_derecho'
                        ? 'sin derecho'
                        : 'en revisión'}
                  </span>
                ) : null}
              </>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  )
}

const DIA = 86_400_000
const hoyISO = () => new Date().toISOString().slice(0, 10)
function etiquetaDia(fecha: string): string {
  const d = Math.round((Date.parse(`${fecha}T12:00:00`) - Date.parse(`${hoyISO()}T12:00:00`)) / DIA)
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Vista de agenda: lo que viene, agrupado por día (Hoy, Mañana y fechas). */
function Agenda({ eventos }: { eventos: EventoCalendario[] }) {
  const desde = hoyISO()
  const hasta = new Date(Date.now() + 45 * DIA).toISOString().slice(0, 10)
  const proximos = eventos.filter((e) => e.fecha >= desde && e.fecha <= hasta)
  const porDia = new Map<string, EventoCalendario[]>()
  for (const e of proximos) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e])
  if (proximos.length === 0)
    return (
      <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-8 text-center text-sm text-ink-3">
        No hay fechas en los próximos 45 días.
      </p>
    )
  return (
    <div className="flex flex-col gap-5">
      {[...porDia.entries()].map(([fecha, lista]) => (
        <section key={fecha} className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-ink first-letter:uppercase">
            {etiquetaDia(fecha)}
          </h3>
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card">
            {lista.map((e) => (
              <li key={e.id}>
                <Link
                  to={enlaceSeguro(e.enlace)}
                  className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <CalendarDays
                    strokeWidth={2}
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-3"
                  />
                  <span className="min-w-0 flex-1 leading-snug">{e.titulo}</span>
                  <span className="text-xs text-ink-3">{soloFecha(fecha)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function Tablero() {
  const { sesion } = useSesion()
  const [params, setParams] = useSearchParams()
  const [vista, setVista] = useState<'tarjetas' | 'agenda'>('tarjetas')
  const pedido = Number(params.get('periodo')) || null
  const t = useDatos<DatosTablero>(pedido ? `/tablero?periodo_id=${pedido}` : '/tablero')
  const cal = useDatos<Calendario>(vista === 'agenda' ? '/calendario' : null)
  const datos = t.datos
  const nombre = sesion?.nombre.split(' ').slice(-2).join(' ')

  return (
    <Pagina
      titulo="Tablero"
      descripcion={`Hola, ${nombre}. Tus grupos y lo que espera tu atención.`}
      acciones={
        <div className="flex flex-wrap items-end gap-2">
          {datos && datos.periodos.length > 1 ? (
            <div className="w-44">
              <CampoSelect
                etiqueta="Periodo"
                valor={String(datos.periodo_id ?? '')}
                alCambiar={(v) => setParams({ periodo: v }, { replace: true })}
                opciones={datos.periodos.map((p) => ({
                  valor: String(p.id),
                  etiqueta: `${p.nombre} (${p.estado})`,
                }))}
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
                ['tarjetas', 'Tarjetas', LayoutGrid],
                ['agenda', 'Agenda', ListTodo],
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
      {t.error ? <ErrorDatos error={t.error} reintentar={t.reintentar} /> : null}
      {t.cargando ? <Cargando /> : null}
      {datos ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {vista === 'agenda' ? (
              cal.error ? (
                <ErrorDatos error={cal.error} reintentar={cal.reintentar} />
              ) : cal.cargando ? (
                <Cargando />
              ) : (
                <Agenda eventos={cal.datos?.eventos ?? []} />
              )
            ) : datos.tarjetas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-10 text-center text-sm text-ink-3">
                {sesion?.base === 'carga_externa'
                  ? 'Tus lotes están en Lotes recibidos. Aquí aparece lo que esté por recibir.'
                  : 'No hay grupos ni materias en este periodo para tu cuenta.'}
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {datos.tarjetas.map((x) => (
                  <Tarjeta key={`${x.tipo}-${x.id ?? x.titulo}-${x.grupo}`} t={x} />
                ))}
              </ul>
            )}
          </div>
          <aside className="flex min-w-0 flex-col gap-6" aria-label="Pendientes y actividad">
            <Panel titulo="Por hacer">
              <PorHacer items={datos.por_hacer} />
            </Panel>
            {datos.actividad.length > 0 ? (
              <Panel titulo="Actividad reciente">
                <ActividadReciente items={datos.actividad} />
              </Panel>
            ) : null}
          </aside>
        </div>
      ) : null}
    </Pagina>
  )
}
