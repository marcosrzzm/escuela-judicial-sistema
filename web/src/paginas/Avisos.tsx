/** Avisos (especificación, 11.5): bandeja completa; nada se borra y los de más de 90 días se ocultan. */
import { CheckCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilaAviso, useAbrirAviso, useAvisos, useMarcarAvisos } from '@/componentes/Avisos'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'

export function Avisos() {
  const a = useAvisos()
  const abrir = useAbrirAviso()
  const { todas } = useMarcarAvisos()
  const filas = a.datos?.filas ?? []
  return (
    <Pagina
      titulo="Avisos"
      descripcion="Lo que pasó y te toca atender. Los avisos nunca traen datos sensibles: abre uno para ir a la pantalla."
      acciones={
        <Button
          type="button"
          variant="outline"
          disabled={todas.ocupado || (a.datos?.no_leidos ?? 0) === 0}
          onClick={() => todas.ejecutar(undefined)}
        >
          <CheckCheck strokeWidth={2.4} aria-hidden="true" />
          Marcar todos como leídos
        </Button>
      }
    >
      {a.error ? <ErrorDatos error={a.error} reintentar={a.reintentar} /> : null}
      {a.cargando ? <Cargando /> : null}
      {a.datos && filas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-10 text-center text-sm text-ink-3">
          No tienes avisos. Cuando algo te toque atender, aparece aquí.
        </p>
      ) : null}
      {filas.length > 0 ? (
        <ul className="flex max-w-3xl flex-col divide-y divide-line rounded-lg border border-line bg-card p-1">
          {filas.map((f) => (
            <FilaAviso key={f.id} aviso={f} alAbrir={abrir} />
          ))}
        </ul>
      ) : null}
    </Pagina>
  )
}
