import { CirclePlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

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
import { ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import { esquemaLineaBase, type LineaBaseFormulario } from '@/esquemas/metrica'
import {
  registrarLineaBase,
  type CasoBase,
  type CasoSistema,
  type Grupo,
  type Metricas as TipoMetricas,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora, minutos, resolverZod } from '@/lib/formulario'

const TIPO = { lista: 'Lista', cierre: 'Cierre' } as const

function DialogoLineaBase({
  grupos,
  abierto,
  alCambiarApertura,
}: {
  grupos: Grupo[]
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
  } = useForm<LineaBaseFormulario>({
    resolver: resolverZod(esquemaLineaBase),
    defaultValues: { tipo: 'cierre', grupo_id: '', campos_recapturados: '', minutos: '', nota: '' },
  })
  const guardar = useAccion(
    (v: LineaBaseFormulario) =>
      registrarLineaBase({
        tipo: v.tipo,
        grupo_id: v.grupo_id ? Number(v.grupo_id) : null,
        campos_recapturados: Number(v.campos_recapturados),
        minutos: Number(v.minutos),
        nota: v.nota,
      }),
    {
      exito: (_r, v) => `Caso de línea base (${TIPO[v.tipo]}) registrado`,
      alExito: () => {
        reset()
        alCambiarApertura(false)
      },
    },
  )
  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar caso de línea base</DialogTitle>
          <DialogDescription>
            Un caso medido fuera del sistema, con el proceso actual de la Escuela. Sirve para
            comparar con los casos del sistema.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-linea-base"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => guardar.ejecutar(v))}
          noValidate
        >
          <CampoSelect
            etiqueta="Tipo de caso"
            obligatorio
            valor={watch('tipo')}
            alCambiar={(v) =>
              setValue('tipo', v as LineaBaseFormulario['tipo'], { shouldValidate: true })
            }
            opciones={[
              { valor: 'lista', etiqueta: 'Preparar una lista' },
              { valor: 'cierre', etiqueta: 'Cerrar un grupo' },
            ]}
            error={errors.tipo?.message}
          />
          <CampoSelect
            etiqueta="Grupo (opcional)"
            valor={watch('grupo_id')}
            alCambiar={(v) => setValue('grupo_id', v === 'ninguno' ? '' : v)}
            opciones={[
              { valor: 'ninguno', etiqueta: 'Sin grupo del sistema' },
              ...grupos.map((g) => ({
                valor: String(g.id),
                etiqueta: `${g.clave} · ${g.periodo}`,
              })),
            ]}
          />
          <CampoTexto
            etiqueta="Campos recapturados"
            obligatorio
            registro={register('campos_recapturados')}
            error={errors.campos_recapturados?.message}
          />
          <CampoTexto
            etiqueta="Minutos activos"
            obligatorio
            registro={register('minutos')}
            error={errors.minutos?.message}
          />
          <CampoAreaTexto
            etiqueta="Nota (opcional)"
            registro={register('nota')}
            error={errors.nota?.message}
          />
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-linea-base"
            onCancelar={() => alCambiarApertura(false)}
            textoConfirmar="Registrar caso"
            trabajando={guardar.ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Comparacion({
  tipo,
  r,
}: {
  tipo: 'lista' | 'cierre'
  r: TipoMetricas['resumen']['lista']
}) {
  const celda = (x: TipoMetricas['resumen']['lista']['sistema']) =>
    x.casos === 0
      ? 'Sin casos todavía'
      : `${x.campos_promedio} campos · ${x.minutos_promedio} min por caso (${x.casos} caso${x.casos === 1 ? '' : 's'})`
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4">
      <h3 className="text-base font-semibold text-ink">
        {tipo === 'lista' ? 'Preparar una lista' : 'Cerrar un grupo'}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-3">Sistema</dt>
        <dd className="num">{celda(r.sistema)}</dd>
        <dt className="text-ink-3">Línea base</dt>
        <dd className="num">{celda(r.linea_base)}</dd>
      </dl>
    </div>
  )
}

export function Metricas() {
  const m = useDatos<TipoMetricas>('/metricas')
  const grupos = useDatos<{ filas: Grupo[] }>('/grupos')
  const [abierto, setAbierto] = useState(false)
  const sistema: ColumnaTabla<CasoSistema>[] = [
    { clave: 'grupo', encabezado: 'Grupo', render: (c) => `${c.grupo} · ${c.periodo}` },
    { clave: 'tipo', encabezado: 'Caso', render: (c) => TIPO[c.tipo] },
    { clave: 'campos_recapturados', encabezado: 'Campos recapturados', numerica: true },
    {
      clave: 'segundos_activos',
      encabezado: 'Minutos activos',
      numerica: true,
      render: (c) => minutos(c.segundos_activos),
    },
  ]
  const base: ColumnaTabla<CasoBase>[] = [
    {
      clave: 'grupo',
      encabezado: 'Grupo',
      render: (c) => (c.grupo ? `${c.grupo} · ${c.periodo}` : 'Sin grupo del sistema'),
    },
    { clave: 'tipo', encabezado: 'Caso', render: (c) => TIPO[c.tipo] },
    { clave: 'campos_recapturados', encabezado: 'Campos recapturados', numerica: true },
    {
      clave: 'segundos_activos',
      encabezado: 'Minutos activos',
      numerica: true,
      render: (c) => minutos(c.segundos_activos),
    },
    { clave: 'nota', encabezado: 'Nota', ocultarEnMovil: true },
    {
      clave: 'registro',
      encabezado: 'Registró',
      ocultarEnMovil: true,
      render: (c) => `${c.registrado_por} · ${fechaHora(c.fecha)}`,
    },
  ]
  return (
    <Pagina
      titulo="Métricas"
      descripcion="Dos indicadores del piloto: campos recapturados por caso y minutos activos de Coordinación por lista o cierre. El tiempo se mide en el navegador mientras trabajas en Grupos y listas o en Cierre y lote, sin contar pausas de más de 2 minutos."
      accionPrincipal={
        <Button type="button" onClick={() => setAbierto(true)}>
          <CirclePlus strokeWidth={2.4} aria-hidden="true" />
          Registrar línea base
        </Button>
      }
    >
      {m.error ? <ErrorDatos error={m.error} reintentar={m.reintentar} /> : null}
      {m.datos ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Comparacion tipo="lista" r={m.datos.resumen.lista} />
          <Comparacion tipo="cierre" r={m.datos.resumen.cierre} />
        </div>
      ) : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Casos del sistema</h2>
        <TablaDatos
          columnas={sistema}
          filas={m.datos?.sistema ?? []}
          claveFila={(c) => `${c.grupo_id}-${c.tipo}`}
          descripcion="Casos medidos por el sistema, por grupo"
          cargando={m.cargando}
          vacio={{
            variante: 'vacio',
            titulo: 'No hay grupos en el periodo abierto',
            descripcion: 'Los casos del sistema aparecen por cada grupo del periodo abierto.',
          }}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Casos de línea base</h2>
        <TablaDatos
          columnas={base}
          filas={m.datos?.linea_base ?? []}
          claveFila={(c) => c.id}
          descripcion="Casos medidos fuera del sistema, capturados a mano"
          cargando={m.cargando}
          vacio={{
            variante: 'vacio',
            titulo: 'Todavía no hay casos de línea base',
            descripcion:
              'Registra casos medidos con el proceso actual para poder comparar con el sistema.',
            accion: (
              <Button type="button" onClick={() => setAbierto(true)}>
                Registrar el primer caso
              </Button>
            ),
          }}
        />
      </section>
      <DialogoLineaBase
        grupos={grupos.datos?.filas ?? []}
        abierto={abierto}
        alCambiarApertura={setAbierto}
      />
    </Pagina>
  )
}
