import { Check, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { DialogoMotivo } from '@/componentes/DialogoMotivo'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { SiPuede } from '@/componentes/SiPuede'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import {
  resolverCierre,
  resolverDecision,
  type Autorizaciones as TipoAutorizaciones,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'

type Decision = TipoAutorizaciones['decisiones'][number]
type CierreEnAutorizacion = TipoAutorizaciones['cierres'][number]
type Accion =
  | { tipo: 'decision'; resolucion: 'autorizada' | 'rechazada'; fila: Decision }
  | { tipo: 'cierre'; resolucion: 'aprobar' | 'devolver'; fila: CierreEnAutorizacion }

export function Autorizaciones() {
  const a = useDatos<TipoAutorizaciones>('/autorizaciones')
  const [accion, setAccion] = useState<Accion | null>(null)
  const cerrar = () => setAccion(null)
  const decidir = useAccion(
    (v: { id: number; resolucion: 'autorizada' | 'rechazada'; motivo: string }) =>
      resolverDecision(v.id, v.resolucion, v.motivo),
    {
      exito: (_r, v) =>
        `Decisión sobre ${accion?.tipo === 'decision' ? accion.fila.alumno : 'el alumno'} ${v.resolucion === 'autorizada' ? 'autorizada' : 'rechazada'}`,
      alExito: cerrar,
    },
  )
  const cerrarCierre = useAccion(
    (v: { id: number; resolucion: 'aprobar' | 'devolver'; motivo: string }) =>
      resolverCierre(v.id, v.resolucion, v.motivo),
    {
      exito: (_r, v) =>
        `Cierre de ${accion?.tipo === 'cierre' ? `${accion.fila.grupo} (versión ${accion.fila.version})` : 'grupo'} ${v.resolucion === 'aprobar' ? 'aprobado' : 'devuelto a Coordinación'}`,
      alExito: cerrar,
    },
  )

  const decisiones: ColumnaTabla<Decision>[] = [
    { clave: 'alumno', encabezado: 'Alumno', render: (d) => `${d.alumno} (${d.identificador})` },
    { clave: 'materia', encabezado: 'Materia', render: (d) => `${d.materia} · ${d.grupo}` },
    { clave: 'motivo', encabezado: 'Motivo de Coordinación' },
    {
      clave: 'quien',
      encabezado: 'Solicitó',
      ocultarEnMovil: true,
      render: (d) => `${d.responsable} · ${fechaHora(d.fecha)}`,
    },
  ]
  const cierres: ColumnaTabla<CierreEnAutorizacion>[] = [
    { clave: 'grupo', encabezado: 'Grupo', render: (c) => `${c.grupo} · ${c.periodo}` },
    { clave: 'version', encabezado: 'Versión', numerica: true },
    {
      clave: 'excepcion',
      encabezado: 'Excepción',
      render: (c) => (c.excepcion ? (c.motivo_excepcion ?? 'Sí') : 'Ninguna'),
    },
    { clave: 'preparado_por', encabezado: 'Preparó', ocultarEnMovil: true },
  ]

  return (
    <Pagina
      titulo="Autorizaciones"
      descripcion="Decisiones de derecho a evaluación y cierres que Coordinación te mandó para resolver. Cada resolución lleva tu motivo."
    >
      {a.error ? <ErrorDatos error={a.error} reintentar={a.reintentar} /> : null}
      {a.cargando ? <Cargando /> : null}
      {a.datos ? (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-ink">Decisiones de derecho a evaluación</h2>
            <TablaDatos
              columnas={decisiones}
              filas={a.datos.decisiones}
              claveFila={(d) => d.id}
              descripcion="Decisiones que esperan autorización"
              accionesFila={(d) => (
                <SiPuede recurso="decision_evaluacion" accion="modificar">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setAccion({ tipo: 'decision', resolucion: 'autorizada', fila: d })
                    }
                  >
                    <Check strokeWidth={2.4} aria-hidden="true" />
                    Autorizar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAccion({ tipo: 'decision', resolucion: 'rechazada', fila: d })
                    }
                  >
                    <X strokeWidth={2.4} aria-hidden="true" />
                    Rechazar
                  </Button>
                </SiPuede>
              )}
              vacio={{
                variante: 'vacio',
                titulo: 'No hay decisiones esperando tu autorización',
                descripcion:
                  'Cuando Coordinación marque un caso como "requiere autorización", aparecerá aquí.',
              }}
            />
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-ink">Cierres en autorización</h2>
            <TablaDatos
              columnas={cierres}
              filas={a.datos.cierres}
              claveFila={(c) => c.id}
              descripcion="Cierres que esperan autorización"
              accionesFila={(c) => (
                <SiPuede recurso="cierre" accion="modificar">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAccion({ tipo: 'cierre', resolucion: 'aprobar', fila: c })}
                  >
                    <Check strokeWidth={2.4} aria-hidden="true" />
                    Aprobar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAccion({ tipo: 'cierre', resolucion: 'devolver', fila: c })}
                  >
                    <X strokeWidth={2.4} aria-hidden="true" />
                    Devolver
                  </Button>
                </SiPuede>
              )}
              vacio={{
                variante: 'vacio',
                titulo: 'No hay cierres esperando tu autorización',
                descripcion: 'Cuando Coordinación envíe un cierre a Dirección, aparecerá aquí.',
              }}
            />
          </section>
        </>
      ) : null}

      <DialogoMotivo
        abierto={accion !== null}
        alCambiarApertura={(x) => {
          if (!x) cerrar()
        }}
        titulo={
          accion?.tipo === 'decision'
            ? `${accion.resolucion === 'autorizada' ? 'Autorizar' : 'Rechazar'} la decisión sobre ${accion.fila.alumno}`
            : `${accion?.resolucion === 'aprobar' ? 'Aprobar' : 'Devolver'} el cierre de ${accion?.fila && 'grupo' in accion.fila ? accion.fila.grupo : ''}`
        }
        descripcion={
          accion?.tipo === 'decision'
            ? `${accion.fila.materia} · ${accion.fila.grupo}. Motivo de Coordinación: ${accion.fila.motivo}`
            : accion
              ? `Cierre versión ${(accion.fila as CierreEnAutorizacion).version} del periodo ${(accion.fila as CierreEnAutorizacion).periodo}.`
              : ''
        }
        etiqueta={accion?.resolucion === 'aprobar' ? 'Motivo (opcional)' : 'Motivo'}
        obligatorio={accion?.resolucion !== 'aprobar'}
        etiquetaAccion={
          accion?.resolucion === 'autorizada'
            ? 'Autorizar'
            : accion?.resolucion === 'rechazada'
              ? 'Rechazar'
              : accion?.resolucion === 'aprobar'
                ? 'Aprobar cierre'
                : 'Devolver cierre'
        }
        ocupado={decidir.ocupado || cerrarCierre.ocupado}
        alConfirmar={(motivo) => {
          if (accion?.tipo === 'decision')
            decidir.ejecutar({ id: accion.fila.id, resolucion: accion.resolucion, motivo })
          else if (accion?.tipo === 'cierre')
            cerrarCierre.ejecutar({ id: accion.fila.id, resolucion: accion.resolucion, motivo })
        }}
      />
    </Pagina>
  )
}
