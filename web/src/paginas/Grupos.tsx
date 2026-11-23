import { FileUp, Printer, UserMinus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CampoSelect, CampoTexto } from '@/componentes/CampoFormulario'
import { DialogoMotivo } from '@/componentes/DialogoMotivo'
import { InsigniaEstado } from '@/componentes/Estados'
import { ErrorDatos, Cargando } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { SelectorGrupo, useSeleccionGrupo } from '@/componentes/SelectorGrupo'
import { SiPuede } from '@/componentes/SiPuede'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import { esquemaAltaNuevo, type AltaNuevo } from '@/esquemas/inscripcion'
import {
  altaInscripcion,
  bajaInscripcion,
  importarLista,
  type AlumnoBusqueda,
  type AlumnoLista,
  type ListaGrupo,
  type ResumenImportacion,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { resolverZod, soloFecha } from '@/lib/formulario'
import { useTiempoActivo } from '@/lib/useTiempoActivo'

function DialogoAlta({
  grupoId,
  grupoClave,
  activos,
  abierto,
  alCambiarApertura,
}: {
  grupoId: number
  grupoClave: string
  activos: Set<number>
  abierto: boolean
  alCambiarApertura: (a: boolean) => void
}) {
  const [modo, setModo] = useState<'existente' | 'nuevo'>('existente')
  const [alumnoId, setAlumnoId] = useState('')
  const [observacion, setObservacion] = useState('')
  const alumnos = useDatos<{ filas: AlumnoBusqueda[] }>(abierto ? '/alumnos' : null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AltaNuevo>({
    resolver: resolverZod(esquemaAltaNuevo),
    defaultValues: { identificador: '', nombre: '', observacion: '' },
  })
  const alta = useAccion(
    (d: { alumno_id?: number; identificador?: string; nombre?: string; observacion: string }) =>
      altaInscripcion(grupoId, d),
    {
      exito: (_r, d) =>
        `Alumno agregado a la lista de ${grupoClave}${d.nombre ? `: ${d.nombre}` : ''}`,
      alExito: () => {
        reset()
        setAlumnoId('')
        setObservacion('')
        alCambiarApertura(false)
      },
    },
  )
  const disponibles = (alumnos.datos?.filas ?? []).filter((a) => !activos.has(a.id))

  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar alumno a {grupoClave}</DialogTitle>
          <DialogDescription>
            Elige un alumno que ya existe o captura uno nuevo. Queda en la lista vigente y en la
            bitácora.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de alta">
          <Button
            type="button"
            variant={modo === 'existente' ? 'default' : 'outline'}
            onClick={() => setModo('existente')}
          >
            Alumno existente
          </Button>
          <Button
            type="button"
            variant={modo === 'nuevo' ? 'default' : 'outline'}
            onClick={() => setModo('nuevo')}
          >
            Alumno nuevo
          </Button>
        </div>
        {modo === 'existente' ? (
          <form
            key="existente"
            id="form-alta"
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (alumnoId) alta.ejecutar({ alumno_id: Number(alumnoId), observacion })
            }}
          >
            <CampoSelect
              etiqueta="Alumno"
              obligatorio
              valor={alumnoId}
              alCambiar={setAlumnoId}
              opciones={disponibles.map((a) => ({
                valor: String(a.id),
                etiqueta: `${a.identificador} · ${a.nombre}`,
              }))}
              placeholder={
                disponibles.length === 0 ? 'No hay alumnos disponibles' : 'Elige un alumno'
              }
            />
            <CampoTexto
              etiqueta="Observación (opcional)"
              valor={observacion}
              alCambiar={setObservacion}
            />
          </form>
        ) : (
          <form
            key="nuevo"
            id="form-alta"
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((v) => alta.ejecutar(v))}
            noValidate
          >
            <CampoTexto
              etiqueta="Matrícula"
              obligatorio
              registro={register('identificador')}
              error={errors.identificador?.message}
              placeholder="EJ-2026-011"
            />
            <CampoTexto
              etiqueta="Nombre completo"
              obligatorio
              registro={register('nombre')}
              error={errors.nombre?.message}
            />
            <CampoTexto
              etiqueta="Observación (opcional)"
              registro={register('observacion')}
              error={errors.observacion?.message}
            />
          </form>
        )}
        <DialogFooter>
          <PieDeFormulario
            formId="form-alta"
            onCancelar={() => alCambiarApertura(false)}
            textoConfirmar="Agregar a la lista"
            trabajando={alta.ocupado}
            deshabilitado={modo === 'existente' && !alumnoId}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MAX_FILAS_IMPORTAR = 500

