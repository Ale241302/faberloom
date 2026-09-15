import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SpacesService } from '../spaces/index.js'
import { repositoryFromEnv } from '../store/from-env.js'
import { createMcpServer } from './server.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')

const repository = await repositoryFromEnv(process.env, dataDir)
const service = new SpacesService({ repository })
const server = createMcpServer({
  service,
  defaultUserId: process.env.FABERLOOM_USER_ID || 'anon',
})

process.stderr.write(`[faberloom-mcp] store=${process.env.FABERLOOM_STORE || 'json'} usuario=${process.env.FABERLOOM_USER_ID || 'anon'}\n`)
process.stdin.on('end', () => process.exit(0))
server.serveStdio()
