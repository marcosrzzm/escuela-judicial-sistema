import { Check, PenLine, RotateCcw, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CampoAreaTexto } from '@/componentes/CampoFormulario'
import { aItems, CapturaCalificaciones, hayErrores } from '@/componentes/CapturaCalificaciones'
import { DialogoConfirmacion } from '@/componentes/DialogoConfirmacion'
import { DialogoMotivo } from '@/componentes/DialogoMotivo'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { FilterBar } from '@/componentes/FilterBar'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import {
  aceptarEntrega,
  capturaExcepcional,
  devolverEntrega,
  reabrirEntrega,
  type Asignacion,
  type DetalleAsignacion,
  type DetalleEntrega,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora, resolverZod } from '@/lib/formulario'

const esquemaMotivo = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'El motivo de la captura excepcional es obligatorio.')
    .max(500, 'Máximo 500 caracteres.'),
})

type Accion = { tipo: 'aceptar' | 'devolver' | 'reabrir' | 'capturar'; fila: Asignacion }

function estadoDe(a: Asignacion): string {
  return a.entrega?.estado ?? 'sin_entrega'
}

function nombreEntrega(a: Asignacion): string {
  return `${a.entrega ? `la versión ${a.entrega.version} de ` : ''}${a.materia} de ${a.grupo} (${a.docente})`
}

function Captura({ detalle, alCerrar }: { detalle: DetalleAsignacion; alCerrar: () => void }) {
  const filas = detalle.alumnos.map((a) => ({
    alumno_id: a.alumno_id,
    identificador: a.identificador,
    nombre: a.nombre,
    bloqueado: a.bloqueado,
  }))
  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      (detalle.entrega?.calificaciones ?? [])
        .filter((c) => c.valor !== null)
        .map((c) => [c.alumno_id, String(c.valor)]),
    ),
  )
  const [intento, setIntento] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ motivo: string }>({
    resolver: resolverZod(esquemaMotivo),
    defaultValues: { motivo: '' },
  })
  const guardar = useAccion(
    (v: { motivo: string }) =>
      capturaExcepcional(detalle.asignacion.id, v.motivo, aItems(valores, filas)),
    {
      exito: () =>
        `Captura excepcional de ${detalle.asignacion.materia} (${detalle.asignacion.grupo}) enviada a revisión; cuenta como recaptura`,
      alExito: alCerrar,
    },
  )
  return (
    <>
      <form
        id="form-captura"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          setIntento(true)
          void handleSubmit((v) => {
            if (!hayErrores(valores, filas, true)) guardar.ejecutar(v)
          })(e)
        }}
        noValidate
      >
        <CampoAreaTexto
          etiqueta="Motivo de la captura excepcional"
          obligatorio
          error={errors.motivo?.message}
          registro={register('motivo')}
        />
        <CapturaCalificaciones
          filas={filas}
          valores={valores}
          alCambiar={(id, v) => setValores((p) => ({ ...p, [id]: v }))}
          deshabilitado={guardar.ocupado}
          mostrarErrores={intento}
        />
      </form>
      <DialogFooter>
        <PieDeFormulario
          formId="form-captura"
          onCancelar={alCerrar}
          textoConfirmar="Capturar y enviar a revisión"
          trabajando={guardar.ocupado}
        />
      </DialogFooter>
    </>
  )
}

