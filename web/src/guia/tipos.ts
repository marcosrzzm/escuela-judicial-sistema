/** Guía de una pantalla: secciones fijas, siempre en el mismo orden. */
export interface Guia {
  titulo: string
  queEs: string
  pasos: string[]
  despues: string
  tropiezos: string[]
  siguiente?: { etiqueta: string; ruta: string }
}
