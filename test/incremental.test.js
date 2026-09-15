import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SpacesService } from '../src/spaces/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}

test('incremental: saveSpace actualiza un espacio sin tocar los demás', () => {
  const repo = new SqliteRepository(':memory:')
  const s1 = new SpacesService({ repository: repo, idGen: seq('a'), now: fixedNow })
  const a = s1.run('spaces.create', { name: 'A', ownerId: 'u1' }).data
  const b = s1.run('spaces.create', { name: 'B', ownerId: 'u1' }).data

  const changed = repo.saveSpace({ ...a, name: 'A2', version: a.version + 1 })
  assert.deepEqual(changed, { row: true, members: false, context: false, excluded: false })

  const noop = repo.saveSpace({ ...a, name: 'A2', version: a.version + 1 })
  assert.deepEqual(noop, { row: false, members: false, context: false, excluded: false })

  const membersChanged = repo.saveSpace({
    ...a,
    name: 'A2',
    version: a.version + 1,
    members: [
      { userId: 'u1', role: 'owner' },
      { userId: 'bob', role: 'viewer' },
    ],
  })
  assert.equal(membersChanged.members, true)
  assert.equal(membersChanged.row, false)

  const s2 = new SpacesService({ repository: repo, idGen: seq('b'), now: fixedNow })
  assert.equal(s2.run('spaces.get', { spaceId: a.id, userId: 'u1' }).data.name, 'A2')
  assert.equal(s2.run('spaces.get', { spaceId: b.id, userId: 'u1' }).data.name, 'B')
})

test('incremental: el servicio usa saveSpace cuando el repositorio lo ofrece', () => {
  const calls = []
  const spy = {
    read() {
      return null
    },
    saveSpace(space) {
      calls.push(space.id)
    },
    write() {
      throw new Error('no debería usar el snapshot completo')
    },
  }
  const s = new SpacesService({ repository: spy, idGen: seq('id'), now: fixedNow })
  const sp = s.run('spaces.create', { name: 'X', ownerId: 'u1' }).data
  assert.deepEqual(calls, [sp.id])
})
