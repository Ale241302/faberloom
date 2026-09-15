import { test } from 'node:test'
import assert from 'node:assert/strict'

import { AgentsService } from '../src/agents/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}
function svc(repo) {
  const s = new AgentsService({ repository: repo, idGen: seq('id'), now: fixedNow })
  s.run('tools.register', { id: 'echo', handler: (input) => input })
  s.run('tools.register', { id: 'upper', handler: (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })
  return s
}

test('herramienta ejecutable permitida al agente', () => {
  const s = svc()
  const a = s.run('agents.create', { name: 'A', ownerId: 'u1', tools: ['echo'] }).data
  const r = s.run('agents.executeTool', { agentId: a.id, toolId: 'echo', input: { hola: 1 } }).data
  assert.equal(r.status, 'ok')
  assert.deepEqual(r.output, { hola: 1 })
  assert.equal(s.run('agents.listExecutions', { agentId: a.id }).data.length, 1)
})

test('herramienta no permitida → FORBIDDEN_TOOL', () => {
  const s = svc()
  const a = s.run('agents.create', { name: 'A', ownerId: 'u1', tools: [] }).data
  const r = s.run('agents.executeTool', { agentId: a.id, toolId: 'echo', input: {} })
  assert.equal(r.ok, false)
  assert.equal(r.error.code, 'FORBIDDEN_TOOL')
})

test('error del handler queda registrado', () => {
  const s = svc()
  s.run('tools.register', {
    id: 'boom',
    handler: () => {
      throw new Error('falló')
    },
  })
  const a = s.run('agents.create', { name: 'A', ownerId: 'u1', tools: ['boom'] }).data
  const r = s.run('agents.executeTool', { agentId: a.id, toolId: 'boom', input: {} }).data
  assert.equal(r.status, 'error')
  assert.equal(r.error, 'falló')
  assert.equal(s.run('agents.listExecutions', { agentId: a.id }).data[0].status, 'error')
})

test('subagente: delega con su modelo y ejecuta sus herramientas', () => {
  const s = svc()
  s.run('models.register', { id: 'mdl_c', provider: 'deepseek', name: 'chat', pricing: { input: 1, output: 2 } })
  const child = s.run('agents.create', { name: 'Hijo', ownerId: 'u1', tools: ['upper'], modelPolicy: { principal: 'mdl_c' } }).data
  const parent = s.run('agents.create', { name: 'Padre', ownerId: 'u1', subagents: [child.id], modelPolicy: { principal: 'mdl_c', budget: { amount: 5 } } }).data

  const r = s.run('agents.delegate', {
    parentAgentId: parent.id,
    subagentAgentId: child.id,
    task: { promptTokens: 1000, completionTokens: 1000 },
    toolCalls: [{ toolId: 'upper', input: { text: 'hola' } }],
  }).data
  assert.equal(r.status, 'selected')
  assert.equal(r.modelId, 'mdl_c')
  assert.equal(r.executions[0].output.text, 'HOLA')
})

test('subagente no autorizado → FORBIDDEN_SUBAGENT', () => {
  const s = svc()
  const child = s.run('agents.create', { name: 'Hijo', ownerId: 'u1' }).data
  const parent = s.run('agents.create', { name: 'Padre', ownerId: 'u1', subagents: [] }).data
  const r = s.run('agents.delegate', { parentAgentId: parent.id, subagentAgentId: child.id })
  assert.equal(r.ok, false)
  assert.equal(r.error.code, 'FORBIDDEN_SUBAGENT')
})

test('presupuesto compartido del padre detiene la delegación', () => {
  const s = svc()
  s.run('models.register', { id: 'mdl_c', provider: 'deepseek', name: 'chat', pricing: { input: 1, output: 2 } })
  const child = s.run('agents.create', { name: 'Hijo', ownerId: 'u1', modelPolicy: { principal: 'mdl_c' } }).data
  const parent = s.run('agents.create', { name: 'Padre', ownerId: 'u1', subagents: [child.id], modelPolicy: { principal: 'mdl_c', budget: { amount: 0.001 } } }).data
  const r = s.run('agents.delegate', { parentAgentId: parent.id, subagentAgentId: child.id, task: { promptTokens: 1000, completionTokens: 1000, budgetSpent: 0 } }).data
  assert.equal(r.status, 'denied')
  assert.equal(r.reason, 'BUDGET_EXCEEDED')
})

test('evidencia real mejora la recomendación (coste por resultado útil)', () => {
  const s = svc()
  s.run('models.register', { id: 'mdl_a', provider: 'x', name: 'a', pricing: { input: 1, output: 1 } })
  s.run('models.register', { id: 'mdl_b', provider: 'y', name: 'b', pricing: { input: 1, output: 1 } })
  s.run('models.recordOutcome', { modelId: 'mdl_b', taskType: 'proforma', outcome: 'approved', cost: 0.001 })
  s.run('models.recordOutcome', { modelId: 'mdl_b', taskType: 'proforma', outcome: 'approved', cost: 0.001 })
  s.run('models.recordOutcome', { modelId: 'mdl_a', taskType: 'proforma', outcome: 'corrected', cost: 0.004 })

  const ev = s.run('models.evidence', { modelId: 'mdl_b' }).data[0]
  assert.equal(ev.approved, 2)
  assert.ok(Math.abs(ev.costPerUsefulResult - 0.001) < 1e-9)

  const rec = s.run('agents.recommendModel', { taskType: 'proforma', task: { promptTokens: 1000, completionTokens: 1000 } }).data
  assert.equal(rec.basis, 'evidence')
  assert.equal(rec.recommended, 'mdl_b')
  assert.equal(rec.provisional, false)
})

test('sin evidencia la recomendación es provisional', () => {
  const s = svc()
  s.run('models.register', { id: 'mdl_a', provider: 'x', name: 'a', pricing: { input: 1, output: 1 } })
  const rec = s.run('agents.recommendModel', { task: { promptTokens: 10, completionTokens: 10 } }).data
  assert.equal(rec.provisional, true)
  assert.ok(rec.limitations.includes('recomendacion_provisional_por_capacidades_declaradas'))
})

test('ejecuciones y evidencia persisten (SQLite)', () => {
  const repo = new SqliteRepository(':memory:')
  const s1 = svc(repo)
  s1.run('models.register', { id: 'mdl_a', provider: 'x', name: 'a', pricing: { input: 1, output: 1 } })
  const a = s1.run('agents.create', { name: 'A', ownerId: 'u1', tools: ['echo'] }).data
  s1.run('agents.executeTool', { agentId: a.id, toolId: 'echo', input: { ok: true } })
  s1.run('models.recordOutcome', { modelId: 'mdl_a', outcome: 'approved', cost: 0.01 })

  const s2 = svc(repo)
  assert.equal(s2.run('agents.listExecutions', { agentId: a.id }).data.length, 1)
  assert.equal(s2.run('models.evidence', { modelId: 'mdl_a' }).data[0].approved, 1)
})

test('herramienta asíncrona: se espera y se registra', async () => {
  const s = svc()
  s.run('tools.register', { id: 'aupper', handler: async (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })
  const a = s.run('agents.create', { name: 'A', ownerId: 'u1', tools: ['aupper'] }).data
  const r = await s.run('agents.executeTool', { agentId: a.id, toolId: 'aupper', input: { text: 'hola' } })
  assert.equal(r.ok, true)
  assert.equal(r.data.status, 'ok')
  assert.equal(r.data.output.text, 'HOLA')
  assert.equal(s.run('agents.listExecutions', { agentId: a.id }).data.length, 1)
})

test('herramienta asíncrona que falla queda registrada', async () => {
  const s = svc()
  s.run('tools.register', {
    id: 'afail',
    handler: async () => {
      throw new Error('async falló')
    },
  })
  const a = s.run('agents.create', { name: 'A', ownerId: 'u1', tools: ['afail'] }).data
  const r = await s.run('agents.executeTool', { agentId: a.id, toolId: 'afail', input: {} })
  assert.equal(r.data.status, 'error')
  assert.equal(r.data.error, 'async falló')
})

test('run(): síncrono con handler sync, promesa con handler async', async () => {
  const s = svc()
  s.run('tools.register', { id: 'asyncx', handler: async () => 1 })
  const a = s.run('agents.create', { name: 'A', ownerId: 'u1', tools: ['echo', 'asyncx'] }).data

  const sync = s.run('agents.executeTool', { agentId: a.id, toolId: 'echo', input: {} })
  assert.equal(typeof sync.then, 'undefined')

  const asyncRes = s.run('agents.executeTool', { agentId: a.id, toolId: 'asyncx', input: {} })
  assert.equal(typeof asyncRes.then, 'function')
  assert.equal((await asyncRes).data.output, 1)
})

test('delegación con herramienta asíncrona', async () => {
  const s = svc()
  s.run('models.register', { id: 'mdl_c', provider: 'deepseek', name: 'chat', pricing: { input: 1, output: 2 } })
  s.run('tools.register', { id: 'async_upper', handler: async (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })
  const child = s.run('agents.create', { name: 'Hijo', ownerId: 'u1', tools: ['async_upper'], modelPolicy: { principal: 'mdl_c' } }).data
  const parent = s.run('agents.create', { name: 'Padre', ownerId: 'u1', subagents: [child.id], modelPolicy: { principal: 'mdl_c', budget: { amount: 5 } } }).data
  const r = await s.run('agents.delegate', {
    parentAgentId: parent.id,
    subagentAgentId: child.id,
    task: { promptTokens: 1000, completionTokens: 1000 },
    toolCalls: [{ toolId: 'async_upper', input: { text: 'hola' } }],
  })
  assert.equal(r.data.status, 'selected')
  assert.equal(r.data.executions[0].output.text, 'HOLA')
})
