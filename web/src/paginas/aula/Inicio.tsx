/** Inicio del curso (12.1): quién lo imparte, cuánto hay en cada pestaña y las próximas fechas. */
import { Link } from 'react-router-dom'

import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import type { Actividad, ContextoCurso, CursoInicio, ListaActividades } from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { Tarjeta, Titulo } from './ui'

export const rutaCurso = (ctx: ContextoCurso, tab: string) => `${ctx.modo === 'docente' ? `/asignaciones/${ctx.id}` : `/cursos/${ctx.id}`}/${tab}`

function fechaDe(a: Actividad): string | null {
  return a.tipo === 'tarea' ? a.fecha_limite : a.tipo === 'examen' ? a.disponible_hasta : null
}

export function Inicio({ ctx }: { ctx: ContextoCurso }) {
  const d = useDatos<CursoInicio>(`/cursos/${ctx.id}`)
  const acts = useDatos<ListaActividades>(`/cursos/${ctx.id}/actividades`)
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const { curso, conteos } = d.datos
  const proximas = (acts.datos?.actividades ?? [])
    .filter((a) => fechaDe(a) !== null && a.tipo !== 'foro' && (fechaDe(a) as string) >= new Date().toISOString().slice(0, 19).replace('T', ' '))
    .sort((a, b) => (fechaDe(a) as string).localeCompare(fechaDe(b) as string))
    .slice(0, 5)
  const bloques: [string, number, string][] = [
    ['Tareas', conteos.tarea, 'tareas'],
    ['Exámenes', conteos.examen, 'examenes'],
    ['Foros', conteos.foro, 'foros'],
  ]
  return (
    <>
      <Titulo>{curso.materia}</Titulo>
      <p className="max-w-2xl text-sm text-ink-3">
        {curso.programa} · {curso.grupo} · {curso.periodo}. Imparte {curso.docente}.
        {curso.periodo_estado !== 'abierto' ? ' El periodo está cerrado: el aula solo se consulta.' : ''}
      </p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {bloques.map(([etiqueta, n, tab]) => (
          <li key={tab}>
            <Link to={rutaCurso(ctx, tab)} className="flex h-full flex-col gap-1 rounded-lg border border-line bg-card p-4 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <span className="text-3xl font-semibold text-ink num">{n}</span>
              <span className="text-sm text-ink-2">{etiqueta}</span>
            </Link>
          </li>
        ))}
      </ul>
      {conteos.por_calificar ? (
        <Tarjeta>
          <p className="text-sm text-ink">
            Hay <span className="font-semibold num">{conteos.por_calificar}</span> {conteos.por_calificar === 1 ? 'entrega' : 'entregas'} de tareas por calificar.{' '}
            <Link to={rutaCurso(ctx, 'tareas')} className="font-medium text-brand hover:underline">Ir a Tareas</Link>
          </p>
        </Tarjeta>
      ) : null}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Próximas fechas</h3>
        {proximas.length === 0 ? (
          <p className="text-sm text-ink-3">No hay entregas ni exámenes con fecha por venir.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card">
            {proximas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <Link to={rutaCurso(ctx, a.tipo === 'tarea' ? 'tareas' : 'examenes')} className="font-medium text-ink hover:underline">{a.titulo}</Link>
                <span className="text-xs text-ink-3">{a.tipo === 'tarea' ? 'Entrega' : 'Cierra'}: {fechaHora(fechaDe(a))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
