import { definicionEstado } from '@/lib/estados'
import { cn } from '@/lib/utils'

/** Píldora de estado: punto de color + palabra, siempre juntos (nunca solo el color). */
export function InsigniaEstado({ estado, className }: { estado: string; className?: string }) {
  const definicion = definicionEstado(estado)
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10px] leading-none font-semibold tracking-[0.08em] whitespace-nowrap uppercase',
        definicion.clases,
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {definicion.etiqueta}
    </span>
  )
}
