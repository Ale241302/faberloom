import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SpacesService } from '../spaces/index.js'
import { AgentsService } from '../agents/index.js'
import { RoutinesService } from '../routines/index.js'
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

const routinesService = new RoutinesService({
  repository,
  availableTools: () => agentsService.listTools().map((t) => t.id),
  availableAgents: () => agentsService.listAgents().map((a) => a.id),
})
routinesService.registerStepHandler('noop', () => ({ output: 'ok' }))
routinesService.registerStepHandler('echo', (ctx) => ({ output: ctx.ex.context }))
routinesService.registerStepHandler('effect_echo', (ctx) => ({ output: 'hecho', effect: { ref: `ef_${ctx.effectKey}` } }))
routinesService.registerStepHandler('wait_event', (ctx) => (ctx.event ? { output: 'respondido' } : { waitFor: { type: 'event', key: ctx.step?.id || 'event' } }))

const server = createMcpServer({
  service,
  agentsService,
  routinesService,
  defaultUserId: process.env.FABERLOOM_USER_ID || 'anon',
})

process.stderr.write(`[faberloom-mcp] store=${process.env.FABERLOOM_STORE || 'json'} usuario=${process.env.FABERLOOM_USER_ID || 'anon'}\n`)
process.stdin.on('end', () => process.exit(0))
server.serveStdio()
