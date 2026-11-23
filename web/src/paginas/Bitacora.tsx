import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ErrorDatos } from '@/componentes/EstadoCarga'
import { FilterBar } from '@/componentes/FilterBar'
import { Pagina } from '@/componentes/Pagina'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import type { EventoBitacora, PaginaBitacora } from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { cambios, etiquetaAccion, etiquetaEntidad } from '@/lib/bitacora'
import { fechaHora } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'

export function Bitacora() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const entidad = params.get('entidad') ?? 'todos'
  const pagina = Number(params.get('pagina')) || 1
  // Solo Coordinación ve motivos y valores; los demás roles ven quién hizo qué y cuándo.
  const completa = useSesion().sesion?.base === 'coordinacion'
  const [evento, setEvento] = useState<EventoBitacora | null>(null)
  const ruta = `/bitacora?pagina=${pagina}&entidad=${encodeURIComponent(entidad)}&q=${encodeURIComponent(q)}`
  const b = useDatos<PaginaBitacora>(ruta)

  function poner(cambios: Record<string, string | null>) {
    const n = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === '' || v === 'todos') n.delete(k)
      else n.set(k, v)
    }
    if (!('pagina' in cambios)) n.delete('pagina')
    setParams(n, { replace: true })
  }

  const columnas: ColumnaTabla<EventoBitacora>[] = [
    { clave: 'fecha', encabezado: 'Fecha', render: (e) => fechaHora(e.fecha) },
    { clave: 'usuario', encabezado: 'Usuario', render: (e) => e.usuario ?? 'Sistema' },
    {
      clave: 'accion',
      encabezado: 'Acción',
      render: (e) => `${etiquetaAccion(e.accion)} · ${etiquetaEntidad(e.entidad)}`,
    },
    ...(completa ? [{ clave: 'motivo', encabezado: 'Motivo', ocultarEnMovil: true }] : []),
  ]

  return (
    <Pagina
      titulo="Bitácora"
      descripcion={
        completa
          ? 'Quién hizo qué, cuándo y por qué, con los valores antes y después. Solo se agrega: nadie la edita ni la borra.'
          : 'Quién hizo qué y cuándo. Los motivos y los valores los ve Coordinación. Solo se agrega: nadie la edita ni la borra.'
      }
    >
      <FilterBar
        busqueda={q}
        onBusqueda={(v) => poner({ q: v })}
        placeholder={completa ? 'Buscar por usuario o motivo' : 'Buscar por usuario'}
        filtros={[
          {
            id: 'entidad',
            etiqueta: 'Entidad',
            valor: entidad,
            onCambio: (v) => poner({ entidad: v }),
            opciones: (b.datos?.entidades ?? []).map((e) => ({
              valor: e,
              etiqueta: e.replace(/_/g, ' '),
            })),
          },
        ]}
        onLimpiarTodo={() => setParams(new URLSearchParams(), { replace: true })}
      />
      {b.error ? <ErrorDatos error={b.error} reintentar={b.reintentar} /> : null}
      <TablaDatos
        columnas={columnas}
        filas={b.datos?.filas ?? []}
        claveFila={(e) => e.id}
        descripcion="Registro de cambios del sistema"
        cargando={b.cargando}
        pagina={b.datos?.pagina}
        paginas={b.datos?.paginas}
        total={b.datos?.total}
        onPagina={(p) => poner({ pagina: String(p) })}
        onFilaClic={setEvento}
        vacio={
          q || entidad !== 'todos'
            ? {
                variante: 'sinResultados',
                titulo: 'Ningún movimiento coincide con estos filtros',
                descripcion: 'Quita la búsqueda o la entidad para ver todo.',
              }
            : {
                variante: 'vacio',
                titulo: 'La bitácora todavía está vacía',
                descripcion: 'Cada cambio sensible quedará aquí con su responsable.',
              }
        }
      />
      <Sheet
        open={evento !== null}
        onOpenChange={(a) => {
          if (!a) setEvento(null)
        }}
      >
        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
          {evento ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {etiquetaAccion(evento.accion)} · {etiquetaEntidad(evento.entidad)}
                </SheetTitle>
                <SheetDescription>
                  {evento.usuario ?? 'Sistema'} · {fechaHora(evento.fecha)}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
                {evento.motivo ? (
                  <p>
                    <span className="font-semibold">Motivo:</span> {evento.motivo}
                  </p>
                ) : null}
                <div>
                  <h3 className="mb-1 text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                    Cambios
                  </h3>
                  {!completa ? (
                    <p className="text-ink-3">
                      Los valores de este movimiento los ve Coordinación.
                    </p>
                  ) : cambios(evento.antes, evento.despues).length === 0 ? (
                    <p className="text-ink-3">Este movimiento no guardó valores.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {cambios(evento.antes, evento.despues).map((c) => (
                        <li key={c.campo} className="rounded-lg bg-paper-2 px-3 py-2">
                          <span className="font-medium text-ink capitalize">{c.campo}:</span>{' '}
                          {c.antes !== null ? (
                            <span className="text-ink-3">{c.antes} → </span>
                          ) : null}
                          <span className="text-ink">{c.despues ?? 'se quitó'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </Pagina>
  )
}
