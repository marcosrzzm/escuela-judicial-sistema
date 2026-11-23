import { Download, Inbox, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { InsigniaEstado } from '@/componentes/Estados'
import { ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { SiPuede } from '@/componentes/SiPuede'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import { registrarCarga, registrarRecepcion, type Lote } from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora, resolverZod } from '@/lib/formulario'

const esquema = z.object({
  con_discrepancias: z.boolean(),
  discrepancias: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
})
type Valores = z.infer<typeof esquema>

function DialogoCarga({ lote, alCerrar }: { lote: Lote; alCerrar: () => void }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<Valores>({
    resolver: resolverZod(esquema),
    defaultValues: { con_discrepancias: false, discrepancias: '' },
  })
  const con = watch('con_discrepancias')
  const guardar = useAccion(
    (v: Valores) => registrarCarga(lote.id, v.con_discrepancias, v.discrepancias),
    {
      exito: (_r, v) =>
        `Carga del lote de ${lote.grupo} (${lote.periodo}) registrada${v.con_discrepancias ? ' con discrepancias' : ''}`,
      alExito: alCerrar,
    },
  )
  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) alCerrar()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar la carga del lote de {lote.grupo}</DialogTitle>
          <DialogDescription>
            Periodo {lote.periodo}, cierre versión {lote.version}. La carga en la plataforma oficial
            la haces fuera del sistema; aquí solo queda el resultado.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-carga"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => {
            if (v.con_discrepancias && v.discrepancias === '')
              return setError('discrepancias', { message: 'Describe la discrepancia.' })
            guardar.ejecutar(v)
          })}
          noValidate
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="con-disc"
              checked={con}
              onCheckedChange={(c) => setValue('con_discrepancias', c === true)}
            />
            <Label htmlFor="con-disc">Hay discrepancias entre el lote y la plataforma</Label>
          </div>
          {con ? (
            <CampoAreaTexto
              etiqueta="Discrepancias"
              obligatorio
              registro={register('discrepancias')}
              error={errors.discrepancias?.message}
              placeholder="Qué no coincide, de qué alumno y de qué materia"
            />
          ) : null}
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-carga"
            onCancelar={alCerrar}
            textoConfirmar={con ? 'Registrar con discrepancias' : 'Registrar carga'}
            trabajando={guardar.ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Lotes() {
  const l = useDatos<{ filas: Lote[] }>('/lotes')
  const [carga, setCarga] = useState<Lote | null>(null)
  const recibir = useAccion((lote: Lote) => registrarRecepcion(lote.id), {
    exito: (_r, lote) =>
      `Recepción del lote de ${lote.grupo} (${lote.periodo}, versión ${lote.version}) registrada`,
  })
  const columnas: ColumnaTabla<Lote>[] = [
    { clave: 'periodo', encabezado: 'Periodo' },
    { clave: 'grupo', encabezado: 'Grupo' },
    { clave: 'version', encabezado: 'Versión de cierre', numerica: true },
    { clave: 'generado_por', encabezado: 'Responsable', ocultarEnMovil: true },
    {
      clave: 'fecha_generacion',
      encabezado: 'Fecha del lote',
      ocultarEnMovil: true,
      render: (x) => fechaHora(x.fecha_generacion),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (x) => (
        <div className="flex flex-col gap-1">
          <InsigniaEstado estado={x.estado} />
          {x.discrepancias ? <span className="text-xs text-error">{x.discrepancias}</span> : null}
        </div>
      ),
    },
  ]
  return (
    <Pagina
      titulo="Lotes recibidos"
      descripcion="Lotes de cierres aprobados. Registra cuándo los recibes y cómo salió la carga en la plataforma oficial, que haces fuera de este sistema."
    >
      {l.error ? <ErrorDatos error={l.error} reintentar={l.reintentar} /> : null}
      <TablaDatos
        columnas={columnas}
        filas={l.datos?.filas ?? []}
        claveFila={(x) => x.id}
        descripcion="Lotes de cierres aprobados"
        cargando={l.cargando}
        accionesFila={(x) => (
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/lotes/${x.id}/csv`} download>
                <Download strokeWidth={2.4} aria-hidden="true" />
                CSV
              </a>
            </Button>
            {x.estado === 'generado' ? (
              <SiPuede recurso="registro_carga_externa" accion="crear">
                <Button
                  type="button"
                  size="sm"
                  disabled={recibir.ocupado}
                  onClick={() => recibir.ejecutar(x)}
                >
                  <Inbox strokeWidth={2.4} aria-hidden="true" />
                  Registrar recepción
                </Button>
              </SiPuede>
            ) : null}
            {x.estado === 'recibido' ? (
              <SiPuede recurso="registro_carga_externa" accion="modificar">
                <Button type="button" size="sm" onClick={() => setCarga(x)}>
                  <PackageCheck strokeWidth={2.4} aria-hidden="true" />
                  Registrar carga
                </Button>
              </SiPuede>
            ) : null}
          </>
        )}
        vacio={{
          variante: 'vacio',
          titulo: 'Todavía no hay lotes',
          descripcion: 'Cuando Coordinación apruebe un cierre y genere su lote, aparecerá aquí.',
        }}
      />
      {carga ? <DialogoCarga lote={carga} alCerrar={() => setCarga(null)} /> : null}
    </Pagina>
  )
}
