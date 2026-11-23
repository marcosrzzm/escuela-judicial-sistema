/** Confirmación previa a una operación irreversible o visible: nombra siempre el objeto afectado. */
import { Button } from '@/components/ui/button'
import { useSesion } from '@/lib/sesion'
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
  peligroso = true,
}: {
  abierto: boolean
  alCambiarApertura: (abierto: boolean) => void
  titulo: string
  descripcion: string
  etiquetaAccion: string
  ocupado: boolean
  alConfirmar: () => void
  /** Rojo solo para lo que destruye; aprobar, aceptar y enviar van en primario. */
  peligroso?: boolean
}) {
  const { sesion } = useSesion()
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
          <Button
            type="button"
            variant={peligroso ? 'destructive' : 'default'}
            disabled={ocupado || sesion?.solo_lectura === true}
            title={sesion?.solo_lectura ? 'Vista de solo lectura' : undefined}
            onClick={alConfirmar}
          >
            {ocupado ? 'Guardando…' : etiquetaAccion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
