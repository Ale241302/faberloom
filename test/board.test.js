import { test } from 'node:test'
import assert from 'node:assert/strict'

import { BoardService } from '../src/board/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
const svc = (repo) => new BoardService({ repository: repo, idGen: seq('id'), now: fixedNow })

// F16 — preparar autorizado, enviar no
test('F16 · aprobar no produce efectos; el efecto exige autorización explícita', () => {
  const s = svc()
  const item = s.run('board.submit', { ownerId: 'u1', title: 'Proforma Eguisa', kind: 'proforma', result: { total: 100 }, evidence: { ref: 'exec:1:step3' } }).data
  assert.equal(item.status, 'waiting_approval')

  const approved = s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' }).data
  assert.equal(approved.status, 'approved')
  assert.equal(approved.effects.length, 0) // aprobar NO envía

  const sinAuth = s.run('board.recordEffect', { itemId: item.id, revision: 1, ref: 'sender:1', userId: 'u1' })
  assert.equal(sinAuth.ok, false)
  assert.equal(sinAuth.error.code, 'NO_AUTHORIZATION')

  const conAuth = s.run('board.recordEffect', { itemId: item.id, revision: 1, ref: 'sender:1', userId: 'u1', authorizationRef: 'grant:12' }).data
  assert.equal(conAuth.status, 'completed')
  assert.equal(conAuth.effects.length, 1)
  assert.equal(conAuth.effects[0].authorizationRef, 'grant:12')
})

// «Preparado» exige evidencia real
test('sin evidencia no se puede presentar un resultado', () => {
  const s = svc()
  const r = s.run('board.submit', { ownerId: 'u1', title: 'X' })
  assert.equal(r.ok, false)
  assert.equal(r.error.code, 'NO_EVIDENCE')
})

// Aprobación ligada a la versión exacta
test('la aprobación apunta a la versión exacta; una corrección invalida la anterior', () => {
  const s = svc()
  const item = s.run('board.submit', { ownerId: 'u1', title: 'Doc', result: { v: 1 }, evidence: { ref: 'e1' } }).data
  const corrected = s.run('board.review', { itemId: item.id, revision: 1, decision: 'correction', comment: 'falta el término', result: { v: 2 }, userId: 'u1' }).data
  assert.equal(corrected.revision, 2)
  assert.equal(corrected.status, 'in_progress')

  const stale = s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' })
  assert.equal(stale.ok, false)
  assert.equal(stale.error.code, 'STALE_REVISION')

  const ok = s.run('board.review', { itemId: item.id, revision: 2, decision: 'approve', userId: 'u1' }).data
  assert.equal(ok.status, 'approved')
  assert.equal(ok.revision, 2)
})

// F09 — el precio cambió durante la espera → revalidar antes del efecto
test('F09 · si los datos cambian, la aprobación queda obsoleta y se revalida', () => {
  const s = svc()
  const item = s.run('board.submit', { ownerId: 'u1', title: 'Proforma', result: { total: 100 }, evidence: { ref: 'e1' } }).data
  s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' })

  const stale = s.run('board.markStale', { itemId: item.id, reason: 'price_changed', userId: 'u1' }).data
  assert.equal(stale.status, 'waiting_approval')
  assert.equal(stale.stale, true)

  const blocked = s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' })
  assert.equal(blocked.ok, false)
  assert.equal(blocked.error.code, 'REVALIDATION_REQUIRED')

  // El efecto también queda bloqueado mientras esté obsoleto
  const effectBlocked = s.run('board.recordEffect', { itemId: item.id, revision: 1, ref: 's:1', authorizationRef: 'g:1' })
  assert.equal(effectBlocked.ok, false)

  // Revalidación sin cambios → se puede volver a aprobar
  const reval = s.run('board.revalidate', { itemId: item.id, changed: false }).data
  assert.equal(reval.stale, false)
  assert.equal(s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' }).data.status, 'approved')
})

test('revalidar con cambios exige una nueva revisión', () => {
  const s = svc()
  const item = s.run('board.submit', { ownerId: 'u1', title: 'Doc', result: { v: 1 }, evidence: { ref: 'e1' } }).data
  s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' })
  const changed = s.run('board.revalidate', { itemId: item.id, changed: true, note: 'price_changed' }).data
  assert.equal(changed.stale, true)
  assert.equal(changed.status, 'waiting_approval')
  assert.equal(s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' }).ok, false)
})

test('estados de excepción: datos y reapertura', () => {
  const s = svc()
  const item = s.run('board.submit', { ownerId: 'u1', title: 'Doc', result: {}, evidence: { ref: 'e1' } }).data
  assert.equal(s.run('board.requestData', { itemId: item.id, reason: 'falta la OC' }).data.status, 'waiting_data')
  s.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' })
  assert.equal(s.run('board.reopen', { itemId: item.id, reason: 'error posterior' }).data.status, 'reopened')
})

test('la Mesa persiste (SQLite) entre instancias', () => {
  const repo = new SqliteRepository(':memory:')
  const s1 = svc(repo)
  const item = s1.run('board.submit', { ownerId: 'u1', title: 'Doc', result: { v: 1 }, evidence: { ref: 'e1' } }).data
  s1.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' })

  const s2 = svc(repo)
  const got = s2.run('board.get', { itemId: item.id }).data
  assert.equal(got.status, 'approved')
  assert.equal(got.revision, 1)
  assert.equal(s2.run('board.list', { ownerId: 'u1' }).data.length, 1)
})
