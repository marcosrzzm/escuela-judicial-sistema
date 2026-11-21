import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ErrorApi } from '@/lib/datos'

/** Esqueleto con la forma de una pantalla que carga. */
export function Cargando() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">Cargando información</span>
    </div>
  )
}

/** Error de lectura: dice qué pasó, y deja reintentar. Un 403 no ofrece reintento. */
export function ErrorDatos({ error, reintentar }: { error: ErrorApi; reintentar: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTriangle strokeWidth={2.4} aria-hidden="true" />
      <AlertTitle>
        {error.codigo === 403 ? 'No tienes acceso a esto' : 'No se pudo cargar la información'}
      </AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {error.codigo === 403 ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
            onClick={reintentar}
          >
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
