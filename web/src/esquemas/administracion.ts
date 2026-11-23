import { z } from 'zod'

/** Los mismos límites que valida el servidor (api/lib/administracion.php). */
export const esquemaUsuario = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
  correo: z.email('Escribe un correo válido.').max(160, 'Máximo 160 caracteres.'),
  rol: z.string().min(1, 'Elige un rol.'),
  estado: z.enum(['activo', 'inactivo']),
})
export type UsuarioFormulario = z.infer<typeof esquemaUsuario>

export const esquemaRol = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(80, 'Máximo 80 caracteres.'),
  base: z.string().min(1, 'Elige el rol base.'),
  estado: z.enum(['activo', 'inactivo']),
})
export type RolFormulario = z.infer<typeof esquemaRol>

export const esquemaMiClave = z
  .object({
    actual: z.string().min(1, 'Escribe tu contraseña actual.'),
    nueva: z.string().min(10, 'Usa al menos 10 caracteres.').max(200, 'Máximo 200 caracteres.'),
    confirmacion: z.string(),
  })
  .refine((v) => v.nueva === v.confirmacion, {
    path: ['confirmacion'],
    message: 'No coincide con la contraseña nueva.',
  })
export type MiClaveFormulario = z.infer<typeof esquemaMiClave>

export const esquemaPeriodo = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(20, 'Máximo 20 caracteres.'),
    fecha_inicio: z.string().min(1, 'Elige la fecha de inicio.'),
    fecha_fin: z.string().min(1, 'Elige la fecha de fin.'),
  })
  .refine((v) => v.fecha_fin >= v.fecha_inicio, {
    path: ['fecha_fin'],
    message: 'Debe ser posterior al inicio.',
  })
export type PeriodoFormulario = z.infer<typeof esquemaPeriodo>

export const esquemaMateria = z.object({
  clave: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{1,20}$/, 'Usa hasta 20 letras, números o guiones.'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
})
export type MateriaFormulario = z.infer<typeof esquemaMateria>

export const esquemaGrupo = z.object({
  periodo_id: z.string().min(1, 'Elige un periodo.'),
  clave: z.string().trim().min(1, 'La clave es obligatoria.').max(20, 'Máximo 20 caracteres.'),
  programa: z
    .string()
    .trim()
    .min(1, 'El programa es obligatorio.')
    .max(120, 'Máximo 120 caracteres.'),
  turno: z.string().trim().min(1, 'El turno es obligatorio.').max(20, 'Máximo 20 caracteres.'),
  estado: z.enum(['activo', 'cerrado']),
})
export type GrupoFormulario = z.infer<typeof esquemaGrupo>

export const esquemaAlumno = z.object({
  identificador: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,30}$/, 'Usa de 3 a 30 letras, números o guiones.'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
  estatus: z.enum(['activo', 'baja', 'egresado']),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio.').max(500, 'Máximo 500 caracteres.'),
})
export type AlumnoFormulario = z.infer<typeof esquemaAlumno>
