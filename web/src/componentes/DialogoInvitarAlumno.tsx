/** Coordinación invita a un alumno por correo (especificación, 11.8): crea su cuenta y manda el enlace. */
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CampoTexto } from '@/componentes/CampoFormulario'
import { invitarAlumno, type AltaUsuario } from '@/lib/api'
import { useAccion } from '@/lib/datos'
import { limpiarCorreo } from '@/lib/formulario'

export function DialogoInvitarAlumno({
  alumno,
  alCerrar,
}: {
  alumno: { id: number; nombre: string }
  alCerrar: () => void
}) {
  const [correo, setCorreo] = useState('')
  const [resultado, setResultado] = useState<AltaUsuario | null>(null)
  const invitar = useAccion((c: string) => invitarAlumno(alumno.id, c), {
    exito: (r) =>
      r.modo_prueba
        ? 'Modo de prueba: el correo no se envió'
        : r.correo_enviado
          ? `Invitación enviada a ${alumno.nombre}`
          : `Cuenta de ${alumno.nombre} creada`,
    alExito: (r) => (r.correo_enviado ? alCerrar() : setResultado(r)),
  })
  const valor = resultado?.clave_temporal ?? resultado?.enlace ?? ''
  return (
    <Dialog open onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a {alumno.nombre}</DialogTitle>
          <DialogDescription>
            {resultado
              ? `${resultado.modo_prueba ? 'Modo de prueba: el correo no se envió. ' : 'La cuenta quedó creada, pero el correo no salió. '}Pásale ${resultado.clave_temporal ? 'esta contraseña temporal' : 'este enlace'}; se muestra una sola vez.`
              : 'Escribe el correo del alumno. Recibe un enlace para crear su contraseña y solo verá sus propias calificaciones, su boleta, su calendario y sus avisos.'}
          </DialogDescription>
        </DialogHeader>
        {resultado ? (
          <p className="rounded-lg border border-line bg-paper-2 px-4 py-3 font-mono text-sm break-all select-all">
            {valor}
          </p>
        ) : (
          <form
            id="form-invitar-alumno"
            onSubmit={(e) => {
              e.preventDefault()
              if (correo) invitar.ejecutar(correo)
            }}
          >
            <CampoTexto
              etiqueta="Correo del alumno"
              obligatorio
              valor={correo}
              alCambiar={(v) => setCorreo(limpiarCorreo(v))}
              placeholder="nombre@correo.com"
            />
          </form>
        )}
        <DialogFooter>
          {resultado ? (
            <Button type="button" onClick={alCerrar}>
              Listo
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={alCerrar} disabled={invitar.ocupado}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="form-invitar-alumno"
                disabled={!correo || invitar.ocupado}
              >
                {invitar.ocupado ? 'Invitando…' : 'Invitar al alumno'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
