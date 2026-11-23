import { useId, type ReactNode } from 'react'

import { useGrupoContexto } from '@/lib/grupoContexto'
import { cn } from '@/lib/utils'

/**
 * Encabezado estándar de toda pantalla. `accionPrincipal` se repite en una
 * barra fija abajo en móvil (con el respiro de env(safe-area-inset-bottom))
 * para que nadie la pierda al final de una lista larga.
 */
export function Pagina({
  titulo,
  descripcion,
  acciones,
  accionPrincipal,
  children,
}: {
  titulo: string
  descripcion?: string
  acciones?: ReactNode
  accionPrincipal?: ReactNode
  children: ReactNode
}) {
  const idTitulo = useId()
  // Dentro de la página de un grupo el título es el de la sección, no el de la pantalla.
  const enGrupo = useGrupoContexto() !== null
  const Titulo = enGrupo ? 'h2' : 'h1'

  return (
    <section
      className={cn('flex min-w-0 flex-col gap-6', accionPrincipal ? 'pb-16 sm:pb-0' : undefined)}
      aria-labelledby={idTitulo}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Titulo
            id={idTitulo}
            className={cn(
              'leading-tight font-semibold text-balance text-ink',
              enGrupo ? 'text-2xl' : 'text-3xl',
            )}
          >
            {titulo}
          </Titulo>
          {descripcion ? (
            <p className="max-w-2xl text-sm leading-relaxed text-ink-3">{descripcion}</p>
          ) : null}
        </div>
        {acciones || accionPrincipal ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {acciones}
            <span className="hidden sm:contents">{accionPrincipal}</span>
          </div>
        ) : null}
      </header>

      {children}

      {accionPrincipal ? (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-paper px-4 py-3 sm:hidden [&>*]:w-full">
          {accionPrincipal}
        </div>
      ) : null}
    </section>
  )
}
