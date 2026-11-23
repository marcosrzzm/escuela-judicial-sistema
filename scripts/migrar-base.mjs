// Solo lectura: compara las migraciones de sql/ con la base del temporal (a través del instalador de un solo uso).
// Uso: node scripts/migrar-base.mjs --estado   (lee seguridad/destino.json: {"url","token"}). Imprime "PENDIENTE <archivo>".
// Aplicar solo las migraciones pendientes (03 y 04) en el temporal, sin borrar nada (el servidor tiene subido scripts/migrar-remoto.php):
//   node scripts/migrar-base.mjs --aplicar --respaldo seguridad/respaldos/<volcado>.sql
// Se niega si el respaldo no existe, está vacío, tiene más de 24 horas o no parece un volcado de la base.
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const aplicar = process.argv.includes('--aplicar')
if (!process.argv.includes('--estado') && !aplicar) {
  console.error('Uso: --estado, o --aplicar --respaldo <volcado.sql>. El instalador borra todo y no es una migración.')
  process.exit(2)
}
let huella = ''
if (aplicar) {
  const i = process.argv.indexOf('--respaldo')
  const ruta = i > 0 ? process.argv[i + 1] : undefined
  if (!ruta) {
    console.error('Falta --respaldo <volcado.sql>: sin un respaldo de la base no se migra.')
    process.exit(2)
  }
  let contenido
  try {
    const f = statSync(join(raiz, ruta.startsWith('/') ? ruta : ruta))
    if (!f.isFile() || f.size < 1000 || Date.now() - f.mtimeMs > 24 * 3600 * 1000) throw new Error('vacío o con más de 24 horas')
    contenido = readFileSync(join(raiz, ruta.startsWith('/') ? ruta : ruta))
    if (!/CREATE TABLE/i.test(contenido.toString('utf8')) || !/usuario/.test(contenido.toString('utf8'))) throw new Error('no parece un volcado de la base')
  } catch (e) {
    console.error(`El respaldo no sirve (${e.message}). No se aplicó nada.`)
    process.exit(2)
  }
  huella = createHash('sha256').update(contenido).digest('hex')
}
const destino = JSON.parse(readFileSync(join(raiz, 'seguridad/destino.json'), 'utf8'))
const esquema = readFileSync(join(raiz, 'sql/01_esquema.sql'), 'utf8')
const tablas01 = (esquema.match(/^CREATE TABLE/gm) ?? []).length
const tablas03 = tablas01 + (readFileSync(join(raiz, 'sql/03_administracion.sql'), 'utf8').match(/^CREATE TABLE/gm) ?? []).length
const tablas = tablas03 + (readFileSync(join(raiz, 'sql/04_acceso_por_correo.sql'), 'utf8').match(/^CREATE TABLE/gm) ?? []).length
const triggers = (readFileSync(join(raiz, 'sql/02_bitacora_inmutable.sql'), 'utf8').match(/^CREATE TRIGGER/gm) ?? []).length
const r = await fetch(destino.url, {
  method: 'POST',
  body: new URLSearchParams({ token: destino.token, accion: aplicar ? 'aplicar' : 'estado', ...(aplicar ? { respaldo_sha256: huella } : {}) }),
})
if (!r.ok) {
  console.error(`FALLO: el destino respondió ${r.status}`)
  process.exit(1)
}
const e = await r.json()
if (aplicar) {
  console.log(JSON.stringify(e))
  process.exit(0)
}
if (e.tablas < tablas01) console.log('PENDIENTE 01_esquema.sql')
if (e.tablas < tablas03) console.log('PENDIENTE 03_administracion.sql')
if (e.tablas < tablas) console.log('PENDIENTE 04_acceso_por_correo.sql')
if (e.triggers < triggers) console.log('PENDIENTE 02_bitacora_inmutable.sql')
console.log(`Base con ${e.tablas} tablas y ${e.triggers} disparadores; esperadas ${tablas} y ${triggers}.`)
