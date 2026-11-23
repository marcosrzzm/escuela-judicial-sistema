import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CampoTexto } from '@/componentes/CampoFormulario'
import { toast } from 'sonner'
import { entrarDemo, pedirRestablecer } from '@/lib/api'
import { avisar } from '@/lib/avisos'
import { rutaInicial, rutaPermitida } from '@/lib/navegacion'
import { useDatos } from '@/lib/datos'
import { limpiarCorreo } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'

// ponytail: el navegador rechaza un correo con un espacio o un carácter invisible pegado; se quitan al escribir.

export function Entrar() {
  const { sesion, entrar, cargando, recargar } = useSesion()
  const ubicacion = useLocation()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const [entrando, setEntrando] = useState(false)
  const [olvide, setOlvide] = useState<'no' | 'escribiendo' | 'enviada'>('no')
  const ajustes = useDatos<{ datos_ficticios: boolean; cuentas_demo?: { correo: string; rol: string }[] }>('/ajustes-publicos')

  // Mientras se resuelve si ya hay sesión no se decide nada: sin este freno el formulario
  // parpadea y luego desaparece al recargar.
  if (cargando) return null
  const desde = (ubicacion.state as { desde?: Location } | null)?.desde
  // Un destino guardado de otra cuenta no se respeta si este rol no tiene esa pantalla.
  const destino = desde && sesion && rutaPermitida(desde.pathname, sesion) ? desde : undefined
  if (sesion)
    return (
      <Navigate
        to={destino ? `${destino.pathname}${destino.search}` : rutaInicial(sesion)}
        replace
      />
    )

  async function alEntrarDemo(c: string) {
    setEntrando(true)
    const r = await entrarDemo(c)
    setEntrando(false)
    if (r.ok) {
      toast.dismiss()
      await recargar()
    } else avisar.error(r.error)
  }

  const demo = ajustes.datos?.cuentas_demo ?? []

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setEntrando(true)
    const r = await entrar(correo.trim(), clave)
    setEntrando(false)
    if (r.ok) toast.dismiss()
    else avisar.error(r.error)
  }

  async function pedirClave(evento: FormEvent) {
    evento.preventDefault()
    setEntrando(true)
    const r = await pedirRestablecer(correo.trim())
    setEntrando(false)
    if (r.ok) setOlvide('enviada')
    else avisar.error(r.error)
  }

  if (olvide !== 'no')
    return (
      <main className="flex min-h-dvh items-center justify-center bg-paper-2 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Restablecer contraseña</CardTitle>
            <CardDescription>
              {olvide === 'enviada'
                ? 'Si el correo tiene una cuenta, Coordinación ya recibió tu solicitud. Cuando la autorice te llega un enlace por correo.'
                : 'Escribe tu correo. Coordinación revisa la solicitud y, si la autoriza, te manda un enlace.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {olvide === 'escribiendo' ? (
              <form className="flex flex-col gap-4" onSubmit={pedirClave}>
                <CampoTexto
                  etiqueta="Correo"
                  obligatorio
                  valor={correo}
                  alCambiar={(v) => setCorreo(limpiarCorreo(v))}
                />
                <Button type="submit" disabled={entrando || !correo}>
                  {entrando ? 'Enviando…' : 'Pedir restablecimiento'}
                </Button>
              </form>
            ) : null}
            <Button type="button" variant="ghost" className="w-fit" onClick={() => setOlvide('no')}>
              Volver a Entrar
            </Button>
          </CardContent>
        </Card>
      </main>
    )

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper-2 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          {ajustes.datos?.datos_ficticios === false ? null : (
            <p className="text-xs font-semibold tracking-[0.08em] text-brand uppercase">
              Prototipo · datos ficticios
            </p>
          )}
          <CardTitle className="text-2xl">Escuela Judicial</CardTitle>
          <CardDescription>
            Continuidad académica de la Coordinación de Posgrados. Entra con tu correo y tu
            contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form id="form-entrar" className="flex flex-col gap-4" onSubmit={alEnviar}>
            <CampoTexto
              etiqueta="Correo"
              obligatorio
              valor={correo}
              alCambiar={(v) => setCorreo(limpiarCorreo(v))}
              placeholder="nombre@prueba.local"
            />
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="clave"
                className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
              >
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="clave"
                  type={ver ? 'text' : 'password'}
                  required
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-3 hover:text-ink"
                >
                  {ver ? (
                    <EyeOff className="size-4" strokeWidth={2.4} />
                  ) : (
                    <Eye className="size-4" strokeWidth={2.4} />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={entrando || !correo || !clave}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-auto self-start p-0"
              onClick={() => setOlvide('escribiendo')}
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </form>

          <p className="text-xs text-ink-3">
            Al entrar aceptas el uso de tus datos descrito en el{' '}
            <Link to="/privacidad" className="font-medium text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              aviso de privacidad
            </Link>{' '}
            (borrador para revisión de la Escuela).
          </p>

          {/* Entrada de demostración: la lista la manda el servidor solo mientras los datos son ficticios. */}
          {demo.length ? (
            <section className="flex flex-col gap-2 border-t border-line pt-4">
              <h2 className="text-sm font-semibold text-ink">Entrar como cuenta de prueba</h2>
              <p className="text-xs text-ink-3">
                Para conocer el sistema: elige un perfil y entras directo a lo que ve esa persona. Todos los datos son ficticios.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demo.map(({ correo: c, rol }) => (
                  <Button
                    key={c}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={entrando}
                    onClick={() => void alEntrarDemo(c)}
                  >
                    {rol}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
