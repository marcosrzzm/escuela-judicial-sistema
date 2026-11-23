import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { CampoTexto } from '@/componentes/CampoFormulario'
import { Pagina } from '@/componentes/Pagina'
import { esquemaMiClave, type MiClaveFormulario } from '@/esquemas/administracion'
import { cambiarMiClave } from '@/lib/api'
import { useAccion } from '@/lib/datos'
import { resolverZod } from '@/lib/formulario'
import { rutaInicial } from '@/lib/navegacion'
import { useSesion } from '@/lib/sesion'

export function MiClave() {
  const { sesion, recargar } = useSesion()
  const navegar = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MiClaveFormulario>({
    resolver: resolverZod(esquemaMiClave),
    defaultValues: { actual: '', nueva: '', confirmacion: '' },
  })
  const cambiar = useAccion((v: MiClaveFormulario) => cambiarMiClave(v), {
    exito: () => 'Contraseña cambiada',
    alExito: (s) => {
      void recargar().then(() => navegar(rutaInicial(s), { replace: true }))
    },
  })
  const obligada = sesion?.debe_cambiar_clave === true

  return (
    <Pagina
      titulo="Mi contraseña"
      descripcion={
        obligada
          ? 'Tu contraseña es temporal. Cámbiala para empezar a usar el sistema.'
          : 'Cambia la contraseña de tu cuenta. Las otras sesiones abiertas se cierran.'
      }
    >
      <form
        className="flex max-w-md flex-col gap-4"
        onSubmit={handleSubmit((v) => cambiar.ejecutar(v))}
        noValidate
      >
        <CampoTexto
          tipo="password"
          etiqueta={obligada ? 'Contraseña temporal' : 'Contraseña actual'}
          obligatorio
          registro={register('actual')}
          error={errors.actual?.message}
        />
        <CampoTexto
          tipo="password"
          etiqueta="Contraseña nueva (mínimo 10 caracteres)"
          obligatorio
          registro={register('nueva')}
          error={errors.nueva?.message}
        />
        <CampoTexto
          tipo="password"
          etiqueta="Repite la contraseña nueva"
          obligatorio
          registro={register('confirmacion')}
          error={errors.confirmacion?.message}
        />
        <Button type="submit" className="w-fit" disabled={cambiar.ocupado}>
          {cambiar.ocupado ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Pagina>
  )
}
