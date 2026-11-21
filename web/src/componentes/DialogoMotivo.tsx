/** Diálogo de una sola pregunta: pide un motivo (u observación) antes de una acción con consecuencias. */
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CampoAreaTexto } from '@/componentes/CampoFormulario'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { resolverZod } from '@/lib/formulario'

const esquema = z.object({ motivo: z.string().trim().max(500, 'Máximo 500 caracteres.') })
type Valores = z.infer<typeof esquema>

export function DialogoMotivo({
  abierto,
  alCambiarApertura,
  titulo,
  descripcion,
  etiqueta = 'Motivo',
  etiquetaAccion,
  obligatorio = true,
  ocupado,
  alConfirmar,
}: {
  abierto: boolean
  alCambiarApertura: (abierto: boolean) => void
  titulo: string
  descripcion: string
  etiqueta?: string
  etiquetaAccion: string
  obligatorio?: boolean
  ocupado: boolean
  alConfirmar: (motivo: string) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Valores>({ resolver: resolverZod(esquema), defaultValues: { motivo: '' } })

  function alEnviar(v: Valores) {
    if (obligatorio && v.motivo === '') {
      setError('motivo', { message: `${etiqueta} es obligatorio.` })
      return
    }
    alConfirmar(v.motivo)
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(a) => {
        if (!a) reset()
        alCambiarApertura(a)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <form id="form-motivo" onSubmit={handleSubmit(alEnviar)} noValidate>
          <CampoAreaTexto
            etiqueta={etiqueta}
            obligatorio={obligatorio}
            registro={register('motivo')}
            error={errors.motivo?.message}
          />
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-motivo"
            onCancelar={() => alCambiarApertura(false)}
            textoConfirmar={etiquetaAccion}
            trabajando={ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
