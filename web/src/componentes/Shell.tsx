/**
 * Armazón del sistema, layout lateral: sidebar de tres anchos (drawer en móvil, 72px de iconos
 * en md, 256px en lg con colapso manual a iconos, y cierre completo a ancho 0 que se recuerda).
 * Aquí vive el guardia de ruta: la URL directa a la pantalla de otro rol cae en SinPermiso.
 */
import {
  KeyRound,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Rows3,
  Search,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { GuiaPantalla } from '@/componentes/GuiaPantalla'
import { Migas } from '@/componentes/Migas'
import { salirDeVerComo } from '@/lib/api'
import { useAccion } from '@/lib/datos'
import { areasVisibles, areaDeRuta, rutaPermitida } from '@/lib/navegacion'
import { useSesion } from '@/lib/sesion'
import { cn } from '@/lib/utils'
import { SinPermiso } from '@/paginas/SinPermiso'

const CLAVE_DENSIDAD = 'elevalia.densidad'
const CLAVE_TEMA = 'elevalia.tema'
const CLAVE_MENU_CERRADO = 'elevalia.menu-cerrado'

function leerDensidad(): 'comoda' | 'compacta' {
  try {
    return localStorage.getItem(CLAVE_DENSIDAD) === 'compacta' ? 'compacta' : 'comoda'
  } catch {
    return 'comoda'
  }
}

function leerTemaOscuro(): boolean {
  try {
    return localStorage.getItem(CLAVE_TEMA) === 'oscuro'
  } catch {
    return false
  }
}

function leerMenuCerrado(): boolean {
  try {
    return localStorage.getItem(CLAVE_MENU_CERRADO) === '1'
  } catch {
    return false
  }
}

const CLASES_ENLACE =
  'flex min-h-11 items-center gap-3 rounded-md border-l-[3px] px-4 text-sm transition-colors duration-ui md:flex-col md:justify-center md:gap-0.5 md:px-1 lg:flex-row lg:justify-start lg:gap-3 lg:px-4'
const CLASES_ACTIVO = 'border-l-white bg-white/12 font-medium text-nav-on'
const CLASES_INACTIVO = 'border-l-transparent text-nav-txt hover:bg-white/8 hover:text-nav-on'

function ContenidoNavegacion({
  colapsado,
  alSeleccionar,
  mostrarCerrar,
  cerrarBtnRef,
}: {
  colapsado: boolean
  alSeleccionar?: () => void
  mostrarCerrar?: boolean
  cerrarBtnRef?: RefObject<HTMLButtonElement | null>
}) {
  const { sesion } = useSesion()
  const ubicacion = useLocation()
  const areas = areasVisibles(sesion)
  const areaActiva = areaDeRuta(ubicacion.pathname)

  return (
    <div className="flex h-full flex-col bg-nav text-nav-txt">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-nav-3 px-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-white/15 text-sm font-bold">
          EJ
        </div>
        {!colapsado ? (
          <span className="truncate font-semibold tracking-tight md:hidden lg:inline">
            Escuela Judicial
          </span>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-3" aria-label="Principal">
        {areas.map((area) => {
          const Icono = area.icono
          const activa = areaActiva?.clave === area.clave
          return (
            <div key={area.clave}>
              <Link
                to={area.ruta}
                onClick={alSeleccionar}
                aria-current={activa ? 'page' : undefined}
                title={area.etiqueta}
                className={cn(CLASES_ENLACE, activa ? CLASES_ACTIVO : CLASES_INACTIVO)}
              >
                <Icono strokeWidth={2.4} aria-hidden="true" className="size-5 shrink-0" />
                {colapsado ? (
                  <span className="sr-only">{area.etiqueta}</span>
                ) : (
                  <span className="truncate md:sr-only lg:not-sr-only lg:text-sm">
                    {area.etiqueta}
                  </span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-nav-3 p-2">
        <button
          type="button"
          onClick={() => document.dispatchEvent(new CustomEvent('colapsar-sidebar'))}
          className="hidden min-h-11 w-full items-center gap-3 rounded-md px-2 text-sm text-nav-txt hover:bg-white/8 lg:flex"
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          {colapsado ? (
            <PanelLeft className="size-5" strokeWidth={2.4} />
          ) : (
            <PanelLeftClose className="size-5" strokeWidth={2.4} />
          )}
          {!colapsado ? <span>Colapsar</span> : null}
        </button>
        {mostrarCerrar ? (
          <button
            ref={cerrarBtnRef}
            type="button"
            onClick={() => document.dispatchEvent(new CustomEvent('cerrar-sidebar'))}
            className="hidden min-h-11 w-full items-center gap-3 rounded-md px-2 text-sm text-nav-txt hover:bg-white/8 md:flex"
            aria-label="Cerrar menú"
          >
            <X className="size-5 shrink-0" strokeWidth={2.4} />
            <span className={cn('truncate', colapsado ? 'sr-only' : 'md:hidden lg:inline')}>
              Cerrar menú
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Franja fija de la vista "Ver como": dice a quién se mira, que es solo lectura y deja salir. */
function FranjaVerComo() {
  const { sesion, recargar } = useSesion()
  const navegar = useNavigate()
  const salir = useAccion(() => salirDeVerComo(), {
    exito: () => 'Saliste de la vista',
    alExito: () => {
      void recargar().then(() => navegar('/usuarios'))
    },
  })
  if (!sesion?.solo_lectura) return null
  return (
    <div
      role="status"
      data-no-imprimir
      className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 bg-ink px-4 text-sm text-white sm:h-11 sm:px-6"
    >
      <p className="line-clamp-2 min-w-0 leading-tight">
        Estás viendo el sistema como <strong>{sesion.nombre}</strong> ({sesion.rol_nombre}). Solo
        lectura.
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0"
        disabled={salir.ocupado}
        onClick={() => salir.ejecutar(undefined)}
      >
        Salir de la vista
      </Button>
    </div>
  )
}

export function Shell() {
  const { sesion, salir, cargando } = useSesion()
  const ubicacion = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [colapsado, setColapsado] = useState(false)
  const [cerrado, setCerrado] = useState(leerMenuCerrado)
  const [densidad, setDensidad] = useState<'comoda' | 'compacta'>(leerDensidad)
  const [oscuro, setOscuro] = useState(leerTemaOscuro)
  const abrirMenuBtnRef = useRef<HTMLButtonElement>(null)
  const cerrarMenuBtnRef = useRef<HTMLButtonElement>(null)
  const esPrimerRenderCerrado = useRef(true)

  // Al cambiar cerrado (no en el primer render) el botón que disparó el toggle
  // se desmonta y el foco cae a body; se manda al botón que aparece en su lugar.
  useEffect(() => {
    if (esPrimerRenderCerrado.current) {
      esPrimerRenderCerrado.current = false
      return
    }
    if (cerrado) {
      abrirMenuBtnRef.current?.focus()
    } else {
      cerrarMenuBtnRef.current?.focus()
    }
  }, [cerrado])

  useEffect(() => {
    document.documentElement.dataset.densidad = densidad
  }, [densidad])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
  }, [oscuro])

  useEffect(() => {
    function alColapsar() {
      setColapsado((v) => !v)
    }
    document.addEventListener('colapsar-sidebar', alColapsar)
    return () => document.removeEventListener('colapsar-sidebar', alColapsar)
  }, [])

  useEffect(() => {
    function alCerrar() {
      setCerrado((previo) => {
        const nuevo = !previo
        try {
          localStorage.setItem(CLAVE_MENU_CERRADO, nuevo ? '1' : '0')
        } catch {
          // Sin storage disponible: el toggle sigue funcionando, solo no se recuerda.
        }
        return nuevo
      })
    }
    document.addEventListener('cerrar-sidebar', alCerrar)
    return () => document.removeEventListener('cerrar-sidebar', alCerrar)
  }, [])

  // Mientras se resuelve la sesión (recarga o URL directa) no se decide nada:
  // redirigir antes de tiempo era el bug real, no una teoría. Se descubrió
  // porque una URL directa a /configuracion como vendedor rebotaba a Inicio
  // en vez de caer en Sin permiso: sesion todavía era null por estar cargando,
  // no por no haber sesión.
  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper" role="status">
        <span className="sr-only">Cargando</span>
      </div>
    )
  }
  if (!sesion) return <Navigate to="/entrar" replace state={{ desde: ubicacion }} />
  // Con contraseña temporal solo se puede cambiarla: el servidor rechaza todo lo demás.
  if (sesion.debe_cambiar_clave && ubicacion.pathname !== '/mi-clave')
    return <Navigate to="/mi-clave" replace />

  function alternarDensidad() {
    const nueva = densidad === 'comoda' ? 'compacta' : 'comoda'
    setDensidad(nueva)
    try {
      localStorage.setItem(CLAVE_DENSIDAD, nueva)
    } catch {
      // Sin storage disponible: el toggle sigue funcionando, solo no se recuerda.
    }
  }

  function alternarTema() {
    const nuevo = !oscuro
    setOscuro(nuevo)
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo ? 'oscuro' : 'claro')
    } catch {
      // Igual que la densidad: funciona en la sesión aunque no se recuerde.
    }
  }

  const puedeVerRuta = rutaPermitida(ubicacion.pathname, sesion)
  const contenido = puedeVerRuta ? <Outlet /> : <SinPermiso />

  const menuUsuario = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`Cuenta de ${sesion.nombre}`}>
          <UserRound strokeWidth={2.4} aria-hidden="true" />
          <span className="hidden max-w-32 truncate md:inline">{sesion.nombre}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {sesion.nombre}
          <span className="block text-xs font-normal text-ink-3">{sesion.rol_nombre}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/mi-clave">
            <KeyRound strokeWidth={2.4} aria-hidden="true" />
            Mi contraseña
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={alternarDensidad}>
          <Rows3 strokeWidth={2.4} aria-hidden="true" />
          Densidad: {densidad === 'comoda' ? 'Cómoda' : 'Compacta'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={alternarTema}>
          {oscuro ? (
            <Sun strokeWidth={2.4} aria-hidden="true" />
          ) : (
            <Moon strokeWidth={2.4} aria-hidden="true" />
          )}
          Modo {oscuro ? 'claro' : 'oscuro'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void salir()}>
          <LogOut strokeWidth={2.4} aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const saltoAlContenido = (
    <a
      href="#contenido-principal"
      className="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform focus-visible:translate-y-0"
    >
      Saltar al contenido
    </a>
  )

  return (
    <div
      className={cn(
        'min-h-dvh overflow-x-clip bg-paper',
        sesion.solo_lectura && '[--franja:4rem] sm:[--franja:2.75rem]',
      )}
    >
      {saltoAlContenido}
      {sesion.solo_lectura ? <FranjaVerComo /> : null}

      <aside
        className={cn(
          'fixed top-[var(--franja,0px)] bottom-0 left-0 z-40 hidden overflow-hidden transition-[width] duration-ui md:block',
          cerrado ? 'md:w-0' : colapsado ? 'md:w-[72px] lg:w-16' : 'md:w-[72px] lg:w-64',
        )}
      >
        {!cerrado ? (
          <ContenidoNavegacion
            colapsado={colapsado}
            mostrarCerrar
            cerrarBtnRef={cerrarMenuBtnRef}
          />
        ) : null}
      </aside>

      <div
        className={cn(
          !cerrado && 'md:pl-[72px]',
          !cerrado && (colapsado ? 'lg:pl-16' : 'lg:pl-64'),
        )}
      >
        <header className="sticky top-[var(--franja,0px)] z-30 flex h-16 items-center gap-3 border-b border-line bg-paper px-4 md:hidden">
          <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
            <SheetContent side="left" className="w-64 border-nav-3 bg-nav p-0 text-nav-txt">
              <SheetHeader className="sr-only">
                <SheetTitle>Navegación</SheetTitle>
                <SheetDescription>Secciones disponibles del sistema.</SheetDescription>
              </SheetHeader>
              <ContenidoNavegacion colapsado={false} alSeleccionar={() => setMenuAbierto(false)} />
            </SheetContent>
          </Sheet>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Abrir navegación"
            onClick={() => setMenuAbierto(true)}
          >
            <Menu strokeWidth={2.4} />
          </Button>
          <Migas />
        </header>

        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 sm:px-6 md:px-8">
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            {cerrado ? (
              <Button
                ref={abrirMenuBtnRef}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Abrir menú"
                onClick={() => document.dispatchEvent(new CustomEvent('cerrar-sidebar'))}
              >
                <Menu strokeWidth={2.4} />
              </Button>
            ) : null}
            <Migas />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Buscar en el sistema"
              onClick={() => window.dispatchEvent(new CustomEvent('abrir-buscador'))}
            >
              <Search strokeWidth={2.4} aria-hidden="true" />
              <span className="hidden sm:inline">Buscar (⌘K)</span>
              <span className="sr-only sm:hidden">Buscar</span>
            </Button>
            <GuiaPantalla />
            {menuUsuario}
          </div>
        </header>

        {sesion.datos_ficticios ? (
          <p
            data-no-imprimir
            className="border-b border-line bg-brand-soft px-4 py-1.5 text-center text-xs font-semibold tracking-[0.08em] text-brand-deep uppercase sm:px-6 md:px-8"
          >
            Prototipo · datos ficticios
          </p>
        ) : null}

        <main id="contenido-principal" className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8">
          {contenido}
        </main>
      </div>
    </div>
  )
}
