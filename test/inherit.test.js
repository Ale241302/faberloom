import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SpacesService } from '../src/spaces/index.js'

const svc = () => {
  let n = 0
  return new SpacesService({ idGen: () => `id${++n}`, now: () => '2026-09-15T00:00:00.000Z' })
}

test('herencia de miembros: el padre concede acceso al subespacio', () => {
  const s = svc()
  const parent = s.run('spaces.create', {
    name: 'Marluvas',
    ownerId: 'alice',
    members: [
      { userId: 'bob', role: 'admin' },
      { userId: 'carol', role: 'viewer' },
    ],
  }).data
  const child = s.run('spaces.create', { name: 'Eguisa', ownerId: 'alice', parentId: parent.id }).data

  // bob (admin del padre) gestiona el hijo por herencia
  assert.equal(s.run('spaces.addMember', { spaceId: child.id, userId: 'bob', memberId: 'dave', role: 'viewer' }).ok, true)
  // carol (viewer del padre) ve el hijo pero no edita
  assert.equal(s.run('spaces.get', { spaceId: child.id, userId: 'carol' }).ok, true)
  assert.equal(s.run('spaces.update', { spaceId: child.id, userId: 'carol', patch: { name: 'Z' } }).error.code, 'FORBIDDEN')
})

test('herencia de miembros desactivada corta el acceso heredado', () => {
  const s = svc()
  const parent = s.run('spaces.create', { name: 'M', ownerId: 'alice', members: [{ userId: 'bob', role: 'admin' }] }).data
  const child = s.run('spaces.create', { name: 'E', ownerId: 'alice', parentId: parent.id, inheritMembers: false }).data
  assert.equal(s.run('spaces.get', { spaceId: child.id, userId: 'bob' }).error.code, 'ACCESS_DENIED')
})

test('rol local y heredado se combinan por el mayor privilegio', () => {
  const s = svc()
  const parent = s.run('spaces.create', { name: 'M', ownerId: 'alice', members: [{ userId: 'bob', role: 'admin' }] }).data
  const child = s.run('spaces.create', {
    name: 'E',
    ownerId: 'alice',
    parentId: parent.id,
    members: [{ userId: 'bob', role: 'viewer' }],
  }).data
  // bob es viewer local + admin heredado -> admin (puede gestionar)
  assert.equal(s.run('spaces.addMember', { spaceId: child.id, userId: 'bob', memberId: 'dave' }).ok, true)
})

test('listado: incluye subespacios accesibles solo por herencia', () => {
  const s = svc()
  const parent = s.run('spaces.create', { name: 'M', ownerId: 'alice', members: [{ userId: 'bob', role: 'editor' }] }).data
  const child = s.run('spaces.create', { name: 'E', ownerId: 'alice', parentId: parent.id }).data
  const ids = s.run('spaces.list', { userId: 'bob' }).data.map((x) => x.id)
  assert.ok(ids.includes(parent.id))
  assert.ok(ids.includes(child.id))
})
