import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BackupService } from './index.js'
import { repositoryFromEnv } from '../store/from-env.js'
import { blobStoreFromEnv } from '../store/blob.js'

/**
 * CLI de respaldo. Uso:
 *   node src/backup/main.js export [label]   → crea un respaldo y lo verifica
 *   node src/backup/main.js list             → lista respaldos
 *   node src/backup/main.js verify <id>      → verifica integridad
 *   node src/backup/main.js restore <id>     → restaura (requiere FABERLOOM_BACKUP_CONFIRM=1)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')

const repository = await repositoryFromEnv(process.env, dataDir)
const blobStore = blobStoreFromEnv(process.env)
const backup = new BackupService({ repository, blobStore, key: process.env.FABERLOOM_BACKUP_KEY || null })

const [, , command = 'export', arg] = process.argv

if (command === 'export') {
  const out = backup.run('backup.export', { label: arg || process.env.FABERLOOM_BACKUP_LABEL || 'scheduled' })
  if (!out.ok) {
    console.error(out.error)
    process.exit(1)
  }
  const verify = backup.run('backup.verify', { backupId: out.data.id })
  console.log(JSON.stringify({ backup: out.data.id, ref: out.data.ref, size: out.data.size, sha256: out.data.sha256, encrypted: out.data.manifest.encrypted, sections: out.data.manifest.sections, verified: verify.data }))
} else if (command === 'list') {
  console.log(JSON.stringify(backup.run('backup.list', {}).data))
} else if (command === 'verify') {
  const out = backup.run('backup.verify', { backupId: arg })
  console.log(JSON.stringify(out.data ?? out.error))
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
