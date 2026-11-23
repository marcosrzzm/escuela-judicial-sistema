import { describe, expect, it } from 'vitest'

import { areasVisibles, rutaInicial, rutaPermitida } from '@/lib/navegacion'

const soloVerDireccion = {
  base: 'direccion' as const,
  debe_cambiar_clave: false,
  permisos: ['decision_evaluacion:ver', 'bitacora_cambio:ver', 'cierre:ver'],
}

describe('navegación por base y permiso', () => {
  it('un rol personalizado con base Dirección ve solo lo que su permiso abre', () => {
    expect(areasVisibles(soloVerDireccion).map((a) => a.clave)).toEqual([
      'autorizaciones',
      'bitacora',
    ])
    expect(rutaPermitida('/bitacora', soloVerDireccion)).toBe(true)
    expect(rutaPermitida('/usuarios', soloVerDireccion)).toBe(false)
  })

  it('quitar un permiso quita la pantalla aunque la base la tenga', () => {
    const sinBitacora = { ...soloVerDireccion, permisos: ['decision_evaluacion:ver'] }
    expect(areasVisibles(sinBitacora).map((a) => a.clave)).toEqual(['autorizaciones'])
  })

  it('con la contraseña temporal pendiente solo existe Mi contraseña', () => {
    const temporal = { ...soloVerDireccion, debe_cambiar_clave: true }
    expect(areasVisibles(temporal)).toEqual([])
    expect(rutaInicial(temporal)).toBe('/mi-clave')
    expect(rutaPermitida('/mi-clave', temporal)).toBe(true)
    expect(rutaPermitida('/', temporal)).toBe(false)
  })

  it('Usuarios y roles pide un permiso que un rol personalizado no puede tener', () => {
    const coordinacion = {
      base: 'coordinacion' as const,
      debe_cambiar_clave: false,
      permisos: ['usuario:crear'],
    }
    expect(areasVisibles(coordinacion).map((a) => a.clave)).toEqual(['usuarios'])
  })
})
