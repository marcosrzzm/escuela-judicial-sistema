/** Página de un grupo (especificación, 11.3): menú de secciones, contenido y columna derecha. */
import { CalendarDays, Bell } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { LayoutSeccion, type SeccionMenu } from '@/componentes/LayoutSeccion'
import { ActividadReciente, Panel, PorHacer, ProximasFechas } from '@/componentes/Plataforma'
import type { Grupo, ResumenGrupo } from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { ContextoGrupo } from '@/lib/grupoContexto'
import { useDeclararMigas } from '@/lib/migas'
import { useSesion } from '@/lib/sesion'
import { CierreLote } from '@/paginas/Cierre'
import { Derecho } from '@/paginas/Derecho'
import { Personas } from '@/paginas/Grupos'
import { GrupoCalificaciones, GrupoInicio, GrupoMaterias } from '@/paginas/GrupoPestanas'

const TODAS = [
  ['inicio', 'Inicio'],
  ['personas', 'Personas'],
  ['materias', 'Materias'],
  ['calificaciones', 'Calificaciones'],
  ['derecho', 'Derecho a evaluación'],
  ['cierre', 'Cierre'],
] as const

export function GrupoPagina() {
  const { id, seccion } = useParams()
  const { sesion } = useSesion()
  const grupoId = Number(id)
  // Solo Coordinación y Dirección ven el grupo completo; el Auxiliar, únicamente la lista.
  const completo = sesion?.base === 'coordinacion' || sesion?.base === 'direccion'
  const grupos = useDatos<{ filas: Grupo[] }>('/grupos')
  const resumen = useDatos<ResumenGrupo>(completo ? `/grupos/${grupoId}/resumen` : null)
  const grupo = grupos.datos?.filas.find((g) => g.id === grupoId) ?? null
  const permitidas = TODAS.filter(([c]) => completo || c === 'personas')
  const activa = seccion ?? (completo ? 'inicio' : 'personas')
  const etiqueta = TODAS.find(([c]) => c === activa)?.[1] ?? 'Inicio'

  useDeclararMigas(
    grupo
      ? [
          { etiqueta: grupo.periodo, ruta: `/grupos?periodo=${grupo.periodo_id}` },
          { etiqueta: grupo.clave, ruta: `/grupos/${grupo.id}` },
          { etiqueta, ruta: `/grupos/${grupo.id}/${activa}` },
        ]
      : null,
  )

  if (grupos.error) return <ErrorDatos error={grupos.error} reintentar={grupos.reintentar} />
  if (grupos.cargando) return <Cargando />
  if (!grupo) return <Navigate to="/grupos" replace />
  if (!permitidas.some(([c]) => c === activa))
    return <Navigate to={`/grupos/${grupo.id}`} replace />

  const base = `/grupos/${grupo.id}`
  const enRevision = resumen.datos?.entregas_por_estado.enviada ?? 0
  const secciones: SeccionMenu[] = permitidas.map(([clave, etiqueta]) => ({
    clave,
    etiqueta,
    ruta: clave === 'inicio' ? base : `${base}/${clave}`,
    conteo: clave === 'calificaciones' ? enRevision : undefined,
  }))

  const r = resumen.datos
  const derecha = (
    <>
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          <Link
            to={`/calendario?grupo=${grupo.id}`}
            className="flex min-h-10 items-center gap-2 rounded-md px-2 font-medium text-brand hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <CalendarDays strokeWidth={2.4} className="size-4" aria-hidden="true" />
            Ver calendario del grupo
          </Link>
        </li>
        <li>
          <Link
            to="/avisos"
            className="flex min-h-10 items-center gap-2 rounded-md px-2 font-medium text-brand hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Bell strokeWidth={2.4} className="size-4" aria-hidden="true" />
            Ver avisos
          </Link>
        </li>
      </ul>
      {r ? (
        <>
          <Panel titulo="Por hacer">
            <PorHacer items={r.por_hacer} />
          </Panel>
          <Panel titulo="Próximas fechas">
            <ProximasFechas fechas={r.proximas_fechas} />
          </Panel>
          <Panel titulo="Actividad reciente">
            <ActividadReciente items={r.actividad} />
          </Panel>
        </>
      ) : null}
    </>
  )

  return (
    <ContextoGrupo.Provider value={grupo}>
      <LayoutSeccion
        encabezado={`${grupo.clave} · ${grupo.programa}`}
        secciones={secciones}
        activa={activa}
        derecha={derecha}
      >
        {completo && resumen.error ? (
          <ErrorDatos error={resumen.error} reintentar={resumen.reintentar} />
        ) : null}
        {activa === 'inicio' && r ? <GrupoInicio grupo={grupo} resumen={r} /> : null}
        {activa === 'personas' ? <Personas /> : null}
        {activa === 'materias' && r ? <GrupoMaterias grupo={grupo} resumen={r} /> : null}
        {activa === 'calificaciones' ? <GrupoCalificaciones grupo={grupo} /> : null}
        {activa === 'derecho' ? <Derecho /> : null}
        {activa === 'cierre' ? <CierreLote /> : null}
        {completo && resumen.cargando && activa !== 'personas' ? <Cargando /> : null}
      </LayoutSeccion>
    </ContextoGrupo.Provider>
  )
}
