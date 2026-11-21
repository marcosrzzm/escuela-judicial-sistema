/**
 * Envoltura de sonner con la única regla que importa: los éxitos nombran el
 * objeto afectado ("Cliente Ana Ruiz creado", no "Guardado") y los errores se
 * quedan en pantalla hasta que alguien los cierra (duration: Infinity). Nadie
 * debe llamar a `toast` directo: así la asimetría no se rompe cliente por
 * cliente.
 */
import { toast } from 'sonner'

export const avisar = {
  exito: (mensaje: string) => toast.success(mensaje),
  error: (mensaje: string) => toast.error(mensaje, { duration: Infinity }),
  deshacer: (mensaje: string, alDeshacer: () => void) =>
    toast.success(mensaje, { duration: 8000, action: { label: 'Deshacer', onClick: alDeshacer } }),
}
