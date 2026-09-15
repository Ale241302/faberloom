import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SpacesService } from '../src/spaces/index.js'
import { MemoryRepository } from '../src/store/repository.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
const fixedNow = () => '2026-09-15T00:00:00.000Z'
const svc = (repository) => new SpacesService({ repository, idGen: seq('id'), now: fixedNow })

test('vínculos: conversación y archivo, listar y quitar', () => {
  const s = svc()
  const sp = s.run('spaces.create', { name: 'Marluvas', ownerId: 'alice', members: [{ userId: 'bob', role: 'editor' }] }).data

  const conv = s.run('spaces.linkConversation', { spaceId: sp.id, userId: 'alice', conversationId: 'conv-1', title: 'Pedido Eguisa' }).data
  const file = s.run('spaces.linkFile', { spaceId: sp.id, userId: 'alice', fileRef: 'minio://oc.pdf', title: 'OC', sensitive: true }).data
  assert.equal(conv.kind, 'conversation')
  assert.equal(file.kind, 'file')
  assert.deepEqual(file.sharedWith, ['bob'])

  const links = s.run('spaces.listLinks', { spaceId: sp.id, userId: 'bob' }).data
  assert.equal(links.length, 2)

  const removed = s.run('spaces.unlink', { spaceId: sp.id, userId: 'alice', linkId: conv.id }).data
  assert.equal(removed.id, conv.id)
  assert.equal(s.run('spaces.listLinks', { spaceId: sp.id, userId: 'alice' }).data.length, 1)
})

test('vínculos: un viewer no puede vincular', () => {
  const s = svc()
  const sp = s.run('spaces.create', { name: 'X', ownerId: 'alice', members: [{ userId: 'bob', role: 'viewer' }] }).data
  assert.equal(s.run('spaces.linkFile', { spaceId: sp.id, userId: 'bob', fileRef: 'f' }).error.code, 'FORBIDDEN')
})

test('vínculos: se conservan en el repositorio (memoria y SQLite)', () => {
  const mem = new MemoryRepository()
  const m1 = svc(mem)
  const spm = m1.run('spaces.create', { name: 'M', ownerId: 'alice' }).data
  m1.run('spaces.linkFile', { spaceId: spm.id, userId: 'alice', fileRef: 'f1' })
  const m2 = svc(mem)
  assert.equal(m2.run('spaces.listLinks', { spaceId: spm.id, userId: 'alice' }).data.length, 1)

  const sql = new SqliteRepository(':memory:')
  const q1 = svc(sql)
  const spq = q1.run('spaces.create', { name: 'S', ownerId: 'alice' }).data
  q1.run('spaces.linkConversation', { spaceId: spq.id, userId: 'alice', conversationId: 'c1' })
  const q2 = svc(sql)
  assert.equal(q2.run('spaces.listLinks', { spaceId: spq.id, userId: 'alice' }).data.length, 1)
})
