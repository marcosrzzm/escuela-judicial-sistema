import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BotonesSegmentados } from '@/componentes/BotonesSegmentados'
import { CampoFecha, CampoSelect, CampoTexto } from '@/componentes/CampoFormulario'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import {
  esquemaGrupo,
  esquemaMateria,
  esquemaPeriodo,
  type GrupoFormulario,
  type MateriaFormulario,
  type PeriodoFormulario,
} from '@/esquemas/administracion'
import {
  cambiarDocente,
  cambiarEstadoPeriodo,
  crearAsignacion,
  crearGrupo,
  crearMateria,
  crearPeriodo,
  editarGrupo,
  editarMateria,
  type Asignacion,
  type Docente,
  type Grupo,
  type Materia,
  type Periodo,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { resolverZod, soloFecha } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'

/** Esqueleto de un diálogo de formulario: título, cuerpo y pie con Cancelar y la acción. */
function DialogoForm({
  titulo,
  descripcion,
  id,
  textoConfirmar,
  ocupado,
  alCerrar,
  alEnviar,
  children,
}: {
  titulo: string
  descripcion: string
  id: string
  textoConfirmar: string
  ocupado: boolean
  alCerrar: () => void
  alEnviar: (e: React.FormEvent) => void
  children: React.ReactNode
}) {
  return (
    <Dialog open onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-4" onSubmit={alEnviar} noValidate>
          {children}
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId={id}
            onCancelar={alCerrar}
            textoConfirmar={textoConfirmar}
            trabajando={ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Periodos ───────────────────────────────────────────────────────────────────

function DialogoPeriodo({ alCerrar }: { alCerrar: () => void }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PeriodoFormulario>({
    resolver: resolverZod(esquemaPeriodo),
    defaultValues: { nombre: '', fecha_inicio: '', fecha_fin: '' },
  })
  const guardar = useAccion((v: PeriodoFormulario) => crearPeriodo(v), {
    exito: (_r, v) => `Periodo ${v.nombre} creado`,
    alExito: alCerrar,
  })
  return (
    <DialogoForm
      id="form-periodo"
      titulo="Periodo nuevo"
      descripcion="Nace abierto. Después se cierra desde la lista."
      textoConfirmar="Crear periodo"
      ocupado={guardar.ocupado}
      alCerrar={alCerrar}
      alEnviar={handleSubmit((v) => guardar.ejecutar(v))}
    >
      <CampoTexto
        etiqueta="Nombre"
        obligatorio
        registro={register('nombre')}
        error={errors.nombre?.message}
        placeholder="2027-A"
      />
      <CampoFecha
        etiqueta="Inicio"
        obligatorio
        valor={watch('fecha_inicio')}
        alCambiar={(v) => setValue('fecha_inicio', v)}
        error={errors.fecha_inicio?.message}
      />
      <CampoFecha
        etiqueta="Fin"
        obligatorio
        valor={watch('fecha_fin')}
        alCambiar={(v) => setValue('fecha_fin', v)}
        error={errors.fecha_fin?.message}
      />
    </DialogoForm>
  )
}

function PestanaPeriodos() {
  const { puede } = useSesion()
  const lista = useDatos<{ filas: Periodo[] }>('/periodos')
  const [nuevo, setNuevo] = useState(false)
  const cambiar = useAccion(
    (p: Periodo) => cambiarEstadoPeriodo(p.id, p.estado === 'abierto' ? 'cerrado' : 'abierto'),
    {
      exito: (_r, p) =>
        `Periodo ${p.nombre} ${p.estado === 'abierto' ? 'cerrado' : 'abierto de nuevo'}`,
    },
  )
  const columnas: ColumnaTabla<Periodo>[] = [
    {
      clave: 'nombre',
      encabezado: 'Periodo',
      render: (p) => (
        <>
          {p.nombre}
          <span className="block text-xs text-ink-3 sm:hidden">
            {soloFecha(p.fecha_inicio)} a {soloFecha(p.fecha_fin)}
          </span>
        </>
      ),
    },
    {
      clave: 'fecha_inicio',
      encabezado: 'Inicio',
      ocultarEnMovil: true,
      render: (p) => soloFecha(p.fecha_inicio),
    },
    {
      clave: 'fecha_fin',
      encabezado: 'Fin',
      ocultarEnMovil: true,
      render: (p) => soloFecha(p.fecha_fin),
    },
    { clave: 'estado', encabezado: 'Estado', render: (p) => <InsigniaEstado estado={p.estado} /> },
  ]
  return (
    <div className="flex flex-col gap-4">
      {puede('periodo', 'crear') ? (
        <div>
          <Button type="button" onClick={() => setNuevo(true)}>
            <Plus strokeWidth={2.4} aria-hidden="true" />
            Periodo nuevo
          </Button>
        </div>
      ) : null}
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {lista.cargando ? <Cargando /> : null}
      {lista.datos ? (
        <TablaDatos
          columnas={columnas}
          filas={lista.datos.filas}
          claveFila={(p) => p.id}
          descripcion="Periodos"
          accionesFila={
            puede('periodo', 'modificar')
              ? (p) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cambiar.ocupado}
                    onClick={() => cambiar.ejecutar(p)}
                  >
                    {p.estado === 'abierto' ? 'Cerrar periodo' : 'Reabrir periodo'}
                  </Button>
                )
              : undefined
          }
        />
      ) : null}
      {nuevo ? <DialogoPeriodo alCerrar={() => setNuevo(false)} /> : null}
    </div>
  )
}

// ─── Materias ───────────────────────────────────────────────────────────────────

function DialogoMateria({ materia, alCerrar }: { materia: Materia | null; alCerrar: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MateriaFormulario>({
    resolver: resolverZod(esquemaMateria),
    defaultValues: { clave: materia?.clave ?? '', nombre: materia?.nombre ?? '' },
  })
  const guardar = useAccion(
    (v: MateriaFormulario) => (materia ? editarMateria(materia.id, v) : crearMateria(v)),
    {
      exito: (_r, v) => `Materia guardada: ${v.nombre}`,
      alExito: alCerrar,
    },
  )
  return (
    <DialogoForm
      id="form-materia"
      titulo={materia ? `Editar ${materia.nombre}` : 'Materia nueva'}
      descripcion="La clave es única."
      textoConfirmar="Guardar materia"
      ocupado={guardar.ocupado}
      alCerrar={alCerrar}
      alEnviar={handleSubmit((v) => guardar.ejecutar(v))}
    >
      <CampoTexto
        etiqueta="Clave"
        obligatorio
        registro={register('clave')}
        error={errors.clave?.message}
        placeholder="DPR"
      />
      <CampoTexto
        etiqueta="Nombre"
        obligatorio
        registro={register('nombre')}
        error={errors.nombre?.message}
      />
    </DialogoForm>
  )
}

function PestanaMaterias() {
  const { puede } = useSesion()
  const lista = useDatos<{ filas: Materia[] }>('/materias')
  const [abierta, setAbierta] = useState<Materia | 'nueva' | null>(null)
  const columnas: ColumnaTabla<Materia>[] = [
    { clave: 'clave', encabezado: 'Clave', className: 'num' },
    { clave: 'nombre', encabezado: 'Materia' },
  ]
  return (
    <div className="flex flex-col gap-4">
      {puede('materia', 'crear') ? (
        <div>
          <Button type="button" onClick={() => setAbierta('nueva')}>
            <Plus strokeWidth={2.4} aria-hidden="true" />
            Materia nueva
          </Button>
        </div>
      ) : null}
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {lista.cargando ? <Cargando /> : null}
      {lista.datos ? (
        <TablaDatos
          columnas={columnas}
          filas={lista.datos.filas}
          claveFila={(m) => m.id}
          descripcion="Materias"
          accionesFila={
            puede('materia', 'modificar')
              ? (m) => (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAbierta(m)}>
                    <Pencil strokeWidth={2.4} aria-hidden="true" />
                    Editar
                  </Button>
                )
              : undefined
          }
        />
      ) : null}
      {abierta ? (
        <DialogoMateria
          key={abierta === 'nueva' ? 'nueva' : abierta.id}
          materia={abierta === 'nueva' ? null : abierta}
          alCerrar={() => setAbierta(null)}
        />
      ) : null}
    </div>
  )
}

// ─── Grupos ─────────────────────────────────────────────────────────────────────

function DialogoGrupo({
  grupo,
  periodos,
  alCerrar,
}: {
  grupo: Grupo | null
  periodos: Periodo[]
  alCerrar: () => void
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GrupoFormulario>({
    resolver: resolverZod(esquemaGrupo),
    defaultValues: {
      periodo_id: grupo
        ? String(grupo.periodo_id)
        : String((periodos.find((p) => p.estado === 'abierto') ?? periodos[0])?.id ?? ''),
      clave: grupo?.clave ?? '',
      programa: grupo?.programa ?? '',
      turno: grupo?.turno ?? '',
      estado: (grupo?.estado as GrupoFormulario['estado']) ?? 'activo',
    },
  })
  const guardar = useAccion(
    (v: GrupoFormulario) => {
      const datos = {
        periodo_id: Number(v.periodo_id),
        clave: v.clave,
        programa: v.programa,
        turno: v.turno,
      }
      return grupo ? editarGrupo(grupo.id, { ...datos, estado: v.estado }) : crearGrupo(datos)
    },
    { exito: (_r, v) => `Grupo ${v.clave} guardado`, alExito: alCerrar },
  )
  return (
    <DialogoForm
      id="form-grupo"
      titulo={grupo ? `Editar el grupo ${grupo.clave}` : 'Grupo nuevo'}
      descripcion="La clave no se repite dentro de un periodo."
      textoConfirmar="Guardar grupo"
      ocupado={guardar.ocupado}
      alCerrar={alCerrar}
      alEnviar={handleSubmit((v) => guardar.ejecutar(v))}
    >
      <CampoSelect
        etiqueta="Periodo"
        obligatorio
        valor={watch('periodo_id')}
        alCambiar={(v) => setValue('periodo_id', v)}
        opciones={periodos.map((p) => ({ valor: String(p.id), etiqueta: p.nombre }))}
        error={errors.periodo_id?.message}
      />
      <CampoTexto
        etiqueta="Clave"
        obligatorio
        registro={register('clave')}
        error={errors.clave?.message}
        placeholder="POS-03"
      />
      <CampoTexto
        etiqueta="Programa"
        obligatorio
        registro={register('programa')}
        error={errors.programa?.message}
      />
      <CampoTexto
        etiqueta="Turno"
        obligatorio
        registro={register('turno')}
        error={errors.turno?.message}
        placeholder="Matutino"
      />
      {grupo ? (
        <CampoSelect
          etiqueta="Estado"
          valor={watch('estado')}
          alCambiar={(v) => setValue('estado', v as GrupoFormulario['estado'])}
          opciones={[
            { valor: 'activo', etiqueta: 'Activo' },
            { valor: 'cerrado', etiqueta: 'Cerrado' },
          ]}
        />
      ) : null}
    </DialogoForm>
  )
}

function PestanaGrupos() {
  const { puede } = useSesion()
  const lista = useDatos<{ filas: Grupo[] }>('/grupos')
  const periodos = useDatos<{ filas: Periodo[] }>('/periodos')
  const [abierto, setAbierto] = useState<Grupo | 'nuevo' | null>(null)
  const columnas: ColumnaTabla<Grupo>[] = [
    { clave: 'clave', encabezado: 'Grupo' },
    { clave: 'periodo', encabezado: 'Periodo' },
    { clave: 'programa', encabezado: 'Programa', ocultarEnMovil: true },
    { clave: 'turno', encabezado: 'Turno', ocultarEnMovil: true },
    { clave: 'estado', encabezado: 'Estado', render: (g) => <InsigniaEstado estado={g.estado} /> },
  ]
  return (
    <div className="flex flex-col gap-4">
      {puede('grupo', 'crear') ? (
        <div>
          <Button type="button" onClick={() => setAbierto('nuevo')}>
            <Plus strokeWidth={2.4} aria-hidden="true" />
            Grupo nuevo
          </Button>
        </div>
      ) : null}
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {lista.cargando ? <Cargando /> : null}
      {lista.datos ? (
        <TablaDatos
          columnas={columnas}
          filas={lista.datos.filas}
          claveFila={(g) => g.id}
          descripcion="Grupos"
          accionesFila={
            puede('grupo', 'modificar')
              ? (g) => (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(g)}>
                    <Pencil strokeWidth={2.4} aria-hidden="true" />
                    Editar
                  </Button>
                )
              : undefined
          }
        />
      ) : null}
      {abierto && periodos.datos ? (
        <DialogoGrupo
          key={abierto === 'nuevo' ? 'nuevo' : abierto.id}
          grupo={abierto === 'nuevo' ? null : abierto}
          periodos={periodos.datos.filas}
          alCerrar={() => setAbierto(null)}
        />
      ) : null}
    </div>
  )
}

// ─── Asignaciones ───────────────────────────────────────────────────────────────

function DialogoAsignacion({ periodoId, alCerrar }: { periodoId: number; alCerrar: () => void }) {
  const grupos = useDatos<{ filas: Grupo[] }>(`/grupos?periodo_id=${periodoId}`)
  const materias = useDatos<{ filas: Materia[] }>('/materias')
  const docentes = useDatos<{ filas: Docente[] }>('/docentes')
  const [grupoId, setGrupoId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const guardar = useAccion(
    () =>
      crearAsignacion({
        grupo_id: Number(grupoId),
        materia_id: Number(materiaId),
        docente_id: Number(docenteId),
      }),
    { exito: () => 'Asignación creada', alExito: alCerrar },
  )
  const completo = grupoId !== '' && materiaId !== '' && docenteId !== ''
  return (
    <Dialog open onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignación nueva</DialogTitle>
          <DialogDescription>
            Un docente por materia en cada grupo. Solo se ofrecen cuentas activas con rol base
            Docente.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-asignacion"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (completo) guardar.ejecutar(undefined)
          }}
        >
          <CampoSelect
            etiqueta="Grupo"
            obligatorio
            valor={grupoId}
            alCambiar={setGrupoId}
            opciones={(grupos.datos?.filas ?? []).map((g) => ({
              valor: String(g.id),
              etiqueta: `${g.clave} · ${g.programa}`,
            }))}
          />
          <CampoSelect
            etiqueta="Materia"
            obligatorio
            valor={materiaId}
            alCambiar={setMateriaId}
            opciones={(materias.datos?.filas ?? []).map((m) => ({
              valor: String(m.id),
              etiqueta: m.nombre,
            }))}
          />
          <CampoSelect
            etiqueta="Docente"
            obligatorio
            valor={docenteId}
            alCambiar={setDocenteId}
            opciones={(docentes.datos?.filas ?? []).map((d) => ({
              valor: String(d.id),
              etiqueta: d.nombre,
            }))}
          />
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-asignacion"
            onCancelar={alCerrar}
            textoConfirmar="Crear asignación"
            trabajando={guardar.ocupado}
            deshabilitado={!completo}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoCambioDocente({
  asignacion,
  alCerrar,
}: {
  asignacion: Asignacion
  alCerrar: () => void
}) {
  const docentes = useDatos<{ filas: Docente[] }>('/docentes')
  const [docenteId, setDocenteId] = useState('')
  const [motivo, setMotivo] = useState('')
  const guardar = useAccion(() => cambiarDocente(asignacion.id, Number(docenteId), motivo), {
    exito: () => `Docente de ${asignacion.materia} en ${asignacion.grupo} cambiado`,
    alExito: alCerrar,
  })
  const completo = docenteId !== '' && motivo.trim() !== ''
  return (
    <Dialog open onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar el docente de {asignacion.materia}</DialogTitle>
          <DialogDescription>
            {asignacion.grupo} · hoy lo tiene {asignacion.docente}. Las entregas ya hechas conservan
            a su responsable.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-cambio"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (completo) guardar.ejecutar(undefined)
          }}
        >
          <CampoSelect
            etiqueta="Docente nuevo"
            obligatorio
            valor={docenteId}
            alCambiar={setDocenteId}
            opciones={(docentes.datos?.filas ?? [])
              .filter((d) => d.nombre !== asignacion.docente)
              .map((d) => ({ valor: String(d.id), etiqueta: d.nombre }))}
          />
          <CampoTexto etiqueta="Motivo" obligatorio valor={motivo} alCambiar={setMotivo} />
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-cambio"
            onCancelar={alCerrar}
            textoConfirmar="Cambiar docente"
            trabajando={guardar.ocupado}
            deshabilitado={!completo}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PestanaAsignaciones() {
  const { puede } = useSesion()
  const periodos = useDatos<{ filas: Periodo[] }>('/periodos')
  const [elegido, setElegido] = useState('')
  const filasPeriodos = periodos.datos?.filas ?? []
  const periodoId =
    Number(elegido) ||
    (filasPeriodos.find((p) => p.estado === 'abierto') ?? filasPeriodos[0])?.id ||
    null
  const lista = useDatos<{ filas: Asignacion[] }>(
    periodoId ? `/asignaciones?periodo_id=${periodoId}` : null,
  )
  const [nueva, setNueva] = useState(false)
  const [cambio, setCambio] = useState<Asignacion | null>(null)
  const columnas: ColumnaTabla<Asignacion>[] = [
    { clave: 'grupo', encabezado: 'Grupo' },
    {
      clave: 'materia',
      encabezado: 'Materia y docente',
      render: (a) => (
        <>
          {a.materia}
          <span className="block text-xs text-ink-3">{a.docente}</span>
        </>
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 [&>*]:min-w-44">
        <CampoSelect
          etiqueta="Periodo"
          valor={periodoId ? String(periodoId) : ''}
          alCambiar={setElegido}
          opciones={filasPeriodos.map((p) => ({ valor: String(p.id), etiqueta: p.nombre }))}
        />
        {puede('asignacion_docente', 'crear') ? (
          <Button type="button" onClick={() => setNueva(true)}>
            <Plus strokeWidth={2.4} aria-hidden="true" />
            Asignación nueva
          </Button>
        ) : null}
      </div>
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {lista.cargando ? <Cargando /> : null}
      {lista.datos ? (
        <TablaDatos
          columnas={columnas}
          filas={lista.datos.filas}
          claveFila={(a) => a.id}
          descripcion="Asignaciones de docentes"
          vacio={{
            variante: 'vacio',
            titulo: 'Este periodo no tiene asignaciones',
            descripcion: 'Crea una: elige grupo, materia y docente.',
          }}
          accionesFila={
            puede('asignacion_docente', 'modificar')
              ? (a) => (
                  <Button type="button" variant="outline" size="sm" onClick={() => setCambio(a)}>
                    Cambiar docente
                  </Button>
                )
              : undefined
          }
        />
      ) : null}
      {nueva && periodoId ? (
        <DialogoAsignacion periodoId={periodoId} alCerrar={() => setNueva(false)} />
      ) : null}
      {cambio ? (
        <DialogoCambioDocente
          key={cambio.id}
          asignacion={cambio}
          alCerrar={() => setCambio(null)}
        />
      ) : null}
    </div>
  )
}

// ─── Pantalla ───────────────────────────────────────────────────────────────────

const PESTANAS = [
  { clave: 'periodos', etiqueta: 'Periodos', permiso: 'periodo' },
  { clave: 'materias', etiqueta: 'Materias', permiso: 'materia' },
  { clave: 'grupos', etiqueta: 'Grupos', permiso: 'grupo' },
  { clave: 'asignaciones', etiqueta: 'Asignaciones', permiso: 'asignacion_docente' },
] as const

export function Catalogos() {
  const { puede } = useSesion()
  const [params] = useSearchParams()
  const visibles = PESTANAS.filter(
    (p) => puede(p.permiso, 'crear') || puede(p.permiso, 'modificar'),
  )
  const actual = visibles.find((p) => p.clave === params.get('pestana')) ?? visibles[0]
  return (
    <Pagina
      titulo="Catálogos"
      descripcion="Periodos, materias, grupos y asignaciones de docentes. Cada cambio queda en la bitácora."
    >
      <BotonesSegmentados
        activa={`/catalogos?pestana=${actual?.clave}`}
        opciones={visibles.map((p) => ({
          etiqueta: p.etiqueta,
          ruta: `/catalogos?pestana=${p.clave}`,
        }))}
      />
      {actual?.clave === 'periodos' ? <PestanaPeriodos /> : null}
      {actual?.clave === 'materias' ? <PestanaMaterias /> : null}
      {actual?.clave === 'grupos' ? <PestanaGrupos /> : null}
      {actual?.clave === 'asignaciones' ? <PestanaAsignaciones /> : null}
    </Pagina>
  )
}
