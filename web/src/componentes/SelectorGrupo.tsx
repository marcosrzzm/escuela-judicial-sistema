/** Elige periodo y grupo; la elección vive en la URL para poder compartir o recargar la pantalla. */
import { useSearchParams } from 'react-router-dom'

import { CampoSelect } from '@/componentes/CampoFormulario'
import type { Grupo, Periodo } from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { useGrupoContexto } from '@/lib/grupoContexto'

export function useSeleccionGrupo() {
  const enGrupo = useGrupoContexto()
  const [params, setParams] = useSearchParams()
  const periodos = useDatos<{ filas: Periodo[] }>(enGrupo ? null : '/periodos')
  const lista = periodos.datos?.filas ?? []
  const periodoId =
    Number(params.get('periodo')) ||
    (lista.find((p) => p.estado === 'abierto') ?? lista[0])?.id ||
    null
  const grupos = useDatos<{ filas: Grupo[] }>(
    periodoId && !enGrupo ? `/grupos?periodo_id=${periodoId}` : null,
  )
  const filasGrupos = enGrupo ? [enGrupo] : (grupos.datos?.filas ?? [])
  const pedido = Number(params.get('grupo'))
  const grupo = enGrupo ?? filasGrupos.find((g) => g.id === pedido) ?? filasGrupos[0] ?? null

  function cambiar(cambios: Record<string, string | null>) {
    const nuevo = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null) nuevo.delete(k)
      else nuevo.set(k, v)
    }
    setParams(nuevo, { replace: true })
  }

  return {
    periodos: lista,
    grupos: filasGrupos,
    periodoId: enGrupo?.periodo_id ?? periodoId,
    grupo,
    enGrupo: enGrupo !== null,
    cargando: periodos.cargando || grupos.cargando,
    error: periodos.error ?? grupos.error,
    reintentar: () => {
      periodos.reintentar()
      grupos.reintentar()
    },
    elegirPeriodo: (id: string) => cambiar({ periodo: id, grupo: null }),
    elegirGrupo: (id: string) => cambiar({ grupo: id }),
  }
}

export function SelectorGrupo({ seleccion }: { seleccion: ReturnType<typeof useSeleccionGrupo> }) {
  // Dentro de la página del grupo el grupo ya está elegido arriba.
  if (seleccion.enGrupo) return null
  return (
    <div className="grid grid-cols-1 gap-3 sm:max-w-3xl sm:grid-cols-2 [&>*]:min-w-0 [&_[data-slot=select-trigger]]:min-w-0 [&_[data-slot=select-value]]:truncate">
      <CampoSelect
        etiqueta="Periodo"
        valor={seleccion.periodoId ? String(seleccion.periodoId) : ''}
        alCambiar={seleccion.elegirPeriodo}
        opciones={seleccion.periodos.map((p) => ({
          valor: String(p.id),
          etiqueta: `${p.nombre} (${p.estado})`,
        }))}
      />
      <CampoSelect
        etiqueta="Grupo"
        valor={seleccion.grupo ? String(seleccion.grupo.id) : ''}
        alCambiar={seleccion.elegirGrupo}
        opciones={seleccion.grupos.map((g) => ({
          valor: String(g.id),
          etiqueta: `${g.clave} · ${g.turno}`,
        }))}
        placeholder="Sin grupos en este periodo"
      />
    </div>
  )
}
