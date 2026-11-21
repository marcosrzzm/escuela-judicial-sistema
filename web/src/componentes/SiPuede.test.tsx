import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SiPuede } from '@/componentes/SiPuede'

let permitido = false
vi.mock('@/lib/sesion', () => ({
  useSesion: () => ({ puede: () => permitido }),
}))

describe('SiPuede', () => {
  it('oculta el contenido cuando no hay permiso', () => {
    permitido = false
    const html = renderToStaticMarkup(
      <SiPuede recurso="clientes" accion="crear">
        <button>Nuevo cliente</button>
      </SiPuede>,
    )
    expect(html).toBe('')
  })

  it('muestra el contenido cuando hay permiso', () => {
    permitido = true
    const html = renderToStaticMarkup(
      <SiPuede recurso="clientes" accion="crear">
        <button>Nuevo cliente</button>
      </SiPuede>,
    )
    expect(html).toContain('Nuevo cliente')
  })

  it('en modo deshabilitar envuelve el contenido con el title de la razón', () => {
    permitido = false
    const html = renderToStaticMarkup(
      <SiPuede
        recurso="clientes"
        accion="archivar"
        modo="deshabilitar"
        razon="Tu rol no puede archivar"
      >
        <button>Archivar</button>
      </SiPuede>,
    )
    expect(html).toContain('title="Tu rol no puede archivar"')
    expect(html).toContain('Archivar')
  })
})
