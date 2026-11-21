import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper p-6 text-center">
      <Compass strokeWidth={2.4} className="size-8 text-ink-4" aria-hidden="true" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold text-ink">Página no encontrada</h1>
        <p className="max-w-sm text-sm text-ink-3">
          La dirección a la que llegaste no corresponde a ninguna pantalla del sistema.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Ir a Inicio</Link>
      </Button>
    </main>
  )
}
