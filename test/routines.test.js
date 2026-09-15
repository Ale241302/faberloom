import { test } from 'node:test'
import assert from 'node:assert/strict'

import { RoutinesService } from '../src/routines/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
function svc(repo, opts = {}) {
  return new RoutinesService({ repository: repo, idGen: seq('id'), now: fixedNow, ...opts })
}

// F04 — crear y editar conserva identidad, versión e historial
test('F04 · editar rutina crea versión y conserva identidad', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  const r = s.run('routines.create', { name: 'Pedido→proforma', ownerId: 'u1', steps: [{ id: 'a', type: 'noop' }] }).data
  const up = s.run('routines.update', { routineId: r.id, patch: { name: 'Pedido→proforma v2', steps: [{ id: 'a', type: 'noop' }, { id: 'b', type: 'noop', dependsOn: ['a'] }] } }).data
  assert.equal(up.id, r.id)
  assert.equal(up.version, 2)
  assert.equal(up.history.length, 2)
})

// F05 — editar con ejecución activa no cambia el recorrido iniciado
test('F05 · una ejecución activa conserva su versión de rutina', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'noop' }] }).data
  s.run('routines.activate', { routineId: r.id })
  const started = s.run('executions.start', { routineId: r.id }).data.execution
  assert.equal(started.routineVersion, 1)

  s.run('routines.update', { routineId: r.id, patch: { steps: [{ id: 'a', type: 'noop' }, { id: 'b', type: 'noop' }] } })
  const ex = s.run('executions.get', { executionId: started.id }).data
  assert.equal(ex.routineVersion, 1)
})

// F06 — falta una herramienta: no ejecutable
test('F06 · falta de capacidad declara faltantes y no activa', () => {
  const s = svc()
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'missing', toolId: 'mcp_x' }] }).data
  const v = s.run('routines.validate', { routineId: r.id }).data
  assert.equal(v.ok, false)
  assert.ok(v.missing.includes('handler:missing'))
  assert.ok(v.missing.includes('tool:mcp_x'))
  const act = s.run('routines.activate', { routineId: r.id })
  assert.equal(act.ok, false)
  assert.equal(act.error.code, 'ROUTINE_NOT_EXECUTABLE')
})

// F07 — misma OC por dos canales → un caso con ambas evidencias
test('F07 · idempotencia: dos canales, un caso, dos evidencias', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'noop' }] }).data
  s.run('routines.activate', { routineId: r.id })

  const a = s.run('executions.start', { routineId: r.id, idempotencyKey: 'OC-123', sources: [{ channel: 'email', ref: 'm1' }] }).data
  const b = s.run('executions.start', { routineId: r.id, idempotencyKey: 'OC-123', sources: [{ channel: 'portal', ref: 'p1' }] }).data
  assert.equal(a.deduped, false)
  assert.equal(b.deduped, true)
  assert.equal(a.execution.id, b.execution.id)
  assert.equal(s.run('executions.list', {}).data.length, 1)
  assert.equal(s.run('executions.get', { executionId: a.execution.id }).data.sources.length, 2)
})

// F08 — recorrido completo
test('F08 · una rutina simple completa su ejecución', () => {
  const s = svc()
  const calls = []
  s.registerStepHandler('step1', () => {
    calls.push('step1')
    return { output: 1 }
  })
  s.registerStepHandler('step2', () => {
    calls.push('step2')
    return { output: 2 }
  })
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'step1' }, { id: 'b', type: 'step2', dependsOn: ['a'] }] }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.advance', { executionId: s.run('executions.start', { routineId: r.id }).data.execution.id }).data
  assert.equal(ex.status, 'completed')
  assert.deepEqual(calls, ['step1', 'step2'])
})

// F09 — el precio cambió durante la espera → revalidar antes del efecto
test('F09 · revalidación al reanudar evita aplicar datos viejos', () => {
  const s = svc()
  const price = { value: 100 }
  s.registerStepHandler('quote', () => ({ output: 'cotizado' }))
  s.registerStepHandler('check_price', () => price.value)
  s.registerStepHandler('wait', () => ({ waitFor: { type: 'time', key: 'recheck' } }))
  const r = s.run('routines.create', {
    name: 'R',
    ownerId: 'u1',
    steps: [
      { id: 'a', type: 'quote' },
      { id: 'b', type: 'wait', revalidateType: 'check_price' },
    ],
  }).data
  s.run('routines.activate', { routineId: r.id })
  const started = s.run('executions.start', { routineId: r.id }).data.execution
  const waiting = s.run('executions.advance', { executionId: started.id }).data
  assert.equal(waiting.status, 'waiting')

  price.value = 120 // cambió durante la espera
  const resumed = s.run('executions.resume', { executionId: started.id }).data
  assert.equal(resumed.status, 'failed')
  assert.equal(resumed.steps.find((x) => x.stepId === 'b').error, 'REVALIDATION_CHANGED')
})

