import { Printer, Save, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  aItems,
  CapturaCalificaciones,
  hayErrores,
  type FilaCaptura,
} from '@/componentes/CapturaCalificaciones'
import { DialogoConfirmacion } from '@/componentes/DialogoConfirmacion'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { LayoutSeccion } from '@/componentes/LayoutSeccion'
import { Pagina } from '@/componentes/Pagina'
import { Panel } from '@/componentes/Plataforma'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import {
  abrirEntrega,
  enviarEntrega,
  guardarBorrador,
  type Asignacion,
  type DetalleAsignacion,
  type ItemCalificacion,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora, soloFecha } from '@/lib/formulario'
import { useDeclararMigas } from '@/lib/migas'
import { useSesion } from '@/lib/sesion'

export function MisAsignaciones() {
  const navegar = useNavigate()
  const lista = useDatos<{ filas: Asignacion[] }>('/asignaciones')
  const columnas: ColumnaTabla<Asignacion>[] = [
    { clave: 'materia', encabezado: 'Materia' },
    { clave: 'grupo', encabezado: 'Grupo', render: (a) => `${a.grupo} · ${a.periodo}` },
    { clave: 'alumnos_activos', encabezado: 'Alumnos', numerica: true, ocultarEnMovil: true },
    {
      clave: 'estado',
      encabezado: 'Mi entrega',
      render: (a) => (
        <span className="flex items-center gap-2">
          <InsigniaEstado estado={a.entrega?.estado ?? 'sin_entrega'} />
          {a.entrega ? <span className="text-xs text-ink-3 num">v{a.entrega.version}</span> : null}
        </span>
      ),
    },
  ]
  return (
    <Pagina
      titulo="Mis grupos y materias"
      descripcion="Tus materias del periodo. Abre una para ver su lista, capturar las calificaciones y consultar el derecho a evaluación."
    >
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      <TablaDatos
        columnas={columnas}
        filas={lista.datos?.filas ?? []}
        claveFila={(a) => a.id}
        descripcion="Mis asignaciones del periodo abierto"
        cargando={lista.cargando}
        onFilaClic={(a) => void navegar(`/asignaciones/${a.id}/calificaciones`)}
        accionesFila={(a) => (
          <Button asChild size="sm">
            <Link to={`/asignaciones/${a.id}/calificaciones`}>Abrir</Link>
          </Button>
        )}
        vacio={{
          variante: 'vacio',
          titulo: 'No tienes asignaciones en este periodo',
          descripcion:
            'Las asignaciones las carga la Coordinación de Posgrados. Si esperabas una, avísale.',
        }}
      />
    </Pagina>
  )
}

