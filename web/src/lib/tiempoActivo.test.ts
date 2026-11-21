import { describe, expect, it } from 'vitest'

import { crearMedidor, LIMITE_INACTIVIDAD_MS } from '@/lib/tiempoActivo'

describe('medidor de tiempo activo', () => {
  it('cuenta un segundo por tic mientras hay actividad reciente', () => {
    const m = crearMedidor(0)
    for (let t = 1000; t <= 30_000; t += 1000) m.tic(t, true)
    expect(m.tomar()).toBe(30)
    expect(m.tomar()).toBe(0)
  })

  it('no cuenta la inactividad de más de 2 minutos', () => {
    const m = crearMedidor(0)
    for (let t = 1000; t <= LIMITE_INACTIVIDAD_MS + 60_000; t += 1000) m.tic(t, true)
    // Solo los primeros 120 s cuentan; los 60 s siguientes sin actividad, no.
    expect(m.tomar()).toBe(120)
  })

  it('vuelve a contar cuando regresa la actividad', () => {
    const m = crearMedidor(0)
    m.tic(200_000, true)
    expect(m.tomar()).toBe(0)
    m.actividad(200_500)
    m.tic(201_000, true)
    expect(m.tomar()).toBe(1)
  })

  it('no cuenta con la pestaña oculta aunque haya actividad previa', () => {
    const m = crearMedidor(0)
    m.tic(1000, false)
    expect(m.tomar()).toBe(0)
  })
})
