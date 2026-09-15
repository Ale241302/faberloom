import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SpacesService } from '../src/spaces/index.js'

const svc = () => {
  let n = 0
  return new SpacesService({ idGen: () => `id${++n}`, now: () => '2026-09-15T00:00:00.000Z' })
}

test('ACL: owner edita y gestiona; editor edita; viewer solo ve', () => {
  const s = svc()
  const sp = s.run('spaces.create', {
    name: 'Marluvas',
    ownerId: 'alice',
    members: [
      { userId: 'bob', role: 'editor' },
      { userId: 'carol', role: 'viewer' },
    ],
  }).data
  const roles = Object.fromEntries(sp.members.map((m) => [m.userId, m.role]))
  assert.deepEqual(roles, { alice: 'owner', bob: 'editor', carol: 'viewer' })

  // viewer ve, no edita
  assert.equal(s.run('spaces.get', { spaceId: sp.id, userId: 'carol' }).ok, true)
  assert.equal(s.run('spaces.update', { spaceId: sp.id, userId: 'carol', patch: { name: 'X' } }).error.code, 'FORBIDDEN')

  // editor edita, no gestiona miembros
  assert.equal(s.run('spaces.update', { spaceId: sp.id, userId: 'bob', patch: { name: 'Marluvas 2' } }).ok, true)
  assert.equal(s.run('spaces.addMember', { spaceId: sp.id, userId: 'bob', memberId: 'dave', role: 'viewer' }).error.code, 'FORBIDDEN')

  // owner gestiona
  assert.equal(s.run('spaces.addMember', { spaceId: sp.id, userId: 'alice', memberId: 'dave', role: 'admin' }).ok, true)

  // no-miembro no ve
  assert.equal(s.run('spaces.get', { spaceId: sp.id, userId: 'mallory' }).error.code, 'ACCESS_DENIED')

  // el personal sigue aislado
  const per = s.run('spaces.personal', { userId: 'alice' }).data
  assert.equal(s.run('spaces.get', { spaceId: per.id, userId: 'bob' }).error.code, 'ACCESS_DENIED')
})

test('ACL: no se puede quitar ni degradar al propietario', () => {
  const s = svc()
  const sp = s.run('spaces.create', { name: 'X', ownerId: 'alice', members: ['bob'] }).data
  assert.equal(s.run('spaces.removeMember', { spaceId: sp.id, userId: 'alice', memberId: 'alice' }).error.code, 'INVALID_MEMBER')
  assert.equal(s.run('spaces.setMemberRole', { spaceId: sp.id, userId: 'alice', memberId: 'alice', role: 'viewer' }).error.code, 'INVALID_MEMBER')
})

test('ACL: roles inválidos y miembro inexistente', () => {
  const s = svc()
  const sp = s.run('spaces.create', { name: 'X', ownerId: 'alice' }).data
  assert.equal(s.run('spaces.addMember', { spaceId: sp.id, userId: 'alice', memberId: 'bob', role: 'owner' }).error.code, 'INVALID_ROLE')
  assert.equal(s.run('spaces.setMemberRole', { spaceId: sp.id, userId: 'alice', memberId: 'ghost', role: 'viewer' }).error.code, 'MEMBER_NOT_FOUND')
})

test('ACL: subir rol de viewer a editor habilita la edición', () => {
  const s = svc()
  const sp = s.run('spaces.create', { name: 'X', ownerId: 'alice', members: [{ userId: 'bob', role: 'viewer' }] }).data
  assert.equal(s.run('spaces.update', { spaceId: sp.id, userId: 'bob', patch: { name: 'Y' } }).error.code, 'FORBIDDEN')
  s.run('spaces.setMemberRole', { spaceId: sp.id, userId: 'alice', memberId: 'bob', role: 'editor' })
  assert.equal(s.run('spaces.update', { spaceId: sp.id, userId: 'bob', patch: { name: 'Y' } }).ok, true)
})
