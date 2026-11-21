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
import { fechaHora } from '@/lib/formulario'

export function Bitacora() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const entidad = params.get('entidad') ?? 'todos'
  const pagina = Number(params.get('pagina')) || 1
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
      render: (e) => `${e.accion.replace(/_/g, ' ')} · ${e.entidad.replace(/_/g, ' ')}`,
    },
    { clave: 'motivo', encabezado: 'Motivo', ocultarEnMovil: true },
  ]

  return (
    <Pagina
      titulo="Bitácora"
      descripcion="Quién hizo qué, cuándo y por qué, con los valores antes y después. Solo se agrega: nadie la edita ni la borra."
    >
      <FilterBar
        busqueda={q}
        onBusqueda={(v) => poner({ q: v })}
        placeholder="Buscar por usuario o motivo"
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
                  {evento.accion.replace(/_/g, ' ')} · {evento.entidad.replace(/_/g, ' ')}
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
                    Antes
                  </h3>
                  <pre className="overflow-x-auto rounded-lg bg-paper-2 p-3 text-xs">
                    {evento.antes
                      ? JSON.stringify(evento.antes, null, 2)
                      : 'Sin valores anteriores'}
                  </pre>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                    Después
                  </h3>
                  <pre className="overflow-x-auto rounded-lg bg-paper-2 p-3 text-xs">
                    {evento.despues
                      ? JSON.stringify(evento.despues, null, 2)
                      : 'Sin valores posteriores'}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </Pagina>
  )
}
