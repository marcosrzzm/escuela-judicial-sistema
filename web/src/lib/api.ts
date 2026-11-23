/**
 * Cliente de la API. Todo pasa por aquí para que el manejo de errores sea uno solo.
 * Devuelve un Resultado discriminado en vez de lanzar: la pantalla decide qué hacer con el error.
 */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; codigo: number; error: string }

const BASE = '/api'

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<Resultado<T>> {
  try {
    const r = await fetch(`${BASE}${ruta}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opciones,
    })
    const cuerpo: unknown = await r.json().catch(() => ({}))
    if (!r.ok) {
      const error = (cuerpo as { error?: unknown }).error
      if (r.status === 401 && ruta !== '/login') window.dispatchEvent(new Event('sesion-expirada'))
      return {
        ok: false,
        codigo: r.status,
        error:
          typeof error === 'string' && error !== ''
            ? error
            : 'El servidor no respondió como se esperaba. Vuelve a intentarlo.',
      }
    }
    return { ok: true, datos: cuerpo as T }
  } catch {
    return {
      ok: false,
      codigo: 0,
      error: 'No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.',
    }
  }
}

export const leer = <T>(ruta: string) => pedir<T>(ruta)
export const enviar = <T>(ruta: string, datos: unknown = {}) =>
  pedir<T>(ruta, { method: 'POST', body: JSON.stringify(datos) })
export const actualizar = <T>(ruta: string, datos: unknown = {}) =>
  pedir<T>(ruta, { method: 'PUT', body: JSON.stringify(datos) })

// ─── Tipos del dominio ───────────────────────────────────────────────────────

export type Rol = 'coordinacion' | 'docente' | 'direccion' | 'carga_externa' | 'auxiliar'

export type Sesion = {
  id: number
  nombre: string
  correo: string
  /** Clave del rol de la cuenta (un rol del sistema o uno personalizado). */
  rol: string
  rol_nombre: string
  /** Rol del sistema en que se basa: de él salen el alcance y las pantallas. */
  base: Rol
  es_sistema: boolean
  /** Permisos efectivos "recurso:accion". El servidor los vuelve a validar en cada petición. */
  permisos: string[]
  debe_cambiar_clave: boolean
  /** Verdadero mientras Coordinación mira el sistema como esta cuenta. */
  solo_lectura: boolean
  actor_real: { id: number; nombre: string; rol: string } | null
  datos_ficticios: boolean
}

export type Periodo = {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

export type Grupo = {
  id: number
  periodo_id: number
  periodo: string
  periodo_estado: string
  clave: string
  programa: string
  turno: string
  estado: string
  alumnos_activos: number
}

export type AlumnoLista = {
  inscripcion_id: number
  alumno_id: number
  identificador: string
  nombre: string
  estado: 'activa' | 'baja'
  fecha_alta: string
  fecha_baja: string | null
  observacion: string
}

export type ListaGrupo = {
  grupo: Omit<Grupo, 'alumnos_activos'>
  alumnos: AlumnoLista[]
  asignaciones: { id: number; materia: string; docente: string }[]
}

export type ResumenEntrega = {
  id: number
  version: number
  estado: string
  responsable: string | null
  fecha_envio: string | null
  fecha_revision: string | null
  motivo: string | null
  captura_excepcional: boolean
}

export type Asignacion = {
  id: number
  grupo_id: number
  grupo: string
  periodo_id: number
  periodo: string
  materia: string
  docente: string
  alumnos_activos: number
  entrega: ResumenEntrega | null
}

export type Calificacion = {
  alumno_id: number
  valor: number | null
  estatus: string
  observacion: string
}

export type Entrega = {
  id: number
  asignacion_id: number
  version: number
  estado: string
  responsable: string
  captura_excepcional: boolean
  motivo_captura: string | null
  fecha_envio: string | null
  fecha_revision: string | null
  revisado_por: string | null
  motivo: string | null
  calificaciones: Calificacion[]
}

export type Decision = {
  id: number
  alumno_id: number
  resultado: string
  motivo: string
  referencia_evidencia: string
  fecha: string
  resolucion_direccion: string | null
  motivo_direccion: string | null
  responsable: string
  bloqueado: boolean
}

export type AlumnoAsignacion = {
  alumno_id: number
  identificador: string
  nombre: string
  decision: Decision | null
  bloqueado: boolean
}

export type DetalleAsignacion = {
  asignacion: {
    id: number
    grupo_id: number
    grupo: string
    materia: string
    docente: string
    periodo: string
    periodo_estado: string
  }
  alumnos: AlumnoAsignacion[]
  entrega: Entrega | null
  versiones: {
    id: number
    version: number
    estado: string
    motivo: string | null
    fecha_envio: string | null
    fecha_revision: string | null
    responsable: string
  }[]
  historial_decisiones: {
    id: number
    alumno: string
    resultado: string
    motivo: string
    fecha: string
    resolucion_direccion: string | null
    responsable: string
  }[]
}

export type DetalleEntrega = {
  asignacion: DetalleAsignacion['asignacion']
  alumnos: { alumno_id: number; identificador: string; nombre: string }[]
  entrega: Entrega
}

export type Autorizaciones = {
  decisiones: {
    id: number
    alumno: string
    identificador: string
    materia: string
    grupo: string
    periodo: string
    motivo: string
    referencia_evidencia: string
    fecha: string
    responsable: string
  }[]
  cierres: {
    id: number
    version: number
    grupo: string
    periodo: string
    excepcion: boolean
    motivo_excepcion: string | null
    preparado_por: string
  }[]
}

export type Historial = {
  alumno: { id: number; identificador: string; nombre: string; estatus: string }
  periodos: {
    periodo_id: number
    periodo: string
    grupo: string
    materias: { materia: string; valor: number | null; estatus: string; version: number }[]
  }[]
  pendientes: {
    id: number
    materia: string
    periodo_origen: string
    tipo: string
    estado: string
    resolucion: string | null
  }[]
  materias: { id: number; nombre: string }[]
  periodos_catalogo: { id: number; nombre: string }[]
}

export type AlumnoBusqueda = {
  id: number
  identificador: string
  nombre: string
  estatus: string
  pendientes_abiertos: number
}

export type CierreGrupo = {
  grupo: {
    id: number
    clave: string
    periodo: string
    periodo_id: number
    programa: string
    estado: string
  }
  asignaciones: {
    id: number
    materia: string
    docente: string
    entrega: ResumenEntrega | null
    aceptada: boolean
  }[]
  listo: boolean
  alumnos_activos: number
  cierres: {
    id: number
    version: number
    estado: string
    requiere_autorizacion: boolean
    excepcion: boolean
    motivo_excepcion: string | null
    motivo: string | null
    fecha_aprobacion: string | null
    preparado_por: string
    aprobado_por: string | null
    lote_id: number | null
    lote_estado: string | null
    fecha_generacion: string | null
    fecha_recepcion: string | null
    fecha_carga: string | null
    discrepancias: string | null
    registrado_por: string | null
    documentos: number
  }[]
}

export type Lote = {
  id: number
  cierre_id: number
  version: number
  estado: string
  fecha_generacion: string
  periodo: string
  grupo: string
  grupo_id: number
  generado_por: string
  fecha_recepcion: string | null
  fecha_carga: string | null
  discrepancias: string | null
  registrado_por: string | null
}

export type Boletas = {
  cierre: { id: number; version: number; grupo: string; periodo: string }
  lote: { fecha_generacion: string; generado_por: string } | null
  leyenda: string
  boletas: {
    identificador: string
    nombre: string
    materias: { materia: string; docente: string; valor: number | null; estatus: string }[]
  }[]
}

export type InicioCoordinacion = {
  solicitudes_acceso: number
  entregas_por_revisar: number
  decisiones_en_direccion: number
  cierres_en_direccion: number
  grupos_listos_para_cierre: number
  lotes_con_discrepancias: number
}

export type CasoSistema = {
  grupo_id: number
  grupo: string
  periodo: string
  tipo: 'lista' | 'cierre'
  campos_recapturados: number
  segundos_activos: number
}
export type CasoBase = {
  id: number
  tipo: 'lista' | 'cierre'
  grupo: string | null
  periodo: string | null
  campos_recapturados: number
  segundos_activos: number
  nota: string
  registrado_por: string
  fecha: string
}
type ResumenCasos = {
  casos: number
  campos_promedio: number | null
  minutos_promedio: number | null
}
export type Metricas = {
  sistema: CasoSistema[]
  linea_base: CasoBase[]
  resumen: Record<'lista' | 'cierre', { sistema: ResumenCasos; linea_base: ResumenCasos }>
}

export type EventoBitacora = {
  id: number
  entidad: string
  registro_id: number | null
  accion: string
  fecha: string
  motivo: string | null
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  usuario: string | null
}
export type PaginaBitacora = {
  filas: EventoBitacora[]
  total: number
  pagina: number
  paginas: number
  entidades: string[]
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

export const sesionActual = () => leer<Sesion>('/sesion')
export const iniciarSesion = (correo: string, clave: string) =>
  enviar<Sesion>('/login', { correo, clave })
export const cerrarSesion = () => enviar<{ ok: true }>('/logout')

export const altaInscripcion = (
  grupoId: number,
  datos: { alumno_id?: number; identificador?: string; nombre?: string; observacion: string },
) => enviar<{ id: number }>(`/grupos/${grupoId}/inscripciones`, datos)
export const bajaInscripcion = (id: number, observacion: string) =>
  actualizar<{ id: number }>(`/inscripciones/${id}/baja`, { observacion })

export const crearDecision = (
  asignacionId: number,
  datos: { alumno_id: number; resultado: string; motivo: string; referencia_evidencia: string },
) => enviar<{ id: number }>(`/asignaciones/${asignacionId}/decisiones`, datos)
export const resolverDecision = (
  id: number,
  resolucion: 'autorizada' | 'rechazada',
  motivo: string,
) => actualizar<{ id: number }>(`/decisiones/${id}/resolver`, { resolucion, motivo })

export type ItemCalificacion = {
  alumno_id: number
  valor: string | number | null
  observacion?: string
}
export const abrirEntrega = (asignacionId: number) =>
  enviar<Entrega>(`/asignaciones/${asignacionId}/entrega`)
export const guardarBorrador = (entregaId: number, calificaciones: ItemCalificacion[]) =>
  actualizar<Entrega>(`/entregas/${entregaId}/calificaciones`, { calificaciones })
export const enviarEntrega = (entregaId: number, calificaciones: ItemCalificacion[]) =>
  enviar<Entrega>(`/entregas/${entregaId}/enviar`, { calificaciones })
export const capturaExcepcional = (
  asignacionId: number,
  motivo: string,
  calificaciones: ItemCalificacion[],
) =>
  enviar<Entrega>(`/asignaciones/${asignacionId}/captura-excepcional`, { motivo, calificaciones })
export const aceptarEntrega = (id: number) => actualizar<Entrega>(`/entregas/${id}/aceptar`)
export const devolverEntrega = (id: number, motivo: string) =>
  actualizar<unknown>(`/entregas/${id}/devolver`, { motivo })
export const reabrirEntrega = (id: number, motivo: string) =>
  actualizar<unknown>(`/entregas/${id}/reabrir`, { motivo })

export const crearPendiente = (
  alumnoId: number,
  datos: { materia_id: number; periodo_origen_id: number; motivo: string },
) => enviar<{ id: number }>(`/alumnos/${alumnoId}/pendientes`, datos)
export const resolverPendiente = (id: number, resolucion: string) =>
  actualizar<{ id: number }>(`/pendientes/${id}/resolver`, { resolucion })

export const prepararCierre = (
  grupoId: number,
  datos: {
    requiere_autorizacion: boolean
    excepcion: boolean
    motivo_excepcion?: string
    motivo?: string
  },
) => enviar<{ id: number }>(`/grupos/${grupoId}/cierres`, datos)
export const aprobarCierre = (id: number) => actualizar<unknown>(`/cierres/${id}/aprobar`)
export const enviarAutorizacion = (id: number) =>
  actualizar<unknown>(`/cierres/${id}/enviar-autorizacion`)
export const resolverCierre = (id: number, resolucion: 'aprobar' | 'devolver', motivo: string) =>
  actualizar<unknown>(`/cierres/${id}/resolver`, { resolucion, motivo })
export const generarLote = (cierreId: number) => enviar<{ id: number }>(`/cierres/${cierreId}/lote`)

export const registrarRecepcion = (id: number) => actualizar<unknown>(`/lotes/${id}/recepcion`)
export const registrarCarga = (id: number, conDiscrepancias: boolean, discrepancias: string) =>
  actualizar<unknown>(`/lotes/${id}/carga`, { con_discrepancias: conDiscrepancias, discrepancias })

export const registrarLineaBase = (datos: {
  tipo: string
  grupo_id: number | null
  campos_recapturados: number
  minutos: number
  nota: string
}) => enviar<{ id: number }>('/metricas/linea-base', datos)
export const enviarTiempo = (tipo: 'lista' | 'cierre', grupoId: number, segundos: number) =>
  enviar<{ segundos_aceptados: number }>('/metricas/tiempo', { tipo, grupo_id: grupoId, segundos })

// ─── Administración ──────────────────────────────────────────────────────────

export type Usuario = {
  id: number
  nombre: string
  correo: string
  rol: string
  rol_nombre: string
  base: Rol
  estado: 'activo' | 'inactivo'
  debe_cambiar_clave: boolean
  grupo_ids: number[]
}
export type RolAdmin = {
  id: number
  clave: string
  nombre: string
  base: Rol
  permisos: string[]
  es_sistema: boolean
  estado: 'activo' | 'inactivo'
  usuarios_activos: number
}
export type Roles = { filas: RolAdmin[]; techos: Record<Rol, string[]> }
export type Materia = { id: number; clave: string; nombre: string }
export type Docente = { id: number; nombre: string }
export type ResumenImportacion = {
  creadas: number
  inscritas: number
  rechazadas: { fila: number; matricula: string; razon: string }[]
}

export const ajustesPublicos = () => leer<{ datos_ficticios: boolean }>('/ajustes-publicos')
export const cambiarMiClave = (datos: { actual: string; nueva: string; confirmacion: string }) =>
  actualizar<Sesion>('/mi-clave', datos)
export const verComo = (usuarioId: number) => enviar<{ ok: true }>(`/ver-como/${usuarioId}`)
export const salirDeVerComo = () => enviar<{ ok: true }>('/ver-como/salir')

export type DatosUsuario = { nombre: string; correo: string; rol: string }
/** `modo_prueba`: el correo no salió porque el destinatario no está permitido; trae el enlace para seguir. */
export type CorreoEnviado = { correo_enviado: boolean; modo_prueba?: boolean; enlace?: string }
export type AltaUsuario = { id: number; clave_temporal?: string } & Partial<CorreoEnviado>
export const crearUsuario = (datos: DatosUsuario & { invitar: boolean }) =>
  enviar<AltaUsuario>('/usuarios', datos)
export const reenviarInvitacion = (id: number) =>
  enviar<CorreoEnviado>(`/usuarios/${id}/invitacion`)
export const enviarEnlaceRestablecer = (id: number) =>
  enviar<CorreoEnviado>(`/usuarios/${id}/enlace-restablecer`)

export type SolicitudAcceso = {
  id: number
  correo: string
  nombre: string
  rol_nombre: string
  creado_en: string
}
export const autorizarSolicitud = (id: number) =>
  actualizar<CorreoEnviado>(`/solicitudes-acceso/${id}/autorizar`)
export const rechazarSolicitud = (id: number, motivo: string) =>
  actualizar<{ ok: true }>(`/solicitudes-acceso/${id}/rechazar`, { motivo })

/** Pantallas públicas: entrar con el enlace del correo y pedir restablecer. */
export const validarEnlace = (token: string) =>
  leer<{ correo: string }>(`/acceso/validar?t=${encodeURIComponent(token)}`)
export const fijarClaveConEnlace = (datos: {
  token: string
  nueva: string
  confirmacion: string
}) => enviar<Sesion>('/acceso/clave', datos)
export const pedirRestablecer = (correo: string) =>
  enviar<{ ok: true }>('/olvide-clave', { correo })
export const editarUsuario = (id: number, datos: DatosUsuario & { estado: string }) =>
  actualizar<{ id: number }>(`/usuarios/${id}`, datos)
export const restablecerClave = (id: number) =>
  actualizar<{ id: number; clave_temporal: string }>(`/usuarios/${id}/clave-temporal`)
export const guardarGruposAuxiliar = (id: number, grupoIds: number[]) =>
  actualizar<{ id: number }>(`/usuarios/${id}/grupos-auxiliar`, { grupo_ids: grupoIds })
export const crearRol = (datos: { nombre: string; base: Rol; permisos: string[] }) =>
  enviar<{ id: number }>('/roles', datos)
export const editarRol = (
  id: number,
  datos: { nombre: string; estado: string; permisos: string[] },
) => actualizar<{ id: number }>(`/roles/${id}`, datos)

export const crearPeriodo = (datos: { nombre: string; fecha_inicio: string; fecha_fin: string }) =>
  enviar<{ id: number }>('/periodos', datos)
export const cambiarEstadoPeriodo = (id: number, estado: string) =>
  actualizar<{ id: number }>(`/periodos/${id}`, { estado })
export const crearMateria = (datos: { clave: string; nombre: string }) =>
  enviar<{ id: number }>('/materias', datos)
export const editarMateria = (id: number, datos: { clave: string; nombre: string }) =>
  actualizar<{ id: number }>(`/materias/${id}`, datos)
export type DatosGrupo = { periodo_id: number; clave: string; programa: string; turno: string }
export const crearGrupo = (datos: DatosGrupo) => enviar<{ id: number }>('/grupos', datos)
export const editarGrupo = (id: number, datos: DatosGrupo & { estado: string }) =>
  actualizar<{ id: number }>(`/grupos/${id}`, datos)
export const crearAsignacion = (datos: {
  grupo_id: number
  materia_id: number
  docente_id: number
}) => enviar<{ id: number }>('/asignaciones', datos)
export const cambiarDocente = (id: number, docenteId: number, motivo: string) =>
  actualizar<{ id: number }>(`/asignaciones/${id}`, { docente_id: docenteId, motivo })
export const editarAlumno = (
  id: number,
  datos: { identificador: string; nombre: string; estatus: string; motivo: string },
) => actualizar<{ id: number }>(`/alumnos/${id}`, datos)
export const importarLista = (grupoId: number, texto: string) =>
  enviar<ResumenImportacion>(`/grupos/${grupoId}/importar`, { texto })
