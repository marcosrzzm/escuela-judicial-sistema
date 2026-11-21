import { Scale } from 'lucide-react'
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
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import { esquemaDecision, RESULTADOS, type DecisionFormulario } from '@/esquemas/decision'
import {
  crearDecision,
  type AlumnoAsignacion,
  type Asignacion,
  type DetalleAsignacion,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora, resolverZod } from '@/lib/formulario'

function DialogoDecision({
  asignacionId,
  alumno,
  materia,
  abierto,
  alCambiarApertura,
}: {
  asignacionId: number
  alumno: AlumnoAsignacion | null
  materia: string
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
  } = useForm<DecisionFormulario>({
    resolver: resolverZod(esquemaDecision),
    defaultValues: { resultado: 'con_derecho', motivo: '', referencia_evidencia: '' },
  })
  const guardar = useAccion(
    (v: DecisionFormulario) =>
      crearDecision(asignacionId, { alumno_id: alumno?.alumno_id ?? 0, ...v }),
    {
      exito: (_r, v) =>
        `Decisión registrada para ${alumno?.nombre}: ${RESULTADOS.find((r) => r.valor === v.resultado)?.etiqueta}`,
      alExito: () => {
        reset()
        alCambiarApertura(false)
      },
    },
  )
  const resultado = watch('resultado')
  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Derecho a evaluación de {alumno?.nombre}</DialogTitle>
          <DialogDescription>
            {materia}. La decisión la toma una persona; el sistema solo la guarda con su
            responsable, fecha y motivo.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-decision"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => guardar.ejecutar(v))}
          noValidate
        >
          <CampoSelect
            etiqueta="Resultado"
            obligatorio
            valor={resultado}
            alCambiar={(v) =>
              setValue('resultado', v as DecisionFormulario['resultado'], { shouldValidate: true })
            }
            opciones={RESULTADOS.map((r) => ({ valor: r.valor, etiqueta: r.etiqueta }))}
            error={errors.resultado?.message}
          />
          <CampoAreaTexto
            etiqueta="Motivo"
            obligatorio
            registro={register('motivo')}
            error={errors.motivo?.message}
          />
          <CampoTexto
            etiqueta="Referencia de evidencia (opcional)"
            registro={register('referencia_evidencia')}
            error={errors.referencia_evidencia?.message}
            placeholder="Dónde está el justificante"
          />
          {resultado === 'requiere_autorizacion' ? (
            <p className="rounded-lg border border-proceso/30 bg-proceso-soft px-3 py-2 text-sm text-proceso">
              Este caso aparecerá a Dirección en Autorizaciones, donde lo autoriza o lo rechaza con
              motivo.
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-decision"
            onCancelar={() => alCambiarApertura(false)}
            textoConfirmar="Registrar decisión"
            trabajando={guardar.ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Derecho() {
  const [params, setParams] = useSearchParams()
  const asignaciones = useDatos<{ filas: Asignacion[] }>('/asignaciones')
  const filas = asignaciones.datos?.filas ?? []
  const actual = filas.find((a) => a.id === Number(params.get('asignacion'))) ?? filas[0] ?? null
  const detalle = useDatos<DetalleAsignacion>(actual ? `/asignaciones/${actual.id}` : null)
  const [elegido, setElegido] = useState<AlumnoAsignacion | null>(null)

  const columnas: ColumnaTabla<AlumnoAsignacion>[] = [
    { clave: 'identificador', encabezado: 'Matrícula', className: 'num' },
    { clave: 'nombre', encabezado: 'Alumno' },
    {
      clave: 'decision',
      encabezado: 'Decisión vigente',
      render: (a) =>
        a.decision ? (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              <InsigniaEstado estado={a.decision.resultado} />
              {a.decision.resolucion_direccion ? (
                <InsigniaEstado estado={a.decision.resolucion_direccion} />
              ) : null}
            </div>
            <span className="text-xs text-ink-3">{a.decision.motivo}</span>
          </div>
        ) : (
          <span className="text-ink-3">Sin decisión todavía</span>
        ),
    },
    {
      clave: 'quien',
      encabezado: 'Registró',
      ocultarEnMovil: true,
      render: (a) =>
        a.decision ? `${a.decision.responsable} · ${fechaHora(a.decision.fecha)}` : '',
    },
  ]

  return (
    <Pagina
      titulo="Derecho a evaluación"
      descripcion="Registra, para cada alumno y materia, si tiene derecho a ser evaluado. Cada decisión conserva responsable, fecha y motivo."
    >
      {asignaciones.error ? (
        <ErrorDatos error={asignaciones.error} reintentar={asignaciones.reintentar} />
      ) : null}
      {asignaciones.cargando ? <Cargando /> : null}
      {actual ? (
        <div className="sm:max-w-xl">
          <CampoSelect
            etiqueta="Asignación"
            valor={String(actual.id)}
            alCambiar={(v) => setParams({ asignacion: v }, { replace: true })}
            opciones={filas.map((a) => ({
              valor: String(a.id),
              etiqueta: `${a.grupo} · ${a.materia} · ${a.docente}`,
            }))}
          />
        </div>
      ) : null}
      {detalle.error ? <ErrorDatos error={detalle.error} reintentar={detalle.reintentar} /> : null}
      {detalle.cargando ? <Cargando /> : null}
      {detalle.datos && actual ? (
        <>
          <TablaDatos
            columnas={columnas}
            filas={detalle.datos.alumnos}
            claveFila={(a) => a.alumno_id}
            descripcion={`Decisiones de ${actual.materia} en ${actual.grupo}`}
            accionesFila={(a) => (
              <Button type="button" variant="outline" size="sm" onClick={() => setElegido(a)}>
                <Scale strokeWidth={2.4} aria-hidden="true" />
                {a.decision ? 'Cambiar decisión' : 'Registrar decisión'}
              </Button>
            )}
            vacio={{
              variante: 'vacio',
              titulo: 'Este grupo no tiene alumnos vigentes',
              descripcion:
                'Agrega alumnos en Grupos y listas para poder registrar su derecho a evaluación.',
            }}
          />
          {detalle.datos.historial_decisiones.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-ink">Historial de decisiones</h2>
              <ul className="flex flex-col gap-1.5 rounded-lg border border-line bg-card p-4 text-sm">
                {detalle.datos.historial_decisiones.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{h.alumno}</span>
                    <InsigniaEstado estado={h.resultado} />
                    <span className="text-ink-3">
                      {h.responsable} · {fechaHora(h.fecha)} · {h.motivo}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <DialogoDecision
            asignacionId={actual.id}
            alumno={elegido}
            materia={actual.materia}
            abierto={elegido !== null}
            alCambiarApertura={(a) => {
              if (!a) setElegido(null)
            }}
          />
        </>
      ) : null}
    </Pagina>
  )
}
