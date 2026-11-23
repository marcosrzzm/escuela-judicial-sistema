/**
 * Página del curso (12.1) para el Alumno, Coordinación y Dirección; el docente usa la misma pestañas dentro de la página de
 * su asignación. Un curso es una asignación: no hay otra entidad.
 */
import { Navigate, useParams } from 'react-router-dom'

import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { LayoutSeccion } from '@/componentes/LayoutSeccion'
import { Panel } from '@/componentes/Plataforma'
import { contextoDe, type ContextoCurso, type CursoInicio } from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { useDeclararMigas } from '@/lib/migas'
import { CalificacionesAula } from './Calificaciones'
import { Examenes } from './Examenes'
import { Foros } from './Foros'
import { Inicio } from './Inicio'
import { Modulos } from './Modulos'
import { Tareas } from './Tareas'

export const PESTANAS_AULA = [
  ['inicio', 'Inicio'],
  ['modulos', 'Módulos'],
  ['tareas', 'Tareas'],
  ['examenes', 'Exámenes'],
  ['foros', 'Foros'],
  ['calificaciones', 'Calificaciones'],
] as const

export const esPestanaAula = (t: string | undefined): boolean => PESTANAS_AULA.some(([c]) => c === t)

/** El contenido de una pestaña del aula; lo comparten la página del curso y la de la asignación del docente. */
export function PestanaAula({ ctx, tab }: { ctx: ContextoCurso; tab: string }) {
  if (tab === 'modulos') return <Modulos ctx={ctx} />
  if (tab === 'tareas') return <Tareas ctx={ctx} />
  if (tab === 'examenes') return <Examenes ctx={ctx} />
  if (tab === 'foros') return <Foros ctx={ctx} />
  if (tab === 'calificaciones') return <CalificacionesAula ctx={ctx} />
  return <Inicio ctx={ctx} />
}

export function CursoPagina() {
  const { id, tab } = useParams()
  const d = useDatos<CursoInicio>(`/cursos/${Number(id)}`)
  const activa = esPestanaAula(tab) ? (tab as string) : 'inicio'
  const base = `/cursos/${Number(id)}`
  const curso = d.datos?.curso
  useDeclararMigas(
    curso
      ? [
          { etiqueta: curso.periodo, ruta: '/' },
          { etiqueta: `${curso.grupo} · ${curso.materia}`, ruta: `${base}/inicio` },
          { etiqueta: PESTANAS_AULA.find(([c]) => c === activa)?.[1] ?? 'Inicio', ruta: `${base}/${activa}` },
        ]
      : null,
  )
  if (tab !== undefined && !esPestanaAula(tab)) return <Navigate to={`${base}/inicio`} replace />
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!curso) return <Cargando />
  // El docente trabaja su curso desde la página de su asignación.
  if (curso.modo === 'docente') return <Navigate to={`/asignaciones/${curso.id}/${activa}`} replace />
  const ctx = contextoDe(curso)
  return (
    <LayoutSeccion
      encabezado={`${curso.materia} · ${curso.grupo}`}
      secciones={PESTANAS_AULA.map(([clave, etiqueta]) => ({ clave, etiqueta, ruta: `${base}/${clave}` }))}
      activa={activa}
      derecha={
        <Panel titulo="Curso">
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-card p-3 text-sm text-ink-2">
            <span className="font-medium text-ink">{curso.materia}</span>
            <span>{curso.programa}</span>
            <span>{curso.docente}</span>
            <span className="text-xs text-ink-3">{curso.periodo}</span>
          </div>
        </Panel>
      }
    >
      <PestanaAula ctx={ctx} tab={activa} />
    </LayoutSeccion>
  )
}
