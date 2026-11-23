/**
 * Armazón del sistema (especificación, 11.1): barra global angosta y oscura a la izquierda con la marca,
 * la cuenta, Tablero, Grupos, Calendario, Avisos y lo propio del rol; Ayuda y una flecha para contraer al
 * fondo. En celular, un menú inferior de cinco íconos. Aquí vive el guardia de ruta: la URL directa a la
 * pantalla de otro rol cae en SinPermiso.
 */
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Ellipsis,
  LogOut,
  Moon,
  Rows3,
  Search,
  Sun,
  UserRound,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { BandejaRapida, IconoAvisos, useNoLeidos } from '@/componentes/Avisos'
import { GuiaPantalla } from '@/componentes/GuiaPantalla'
import { Migas } from '@/componentes/Migas'
import { fijarTema, salirDeVerComo } from '@/lib/api'
import { useAccion } from '@/lib/datos'
import { ProveedorMigas } from '@/lib/migas'
import { areaDeRuta, itemsRail, rutaPermitida, type ItemRail } from '@/lib/navegacion'
import { ContextoPreferencias, usePreferencias, type Preferencias } from '@/lib/preferencias'
import { useSesion } from '@/lib/sesion'
import { cn } from '@/lib/utils'
import { SinPermiso } from '@/paginas/SinPermiso'

const CLAVE_DENSIDAD = 'elevalia.densidad'
const CLAVE_TEMA = 'elevalia.tema'
const CLAVE_RAIL = 'elevalia.rail-compacto'

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin storage disponible: el cambio funciona en la sesión aunque no se recuerde.
  }
}

// El elemento activo se marca con una regla fina de 2 px a la izquierda (no mueve el texto), un fondo
// apenas más claro y el texto en negrita. Sin degradados ni sombras.
const BASE_RAIL =
  "relative flex w-full flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[10.5px] leading-tight transition-colors duration-ui before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:content-[''] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nav-acento"
const ACTIVO_RAIL = 'bg-nav-2 font-semibold text-nav-on before:bg-nav-acento'
const INACTIVO_RAIL = 'text-nav-txt hover:bg-nav-2 hover:text-nav-on'

