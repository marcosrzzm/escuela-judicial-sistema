import { CirclePlus, MailPlus, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CampoAreaTexto, CampoSelect, CampoTexto } from '@/componentes/CampoFormulario'
import { DialogoInvitarAlumno } from '@/componentes/DialogoInvitarAlumno'
import { DialogoMotivo } from '@/componentes/DialogoMotivo'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { FilterBar } from '@/componentes/FilterBar'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import { esquemaAlumno, type AlumnoFormulario } from '@/esquemas/administracion'
import { esquemaPendiente, type PendienteFormulario } from '@/esquemas/pendiente'
import {
  crearPendiente,
  editarAlumno,
  resolverPendiente,
  type AlumnoBusqueda,
  type Historial as TipoHistorial,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { resolverZod } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'

function DialogoPendiente({
  datos,
  abierto,
  alCambiarApertura,
}: {
  datos: TipoHistorial
  abierto: boolean
  alCambiarApertura: (a: boolean) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PendienteFormulario>({
    resolver: resolverZod(esquemaPendiente),
    defaultValues: { materia_id: '', periodo_origen_id: '', motivo: '' },
  })
  const guardar = useAccion(
    (v: PendienteFormulario) =>
      crearPendiente(datos.alumno.id, {
        materia_id: Number(v.materia_id),
        periodo_origen_id: Number(v.periodo_origen_id),
        motivo: v.motivo,
      }),
    {
      exito: () => `Pendiente agregado a ${datos.alumno.nombre}`,
      alExito: () => {
        reset()
        alCambiarApertura(false)
      },
    },
  )
  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar pendiente a {datos.alumno.nombre}</DialogTitle>
          <DialogDescription>
            Para una materia que el sistema no detectó por sí solo. Queda abierta hasta que se
            resuelva.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-pendiente"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => guardar.ejecutar(v))}
          noValidate
        >
          <CampoSelect
            etiqueta="Materia"
            obligatorio
            valor={watch('materia_id')}
            alCambiar={(v) => setValue('materia_id', v, { shouldValidate: true })}
            opciones={datos.materias.map((m) => ({ valor: String(m.id), etiqueta: m.nombre }))}
            error={errors.materia_id?.message}
          />
          <CampoSelect
            etiqueta="Periodo de origen"
            obligatorio
            valor={watch('periodo_origen_id')}
            alCambiar={(v) => setValue('periodo_origen_id', v, { shouldValidate: true })}
            opciones={datos.periodos_catalogo.map((p) => ({
              valor: String(p.id),
              etiqueta: p.nombre,
            }))}
            error={errors.periodo_origen_id?.message}
          />
          <CampoAreaTexto
            etiqueta="Motivo"
            obligatorio
            registro={register('motivo')}
            error={errors.motivo?.message}
          />
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-pendiente"
            onCancelar={() => alCambiarApertura(false)}
            textoConfirmar="Agregar pendiente"
            trabajando={guardar.ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Corregir los datos de un alumno: matrícula, nombre y estatus, siempre con motivo. */
function DialogoEditarAlumno({
  alumno,
  alCerrar,
}: {
  alumno: TipoHistorial['alumno']
  alCerrar: () => void
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AlumnoFormulario>({
    resolver: resolverZod(esquemaAlumno),
    defaultValues: {
      identificador: alumno.identificador,
      nombre: alumno.nombre,
      estatus: alumno.estatus as AlumnoFormulario['estatus'],
      motivo: '',
    },
  })
  const guardar = useAccion((v: AlumnoFormulario) => editarAlumno(alumno.id, v), {
    exito: (_r, v) => `Datos de ${v.nombre} actualizados`,
    alExito: alCerrar,
  })
  return (
    <Dialog open onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar los datos de {alumno.nombre}</DialogTitle>
          <DialogDescription>
            El cambio queda en la bitácora con el valor anterior y este motivo.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-alumno"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => guardar.ejecutar(v))}
          noValidate
        >
          <CampoTexto
            etiqueta="Matrícula"
            obligatorio
            registro={register('identificador')}
            error={errors.identificador?.message}
          />
          <CampoTexto
            etiqueta="Nombre"
            obligatorio
            registro={register('nombre')}
            error={errors.nombre?.message}
          />
          <CampoSelect
            etiqueta="Estatus"
            valor={watch('estatus')}
            alCambiar={(v) => setValue('estatus', v as AlumnoFormulario['estatus'])}
            opciones={[
              { valor: 'activo', etiqueta: 'Activo' },
              { valor: 'baja', etiqueta: 'Baja' },
              { valor: 'egresado', etiqueta: 'Egresado' },
            ]}
          />
          <CampoAreaTexto
            etiqueta="Motivo del cambio"
            obligatorio
            registro={register('motivo')}
            error={errors.motivo?.message}
          />
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-alumno"
            onCancelar={alCerrar}
            textoConfirmar="Guardar cambios"
            trabajando={guardar.ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetalleAlumno({ id }: { id: number }) {
  const { puede, sesion } = useSesion()
  const [editando, setEditando] = useState(false)
  const [invitando, setInvitando] = useState(false)
  const h = useDatos<TipoHistorial>(`/alumnos/${id}/historial`)
  const [nuevo, setNuevo] = useState(false)
  const [resolver, setResolver] = useState<TipoHistorial['pendientes'][number] | null>(null)
  const resolverAccion = useAccion(
    (v: { id: number; resolucion: string }) => resolverPendiente(v.id, v.resolucion),
    {
      exito: () => `Pendiente de ${resolver?.materia} marcado como resuelto`,
      alExito: () => setResolver(null),
    },
  )
  if (h.error) return <ErrorDatos error={h.error} reintentar={h.reintentar} />
  if (h.cargando || !h.datos) return <Cargando />
  const d = h.datos
  const abiertos = d.pendientes.filter((p) => p.estado === 'abierto').length
  return (
    <section className="flex flex-col gap-6" aria-label={`Historial de ${d.alumno.nombre}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-ink">{d.alumno.nombre}</h2>
        <p className="text-sm text-ink-3">
          <span className="num">{d.alumno.identificador}</span> · {abiertos} pendientes abiertos
        </p>
        {sesion?.base === 'coordinacion' && sesion.es_sistema && !d.tiene_cuenta ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setInvitando(true)}>
            <MailPlus strokeWidth={2.4} aria-hidden="true" />
            Invitar al alumno
          </Button>
        ) : null}
        {puede('alumno', 'modificar') ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditando(true)}>
            <Pencil strokeWidth={2.4} aria-hidden="true" />
            Editar datos
          </Button>
        ) : null}
      </div>
      {d.periodos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-6 text-sm text-ink-3">
          Este alumno todavía no tiene calificaciones aceptadas. Aparecerán aquí cuando Coordinación
          acepte la entrega de cada materia.
        </p>
      ) : (
        d.periodos.map((p) => (
          <div key={p.periodo_id} className="flex flex-col gap-2">
            <h3 className="font-serif text-lg font-semibold text-ink">
              Periodo {p.periodo}{' '}
              <span className="font-sans text-sm font-normal text-ink-3">· grupo {p.grupo}</span>
            </h3>
            <div className="overflow-x-auto rounded-lg border border-line bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Materias de {d.alumno.nombre} en el periodo {p.periodo}
                </caption>
                <thead className="bg-paper-2 text-left text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Materia
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Calificación
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Estatus
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Versión
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.materias.map((m) => (
                    <tr key={m.materia} className="border-t border-line">
                      <td className="px-3 py-2">{m.materia}</td>
                      <td className="px-3 py-2 text-right num">
                        {m.valor === null ? 'Sin valor' : m.valor.toFixed(1)}
                      </td>
                      <td className="px-3 py-2">
                        <InsigniaEstado estado={m.estatus} />
                      </td>
                      <td className="px-3 py-2 text-right text-ink-3 num">v{m.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-ink">Pendientes</h3>
          {puede('pendiente_academico', 'crear') ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setNuevo(true)}>
              <CirclePlus strokeWidth={2.4} aria-hidden="true" />
              Agregar pendiente
            </Button>
          ) : null}
        </div>
        {d.pendientes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-6 text-sm text-ink-3">
            Sin pendientes. Se abren solos con una calificación menor a 8.0 o sin derecho a
            evaluación, o los agregas a mano.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {d.pendientes.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium text-ink">{p.materia}</span>
                <InsigniaEstado estado={p.estado} />
                <span className="text-ink-3">
                  origen {p.periodo_origen} ·{' '}
                  {p.tipo === 'reprobada'
                    ? 'reprobada'
                    : p.tipo === 'sin_derecho'
                      ? 'sin derecho'
                      : 'manual'}
                </span>
                {p.resolucion ? (
                  <span className="w-full text-ink-3">Resolución: {p.resolucion}</span>
                ) : null}
                {p.estado === 'abierto' && puede('pendiente_academico', 'modificar') ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => setResolver(p)}
                  >
                    Marcar como resuelto
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {invitando ? (
        <DialogoInvitarAlumno
          alumno={{ id: d.alumno.id, nombre: d.alumno.nombre }}
          alCerrar={() => setInvitando(false)}
        />
      ) : null}
      <DialogoPendiente datos={d} abierto={nuevo} alCambiarApertura={setNuevo} />
      {editando ? (
        <DialogoEditarAlumno alumno={d.alumno} alCerrar={() => setEditando(false)} />
      ) : null}
      <DialogoMotivo
        abierto={resolver !== null}
        alCambiarApertura={(a) => {
          if (!a) setResolver(null)
        }}
        titulo={`Resolver el pendiente de ${resolver?.materia ?? ''}`}
        descripcion={`Pendiente de ${d.alumno.nombre} (origen ${resolver?.periodo_origen ?? ''}). Escribe cómo se resolvió; queda en el historial y en la bitácora.`}
        etiqueta="Resolución"
        etiquetaAccion="Marcar como resuelto"
        ocupado={resolverAccion.ocupado}
        alConfirmar={(resolucion) =>
          resolver && resolverAccion.ejecutar({ id: resolver.id, resolucion })
        }
      />
    </section>
  )
}

export function Historial() {
  const { sesion } = useSesion()
  const esAlumno = sesion?.base === 'alumno'
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const elegido = Number(params.get('alumno')) || null
  const lista = useDatos<{ filas: AlumnoBusqueda[] }>(
    esAlumno ? null : `/alumnos?q=${encodeURIComponent(q)}`,
  )
  function poner(cambios: Record<string, string | null>) {
    const n = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === '') n.delete(k)
      else n.set(k, v)
    }
    setParams(n, { replace: true })
  }
  const columnas: ColumnaTabla<AlumnoBusqueda>[] = [
    { clave: 'identificador', encabezado: 'Matrícula', className: 'num' },
    { clave: 'nombre', encabezado: 'Alumno' },
    {
      clave: 'pendientes_abiertos',
      encabezado: 'Pendientes abiertos',
      numerica: true,
      render: (a) => Number(a.pendientes_abiertos),
    },
  ]
  // El alumno ve solo su propia boleta: nunca la búsqueda ni la lista de otros.
  if (esAlumno && sesion?.alumno_id)
    return (
      <Pagina
        titulo="Mi boleta"
        descripcion="Tus calificaciones aceptadas por periodo y tus pendientes. Las entregas que aún no se aceptan no aparecen."
      >
        <DetalleAlumno id={sesion.alumno_id} />
      </Pagina>
    )
  return (
    <Pagina
      titulo="Historial del alumno"
      descripcion="Busca por nombre o matrícula y ve todas sus materias por periodo y sus pendientes, sin abrir archivos."
    >
      <FilterBar
        busqueda={q}
        onBusqueda={(v) => poner({ q: v })}
        placeholder="Buscar por nombre o matrícula"
        onLimpiarTodo={() => setParams(new URLSearchParams(), { replace: true })}
      />
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      <TablaDatos
        columnas={columnas}
        filas={lista.datos?.filas ?? []}
        claveFila={(a) => a.id}
        descripcion="Alumnos del sistema"
        cargando={lista.cargando}
        onFilaClic={(a) => poner({ alumno: String(a.id) })}
        vacio={
          q
            ? {
                variante: 'sinResultados',
                titulo: `Ningún alumno coincide con "${q}"`,
                descripcion: 'Revisa la escritura o busca solo por matrícula.',
                accion: (
                  <Button type="button" variant="outline" onClick={() => poner({ q: null })}>
                    Limpiar búsqueda
                  </Button>
                ),
              }
            : {
                variante: 'vacio',
                titulo: 'Todavía no hay alumnos',
                descripcion: 'Agrega alumnos en la pestaña Personas de un grupo.',
              }
        }
      />
      {elegido ? <DetalleAlumno key={elegido} id={elegido} /> : null}
    </Pagina>
  )
}
