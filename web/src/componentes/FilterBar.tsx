import { useState, type ReactNode } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type OpcionFiltro = { valor: string; etiqueta: string; conteo?: number }

export interface FiltroBarra {
  id: string
  etiqueta: string
  valor: string
  opciones: OpcionFiltro[]
  onCambio: (valor: string) => void
}

/**
 * Búsqueda + selects con revelado progresivo: al inicio solo lo importante,
 * el resto detrás de "Más filtros". Los filtros activos se ven siempre como
 * chips removibles; si no se puede saber por qué la tabla quedó vacía, el
 * filtro está mal presentado. Quien la usa manda el estado (típicamente desde
 * la URL con useSearchParams): así un enlace compartido reproduce la misma vista.
 */
export function FilterBar({
  busqueda,
  onBusqueda,
  placeholder = 'Buscar',
  filtros = [],
  avanzados,
  acciones,
  onLimpiarTodo,
}: {
  busqueda: string
  onBusqueda: (valor: string) => void
  placeholder?: string
  filtros?: FiltroBarra[]
  avanzados?: ReactNode
  acciones?: ReactNode
  /** Limpia búsqueda y filtros en un solo paso atómico. Si no se da, cada
   * filtro se limpia con su propio onCambio (puede pisarse si el estado
   * viene de useSearchParams, donde cada llamada parte del mismo valor
   * previo). Pásalo siempre que el estado viva en la URL. */
  onLimpiarTodo?: () => void
}) {
  const [verAvanzados, setVerAvanzados] = useState(false)

  const activos = filtros.filter((f) => f.valor && f.valor !== 'todos')
  const hayAlgo = activos.length > 0 || busqueda.trim() !== ''

  function limpiarTodo() {
    if (onLimpiarTodo) {
      onLimpiarTodo()
      return
    }
    onBusqueda('')
    for (const f of filtros) f.onCambio('todos')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3"
            strokeWidth={2.4}
            aria-hidden="true"
          />
          <Input
            type="search"
            className="pl-8"
            placeholder={placeholder}
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            aria-label={placeholder}
          />
        </div>

        {filtros.map((f) => (
          <Select key={f.id} value={f.valor} onValueChange={f.onCambio}>
            <SelectTrigger aria-label={f.etiqueta} className="min-w-40">
              <SelectValue placeholder={f.etiqueta} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">{f.etiqueta}: todos</SelectItem>
              {f.opciones.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.etiqueta}
                  {o.conteo !== undefined ? ` (${o.conteo})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {avanzados ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={verAvanzados}
            onClick={() => setVerAvanzados((v) => !v)}
          >
            <SlidersHorizontal strokeWidth={2.4} aria-hidden="true" />
            Más filtros
          </Button>
        ) : null}

        {acciones ? <div className="ml-auto flex gap-2">{acciones}</div> : null}
      </div>

      {verAvanzados && avanzados ? (
        <div className="rounded-lg border border-line bg-card p-4">{avanzados}</div>
      ) : null}

      {hayAlgo ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-3">Filtros activos:</span>
          {busqueda.trim() !== '' ? (
            <Chip etiqueta={`Búsqueda: ${busqueda}`} onQuitar={() => onBusqueda('')} />
          ) : null}
          {activos.map((f) => (
            <Chip
              key={f.id}
              etiqueta={`${f.etiqueta}: ${f.opciones.find((o) => o.valor === f.valor)?.etiqueta ?? f.valor}`}
              onQuitar={() => f.onCambio('todos')}
            />
          ))}
          <button
            type="button"
            onClick={limpiarTodo}
            className="text-xs font-medium text-brand hover:underline"
          >
            Limpiar todo
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Chip({ etiqueta, onQuitar }: { etiqueta: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
      {etiqueta}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar filtro ${etiqueta}`}
        className="rounded-full hover:opacity-60"
      >
        <X className="size-3" strokeWidth={2.6} aria-hidden="true" />
      </button>
    </span>
  )
}
