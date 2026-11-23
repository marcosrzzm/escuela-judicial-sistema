/** Tema claro u oscuro y densidad: se recuerdan en el navegador y el tema también en la cuenta. */
import { createContext, useContext } from 'react'

export interface Preferencias {
  oscuro: boolean
  alternarTema: () => void
  densidad: 'comoda' | 'compacta'
  alternarDensidad: () => void
}

export const ContextoPreferencias = createContext<Preferencias | null>(null)

export function usePreferencias(): Preferencias {
  const c = useContext(ContextoPreferencias)
  if (!c) throw new Error('usePreferencias debe usarse dentro del Shell.')
  return c
}
