/** Grupos (rail): tarjetas de los grupos del periodo; abre la página del grupo. Para el Docente, sus materias. */
import { ClipboardCheck, GraduationCap } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { CampoSelect } from '@/componentes/CampoFormulario'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { colorDe } from '@/componentes/Plataforma'
import type { Grupo, Periodo } from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { plural, soloFecha } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'
import { MisAsignaciones } from '@/paginas/MisAsignaciones'

export function ListaGrupos() {
  const { sesion } = useSesion()
  const [params, setParams] = useSearchParams()
  const esDocente = sesion?.base === 'docente'
  const periodos = useDatos<{ filas: Periodo[] }>(esDocente ? null : '/periodos')
  const lista = periodos.datos?.filas ?? []
  const periodoId =
    Number(params.get('periodo')) ||
    (lista.find((p) => p.estado === 'abierto') ?? lista[0])?.id ||
    null
  const grupos = useDatos<{ filas: Grupo[] }>(
    !esDocente && periodoId ? `/grupos?periodo_id=${periodoId}` : null,
  )

  // Las direcciones de antes (/grupos?grupo=3) siguen funcionando.
  const antiguo = Number(params.get('grupo'))
  if (antiguo) return <Navigate to={`/grupos/${antiguo}/personas`} replace />
  if (esDocente) return <MisAsignaciones />

  const completo = sesion?.base === 'coordinacion' || sesion?.base === 'direccion'
  return (
    <Pagina
      titulo="Grupos"
      descripcion="Cada grupo reúne su lista, sus materias, sus calificaciones, el derecho a evaluación y el cierre."
      acciones={
        completo ? (
          <>
            {sesion?.base === 'coordinacion' ? (
              <Button asChild variant="outline">
                <Link to="/revision?estado=enviada">
                  <ClipboardCheck strokeWidth={2.4} aria-hidden="true" />
                  Revisión de calificaciones
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/historial">
                <GraduationCap strokeWidth={2.4} aria-hidden="true" />
                Historial del alumno
              </Link>
            </Button>
          </>
        ) : undefined
      }
    >
      {lista.length > 1 ? (
        <div className="sm:max-w-xs">
          <CampoSelect
            etiqueta="Periodo"
            valor={String(periodoId ?? '')}
            alCambiar={(v) => setParams({ periodo: v }, { replace: true })}
            opciones={lista.map((p) => ({
              valor: String(p.id),
              etiqueta: `${p.nombre} (${p.estado})`,
            }))}
          />
        </div>
      ) : null}
      {periodos.error ? (
        <ErrorDatos error={periodos.error} reintentar={periodos.reintentar} />
      ) : null}
      {grupos.error ? <ErrorDatos error={grupos.error} reintentar={grupos.reintentar} /> : null}
      {periodos.cargando || grupos.cargando ? <Cargando /> : null}
      {grupos.datos && grupos.datos.filas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-10 text-center text-sm text-ink-3">
          No tienes grupos en este periodo. La Coordinación de Posgrados te los asigna; si esperabas
          uno, avísale.
        </p>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(grupos.datos?.filas ?? []).map((g) => (
          <li key={g.id}>
            <Link
              to={completo ? `/grupos/${g.id}` : `/grupos/${g.id}/personas`}
              className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm transition-[border-color,box-shadow] duration-ui hover:border-line-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span
                aria-hidden="true"
                className="block h-2"
                style={{ backgroundColor: colorDe(g.id, g.clave) }}
              />
              <span className="flex flex-col gap-1 p-4">
                <span className="font-serif text-lg font-semibold text-ink group-hover:underline">
                  {g.clave}
                </span>
                <span className="text-sm text-ink-3">{g.programa}</span>
                <span className="text-xs text-ink-3">
                  {g.periodo} · {g.turno} ·{' '}
                  <span className="num">{plural(g.alumnos_activos, 'alumno', 'alumnos')}</span>
                  {g.fecha_cierre_prevista ? ` · cierre ${soloFecha(g.fecha_cierre_prevista)}` : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Pagina>
  )
}

/** Direcciones antiguas de una sección del grupo (/derecho, /cierre): llevan a esa sección del grupo que se pedía. */
export function IrASeccionDeGrupo({ seccion }: { seccion: string }) {
  const [params] = useSearchParams()
  const pedido = Number(params.get('grupo'))
  const grupos = useDatos<{ filas: Grupo[] }>(pedido ? null : '/grupos')
  if (pedido) return <Navigate to={`/grupos/${pedido}/${seccion}`} replace />
  if (grupos.error) return <ErrorDatos error={grupos.error} reintentar={grupos.reintentar} />
  const filas = grupos.datos?.filas ?? []
  const elegido = filas.find((g) => g.periodo_estado === 'abierto') ?? filas[0]
  if (elegido) return <Navigate to={`/grupos/${elegido.id}/${seccion}`} replace />
  return grupos.cargando ? <Cargando /> : <Navigate to="/grupos" replace />
}
