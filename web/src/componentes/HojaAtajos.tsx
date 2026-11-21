/** Diálogo que lista los atajos globales; se abre con "?". */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const ATAJOS = [
  { tecla: '⌘K / Ctrl K', accion: 'Abrir el buscador global' },
  { tecla: '/', accion: 'Enfocar la búsqueda' },
  { tecla: '?', accion: 'Mostrar esta lista de atajos' },
  { tecla: 'Esc', accion: 'Cerrar diálogos y paneles' },
]

export function HojaAtajos({
  abierto,
  alCambiarApertura,
}: {
  abierto: boolean
  alCambiarApertura: (abierto: boolean) => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>Funcionan en cualquier pantalla del sistema.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {ATAJOS.map((a) => (
            <li key={a.tecla} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-2">{a.accion}</span>
              <kbd className="rounded-md border border-line-strong bg-paper-2 px-2 py-1 text-xs font-semibold text-ink-2">
                {a.tecla}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
