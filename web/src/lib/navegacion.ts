/**
 * Pantallas del sistema por rol (especificación, sección 6). De aquí se alimentan el menú lateral,
 * las migas y el buscador, para no mantener listas que se desincronizan. El servidor valida el
 * permiso de cada petición; esto solo decide qué se ofrece a cada rol.
 */
import {
  BookOpenCheck,
  ClipboardCheck,
  FileArchive,
  FolderClock,
  GraduationCap,
  History,
  House,
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
    clave: 'inicio',
    etiqueta: 'Inicio',
    descripcion: 'Lo que espera tu atención hoy.',
    icono: House,
    ruta: '/',
    roles: ['coordinacion'],
    permiso: 'cierre:ver',
  },
  {
    clave: 'grupos',
    etiqueta: 'Grupos y listas',
    descripcion: 'Lista vigente de cada grupo, altas y bajas.',
    icono: UsersRound,
    ruta: '/grupos',
    roles: ['coordinacion', 'direccion'],
    permiso: 'inscripcion_grupo:ver',
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
    roles: ['coordinacion', 'direccion'],
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

/** Primera pantalla del menú de la cuenta: a donde cae después de entrar. */
export function rutaInicial(cuenta: Cuenta): string {
  if (cuenta.debe_cambiar_clave) return '/mi-clave'
  // Dirección empieza por lo que tiene que resolver.
  if (
    cuenta.base === 'direccion' &&
    areasVisibles(cuenta).some((a) => a.clave === 'autorizaciones')
  )
    return '/autorizaciones'
  return areasVisibles(cuenta)[0]?.ruta ?? '/mi-clave'
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

/** Inicio › Pantalla; para coordinación la miga raíz es Inicio, para los demás su primera pantalla. */
export function migasDeRuta(pathname: string): { completas: Miga[]; propias: Miga[] } {
  const area = areaDeRuta(pathname)
  if (!area || area.clave === 'inicio')
    return { completas: [{ etiqueta: 'Inicio', ruta: '/' }], propias: [] }
  const propias: Miga[] = [{ etiqueta: area.etiqueta, ruta: area.ruta }]
  return { completas: [{ etiqueta: 'Inicio', ruta: '/' }, ...propias], propias }
}
