/**
 * Pantallas públicas a las que llega el enlace del correo: "Crear tu contraseña" (invitación) y
 * "Restablecer contraseña" (autorizado por Coordinación). El enlace sirve una vez; al guardar, la persona entra.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CampoTexto } from '@/componentes/CampoFormulario'
import { esquemaClaveNueva, type ClaveNuevaFormulario } from '@/esquemas/administracion'
import { fijarClaveConEnlace, validarEnlace } from '@/lib/api'
import { useAccion } from '@/lib/datos'
import { resolverZod } from '@/lib/formulario'
import { rutaInicial } from '@/lib/navegacion'
import { useSesion } from '@/lib/sesion'

const TEXTOS = {
  crear: {
    titulo: 'Crea tu contraseña',
    descripcion: 'Con ella vas a entrar al sistema. Usa al menos 10 caracteres.',
    boton: 'Crear contraseña y entrar',
    exito: 'Contraseña creada',
  },
  restablecer: {
    titulo: 'Restablecer contraseña',
    descripcion: 'Elige una contraseña nueva. Usa al menos 10 caracteres.',
    boton: 'Guardar contraseña y entrar',
    exito: 'Contraseña nueva guardada',
  },
} as const

function PantallaEnlace({ modo }: { modo: keyof typeof TEXTOS }) {
  const textos = TEXTOS[modo]
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const { recargar } = useSesion()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState<string | null>(null)
  const [vencido, setVencido] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClaveNuevaFormulario>({
    resolver: resolverZod(esquemaClaveNueva),
    defaultValues: { nueva: '', confirmacion: '' },
  })

  useEffect(() => {
    let activo = true
    void validarEnlace(token).then((r) => {
      if (!activo) return
      if (r.ok) setCorreo(r.datos.correo)
      else setVencido(true)
    })
    return () => {
      activo = false
    }
  }, [token])

  const guardar = useAccion(
    async (v: ClaveNuevaFormulario) => {
      const r = await fijarClaveConEnlace({ token, ...v })
      if (!r.ok && r.codigo === 410) setVencido(true)
      return r
    },
    {
      exito: () => textos.exito,
      refrescar: false,
      alExito: (s) => {
        void recargar().then(() => navegar(rutaInicial(s), { replace: true }))
      },
    },
  )

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper-2 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {vencido ? 'Este enlace ya no sirve' : textos.titulo}
          </CardTitle>
          <CardDescription>
            {vencido
              ? 'Ya se usó o venció. Pide a Coordinación que te mande uno nuevo.'
              : textos.descripcion}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {vencido ? (
            <Button asChild variant="outline" className="w-fit">
              <Link to="/entrar">Ir a Entrar</Link>
            </Button>
          ) : correo === null ? (
            <p role="status" className="text-sm text-ink-3">
              Revisando el enlace…
            </p>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={handleSubmit((v) => guardar.ejecutar(v))}
              noValidate
            >
              <p className="text-sm text-ink-2">
                Cuenta: <strong className="font-semibold text-ink">{correo}</strong>
              </p>
              <CampoTexto
                tipo="password"
                etiqueta="Contraseña nueva"
                obligatorio
                registro={register('nueva')}
                error={errors.nueva?.message}
              />
              <CampoTexto
                tipo="password"
                etiqueta="Repite la contraseña"
                obligatorio
                registro={register('confirmacion')}
                error={errors.confirmacion?.message}
              />
              <Button type="submit" disabled={guardar.ocupado}>
                {guardar.ocupado ? 'Guardando…' : textos.boton}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export const CrearClave = () => <PantallaEnlace modo="crear" />
export const RestablecerClave = () => <PantallaEnlace modo="restablecer" />
