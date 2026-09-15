import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SpacesService } from '../spaces/index.js'
import { AgentsService } from '../agents/index.js'
import { repositoryFromEnv } from '../store/from-env.js'
import { blobStoreFromEnv } from '../store/blob.js'
import { startHttp } from './http.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')

const repository = await repositoryFromEnv(process.env, dataDir)
const service = new SpacesService({ repository, blobStore: blobStoreFromEnv(process.env) })
const agentsService = new AgentsService({ repository })
agentsService.registerTool({ id: 'echo', name: 'echo', handler: (input) => input })
agentsService.registerTool({ id: 'upper', name: 'upper', handler: (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })

startHttp({
  service,
  agentsService,
  gatewayKey: process.env.FABERLOOM_GATEWAY_KEY || '',
  defaultUserId: process.env.FABERLOOM_USER_ID || 'anon',
  port: Number(process.env.FABERLOOM_PORT || 8090),
})
