/**
 * Medidor de tiempo activo de Coordinación (CA-12). Cuenta un segundo por cada tic solo si la
 * pestaña está visible y hubo actividad en los últimos 2 minutos; pasado ese silencio, deja de
 * contar hasta que vuelva a haber actividad. Es una función pura de reloj: se prueba sin navegador.
 */
export const LIMITE_INACTIVIDAD_MS = 120_000

export interface Medidor {
  /** Se llama con cada movimiento, tecla, clic o desplazamiento. */
  actividad: (ahora: number) => void
  /** Se llama una vez por segundo; suma 1 s si corresponde. */
  tic: (ahora: number, visible: boolean) => void
  /** Devuelve los segundos acumulados desde la última toma y los pone en cero. */
  tomar: () => number
}

export function crearMedidor(inicio: number): Medidor {
  let ultimaActividad = inicio
  let segundos = 0
  return {
    actividad: (ahora) => {
      ultimaActividad = ahora
    },
    tic: (ahora, visible) => {
      if (visible && ahora - ultimaActividad <= LIMITE_INACTIVIDAD_MS) segundos += 1
    },
    tomar: () => {
      const s = segundos
      segundos = 0
      return s
    },
  }
}
