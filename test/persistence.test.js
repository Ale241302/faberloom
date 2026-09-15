import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { SpacesService } from '../src/spaces/index.js'
import { JsonFileRepository, MemoryRepository } from '../src/store/repository.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}

test('persistencia: los espacios sobreviven a un reinicio', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'faberloom-'))
  const file = path.join(dir, 'spaces.json')
  try {
    const s1 = new SpacesService({ repository: new JsonFileRepository(file), idGen: seq('a'), now: fixedNow })
    const marluvas = s1.run('spaces.create', { name: 'Marluvas', ownerId: 'u1', context: [{ key: 'moneda', value: 'USD' }] }).data
    const personal = s1.run('spaces.personal', { userId: 'u1' }).data

    const s2 = new SpacesService({ repository: new JsonFileRepository(file), idGen: seq('b'), now: fixedNow })
    const got = s2.run('spaces.get', { spaceId: marluvas.id, userId: 'u1' })
    assert.equal(got.ok, true)
    assert.equal(got.data.name, 'Marluvas')
    assert.equal(s2.run('spaces.effectiveContext', { spaceId: marluvas.id, userId: 'u1' }).data.resolved.moneda, 'USD')
    assert.equal(s2.run('spaces.personal', { userId: 'u1' }).data.id, personal.id)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('persistencia: el repositorio en memoria conserva dentro del mismo proceso', () => {
  const repo = new MemoryRepository()
  const s1 = new SpacesService({ repository: repo, idGen: seq('a'), now: fixedNow })
  s1.run('spaces.create', { name: 'X', ownerId: 'u1' })
  const s2 = new SpacesService({ repository: repo, idGen: seq('b'), now: fixedNow })
  assert.equal(s2.run('spaces.list', { userId: 'u1' }).data.length, 1)
})

test('persistencia: archivo inexistente no revienta (arranque limpio)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'faberloom-'))
  try {
    const s = new SpacesService({ repository: new JsonFileRepository(path.join(dir, 'nuevo.json')), idGen: seq('a'), now: fixedNow })
    assert.equal(s.run('spaces.list', { userId: 'u1' }).data.length, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
