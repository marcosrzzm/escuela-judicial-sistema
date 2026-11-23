// Solo lectura: compara las migraciones de sql/ con la base del temporal (a través del instalador de un solo uso).
// Uso: node scripts/migrar-base.mjs --estado   (lee seguridad/destino.json: {"url","token"}). Imprime "PENDIENTE <archivo>".
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
if (!process.argv.includes('--estado')) {
  console.error('Solo se permite --estado: las migraciones se aplican con el instalador.')
  process.exit(2)
}
const destino = JSON.parse(readFileSync(join(raiz, 'seguridad/destino.json'), 'utf8'))
const esquema = readFileSync(join(raiz, 'sql/01_esquema.sql'), 'utf8')
const tablas01 = (esquema.match(/^CREATE TABLE/gm) ?? []).length
const tablas = tablas01 + (readFileSync(join(raiz, 'sql/03_administracion.sql'), 'utf8').match(/^CREATE TABLE/gm) ?? []).length
const triggers = (readFileSync(join(raiz, 'sql/02_bitacora_inmutable.sql'), 'utf8').match(/^CREATE TRIGGER/gm) ?? []).length
const r = await fetch(destino.url, { method: 'POST', body: new URLSearchParams({ token: destino.token, accion: 'estado' }) })
if (!r.ok) {
  console.error(`FALLO: el destino respondió ${r.status}`)
  process.exit(1)
}
const e = await r.json()
if (e.tablas < tablas01) console.log('PENDIENTE 01_esquema.sql')
if (e.tablas < tablas) console.log('PENDIENTE 03_administracion.sql')
if (e.triggers < triggers) console.log('PENDIENTE 02_bitacora_inmutable.sql')
console.log(`Base con ${e.tablas} tablas y ${e.triggers} disparadores; esperadas ${tablas} y ${triggers}.`)
