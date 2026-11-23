/** Piezas de formulario y de presentación comunes a las pestañas del aula. */
import { Paperclip } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXTENSIONES, tamanoLegible, urlArchivo, type ArchivoRef } from '@/lib/aula'
import { cn } from '@/lib/utils'

const ETIQUETA = 'text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase'

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </Label>
      {children(id)}
      {ayuda ? <p className="text-xs text-ink-3">{ayuda}</p> : null}
    </div>
  )
}

export function Texto({ etiqueta, valor, alCambiar, tipo = 'text', ayuda, max = 160, deshabilitado }: {
  etiqueta: string
  valor: string
  alCambiar: (v: string) => void
  tipo?: 'text' | 'url' | 'number' | 'datetime-local'
  ayuda?: string
  max?: number
  deshabilitado?: boolean
}) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      {(id) => (
        <Input id={id} type={tipo} value={valor} maxLength={max} disabled={deshabilitado} onChange={(e) => alCambiar(e.target.value)} className={tipo === 'number' ? 'num' : undefined} />
      )}
    </Campo>
  )
}

export function Area({ etiqueta, valor, alCambiar, filas = 4, max = 20000, ayuda }: {
  etiqueta: string
  valor: string
  alCambiar: (v: string) => void
  filas?: number
  max?: number
  ayuda?: string
}) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      {(id) => (
        <textarea
          id={id}
          rows={filas}
          value={valor}
          maxLength={max}
          onChange={(e) => alCambiar(e.target.value)}
          className="min-h-20 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      )}
    </Campo>
  )
}

export function Lista({ etiqueta, valor, alCambiar, opciones }: {
  etiqueta: string
  valor: string
  alCambiar: (v: string) => void
  opciones: { valor: string; etiqueta: string }[]
}) {
  return (
    <Campo etiqueta={etiqueta}>
      {(id) => (
        <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand">
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      )}
    </Campo>
  )
}

export function Casilla({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: boolean; alCambiar: (v: boolean) => void }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-9 items-center gap-2 text-sm text-ink">
      <input id={id} type="checkbox" checked={valor} onChange={(e) => alCambiar(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
      {etiqueta}
    </label>
  )
}

/** Elegir un archivo; el aviso de tamaño y tipos va visible desde antes de elegir. */
export function CampoArchivo({ archivo, alCambiar, etiqueta = 'Archivo (opcional)' }: { archivo: File | null; alCambiar: (a: File | null) => void; etiqueta?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Campo etiqueta={etiqueta} ayuda="PDF, Word, Excel, PowerPoint, texto, JPG o PNG. Máximo 10 MB.">
      {(id) => (
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={id}
            ref={ref}
            type="file"
            accept={EXTENSIONES}
            onChange={(e) => alCambiar(e.target.files?.[0] ?? null)}
            className="block w-full max-w-full text-sm text-ink file:mr-3 file:min-h-9 file:rounded-lg file:border file:border-line-strong file:bg-card file:px-3 file:text-sm file:font-medium"
          />
          {archivo ? (
            <button type="button" className="text-xs text-brand underline" onClick={() => { alCambiar(null); if (ref.current) ref.current.value = '' }}>
              Quitar
            </button>
          ) : null}
        </div>
      )}
    </Campo>
  )
}

export function EnlaceArchivo({ archivo }: { archivo: ArchivoRef }) {
  return (
    <a href={urlArchivo(archivo.id)} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <Paperclip strokeWidth={2.4} className="size-4" aria-hidden="true" />
      {archivo.nombre}
      <span className="text-xs font-normal text-ink-3">({tamanoLegible(archivo.tamano)})</span>
    </a>
  )
}

export function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-3 rounded-lg border border-line bg-card p-4', className)}>{children}</div>
}

export function Vacio({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-8 text-center">
      <p className="text-sm font-medium text-ink">{titulo}</p>
      {descripcion ? <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">{descripcion}</p> : null}
    </div>
  )
}

export function Etiqueta({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'exito' | 'alerta' | 'proceso' | 'error' }) {
  const t = { neutro: 'bg-neutro-soft text-neutro', exito: 'bg-exito-soft text-exito', alerta: 'bg-alerta-soft text-alerta', proceso: 'bg-proceso-soft text-proceso', error: 'bg-error-soft text-error' }[tono]
  return (
    <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10px] leading-none font-semibold tracking-[0.08em] whitespace-nowrap uppercase', t)}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}

export const Titulo = ({ children }: { children: ReactNode }) => <h2 className="text-2xl font-semibold text-ink">{children}</h2>
