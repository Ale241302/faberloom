import { test } from 'node:test'
import assert from 'node:assert/strict'

import { RoutinesService } from '../src/routines/index.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
const svc = () => new RoutinesService({ idGen: seq('id'), now: fixedNow })

// Disparador de correo: coincide, deduplica y no dispara si no cumple
test('trigger de correo: coincide, deduplica por mensaje y descarta no coincidentes', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  const r = s.run('routines.create', {
    name: 'OC',
    ownerId: 'u1',
    triggers: [{ type: 'email', match: { subject: { regex: 'orden de compra' } } }],
    steps: [{ id: 'a', type: 'noop' }],
  }).data
  s.run('routines.activate', { routineId: r.id })

  const out = s.run('events.ingest', { event: { type: 'event', source: 'email', id: 'msg-1', from: 'cliente@x.com', subject: 'Orden de Compra 123' } }).data
  assert.equal(out.started.length, 1)

  const again = s.run('events.ingest', { event: { type: 'event', source: 'email', id: 'msg-1', subject: 'Orden de Compra 123' } }).data
  assert.equal(again.started[0].deduped, true)

  const noMatch = s.run('events.ingest', { event: { type: 'event', source: 'email', id: 'msg-2', subject: 'spam' } }).data
  assert.equal(noMatch.started.length, 0)
})

// Un evento reanuda una espera
test('un evento real reanuda la espera de una ejecución', () => {
  const s = svc()
  s.registerStepHandler('start', () => ({ output: 'abierto' }))
  s.registerStepHandler('wait', (ctx) => (ctx.event ? { output: 'respondido' } : { waitFor: { type: 'event', key: 'reply' } }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'start' }, { id: 'b', type: 'wait' }] }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.start', { routineId: r.id }).data.execution
  assert.equal(s.run('executions.advance', { executionId: ex.id }).data.status, 'waiting')

  const out = s.run('events.ingest', { event: { type: 'event', key: 'reply', id: 'r1' } }).data
  assert.equal(out.resumed.length, 1)
  assert.equal(s.run('executions.get', { executionId: ex.id }).data.status, 'completed')
})

// Disparadores por fecha y recurrencia vía tick
test('disparadores programados: fecha (una vez) y recurrencia', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  const date = s.run('routines.create', { name: 'D', ownerId: 'u1', triggers: [{ type: 'date', at: '2026-09-15T00:00:00.000Z' }], steps: [{ id: 'a', type: 'noop' }] }).data
  const rec = s.run('routines.create', { name: 'R', ownerId: 'u1', triggers: [{ type: 'recurrence', intervalMinutes: 60 }], steps: [{ id: 'a', type: 'noop' }] }).data
  s.run('routines.activate', { routineId: date.id })
  s.run('routines.activate', { routineId: rec.id })

  const t1 = s.run('executions.tick', { now: '2026-09-15T00:00:00.000Z' }).data
  assert.equal(t1.started.length, 2) // fecha + primera recurrencia

  const t2 = s.run('executions.tick', { now: '2026-09-15T00:30:00.000Z' }).data
  assert.equal(t2.started.length, 0)

  const t3 = s.run('executions.tick', { now: '2026-09-15T01:00:01.000Z' }).data
  assert.equal(t3.started.length, 1) // solo la recurrencia vuelve a disparar
})

// Migración compatible: conserva lo hecho y añade pasos nuevos
test('migración: conserva pasos hechos y añade los nuevos', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  s.registerStepHandler('wait', (ctx) => (ctx.event ? { output: 'ok' } : { waitFor: { type: 'event', key: 'go' } }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'noop' }, { id: 'b', type: 'wait' }] }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.start', { routineId: r.id }).data.execution
  assert.equal(s.run('executions.advance', { executionId: ex.id }).data.status, 'waiting')

  s.run('routines.update', { routineId: r.id, patch: { steps: [{ id: 'a', type: 'noop' }, { id: 'b', type: 'wait' }, { id: 'c', type: 'noop' }] } })

  const preview = s.run('executions.previewMigration', { executionId: ex.id }).data
  assert.equal(preview.ok, true)
  assert.equal(preview.fromVersion, 1)
  assert.equal(preview.toVersion, 2)

  const dry = s.run('executions.migrate', { executionId: ex.id, confirm: false }).data
  assert.equal(dry.migrated, false)

  const applied = s.run('executions.migrate', { executionId: ex.id, confirm: true }).data
  assert.equal(applied.migrated, true)
  assert.equal(applied.execution.routineVersion, 2)
  assert.ok(applied.execution.steps.some((st) => st.stepId === 'c' && st.status === 'pending'))

  s.run('executions.resume', { executionId: ex.id, event: { type: 'event', key: 'go' } })
  assert.equal(s.run('executions.get', { executionId: ex.id }).data.status, 'completed')
})

// Migración incompatible: el paso pendiente ya no existe
test('migración incompatible se rechaza', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  s.registerStepHandler('wait', () => ({ waitFor: { type: 'event', key: 'go' } }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'noop' }, { id: 'b', type: 'wait' }] }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.start', { routineId: r.id }).data.execution
  s.run('executions.advance', { executionId: ex.id })

  s.run('routines.update', { routineId: r.id, patch: { steps: [{ id: 'a', type: 'noop' }, { id: 'c', type: 'noop' }] } })
  const preview = s.run('executions.previewMigration', { executionId: ex.id }).data
  assert.equal(preview.ok, false)
  assert.deepEqual(preview.unmappedSteps, ['b'])

  const res = s.run('executions.migrate', { executionId: ex.id })
  assert.equal(res.ok, false)
  assert.equal(res.error.code, 'MIGRATION_INCOMPATIBLE')
})

// Migración con renombrado de paso
test('migración con mapa de renombrado', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  s.registerStepHandler('wait', () => ({ waitFor: { type: 'event', key: 'go' } }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'noop' }, { id: 'b', type: 'wait' }] }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.start', { routineId: r.id }).data.execution
  s.run('executions.advance', { executionId: ex.id })

  s.run('routines.update', { routineId: r.id, patch: { steps: [{ id: 'a', type: 'noop' }, { id: 'b2', type: 'wait' }] } })
  const preview = s.run('executions.previewMigration', { executionId: ex.id, rename: { b: 'b2' } }).data
  assert.equal(preview.ok, true)

  const applied = s.run('executions.migrate', { executionId: ex.id, rename: { b: 'b2' } }).data
  assert.equal(applied.migrated, true)
  assert.ok(applied.execution.steps.some((st) => st.stepId === 'b2'))
})
