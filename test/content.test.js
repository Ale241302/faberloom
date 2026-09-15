import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { SpacesService } from '../src/spaces/index.js'
import { FsBlobStore, MemoryBlobStore } from '../src/store/blob.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
const fixedNow = () => '2026-09-15T00:00:00.000Z'

test('contenido: archivo guardado y leído (base64)', () => {
  const blob = new MemoryBlobStore()
  const s = new SpacesService({ blobStore: blob, idGen: seq('id'), now: fixedNow })
  const sp = s.run('spaces.create', { name: 'M', ownerId: 'alice' }).data
  const link = s.run('spaces.linkFile', {
    spaceId: sp.id,
    userId: 'alice',
    fileName: 'nota.txt',
    mediaType: 'text/plain',
    content: Buffer.from('hola mundo'),
  }).data
  assert.equal(link.stored, true)
  assert.equal(link.fileName, 'nota.txt')

  const read = s.run('spaces.readLinkContent', { spaceId: sp.id, linkId: link.id, userId: 'alice' }).data
  assert.equal(Buffer.from(read.base64, 'base64').toString('utf8'), 'hola mundo')
  assert.equal(read.size, 10)
})

test('contenido: conversación JSON round-trip', () => {
  const s = new SpacesService({ blobStore: new MemoryBlobStore(), idGen: seq('id'), now: fixedNow })
  const sp = s.run('spaces.create', { name: 'M', ownerId: 'alice' }).data
  const conv = { messages: [{ role: 'user', text: 'hola' }] }
  const link = s.run('spaces.linkConversation', { spaceId: sp.id, userId: 'alice', conversationId: 'c1', content: conv }).data
  const read = s.run('spaces.readLinkContent', { spaceId: sp.id, linkId: link.id, userId: 'alice' }).data
  assert.deepEqual(read.json, conv)
})

test('contenido: persiste (FsBlobStore + SQLite) entre servicios', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'faberloom-blob-'))
  const dbFile = path.join(dir, 'spaces.sqlite')
  let repo
  try {
    repo = new SqliteRepository(dbFile)
    const s1 = new SpacesService({ repository: repo, blobStore: new FsBlobStore(path.join(dir, 'blobs')), idGen: seq('a'), now: fixedNow })
    const sp = s1.run('spaces.create', { name: 'M', ownerId: 'alice' }).data
    const link = s1.run('spaces.linkConversation', { spaceId: sp.id, userId: 'alice', conversationId: 'c1', content: { m: 1 } }).data

    const s2 = new SpacesService({ repository: repo, blobStore: new FsBlobStore(path.join(dir, 'blobs')), idGen: seq('b'), now: fixedNow })
    assert.equal(s2.run('spaces.listLinks', { spaceId: sp.id, userId: 'alice' }).data.length, 1)
    const read = s2.run('spaces.readLinkContent', { spaceId: sp.id, linkId: link.id, userId: 'alice' }).data
    assert.deepEqual(read.json, { m: 1 })
  } finally {
    try {
      repo?.close()
    } catch {
      /* noop */
    }
    rmSync(dir, { recursive: true, force: true })
  }
})

test('contenido: unlink borra el blob', () => {
  const blob = new MemoryBlobStore()
  const s = new SpacesService({ blobStore: blob, idGen: seq('id'), now: fixedNow })
  const sp = s.run('spaces.create', { name: 'M', ownerId: 'alice' }).data
  const link = s.run('spaces.linkFile', { spaceId: sp.id, userId: 'alice', content: 'abc' }).data
  assert.ok(blob.get(link.ref))
  s.run('spaces.unlink', { spaceId: sp.id, linkId: link.id, userId: 'alice' })
  assert.equal(blob.get(link.ref), null)
})