function Insignia({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span
      className="absolute top-1.5 right-3 grid min-w-4 place-items-center rounded-full bg-nav-acento px-1 text-[10px] leading-4 font-bold text-ink num"
      aria-label={`${n} sin leer`}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

function Contenido({
  item,
  compacto,
}: {
  item: Pick<ItemRail, 'icono' | 'etiqueta'>
  compacto: boolean
}) {
  const Icono = item.icono
  return (
    <>
      <Icono strokeWidth={2} aria-hidden="true" className="size-[22px] shrink-0" />
      <span className={cn('max-w-full truncate', compacto && 'sr-only')}>{item.etiqueta}</span>
    </>
  )
}

function Rail({ compacto, alternar }: { compacto: boolean; alternar: () => void }) {
  const { sesion, salir } = useSesion()
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const prefs = usePreferencias()
  const noLeidos = useNoLeidos()
  const [avisosAbiertos, setAvisosAbiertos] = useState(false)
  const items = itemsRail(sesion)
  const area = areaDeRuta(ubicacion.pathname)
  const activo = (i: ItemRail) =>
    i.hijos
      ? i.hijos.some((h) => ubicacion.pathname.startsWith(h.ruta))
      : i.ruta === '/'
        ? ubicacion.pathname === '/'
        : ubicacion.pathname.startsWith(i.ruta) ||
          (i.clave === 'grupos' && area?.clave === 'asignaciones')
  if (!sesion) return null
  const iniciales = sesion.nombre
    .split(' ')
    .filter((p) => /^\p{L}/u.test(p) && !/\.$/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('')

  return (
    <div className="flex h-full flex-col bg-nav text-nav-txt">
      <div className="grid h-14 shrink-0 place-items-center border-b border-nav-3">
        <span
          className="font-serif text-xl font-semibold tracking-wide text-nav-on"
          title="Escuela Judicial"
        >
          EJ
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto py-1" aria-label="Principal">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(BASE_RAIL, INACTIVO_RAIL)}
              aria-label={`Cuenta de ${sesion.nombre}`}
            >
              <span className="grid size-[22px] place-items-center rounded-full bg-nav-3 text-[10px] font-bold text-nav-on">
                {iniciales || <UserRound className="size-3.5" aria-hidden="true" />}
              </span>
              <span className={cn(compacto && 'sr-only')}>Cuenta</span>
            </button>
          </DropdownMenuTrigger>
          <MenuCuenta lado="right" prefs={prefs} salir={() => void salir()} />
        </DropdownMenu>

        {items.map((item) => {
          const esActivo = activo(item)
          const clases = cn(BASE_RAIL, esActivo ? ACTIVO_RAIL : INACTIVO_RAIL)
          if (item.hijos) {
            return (
              <DropdownMenu key={item.clave}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={clases}
                    aria-current={esActivo ? 'page' : undefined}
                  >
                    <Contenido item={item} compacto={compacto} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56">
                  <DropdownMenuLabel>{item.etiqueta}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {item.hijos.map((h) => (
                    <DropdownMenuItem key={h.ruta} asChild>
                      <Link to={h.ruta}>{h.etiqueta}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
          if (item.clave === 'avisos') {
            return (
              <Popover key={item.clave} open={avisosAbiertos} onOpenChange={setAvisosAbiertos}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={clases}
                    aria-current={esActivo ? 'page' : undefined}
                  >
                    <Contenido
                      item={{ icono: IconoAvisos, etiqueta: item.etiqueta }}
                      compacto={compacto}
                    />
                    <Insignia n={noLeidos} />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start">
                  <BandejaRapida alNavegar={() => setAvisosAbiertos(false)} />
                </PopoverContent>
              </Popover>
            )
          }
          return (
            <Link
              key={item.clave}
              to={item.ruta}
              aria-current={esActivo ? 'page' : undefined}
              className={clases}
              title={item.etiqueta}
            >
              <Contenido item={item} compacto={compacto} />
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-nav-3">
        <button
          type="button"
          className={cn(BASE_RAIL, INACTIVO_RAIL)}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('abrir-guia'))
            if (!document.querySelector('[data-guia-disponible]')) void navegar('/cuenta')
          }}
        >
          <Contenido item={{ icono: CircleHelp, etiqueta: 'Ayuda' }} compacto={compacto} />
        </button>
        <button
          type="button"
          onClick={alternar}
          className={cn(BASE_RAIL, INACTIVO_RAIL, 'hidden md:flex')}
          aria-label={compacto ? 'Expandir la barra' : 'Contraer la barra'}
        >
          {compacto ? (
            <ChevronsRight strokeWidth={2} className="size-5" aria-hidden="true" />
          ) : (
            <ChevronsLeft strokeWidth={2} className="size-5" aria-hidden="true" />
          )}
          <span className="sr-only">{compacto ? 'Expandir' : 'Contraer'}</span>
        </button>
      </div>
    </div>
  )
}

function MenuCuenta({
  lado,
  prefs,
  salir,
}: {
  lado: 'right' | 'top'
  prefs: Preferencias
  salir: () => void
}) {
  const { sesion } = useSesion()
  if (!sesion) return null
  return (
    <DropdownMenuContent side={lado} align="start" className="w-60">
      <DropdownMenuLabel>
        {sesion.nombre}
        <span className="block text-xs font-normal text-ink-3">{sesion.rol_nombre}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/cuenta">
          <UserRound strokeWidth={2.4} aria-hidden="true" />
          Mi cuenta
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={prefs.alternarDensidad}>
        <Rows3 strokeWidth={2.4} aria-hidden="true" />
        Densidad: {prefs.densidad === 'comoda' ? 'Cómoda' : 'Compacta'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={prefs.alternarTema}>
        {prefs.oscuro ? (
          <Sun strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Moon strokeWidth={2.4} aria-hidden="true" />
        )}
        Modo {prefs.oscuro ? 'claro' : 'oscuro'}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={salir}>
        <LogOut strokeWidth={2.4} aria-hidden="true" />
        Cerrar sesión
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/** Menú inferior de celular: los cuatro primeros elementos y "Más" con todo lo demás. */
function BarraMovil() {
  const { sesion, salir } = useSesion()
  const ubicacion = useLocation()
  const prefs = usePreferencias()
  const noLeidos = useNoLeidos()
  const [masAbierto, setMasAbierto] = useState(false)
  const items = itemsRail(sesion)
  const principales = items
    .filter((i) =>
      ['tablero', 'grupos', 'lotes', 'calendario', 'avisos', 'historial'].includes(i.clave),
    )
    .slice(0, 4)
  const resto = items.filter((i) => !principales.includes(i))
  if (!sesion) return null
  const clases = (a: boolean) =>
    cn(
      "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] leading-tight before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:content-[''] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nav-acento",
      a ? 'font-semibold text-nav-on before:bg-nav-acento' : 'text-nav-txt',
    )
  return (
    <>
      <nav
        aria-label="Principal"
        data-no-imprimir
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-nav-3 bg-nav pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {principales.map((i) => {
          const Icono = i.icono
          const activo =
            i.ruta === '/' ? ubicacion.pathname === '/' : ubicacion.pathname.startsWith(i.ruta)
          return (
            <Link
              key={i.clave}
              to={i.ruta}
              className={clases(activo)}
              aria-current={activo ? 'page' : undefined}
            >
              <Icono strokeWidth={2} className="size-[22px]" aria-hidden="true" />
              {i.clave === 'avisos' ? <Insignia n={noLeidos} /> : null}
              {i.etiqueta}
            </Link>
          )
        })}
        <button type="button" className={clases(masAbierto)} onClick={() => setMasAbierto(true)}>
          <Ellipsis strokeWidth={2} className="size-[22px]" aria-hidden="true" />
          Más
        </button>
      </nav>
      <Sheet open={masAbierto} onOpenChange={setMasAbierto}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sesion.nombre}</SheetTitle>
            <SheetDescription>{sesion.rol_nombre}</SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col px-2 pb-4 text-sm">
            <Fila ruta="/cuenta" etiqueta="Mi cuenta" alElegir={() => setMasAbierto(false)} />
            {resto.flatMap((i) =>
              i.hijos
                ? i.hijos.map((h) => (
                    <Fila
                      key={h.ruta}
                      ruta={h.ruta}
                      etiqueta={h.etiqueta}
                      alElegir={() => setMasAbierto(false)}
                    />
                  ))
                : [
                    <Fila
                      key={i.ruta}
                      ruta={i.ruta}
                      etiqueta={i.etiqueta}
                      alElegir={() => setMasAbierto(false)}
                    />,
                  ],
            )}
            <li>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left"
                onClick={prefs.alternarTema}
              >
                {prefs.oscuro ? (
                  <Sun className="size-4" aria-hidden="true" />
                ) : (
                  <Moon className="size-4" aria-hidden="true" />
                )}
                Modo {prefs.oscuro ? 'claro' : 'oscuro'}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left"
                onClick={() => {
                  setMasAbierto(false)
                  window.dispatchEvent(new CustomEvent('abrir-guia'))
                }}
              >
                <CircleHelp className="size-4" aria-hidden="true" />
                Ayuda
              </button>
            </li>
            <li>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-error"
                onClick={() => void salir()}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Cerrar sesión
              </button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}

function Fila({
  ruta,
  etiqueta,
  alElegir,
}: {
  ruta: string
  etiqueta: string
  alElegir: () => void
}) {
  return (
    <li>
      <Link to={ruta} onClick={alElegir} className="flex min-h-11 items-center gap-3 px-3">
        <BookOpen className="size-4 text-ink-3" aria-hidden="true" />
        {etiqueta}
      </Link>
    </li>
  )
}

/** Franja fija de la vista "Ver como": dice a quién se mira, que es solo lectura y deja salir. */
function FranjaVerComo() {
  const { sesion, recargar } = useSesion()
  const navegar = useNavigate()
  const salir = useAccion(() => salirDeVerComo(), {
    exito: () => 'Saliste de la vista',
    refrescar: false,
    alExito: () => {
      void recargar().then(() => navegar('/usuarios'))
    },
  })
  if (!sesion?.solo_lectura) return null
  return (
    <div
      role="status"
      data-no-imprimir
      className="sticky top-0 z-50 flex h-[5.5rem] flex-col items-start justify-center gap-1.5 bg-ink px-4 text-xs text-white sm:h-11 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:text-sm"
    >
      <p className="min-w-0 leading-tight">
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

export function Shell(): ReactNode {
  const { sesion, cargando } = useSesion()
  const ubicacion = useLocation()
  const [compacto, setCompacto] = useState(() => leer(CLAVE_RAIL) === '1')
  const [densidad, setDensidad] = useState<'comoda' | 'compacta'>(() =>
    leer(CLAVE_DENSIDAD) === 'compacta' ? 'compacta' : 'comoda',
  )
  const [oscuro, setOscuro] = useState(() => {
    const local = leer(CLAVE_TEMA)
    return local === null ? sesion?.preferencia_tema === 'oscuro' : local === 'oscuro'
  })
  const cuentaId = sesion?.id

  // Al entrar con otra cuenta sin preferencia guardada en este navegador, manda la de la cuenta.
  useEffect(() => {
    if (cuentaId !== undefined && leer(CLAVE_TEMA) === null && sesion?.preferencia_tema)
      setOscuro(sesion.preferencia_tema === 'oscuro')
  }, [cuentaId, sesion?.preferencia_tema])

  useEffect(() => {
    document.documentElement.dataset.densidad = densidad
  }, [densidad])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
  }, [oscuro])

  // Mientras se resuelve la sesión (recarga o URL directa) no se decide nada: antes de tiempo una URL
  // directa a otra pantalla rebotaría a Inicio en lugar de caer en Sin permiso.
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

  const prefs = {
    oscuro,
    alternarTema: () => {
      const nuevo = !oscuro
      setOscuro(nuevo)
      guardar(CLAVE_TEMA, nuevo ? 'oscuro' : 'claro')
      // En "Ver como" no se escribe nada: la preferencia solo cambia en este navegador.
      if (!sesion.solo_lectura) void fijarTema(nuevo ? 'oscuro' : 'claro')
    },
    densidad,
    alternarDensidad: () => {
      const nueva = densidad === 'comoda' ? 'compacta' : 'comoda'
      setDensidad(nueva)
      guardar(CLAVE_DENSIDAD, nueva)
    },
  }
  const puedeVerRuta = rutaPermitida(ubicacion.pathname, sesion)
  const sinRail = sesion.debe_cambiar_clave

  return (
    <ContextoPreferencias.Provider value={prefs}>
      <ProveedorMigas>
        <div
          className={cn(
            'min-h-dvh overflow-x-clip bg-paper',
            sesion.solo_lectura && '[--franja:5.5rem] sm:[--franja:2.75rem]',
          )}
        >
          <a
            href="#contenido-principal"
            className="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform focus-visible:translate-y-0"
          >
            Saltar al contenido
          </a>
          {sesion.solo_lectura ? <FranjaVerComo /> : null}

          {sinRail ? null : (
            <aside
              data-no-imprimir
              className={cn(
                'fixed top-[var(--franja,0px)] bottom-0 left-0 z-40 hidden transition-[width] duration-ui md:block',
                compacto ? 'w-14' : 'w-[84px]',
              )}
            >
              <Rail
                compacto={compacto}
                alternar={() => {
                  setCompacto(!compacto)
                  guardar(CLAVE_RAIL, compacto ? '0' : '1')
                }}
              />
            </aside>
          )}

          <div className={cn(!sinRail && (compacto ? 'md:pl-14' : 'md:pl-[84px]'))}>
            <header
              data-no-imprimir
              className="sticky top-[var(--franja,0px)] z-30 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 sm:px-6 md:px-8"
            >
              <Migas />
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

            <main
              id="contenido-principal"
              className="mx-auto w-full max-w-[96rem] p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-8"
            >
              {puedeVerRuta ? <Outlet /> : <SinPermiso />}
            </main>
          </div>

          {sinRail ? null : <BarraMovil />}
        </div>
      </ProveedorMigas>
    </ContextoPreferencias.Provider>
  )
}
