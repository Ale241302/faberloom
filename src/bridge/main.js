import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RoutinesService } from '../routines/index.js'
import { repositoryFromEnv } from '../store/from-env.js'
import { blobStoreFromEnv } from '../store/blob.js'
import { pollMailbox } from './imap.js'

/**
 * Puente de correo: sondea los buzones configurados por cada usuario (fuentes
 * tipo `email`) y entrega los mensajes no vistos como eventos a las rutinas.
 * No avanza ejecuciones: eso lo hace el host (MCP) con sus handlers.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')
const intervalMs = Number(process.env.FABERLOOM_BRIDGE_INTERVAL_MS || 60000)

const repository = await repositoryFromEnv(process.env, dataDir)
const routines = new RoutinesService({ repository })
const blobStore = blobStoreFromEnv(process.env)

async function runOnce() {
  const sources = routines.listAllSources().filter((s) => s.type === 'email')
  for (const src of sources) {
    try {
      const events = await pollMailbox(src.config, { blobStore })
      let delivered = 0
      for (const event of events) {
        const out = routines.run('events.ingest', { event, userId: src.userId })
        if (out.ok) delivered += out.data.started.length + out.data.resumed.length
      }
      if (events.length) process.stderr.write(`[bridge] ${src.userId}: ${events.length} mensajes, ${delivered} acciones\n`)
    } catch (e) {
      process.stderr.write(`[bridge] fuente ${src.id} (${src.userId}): ${e.message}\n`)
    }
  }
}

process.stderr.write(`[bridge] puente IMAP activo (cada ${intervalMs} ms)\n`)
await runOnce().catch((e) => process.stderr.write(`[bridge] error: ${e.message}\n`))
setInterval(() => {
  runOnce().catch((e) => process.stderr.write(`[bridge] error: ${e.message}\n`))
}, intervalMs)
