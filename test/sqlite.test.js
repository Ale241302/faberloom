import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { SpacesService } from '../src/spaces/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}

test('sqlite: round-trip de espacios, miembros, contexto, herencia y empresa', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'faberloom-sqlite-'))
  const file = path.join(dir, 'spaces.sqlite')
  let repo1
  let repo2
  try {
    repo1 = new SqliteRepository(file)
    const s1 = new SpacesService({ repository: repo1, idGen: seq('a'), now: fixedNow })
    const parent = s1.run('spaces.create', {
      name: 'Marluvas',
      ownerId: 'alice',
      companyId: 'co1',
      context: [{ key: 'moneda', value: 'USD' }],
      members: [{ userId: 'bob', role: 'admin' }],
    }).data
    const child = s1.run('spaces.create', {
      name: 'Eguisa',
      ownerId: 'alice',
      parentId: parent.id,
      inheritContext: false,
      inheritMembers: false,
      excluded: ['politica'],
    }).data
    s1.run('spaces.personal', { userId: 'alice' })

    const s2 = new SpacesService({ repository: (repo2 = new SqliteRepository(file)), idGen: seq('b'), now: fixedNow })
    const got = s2.run('spaces.get', { spaceId: parent.id, userId: 'alice' }).data
    assert.equal(got.name, 'Marluvas')
    assert.equal(got.companyId, 'co1')
    assert.deepEqual(got.members, [
      { userId: 'alice', role: 'owner' },
      { userId: 'bob', role: 'admin' },
    ])
    assert.equal(s2.run('spaces.effectiveContext', { spaceId: parent.id, userId: 'alice' }).data.resolved.moneda, 'USD')

    const childGot = s2.run('spaces.get', { spaceId: child.id, userId: 'alice' }).data
    assert.equal(childGot.inheritContext, false)
    assert.equal(childGot.inheritMembers, false)
    assert.deepEqual(childGot.excluded, ['politica'])
    assert.equal(s2.run('spaces.personal', { userId: 'alice' }).ok, true)
  } finally {
    try { repo1?.close() } catch { /* noop */ }
    try { repo2?.close() } catch { /* noop */ }
    rmSync(dir, { recursive: true, force: true })
  }
})

test('sqlite: los valores de contexto con objeto se conservan', () => {
  const repo = new SqliteRepository(':memory:')
  const s1 = new SpacesService({ repository: repo, idGen: seq('a'), now: fixedNow })
  const sp = s1.run('spaces.create', { name: 'X', ownerId: 'alice', context: [{ key: 'cfg', value: { a: 1, b: ['x'] } }] }).data
  const s2 = new SpacesService({ repository: repo, idGen: seq('b'), now: fixedNow })
  assert.deepEqual(s2.run('spaces.effectiveContext', { spaceId: sp.id, userId: 'alice' }).data.resolved.cfg, { a: 1, b: ['x'] })
})
