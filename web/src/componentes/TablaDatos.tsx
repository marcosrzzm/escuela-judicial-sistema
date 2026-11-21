/**
 * Tabla de datos única del sistema. Trae de fábrica lo que siempre se
 * reimplementa mal: cabecera fija, selección múltiple con acciones masivas,
 * ordenamiento por columna, fila operable por teclado, acciones por fila que
 * aparecen al hover y siempre visibles en táctil (no hay hover en un dedo),
 * skeleton con la forma real y tres vacíos distintos (nunca "no hay datos"
 * a secas: no es lo mismo estar vacío que estar filtrado, o sin permiso).
 */
import {
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Inbox,
  Lock,
  SearchX,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type Alineacion = 'izquierda' | 'centro' | 'derecha'

export interface ColumnaTabla<T> {
  clave: string
  encabezado: string
  alineacion?: Alineacion
  numerica?: boolean
  ordenable?: boolean
  className?: string
  /** Columna de menor prioridad: se oculta en pantallas angostas para que la tabla quepa sin scroll lateral. */
  ocultarEnMovil?: boolean
  render?: (fila: T) => ReactNode
}

export interface OrdenTabla {
  clave: string
  direccion: 'asc' | 'desc'
}

export interface VacioTabla {
  variante: 'vacio' | 'sinResultados' | 'sinPermiso'
  titulo: string
  descripcion: string
  accion?: ReactNode
}

interface PropiedadesTabla<T> {
  columnas: ColumnaTabla<T>[]
  filas: T[]
  claveFila: (fila: T) => string | number
  descripcion: string
  cargando?: boolean
  pagina?: number
  paginas?: number
  total?: number
  onPagina?: (pagina: number) => void
  onFilaClic?: (fila: T) => void
  orden?: OrdenTabla
  onOrdenar?: (clave: string) => void
  accionesFila?: (fila: T) => ReactNode
  /** Selección múltiple: si se pasa, aparece la columna de checkbox y la barra masiva. */
  seleccionados?: Set<string | number>
  onSeleccionar?: (id: string | number, marcado: boolean) => void
  onSeleccionarTodos?: (marcado: boolean) => void
  accionesMasivas?: (ids: (string | number)[]) => ReactNode
  vacio?: VacioTabla
}

const alineaciones: Record<Alineacion, string> = {
  izquierda: 'text-left',
  centro: 'text-center',
  derecha: 'text-right',
}

function claseAlineacion<T>(columna: ColumnaTabla<T>): string {
  return alineaciones[columna.alineacion ?? (columna.numerica ? 'derecha' : 'izquierda')]
}

const iconoVacio = { vacio: Inbox, sinResultados: SearchX, sinPermiso: Lock } as const

export function TablaDatos<T>({
  columnas,
  filas,
  claveFila,
  descripcion,
  cargando = false,
  pagina = 1,
  paginas = 1,
  total,
  onPagina,
  onFilaClic,
  orden,
  onOrdenar,
  accionesFila,
  seleccionados,
  onSeleccionar,
  onSeleccionarTodos,
  accionesMasivas,
  vacio,
}: PropiedadesTabla<T>) {
  const conSeleccion = seleccionados !== undefined && onSeleccionar !== undefined
  const idsVisibles = filas.map(claveFila)
  const todasMarcadas =
    conSeleccion && idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados!.has(id))
  const algunaMarcada = conSeleccion && idsVisibles.some((id) => seleccionados!.has(id))
  const idsSeleccionados = conSeleccion ? [...seleccionados!] : []

  if (cargando) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-card">
        <div className="flex flex-col gap-2 p-3" role="status" aria-live="polite">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
          <span className="sr-only">Cargando información</span>
        </div>
      </div>
    )
  }

  if (filas.length === 0 && vacio) {
    const Icono = iconoVacio[vacio.variante]
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-paper-2">
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Icono strokeWidth={2.4} className="size-6 text-ink-4" aria-hidden="true" />
          <p className="text-base font-semibold text-ink">{vacio.titulo}</p>
          <p className="max-w-md text-sm leading-relaxed text-ink-3">{vacio.descripcion}</p>
          {vacio.accion}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {conSeleccion && algunaMarcada ? (
        <div className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2">
          <span className="text-sm font-medium text-brand num">
            {idsSeleccionados.length} seleccionado(s)
          </span>
          <div className="ml-auto flex gap-2">{accionesMasivas?.(idsSeleccionados)}</div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-line bg-card">
        <div className="max-h-[65vh] overflow-y-auto overflow-x-auto">
          <Table className="min-w-full">
            <TableCaption className="sr-only">{descripcion}</TableCaption>
            <TableHeader>
              <TableRow className="sticky top-0 z-10 bg-paper-2 hover:bg-paper-2">
                {conSeleccion ? (
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Seleccionar todas las filas visibles"
                      checked={todasMarcadas}
                      onCheckedChange={(marcado) => onSeleccionarTodos?.(marcado === true)}
                    />
                  </TableHead>
                ) : null}
                {columnas.map((columna) => {
                  const activa = orden?.clave === columna.clave
                  const ariaSort = !columna.ordenable
                    ? undefined
                    : activa
                      ? orden!.direccion === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  return (
                    <TableHead
                      key={columna.clave}
                      scope="col"
                      aria-sort={ariaSort}
                      className={cn(
                        'text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase',
                        claseAlineacion(columna),
                        columna.ocultarEnMovil && 'hidden sm:table-cell',
                        columna.className,
                      )}
                    >
                      {columna.ordenable && onOrdenar ? (
                        <button
                          type="button"
                          onClick={() => onOrdenar(columna.clave)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-sm hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                            columna.numerica && 'flex-row-reverse',
                          )}
                        >
                          {columna.encabezado}
                          {activa ? (
                            orden!.direccion === 'asc' ? (
                              <ArrowUp className="size-3" strokeWidth={2.4} aria-hidden="true" />
                            ) : (
                              <ArrowDown className="size-3" strokeWidth={2.4} aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown
                              className="size-3 opacity-40"
                              strokeWidth={2.4}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ) : (
                        columna.encabezado
                      )}
                    </TableHead>
                  )
                })}
                {accionesFila ? (
                  <TableHead className="text-right whitespace-normal">Acciones</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => {
                const id = claveFila(fila)
                const marcada = conSeleccion && seleccionados!.has(id)
                return (
                  <TableRow
                    key={id}
                    data-selec={marcada}
                    className={cn(
                      'group',
                      onFilaClic &&
                        'cursor-pointer focus-visible:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                    )}
                    tabIndex={onFilaClic ? 0 : undefined}
                    onClick={onFilaClic ? () => onFilaClic(fila) : undefined}
                    onKeyDown={
                      onFilaClic
                        ? (evento) => {
                            if (evento.key !== 'Enter' && evento.key !== ' ') return
                            evento.preventDefault()
                            onFilaClic(fila)
                          }
                        : undefined
                    }
                  >
                    {conSeleccion ? (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label="Seleccionar fila"
                          checked={marcada}
                          onCheckedChange={(v) => onSeleccionar!(id, v === true)}
                        />
                      </TableCell>
                    ) : null}
                    {columnas.map((columna) => (
                      <TableCell
                        key={columna.clave}
                        className={cn(
                          'whitespace-normal',
                          claseAlineacion(columna),
                          columna.numerica && 'num',
                          columna.ocultarEnMovil && 'hidden sm:table-cell',
                          columna.className,
                        )}
                      >
                        {columna.render
                          ? columna.render(fila)
                          : String((fila as Record<string, unknown>)[columna.clave] ?? '')}
                      </TableCell>
                    ))}
                    {accionesFila ? (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end">
                          {accionesFila(fila)}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {onPagina && paginas > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <p className="text-xs text-ink-3 num">
              Página {pagina} de {paginas}
              {total !== undefined ? ` · ${total} registros` : ''}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onPagina(pagina - 1)}
                disabled={pagina <= 1}
                aria-label="Página anterior"
              >
                <ChevronLeft strokeWidth={2.4} aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onPagina(pagina + 1)}
                disabled={pagina >= paginas}
                aria-label="Página siguiente"
              >
                <ChevronRight strokeWidth={2.4} aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