function Captura({ detalle }: { detalle: DetalleAsignacion }) {
  const { puede } = useSesion()
  const { entrega, asignacion } = detalle
  const filas: FilaCaptura[] = detalle.alumnos.map((a) => ({
    alumno_id: a.alumno_id,
    identificador: a.identificador,
    nombre: a.nombre,
    bloqueado: a.bloqueado,
  }))
  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      (entrega?.calificaciones ?? [])
        .filter((c) => c.valor !== null)
        .map((c) => [c.alumno_id, String(c.valor)]),
    ),
  )
  const [intento, setIntento] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const editable =
    asignacion.periodo_estado === 'abierto' && (entrega === null || entrega.estado === 'borrador')

  /** El borrador se crea en el primer guardado: abrir la pantalla nunca escribe nada. */
  async function asegurarEntrega(): Promise<number | null> {
    if (entrega) return entrega.id
    const r = await abrirEntrega(asignacion.id)
    return r.ok ? r.datos.id : null
  }
  const guardar = useAccion(
    async (items: ItemCalificacion[]) => {
      const id = await asegurarEntrega()
      return id === null
        ? {
            ok: false as const,
            codigo: 0,
            error: 'No se pudo abrir la captura de esta asignación. Vuelve a intentarlo.',
          }
        : guardarBorrador(id, items)
    },
    { exito: () => `Borrador de ${asignacion.materia} (${asignacion.grupo}) guardado` },
  )
  const enviar = useAccion(
    async (items: ItemCalificacion[]) => {
      const id = await asegurarEntrega()
      return id === null
        ? {
            ok: false as const,
            codigo: 0,
            error: 'No se pudo abrir la captura de esta asignación. Vuelve a intentarlo.',
          }
        : enviarEntrega(id, items)
    },
    {
      exito: () =>
        `Calificaciones de ${asignacion.materia} (${asignacion.grupo}) enviadas a Coordinación`,
      alExito: () => setConfirmar(false),
    },
  )

  const mensajeEstado =
    entrega?.estado === 'borrador' && detalle.versiones.length > 1
      ? detalle.versiones.find((v) => v.estado === 'devuelta' || v.estado === 'reabierta')
      : undefined

  return (
    <>
      {mensajeEstado ? (
        <Alert role="status">
          <AlertTitle>
            {mensajeEstado.estado === 'devuelta'
              ? 'Coordinación devolvió tu entrega'
              : 'Coordinación reabrió tu entrega'}
          </AlertTitle>
          <AlertDescription>
            {mensajeEstado.motivo ? <p>Motivo: {mensajeEstado.motivo}</p> : null}
            <p>Corrige lo que haga falta en esta versión {entrega?.version} y vuelve a enviarla.</p>
          </AlertDescription>
        </Alert>
      ) : null}
      {entrega && entrega.estado !== 'borrador' ? (
        <Alert role="status">
          <AlertTitle>
            La versión {entrega.version} está {entrega.estado}
          </AlertTitle>
          <AlertDescription>
            Ya no se edita.{' '}
            {entrega.estado === 'enviada'
              ? 'Coordinación la está revisando; si la devuelve, aquí te aparece una versión nueva para corregir.'
              : ''}
          </AlertDescription>
        </Alert>
      ) : null}

      <CapturaCalificaciones
        filas={filas}
        valores={valores}
        alCambiar={(id, v) => setValores((p) => ({ ...p, [id]: v }))}
        deshabilitado={
          !editable || !puede('calificacion', 'modificar') || guardar.ocupado || enviar.ocupado
        }
        mostrarErrores={intento}
      />

      {editable && puede('entrega_calificaciones', 'modificar') ? (
        <div className="flex flex-wrap gap-2" data-no-imprimir>
          <Button
            type="button"
            variant="outline"
            disabled={guardar.ocupado}
            onClick={() => {
              setIntento(false)
              if (hayErrores(valores, filas, false)) {
                setIntento(true)
                return
              }
              guardar.ejecutar(aItems(valores, filas))
            }}
          >
            <Save strokeWidth={2.4} aria-hidden="true" />
            {guardar.ocupado ? 'Guardando…' : 'Guardar borrador'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setIntento(true)
              if (!hayErrores(valores, filas, true)) setConfirmar(true)
            }}
          >
            <Send strokeWidth={2.4} aria-hidden="true" />
            Enviar calificaciones
          </Button>
        </div>
      ) : null}

      <DialogoConfirmacion
        abierto={confirmar}
        alCambiarApertura={setConfirmar}
        titulo="Enviar calificaciones"
        descripcion={`Vas a enviar las calificaciones de ${asignacion.materia} en ${asignacion.grupo} (${filas.filter((f) => !f.bloqueado).length} alumnos con derecho). Después de enviar ya no se editan; si Coordinación las devuelve, recibes una versión nueva.`}
        etiquetaAccion="Enviar a Coordinación"
        peligroso={false}
        ocupado={enviar.ocupado}
        alConfirmar={() => enviar.ejecutar(aItems(valores, filas))}
      />

      {detalle.versiones.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">Versiones de la entrega</h2>
          <ul className="flex flex-col gap-1.5 rounded-lg border border-line bg-card p-4 text-sm">
            {detalle.versiones.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink num">Versión {v.version}</span>
                <InsigniaEstado estado={v.estado} />
                <span className="text-ink-3">
                  {v.responsable}
                  {v.fecha_envio ? ` · enviada ${fechaHora(v.fecha_envio)}` : ''}
                  {v.motivo ? ` · ${v.motivo}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

const PESTANAS = [
  ['lista', 'Lista'],
  ['calificaciones', 'Calificaciones'],
  ['derecho', 'Derecho a evaluación'],
] as const

type Alumno = DetalleAsignacion['alumnos'][number]

function ListaMateria({ detalle }: { detalle: DetalleAsignacion }) {
  const columnas: ColumnaTabla<Alumno>[] = [
    { clave: 'identificador', encabezado: 'Matrícula', className: 'num' },
    { clave: 'nombre', encabezado: 'Alumno' },
  ]
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-ink">Lista</h2>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer strokeWidth={2.4} aria-hidden="true" />
          Imprimir lista
        </Button>
      </div>
      <TablaDatos
        columnas={columnas}
        filas={detalle.alumnos}
        claveFila={(a) => a.alumno_id}
        descripcion={`Lista de ${detalle.asignacion.materia} en ${detalle.asignacion.grupo}`}
        vacio={{
          variante: 'vacio',
          titulo: 'Este grupo todavía no tiene alumnos',
          descripcion:
            'Coordinación da de alta a los alumnos; en cuanto lo haga, aparecen aquí sin que captures nada.',
        }}
      />
    </>
  )
}

/** Solo el resultado: el motivo y la evidencia son de Coordinación y Dirección (especificación, 10.7). */
function DerechoMateria({ detalle }: { detalle: DetalleAsignacion }) {
  const columnas: ColumnaTabla<Alumno>[] = [
    { clave: 'identificador', encabezado: 'Matrícula', className: 'num' },
    { clave: 'nombre', encabezado: 'Alumno' },
    {
      clave: 'resultado',
      encabezado: 'Derecho a evaluación',
      render: (a) =>
        a.decision ? (
          <InsigniaEstado estado={a.decision.resultado} />
        ) : (
          <span className="text-ink-3">Sin decisión todavía</span>
        ),
    },
  ]
  return (
    <>
      <h2 className="text-2xl font-semibold text-ink">Derecho a evaluación</h2>
      <p className="max-w-2xl text-sm text-ink-3">
        Sabes a quién no calificar. El motivo de cada decisión lo guarda Coordinación.
      </p>
      <TablaDatos
        columnas={columnas}
        filas={detalle.alumnos}
        claveFila={(a) => a.alumno_id}
        descripcion={`Derecho a evaluación en ${detalle.asignacion.materia}`}
      />
    </>
  )
}

export function Asignacion() {
  const { id, tab } = useParams()
  const d = useDatos<DetalleAsignacion>(`/asignaciones/${Number(id)}`)
  const datos = d.datos
  const activa = PESTANAS.some(([c]) => c === tab) ? (tab as string) : 'calificaciones'
  const base = `/asignaciones/${Number(id)}`
  useDeclararMigas(
    datos
      ? [
          { etiqueta: datos.asignacion.periodo, ruta: '/grupos' },
          {
            etiqueta: `${datos.asignacion.grupo} · ${datos.asignacion.materia}`,
            ruta: `${base}/calificaciones`,
          },
          {
            etiqueta: PESTANAS.find(([c]) => c === activa)?.[1] ?? 'Calificaciones',
            ruta: `${base}/${activa}`,
          },
        ]
      : null,
  )
  if (tab !== undefined && !PESTANAS.some(([c]) => c === tab))
    return <Navigate to={`${base}/calificaciones`} replace />
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!datos) return <Cargando />
  const limite = (datos.asignacion as { fecha_limite_entrega?: string | null }).fecha_limite_entrega
  return (
    <LayoutSeccion
      encabezado={`${datos.asignacion.materia} · ${datos.asignacion.grupo}`}
      secciones={PESTANAS.map(([clave, etiqueta]) => ({
        clave,
        etiqueta,
        ruta: `${base}/${clave}`,
      }))}
      activa={activa}
      derecha={
        <>
          <Link
            to="/calendario"
            className="flex min-h-10 items-center rounded-md px-2 text-sm font-medium text-brand hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Ver calendario
          </Link>
          <Panel titulo="Mi entrega">
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3 text-sm">
              <span className="flex items-center gap-2">
                <InsigniaEstado estado={datos.entrega?.estado ?? 'sin_entrega'} />
                {datos.entrega ? (
                  <span className="text-xs text-ink-3 num">v{datos.entrega.version}</span>
                ) : null}
              </span>
              <span className="text-ink-2">
                Fecha límite:{' '}
                <span className="num">{limite ? soloFecha(limite) : 'sin fecha'}</span>
              </span>
            </div>
          </Panel>
        </>
      }
    >
      {activa === 'lista' ? <ListaMateria detalle={datos} /> : null}
      {activa === 'calificaciones' ? (
        <>
          <h2 className="text-2xl font-semibold text-ink">Calificaciones</h2>
          <Captura key={datos.entrega?.id ?? 'sin-entrega'} detalle={datos} />
        </>
      ) : null}
      {activa === 'derecho' ? <DerechoMateria detalle={datos} /> : null}
    </LayoutSeccion>
  )
}
