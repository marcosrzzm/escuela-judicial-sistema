import type { ReactNode } from 'react'

import { useSesion } from '@/lib/sesion'

/**
 * Oculta o deshabilita según permiso. En modo "deshabilitar" el `title`
 * explica el motivo: un control apagado sin explicación es un tropiezo, no
 * un límite claro.
 */
export function SiPuede({
  recurso,
  accion,
  children,
  modo = 'ocultar',
  razon = 'No tienes permiso para esta acción',
}: {
  recurso: string
  accion: string
  children: ReactNode
  modo?: 'ocultar' | 'deshabilitar'
  razon?: string
}) {
  const { puede } = useSesion()
  if (puede(recurso, accion)) return <>{children}</>
  if (modo === 'ocultar') return null
  return (
    <span
      title={razon}
      className="inline-flex cursor-not-allowed opacity-50 [&_button]:pointer-events-none [&_a]:pointer-events-none"
    >
      {children}
    </span>
  )
}
