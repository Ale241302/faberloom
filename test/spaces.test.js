import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SpacesService } from '../src/spaces/index.js'

function svc() {
  let n = 0
  return new SpacesService({ idGen: () => `id${++n}`, now: () => '2026-09-15T00:00:00.000Z' })
}

// F01 — espacio de estudios sin MWT
test('F01 · se crea un espacio de estudios sin conexión comercial', () => {
  const s = svc()
  const created = s.run('spaces.create', {
    name: 'Estudios',
    ownerId: 'u1',
    context: [{ key: 'materia', value: 'Cálculo' }],
  })
  assert.equal(created.ok, true)
  assert.equal(created.data.name, 'Estudios')
  assert.equal(created.data.version, 1)

  const eff = s.run('spaces.effectiveContext', { spaceId: created.data.id, userId: 'u1' })
  assert.equal(eff.ok, true)
  assert.equal(eff.data.resolved.materia, 'Cálculo')
})

// F02 — Marluvas → Eguisa con herencia y exclusiones
test('F02 · herencia desactivada no recupera contexto del padre', () => {
  const s = svc()
  const marluvas = s.run('spaces.create', {
    name: 'Marluvas',
    ownerId: 'u1',
    context: [
      { key: 'catalogo', value: 'Marluvas 2026' },
      { key: 'politica', value: 'base' },
    ],
  }).data
  const eguisa = s.run('spaces.create', {
    name: 'Eguisa',
    ownerId: 'u1',
    parentId: marluvas.id,
    inheritContext: false,
    context: [{ key: 'condiciones', value: 'Eguisa' }],
  }).data

  const off = s.run('spaces.effectiveContext', { spaceId: eguisa.id, userId: 'u1' }).data
  assert.equal(off.resolved.catalogo, undefined)
  assert.equal(off.resolved.condiciones, 'Eguisa')

  s.run('spaces.update', { spaceId: eguisa.id, userId: 'u1', patch: { inheritContext: true } })
  const on = s.run('spaces.effectiveContext', { spaceId: eguisa.id, userId: 'u1' }).data
  assert.equal(on.resolved.catalogo, 'Marluvas 2026')
  assert.equal(on.versions.length, 2) // Marluvas + Eguisa

  s.run('spaces.update', { spaceId: eguisa.id, userId: 'u1', patch: { excluded: ['politica'] } })
  const excluded = s.run('spaces.effectiveContext', { spaceId: eguisa.id, userId: 'u1' }).data
  assert.equal(excluded.resolved.politica, undefined)
  assert.equal(excluded.excluded.length, 1)
  assert.equal(excluded.excluded[0].key, 'politica')
})

test('contexto: conflicto entre reglas se expone, no se oculta', () => {
  const s = svc()
  const padre = s.run('spaces.create', {
    name: 'Marluvas',
    ownerId: 'u1',
    context: [{ key: 'moneda', value: 'USD', source: 'marluvas' }],
  }).data
  const hijo = s.run('spaces.create', {
    name: 'Eguisa',
    ownerId: 'u1',
    parentId: padre.id,
    context: [{ key: 'moneda', value: 'COP', source: 'eguisa' }],
  }).data
  const eff = s.run('spaces.effectiveContext', { spaceId: hijo.id, userId: 'u1' }).data
  assert.equal(eff.conflicts.length, 1)
  assert.equal(eff.conflicts[0].key, 'moneda')
  assert.equal(eff.conflicts[0].values.length, 2)
  assert.equal(eff.resolved.moneda, 'COP') // gana el más local, pero queda el conflicto
})

// F37 — iniciar sin espacio usa el ámbito personal aislado
test('F37 · sin espacio usa el ámbito personal, aislado por usuario', () => {
  const s = svc()
  const a = s.run('spaces.personal', { userId: 'u1' }).data
  const b = s.run('spaces.personal', { userId: 'u2' }).data
  assert.notEqual(a.id, b.id)
  assert.equal(a.personal, true)

  // el personal de otro usuario no es accesible
  const denied = s.run('spaces.get', { spaceId: a.id, userId: 'u2' })
  assert.equal(denied.ok, false)
  assert.equal(denied.error.code, 'ACCESS_DENIED')

  // no aparece en el listado de espacios del usuario
  assert.equal(s.run('spaces.list', { userId: 'u1' }).data.length, 0)
})

// F41 — vincular conversación personal a un espacio compartido
test('F41 · vista previa de audiencia al vincular a un espacio compartido', () => {
  const s = svc()
  const shared = s.run('spaces.create', { name: 'Marluvas', ownerId: 'u1', members: ['u2', 'u3'] }).data
  const preview = s.run('spaces.previewLink', {
    userId: 'u1',
    targetSpaceId: shared.id,
    material: [{ type: 'message' }, { type: 'attachment' }, { type: 'message', sensitive: true }],
  }).data

  assert.deepEqual(preview.audienceBefore, ['u1'])
  assert.deepEqual([...preview.newlyVisibleTo].sort(), ['u2', 'u3'])
  assert.equal(preview.material.messages, 2)
  assert.equal(preview.material.attachments, 1)
  assert.equal(preview.material.sensitive, 1)
  assert.match(preview.warning, /sensible/)
})

// Directorio de trabajo interno: referencia opaca, nunca un path
test('workdir del harness se expone solo como referencia opaca', () => {
  const s = svc()
  const sp = s.run('spaces.create', { name: 'Investigación', ownerId: 'u1' }).data
  const { ref } = s.run('spaces.resolveWorkdir', { spaceId: sp.id, userId: 'u1' }).data
  assert.match(ref, /^fw_[0-9a-f]{24}$/)
  assert.equal(ref.includes('/'), false)
  assert.equal(ref.includes('\\'), false)
})

// Contrato estable: operación desconocida y acceso denegado no lanzan
test('contrato run(): errores como {ok:false,error}', () => {
  const s = svc()
  assert.equal(s.run('spaces.nope', {}).error.code, 'UNKNOWN_OPERATION')
  const sp = s.run('spaces.create', { name: 'X', ownerId: 'u1' }).data
  const denied = s.run('spaces.get', { spaceId: sp.id, userId: 'intruso' })
  assert.equal(denied.error.code, 'ACCESS_DENIED')
})
