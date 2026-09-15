import { test } from 'node:test'
import assert from 'node:assert/strict'

import { AccessService } from '../src/access/index.js'
import { BoardService } from '../src/board/index.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
const svc = () => new AccessService({ idGen: seq('id'), now: fixedNow })

test('concesión: permite, respeta contexto, expira y se agota', () => {
  const s = svc()
  const g = s.run('access.grant', { ownerId: 'u1', agentId: 'a1', action: 'send_document', context: { spaceId: 'eguisa' }, maxUses: 1 }).data
  assert.equal(s.run('access.check', { grantId: g.id, action: 'send_document', context: { spaceId: 'eguisa' } }).data.allowed, true)
  assert.equal(s.run('access.check', { grantId: g.id, action: 'send_document', context: { spaceId: 'otro' } }).data.reason, 'OUT_OF_CONTEXT')

  s.run('access.consume', { grantId: g.id })
  assert.equal(s.run('access.check', { grantId: g.id, action: 'send_document', context: { spaceId: 'eguisa' } }).data.reason, 'GRANT_EXHAUSTED')

  const g2 = s.run('access.grant', { ownerId: 'u1', action: 'x', expiresAt: '2020-01-01T00:00:00.000Z' }).data
  assert.equal(s.run('access.check', { grantId: g2.id, action: 'x' }).data.reason, 'GRANT_EXPIRED')

  s.run('access.revoke', { grantId: g.id, reason: 'ya no' })
  assert.equal(s.run('access.check', { grantId: g.id, action: 'send_document' }).data.reason, 'GRANT_REVOKED')
})

test('sin concesión no hay permiso', () => {
  const s = svc()
  assert.equal(s.run('access.check', { ownerId: 'u1', action: 'send_document' }).data.allowed, false)
  assert.equal(s.run('access.check', { ownerId: 'u1', action: 'send_document' }).data.reason, 'NO_GRANT')
})

test('un grantId desconocido no cae a otra concesión de la misma acción', () => {
  const s = svc()
  s.run('access.grant', { ownerId: 'u1', action: 'board.effect' })
  const r = s.run('access.check', { grantId: 'grn_x', action: 'board.effect' }).data
  assert.equal(r.allowed, false)
  assert.equal(r.reason, 'GRANT_NOT_FOUND')
})

test('Mesa ↔ autonomía: aprobar no concede permiso; el efecto valida la concesión', () => {
  const access = svc()
  const board = new BoardService({ idGen: seq('b'), now: fixedNow, authorize: (ref, ctx) => access.check({ grantId: ref, action: ctx.action, context: ctx.context }) })

  const item = board.run('board.submit', { ownerId: 'u1', title: 'Proforma', kind: 'proforma', evidence: { ref: 'e1' } }).data
  board.run('board.review', { itemId: item.id, revision: 1, decision: 'approve', userId: 'u1' })
  // Aprobar NO crea ninguna concesión.
  assert.equal(access.run('access.list', { ownerId: 'u1' }).data.length, 0)

  // El efecto sin concesión válida se rechaza.
  const denied = board.run('board.recordEffect', { itemId: item.id, revision: 1, ref: 'sender:1', userId: 'u1', authorizationRef: 'grn_inexistente' })
  assert.equal(denied.ok, false)
  assert.equal(denied.error.code, 'NO_AUTHORIZATION')

  // Con una concesión válida para la acción del efecto, se registra.
  const grant = access.run('access.grant', { ownerId: 'u1', action: 'board.effect', context: { itemId: item.id } }).data
  const done = board.run('board.recordEffect', { itemId: item.id, revision: 1, ref: 'sender:1', userId: 'u1', authorizationRef: grant.id }).data
  assert.equal(done.status, 'completed')

  // Y una concesión fuera de contexto no sirve para otro elemento.
  const item2 = board.run('board.submit', { ownerId: 'u1', title: 'Otro', kind: 'proforma', evidence: { ref: 'e2' } }).data
  board.run('board.review', { itemId: item2.id, revision: 1, decision: 'approve', userId: 'u1' })
  const denied2 = board.run('board.recordEffect', { itemId: item2.id, revision: 1, ref: 'sender:2', userId: 'u1', authorizationRef: grant.id })
  assert.equal(denied2.ok, false)
  assert.equal(denied2.error.code, 'NO_AUTHORIZATION')
})
