import { Download, FileText, PackageCheck, Send, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { CampoAreaTexto } from '@/componentes/CampoFormulario'
import { DialogoConfirmacion } from '@/componentes/DialogoConfirmacion'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { BarraProgreso, PasoDelProceso, type PasoProceso } from '@/componentes/PasoDelProceso'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { SelectorGrupo, useSeleccionGrupo } from '@/componentes/SelectorGrupo'
import { esquemaCierre, type CierreFormulario } from '@/esquemas/cierre'
import {
  aprobarCierre,
  enviarAutorizacion,
  generarLote,
  prepararCierre,
  type CierreGrupo,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { useSesion } from '@/lib/sesion'
import { fechaHora, resolverZod } from '@/lib/formulario'
import { useTiempoActivo } from '@/lib/useTiempoActivo'

type Cierre = CierreGrupo['cierres'][number]

function DialogoPreparar({
  datos,
  abierto,
  alCambiarApertura,
}: {
  datos: CierreGrupo
  abierto: boolean
  alCambiarApertura: (a: boolean) => void
}) {
  const vigenteAprobado = datos.cierres.find((c) => c.estado === 'aprobado')
  const faltan = datos.asignaciones.filter((a) => !a.aceptada).map((a) => a.materia)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CierreFormulario>({
    resolver: resolverZod(esquemaCierre),
    defaultValues: {
      requiere_autorizacion: false,
      excepcion: false,
      motivo_excepcion: '',
      motivo: '',
    },
  })
  const guardar = useAccion(
    (v: CierreFormulario) =>
      prepararCierre(datos.grupo.id, {
        requiere_autorizacion: v.requiere_autorizacion,
        excepcion: v.excepcion,
        motivo_excepcion: v.motivo_excepcion,
        motivo: v.motivo,
      }),
    {
      exito: () => `Cierre de ${datos.grupo.clave} (${datos.grupo.periodo}) preparado`,
      alExito: () => {
        reset()
        alCambiarApertura(false)
      },
    },
  )
  const excepcion = watch('excepcion')
  function alEnviar(v: CierreFormulario) {
    if (faltan.length > 0 && !v.excepcion)
      return setError('excepcion', {
        message:
          'Falta una entrega aceptada. Marca la excepción y escribe el motivo, o acepta las entregas primero.',
      })
    if (faltan.length > 0 && v.motivo_excepcion === '')
      return setError('motivo_excepcion', { message: 'El motivo de la excepción es obligatorio.' })
    if (vigenteAprobado && v.motivo === '')
      return setError('motivo', { message: 'El motivo del reemplazo es obligatorio.' })
    guardar.ejecutar(v)
  }
  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preparar cierre de {datos.grupo.clave}</DialogTitle>
          <DialogDescription>
            Periodo {datos.grupo.periodo}. Se crea la versión {(datos.cierres[0]?.version ?? 0) + 1}{' '}
            del cierre con las entregas aceptadas vigentes.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-cierre"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(alEnviar)}
          noValidate
        >
          {faltan.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-alerta/30 bg-alerta-soft p-3 text-sm text-alerta">
              <p>
                Falta una entrega aceptada en: {faltan.join(', ')}. Solo puedes continuar
                registrando una excepción con motivo.
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="excepcion"
                  checked={excepcion}
                  onCheckedChange={(c) =>
                    setValue('excepcion', c === true, { shouldValidate: true })
                  }
                />
                <Label htmlFor="excepcion">Continuar con una excepción</Label>
              </div>
              {errors.excepcion ? (
                <p role="alert" className="text-xs text-error">
                  {errors.excepcion.message}
                </p>
              ) : null}
              {excepcion ? (
                <CampoAreaTexto
                  etiqueta="Motivo de la excepción"
                  obligatorio
                  registro={register('motivo_excepcion')}
                  error={errors.motivo_excepcion?.message}
                />
              ) : null}
            </div>
          ) : null}
          {vigenteAprobado ? (
            <CampoAreaTexto
              etiqueta={`Motivo para reemplazar la versión ${vigenteAprobado.version} aprobada`}
              obligatorio
              registro={register('motivo')}
              error={errors.motivo?.message}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <Checkbox
              id="requiere"
              checked={watch('requiere_autorizacion')}
              onCheckedChange={(c) => setValue('requiere_autorizacion', c === true)}
            />
            <Label htmlFor="requiere">Este cierre requiere autorización de Dirección</Label>
          </div>
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-cierre"
            onCancelar={() => alCambiarApertura(false)}
            textoConfirmar="Preparar cierre"
            trabajando={guardar.ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Traspaso({ c }: { c: Cierre }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4 text-sm">
      <h3 className="text-base font-semibold text-ink">Traspaso a Carga externa</h3>
      <div className="flex flex-wrap items-center gap-2">
        <InsigniaEstado estado={c.lote_estado ?? 'generado'} />
        <span className="text-ink-3">Lote generado {fechaHora(c.fecha_generacion)}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-ink-3">Recepción</dt>
        <dd>{c.fecha_recepcion ? fechaHora(c.fecha_recepcion) : 'Todavía no se recibe'}</dd>
        <dt className="text-ink-3">Carga</dt>
        <dd>
          {c.fecha_carga
            ? `${fechaHora(c.fecha_carga)} · ${c.registrado_por}`
            : 'Todavía no se carga'}
        </dd>
        {c.discrepancias ? (
          <>
            <dt className="text-ink-3">Discrepancias</dt>
            <dd className="text-error">{c.discrepancias}</dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}

export function CierreLote() {
  // Dirección consulta el cierre; preparar, aprobar y generar son de Coordinación.
  const edita = useSesion().puede('cierre', 'crear')
  const sel = useSeleccionGrupo()
  const grupoId = sel.grupo?.id ?? null
  useTiempoActivo('cierre', grupoId)
  const d = useDatos<CierreGrupo>(grupoId ? `/grupos/${grupoId}/cierre` : null)
  const [preparar, setPreparar] = useState(false)
  const [confirmar, setConfirmar] = useState<'aprobar' | 'autorizacion' | 'lote' | null>(null)
  const datos = d.datos
  const vigente: Cierre | undefined = datos?.cierres[0]
  const nombre =
    datos && vigente
      ? `el cierre versión ${vigente.version} de ${datos.grupo.clave} (${datos.grupo.periodo})`
      : ''
  const cerrar = () => setConfirmar(null)
  const aprobar = useAccion((id: number) => aprobarCierre(id), {
    exito: () => `Cierre aprobado: ${nombre}`,
    alExito: cerrar,
  })
  const aDireccion = useAccion((id: number) => enviarAutorizacion(id), {
    exito: () => `Cierre enviado a Dirección: ${nombre}`,
    alExito: cerrar,
  })
  const lote = useAccion((id: number) => generarLote(id), {
    exito: () => `Boletas y lote generados para ${nombre}`,
    alExito: cerrar,
  })

  const paso1: PasoProceso['estado'] = datos?.listo || vigente ? 'hecho' : 'en_curso'
  const aprobado = vigente?.estado === 'aprobado'
  const paso2: PasoProceso['estado'] = aprobado
    ? 'hecho'
    : vigente && ['preparado', 'en_autorizacion'].includes(vigente.estado)
      ? 'en_curso'
      : datos?.listo
        ? 'en_curso'
        : 'pendiente'
  const paso3: PasoProceso['estado'] = vigente?.lote_id
    ? 'hecho'
    : aprobado
      ? 'en_curso'
      : 'pendiente'
  const pasos: PasoProceso[] = [
    {
      numero: 1,
      titulo: 'Entregas aceptadas',
      detalle: datos
        ? `${datos.asignaciones.filter((a) => a.aceptada).length} de ${datos.asignaciones.length} asignaciones con entrega aceptada`
        : '',
      estado: paso1,
    },
    {
      numero: 2,
      titulo: 'Cierre aprobado',
      detalle: vigente
        ? `Versión ${vigente.version}: ${vigente.estado.replace('_', ' ')}`
        : 'Todavía no se prepara',
      estado: paso2,
    },
    {
      numero: 3,
      titulo: 'Documentos, lote y traspaso',
      detalle: vigente?.lote_id
        ? `Lote ${vigente.lote_estado?.replace('_', ' ')}`
        : 'Todavía no se genera el lote',
      estado: paso3,
    },
  ]
  const progreso =
    paso3 === 'hecho' ? 3 : aprobado ? 3 : paso2 === 'en_curso' || paso2 === 'hecho' ? 2 : 1

  return (
    <Pagina
      titulo="Cierre y lote"
      descripcion="Del grupo con todas sus entregas aceptadas al lote que recibe Carga externa."
    >
      <SelectorGrupo seleccion={sel} />
      {sel.error ? <ErrorDatos error={sel.error} reintentar={sel.reintentar} /> : null}
      {d.error ? <ErrorDatos error={d.error} reintentar={d.reintentar} /> : null}
      {sel.cargando || d.cargando ? <Cargando /> : null}
      {datos ? (
        <>
          <BarraProgreso actual={progreso} total={3} />
          <PasoDelProceso pasos={pasos} />

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-ink">Entregas del grupo</h2>
            <ul className="flex flex-col gap-2">
              {datos.asignaciones.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 text-sm"
                >
                  <span className="font-medium text-ink">{a.materia}</span>
                  <span className="text-ink-3">{a.docente}</span>
                  <InsigniaEstado estado={a.entrega?.estado ?? 'sin_entrega'} />
                  {a.entrega ? (
                    <span className="text-xs text-ink-3 num">v{a.entrega.version}</span>
                  ) : null}
                </li>
              ))}
              {datos.asignaciones.length === 0 ? (
                <li className="text-sm text-ink-3">Este grupo no tiene asignaciones.</li>
              ) : null}
            </ul>
            {!datos.listo && datos.asignaciones.length > 0 ? (
              <p className="text-sm text-ink-3">
                Faltan entregas por aceptar.{' '}
                <Link className="font-semibold text-brand underline" to="/revision">
                  Ir a Revisión de calificaciones
                </Link>
                .
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-ink">Cierre</h2>
            {vigente ? (
              <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-base font-semibold text-ink num">
                    Versión {vigente.version}
                  </span>
                  <InsigniaEstado estado={vigente.estado} />
                  {vigente.requiere_autorizacion ? (
                    <span className="text-sm text-ink-3">Requiere autorización de Dirección</span>
                  ) : null}
                </div>
                <p className="text-sm text-ink-3">
                  Preparado por {vigente.preparado_por}
                  {vigente.aprobado_por
                    ? ` · aprobado por ${vigente.aprobado_por} (${fechaHora(vigente.fecha_aprobacion)})`
                    : ''}
                </p>
                {vigente.excepcion ? (
                  <p className="text-sm text-alerta">
                    Excepción registrada: {vigente.motivo_excepcion}
                  </p>
                ) : null}
                {vigente.estado === 'devuelto' ? (
                  <p className="text-sm text-alerta">Dirección lo devolvió: {vigente.motivo}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {edita && vigente.estado === 'preparado' && !vigente.requiere_autorizacion ? (
                    <Button type="button" onClick={() => setConfirmar('aprobar')}>
                      <ShieldCheck strokeWidth={2.4} aria-hidden="true" />
                      Aprobar cierre
                    </Button>
                  ) : null}
                  {edita && vigente.estado === 'preparado' && vigente.requiere_autorizacion ? (
                    <Button type="button" onClick={() => setConfirmar('autorizacion')}>
                      <Send strokeWidth={2.4} aria-hidden="true" />
                      Enviar a Dirección
                    </Button>
                  ) : null}
                  {edita && vigente.estado === 'aprobado' && !vigente.lote_id ? (
                    <Button type="button" onClick={() => setConfirmar('lote')}>
                      <PackageCheck strokeWidth={2.4} aria-hidden="true" />
                      Generar boletas y lote
                    </Button>
                  ) : null}
                  {vigente.lote_id ? (
                    <>
                      <Button asChild variant="outline">
                        <a href={`/api/lotes/${vigente.lote_id}/csv`} download>
                          <Download strokeWidth={2.4} aria-hidden="true" />
                          Descargar lote (CSV)
                        </a>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to={`/boletas/${vigente.id}`}>
                          <FileText strokeWidth={2.4} aria-hidden="true" />
                          Ver boletas para imprimir
                        </Link>
                      </Button>
                    </>
                  ) : null}
                  {edita && ['aprobado', 'devuelto'].includes(vigente.estado) ? (
                    <Button type="button" variant="outline" onClick={() => setPreparar(true)}>
                      Preparar versión nueva
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong bg-paper-2 p-6">
                <p className="text-base font-semibold text-ink">
                  Este grupo todavía no tiene cierre
                </p>
                <p className="max-w-lg text-sm text-ink-3">
                  El cierre fija las calificaciones aceptadas del grupo. De él salen las boletas y
                  el lote para Carga externa.
                </p>
                {edita ? (
                  <Button type="button" onClick={() => setPreparar(true)}>
                    Preparar cierre
                  </Button>
                ) : null}
              </div>
            )}
            {vigente?.lote_id ? <Traspaso c={vigente} /> : null}
          </section>

          {datos.cierres.length > 1 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-ink">Versiones anteriores</h2>
              <ul className="flex flex-col gap-1.5 rounded-lg border border-line bg-card p-4 text-sm">
                {datos.cierres.slice(1).map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium num">Versión {c.version}</span>
                    <InsigniaEstado estado={c.estado} />
                    {c.motivo ? <span className="text-ink-3">{c.motivo}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <DialogoPreparar
            key={datos.cierres.length}
            datos={datos}
            abierto={preparar}
            alCambiarApertura={setPreparar}
          />
          <DialogoConfirmacion
            abierto={confirmar !== null}
            alCambiarApertura={(a) => {
              if (!a) cerrar()
            }}
            titulo={
              confirmar === 'aprobar'
                ? 'Aprobar el cierre'
                : confirmar === 'autorizacion'
                  ? 'Enviar el cierre a Dirección'
                  : 'Generar boletas y lote'
            }
            descripcion={
              confirmar === 'aprobar'
                ? `Vas a aprobar ${nombre}. Un cierre aprobado no se sobrescribe: si cambia, se genera una versión nueva.`
                : confirmar === 'autorizacion'
                  ? `Vas a enviar ${nombre} a Dirección, que lo aprueba o lo devuelve con motivo.`
                  : `Vas a generar las boletas (pendientes de firma institucional) y el lote del ${nombre.replace(/^el /, '')}. Solo hay un lote por versión de cierre.`
            }
            etiquetaAccion={
              confirmar === 'aprobar'
                ? 'Aprobar cierre'
                : confirmar === 'autorizacion'
                  ? 'Enviar a Dirección'
                  : 'Generar boletas y lote'
            }
            peligroso={false}
            ocupado={aprobar.ocupado || aDireccion.ocupado || lote.ocupado}
            alConfirmar={() => {
              if (!vigente) return
              if (confirmar === 'aprobar') aprobar.ejecutar(vigente.id)
              else if (confirmar === 'autorizacion') aDireccion.ejecutar(vigente.id)
              else lote.ejecutar(vigente.id)
            }}
          />
        </>
      ) : null}
    </Pagina>
  )
}
