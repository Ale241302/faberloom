import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

import { BackupService } from '../src/backup/index.js'
import { SpacesService } from '../src/spaces/index.js'
import { LearningService } from '../src/learning/index.js'
import { AccessService } from '../src/access/index.js'
import { RoutinesService } from '../src/routines/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'
import { MemoryBlobStore } from '../src/store/blob.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}

test('respaldo: exportar, verificar y previsualizar', () => {
  const repo = new SqliteRepository(':memory:')
  const blob = new MemoryBlobStore()
  const spaces = new SpacesService({ repository: repo, idGen: seq('sp'), now: fixedNow })
  spaces.run('spaces.create', { name: 'Marluvas', ownerId: 'u1' })
  spaces.run('spaces.personal', { userId: 'u1' })

  const backup = new BackupService({ repository: repo, blobStore: blob, idGen: seq('bkp'), now: fixedNow })
  const rec = backup.run('backup.export', {}).data
  assert.equal(rec.manifest.sections.spaces, 2)
  assert.equal(rec.manifest.encrypted, false)
  assert.equal(backup.run('backup.list', {}).data.length, 1)

  const verify = backup.run('backup.verify', { backupId: rec.id }).data
  assert.equal(verify.ok, true)
  assert.equal(verify.hashOk, true)

  const preview = backup.run('backup.previewRestore', { backupId: rec.id }).data
  assert.equal(preview.counts.spaces, 2)
  assert.equal(preview.encrypted, false)
})

test('respaldo cifrado: verificar y restaurar con la clave', () => {
  const repo = new SqliteRepository(':memory:')
  const blob = new MemoryBlobStore()
  const key = randomBytes(32).toString('hex')
  const spaces = new SpacesService({ repository: repo, idGen: seq('sp'), now: fixedNow })
  spaces.run('spaces.create', { name: 'Sondel', ownerId: 'u1' })

  const backup = new BackupService({ repository: repo, blobStore: blob, key, idGen: seq('bkp'), now: fixedNow })
  const rec = backup.run('backup.export', { label: 'diario' }).data
  assert.equal(rec.manifest.encrypted, true)

  const verify = backup.run('backup.verify', { backupId: rec.id }).data
  assert.equal(verify.ok, true)

  // Restaurar con clave incorrecta falla.
  const badKey = randomBytes(32).toString('hex')
  const bad = new BackupService({ repository: repo, blobStore: blob, key: badKey, idGen: seq('x'), now: fixedNow })
  const failRestore = bad.run('backup.restore', { backupId: rec.id, confirm: true })
  assert.equal(failRestore.ok, false)
  assert.equal(failRestore.error.code, 'DECRYPT_FAILED')

  // Restaurar con la clave correcta funciona.
  const good = new BackupService({ repository: repo, blobStore: blob, key, idGen: seq('g'), now: fixedNow })
  const restored = good.run('backup.restore', { backupId: rec.id, confirm: true }).data
  assert.equal(restored.restored.spaces, 1)
})

// F20 — instalación limpia: el respaldo reconstruye el conocimiento
test('F20 · restauración en un repositorio limpio', () => {
  const blob = new MemoryBlobStore()
  const repo1 = new SqliteRepository(':memory:')
  const learning1 = new LearningService({ repository: repo1, idGen: seq('l'), now: fixedNow })
  const t = learning1.run('learning.propose', { ownerId: 'u1', scope: { spaceId: 'e1' }, text: 'regla' }).data
  learning1.run('learning.activate', { teachingId: t.id })

  const backup1 = new BackupService({ repository: repo1, blobStore: blob, idGen: seq('bkp'), now: fixedNow })
  const rec = backup1.run('backup.export', {}).data

  // "Instalación limpia": repositorio nuevo, mismo almacén externo.
  const repo2 = new SqliteRepository(':memory:')
  const seed = new BackupService({ repository: repo2, blobStore: blob, idGen: seq('s'), now: fixedNow })
  repo2.saveBackup(rec) // registro del respaldo disponible en el entorno nuevo
  const report = seed.run('backup.restore', { backupId: rec.id, confirm: true }).data
  assert.equal(report.restored.teachings, 1)
  const learning2 = new LearningService({ repository: repo2, idGen: seq('l2'), now: fixedNow })
  assert.equal(learning2.run('learning.list', { ownerId: 'u1' }).data.length, 1)
})

test('restauración en modo detenido: pausa ejecuciones y revalida concesiones', () => {
  const repo = new SqliteRepository(':memory:')
  const blob = new MemoryBlobStore()
  const routines = new RoutinesService({ repository: repo, idGen: seq('r'), now: fixedNow })
  routines.registerStepHandler('noop', () => ({ output: 'ok' }))
  const r = routines.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'noop' }] }).data
  routines.run('routines.activate', { routineId: r.id })
  const ex = routines.run('executions.start', { routineId: r.id }).data.execution // queda 'pending' (en curso)

  const access = new AccessService({ repository: repo, idGen: seq('g'), now: fixedNow })
  access.run('access.grant', { ownerId: 'u1', action: 'send_document', context: { spaceId: 's1' } })
  access.run('access.grant', { ownerId: 'u1', action: 'send_document', context: { spaceId: 'ok' } })

  const backup = new BackupService({
    repository: repo,
    blobStore: blob,
    idGen: seq('bkp'),
    now: fixedNow,
    // En el nuevo entorno, 's1' ya no es accesible.
    recheckGrant: (g) => ({ allowed: g.context && g.context.spaceId === 'ok' }),
  })
  const rec = backup.run('backup.export', {}).data

  const preview = backup.run('backup.previewRestore', { backupId: rec.id }).data
  assert.equal(preview.willPauseExecutions, 1)
  assert.equal(preview.willRecheckGrants, 2)

  const report = backup.run('backup.restore', { backupId: rec.id, confirm: true }).data
  assert.equal(report.mode, 'stopped')
  assert.deepEqual(report.pausedExecutions, [ex.id])
  assert.equal(report.grantsRevoked, 1)
  assert.equal(report.grantsKept, 1)

  const runs = new RoutinesService({ repository: repo, idGen: seq('r2'), now: fixedNow }).run('executions.get', { executionId: ex.id }).data
  assert.equal(runs.status, 'needs_review')
  const grants = new AccessService({ repository: repo, idGen: seq('g2'), now: fixedNow }).run('access.list', { ownerId: 'u1', status: 'active' }).data
  assert.equal(grants.length, 1)
  assert.equal(grants[0].context.spaceId, 'ok')
})

test('la restauración exige confirmación', () => {
  const repo = new SqliteRepository(':memory:')
  const blob = new MemoryBlobStore()
  const backup = new BackupService({ repository: repo, blobStore: blob, idGen: seq('bkp'), now: fixedNow })
  const rec = backup.run('backup.export', {}).data
  const r = backup.run('backup.restore', { backupId: rec.id })
  assert.equal(r.ok, false)
  assert.equal(r.error.code, 'CONFIRM_REQUIRED')
})