/** Importar la lista de un grupo desde un CSV con matrícula y nombre; muestra el resumen al terminar. */
function DialogoImportar({
  grupoId,
  grupoClave,
  alCerrar,
}: {
  grupoId: number
  grupoClave: string
  alCerrar: () => void
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const [archivo, setArchivo] = useState('')
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null)
  const importar = useAccion((t: string) => importarLista(grupoId, t), {
    exito: (r) =>
      `Importación terminada: ${r.inscritas} inscritos, ${r.rechazadas.length} rechazados`,
    alExito: setResumen,
  })
  return (
    <Dialog open onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar la lista de {grupoClave}</DialogTitle>
          <DialogDescription>
            Un archivo CSV en UTF-8 con dos columnas: matrícula y nombre (la fila de títulos es
            opcional). Máximo {MAX_FILAS_IMPORTAR} filas. Los alumnos que no existen se crean y
            todos quedan inscritos en el grupo.
          </DialogDescription>
        </DialogHeader>
        {resumen ? (
          <div className="flex flex-col gap-3 text-sm" role="status">
            <p>
              <span className="num">{resumen.creadas}</span> alumnos creados ·{' '}
              <span className="num">{resumen.inscritas}</span> inscritos ·{' '}
              <span className="num">{resumen.rechazadas.length}</span> filas rechazadas
            </p>
            {resumen.rechazadas.length > 0 ? (
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-line p-3">
                {resumen.rechazadas.map((r) => (
                  <li key={`${r.fila}-${r.matricula}`}>
                    <span className="text-ink-3 num">Fila {r.fila}</span>
                    {r.matricula ? ` · ${r.matricula}` : ''}: {r.razon}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="archivo-lista"
              className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
            >
              Archivo CSV
            </label>
            <input
              id="archivo-lista"
              type="file"
              accept=".csv,.txt,text/csv"
              className="text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0]
                setArchivo(f?.name ?? '')
                void (f ? f.text() : Promise.resolve(null)).then(setTexto)
              }}
            />
          </div>
        )}
        <DialogFooter>
          {resumen ? (
            <Button type="button" onClick={alCerrar}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={alCerrar}
                disabled={importar.ocupado}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={texto === null || importar.ocupado}
                onClick={() => texto !== null && importar.ejecutar(texto)}
              >
                {importar.ocupado ? 'Importando…' : `Importar ${archivo}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Grupos() {
  const sel = useSeleccionGrupo()
  const grupoId = sel.grupo?.id ?? null
  useTiempoActivo('lista', grupoId)
  const lista = useDatos<ListaGrupo>(grupoId ? `/grupos/${grupoId}/lista` : null)
  const [altaAbierta, setAltaAbierta] = useState(false)
  const [importando, setImportando] = useState(false)
  const [baja, setBaja] = useState<AlumnoLista | null>(null)
  const darBaja = useAccion(
    (v: { id: number; observacion: string }) => bajaInscripcion(v.id, v.observacion),
    {
      exito: (_r, v) => `${baja?.nombre ?? 'Alumno'} dado de baja: ${v.observacion}`,
      alExito: () => setBaja(null),
    },
  )

  const datos = lista.datos
  const editable = datos?.grupo.estado === 'activo'
  const vigentes = datos?.alumnos.filter((a) => a.estado === 'activa') ?? []

  const columnas: ColumnaTabla<AlumnoLista>[] = [
    { clave: 'identificador', encabezado: 'Matrícula', className: 'num', ocultarEnMovil: true },
    {
      clave: 'nombre',
      encabezado: 'Alumno',
      render: (a) => (
        <>
          {a.nombre}
          <span className="block text-xs text-ink-3 num sm:hidden">{a.identificador}</span>
        </>
      ),
    },
    { clave: 'estado', encabezado: 'Estado', render: (a) => <InsigniaEstado estado={a.estado} /> },
    {
      clave: 'fecha_alta',
      encabezado: 'Alta',
      ocultarEnMovil: true,
      render: (a) => soloFecha(a.fecha_alta),
    },
    {
      clave: 'observacion',
      encabezado: 'Observación',
      ocultarEnMovil: true,
      render: (a) => a.observacion || (a.fecha_baja ? `Baja ${soloFecha(a.fecha_baja)}` : ''),
    },
  ]

  return (
    <Pagina
      titulo="Grupos y listas"
      descripcion="La lista vigente de cada grupo. Docentes y auxiliares ven esta misma lista, sin recapturar nada."
      acciones={
        <>
          {editable ? (
            <SiPuede recurso="inscripcion_grupo" accion="crear">
              <Button type="button" variant="outline" onClick={() => setImportando(true)}>
                <FileUp strokeWidth={2.4} aria-hidden="true" />
                Importar lista
              </Button>
            </SiPuede>
          ) : null}
          <Button type="button" variant="outline" onClick={() => window.print()} disabled={!datos}>
            <Printer strokeWidth={2.4} aria-hidden="true" />
            Imprimir lista
          </Button>
        </>
      }
      accionPrincipal={
        editable ? (
          <SiPuede recurso="inscripcion_grupo" accion="crear">
            <Button type="button" onClick={() => setAltaAbierta(true)}>
              <UserPlus strokeWidth={2.4} aria-hidden="true" />
              Agregar alumno
            </Button>
          </SiPuede>
        ) : undefined
      }
    >
      <div data-no-imprimir>
        <SelectorGrupo seleccion={sel} />
      </div>
      {sel.error ? <ErrorDatos error={sel.error} reintentar={sel.reintentar} /> : null}
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {sel.cargando || lista.cargando ? <Cargando /> : null}

      {datos ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-ink">
              {datos.grupo.clave} · {datos.grupo.periodo}
            </h2>
            <p className="text-sm text-ink-3">
              {datos.grupo.programa} · {datos.grupo.turno} ·{' '}
              <span className="num">{vigentes.length}</span> alumnos vigentes
            </p>
          </div>
          {!editable ? (
            <p className="rounded-lg border border-line bg-paper-2 px-4 py-3 text-sm text-ink-2">
              Este grupo pertenece a un periodo cerrado: su lista se consulta, pero ya no se
              modifica.
            </p>
          ) : null}
          <TablaDatos
            columnas={columnas}
            filas={datos.alumnos}
            claveFila={(a) => a.inscripcion_id}
            descripcion={`Lista de ${datos.grupo.clave}, periodo ${datos.grupo.periodo}`}
            accionesFila={
              editable
                ? (a) =>
                    a.estado === 'activa' ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setBaja(a)}>
                        <UserMinus strokeWidth={2.4} aria-hidden="true" />
                        Dar de baja
                      </Button>
                    ) : null
                : undefined
            }
            vacio={{
              variante: 'vacio',
              titulo: 'Este grupo todavía no tiene alumnos',
              descripcion:
                'Agrega a los alumnos del grupo: la misma lista les llegará a los docentes y auxiliares.',
              accion: editable ? (
                <Button type="button" onClick={() => setAltaAbierta(true)}>
                  Agregar el primer alumno
                </Button>
              ) : undefined,
            }}
          />
          <p className="text-sm text-ink-3" data-no-imprimir>
            Siguiente paso:{' '}
            <Link className="font-semibold text-brand underline" to="/derecho">
              registrar el derecho a evaluación
            </Link>{' '}
            o{' '}
            <Link
              className="font-semibold text-brand underline"
              to={`/cierre?periodo=${datos.grupo.periodo_id}&grupo=${datos.grupo.id}`}
            >
              ir al cierre del grupo
            </Link>
            .
          </p>
          <DialogoAlta
            grupoId={datos.grupo.id}
            grupoClave={datos.grupo.clave}
            activos={new Set(vigentes.map((a) => a.alumno_id))}
            abierto={altaAbierta}
            alCambiarApertura={setAltaAbierta}
          />
          {importando ? (
            <DialogoImportar
              key={datos.grupo.id}
              grupoId={datos.grupo.id}
              grupoClave={datos.grupo.clave}
              alCerrar={() => setImportando(false)}
            />
          ) : null}
          <DialogoMotivo
            abierto={baja !== null}
            alCambiarApertura={(a) => !a && setBaja(null)}
            titulo={`Dar de baja a ${baja?.nombre ?? ''}`}
            descripcion={`${baja?.nombre ?? ''} (${baja?.identificador ?? ''}) saldrá de la lista vigente de ${datos.grupo.clave}. Su inscripción se conserva como baja, con esta observación.`}
            etiqueta="Observación de la baja"
            etiquetaAccion="Dar de baja"
            ocupado={darBaja.ocupado}
            alConfirmar={(obs) =>
              baja && darBaja.ejecutar({ id: baja.inscripcion_id, observacion: obs })
            }
          />
        </>
      ) : null}
    </Pagina>
  )
}
