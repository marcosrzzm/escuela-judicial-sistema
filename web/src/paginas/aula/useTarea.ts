import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { avisar } from '@/lib/avisos'

type Salida = { ok: true } | { ok: false; error: string }

/**
 * Ejecuta una escritura del aula: avisa del éxito nombrando el objeto, deja el error visible y refresca todo lo
 * leído. Sirve para flujos de varios pasos (subir un archivo y luego guardar), que `useAccion` no cubre.
 */
export function useTarea() {
  const cliente = useQueryClient()
  const [ocupado, setOcupado] = useState(false)
  async function correr(paso: () => Promise<Salida>, exito: string): Promise<boolean> {
    setOcupado(true)
    try {
      const r = await paso()
      if (!r.ok) {
        avisar.error(r.error)
        return false
      }
      avisar.exito(exito)
      await cliente.invalidateQueries({ queryKey: ['api'] })
      return true
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, correr }
}
