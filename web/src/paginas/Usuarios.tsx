import { Eye, KeyRound, Pencil, UserPlus, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BotonesSegmentados } from '@/componentes/BotonesSegmentados'
import { CampoSelect, CampoTexto } from '@/componentes/CampoFormulario'
import { DialogoConfirmacion } from '@/componentes/DialogoConfirmacion'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { PieDeFormulario } from '@/componentes/PieDeFormulario'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import {
  esquemaRol,
  esquemaUsuario,
  type RolFormulario,
  type UsuarioFormulario,
} from '@/esquemas/administracion'
import {
  crearRol,
  crearUsuario,
  editarRol,
  editarUsuario,
  guardarGruposAuxiliar,
  restablecerClave,
  verComo,
  type Grupo,
  type Rol,
  type RolAdmin,
  type Roles,
  type Usuario,
} from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { resolverZod } from '@/lib/formulario'
import { agruparPermisos, etiquetaAccion, etiquetaRecurso, ETIQUETA_BASE } from '@/lib/permisos'
import { useSesion } from '@/lib/sesion'

// ─── Contraseña temporal: se muestra una sola vez ───────────────────────────────

function DialogoClaveTemporal({
  datos,
  alCerrar,
}: {
  datos: { nombre: string; clave: string } | null
  alCerrar: () => void
}) {
  const [copiada, setCopiada] = useState(false)
  return (
    <Dialog open={datos !== null} onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contraseña temporal de {datos?.nombre}</DialogTitle>
          <DialogDescription>
            Entrégasela a la persona. Se muestra esta única vez y no se guarda en ningún lado; al
            entrar tendrá que cambiarla.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg border border-line bg-paper-2 px-4 py-3 text-center font-mono text-xl tracking-wider select-all">
          {datos?.clave}
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(datos?.clave ?? '').then(() => setCopiada(true))
            }}
          >
            {copiada ? 'Copiada' : 'Copiar'}
          </Button>
          <Button type="button" onClick={alCerrar}>
            Ya la anoté
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Alta y edición de una cuenta ───────────────────────────────────────────────

