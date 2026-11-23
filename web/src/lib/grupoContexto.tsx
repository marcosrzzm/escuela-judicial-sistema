/** El grupo abierto en su página (/grupos/:id/...): las pestañas reutilizan las pantallas de siempre sin selector. */
import { createContext, useContext } from 'react'

import type { Grupo } from '@/lib/api'

export const ContextoGrupo = createContext<Grupo | null>(null)

export const useGrupoContexto = () => useContext(ContextoGrupo)
