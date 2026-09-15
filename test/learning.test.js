import { test } from 'node:test'
import assert from 'node:assert/strict'

import { LearningService } from '../src/learning/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
const svc = (repo) => new LearningService({ repository: repo, idGen: seq('id'), now: fixedNow })

// F13 — una corrección local se recupera en un caso posterior del mismo alcance
test('F13 · la enseñanza se recupera en el alcance correcto y no contamina otro', () => {
  const s = svc()
  const t = s.run('learning.propose', { ownerId: 'u1', scope: { spaceId: 'eguisa' }, kind: 'preference', text: 'Consultar el precio vigente antes de cotizar' }).data
  assert.equal(s.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'eguisa' } }).data.length, 0) // candidata aún
  s.run('learning.activate', { teachingId: t.id })
  assert.equal(s.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'eguisa' } }).data.length, 1)
  assert.equal(s.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'otro-cliente' } }).data.length, 0)
})

// F36 — editar/revocar mantiene historia, alcance y usos
test('F36 · editar usa la versión vigente; revocar conserva historia y usos', () => {
  const s = svc()
  const t = s.run('learning.propose', { ownerId: 'u1', scope: { spaceId: 'eguisa' }, text: 'v1' }).data
  s.run('learning.activate', { teachingId: t.id })
  s.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'eguisa' } }) // uso de v1

  const edited = s.run('learning.edit', { teachingId: t.id, text: 'v2' }).data
  assert.equal(edited.version, 2)
  assert.equal(edited.text, 'v2')
  assert.equal(edited.versions[0].status, 'superseded')
  const got = s.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'eguisa' } }).data[0]
  assert.equal(got.version, 2)

  const usages = s.run('learning.usages', { teachingId: t.id }).data
  assert.equal(usages.length, 2)
  assert.deepEqual(usages.map((u) => u.version), [1, 2])

  s.run('learning.revoke', { teachingId: t.id, reason: 'ya no aplica' })
  assert.equal(s.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'eguisa' } }).data.length, 0)
  assert.equal(s.run('learning.list', { ownerId: 'u1' }).data[0].versions.length, 2) // historia intacta
  assert.equal(s.run('learning.usages', { teachingId: t.id }).data.length, 2)
})

// F14 — muchas iteraciones por cambio de requisito no son fallo del agente
test('F14 · el cambio de requisito no cuenta como fallo', () => {
  const s = svc()
  s.run('learning.recordOutcome', { ownerId: 'u1', agentId: 'a1', taskType: 'proforma', outcome: 'approved' })
  s.run('learning.recordOutcome', { ownerId: 'u1', agentId: 'a1', taskType: 'proforma', outcome: 'requirement_change' })
  s.run('learning.recordOutcome', { ownerId: 'u1', agentId: 'a1', taskType: 'proforma', outcome: 'requirement_change' })
  const perf = s.run('learning.performance', { agentId: 'a1', taskType: 'proforma' }).data
  assert.equal(perf.requirementChanges, 2)
  assert.equal(perf.corrected, 0)
  assert.equal(perf.errors, 0)
  assert.equal(perf.correctionRate, 0)
  assert.equal(perf.evidence, 'insuficiente')
})

// F15 — error posterior: enseñanza vinculada al caso, historia intacta
test('F15 · error posterior crea una enseñanza vinculada sin borrar el pasado', () => {
  const s = svc()
  const original = s.run('learning.propose', { ownerId: 'u1', scope: { spaceId: 'eguisa' }, text: 'usar lista vigente' }).data
  s.run('learning.activate', { teachingId: original.id })

  const late = s.run('learning.recordLateError', { ownerId: 'u1', scope: { spaceId: 'eguisa' }, text: 'el término de pago cambió', provenance: { ref: 'board:brd_1', itemId: 'brd_1' } }).data
  assert.equal(late.kind, 'error')
  assert.equal(late.status, 'active')
  assert.equal(late.provenance.source, 'late_error')
  assert.equal(late.provenance.ref, 'board:brd_1')

  const unchanged = s.run('learning.list', { ownerId: 'u1' }).data.find((x) => x.id === original.id)
  assert.equal(unchanged.versions.length, 1)
})

// F32 — exportar/importar conserva versiones; no restaura permisos
test('F32 · restaurar el conocimiento conserva versiones y no restaura permisos', () => {
  const s1 = svc()
  const t = s1.run('learning.propose', { ownerId: 'u1', scope: { agentId: 'esp1' }, text: 'v1' }).data
  s1.run('learning.activate', { teachingId: t.id })
  s1.run('learning.edit', { teachingId: t.id, text: 'v2' })
  const exported = s1.run('learning.exportScope', { ownerId: 'u1', scope: { agentId: 'esp1' } }).data
  assert.equal(exported.teachings.length, 1)
  assert.equal(exported.teachings[0].versions.length, 2)

  const s2 = svc()
  const res = s2.run('learning.importRecords', { ownerId: 'u1', records: exported.teachings }).data
  assert.equal(res.imported, 1)
  assert.equal(res.grantsRestored, 0) // los permisos se comprueban aparte
  const imported = s2.run('learning.retrieve', { ownerId: 'u1', scope: { agentId: 'esp1' } }).data[0]
  assert.equal(imported.version, 2)
  assert.equal(imported.versions.length, 2)
})

test('el conocimiento persiste (SQLite)', () => {
  const repo = new SqliteRepository(':memory:')
  const s1 = svc(repo)
  const t = s1.run('learning.propose', { ownerId: 'u1', scope: { spaceId: 'e1' }, text: 'regla' }).data
  s1.run('learning.activate', { teachingId: t.id })
  s1.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'e1' } })

  const s2 = svc(repo)
  assert.equal(s2.run('learning.retrieve', { ownerId: 'u1', scope: { spaceId: 'e1' }, recordUsage: false }).data.length, 1)
  assert.equal(s2.run('learning.usages', { teachingId: t.id }).data.length, 1)
})
