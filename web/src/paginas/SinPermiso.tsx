import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

/** Se pinta dentro del Shell cuando la ruta es de otro rol. */
export function SinPermiso() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line-strong bg-paper-2 px-6 py-16 text-center">
      <Lock strokeWidth={2.4} className="size-8 text-ink-4" aria-hidden="true" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-ink">Esta pantalla no es de tu rol</h1>
        <p className="max-w-sm text-sm text-ink-3">
          Tu cuenta no tiene acceso a esta sección. Si crees que debería tenerlo, pídelo a la
          Coordinación de Posgrados.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">Ir a mi pantalla de inicio</Link>
      </Button>
    </div>
  )
}
