import { test } from 'node:test'
import assert from 'node:assert/strict'

import { RoutinesService } from '../src/routines/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
const svc = (repo) => new RoutinesService({ repository: repo, idGen: seq('id'), now: fixedNow })

test('fuentes: el token resuelve al usuario y no se reexpone', () => {
  const s = svc()
  const a = s.run('sources.register', { userId: 'u1', type: 'email', config: { host: 'imap.x', user: 'u1@x' } }).data
  assert.match(a.token, /^fb_/)
  const list = s.run('sources.list', { userId: 'u1' }).data
  assert.equal(list.length, 1)
  assert.equal(list[0].token, undefined)
  assert.equal(s.resolveSourceByToken(a.token).userId, 'u1')
  assert.equal(s.resolveSourceByToken('no-existe'), null)
  assert.equal(s.run('sources.list', { userId: 'u2' }).data.length, 0)
})

test('fuentes: la ingesta por usuario solo dispara sus rutinas', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  const r1 = s.run('routines.create', { name: 'U1', ownerId: 'u1', triggers: [{ type: 'email' }], steps: [{ id: 'a', type: 'noop' }] }).data
  const r2 = s.run('routines.create', { name: 'U2', ownerId: 'u2', triggers: [{ type: 'email' }], steps: [{ id: 'a', type: 'noop' }] }).data
  s.run('routines.activate', { routineId: r1.id })
  s.run('routines.activate', { routineId: r2.id })

  const out = s.run('events.ingest', { event: { type: 'event', source: 'email', id: 'm1', subject: 'x' }, userId: 'u1' }).data
  assert.equal(out.started.length, 1)
  assert.equal(out.started[0].execution.routineId, r1.id)
})

test('bloqueo de despachador: solo el titular (persistente entre instancias)', () => {
  const repo = new SqliteRepository(':memory:')
  const a = svc(repo)
  const b = svc(repo)

  assert.equal(a.acquireLock({ name: 'dispatcher', owner: 'A', ttlMs: 60000 }).acquired, true)
  const blocked = b.acquireLock({ name: 'dispatcher', owner: 'B', ttlMs: 60000 })
  assert.equal(blocked.acquired, false)
  assert.equal(blocked.owner, 'A')

  a.releaseLock({ name: 'dispatcher', owner: 'A' })
  assert.equal(b.acquireLock({ name: 'dispatcher', owner: 'B', ttlMs: 60000 }).acquired, true)
})

test('dispatchOnce: el segundo no despacha mientras el bloqueo está tomado', () => {
  const repo = new SqliteRepository(':memory:')
  const a = svc(repo)
  const b = svc(repo)

  a.acquireLock({ name: 'dispatcher', owner: 'A', ttlMs: 60000 })
  const rb = b.dispatchOnce({ owner: 'B' })
  assert.equal(rb.acquired, false)
  assert.equal(rb.dispatched, false)

  a.releaseLock({ name: 'dispatcher', owner: 'A' })
  const ra = a.dispatchOnce({ owner: 'A' })
  assert.equal(ra.acquired, true)
  assert.equal(ra.dispatched, true)
})

test('bloqueo atómico en SQLite (una sentencia)', () => {
  const repo = new SqliteRepository(':memory:')
  const nowIso = new Date().toISOString()
  const future = new Date(Date.now() + 60000).toISOString()
  const past = new Date(Date.now() - 60000).toISOString()

  assert.equal(repo.tryAcquireLock('dispatcher', 'A', nowIso, future), true)
  assert.equal(repo.tryAcquireLock('dispatcher', 'B', nowIso, future), false)
  assert.equal(repo.releaseLock('dispatcher', 'B'), false)
  assert.equal(repo.releaseLock('dispatcher', 'A'), true)
  assert.equal(repo.tryAcquireLock('dispatcher', 'B', nowIso, future), true)

  // Un lease vencido lo puede tomar otro titular.
  repo.saveLock({ name: 'dispatcher', owner: 'X', expiresAt: past })
  assert.equal(repo.tryAcquireLock('dispatcher', 'Y', nowIso, future), true)
})
