/** Tipos y utilidades del aula (especificación, sección 12). El servidor decide qué trae cada respuesta según el rol. */
import { enviar } from '@/lib/api'

export type ModoCurso = 'coordinacion' | 'direccion' | 'docente' | 'alumno'

/** Lo que cada pestaña necesita saber del curso. `escribe` es verdadero para el docente y Coordinación con el periodo abierto. */
export type ContextoCurso = { id: number; modo: ModoCurso; periodoAbierto: boolean; escribe: boolean }

export type ResumenCurso = {
  id: number
  grupo_id: number
  materia: string
  grupo: string
  programa: string
  periodo: string
  periodo_estado: string
  docente: string
  modo: ModoCurso
}

export type CursoInicio = {
  curso: ResumenCurso
  conteos: { tarea: number; examen: number; foro: number; por_calificar?: number }
}

export const contextoDe = (c: ResumenCurso): ContextoCurso => ({
  id: c.id,
  modo: c.modo,
  periodoAbierto: c.periodo_estado === 'abierto',
  escribe: (c.modo === 'docente' || c.modo === 'coordinacion') && c.periodo_estado === 'abierto',
})

export type ArchivoRef = { id: number; nombre: string; tamano: number }

export type Elemento = {
  id: number
  modulo_id: number
  tipo: 'pagina' | 'archivo' | 'enlace' | 'tarea' | 'examen' | 'foro'
  titulo: string
  texto: string | null
  url: string | null
  orden: number
  publicado: boolean
  archivo: ArchivoRef | null
  actividad_id: number | null
  actividad_publicada?: boolean
}

export type Modulo = { id: number; titulo: string; orden: number; publicado: boolean; elementos: Elemento[] }

export type Categoria = { id: number; nombre: string; peso: number }

export type Nivel = { nombre: string; puntos: number }
export type Criterio = { descripcion: string; niveles: Nivel[] }
export type Rubrica = { id: number; nombre: string; criterios: Criterio[]; maximo: number }

export type DetalleCalificacion = { criterio: string; nivel: string; puntos: number }
export type CalificacionVista = { puntos: number; comentario: string | null; detalle: DetalleCalificacion[] | null }

export type MiEstado = {
  estado?: 'sin_entregar' | 'entregada' | 'en_curso'
  version?: number
  tarde?: boolean
  intentos_usados?: number
  intento_en_curso?: number | null
  calificacion: CalificacionVista | null
}

export type Actividad = {
  id: number
  asignacion_id: number
  tipo: 'tarea' | 'examen' | 'foro'
  titulo: string
  instrucciones: string | null
  categoria_id: number | null
  puntos: number
  fecha_limite: string | null
  acepta_tarde: boolean
  rubrica: Rubrica | null
  disponible_desde: string | null
  disponible_hasta: string | null
  tiempo_limite_min: number | null
  intentos_permitidos: number
  calificable: boolean
  publicada: boolean
  calificaciones_publicadas: boolean
  servidor_ahora?: string
  total_preguntas?: number
  mio?: MiEstado
  entregas?: number
  intentos?: number
  preguntas?: Pregunta[]
}

export type ListaActividades = { curso: ResumenCurso; actividades: Actividad[]; categorias: Categoria[] }

export type Pregunta = {
  id: number
  tipo: 'opcion' | 'vf' | 'abierta'
  enunciado: string
  opciones: string[] | null
  puntos: number
  /** Solo la reciben el docente y Coordinación. */
  correcta?: string | null
}

export type VersionEntrega = {
  id: number
  version: number
  texto: string | null
  tarde: boolean
  fecha: string
  archivo: ArchivoRef | null
}

export type EntregasDeTarea = {
  actividad: Actividad
  /** Alumno: solo las suyas. */
  versiones?: VersionEntrega[]
  mio?: MiEstado
  /** Docente, Coordinación y Dirección: una fila por alumno de la lista vigente. */
  alumnos?: {
    alumno_id: number
    identificador: string
    nombre: string
    versiones: VersionEntrega[]
    calificacion: (CalificacionVista & { entrega_id: number | null }) | null
  }[]
}

