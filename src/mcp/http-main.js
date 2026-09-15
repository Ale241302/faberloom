import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SpacesService } from '../spaces/index.js'
import { JsonFileRepository } from '../store/repository.js'
import { startHttp } from './http.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFile = process.env.FABERLOOM_DATA_FILE || path.join(__dirname, '..', '..', 'data', 'spaces.json')

const service = new SpacesService({ repository: new JsonFileRepository(dataFile) })

startHttp({
  service,
  gatewayKey: process.env.FABERLOOM_GATEWAY_KEY || '',
  defaultUserId: process.env.FABERLOOM_USER_ID || 'anon',
  port: Number(process.env.FABERLOOM_PORT || 8090),
})