function DialogoCaptura({ fila, alCerrar }: { fila: Asignacion; alCerrar: () => void }) {
  const detalle = useDatos<DetalleAsignacion>(`/asignaciones/${fila.id}`)
  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) alCerrar()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capturar por {fila.docente}</DialogTitle>
          <DialogDescription>
            {fila.materia} · {fila.grupo}. Ruta excepcional: solo cuando el docente no puede usar el
            sistema. Cada valor que escribes aquí cuenta como recaptura.
          </DialogDescription>
        </DialogHeader>
        {detalle.error ? (
          <ErrorDatos error={detalle.error} reintentar={detalle.reintentar} />
        ) : null}
        {detalle.cargando ? <Cargando /> : null}
        {detalle.datos ? <Captura detalle={detalle.datos} alCerrar={alCerrar} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function PanelEntrega({
  fila,
  alCerrar,
  alAccion,
}: {
  fila: Asignacion
  alCerrar: () => void
  alAccion: (a: Accion) => void
}) {
  const d = useDatos<DetalleEntrega>(fila.entrega ? `/entregas/${fila.entrega.id}` : null)
  const porAlumno = new Map((d.datos?.entrega.calificaciones ?? []).map((c) => [c.alumno_id, c]))
  const e = d.datos?.entrega
  return (
    <Sheet
      open
      onOpenChange={(a) => {
        if (!a) alCerrar()
      }}
    >
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {fila.materia} · {fila.grupo}
          </SheetTitle>
          <SheetDescription>
            {fila.docente} · periodo {fila.periodo}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          {d.error ? <ErrorDatos error={d.error} reintentar={d.reintentar} /> : null}
          {d.cargando ? <Cargando /> : null}
          {e ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink-3">Versión</dt>
                <dd className="num">{e.version}</dd>
                <dt className="text-ink-3">Estado</dt>
                <dd>
                  <InsigniaEstado estado={e.estado} />
                </dd>
                <dt className="text-ink-3">Responsable</dt>
                <dd>{e.responsable}</dd>
                <dt className="text-ink-3">Enviada</dt>
                <dd>{fechaHora(e.fecha_envio)}</dd>
                {e.captura_excepcional ? (
                  <>
                    <dt className="text-ink-3">Captura excepcional</dt>
                    <dd>{e.motivo_captura}</dd>
                  </>
                ) : null}
                {e.motivo ? (
                  <>
                    <dt className="text-ink-3">Motivo</dt>
                    <dd>{e.motivo}</dd>
                  </>
                ) : null}
              </dl>
              <table className="w-full text-sm">
                <caption className="sr-only">Calificaciones de la versión {e.version}</caption>
                <thead className="text-left text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  <tr>
                    <th scope="col" className="py-1">
                      Alumno
                    </th>
                    <th scope="col" className="py-1 text-right">
                      Calificación
                    </th>
                    <th scope="col" className="py-1 pl-3">
                      Estatus
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(d.datos?.alumnos ?? []).map((a) => {
                    const c = porAlumno.get(a.alumno_id)
                    return (
                      <tr key={a.alumno_id} className="border-t border-line">
                        <td className="py-1.5">{a.nombre}</td>
                        <td className="py-1.5 text-right num">
                          {c?.valor === null || c === undefined ? 'Sin valor' : c.valor.toFixed(1)}
                        </td>
                        <td className="py-1.5 pl-3">
                          {c ? <InsigniaEstado estado={c.estatus} /> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
        {e?.estado === 'enviada' ? (
          <SheetFooter className="flex-row gap-2 px-4 pb-4">
            <Button type="button" onClick={() => alAccion({ tipo: 'aceptar', fila })}>
              <Check strokeWidth={2.4} aria-hidden="true" />
              Aceptar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => alAccion({ tipo: 'devolver', fila })}
            >
              <Undo2 strokeWidth={2.4} aria-hidden="true" />
              Devolver
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function Revision() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const estado = params.get('estado') ?? 'todos'
  const lista = useDatos<{ filas: Asignacion[] }>('/asignaciones')
  const [accion, setAccion] = useState<Accion | null>(null)
  const [abierta, setAbierta] = useState<Asignacion | null>(null)
  const cerrar = () => setAccion(null)

  const aceptar = useAccion((id: number) => aceptarEntrega(id), {
    exito: () =>
      `Entrega aceptada: ${accion ? nombreEntrega(accion.fila) : ''}. Pasó al historial y a los pendientes`,
    alExito: () => {
      cerrar()
      setAbierta(null)
    },
  })
  const devolver = useAccion(
    (v: { id: number; motivo: string }) => devolverEntrega(v.id, v.motivo),
    {
      exito: () =>
        `Entrega devuelta: ${accion ? nombreEntrega(accion.fila) : ''}. El docente ya ve el motivo y una versión nueva en borrador`,
      alExito: () => {
        cerrar()
        setAbierta(null)
      },
    },
  )
  const reabrir = useAccion((v: { id: number; motivo: string }) => reabrirEntrega(v.id, v.motivo), {
    exito: () =>
      `Entrega reabierta: ${accion ? nombreEntrega(accion.fila) : ''}. Se creó una versión nueva en borrador`,
    alExito: cerrar,
  })

  function poner(cambios: Record<string, string | null>) {
    const n = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === '' || v === 'todos') n.delete(k)
      else n.set(k, v)
    }
    setParams(n, { replace: true })
  }

  const todas = lista.datos?.filas ?? []
  const filas = todas.filter(
    (a) =>
      (estado === 'todos' || estadoDe(a) === estado) &&
      `${a.materia} ${a.docente} ${a.grupo}`.toLowerCase().includes(q.toLowerCase()),
  )

  const columnas: ColumnaTabla<Asignacion>[] = [
    { clave: 'grupo', encabezado: 'Grupo', ocultarEnMovil: true },
    {
      clave: 'materia',
      encabezado: 'Materia',
      render: (a) => (
        <>
          {a.materia}
          <span className="block text-xs text-ink-3 sm:hidden">{a.grupo}</span>
        </>
      ),
    },
    { clave: 'docente', encabezado: 'Docente', ocultarEnMovil: true },
    {
      clave: 'version',
      encabezado: 'Versión',
      numerica: true,
      ocultarEnMovil: true,
      render: (a) => a.entrega?.version ?? '',
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (a) => <InsigniaEstado estado={estadoDe(a)} />,
    },
    {
      clave: 'envio',
      encabezado: 'Enviada',
      ocultarEnMovil: true,
      render: (a) => (a.entrega?.fecha_envio ? fechaHora(a.entrega.fecha_envio) : ''),
    },
  ]

  return (
    <Pagina
      titulo="Revisión de calificaciones"
      descripcion="Cada fila es una asignación con su entrega vigente. Acepta la entrega, o devuélvela al docente con un motivo."
    >
      <FilterBar
        busqueda={q}
        onBusqueda={(v) => poner({ q: v })}
        placeholder="Buscar por materia, docente o grupo"
        filtros={[
          {
            id: 'estado',
            etiqueta: 'Estado',
            valor: estado,
            onCambio: (v) => poner({ estado: v }),
            opciones: [
              { valor: 'enviada', etiqueta: 'Enviada' },
              { valor: 'aceptada', etiqueta: 'Aceptada' },
              { valor: 'borrador', etiqueta: 'Borrador' },
              { valor: 'sin_entrega', etiqueta: 'Sin entrega' },
            ],
          },
        ]}
        onLimpiarTodo={() => setParams(new URLSearchParams(), { replace: true })}
      />
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      <TablaDatos
        columnas={columnas}
        filas={filas}
        claveFila={(a) => a.id}
        descripcion="Asignaciones del periodo abierto con su entrega vigente"
        cargando={lista.cargando}
        onFilaClic={(a) => (a.entrega ? setAbierta(a) : setAccion({ tipo: 'capturar', fila: a }))}
        accionesFila={(a) => {
          const e = estadoDe(a)
          return (
            <>
              {e === 'enviada' ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAccion({ tipo: 'aceptar', fila: a })}
                  >
                    <Check strokeWidth={2.4} aria-hidden="true" />
                    Aceptar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAccion({ tipo: 'devolver', fila: a })}
                  >
                    <Undo2 strokeWidth={2.4} aria-hidden="true" />
                    Devolver
                  </Button>
                </>
              ) : null}
              {e === 'aceptada' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAccion({ tipo: 'reabrir', fila: a })}
                >
                  <RotateCcw strokeWidth={2.4} aria-hidden="true" />
                  Reabrir
                </Button>
              ) : null}
              {e === 'sin_entrega' || e === 'borrador' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAccion({ tipo: 'capturar', fila: a })}
                >
                  <PenLine strokeWidth={2.4} aria-hidden="true" />
                  Capturar por el docente
                </Button>
              ) : null}
            </>
          )
        }}
        vacio={
          todas.length === 0
            ? {
                variante: 'vacio',
                titulo: 'Todavía no hay asignaciones en el periodo abierto',
                descripcion:
                  'Las asignaciones (grupo, materia y docente) se cargan en la semilla del piloto.',
              }
            : {
                variante: 'sinResultados',
                titulo: 'Ninguna asignación coincide con estos filtros',
                descripcion: 'Quita el filtro de estado o la búsqueda para ver todas.',
                accion: (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  >
                    Limpiar filtros
                  </Button>
                ),
              }
        }
      />

      {abierta && !accion ? (
        <PanelEntrega fila={abierta} alCerrar={() => setAbierta(null)} alAccion={setAccion} />
      ) : null}

      <DialogoConfirmacion
        abierto={accion?.tipo === 'aceptar'}
        alCambiarApertura={(a) => {
          if (!a) cerrar()
        }}
        titulo="Aceptar la entrega"
        descripcion={
          accion
            ? `Vas a aceptar ${nombreEntrega(accion.fila)}. Sus calificaciones pasan al historial de cada alumno y se abren o resuelven sus pendientes.`
            : ''
        }
        etiquetaAccion="Aceptar entrega"
        peligroso={false}
        ocupado={aceptar.ocupado}
        alConfirmar={() => accion?.fila.entrega && aceptar.ejecutar(accion.fila.entrega.id)}
      />
      <DialogoMotivo
        abierto={accion?.tipo === 'devolver'}
        alCambiarApertura={(a) => {
          if (!a) cerrar()
        }}
        titulo="Devolver la entrega"
        descripcion={
          accion
            ? `Vas a devolver ${nombreEntrega(accion.fila)}. El docente verá tu motivo y recibirá una versión nueva en borrador con las mismas calificaciones.`
            : ''
        }
        etiqueta="Motivo de la devolución"
        etiquetaAccion="Devolver entrega"
        ocupado={devolver.ocupado}
        alConfirmar={(motivo) => {
          if (accion?.fila.entrega) devolver.ejecutar({ id: accion.fila.entrega.id, motivo })
        }}
      />
      <DialogoMotivo
        abierto={accion?.tipo === 'reabrir'}
        alCambiarApertura={(a) => {
          if (!a) cerrar()
        }}
        titulo="Reabrir la entrega aceptada"
        descripcion={
          accion
            ? `Vas a reabrir ${nombreEntrega(accion.fila)}. La versión actual se conserva como reabierta y el docente corrige una versión nueva en borrador.`
            : ''
        }
        etiqueta="Motivo de la reapertura"
        etiquetaAccion="Reabrir entrega"
        ocupado={reabrir.ocupado}
        alConfirmar={(motivo) => {
          if (accion?.fila.entrega) reabrir.ejecutar({ id: accion.fila.entrega.id, motivo })
        }}
      />
      {accion?.tipo === 'capturar' ? <DialogoCaptura fila={accion.fila} alCerrar={cerrar} /> : null}
    </Pagina>
  )
}
