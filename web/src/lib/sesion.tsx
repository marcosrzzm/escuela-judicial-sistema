/**
 * Contexto de sesión. Las pantallas nunca hablan con la API de sesión directo, solo con
 * `useSesion()`. `puede()` es el mismo criterio que revalida el servidor; aquí solo evita
 * ofrecer un botón que va a rebotar con 403.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { cerrarSesion, iniciarSesion, sesionActual, type Resultado, type Sesion } from '@/lib/api'

interface EstadoSesion {
  sesion: Sesion | null
  cargando: boolean
  entrar: (correo: string, clave: string) => Promise<Resultado<Sesion>>
  salir: () => Promise<void>
  puede: (recurso: string, accion: string) => boolean
}

const ContextoSesion = createContext<EstadoSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    void sesionActual().then((r) => {
      if (!activo) return
      setSesion(r.ok ? r.datos : null)
      setCargando(false)
    })
    const alExpirar = () => setSesion(null)
    window.addEventListener('sesion-expirada', alExpirar)
    return () => {
      activo = false
      window.removeEventListener('sesion-expirada', alExpirar)
    }
  }, [])

  const valor = useMemo<EstadoSesion>(
    () => ({
      sesion,
      cargando,
      entrar: async (correo, clave) => {
        const r = await iniciarSesion(correo, clave)
        if (r.ok) setSesion(r.datos)
        return r
      },
      salir: async () => {
        await cerrarSesion()
        setSesion(null)
      },
      puede: (recurso, accion) => sesion?.permisos.includes(`${recurso}:${accion}`) ?? false,
    }),
    [sesion, cargando],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

export function useSesion(): EstadoSesion {
  const contexto = useContext(ContextoSesion)
  if (!contexto) throw new Error('useSesion debe usarse dentro de ProveedorSesion.')
  return contexto
}
