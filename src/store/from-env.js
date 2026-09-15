import path from 'node:path'

import { MemoryRepository, JsonFileRepository } from './repository.js'

/**
 * Elige el repositorio según `FABERLOOM_STORE`:
 *   - `json`   (por defecto): archivo JSON con escritura atómica.
 *   - `sqlite`: SQLite (`node:sqlite`), tablas normalizadas.
 *   - `memory`: solo proceso (pruebas).
 *
 * SQLite se importa dinámicamente para no cargar el módulo experimental cuando
 * no se usa.
 */
export async function repositoryFromEnv(env = process.env, dataDir = './data') {
  const store = (env.FABERLOOM_STORE || 'json').toLowerCase()

  if (store === 'memory') return new MemoryRepository()

  if (store === 'sqlite') {
    const { SqliteRepository } = await import('./sqlite.js')
    const file =
      env.FABERLOOM_DB ||
      (env.FABERLOOM_DATA_FILE ? env.FABERLOOM_DATA_FILE.replace(/\.json$/i, '.sqlite') : path.join(dataDir, 'spaces.sqlite'))
    return new SqliteRepository(file)
  }

  const file = env.FABERLOOM_DATA_FILE || path.join(dataDir, 'spaces.json')
  return new JsonFileRepository(file)
}
