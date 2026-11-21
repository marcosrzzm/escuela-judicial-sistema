/** Confirmación previa a una operación irreversible o visible: nombra siempre el objeto afectado. */
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function DialogoConfirmacion({
  abierto,
  alCambiarApertura,
  titulo,
  descripcion,
  etiquetaAccion,
  ocupado,
  alConfirmar,
}: {
  abierto: boolean
  alCambiarApertura: (abierto: boolean) => void
  titulo: string
  descripcion: string
  etiquetaAccion: string
  ocupado: boolean
  alConfirmar: () => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={ocupado}
            onClick={() => alCambiarApertura(false)}
          >
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={ocupado} onClick={alConfirmar}>
            {ocupado ? 'Guardando…' : etiquetaAccion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
