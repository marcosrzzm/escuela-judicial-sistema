/** Pestañas propias de la página del grupo (especificación, 11.3): Inicio, Materias y Calificaciones. */
import { CalendarDays, Download, Save } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import {
  editarGrupo,
  fijarFechaLimite,
  type Grupo,
  type MateriaGrupo,
  type ResumenGrupo,
  type Sabana,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { soloFecha } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'
import { cn } from '@/lib/utils'

const ETIQUETA_ENTREGA: Record<string, string> = {
  sin_entrega: 'Sin entrega',
  borrador: 'En borrador',
  enviada: 'Enviadas',
  aceptada: 'Aceptadas',
}

export function GrupoInicio({ grupo, resumen }: { grupo: Grupo; resumen: ResumenGrupo }) {
  const base = `/grupos/${grupo.id}`
  const esencial = [
    { etiqueta: 'Personas', ruta: `${base}/personas` },
    { etiqueta: 'Calificaciones', ruta: `${base}/calificaciones` },
    { etiqueta: 'Derecho a evaluación', ruta: `${base}/derecho` },
    { etiqueta: 'Cierre', ruta: `${base}/cierre` },
    { etiqueta: 'Calendario', ruta: `/calendario?grupo=${grupo.id}` },
  ]
  const total = resumen.materias.length
  return (
    <>
      <section className="flex flex-col gap-1 rounded-xl bg-ink px-6 py-7 text-white shadow-md">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-nav-acento uppercase">
          {grupo.programa} · {grupo.periodo}
        </p>
        <h2 className="font-serif text-3xl leading-tight font-semibold text-balance">
          {grupo.clave}
        </h2>
        <p className="text-sm text-nav-txt">
          Turno {grupo.turno.toLowerCase()}. {resumen.alumnos_activos} alumnos vigentes y {total}{' '}
          materias.
        </p>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="esencial">
        <h2
          id="esencial"
          className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase"
        >
          Lo esencial
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {esencial.map((e) => (
            <li key={e.etiqueta}>
              <Link
                to={e.ruta}
                className="flex min-h-12 items-center justify-center rounded-lg border border-line bg-card px-3 py-2 text-center text-sm font-medium text-ink transition-[border-color,background-color] duration-ui hover:border-line-strong hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {e.etiqueta}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Estado del grupo">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
          <h3 className="text-sm font-semibold text-ink">Entregas de calificaciones</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {Object.entries(ETIQUETA_ENTREGA).map(([clave, etiqueta]) => (
              <li key={clave} className="flex items-center justify-between">
                <span className="text-ink-2">{etiqueta}</span>
                <span className="font-semibold text-ink num">
                  {resumen.entregas_por_estado[clave] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
          <h3 className="text-sm font-semibold text-ink">Decisiones y cierre</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-ink-2">Esperando a Dirección</span>
              <span className="font-semibold text-ink num">{resumen.decisiones.en_direccion}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-ink-2">Pendientes de revisión</span>
              <span className="font-semibold text-ink num">{resumen.decisiones.por_revisar}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-ink-2">Cierre</span>
              {resumen.cierre ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-ink-3 num">versión {resumen.cierre.version}</span>
                  <InsigniaEstado estado={resumen.cierre.estado} />
                </span>
              ) : (
                <span className="text-ink-3">Sin preparar</span>
              )}
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}

function FechaLimite({ m, editable }: { m: MateriaGrupo; editable: boolean }) {
  const [valor, setValor] = useState(m.fecha_limite_entrega ?? '')
  const guardar = useAccion((f: string | null) => fijarFechaLimite(m.id, f), {
    exito: (_r, f) =>
      f ? `Fecha límite de ${m.materia}: ${soloFecha(f)}` : `Fecha límite de ${m.materia} quitada`,
  })
  if (!editable)
    return (
      <span className="num">
        {m.fecha_limite_entrega ? soloFecha(m.fecha_limite_entrega) : 'Sin fecha'}
      </span>
    )
  const cambio = valor !== (m.fecha_limite_entrega ?? '')
  return (
    <span className="flex items-center gap-1.5">
      <Input
        type="date"
        aria-label={`Fecha límite de ${m.materia}`}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="h-8 w-40 num"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!cambio || guardar.ocupado}
        onClick={() => guardar.ejecutar(valor === '' ? null : valor)}
      >
        <Save strokeWidth={2.4} aria-hidden="true" />
        Guardar
      </Button>
    </span>
  )
}

export function GrupoMaterias({ grupo, resumen }: { grupo: Grupo; resumen: ResumenGrupo }) {
  const { puede } = useSesion()
  const editable =
    puede('asignacion_docente', 'modificar') &&
    grupo.estado === 'activo' &&
    grupo.periodo_estado === 'abierto'
  const [cierre, setCierre] = useState(grupo.fecha_cierre_prevista ?? '')
  const guardarCierre = useAccion(
    (f: string | null) =>
      editarGrupo(grupo.id, {
        periodo_id: grupo.periodo_id,
        clave: grupo.clave,
        programa: grupo.programa,
        turno: grupo.turno,
        estado: grupo.estado,
        fecha_cierre_prevista: f,
      }),
    {
      exito: (_r, f) =>
        f
          ? `Cierre previsto de ${grupo.clave}: ${soloFecha(f)}`
          : `Cierre previsto de ${grupo.clave} quitado`,
    },
  )
  const columnas: ColumnaTabla<MateriaGrupo>[] = [
    {
      clave: 'materia',
      encabezado: 'Materia',
      render: (m) => <span className="font-medium text-ink">{m.materia}</span>,
    },
    { clave: 'docente', encabezado: 'Docente', ocultarEnMovil: true },
    {
      clave: 'fecha',
      encabezado: 'Fecha límite',
      render: (m) => <FechaLimite m={m} editable={editable} />,
    },
    {
      clave: 'entrega',
      encabezado: 'Entrega',
      render: (m) => (
        <span className="flex items-center gap-2">
          <InsigniaEstado estado={m.entrega?.estado ?? 'sin_entrega'} />
          {m.entrega ? <span className="text-xs text-ink-3 num">v{m.entrega.version}</span> : null}
        </span>
      ),
    },
  ]
  return (
    <Pagina
      titulo="Materias"
      descripcion="Cada materia del grupo con su docente, su fecha límite y el estado de su entrega."
    >
      <TablaDatos
        columnas={columnas}
        filas={resumen.materias}
        claveFila={(m) => m.id}
        descripcion={`Materias de ${grupo.clave}, periodo ${grupo.periodo}`}
        vacio={{
          variante: 'vacio',
          titulo: 'Este grupo todavía no tiene materias',
          descripcion: 'Coordinación crea las asignaciones en Catálogos, en Asignaciones.',
        }}
      />
      <section className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarDays strokeWidth={2.4} className="size-4" aria-hidden="true" />
          Cierre previsto del grupo
        </h3>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="Fecha de cierre prevista"
              value={cierre}
              onChange={(e) => setCierre(e.target.value)}
              className="h-9 w-44 num"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cierre === (grupo.fecha_cierre_prevista ?? '') || guardarCierre.ocupado}
              onClick={() => guardarCierre.ejecutar(cierre === '' ? null : cierre)}
            >
              <Save strokeWidth={2.4} aria-hidden="true" />
              Guardar
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink-2 num">
            {grupo.fecha_cierre_prevista ? soloFecha(grupo.fecha_cierre_prevista) : 'Sin fecha'}
          </p>
        )}
      </section>
    </Pagina>
  )
}

const CLASE_ESTATUS: Record<string, string> = {
  acreditada: 'text-ink',
  no_acreditada: 'font-semibold text-error',
  sin_derecho: 'font-semibold text-error',
  sin_entrega: 'text-ink-4',
}

export function GrupoCalificaciones({ grupo }: { grupo: Grupo }) {
  const s = useDatos<Sabana>(`/grupos/${grupo.id}/calificaciones`)
  const datos = s.datos
  const columnas: ColumnaTabla<Sabana['alumnos'][number]>[] = datos
    ? [
        {
          clave: 'nombre',
          encabezado: 'Alumno',
          render: (a) => (
            <>
              {a.nombre}
              <span className="block text-xs text-ink-3 num">{a.identificador}</span>
            </>
          ),
        },
        ...datos.materias.map((m) => ({
          clave: m,
          encabezado: m,
          alineacion: 'centro' as const,
          render: (a: Sabana['alumnos'][number]) => {
            const c = a.celdas[m]
            if (!c || c.estatus === 'sin_entrega')
              return <span className="text-ink-4">Sin entrega</span>
            return (
              <span className={cn('num', CLASE_ESTATUS[c.estatus])}>
                {c.valor === null ? 'Sin derecho' : c.valor.toFixed(1)}
              </span>
            )
          },
        })),
        {
          clave: 'pendientes',
          encabezado: 'Pendientes abiertos',
          ocultarEnMovil: true,
          render: (a) =>
            a.pendientes.length === 0 ? (
              <span className="text-ink-4">Ninguno</span>
            ) : (
              a.pendientes.join(', ')
            ),
        },
      ]
    : []
  return (
    <Pagina
      titulo="Calificaciones"
      descripcion="Una fila por alumno y una columna por materia, con la calificación de la entrega aceptada vigente."
      acciones={
        <Button asChild variant="outline">
          <a href={`/api/grupos/${grupo.id}/calificaciones/csv`}>
            <Download strokeWidth={2.4} aria-hidden="true" />
            Descargar CSV
          </a>
        </Button>
      }
    >
      {s.error ? <ErrorDatos error={s.error} reintentar={s.reintentar} /> : null}
      {s.cargando ? <Cargando /> : null}
      {datos ? (
        <TablaDatos
          columnas={columnas}
          filas={datos.alumnos}
          claveFila={(a) => a.alumno_id}
          descripcion={`Calificaciones de ${grupo.clave}, periodo ${grupo.periodo}`}
          vacio={{
            variante: 'vacio',
            titulo: 'Este grupo todavía no tiene alumnos',
            descripcion: 'Agrega alumnos en Personas para ver sus calificaciones aceptadas aquí.',
          }}
        />
      ) : null}
    </Pagina>
  )
}
