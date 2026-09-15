import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SpacesService } from '../spaces/index.js'
import { AgentsService } from '../agents/index.js'
import { repositoryFromEnv } from '../store/from-env.js'
import { blobStoreFromEnv } from '../store/blob.js'
import { createMcpServer } from './server.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')

const repository = await repositoryFromEnv(process.env, dataDir)
const service = new SpacesService({ repository, blobStore: blobStoreFromEnv(process.env) })
const agentsService = new AgentsService({ repository })
// Herramientas ejecutables de ejemplo (el host puede registrar las suyas).
agentsService.registerTool({ id: 'echo', name: 'echo', handler: (input) => input })
agentsService.registerTool({ id: 'upper', name: 'upper', handler: (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })
agentsService.registerTool({ id: 'async_upper', name: 'async_upper', handler: async (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })
const server = createMcpServer({
  service,
  agentsService,
  defaultUserId: process.env.FABERLOOM_USER_ID || 'anon',
})

process.stderr.write(`[faberloom-mcp] store=${process.env.FABERLOOM_STORE || 'json'} usuario=${process.env.FABERLOOM_USER_ID || 'anon'}\n`)
process.stdin.on('end', () => process.exit(0))
server.serveStdio()