function DialogoUsuario({
  usuario,
  abierto,
  roles,
  alCerrar,
  alClaveTemporal,
}: {
  usuario: Usuario | null
  abierto: boolean
  roles: RolAdmin[]
  alCerrar: () => void
  alClaveTemporal: (d: { nombre: string; clave: string }) => void
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UsuarioFormulario>({
    resolver: resolverZod(esquemaUsuario),
    defaultValues: usuario
      ? { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, estado: usuario.estado }
      : { nombre: '', correo: '', rol: '', estado: 'activo' },
  })
  const guardar = useAccion(
    async (v: UsuarioFormulario) => {
      if (usuario) return editarUsuario(usuario.id, v)
      const r = await crearUsuario({ nombre: v.nombre, correo: v.correo, rol: v.rol })
      if (r.ok) alClaveTemporal({ nombre: v.nombre, clave: r.datos.clave_temporal })
      return r
    },
    {
      exito: (_r, v) =>
        usuario ? `Cuenta de ${v.nombre} actualizada` : `Cuenta de ${v.nombre} creada`,
      alExito: alCerrar,
    },
  )
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{usuario ? `Editar a ${usuario.nombre}` : 'Cuenta nueva'}</DialogTitle>
          <DialogDescription>
            {usuario
              ? 'Cambiar el rol o inactivar la cuenta cierra sus sesiones abiertas.'
              : 'El sistema genera una contraseña temporal y te la muestra una sola vez.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-usuario"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => guardar.ejecutar(v))}
          noValidate
        >
          <CampoTexto
            etiqueta="Nombre"
            obligatorio
            registro={register('nombre')}
            error={errors.nombre?.message}
          />
          <CampoTexto
            etiqueta="Correo"
            tipo="email"
            obligatorio
            registro={register('correo')}
            error={errors.correo?.message}
          />
          <CampoSelect
            etiqueta="Rol"
            obligatorio
            valor={watch('rol')}
            alCambiar={(v) => setValue('rol', v, { shouldValidate: true })}
            opciones={roles
              .filter((r) => r.estado === 'activo' || r.clave === usuario?.rol)
              .map((r) => ({ valor: r.clave, etiqueta: r.nombre }))}
            error={errors.rol?.message}
          />
          {usuario ? (
            <CampoSelect
              etiqueta="Estado"
              valor={watch('estado')}
              alCambiar={(v) => setValue('estado', v as UsuarioFormulario['estado'])}
              opciones={[
                { valor: 'activo', etiqueta: 'Activo' },
                { valor: 'inactivo', etiqueta: 'Inactivo' },
              ]}
            />
          ) : null}
        </form>
        <DialogFooter>
          <PieDeFormulario
            formId="form-usuario"
            onCancelar={alCerrar}
            textoConfirmar={usuario ? 'Guardar cambios' : 'Crear cuenta'}
            trabajando={guardar.ocupado}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Grupos de una cuenta Auxiliar ──────────────────────────────────────────────

function DialogoGruposAuxiliar({
  usuario,
  alCerrar,
}: {
  usuario: Usuario | null
  alCerrar: () => void
}) {
  const grupos = useDatos<{ filas: Grupo[] }>(usuario ? '/grupos' : null)
  const [marcados, setMarcados] = useState<Set<number>>(new Set(usuario?.grupo_ids))
  const guardar = useAccion((ids: number[]) => guardarGruposAuxiliar(usuario?.id ?? 0, ids), {
    exito: () => `Grupos de ${usuario?.nombre} actualizados`,
    alExito: alCerrar,
  })
  return (
    <Dialog open={usuario !== null} onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grupos de {usuario?.nombre}</DialogTitle>
          <DialogDescription>Elige las listas que esta cuenta ve en Mis listas.</DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {(grupos.datos?.filas ?? []).map((g) => (
            <li key={g.id}>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={marcados.has(g.id)}
                  onCheckedChange={(v) =>
                    setMarcados((m) => {
                      const nuevo = new Set(m)
                      if (v === true) nuevo.add(g.id)
                      else nuevo.delete(g.id)
                      return nuevo
                    })
                  }
                />
                {g.clave} · {g.periodo} · {g.programa}
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={guardar.ocupado}
            onClick={() => guardar.ejecutar([...marcados])}
          >
            Guardar grupos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Pestaña Usuarios ───────────────────────────────────────────────────────────

function PestanaUsuarios({ roles }: { roles: RolAdmin[] }) {
  const { sesion, recargar } = useSesion()
  const navegar = useNavigate()
  const [q, setQ] = useState('')
  const [rol, setRol] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const consulta = new URLSearchParams({ q, rol, estado }).toString()
  const lista = useDatos<{ filas: Usuario[] }>(`/usuarios?${consulta}`)
  const [edicion, setEdicion] = useState<{ usuario: Usuario | null } | null>(null)
  const [aux, setAux] = useState<Usuario | null>(null)
  const [reinicio, setReinicio] = useState<Usuario | null>(null)
  const [clave, setClave] = useState<{ nombre: string; clave: string } | null>(null)
  const reiniciar = useAccion((u: Usuario) => restablecerClave(u.id), {
    exito: (_r, u) => `Contraseña temporal nueva para ${u.nombre}`,
    alExito: (r, u) => {
      setReinicio(null)
      setClave({ nombre: u.nombre, clave: r.clave_temporal })
    },
  })
  const ver = useAccion((u: Usuario) => verComo(u.id), {
    exito: (_r, u) => `Viendo el sistema como ${u.nombre}`,
    alExito: () => {
      void recargar().then(() => navegar('/'))
    },
  })

  const columnas: ColumnaTabla<Usuario>[] = [
    {
      clave: 'nombre',
      encabezado: 'Cuenta',
      render: (u) => (
        <>
          {u.nombre}
          <span className="block text-xs text-ink-3">{u.correo}</span>
        </>
      ),
    },
    { clave: 'rol_nombre', encabezado: 'Rol' },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (u) => (
        <div className="flex flex-col gap-1">
          <InsigniaEstado estado={u.estado} />
          {u.debe_cambiar_clave ? (
            <span className="text-xs text-ink-3">Contraseña temporal</span>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 [&>*]:min-w-44">
        <CampoTexto etiqueta="Buscar" valor={q} alCambiar={setQ} placeholder="Nombre o correo" />
        <CampoSelect
          etiqueta="Rol"
          valor={rol}
          alCambiar={setRol}
          opciones={[
            { valor: 'todos', etiqueta: 'Todos' },
            ...roles.map((r) => ({ valor: r.clave, etiqueta: r.nombre })),
          ]}
        />
        <CampoSelect
          etiqueta="Estado"
          valor={estado}
          alCambiar={setEstado}
          opciones={[
            { valor: 'todos', etiqueta: 'Todos' },
            { valor: 'activo', etiqueta: 'Activos' },
            { valor: 'inactivo', etiqueta: 'Inactivos' },
          ]}
        />
        <Button type="button" onClick={() => setEdicion({ usuario: null })}>
          <UserPlus strokeWidth={2.4} aria-hidden="true" />
          Cuenta nueva
        </Button>
      </div>
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {lista.cargando ? <Cargando /> : null}
      {lista.datos ? (
        <TablaDatos
          columnas={columnas}
          filas={lista.datos.filas}
          claveFila={(u) => u.id}
          descripcion="Cuentas del sistema"
          vacio={{
            variante: 'sinResultados',
            titulo: 'Ninguna cuenta coincide',
            descripcion: 'Cambia la búsqueda o los filtros.',
          }}
          accionesFila={(u) => (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEdicion({ usuario: u })}
              >
                <Pencil strokeWidth={2.4} aria-hidden="true" />
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReinicio(u)}
                disabled={u.id === sesion?.id}
              >
                <KeyRound strokeWidth={2.4} aria-hidden="true" />
                Contraseña
              </Button>
              {u.base === 'auxiliar' ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setAux(u)}>
                  <UsersRound strokeWidth={2.4} aria-hidden="true" />
                  Grupos
                </Button>
              ) : null}
              {u.estado === 'activo' && u.id !== sesion?.id ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ver.ocupado}
                  onClick={() => ver.ejecutar(u)}
                >
                  <Eye strokeWidth={2.4} aria-hidden="true" />
                  Ver como
                </Button>
              ) : null}
            </>
          )}
        />
      ) : null}
      {edicion ? (
        <DialogoUsuario
          key={edicion.usuario?.id ?? 'nuevo'}
          usuario={edicion.usuario}
          abierto
          roles={roles}
          alCerrar={() => setEdicion(null)}
          alClaveTemporal={setClave}
        />
      ) : null}
      {aux ? (
        <DialogoGruposAuxiliar key={aux.id} usuario={aux} alCerrar={() => setAux(null)} />
      ) : null}
      <DialogoConfirmacion
        abierto={reinicio !== null}
        alCambiarApertura={(a) => !a && setReinicio(null)}
        titulo={`Restablecer la contraseña de ${reinicio?.nombre ?? ''}`}
        descripcion="Se genera una contraseña temporal nueva, se cierran sus sesiones y tendrá que cambiarla al entrar."
        etiquetaAccion="Generar contraseña temporal"
        peligroso={false}
        ocupado={reiniciar.ocupado}
        alConfirmar={() => reinicio && reiniciar.ejecutar(reinicio)}
      />
      <DialogoClaveTemporal datos={clave} alCerrar={() => setClave(null)} />
    </div>
  )
}

// ─── Pestaña Roles ──────────────────────────────────────────────────────────────

function ListaPermisos({
  disponibles,
  marcados,
  alCambiar,
  soloLectura,
}: {
  disponibles: string[]
  marcados: Set<string>
  alCambiar: (p: string, v: boolean) => void
  soloLectura: boolean
}) {
  return (
    <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg border border-line p-3">
      {agruparPermisos(disponibles).map((g) => (
        <fieldset key={g.recurso} className="flex flex-col gap-1">
          <legend className="text-sm font-semibold text-ink">{etiquetaRecurso(g.recurso)}</legend>
          <div className="flex flex-wrap gap-x-4">
            {g.acciones.map((a) => {
              const clave = `${g.recurso}:${a}`
              return (
                <label key={clave} className="flex min-h-9 items-center gap-2 text-sm">
                  <Checkbox
                    checked={marcados.has(clave)}
                    disabled={soloLectura}
                    onCheckedChange={(v) => alCambiar(clave, v === true)}
                  />
                  {etiquetaAccion(a)}
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

function DialogoRol({
  rol,
  techos,
  alCerrar,
}: {
  rol: RolAdmin | 'nuevo'
  techos: Roles['techos']
  alCerrar: () => void
}) {
  const existente = rol === 'nuevo' ? null : rol
  const soloLectura = existente?.es_sistema === true
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RolFormulario>({
    resolver: resolverZod(esquemaRol),
    defaultValues: {
      nombre: existente?.nombre ?? '',
      base: existente?.base ?? '',
      estado: existente?.estado ?? 'activo',
    },
  })
  const [marcados, setMarcados] = useState<Set<string>>(new Set(existente?.permisos))
  const base = watch('base')
  const disponibles = soloLectura ? (existente?.permisos ?? []) : (techos[base as Rol] ?? [])
  const guardar = useAccion(
    (v: RolFormulario) => {
      const permisos = disponibles.filter((p) => marcados.has(p))
      return existente
        ? editarRol(existente.id, { nombre: v.nombre, estado: v.estado, permisos })
        : crearRol({ nombre: v.nombre, base: v.base as Rol, permisos })
    },
    { exito: (_r, v) => `Rol ${v.nombre} guardado`, alExito: alCerrar },
  )
  return (
    <Dialog open onOpenChange={(a) => !a && alCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existente
              ? soloLectura
                ? `Rol del sistema: ${existente.nombre}`
                : `Editar ${existente.nombre}`
              : 'Rol nuevo'}
          </DialogTitle>
          <DialogDescription>
            {soloLectura
              ? 'Los roles del sistema no se editan: su definición vive en el código.'
              : 'Solo se ofrecen los permisos que tiene el rol base. El alcance (sus asignaciones o sus grupos) lo da el rol base.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-rol"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => guardar.ejecutar(v))}
          noValidate
        >
          <CampoTexto
            etiqueta="Nombre"
            obligatorio
            disabled={soloLectura}
            registro={register('nombre')}
            error={errors.nombre?.message}
          />
          <CampoSelect
            etiqueta="Rol base"
            obligatorio
            disabled={existente !== null}
            valor={base}
            alCambiar={(v) => {
              setValue('base', v, { shouldValidate: true })
              setMarcados(new Set())
            }}
            opciones={Object.entries(ETIQUETA_BASE).map(([valor, etiqueta]) => ({
              valor,
              etiqueta,
            }))}
            error={errors.base?.message}
          />
          {existente && !soloLectura ? (
            <CampoSelect
              etiqueta="Estado"
              valor={watch('estado')}
              alCambiar={(v) => setValue('estado', v as RolFormulario['estado'])}
              opciones={[
                { valor: 'activo', etiqueta: 'Activo' },
                { valor: 'inactivo', etiqueta: 'Inactivo' },
              ]}
            />
          ) : null}
          {base ? (
            <ListaPermisos
              disponibles={disponibles}
              marcados={marcados}
              soloLectura={soloLectura}
              alCambiar={(p, v) =>
                setMarcados((m) => {
                  const nuevo = new Set(m)
                  if (v) nuevo.add(p)
                  else nuevo.delete(p)
                  return nuevo
                })
              }
            />
          ) : null}
        </form>
        <DialogFooter>
          {soloLectura ? (
            <Button type="button" onClick={alCerrar}>
              Cerrar
            </Button>
          ) : (
            <PieDeFormulario
              formId="form-rol"
              onCancelar={alCerrar}
              textoConfirmar="Guardar rol"
              trabajando={guardar.ocupado}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PestanaRoles({ roles }: { roles: Roles }) {
  const [abierto, setAbierto] = useState<RolAdmin | 'nuevo' | null>(null)
  const columnas: ColumnaTabla<RolAdmin>[] = [
    {
      clave: 'nombre',
      encabezado: 'Rol',
      render: (r) => (
        <>
          {r.nombre}
          {r.es_sistema ? (
            <span className="block text-xs text-ink-3">Del sistema, solo lectura</span>
          ) : null}
        </>
      ),
    },
    { clave: 'base', encabezado: 'Rol base', render: (r) => ETIQUETA_BASE[r.base] },
    { clave: 'permisos', encabezado: 'Permisos', numerica: true, render: (r) => r.permisos.length },
    { clave: 'usuarios_activos', encabezado: 'Cuentas activas', numerica: true },
    { clave: 'estado', encabezado: 'Estado', render: (r) => <InsigniaEstado estado={r.estado} /> },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button type="button" onClick={() => setAbierto('nuevo')}>
          Rol nuevo
        </Button>
      </div>
      <TablaDatos
        columnas={columnas}
        filas={roles.filas}
        claveFila={(r) => r.id}
        descripcion="Roles del sistema y personalizados"
        accionesFila={(r) => (
          <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(r)}>
            {r.es_sistema ? 'Ver permisos' : 'Editar'}
          </Button>
        )}
      />
      {abierto ? (
        <DialogoRol
          key={abierto === 'nuevo' ? 'nuevo' : abierto.id}
          rol={abierto}
          techos={roles.techos}
          alCerrar={() => setAbierto(null)}
        />
      ) : null}
    </div>
  )
}

// ─── Pantalla ───────────────────────────────────────────────────────────────────

export function Usuarios() {
  const [params] = useSearchParams()
  const pestana = params.get('pestana') === 'roles' ? 'roles' : 'usuarios'
  const roles = useDatos<Roles>('/roles')
  return (
    <Pagina
      titulo="Usuarios y roles"
      descripcion="Quién entra al sistema y qué puede hacer. Nada se borra: una baja es inactivar."
    >
      <BotonesSegmentados
        activa={pestana === 'roles' ? '/usuarios?pestana=roles' : '/usuarios'}
        opciones={[
          { etiqueta: 'Usuarios', ruta: '/usuarios' },
          { etiqueta: 'Roles', ruta: '/usuarios?pestana=roles' },
        ]}
      />
      {roles.error ? <ErrorDatos error={roles.error} reintentar={roles.reintentar} /> : null}
      {roles.cargando ? <Cargando /> : null}
      {roles.datos ? (
        pestana === 'roles' ? (
          <PestanaRoles roles={roles.datos} />
        ) : (
          <PestanaUsuarios roles={roles.datos.filas} />
        )
      ) : null}
    </Pagina>
  )
}
