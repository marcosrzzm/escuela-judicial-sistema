import { useEffect } from 'react'

import { enviarTiempo } from '@/lib/api'
import { crearMedidor } from '@/lib/tiempoActivo'

const EVENTOS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

/**
 * Mide en el navegador el tiempo activo de Coordinación en un grupo (CA-12) y lo manda cada 30 s.
 * Cuenta solo con la pestaña visible y actividad en los últimos 2 minutos. Al salir de la pantalla
 * manda lo que quede acumulado.
 */
export function useTiempoActivo(tipo: 'lista' | 'cierre', grupoId: number | null) {
  useEffect(() => {
    if (grupoId === null) return
    const medidor = crearMedidor(Date.now())
    const marcar = () => medidor.actividad(Date.now())
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true }))
    const tic = setInterval(
      () => medidor.tic(Date.now(), document.visibilityState === 'visible'),
      1000,
    )
    const enviar = () => {
      let pendiente = medidor.tomar()
      while (pendiente > 0) {
        void enviarTiempo(tipo, grupoId, Math.min(pendiente, 30))
        pendiente -= 30
      }
    }
    const latido = setInterval(enviar, 30_000)
    return () => {
      clearInterval(tic)
      clearInterval(latido)
      EVENTOS.forEach((e) => window.removeEventListener(e, marcar))
      enviar()
    }
  }, [tipo, grupoId])
}
