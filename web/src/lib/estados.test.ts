import { describe, expect, it } from 'vitest'

import { definicionEstado, etiquetaEstado } from '@/lib/estados'

describe('estados', () => {
  it('etiqueta cada estado del flujo en español', () => {
    expect(etiquetaEstado('en_autorizacion')).toBe('En autorización')
    expect(etiquetaEstado('con_discrepancias')).toBe('Con discrepancias')
    expect(etiquetaEstado('reabierta')).toBe('Reabierta')
  })

  it('un estado desconocido no rompe la pantalla: muestra su clave en neutro', () => {
    expect(definicionEstado('algo_nuevo').etiqueta).toBe('algo_nuevo')
  })

  it('el mismo significado lleva el mismo color en entregas y cierres', () => {
    expect(definicionEstado('aceptada').clases).toBe(definicionEstado('aprobado').clases)
  })
})
