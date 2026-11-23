// Criterios de aceptación CA-01 a CA-22 (especificación, sección 7) contra la API local.
// Uso local: node pruebas/aceptacion.mjs   (con la API en marcha; reinicia la semilla al empezar)
// Uso contra el temporal: ACEPTACION_URL=https://<temporal> node pruebas/aceptacion.mjs
//   (contraseñas de seguridad/accesos-demo.md; la base debe estar recién sembrada)
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const REMOTO = process.env.ACEPTACION_URL?.replace(/\/$/, '')
const env = REMOTO ? {} : Object.fromEntries(
  readFileSync(join(raiz, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const BASE = REMOTO ? `${REMOTO}/api` : `http://localhost:${env.API_PUERTO ?? 8080}/api`
const CLAVES = REMOTO
  ? Object.fromEntries([...readFileSync(join(raiz, 'seguridad/accesos-demo.md'), 'utf8').matchAll(/- (\S+) : (\S+)/g)].map((m) => [m[1], m[2]]))
  : {}

if (!REMOTO) execFileSync('bash', [join(raiz, 'scripts/reiniciar-semilla.sh')], { stdio: 'pipe' })

class Cliente {
  cookie = ''
  constructor(correo) {
    this.correo = correo
  }
  async pedir(metodo, ruta, cuerpo) {
    const r = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
    const set = r.headers.getSetCookie?.() ?? []
    if (set.length) this.cookie = set[0].split(';')[0]
    const tipo = r.headers.get('content-type') ?? ''
    const datos = tipo.includes('json') ? await r.json() : await r.text()
    return { estado: r.status, datos, cabeceras: r.headers }
  }
  get = (ruta) => this.pedir('GET', ruta)
  post = (ruta, cuerpo = {}) => this.pedir('POST', ruta, cuerpo)
  put = (ruta, cuerpo = {}) => this.pedir('PUT', ruta, cuerpo)
}

async function entrar(correo, clave) {
  const c = new Cliente(correo)
  const r = await c.post('/login', { correo, clave: clave ?? CLAVES[correo] ?? 'Prueba2026' })
  if (r.estado !== 200) throw new Error(`No pude entrar como ${correo}: ${r.estado} ${JSON.stringify(r.datos)}`)
  return c
}

function afirmar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje)
}
function igual(real, esperado, mensaje) {
  afirmar(JSON.stringify(real) === JSON.stringify(esperado), `${mensaje}: esperaba ${JSON.stringify(esperado)} y llegó ${JSON.stringify(real)}`)
}

const coord = await entrar('coordinacion@prueba.local')
const docA = await entrar('docente.a@prueba.local')
const docB = await entrar('docente.b@prueba.local')
const dir = await entrar('direccion@prueba.local')
const carga = await entrar('carga@prueba.local')
const aux = await entrar('auxiliar@prueba.local')

const periodos = (await coord.get('/periodos')).datos.filas
const abierto = periodos.find((p) => p.estado === 'abierto')
const grupos = (await coord.get(`/grupos?periodo_id=${abierto.id}`)).datos.filas
const g1 = grupos.find((g) => g.clave === 'POS-01')
const g2 = grupos.find((g) => g.clave === 'POS-02')
const asignaciones = (await coord.get(`/asignaciones?periodo_id=${abierto.id}`)).datos.filas
const asigA = asignaciones.find((a) => a.grupo === 'POS-01' && a.materia === 'Derecho Procesal')
const asigB = asignaciones.find((a) => a.grupo === 'POS-02' && a.materia === 'Teoría Jurídica')
const listaG1 = (await coord.get(`/grupos/${g1.id}/lista`)).datos.alumnos.filter((a) => a.estado === 'activa')
const listaG2 = (await coord.get(`/grupos/${g2.id}/lista`)).datos.alumnos.filter((a) => a.estado === 'activa')

const califs = (lista, valores) => ({
  calificaciones: lista.map((a, i) => ({ alumno_id: a.alumno_id, valor: valores[i % valores.length] })),
})

const ctx = {}
const criterios = []
const ca = (id, descripcion, f) => criterios.push({ id, descripcion, f })

ca('CA-01', 'Misma lista para Coordinación, Docente A y Auxiliar; recaptura de la lista en 0', async () => {
  const id = (l) => l.map((a) => `${a.identificador}|${a.nombre}`).sort()
  const delDocente = (await docA.get(`/asignaciones/${asigA.id}`)).datos.alumnos
  const delAuxiliar = (await aux.get(`/grupos/${g1.id}/lista`)).datos.alumnos
  igual(id(delDocente), id(listaG1), 'La lista del docente difiere de la de Coordinación')
  igual(id(delAuxiliar), id(listaG1), 'La lista del auxiliar difiere de la de Coordinación')
  afirmar(listaG1.length === 5, 'POS-01 debería tener 5 alumnos vigentes')
  const m = (await coord.get('/metricas')).datos.sistema.find((c) => c.grupo_id === g1.id && c.tipo === 'lista')
  igual(m.campos_recapturados, 0, 'Campos recapturados de la lista')
})

ca('CA-02', 'Docente A recibe 403 en POS-02 y la entrega de Docente B no cambia', async () => {
  const e = await docB.post(`/asignaciones/${asigB.id}/entrega`)
  afirmar(e.estado === 200, `Docente B no pudo abrir su entrega: ${e.estado}`)
  const g = await docB.put(`/entregas/${e.datos.id}/calificaciones`, { calificaciones: [{ alumno_id: listaG2[0].alumno_id, valor: 9 }] })
  afirmar(g.estado === 200, 'Docente B no pudo guardar su borrador')
  ctx.entregaB = e.datos.id
  const antes = (await docB.get(`/asignaciones/${asigB.id}`)).datos
  igual((await docA.get(`/asignaciones/${asigB.id}`)).estado, 403, 'Docente A lee POS-02')
  igual((await docA.post(`/asignaciones/${asigB.id}/entrega`)).estado, 403, 'Docente A abre entrega de POS-02')
  igual((await docA.put(`/entregas/${e.datos.id}/calificaciones`, { calificaciones: [{ alumno_id: listaG2[0].alumno_id, valor: 1 }] })).estado, 403, 'Docente A guarda en POS-02')
  igual((await docA.post(`/entregas/${e.datos.id}/enviar`)).estado, 403, 'Docente A envía en POS-02')
  const despues = (await docB.get(`/asignaciones/${asigB.id}`)).datos
  igual(despues, antes, 'La entrega de Docente B cambió')
})

ca('CA-03', 'La entrega enviada muestra versión 1, fecha, responsable y estado en Revisión', async () => {
  const e = await docA.post(`/asignaciones/${asigA.id}/entrega`)
  ctx.entregaA = e.datos.id
  // Itzel Barragán (alumno 3) reprueba en esta versión; después se corrige.
  const valores = listaG1.map((a) => ({ alumno_id: a.alumno_id, valor: a.identificador === 'EJ-2026-003' ? 7.0 : 9.0 }))
  const env = await docA.post(`/entregas/${e.datos.id}/enviar`, { calificaciones: valores })
  afirmar(env.estado === 200, `Docente A no pudo enviar: ${env.estado} ${JSON.stringify(env.datos)}`)
  const fila = (await coord.get(`/asignaciones?periodo_id=${abierto.id}`)).datos.filas.find((a) => a.id === asigA.id)
  igual(fila.entrega.version, 1, 'Versión')
  igual(fila.entrega.estado, 'enviada', 'Estado')
  igual(fila.entrega.responsable, 'Dra. Ana Torres', 'Responsable')
  afirmar(Boolean(fila.entrega.fecha_envio), 'Falta la fecha de envío')
})

ca('CA-04', 'Devolver sin motivo responde 422 y nada cambia', async () => {
  const r = await coord.put(`/entregas/${ctx.entregaA}/devolver`, { motivo: '  ' })
  igual(r.estado, 422, 'Devolver sin motivo')
  const vista = (await docA.get(`/asignaciones/${asigA.id}`)).datos
  igual(vista.entrega.estado, 'enviada', 'Estado tras el intento')
  igual(vista.versiones.length, 1, 'Versiones tras el intento')
})

ca('CA-05', 'Aceptar y reabrir: v1 reabierta, v2 en borrador, editar v1 responde 409', async () => {
  igual((await coord.put(`/entregas/${ctx.entregaA}/aceptar`)).estado, 200, 'Aceptar v1')
  const r = await coord.put(`/entregas/${ctx.entregaA}/reabrir`, { motivo: 'Corrección de la calificación de una alumna' })
  igual(r.estado, 200, 'Reabrir v1')
  const vista = (await docA.get(`/asignaciones/${asigA.id}`)).datos
  const v1 = vista.versiones.find((v) => v.version === 1)
  igual(v1.estado, 'reabierta', 'v1 conservada')
  igual(vista.entrega.version, 2, 'Versión vigente')
  igual(vista.entrega.estado, 'borrador', 'Estado de v2')
  igual((await docA.put(`/entregas/${ctx.entregaA}/calificaciones`, { calificaciones: [{ alumno_id: listaG1[0].alumno_id, valor: 5 }] })).estado, 409, 'Editar v1')
  ctx.entregaA2 = vista.entrega.id
})

ca('CA-06', 'El historial junta 2026-A y 2026-B con sus pendientes', async () => {
  const valores = listaG1.map((a) => ({ alumno_id: a.alumno_id, valor: a.identificador === 'EJ-2026-003' ? 8.5 : 9.0 }))
  igual((await docA.post(`/entregas/${ctx.entregaA2}/enviar`, { calificaciones: valores })).estado, 200, 'Enviar v2')
  igual((await coord.put(`/entregas/${ctx.entregaA2}/aceptar`)).estado, 200, 'Aceptar v2')
  const itzel = listaG1.find((a) => a.identificador === 'EJ-2026-003')
  const h = (await coord.get(`/alumnos/${itzel.alumno_id}/historial`)).datos
  const nombres = h.periodos.map((p) => p.periodo)
  igual(nombres, ['2026-A', '2026-B'], 'Periodos en el historial')
  afirmar(h.pendientes.length >= 1, 'El historial no trae pendientes')
  afirmar(h.pendientes.every((p) => p.estado === 'resuelto'), 'Los pendientes de Derecho Procesal debían resolverse con la v2 aceptada')
  const hector = listaG1.find((a) => a.identificador === 'EJ-2026-004')
  const h2 = (await coord.get(`/alumnos/${hector.alumno_id}/historial`)).datos
  afirmar(h2.pendientes.some((p) => p.estado === 'abierto' && p.materia === 'Argumentación'), 'Falta el pendiente abierto de Argumentación')
})

ca('CA-07', 'Cierre de POS-02 sin entrega aceptada: 422; con excepción y motivo se crea y queda en bitácora', async () => {
  igual((await coord.post(`/grupos/${g2.id}/cierres`, {})).estado, 422, 'Sin excepción')
  igual((await coord.post(`/grupos/${g2.id}/cierres`, { excepcion: true })).estado, 422, 'Excepción sin motivo')
  const ok = await coord.post(`/grupos/${g2.id}/cierres`, { excepcion: true, motivo_excepcion: 'Teoría Jurídica sigue en revisión por causa ajena' })
  igual(ok.estado, 200, 'Con excepción')
  const b = (await coord.get('/bitacora?entidad=cierre')).datos.filas
  afirmar(b.some((f) => f.accion === 'preparar' && f.motivo?.includes('Teoría Jurídica') && f.despues?.excepcion === true), 'La excepción no quedó en la bitácora')
})

ca('CA-08', 'Coordinación genera el lote y Carga externa ve periodo, grupo, versión, responsable y fecha', async () => {
  const c = await coord.post(`/grupos/${g1.id}/cierres`, { requiere_autorizacion: false })
  igual(c.estado, 200, 'Preparar cierre de POS-01')
  igual((await coord.put(`/cierres/${c.datos.id}/aprobar`)).estado, 200, 'Aprobar cierre')
  const l = await coord.post(`/cierres/${c.datos.id}/lote`)
  igual(l.estado, 200, 'Generar lote')
  ctx.cierreG1 = c.datos.id
  ctx.lote = l.datos.id
  const fila = (await carga.get('/lotes')).datos.filas.find((x) => x.id === l.datos.id)
  afirmar(fila, 'Carga externa no ve el lote')
  igual([fila.periodo, fila.grupo, fila.version, fila.generado_por], ['2026-B', 'POS-01', 1, 'Lic. Marina Solís'], 'Datos del lote')
  afirmar(Boolean(fila.fecha_generacion), 'Falta la fecha del lote')
  const csv = await coord.get(`/lotes/${l.datos.id}/csv`)
  afirmar(csv.estado === 200 && csv.datos.includes('EJ-2026-001') && csv.datos.split('\r\n').filter(Boolean).length === 6, 'El CSV del lote no trae encabezado y 5 alumnos')
  igual((await coord.get(`/cierres/${c.datos.id}/boletas`)).datos.boletas.length, 5, 'Boletas')
})

ca('CA-09', 'Carga externa registra recepción, carga y discrepancia; no puede tocar el cierre', async () => {
  igual((await carga.put(`/lotes/${ctx.lote}/recepcion`)).estado, 200, 'Recepción')
  igual((await carga.put(`/lotes/${ctx.lote}/carga`, { con_discrepancias: true, discrepancias: '' })).estado, 422, 'Discrepancia sin texto')
  igual((await carga.put(`/lotes/${ctx.lote}/carga`, { con_discrepancias: true, discrepancias: 'La calificación de EJ-2026-003 no coincide en la plataforma' })).estado, 200, 'Carga con discrepancia')
  const vista = (await coord.get(`/grupos/${g1.id}/cierre`)).datos.cierres[0]
  igual(vista.lote_estado, 'con_discrepancias', 'Estado del lote')
  afirmar(vista.discrepancias?.includes('EJ-2026-003') && vista.fecha_recepcion && vista.fecha_carga, 'Coordinación no ve el traspaso completo')
  igual((await carga.put(`/cierres/${ctx.cierreG1}/aprobar`)).estado, 403, 'Carga aprueba cierre')
  igual((await carga.put(`/cierres/${ctx.cierreG1}/resolver`, { resolucion: 'devolver', motivo: 'x' })).estado, 403, 'Carga resuelve cierre')
  igual((await coord.get(`/grupos/${g1.id}/cierre`)).datos.cierres[0].estado, 'aprobado', 'El cierre cambió')
})

ca('CA-10', 'Devolver con motivo queda en la bitácora que ve Dirección, con antes y después', async () => {
  const todas = listaG2.map((a) => ({ alumno_id: a.alumno_id, valor: 8.0 }))
  igual((await docB.post(`/entregas/${ctx.entregaB}/enviar`, { calificaciones: todas })).estado, 200, 'Docente B envía')
  const motivo = 'Falta sustento en la calificación de un alumno'
  const d = await coord.put(`/entregas/${ctx.entregaB}/devolver`, { motivo })
  igual(d.estado, 200, 'Devolver')
  const f = (await dir.get('/bitacora?entidad=entrega_calificaciones&accion=devolver')).datos.filas[0]
  afirmar(f, 'Dirección no ve la acción')
  igual([f.usuario, f.motivo, f.antes.estado, f.despues.estado], ['Lic. Marina Solís', motivo, 'enviada', 'devuelta'], 'Detalle de la bitácora')
  afirmar(Boolean(f.fecha), 'Falta la fecha')
})

ca('CA-11', 'La captura excepcional suma campos recapturados y la línea base aparece junto', async () => {
  const r = await coord.post(`/asignaciones/${asigB.id}/captura-excepcional`, { motivo: 'El docente no pudo acceder al sistema esta semana', ...califs(listaG2, [9, 8.5, 8, 9.5]) })
  igual(r.estado, 200, 'Captura excepcional')
  igual(r.datos.captura_excepcional, true, 'Marca de captura excepcional')
  const lb = await coord.post('/metricas/linea-base', { tipo: 'cierre', grupo_id: g2.id, campos_recapturados: 12, minutos: 45, nota: 'Caso medido en la Escuela con el proceso actual' })
  igual(lb.estado, 200, 'Registrar línea base')
  const m = (await coord.get('/metricas')).datos
  const caso = m.sistema.find((c) => c.grupo_id === g2.id && c.tipo === 'cierre')
  igual(caso.campos_recapturados, 4, 'Campos recapturados del caso')
  afirmar(m.linea_base.some((c) => c.campos_recapturados === 12 && c.segundos_activos === 2700), 'La línea base no aparece')
  afirmar(m.resumen.cierre.linea_base.casos >= 1 && m.resumen.cierre.sistema.casos >= 1, 'El resumen no compara los dos tipos')
})

ca('CA-12', 'Los minutos activos se ven en Métricas y el servidor no acepta más de 30 s por latido', async () => {
  for (const s of [30, 30, 30, 0]) igual((await coord.post('/metricas/tiempo', { tipo: 'lista', grupo_id: g1.id, segundos: s })).estado, 200, 'Latido de lista')
  const inflado = await coord.post('/metricas/tiempo', { tipo: 'lista', grupo_id: g1.id, segundos: 600 })
  igual(inflado.datos.segundos_aceptados, 30, 'Un latido inflado debe recortarse a 30 s')
  for (const s of [30, 30]) await coord.post('/metricas/tiempo', { tipo: 'cierre', grupo_id: g1.id, segundos: s })
  const m = (await coord.get('/metricas')).datos.sistema
  igual(m.find((c) => c.grupo_id === g1.id && c.tipo === 'lista').segundos_activos, 120, 'Segundos de la lista')
  igual(m.find((c) => c.grupo_id === g1.id && c.tipo === 'cierre').segundos_activos, 60, 'Segundos del cierre')
  // La exclusión de la inactividad mayor a 2 minutos la mide el navegador: web/src/lib/tiempoActivo.test.ts.
})

ca('CA-13', 'Auxiliar en POS-02 y Docente B en un historial reciben 403', async () => {
  igual((await aux.get(`/grupos/${g2.id}/lista`)).estado, 403, 'Auxiliar en POS-02')
  igual((await docB.get(`/alumnos/${listaG1[0].alumno_id}/historial`)).estado, 403, 'Docente B en historial')
  const b = (await coord.get('/bitacora?accion=acceso_denegado')).datos.filas
  const quienes = b.map((f) => f.usuario)
  afirmar(quienes.includes('C. Diego Ramos') && quienes.includes('Mtro. Luis Méndez'), 'Los dos intentos no quedaron en la bitácora')
})

ca('CA-14', 'No hay ruta ni botón que firme o escriba en la plataforma oficial', async () => {
  const rutas = readFileSync(join(raiz, 'api/rutas.php'), 'utf8')
    .split('\n')
    .filter((l) => l.trim().startsWith("['"))
  afirmar(rutas.length > 30, 'No pude leer las rutas de api/rutas.php')
  afirmar(!rutas.some((l) => /firm|plataforma|plai|oficial/i.test(l)), 'api/rutas.php tiene una ruta de firma o plataforma')
  let hallazgos = ''
  try {
    hallazgos = execFileSync('grep', ['-rniwE', 'firmar|firma digital|(enviar|subir|publicar|escribir) (a|en) la plataforma', join(raiz, 'web/src')], { encoding: 'utf8' })
  } catch {
    hallazgos = ''
  }
  afirmar(hallazgos === '', `La interfaz menciona una acción de firma o plataforma:\n${hallazgos}`)
  for (const [nombre, c] of [['coordinación', coord], ['dirección', dir], ['carga externa', carga], ['docente', docA]]) {
    for (const ruta of ['/documentos/1/firmar', '/lotes/1/enviar-plataforma', '/cierres/1/firmar']) {
      const r = await c.post(ruta)
      afirmar([404, 405].includes(r.estado), `${nombre}: ${ruta} respondió ${r.estado}`)
    }
  }
  const b = (await coord.get(`/cierres/${ctx.cierreG1}/boletas`)).datos
  igual(b.leyenda, 'Pendiente de firma institucional', 'Leyenda de las boletas')
})

// --- CA-15 a CA-20: administración y uso real (especificación, sección 10) ---------------------
const CLAVE_NUEVA = 'Clave-De-Prueba-2026'
const CORREO_DOCENTE_NUEVO = 'docente.nuevo@prueba.local'
const sinSecretos = (filas, secretos) => {
  const texto = JSON.stringify(filas)
  return !texto.includes('$2y$') && secretos.every((x) => !texto.includes(x))
}

ca('CA-15', 'Docente nuevo: contraseña temporal solo permite cambiarla; luego entra a Mis asignaciones; la bitácora no la guarda', async () => {
  const alta = await coord.post('/usuarios', { nombre: 'Dr. Nuevo Docente', correo: CORREO_DOCENTE_NUEVO, rol: 'docente' })
  igual(alta.estado, 200, 'Alta del docente')
  const temporal = alta.datos.clave_temporal
  afirmar(typeof temporal === 'string' && temporal.length >= 10, 'Falta la contraseña temporal')
  const nuevo = await entrar(CORREO_DOCENTE_NUEVO, temporal)
  const s = (await nuevo.get('/sesion')).datos
  igual(s.debe_cambiar_clave, true, 'Marca de contraseña temporal')
  for (const [m, ruta] of [['GET', '/asignaciones'], ['GET', '/periodos'], ['GET', '/bitacora'], ['POST', '/metricas/tiempo']]) {
    igual((await nuevo.pedir(m, ruta, m === 'GET' ? undefined : {})).estado, 403, `${m} ${ruta} con contraseña temporal`)
  }
  igual((await nuevo.put('/mi-clave', { actual: temporal, nueva: 'corta', confirmacion: 'corta' })).estado, 422, 'Contraseña corta')
  igual((await nuevo.put('/mi-clave', { actual: temporal, nueva: CORREO_DOCENTE_NUEVO, confirmacion: CORREO_DOCENTE_NUEVO })).estado, 422, 'Contraseña igual al correo')
  igual((await nuevo.put('/mi-clave', { actual: temporal, nueva: CLAVE_NUEVA, confirmacion: `${CLAVE_NUEVA}x` })).estado, 422, 'Confirmación distinta')
  igual((await nuevo.put('/mi-clave', { actual: temporal, nueva: CLAVE_NUEVA, confirmacion: CLAVE_NUEVA })).estado, 200, 'Cambio de contraseña')
  igual((await nuevo.get('/asignaciones')).estado, 200, 'Mis asignaciones después de cambiarla')
  igual((await nuevo.get('/sesion')).datos.debe_cambiar_clave, false, 'La marca sigue puesta')
  const b = (await coord.get('/bitacora?entidad=usuario')).datos.filas
  afirmar(b.some((f) => f.accion === 'alta' && f.despues?.correo === CORREO_DOCENTE_NUEVO), 'La alta no está en la bitácora')
  afirmar(sinSecretos(b, [temporal, CLAVE_NUEVA]), 'La bitácora guarda una contraseña o un hash')
  ctx.docenteNuevo = { id: s.id, cliente: nuevo }
})

ca('CA-16', 'Rol "Consulta de Dirección" de solo ver: ve Autorizaciones y Bitácora, no resuelve; fuera del techo responde 422', async () => {
  const roles = (await coord.get('/roles')).datos
  const solo_ver = roles.techos.direccion.filter((p) => p.endsWith(':ver'))
  const rol = await coord.post('/roles', { nombre: 'Consulta de Dirección', base: 'direccion', permisos: solo_ver })
  igual(rol.estado, 200, 'Alta del rol')
  igual((await coord.post('/roles', { nombre: 'Rol de más', base: 'direccion', permisos: ['entrega_calificaciones:aceptar'] })).estado, 422, 'Permiso fuera de la base')
  igual((await coord.post('/roles', { nombre: 'Rol admin', base: 'coordinacion', permisos: ['usuario:crear'] })).estado, 422, 'Administración de usuarios')
  igual((await coord.post('/roles', { nombre: 'Rol ver como', base: 'coordinacion', permisos: ['ver_como:ver'] })).estado, 422, 'Ver como')
  igual((await coord.put(`/roles/${roles.filas[0].id}`, { nombre: 'Otro', estado: 'activo', permisos: [] })).estado, 409, 'Editar un rol del sistema')
  const alta = await coord.post('/usuarios', { nombre: 'Consulta Dirección', correo: 'consulta.direccion@prueba.local', rol: rol.datos.clave })
  igual(alta.estado, 200, 'Alta de la cuenta con el rol nuevo')
  const c = await entrar('consulta.direccion@prueba.local', alta.datos.clave_temporal)
  igual((await c.put('/mi-clave', { actual: alta.datos.clave_temporal, nueva: CLAVE_NUEVA, confirmacion: CLAVE_NUEVA })).estado, 200, 'Cambio de contraseña')
  igual((await c.get('/autorizaciones')).estado, 200, 'Ver Autorizaciones')
  igual((await c.get('/bitacora')).estado, 200, 'Ver Bitácora')
  igual((await c.put('/decisiones/1/resolver', { resolucion: 'autorizada', motivo: 'x' })).estado, 403, 'Resolver una decisión')
  igual((await c.put('/cierres/1/resolver', { resolucion: 'aprobar', motivo: 'x' })).estado, 403, 'Resolver un cierre')
  igual((await c.get('/usuarios')).estado, 403, 'Un rol personalizado no administra usuarios')
  // Cambiar los permisos de un rol cierra las sesiones de sus cuentas.
  const quitar = await coord.put(`/roles/${rol.datos.id}`, { nombre: 'Consulta de Dirección', estado: 'activo', permisos: solo_ver.filter((p) => p !== 'bitacora_cambio:ver') })
  igual(quitar.estado, 200, 'Editar el rol')
  igual((await c.get('/sesion')).estado, 401, 'La sesión de la cuenta sigue abierta tras cambiar el rol')
  igual((await coord.put(`/roles/${rol.datos.id}`, { nombre: 'Consulta de Dirección', estado: 'inactivo', permisos: solo_ver })).estado, 409, 'Inactivar un rol con cuentas activas')
})

ca('CA-17', 'Ver como Docente A: lee lo que él ve, escribir responde 403, los latidos no se guardan y la bitácora lo registra', async () => {
  const idDocA = (await docA.get('/sesion')).datos.id
  const antes = (await docA.get(`/asignaciones/${asigA.id}`)).datos
  const tiempoAntes = (await coord.get('/metricas')).datos.sistema.find((c) => c.grupo_id === g1.id && c.tipo === 'lista').segundos_activos
  igual((await coord.post(`/ver-como/${(await coord.get('/sesion')).datos.id}`)).estado, 409, 'Ver como uno mismo')
  igual((await coord.post(`/ver-como/${idDocA}`)).estado, 200, 'Entrar a Ver como')
  try {
    const s = (await coord.get('/sesion')).datos
    igual([s.solo_lectura, s.base, s.actor_real.nombre], [true, 'docente', 'Lic. Marina Solís'], 'Sesión en vista')
    const mias = (await coord.get(`/asignaciones?periodo_id=${abierto.id}`)).datos.filas
    afirmar(mias.some((a) => a.id === asigA.id) && !mias.some((a) => a.id === asigB.id), 'La vista no es la del docente')
    igual((await coord.get('/usuarios')).estado, 403, 'Administración dentro de la vista')
    igual((await coord.post(`/entregas/${ctx.entregaA2}/enviar`, { calificaciones: [] })).estado, 403, 'Enviar dentro de la vista')
    igual((await coord.put('/mi-clave', { actual: 'x', nueva: 'x', confirmacion: 'x' })).estado, 403, 'Cambiar contraseña dentro de la vista')
    const latido = await coord.post('/metricas/tiempo', { tipo: 'lista', grupo_id: g1.id, segundos: 30 })
    igual([latido.estado, latido.datos.segundos_aceptados], [200, 0], 'Latido dentro de la vista')
  } finally {
    igual((await coord.post('/ver-como/salir')).estado, 200, 'Salir de la vista')
  }
  igual((await coord.get('/sesion')).datos.solo_lectura, false, 'La vista sigue puesta')
  igual((await docA.get(`/asignaciones/${asigA.id}`)).datos, antes, 'La entrega del docente cambió')
  igual((await coord.get('/metricas')).datos.sistema.find((c) => c.grupo_id === g1.id && c.tipo === 'lista').segundos_activos, tiempoAntes, 'Los segundos activos cambiaron')
  const b = (await dir.get('/bitacora?entidad=usuario')).datos.filas
  afirmar(b.some((f) => f.accion === 'ver_como_inicio' && f.usuario === 'Lic. Marina Solís'), 'Falta el inicio de la vista')
  afirmar(b.some((f) => f.accion === 'ver_como_fin' && f.usuario === 'Lic. Marina Solís'), 'Falta el fin de la vista')
  const negados = (await dir.get('/bitacora?accion=acceso_denegado&q=Marina')).datos.filas
  afirmar(negados.some((f) => /vista de solo lectura/.test(f.motivo ?? '')), 'El intento de escritura no quedó a nombre de Coordinación')
  // Cerrar sesión dentro de la vista también cierra la vista en la bitácora.
  const otra = await entrar('coordinacion@prueba.local')
  igual((await otra.post(`/ver-como/${idDocA}`)).estado, 200, 'Segunda vista')
  igual((await otra.post('/logout')).estado, 200, 'Cerrar sesión en la vista')
  const fines = (await dir.get('/bitacora?accion=ver_como_fin')).datos.filas
  afirmar(fines.some((f) => f.motivo === 'cierre de sesión' && f.usuario === 'Lic. Marina Solís'), 'Falta el fin de la vista al cerrar sesión')
})

ca('CA-18', 'Docente A no crea usuarios ni roles ni ve como otro usuario; los tres intentos quedan como acceso denegado', async () => {
  const cuenta = async () => (await coord.get('/bitacora?accion=acceso_denegado&q=Ana%20Torres')).datos.total
  const antes = await cuenta()
  igual((await docA.post('/usuarios', { nombre: 'X', correo: 'x@prueba.local', rol: 'docente' })).estado, 403, 'Crear usuario')
  igual((await docA.post('/roles', { nombre: 'X', base: 'docente', permisos: [] })).estado, 403, 'Crear rol')
  igual((await docA.post('/ver-como/1')).estado, 403, 'Ver como otro usuario')
  igual((await cuenta()) - antes, 3, 'Intentos registrados')
  igual((await docA.get('/sesion')).datos.solo_lectura, false, 'Docente A quedó en una vista')
})

ca('CA-19', 'Desactivar una cuenta con sesión abierta: 401 y no entra; la última Coordinación no se desactiva', async () => {
  const alta = await coord.post('/usuarios', { nombre: 'Cuenta Temporal', correo: 'cuenta.temporal@prueba.local', rol: 'auxiliar' })
  const t = await entrar('cuenta.temporal@prueba.local', alta.datos.clave_temporal)
  igual((await t.get('/sesion')).estado, 200, 'Sesión de la cuenta temporal')
  igual((await coord.put(`/usuarios/${alta.datos.id}`, { nombre: 'Cuenta Temporal', correo: 'cuenta.temporal@prueba.local', rol: 'auxiliar', estado: 'inactivo' })).estado, 200, 'Desactivar')
  igual((await t.get('/sesion')).estado, 401, 'Petición de la cuenta desactivada')
  igual((await t.post('/login', { correo: 'cuenta.temporal@prueba.local', clave: alta.datos.clave_temporal })).estado, 401, 'Inicio de sesión de la cuenta desactivada')
  const yo = (await coord.get('/sesion')).datos
  const mia = { nombre: yo.nombre, correo: yo.correo, rol: 'coordinacion', estado: 'activo' }
  igual((await coord.put(`/usuarios/${yo.id}`, { ...mia, estado: 'inactivo' })).estado, 409, 'Desactivar a la última Coordinación')
  igual((await coord.put(`/usuarios/${yo.id}`, { ...mia, rol: 'docente' })).estado, 409, 'Quitarle el rol a la última Coordinación')
  igual((await coord.get('/sesion')).estado, 200, 'La Coordinación quedó sin sesión')
  const reinicio = await coord.put(`/usuarios/${(await docB.get('/sesion')).datos.id}/clave-temporal`)
  igual(reinicio.estado, 200, 'Restablecer contraseña')
  igual((await docB.get('/sesion')).estado, 401, 'La sesión de Docente B sobrevivió al restablecimiento')
  const b = (await coord.get('/bitacora?entidad=usuario')).datos.filas
  afirmar(sinSecretos(b, [reinicio.datos.clave_temporal, alta.datos.clave_temporal]), 'La bitácora guarda una contraseña o un hash')
  ctx.docBRestablecido = reinicio.datos.clave_temporal
})

ca('CA-20', 'Catálogos y CSV: periodo, materia y grupo nuevos, asignación al docente nuevo e importación con repetidas rechazadas', async () => {
  const per = await coord.post('/periodos', { nombre: '2027-A', fecha_inicio: '2027-01-11', fecha_fin: '2027-06-25' })
  igual(per.estado, 200, 'Alta del periodo')
  igual((await coord.post('/periodos', { nombre: '2027-A', fecha_inicio: '2027-01-11', fecha_fin: '2027-06-25' })).estado, 422, 'Periodo repetido')
  const mat = await coord.post('/materias', { clave: 'ADM-1', nombre: 'Administración de justicia' })
  igual(mat.estado, 200, 'Alta de la materia')
  igual((await coord.post('/materias', { clave: 'ADM-1', nombre: 'Otra' })).estado, 422, 'Clave de materia repetida')
  const gru = await coord.post('/grupos', { periodo_id: per.datos.id, clave: 'ADM-01', programa: 'Especialidad de prueba', turno: 'Matutino' })
  igual(gru.estado, 200, 'Alta del grupo')
  const asig = await coord.post('/asignaciones', { grupo_id: gru.datos.id, materia_id: mat.datos.id, docente_id: ctx.docenteNuevo.id })
  igual(asig.estado, 200, 'Alta de la asignación')
  igual((await coord.post('/asignaciones', { grupo_id: gru.datos.id, materia_id: mat.datos.id, docente_id: ctx.docenteNuevo.id })).estado, 409, 'Asignación repetida')
  const idDirector = (await dir.get('/sesion')).datos.id
  igual((await coord.post('/asignaciones', { grupo_id: gru.datos.id, materia_id: 1, docente_id: idDirector })).estado, 422, 'Asignar a una cuenta que no es docente')
  igual((await coord.put(`/asignaciones/${asig.datos.id}`, { docente_id: (await docA.get('/sesion')).datos.id, motivo: '  ' })).estado, 422, 'Cambiar docente sin motivo')
  const csv = '﻿matrícula,nombre\r\nIMP-001,Ana Prueba Uno\r\nIMP-002,Beto Prueba Dos\r\nIMP-001,Ana Repetida\r\n,Sin matrícula\r\nmal matrícula,Con espacios\r\n'
  const imp = await coord.post(`/grupos/${gru.datos.id}/importar`, { texto: csv })
  igual(imp.estado, 200, 'Importar')
  igual([imp.datos.creadas, imp.datos.inscritas, imp.datos.rechazadas.length], [2, 2, 3], 'Resumen de la importación')
  afirmar(imp.datos.rechazadas.some((r) => r.matricula === 'IMP-001' && /RN-01/.test(r.razon)), 'La repetida no cita RN-01')
  const otra = await coord.post(`/grupos/${gru.datos.id}/importar`, { texto: 'IMP-002;Beto Prueba Dos\nIMP-003;Carla Prueba Tres' })
  igual([otra.datos.creadas, otra.datos.inscritas, otra.datos.rechazadas.length], [1, 1, 1], 'Segunda importación (sin cabecera, con punto y coma)')
  igual((await coord.post(`/grupos/${gru.datos.id}/importar`, { texto: '' })).estado, 422, 'Archivo vacío')
  igual((await docA.post(`/grupos/${gru.datos.id}/importar`, { texto: 'IMP-009,X' })).estado, 403, 'Importar sin permiso')
  const lista = (await coord.get(`/grupos/${gru.datos.id}/lista`)).datos.alumnos.filter((a) => a.estado === 'activa')
  igual(lista.length, 3, 'Lista vigente del grupo nuevo')
  const delDocente = (await ctx.docenteNuevo.cliente.get(`/asignaciones?periodo_id=${per.datos.id}`)).datos.filas
  igual(delDocente.length, 1, 'Asignaciones del docente nuevo')
  const detalle = (await ctx.docenteNuevo.cliente.get(`/asignaciones/${delDocente[0].id}`)).datos
  igual(detalle.alumnos.map((a) => a.identificador).sort(), ['IMP-001', 'IMP-002', 'IMP-003'], 'Lista que ve el docente')
  const al = detalle.alumnos[0]
  igual((await coord.put(`/alumnos/${al.alumno_id}`, { identificador: al.identificador, nombre: 'Nombre Corregido', estatus: 'activo', motivo: '' })).estado, 422, 'Editar alumno sin motivo')
  igual((await coord.put(`/alumnos/${al.alumno_id}`, { identificador: al.identificador, nombre: 'Nombre Corregido', estatus: 'activo', motivo: 'Error de captura' })).estado, 200, 'Editar alumno')
  const cambio = await coord.put(`/asignaciones/${asig.datos.id}`, { docente_id: (await docA.get('/sesion')).datos.id, motivo: 'El titular salió de licencia' })
  igual(cambio.estado, 200, 'Cambiar el docente')
  const b = (await coord.get('/bitacora?accion=cambiar_docente')).datos.filas
  afirmar(b.some((f) => f.motivo === 'El titular salió de licencia' && f.despues?.docente === 'Dra. Ana Torres'), 'El cambio de docente no quedó en la bitácora')
  // Matrícula existente con otro nombre, alumno de baja, archivo mal codificado o enorme.
  const choque = await coord.post(`/grupos/${gru.datos.id}/importar`, { texto: 'IMP-001,Otro Nombre Distinto\nIMP-777,Nuevo Alumno' })
  igual([choque.datos.inscritas, choque.datos.rechazadas.length], [1, 1], 'Matrícula con nombre distinto')
  afirmar(/ya es de /.test(choque.datos.rechazadas[0].razon), 'La razón no nombra al alumno guardado')
  const g2n = await coord.post('/grupos', { periodo_id: per.datos.id, clave: 'ADM-02', programa: 'Otro', turno: 'Matutino' })
  const igualNombre = await coord.post(`/grupos/${g2n.datos.id}/importar`, { texto: 'imp-003;  carla PRUEBA tres ' })
  igual([igualNombre.datos.inscritas, igualNombre.datos.rechazadas.length], [1, 0], 'Mismo nombre con otras mayúsculas y espacios')
  const idBaja = (await coord.get(`/grupos/${gru.datos.id}/lista`)).datos.alumnos.find((x) => x.identificador === 'IMP-002').alumno_id
  igual((await coord.put(`/alumnos/${idBaja}`, { identificador: 'IMP-002', nombre: 'Beto Prueba Dos', estatus: 'baja', motivo: 'Prueba' })).estado, 200, 'Pasar alumno a baja')
  const deBaja = await coord.post(`/grupos/${g2n.datos.id}/importar`, { texto: 'IMP-002,Beto Prueba Dos' })
  afirmar(deBaja.datos.inscritas === 0 && /baja o egresado/.test(deBaja.datos.rechazadas[0].razon), 'Un alumno de baja se inscribió')
  igual((await coord.post(`/grupos/${gru.datos.id}/importar`, { texto: 'IMP-900,Mal \uFFFD codificado' })).estado, 422, 'Archivo con caracteres inválidos')
  igual((await coord.post(`/grupos/${gru.datos.id}/importar`, { texto: 'x'.repeat(1_000_001) })).estado, 422, 'Archivo de más de 1 MB')
  // Un periodo cerrado ya no admite asignaciones nuevas ni cambios de docente.
  igual((await coord.put(`/periodos/${per.datos.id}`, { estado: 'cerrado' })).estado, 200, 'Cerrar el periodo')
  igual((await coord.post('/asignaciones', { grupo_id: g2n.datos.id, materia_id: mat.datos.id, docente_id: ctx.docenteNuevo.id })).estado, 409, 'Asignar en un periodo cerrado')
  igual((await coord.put(`/asignaciones/${asig.datos.id}`, { docente_id: ctx.docenteNuevo.id, motivo: 'Prueba' })).estado, 409, 'Cambiar docente en un periodo cerrado')
})

// CA-21 y CA-22 leen el enlace del archivo que la API deja en seguridad/correos-dev/ cuando no hay llave de Resend (solo local).
const CORREOS = join(raiz, 'seguridad/correos-dev')
const inicioPruebas = Date.now() - 50
/** Enlaces (tokens) que salieron para ese correo desde que empezaron las pruebas, del más viejo al más nuevo. */
function enlacesPara(correo) {
  let nombres = []
  try {
    nombres = readdirSync(CORREOS).sort()
  } catch {
    return []
  }
  return nombres
    .filter((n) => statSync(join(CORREOS, n)).mtimeMs >= inicioPruebas)
    .map((n) => readFileSync(join(CORREOS, n), 'utf8'))
    .filter((t) => t.split('\n')[0] === `Para: ${correo}`)
    .map((t) => /[?&]t=([a-f0-9]{64})/.exec(t)?.[1])
    .filter(Boolean)
}
const anonimo = () => new Cliente('anonimo')
/** Filas de la bitácora de cada acción; falla si alguna no tiene ninguna. */
async function bitacoraDe(acciones) {
  const todas = []
  for (const a of acciones) {
    const filas = (await coord.get(`/bitacora?accion=${a}`)).datos.filas
    afirmar(filas.length > 0, `Falta ${a} en la bitácora`)
    todas.push(...filas)
  }
  return todas
}

if (!REMOTO) {
  ca('CA-21', 'Coordinación invita por correo; la persona crea su contraseña con el enlace y el segundo uso responde 410', async () => {
    const correo = 'invitada@prueba.local'
    const alta = await coord.post('/usuarios', { nombre: 'Invitada Prueba', correo, rol: 'docente', invitar: true })
    igual(alta.estado, 200, 'Alta con invitación')
    igual(alta.datos.correo_enviado, true, 'Correo enviado')
    afirmar(!('clave_temporal' in alta.datos), 'Con la invitación enviada no debe salir una contraseña temporal')
    const [token] = enlacesPara(correo)
    afirmar(token, 'No salió el correo de invitación')
    const persona = anonimo()
    igual((await persona.get(`/acceso/validar?t=${token}`)).datos, { correo }, 'El enlace solo devuelve el correo')
    igual((await persona.get(`/acceso/validar?t=${'0'.repeat(64)}`)).estado, 410, 'Enlace inventado')
    igual((await persona.post('/acceso/clave', { token, nueva: 'corta', confirmacion: 'corta' })).estado, 422, 'Contraseña corta')
    igual((await persona.post('/acceso/clave', { token, nueva: correo, confirmacion: correo })).estado, 422, 'Contraseña igual al correo')
    igual((await persona.post('/acceso/clave', { token, nueva: 'Una clave larga 1', confirmacion: 'Otra clave larga 2' })).estado, 422, 'Confirmación distinta')
    const ok = await persona.post('/acceso/clave', { token, nueva: 'Mi clave propia 2026', confirmacion: 'Mi clave propia 2026' })
    igual(ok.estado, 200, 'Crear la contraseña')
    igual((await persona.get('/sesion')).datos.debe_cambiar_clave, false, 'Entra sin cambio pendiente')
    igual((await persona.get('/asignaciones')).estado, 200, 'Entra a su pantalla sin pasar por una temporal')
    igual((await persona.post('/acceso/clave', { token, nueva: 'Otra clave propia 2026', confirmacion: 'Otra clave propia 2026' })).estado, 410, 'Segundo uso')
    igual((await persona.get(`/acceso/validar?t=${token}`)).estado, 410, 'Validar un enlace ya usado')
    igual((await anonimo().post('/login', { correo, clave: 'Mi clave propia 2026' })).estado, 200, 'Entra con su contraseña nueva')
    const id = (await coord.get(`/usuarios?q=${correo}`)).datos.filas[0].id
    igual((await coord.post(`/usuarios/${id}/invitacion`)).estado, 409, 'Reenviar a quien ya creó su contraseña')
    // Reenviar deja sin efecto la invitación anterior.
    const otra = await coord.post('/usuarios', { nombre: 'Segunda Invitada', correo: 'segunda@prueba.local', rol: 'auxiliar', invitar: true })
    const idOtra = otra.datos.id
    const [primero] = enlacesPara('segunda@prueba.local')
    igual((await coord.post(`/usuarios/${idOtra}/invitacion`)).datos.correo_enviado, true, 'Reenvío')
    const vigentes = enlacesPara('segunda@prueba.local')
    igual(vigentes.length, 2, 'Salieron dos correos')
    igual((await anonimo().get(`/acceso/validar?t=${primero}`)).estado, 410, 'La invitación anterior dejó de servir')
    igual((await anonimo().get(`/acceso/validar?t=${vigentes[1]}`)).estado, 200, 'La nueva sirve')
    igual((await docA.post('/usuarios', { nombre: 'X', correo: 'x@prueba.local', rol: 'docente', invitar: true })).estado, 403, 'Invitar sin permiso')
    igual((await docA.post(`/usuarios/${idOtra}/invitacion`)).estado, 403, 'Reenviar sin permiso')
    const b = await bitacoraDe(['invitacion_enviada', 'invitacion_reenviada', 'invitacion_usada'])
    const todo = JSON.stringify(b)
    afirmar(!todo.includes(token) && !todo.includes(vigentes[1]) && !todo.includes('Mi clave propia'), 'La bitácora guardó un token o una contraseña')
  })

  ca('CA-22', 'Restablecer contraseña: sin autorización no hay enlace; al autorizar sale uno, sirve una vez y cierra sesiones', async () => {
    const respuestaReal = await anonimo().post('/olvide-clave', { correo: 'docente.b@prueba.local' })
    const respuestaFalsa = await anonimo().post('/olvide-clave', { correo: 'nadie@prueba.local' })
    igual([respuestaReal.estado, respuestaReal.datos], [respuestaFalsa.estado, respuestaFalsa.datos], 'La respuesta es la misma exista o no la cuenta')
    igual(enlacesPara('docente.b@prueba.local').length + enlacesPara('nadie@prueba.local').length, 0, 'Sin autorización no sale ningún enlace')
    const cola = (await coord.get('/solicitudes-acceso')).datos.filas
    igual(cola.map((f) => f.correo), ['docente.b@prueba.local'], 'Solo la cuenta real tiene solicitud')
    igual((await docA.get('/solicitudes-acceso')).estado, 403, 'Docente no ve solicitudes')
    igual((await docA.put(`/solicitudes-acceso/${cola[0].id}/autorizar`)).estado, 403, 'Docente no autoriza')
    igual((await coord.get('/inicio')).datos.solicitudes_acceso, 1, 'Contador en Inicio')
    await anonimo().post('/olvide-clave', { correo: 'docente.b@prueba.local' })
    igual((await coord.get('/solicitudes-acceso')).datos.filas.length, 1, 'Una solicitud abierta por cuenta')

    // CA-19 dejó a Docente B con una contraseña temporal: se entra con ella para tener una sesión abierta.
    const docBAbierta = await entrar('docente.b@prueba.local', ctx.docBRestablecido)
    igual((await docBAbierta.get('/sesion')).estado, 200, 'Docente B tiene sesión abierta')
    const auto = await coord.put(`/solicitudes-acceso/${cola[0].id}/autorizar`)
    igual([auto.estado, auto.datos.correo_enviado], [200, true], 'Autorizar')
    igual((await docBAbierta.get('/sesion')).estado, 401, 'Autorizar cierra sus sesiones')
    igual((await coord.put(`/solicitudes-acceso/${cola[0].id}/autorizar`)).estado, 409, 'Autorizar dos veces')
    const enlaces = enlacesPara('docente.b@prueba.local')
    igual(enlaces.length, 1, 'Sale un solo enlace')
    const persona = anonimo()
    igual((await persona.post('/acceso/clave', { token: enlaces[0], nueva: 'Clave restablecida 2026', confirmacion: 'Clave restablecida 2026' })).estado, 200, 'Restablecer')
    igual((await persona.post('/acceso/clave', { token: enlaces[0], nueva: 'Otra restablecida 2026', confirmacion: 'Otra restablecida 2026' })).estado, 410, 'Segundo uso')
    igual((await anonimo().post('/login', { correo: 'docente.b@prueba.local', clave: ctx.docBRestablecido })).estado, 401, 'La contraseña anterior ya no entra')
    igual((await anonimo().post('/login', { correo: 'docente.b@prueba.local', clave: 'Clave restablecida 2026' })).estado, 200, 'Entra con la nueva')

    // Rechazar exige motivo y no manda nada.
    await anonimo().post('/olvide-clave', { correo: 'docente.a@prueba.local' })
    const sol = (await coord.get('/solicitudes-acceso')).datos.filas[0]
    igual((await coord.put(`/solicitudes-acceso/${sol.id}/rechazar`, { motivo: ' ' })).estado, 422, 'Rechazar sin motivo')
    igual((await coord.put(`/solicitudes-acceso/${sol.id}/rechazar`, { motivo: 'No reconozco la solicitud' })).estado, 200, 'Rechazar')
    igual(enlacesPara('docente.a@prueba.local').length, 0, 'Rechazar no manda enlace')
    igual((await coord.put(`/solicitudes-acceso/${sol.id}/rechazar`, { motivo: 'Otra vez' })).estado, 409, 'Rechazar dos veces')

    // Máximo 3 solicitudes por correo cada 24 horas: la cuarta ya no crea nada y responde igual.
    for (let i = 0; i < 3; i++) {
      await anonimo().post('/olvide-clave', { correo: 'direccion@prueba.local' })
      const s = (await coord.get('/solicitudes-acceso')).datos.filas.find((f) => f.correo === 'direccion@prueba.local')
      afirmar(s, `Falta la solicitud ${i + 1} de Dirección`)
      await coord.put(`/solicitudes-acceso/${s.id}/rechazar`, { motivo: 'Prueba del límite' })
    }
    const cuarta = await anonimo().post('/olvide-clave', { correo: 'direccion@prueba.local' })
    igual([cuarta.estado, cuarta.datos], [respuestaReal.estado, respuestaReal.datos], 'La cuarta responde igual')
    afirmar(!(await coord.get('/solicitudes-acceso')).datos.filas.some((f) => f.correo === 'direccion@prueba.local'), 'La cuarta solicitud creó una fila')

    // Enlace por iniciativa de Coordinación.
    const idAux = (await aux.get('/sesion')).datos.id
    igual((await coord.post(`/usuarios/${idAux}/enlace-restablecer`)).datos.correo_enviado, true, 'Enlace por iniciativa propia')
    igual(enlacesPara('auxiliar@prueba.local').length, 1, 'Salió el enlace')
    igual((await docA.post(`/usuarios/${idAux}/enlace-restablecer`)).estado, 403, 'Sin permiso')
    const b = await bitacoraDe(['solicitud_creada', 'solicitud_autorizada', 'solicitud_rechazada', 'restablecer_enviado', 'restablecimiento_usado'])
    const todo = JSON.stringify(b)
    afirmar(!todo.includes(enlaces[0]) && !todo.includes('Clave restablecida'), 'La bitácora guardó un token o una contraseña')
  })
}

let fallas = 0
for (const c of criterios) {
  try {
    await c.f()
    console.log(`PASA   ${c.id}  ${c.descripcion}`)
  } catch (e) {
    fallas++
    console.log(`FALLA  ${c.id}  ${c.descripcion}\n         ${e.message}`)
  }
}
console.log(fallas === 0 ? '\nTodos los criterios pasan.' : `\n${fallas} criterio(s) fallan.`)
process.exit(fallas === 0 ? 0 : 1)
