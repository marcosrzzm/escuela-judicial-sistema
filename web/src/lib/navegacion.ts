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
  ShieldCheck,
  Timer,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import type { Rol } from '@/lib/api'

export interface Area {
  clave: string
  etiqueta: string
  descripcion: string
  icono: LucideIcon
  ruta: string
  roles: Rol[]
}

export const AREAS: Area[] = [
  {
    clave: 'inicio',
    etiqueta: 'Inicio',
    descripcion: 'Lo que espera tu atención hoy.',
    icono: House,
    ruta: '/',
    roles: ['coordinacion'],
  },
  {
    clave: 'grupos',
    etiqueta: 'Grupos y listas',
    descripcion: 'Lista vigente de cada grupo, altas y bajas.',
    icono: UsersRound,
    ruta: '/grupos',
    roles: ['coordinacion'],
  },
  {
    clave: 'derecho',
    etiqueta: 'Derecho a evaluación',
    descripcion: 'Decisión de cada alumno en cada materia.',
    icono: Scale,
    ruta: '/derecho',
    roles: ['coordinacion'],
  },
  {
    clave: 'revision',
    etiqueta: 'Revisión de calificaciones',
    descripcion: 'Aceptar, devolver o reabrir las entregas de los docentes.',
    icono: ClipboardCheck,
    ruta: '/revision',
    roles: ['coordinacion'],
  },
  {
    clave: 'historial',
    etiqueta: 'Historial del alumno',
    descripcion: 'Materias por periodo y pendientes de cada alumno.',
    icono: GraduationCap,
    ruta: '/historial',
    roles: ['coordinacion'],
  },
  {
    clave: 'cierre',
    etiqueta: 'Cierre y lote',
    descripcion: 'Preparar el cierre, generar boletas y lote, ver el traspaso.',
    icono: PackageCheck,
    ruta: '/cierre',
    roles: ['coordinacion'],
  },
  {
    clave: 'metricas',
    etiqueta: 'Métricas',
    descripcion: 'Recapturas y tiempo activo, contra la línea base.',
    icono: Timer,
    ruta: '/metricas',
    roles: ['coordinacion'],
  },
  {
    clave: 'asignaciones',
    etiqueta: 'Mis asignaciones',
    descripcion: 'Tus materias y su entrega de calificaciones.',
    icono: BookOpenCheck,
    ruta: '/asignaciones',
    roles: ['docente'],
  },
  {
    clave: 'autorizaciones',
    etiqueta: 'Autorizaciones',
    descripcion: 'Decisiones y cierres que esperan tu resolución.',
    icono: ShieldCheck,
    ruta: '/autorizaciones',
    roles: ['direccion'],
  },
  {
    clave: 'lotes',
    etiqueta: 'Lotes recibidos',
    descripcion: 'Lotes aprobados para cargar en la plataforma oficial.',
    icono: FileArchive,
    ruta: '/lotes',
    roles: ['carga_externa'],
  },
  {
    clave: 'listas',
    etiqueta: 'Mis listas',
    descripcion: 'Lista vigente de tus grupos, para consultar e imprimir.',
    icono: ListChecks,
    ruta: '/listas',
    roles: ['auxiliar'],
  },
  {
    clave: 'bitacora',
    etiqueta: 'Bitácora',
    descripcion: 'Quién hizo qué, cuándo y por qué.',
    icono: History,
    ruta: '/bitacora',
    roles: ['coordinacion', 'direccion'],
  },
]

/** Icono para pantallas de detalle que no están en el menú. */
export const ICONO_DETALLE = FolderClock

function coincide(pathname: string, ruta: string): boolean {
  return ruta === '/' ? pathname === '/' : pathname === ruta || pathname.startsWith(`${ruta}/`)
}

export function areasVisibles(rol: Rol | undefined): Area[] {
  return rol ? AREAS.filter((a) => a.roles.includes(rol)) : []
}

export function areaDeRuta(pathname: string): Area | null {
  return AREAS.find((a) => coincide(pathname, a.ruta)) ?? null
}

/** Primera pantalla del menú de cada rol: a donde cae después de entrar. */
export function rutaInicial(rol: Rol): string {
  return areasVisibles(rol)[0]?.ruta ?? '/entrar'
}

/** Guardia de ruta: la URL directa a una pantalla de otro rol cae en Sin permiso. */
export function rutaPermitida(pathname: string, rol: Rol): boolean {
  if (pathname === '/') return true
  if (pathname.startsWith('/boletas/')) return rol === 'coordinacion' || rol === 'direccion'
  const area = areaDeRuta(pathname)
  return area === null || area.roles.includes(rol)
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
