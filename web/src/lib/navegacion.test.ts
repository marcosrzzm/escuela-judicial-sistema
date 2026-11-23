import { describe, expect, it } from 'vitest'

import { areasVisibles, itemsRail, rutaInicial, rutaPermitida } from '@/lib/navegacion'

const soloVerDireccion = {
  base: 'direccion' as const,
  debe_cambiar_clave: false,
  permisos: ['decision_evaluacion:ver', 'bitacora_cambio:ver', 'cierre:ver'],
}

describe('navegación por base y permiso', () => {
  it('un rol personalizado con base Dirección ve solo lo que su permiso abre', () => {
    expect(areasVisibles(soloVerDireccion).map((a) => a.clave)).toEqual([
      'cierre',
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

  it('la barra global cambia por rol y todos entran al Tablero', () => {
    const coordinacion = {
      base: 'coordinacion' as const,
      debe_cambiar_clave: false,
      permisos: [
        'periodo:ver',
        'grupo:ver',
        'pendiente_academico:ver',
        'bitacora_cambio:ver',
        'usuario:crear',
      ],
    }
    const claves = itemsRail(coordinacion).map((i) => i.clave)
    expect(claves).toEqual([
      'tablero',
      'grupos',
      'calendario',
      'avisos',
      'historial',
      'administracion',
    ])
    expect(
      itemsRail(coordinacion)
        .at(-1)
        ?.hijos?.map((h) => h.ruta),
    ).toEqual(['/usuarios', '/bitacora'])
    expect(rutaInicial(coordinacion)).toBe('/')

    const alumno = {
      base: 'alumno' as const,
      debe_cambiar_clave: false,
      permisos: ['periodo:ver', 'pendiente_academico:ver'],
    }
    expect(itemsRail(alumno).map((i) => i.etiqueta)).toEqual([
      'Tablero',
      'Calendario',
      'Avisos',
      'Boleta',
    ])
    expect(rutaPermitida('/bitacora', alumno)).toBe(false)
    expect(rutaPermitida('/historial', alumno)).toBe(true)
  })
})
