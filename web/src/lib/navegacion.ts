/**
 * Pantallas del sistema por rol (especificación, sección 6). De aquí se alimentan el menú lateral,
 * las migas y el buscador, para no mantener listas que se desincronizan. El servidor valida el
 * permiso de cada petición; esto solo decide qué se ofrece a cada rol.
 */
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  LayoutDashboard,
  UserRound,
  ClipboardCheck,
  FileArchive,
  FolderClock,
  GraduationCap,
  History,
  ListChecks,
  PackageCheck,
  Scale,
  Library,
  ShieldCheck,
  Timer,
  UserCog,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import type { Rol, Sesion } from '@/lib/api'

export interface Area {
  clave: string
  etiqueta: string
  descripcion: string
  icono: LucideIcon
  ruta: string
  roles: Rol[]
  /** Permiso que pide la primera lectura de la pantalla (o uno de varios): sin él el menú no la ofrece. */
  permiso: string | string[]
}

export const AREAS: Area[] = [
  {
    clave: 'tablero',
    etiqueta: 'Tablero',
    descripcion: 'Tus grupos y lo que espera tu atención.',
    icono: LayoutDashboard,
    ruta: '/',
    roles: ['coordinacion', 'docente', 'direccion', 'carga_externa', 'auxiliar', 'alumno'],
    permiso: 'periodo:ver',
  },
  {
    clave: 'grupos',
    etiqueta: 'Grupos',
    descripcion: 'Cada grupo con su lista, materias, calificaciones y cierre.',
    icono: UsersRound,
    ruta: '/grupos',
    roles: ['coordinacion', 'direccion', 'auxiliar', 'docente'],
    permiso: 'grupo:ver',
  },
  {
    clave: 'calendario',
    etiqueta: 'Calendario',
    descripcion: 'Fechas de periodos, entregas y cierres.',
    icono: CalendarDays,
    ruta: '/calendario',
    roles: ['coordinacion', 'docente', 'direccion', 'carga_externa', 'auxiliar', 'alumno'],
    permiso: 'periodo:ver',
  },
  {
    clave: 'avisos',
    etiqueta: 'Avisos',
    descripcion: 'Lo que pasó y te toca atender.',
    icono: Bell,
    ruta: '/avisos',
    roles: ['coordinacion', 'docente', 'direccion', 'carga_externa', 'auxiliar', 'alumno'],
    permiso: 'periodo:ver',
  },
  {
    clave: 'cuenta',
    etiqueta: 'Cuenta',
    descripcion: 'Tus datos, tu contraseña, tu tema y tus sesiones.',
    icono: UserRound,
    ruta: '/cuenta',
    roles: ['coordinacion', 'docente', 'direccion', 'carga_externa', 'auxiliar', 'alumno'],
    permiso: 'periodo:ver',
  },
  {
    clave: 'derecho',
    etiqueta: 'Derecho a evaluación',
    descripcion: 'Decisión de cada alumno en cada materia.',
    icono: Scale,
    ruta: '/derecho',
    roles: ['coordinacion'],
    permiso: 'asignacion_docente:ver',
  },
  {
    clave: 'revision',
    etiqueta: 'Revisión de calificaciones',
    descripcion: 'Aceptar, devolver o reabrir las entregas de los docentes.',
    icono: ClipboardCheck,
    ruta: '/revision',
    roles: ['coordinacion'],
    permiso: 'asignacion_docente:ver',
  },
  {
    clave: 'historial',
    etiqueta: 'Historial del alumno',
    descripcion: 'Materias por periodo y pendientes de cada alumno.',
    icono: GraduationCap,
    ruta: '/historial',
    roles: ['coordinacion', 'direccion', 'alumno'],
    permiso: 'pendiente_academico:ver',
  },
  {
    clave: 'cierre',
    etiqueta: 'Cierre y lote',
    descripcion: 'Preparar el cierre, generar boletas y lote, ver el traspaso.',
    icono: PackageCheck,
    ruta: '/cierre',
    roles: ['coordinacion', 'direccion'],
    permiso: 'cierre:ver',
  },
  {
    clave: 'metricas',
    etiqueta: 'Métricas',
    descripcion: 'Recapturas y tiempo activo, contra la línea base.',
    icono: Timer,
    ruta: '/metricas',
    roles: ['coordinacion'],
    permiso: 'metrica_caso:ver',
  },
  {
    clave: 'asignaciones',
    etiqueta: 'Mis asignaciones',
    descripcion: 'Tus materias y su entrega de calificaciones.',
    icono: BookOpenCheck,
    ruta: '/asignaciones',
    roles: ['docente'],
    permiso: 'asignacion_docente:ver',
  },
  {
    clave: 'autorizaciones',
    etiqueta: 'Autorizaciones',
    descripcion: 'Decisiones y cierres que esperan tu resolución.',
    icono: ShieldCheck,
    ruta: '/autorizaciones',
    roles: ['direccion'],
    permiso: 'decision_evaluacion:ver',
  },
  {
    clave: 'lotes',
    etiqueta: 'Lotes recibidos',
    descripcion: 'Lotes aprobados para cargar en la plataforma oficial.',
    icono: FileArchive,
    ruta: '/lotes',
    roles: ['carga_externa'],
    permiso: 'lote_entrega:ver',
  },
  {
    clave: 'listas',
    etiqueta: 'Mis listas',
    descripcion: 'Lista vigente de tus grupos, para consultar e imprimir.',
    icono: ListChecks,
    ruta: '/listas',
    roles: ['auxiliar'],
    permiso: 'inscripcion_grupo:ver',
  },
  {
    clave: 'bitacora',
    etiqueta: 'Bitácora',
    descripcion: 'Quién hizo qué, cuándo y por qué.',
    icono: History,
    ruta: '/bitacora',
    roles: ['coordinacion', 'direccion'],
    permiso: 'bitacora_cambio:ver',
  },
  {
    clave: 'catalogos',
    etiqueta: 'Catálogos',
    descripcion: 'Periodos, materias, grupos y asignaciones de docentes.',
    icono: Library,
    ruta: '/catalogos',
    roles: ['coordinacion'],
    permiso: [
      'periodo:crear',
      'periodo:modificar',
      'materia:crear',
      'materia:modificar',
      'grupo:crear',
      'grupo:modificar',
      'asignacion_docente:crear',
      'asignacion_docente:modificar',
    ],
  },
  {
    clave: 'usuarios',
    etiqueta: 'Usuarios y roles',
    descripcion: 'Cuentas, contraseñas temporales, roles y "Ver como".',
    icono: UserCog,
    ruta: '/usuarios',
    roles: ['coordinacion'],
    // Solo el rol del sistema coordinacion trae usuario:crear: un rol personalizado no puede tenerlo.
    permiso: 'usuario:crear',
  },
]

