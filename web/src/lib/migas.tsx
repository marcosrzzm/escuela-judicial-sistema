/**
 * Migas que pone la propia página (dentro de un grupo: periodo › grupo › sección). Sin ellas, la barra
 * superior deduce las migas de la ruta (navegacion.ts).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { Miga } from '@/lib/navegacion'

interface EstadoMigas {
  propias: Miga[] | null
  poner: (m: Miga[] | null) => void
}

const ContextoMigas = createContext<EstadoMigas>({ propias: null, poner: () => undefined })

export function ProveedorMigas({ children }: { children: ReactNode }) {
  const [propias, poner] = useState<Miga[] | null>(null)
  const valor = useMemo(() => ({ propias, poner }), [propias])
  return <ContextoMigas.Provider value={valor}>{children}</ContextoMigas.Provider>
}

export function useMigasPropias(): Miga[] | null {
  return useContext(ContextoMigas).propias
}

/** La página declara sus migas mientras está abierta; al salir se limpian. */
export function useDeclararMigas(migas: Miga[] | null) {
  const { poner } = useContext(ContextoMigas)
  const clave = migas === null ? '' : JSON.stringify(migas)
  useEffect(() => {
    poner(clave === '' ? null : (JSON.parse(clave) as Miga[]))
    return () => poner(null)
  }, [clave, poner])
}
