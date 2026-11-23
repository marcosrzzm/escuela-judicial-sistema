/**
 * Lectura y escritura de datos con TanStack Query. `useDatos` lee una ruta de la API y
 * `useAccion` ejecuta una escritura: avisa del éxito nombrando el objeto, deja el error visible
 * hasta que se cierre, y refresca todo lo leído para que ninguna pantalla muestre datos viejos.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { leer, type Resultado } from '@/lib/api'
import { avisar } from '@/lib/avisos'

export class ErrorApi extends Error {
  codigo: number
  constructor(codigo: number, mensaje: string) {
    super(mensaje)
    this.codigo = codigo
  }
}

export function useDatos<T>(ruta: string | null, opciones: { cadaMs?: number } = {}) {
  const q = useQuery({
    queryKey: ['api', ruta],
    enabled: ruta !== null,
    refetchInterval: opciones.cadaMs,
    queryFn: async () => {
      const r = await leer<T>(ruta as string)
      if (!r.ok) throw new ErrorApi(r.codigo, r.error)
      return r.datos
    },
  })
  return {
    datos: q.data ?? null,
    cargando: ruta !== null && q.isPending,
    error: q.error as ErrorApi | null,
    reintentar: () => void q.refetch(),
  }
}

export function useAccion<V, R>(
  llamar: (valores: V) => Promise<Resultado<R>>,
  opciones: {
    exito: (r: R, valores: V) => string
    alExito?: (r: R, valores: V) => void
    /** Falso cuando la acción cambia de sesión: lo leído queda viejo y se limpia aparte. */
    refrescar?: boolean
  },
) {
  const cliente = useQueryClient()
  const m = useMutation({
    mutationFn: async (valores: V) => {
      const r = await llamar(valores)
      if (!r.ok) throw new ErrorApi(r.codigo, r.error)
      return r.datos
    },
    onSuccess: (r, valores) => {
      avisar.exito(opciones.exito(r, valores))
      if (opciones.refrescar !== false) void cliente.invalidateQueries({ queryKey: ['api'] })
      opciones.alExito?.(r, valores)
    },
    onError: (e) => avisar.error(e.message),
  })
  return { ejecutar: m.mutate, ocupado: m.isPending }
}
