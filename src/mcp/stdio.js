import { SpacesService } from '../spaces/index.js'
import { JsonFileRepository } from '../store/repository.js'
import { createMcpServer } from './server.js'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFile = process.env.FABERLOOM_DATA_FILE || path.join(__dirname, '..', '..', 'data', 'spaces.json')

const service = new SpacesService({ repository: new JsonFileRepository(dataFile) })
const server = createMcpServer({
  service,
  defaultUserId: process.env.FABERLOOM_USER_ID || 'anon',
})

process.stderr.write(`[faberloom-mcp] espacios en ${dataFile}; usuario=${process.env.FABERLOOM_USER_ID || 'anon'}\n`)
process.stdin.on('end', () => process.exit(0))
server.serveStdio()
