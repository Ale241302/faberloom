import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SpacesService } from '../src/spaces/index.js'

const svc = () => {
  let n = 0
  return new SpacesService({ idGen: () => `id${++n}`, now: () => '2026-09-15T00:00:00.000Z' })
}

test('empresa: acceso denegado si la empresa no coincide', () => {
  const s = svc()
  const sp = s.run('spaces.create', { name: 'Sondel', ownerId: 'alice', companyId: 'sondel', members: ['bob'] }).data

  assert.equal(s.run('spaces.get', { spaceId: sp.id, userId: 'bob', companyId: 'sondel' }).ok, true)
  const denied = s.run('spaces.get', { spaceId: sp.id, userId: 'bob', companyId: 'otra' })
  assert.equal(denied.ok, false)
  assert.match(denied.error.message, /COMPANY_MISMATCH/)

  // la lista filtra por empresa
  assert.equal(s.run('spaces.list', { userId: 'bob', companyId: 'otra' }).data.length, 0)
  assert.equal(s.run('spaces.list', { userId: 'bob', companyId: 'sondel' }).data.length, 1)
})

test('empresa: el subespacio hereda la empresa del padre', () => {
  const s = svc()
  const parent = s.run('spaces.create', { name: 'M', ownerId: 'alice', companyId: 'co1' }).data
  const child = s.run('spaces.create', { name: 'E', ownerId: 'alice', parentId: parent.id }).data
  assert.equal(child.companyId, 'co1')
})