// F10 — reinicio: se reanuda el estado persistente sin repetir efectos
test('F10 · reinicio reanuda la espera sin repetir efectos', () => {
  const repo = new SqliteRepository(':memory:')
  const s1 = svc(repo)
  const effectsApplied = []
  s1.registerStepHandler('open', () => {
    effectsApplied.push('open')
    return { output: 'abierto', effect: { ref: 'case-1' } }
  })
  s1.registerStepHandler('ask', (ctx) => (ctx.event ? { output: 'respondido' } : { waitFor: { type: 'event', key: 'production' } }))
  s1.registerStepHandler('close', () => ({ output: 'cerrado' }))
  const r = s1.run('routines.create', { name: 'Seguimiento', ownerId: 'u1', steps: [{ id: 'a', type: 'open', isEffect: true }, { id: 'b', type: 'ask' }, { id: 'c', type: 'close' }] }).data
  s1.run('routines.activate', { routineId: r.id })
  const ex = s1.run('executions.start', { routineId: r.id }).data.execution
  const waiting = s1.run('executions.advance', { executionId: ex.id }).data
  assert.equal(waiting.status, 'waiting')

  // "reinicio": nueva instancia sobre el mismo repositorio
  const s2 = svc(repo)
  s2.registerStepHandler('open', () => {
    effectsApplied.push('open')
    return { output: 'abierto', effect: { ref: 'case-1' } }
  })
  s2.registerStepHandler('ask', (ctx) => (ctx.event ? { output: 'respondido' } : { waitFor: { type: 'event', key: 'production' } }))
  s2.registerStepHandler('close', () => ({ output: 'cerrado' }))

  s2.run('executions.tick', { events: [{ type: 'event', key: 'production' }] })
  const done = s2.run('executions.get', { executionId: ex.id }).data
  assert.equal(done.status, 'completed')
  assert.equal(effectsApplied.filter((x) => x === 'open').length, 1) // no se repitió el efecto
  assert.equal(s2.run('executions.effects', { executionId: ex.id }).data[0].ref, 'case-1')
})

// F11 — timeout después de escribir: reconciliar antes de reintentar
test('F11 · timeout tras escritura se reconcilia sin duplicar', () => {
  const s = svc()
  const store = new Map()
  s.registerStepHandler('write', () => {
    store.set('proforma', 'PF-1')
    const e = new Error('timeout')
    e.timeoutAfterWrite = true
    throw e
  })
  s.registerStepHandler('reconcile', () => ({ found: store.has('proforma'), ref: store.get('proforma') }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'write', isEffect: true, reconcileType: 'reconcile' }] }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.advance', { executionId: s.run('executions.start', { routineId: r.id }).data.execution.id }).data
  assert.equal(ex.status, 'completed')
  assert.equal(store.size, 1) // una sola escritura
  assert.equal(s.run('executions.effects', { executionId: ex.id }).data[0].ref, 'PF-1')
})

// F12 — respuesta antes del seguimiento: cancelar el borrador obsoleto
test('F12 · la respuesta recibida cancela el seguimiento obsoleto', () => {
  const s = svc()
  const reply = { received: false }
  s.registerStepHandler('draft', () => ({ output: 'borrador', effect: { ref: 'draft-1' } }))
  s.registerStepHandler('wait', () => (reply.received ? { output: 'respondido' } : { waitFor: { type: 'event', key: 'reply' } }))
  s.registerStepHandler('cancel', () => ({ output: 'cancelado', effect: { cancelledRef: 'draft-1' } }))
  const r = s.run('routines.create', {
    name: 'R',
    ownerId: 'u1',
    steps: [
      { id: 'a', type: 'draft', isEffect: true },
      { id: 'b', type: 'wait' },
      { id: 'c', type: 'cancel', isEffect: true },
    ],
  }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.start', { routineId: r.id }).data.execution
  assert.equal(s.run('executions.advance', { executionId: ex.id }).data.status, 'waiting')

  reply.received = true
  s.run('executions.resume', { executionId: ex.id, event: { type: 'event', key: 'reply' } })
  const done = s.run('executions.get', { executionId: ex.id }).data
  assert.equal(done.status, 'completed')
  const draft = s.run('executions.effects', { executionId: ex.id }).data.find((e) => e.ref === 'draft-1')
  assert.equal(draft.cancelled, true)
})

// F22 — un segundo proceso reutiliza el mismo motor y estado
test('F22 · el despachador reutiliza el motor persistente', () => {
  const s = svc()
  s.registerStepHandler('a', () => ({ output: 1 }))
  s.registerStepHandler('wait', (ctx) => (ctx.event ? { output: 'ok' } : { waitFor: { type: 'time', key: 't', timeoutAt: '2026-09-16T00:00:00.000Z' } }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'a' }, { id: 'b', type: 'wait' }] }).data
  s.run('routines.activate', { routineId: r.id })
  const ex = s.run('executions.start', { routineId: r.id }).data.execution
  s.run('executions.advance', { executionId: ex.id })

  // tick posterior: reanuda por evento
  s.run('executions.resume', { executionId: ex.id, event: { type: 'time', key: 't' } })
  assert.equal(s.run('executions.get', { executionId: ex.id }).data.status, 'completed')
})

test('ciclos y dependencias inválidas se detectan', () => {
  const s = svc()
  s.registerStepHandler('noop', () => ({ output: 'ok' }))
  const r = s.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a', type: 'noop', dependsOn: ['b'] }, { id: 'b', type: 'noop', dependsOn: ['a'] }] }).data
  const v = s.run('routines.validate', { routineId: r.id }).data
  assert.equal(v.ok, false)
  assert.ok(v.errors.some((e) => e.includes('cíclicas')))
})
