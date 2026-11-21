import { describe, expect, it } from 'vitest'

import { celdaCsv } from '@/lib/csv'

describe('celdaCsv', () => {
  it('escapa las comillas dobles duplicándolas', () => {
    expect(celdaCsv('Dijo "hola"')).toBe('"Dijo ""hola"""')
  })

  it('antepone un apóstrofo a las celdas que Excel evaluaría como fórmula', () => {
    expect(celdaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(celdaCsv('+1234')).toBe(`"'+1234"`)
    expect(celdaCsv('-1234')).toBe(`"'-1234"`)
    expect(celdaCsv('@usuario')).toBe(`"'@usuario"`)
  })

  it('deja intacto un texto normal', () => {
    expect(celdaCsv('Cliente regular')).toBe('"Cliente regular"')
  })
})