/** Icono para pantallas de detalle que no están en el menú. */
export const ICONO_DETALLE = FolderClock

function coincide(pathname: string, ruta: string): boolean {
  return ruta === '/' ? pathname === '/' : pathname === ruta || pathname.startsWith(`${ruta}/`)
}

type Cuenta = Pick<Sesion, 'base' | 'permisos' | 'debe_cambiar_clave'>

function tienePermiso(cuenta: Cuenta, permiso: Area['permiso']): boolean {
  return [permiso].flat().some((p) => cuenta.permisos.includes(p))
}

function visible(area: Area, cuenta: Cuenta): boolean {
  return area.roles.includes(cuenta.base) && tienePermiso(cuenta, area.permiso)
}

/** Con la contraseña temporal pendiente no se ofrece ninguna pantalla: solo Mi contraseña. */
export function areasVisibles(cuenta: Cuenta | null | undefined): Area[] {
  return cuenta && !cuenta.debe_cambiar_clave ? AREAS.filter((a) => visible(a, cuenta)) : []
}

export function areaDeRuta(pathname: string): Area | null {
  return AREAS.find((a) => coincide(pathname, a.ruta)) ?? null
}

/** Todos entran al Tablero (sección 11.2); con la contraseña temporal pendiente, solo a Mi contraseña. */
export function rutaInicial(cuenta: Cuenta): string {
  return cuenta.debe_cambiar_clave ? '/mi-clave' : '/'
}

export interface ItemRail {
  clave: string
  etiqueta: string
  icono: LucideIcon
  ruta: string
  /** Pantallas que se abren desde este elemento (Administración). */
  hijos?: { etiqueta: string; ruta: string }[]
}

/**
 * Barra global (sección 11.1) de la cuenta. Tablero, Grupos, Calendario y Avisos son comunes; el resto
 * depende del rol: Administración (Coordinación), Autorizaciones y Bitácora (Dirección), Lotes (Carga
 * externa) y Boleta (Alumno). Cuenta y Ayuda las pone la propia barra.
 */
export function itemsRail(cuenta: Cuenta | null | undefined): ItemRail[] {
  const vis = areasVisibles(cuenta)
  const hay = (c: string) => vis.find((a) => a.clave === c)
  const item = (c: string, etiqueta?: string): ItemRail[] => {
    const a = hay(c)
    return a
      ? [{ clave: a.clave, etiqueta: etiqueta ?? a.etiqueta, icono: a.icono, ruta: a.ruta }]
      : []
  }
  if (!cuenta) return []
  const admin = ['catalogos', 'usuarios', 'metricas', 'bitacora']
    .map(hay)
    .filter((a): a is Area => a !== undefined)
  return [
    ...item('tablero'),
    ...(cuenta.base === 'carga_externa' ? item('lotes') : item('grupos')),
    ...item('calendario'),
    ...item('avisos'),
    ...(cuenta.base === 'alumno' ? item('historial', 'Boleta') : item('historial', 'Historial')),
    ...(cuenta.base === 'direccion' ? [...item('autorizaciones'), ...item('bitacora')] : []),
    ...(cuenta.base === 'coordinacion' && admin.length > 0
      ? [
          {
            clave: 'administracion',
            etiqueta: 'Administración',
            icono: Library,
            ruta: admin[0]!.ruta,
            hijos: admin.map((a) => ({ etiqueta: a.etiqueta, ruta: a.ruta })),
          },
        ]
      : []),
  ]
}

/** Guardia de ruta: la URL directa a una pantalla de otro rol o sin permiso cae en Sin permiso. */
export function rutaPermitida(pathname: string, cuenta: Cuenta): boolean {
  if (pathname === '/mi-clave') return true
  if (cuenta.debe_cambiar_clave) return false
  if (pathname === '/') return true
  if (pathname.startsWith('/boletas/'))
    return (
      ['coordinacion', 'direccion'].includes(cuenta.base) &&
      tienePermiso(cuenta, 'documento_academico:ver')
    )
  const area = areaDeRuta(pathname)
  return area === null || visible(area, cuenta)
}

export interface Miga {
  etiqueta: string
  ruta: string
}

/** Tablero › Pantalla. Dentro de un grupo las migas las pone la propia página (periodo › grupo › sección). */
export function migasDeRuta(pathname: string): { completas: Miga[]; propias: Miga[] } {
  const area = areaDeRuta(pathname)
  if (!area || area.clave === 'tablero')
    return { completas: [{ etiqueta: 'Tablero', ruta: '/' }], propias: [] }
  const propias: Miga[] = [{ etiqueta: area.etiqueta, ruta: area.ruta }]
  return { completas: [{ etiqueta: 'Tablero', ruta: '/' }, ...propias], propias }
}
