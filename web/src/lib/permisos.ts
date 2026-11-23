/** Nombres en español de los recursos y acciones de la matriz de permisos, para las casillas de un rol. */
const RECURSOS: Record<string, string> = {
  periodo: 'Periodos',
  grupo: 'Grupos',
  alumno: 'Alumnos',
  inscripcion_grupo: 'Listas de los grupos',
  usuario: 'Usuarios',
  rol: 'Roles',
  ver_como: 'Ver como otra cuenta',
  materia: 'Materias',
  asignacion_docente: 'Asignaciones de docentes',
  decision_evaluacion: 'Derecho a evaluación',
  entrega_calificaciones: 'Entregas de calificaciones',
  calificacion: 'Calificaciones',
  pendiente_academico: 'Pendientes del alumno',
  cierre: 'Cierres',
  documento_academico: 'Boletas',
  lote_entrega: 'Lotes',
  registro_carga_externa: 'Carga externa',
  bitacora_cambio: 'Bitácora',
  metrica_caso: 'Métricas',
  modulo: 'Aula: módulos y contenido',
  archivo: 'Aula: archivos',
  actividad: 'Aula: tareas, exámenes, foros, categorías y rúbricas',
  entrega_tarea: 'Aula: entregas de tareas',
  calificacion_actividad: 'Aula: calificaciones de actividades',
  intento_examen: 'Aula: intentos de examen',
  mensaje: 'Mensajes',
  publicacion_foro: 'Aula: publicaciones de foros',
}

const ACCIONES: Record<string, string> = {
  ver: 'Ver',
  crear: 'Crear',
  modificar: 'Modificar',
  aceptar: 'Aceptar',
  devolver: 'Devolver',
  reabrir: 'Reabrir',
}

export const etiquetaRecurso = (r: string) => RECURSOS[r] ?? r
export const etiquetaAccion = (a: string) => ACCIONES[a] ?? a

export const ETIQUETA_BASE: Record<string, string> = {
  coordinacion: 'Coordinación',
  docente: 'Docente',
  direccion: 'Dirección',
  carga_externa: 'Carga externa',
  auxiliar: 'Auxiliar',
  alumno: 'Alumno',
}

/** "recurso:accion" agrupado por recurso, en el orden de la lista. */
export function agruparPermisos(lista: string[]): { recurso: string; acciones: string[] }[] {
  const grupos = new Map<string, string[]>()
  for (const p of lista) {
    const [recurso = '', accion = ''] = p.split(':')
    grupos.set(recurso, [...(grupos.get(recurso) ?? []), accion])
  }
  return [...grupos].map(([recurso, acciones]) => ({ recurso, acciones }))
}
