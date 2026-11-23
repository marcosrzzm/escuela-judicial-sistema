// Criterios de aceptación CA-01 a CA-14 (especificación, sección 7) contra la API local.
// Uso local: node pruebas/aceptacion.mjs   (con la API en marcha; reinicia la semilla al empezar)
// Uso contra el temporal: ACEPTACION_URL=https://<temporal> node pruebas/aceptacion.mjs
//   (contraseñas de seguridad/accesos-demo.md; la base debe estar recién sembrada)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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

async function entrar(correo) {
  const c = new Cliente(correo)
  const r = await c.post('/login', { correo, clave: CLAVES[correo] ?? 'Prueba2026' })
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
