import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BackupService } from './index.js'
import { offsiteRunnerFromEnv } from './offsite.js'
import { repositoryFromEnv } from '../store/from-env.js'
import { blobStoreFromEnv } from '../store/blob.js'

/**
 * CLI de respaldo. Uso:
 *   node src/backup/main.js export [label]        → crea un respaldo, lo verifica y lo copia offsite
 *   node src/backup/main.js export-to-file <path> → escribe el respaldo a un archivo (para tools externas)
 *   node src/backup/main.js list                  → lista respaldos
 *   node src/backup/main.js verify <id>           → verifica integridad
 *   node src/backup/main.js verify-latest         → verifica el último (tarea programada)
 *   node src/backup/main.js restore <id>          → restaura (requiere FABERLOOM_BACKUP_CONFIRM=1)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')

const repository = await repositoryFromEnv(process.env, dataDir)
const blobStore = blobStoreFromEnv(process.env)
const backup = new BackupService({
  repository,
  blobStore,
  key: process.env.FABERLOOM_BACKUP_KEY || null,
  offsite: offsiteRunnerFromEnv(process.env),
})

const [, , command = 'export', arg] = process.argv

if (command === 'export') {
  const out = backup.run('backup.export', { label: arg || process.env.FABERLOOM_BACKUP_LABEL || 'scheduled' })
  if (!out.ok) {
    console.error(out.error)
    process.exit(1)
  }
  const verify = backup.run('backup.verify', { backupId: out.data.id })
  console.log(JSON.stringify({ backup: out.data.id, ref: out.data.ref, size: out.data.size, sha256: out.data.sha256, encrypted: out.data.manifest.encrypted, sections: out.data.manifest.sections, offsite: out.data.offsite, verified: verify.data }))
} else if (command === 'export-to-file') {
  if (!arg) {
    console.error('falta la ruta del archivo')
    process.exit(2)
  }
  console.log(JSON.stringify(backup.run('backup.exportToFile', { file: arg }).data))
} else if (command === 'list') {
  console.log(JSON.stringify(backup.run('backup.list', {}).data))
} else if (command === 'verify') {
  const out = backup.run('backup.verify', { backupId: arg })
  console.log(JSON.stringify(out.data ?? out.error))
  process.exit(out.ok && out.data.ok ? 0 : 1)
} else if (command === 'verify-latest') {
  const out = backup.run('backup.verifyLatest', {})
  console.log(JSON.stringify(out.data))
  process.exit(out.ok && out.data.ok ? 0 : 1)
} else if (command === 'restore') {
  if (process.env.FABERLOOM_BACKUP_CONFIRM !== '1') {
    console.error('Restaurar requiere FABERLOOM_BACKUP_CONFIRM=1 (modo detenido)')
    process.exit(2)
  }
  const out = backup.run('backup.restore', { backupId: arg, confirm: true })
  console.log(JSON.stringify(out.data ?? out.error))
  process.exit(out.ok ? 0 : 1)
} else {
  console.error(`comando desconocido: ${command}`)
  process.exit(2)
}