export type Intento = {
  id: number
  actividad_id: number
  numero: number
  inicio: string
  limite: string | null
  envio: string | null
  estado: 'en_curso' | 'enviado' | 'calificado'
  respuestas: Record<string, string>
  servidor_ahora: string
  preguntas: Pregunta[]
  puntos_auto?: number
  puntos_abiertas?: Record<string, number>
  puntos_finales?: number | null
}

export type IntentosDeExamen = {
  actividad: Actividad
  intentos: {
    id: number
    numero: number
    estado: string
    inicio: string
    envio: string | null
    puntos_auto: number
    puntos_finales: number | null
    alumno_id: number
    identificador: string
    nombre: string
    por_calificar: boolean
  }[]
}

export type CalificacionesCurso = {
  curso: ResumenCurso
  categorias: Categoria[]
  leyenda: string
  actividades: {
    id: number
    titulo: string
    tipo: string
    puntos?: number
    puntos_posibles?: number
    publicadas?: boolean
    estado?: string
    calificacion?: CalificacionVista | null
  }[]
  calculada?: { valor: number | null; categorias: { id: number; nombre: string; peso: number; porcentaje: number | null }[] }
  alumnos?: { alumno_id: number; identificador: string; nombre: string; celdas: Record<string, number | null>; calculada: number | null }[]
}

export type Publicacion = {
  id: number
  autor_id: number
  autor: string
  mio: boolean
  responde_a: number | null
  fecha: string
  oculta: boolean
  texto: string | null
  motivo_oculto: string | null
  oculta_por: string | null
}

export type Foro = {
  actividad: Actividad
  curso: ResumenCurso
  puede_moderar: boolean
  publicaciones: Publicacion[]
}

export type Conversacion = {
  id: number
  con: { id: number; nombre: string; rol: string } | null
  ultimo: { texto: string; fecha: string; mio: boolean } | null
  sin_leer: number
}

export type Mensaje = {
  id: number
  autor_id: number
  autor: string
  mio: boolean
  texto: string
  archivo: ArchivoRef | null
  fecha: string
}

export type Hilo = {
  id: number
  acceso: 'participante' | 'reportada'
  participantes: { id: number; nombre: string; rol: string }[]
  mensajes: Mensaje[]
}

export type Contacto = { id: number; nombre: string; rol: string }

// --- Archivos ---------------------------------------------------------------------------------------------

export const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024
export const EXTENSIONES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png'
export const urlArchivo = (id: number) => `/api/archivos/${id}`

export const tamanoLegible = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function aBase64(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'))
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '')
    lector.readAsDataURL(archivo)
  })
}

/** Sube el archivo y devuelve su id. El servidor revisa extensión y contenido; el tope es de 10 MB. */
export async function subirArchivo(
  archivo: File,
  asignacionId: number | null,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (archivo.size > MAX_ARCHIVO_BYTES)
    return { ok: false, error: 'El archivo pesa más de 10 MB. Elige uno más pequeño.' }
  const contenido = await aBase64(archivo).catch(() => '')
  const r = await enviar<{ id: number }>('/archivos', {
    nombre: archivo.name,
    contenido,
    ...(asignacionId === null ? {} : { asignacion_id: asignacionId }),
  })
  return r.ok ? { ok: true, id: r.datos.id } : { ok: false, error: r.error }
}

// --- Fechas -----------------------------------------------------------------------------------------------

/** "2026-11-30 18:00:00" (UTC del servidor) a "2026-11-30T12:00" (hora local, para un campo datetime-local). */
export function aCampoLocal(utc: string | null): string {
  if (!utc) return ''
  const d = new Date(utc.replace(' ', 'T') + 'Z')
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Hora local de un campo datetime-local a ISO en UTC; vacío es null. */
export const deCampoLocal = (v: string): string | null => (v === '' ? null : new Date(v).toISOString())

export const puntosLegibles = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 2 })
