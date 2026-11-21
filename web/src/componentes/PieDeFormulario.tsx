import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

/**
 * El pie de todo formulario que vive en un Dialog: Cancelar y la acción
 * principal, fijos fuera del área de scroll (van en DialogFooter, que ya
 * queda pegado abajo), así el botón nunca se pierde aunque el formulario
 * sea largo. El botón de enviar vive fuera del <form>: `form={formId}` lo
 * une por su id, y Enter dentro de un campo sigue enviando igual.
 */
export function PieDeFormulario({
  formId,
  onCancelar,
  textoConfirmar,
  textoTrabajando = 'Guardando…',
  trabajando = false,
  deshabilitado = false,
  peligroso = false,
  extra,
}: {
  formId: string
  onCancelar: () => void
  textoConfirmar: string
  textoTrabajando?: string
  trabajando?: boolean
  deshabilitado?: boolean
  peligroso?: boolean
  extra?: ReactNode
}) {
  return (
    <>
      {extra !== undefined ? (
        <div className="mr-auto self-center text-sm text-ink-3">{extra}</div>
      ) : null}
      <Button type="button" variant="outline" onClick={onCancelar} disabled={trabajando}>
        Cancelar
      </Button>
      <Button
        type="submit"
        form={formId}
        variant={peligroso ? 'destructive' : 'default'}
        disabled={trabajando || deshabilitado}
      >
        {trabajando ? textoTrabajando : textoConfirmar}
      </Button>
    </>
  )
}
