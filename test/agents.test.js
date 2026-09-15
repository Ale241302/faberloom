import { test } from 'node:test'
import assert from 'node:assert/strict'

import { AgentsService } from '../src/agents/index.js'

const svc = () => {
  let n = 0
  return new AgentsService({ idGen: () => `id${++n}`, now: () => '2026-09-15T00:00:00.000Z' })
}
function seed(s) {
  s.run('models.register', { id: 'mdl_p', provider: 'deepseek', name: 'deepseek-chat', pricing: { input: 1, output: 2 } })
  s.run('models.register', { id: 'mdl_f', provider: 'openai', name: 'gpt', pricing: { input: 5, output: 10 } })
  s.run('models.register', { id: 'mdl_strong', provider: 'anthropic', name: 'claude', pricing: { input: 15, output: 75 } })
}

// F19 — principal, fallback por fallo de proveedor y registro de la selección
test('F19 · principal y fallback con motivo, versión y selección registrada', () => {
  const s = svc()
  seed(s)
  const a = s.run('agents.create', { name: 'Proformas', ownerId: 'u1', modelPolicy: { principal: 'mdl_p', fallback: ['mdl_f'] } }).data

  const d1 = s.run('agents.resolveModel', { agentId: a.id, task: {} }).data
  assert.equal(d1.modelId, 'mdl_p')
  assert.equal(d1.kind, 'principal')
  assert.equal(d1.policyVersion, a.version)

  const d2 = s.run('agents.resolveModel', { agentId: a.id, task: { providerFailure: 'deepseek' } }).data
  assert.equal(d2.modelId, 'mdl_f')
  assert.equal(d2.kind, 'fallback')
  assert.equal(d2.reason, 'FALLBACK')

  s.run('agents.recordSelection', { agentId: a.id, taskId: 't1', decision: d2 })
  const sel = s.run('agents.listSelections', { agentId: a.id }).data
  assert.equal(sel.length, 1)
  assert.equal(sel[0].modelId, 'mdl_f')
})

// F23 — exclusividad: no sustituye en silencio
test('F23 · agente exclusivo con proveedor caído no sustituye', () => {
  const s = svc()
  seed(s)
  const a = s.run('agents.create', { name: 'X', ownerId: 'u1', modelPolicy: { principal: 'mdl_p', exclusive: true, fallback: ['mdl_f'] } }).data
  assert.deepEqual(a.modelPolicy.fallback, []) // exclusividad desactiva sustituciones
  const d = s.run('agents.resolveModel', { agentId: a.id, task: { providerFailure: 'deepseek' } }).data
  assert.equal(d.status, 'denied')
  assert.equal(d.reason, 'EXCLUSIVE_UNAVAILABLE')
})

// F24 — recomendación compara candidatos
test('F24 · recomendar compara candidatos y elige el de menor costo esperado', () => {
  const s = svc()
  seed(s)
  const a = s.run('agents.create', { name: 'Y', ownerId: 'u1' }).data
  const rec = s.run('agents.recommendModel', { agentId: a.id, task: { promptTokens: 1000, completionTokens: 1000 } }).data
  assert.ok(rec.candidates.length >= 3)
  assert.equal(rec.recommended, 'mdl_p') // input 1 / output 2 es el más barato
  assert.equal(rec.costKnown, true)
})

// F25 — costo por resultado útil con reintentos
test('F25 · los reintentos cuentan en el costo estimado', () => {
  const s = svc()
  seed(s)
  const a = s.run('agents.create', { name: 'Z', ownerId: 'u1', modelPolicy: { principal: 'mdl_p' } }).data
  const d = s.run('agents.resolveModel', { agentId: a.id, task: { promptTokens: 1000, completionTokens: 1000, attempts: 3 } }).data
  // (1000/1e6*1 + 1000/1e6*2) * 3 = 0.009
  assert.ok(Math.abs(d.estimatedCost - 0.009) < 1e-9)
})

// F26 — escalamiento autorizado por dificultad
test('F26 · escalamiento automático dentro del presupuesto', () => {
  const s = svc()
  seed(s)
  const a = s.run('agents.create', {
    name: 'E',
    ownerId: 'u1',
    modelPolicy: { principal: 'mdl_p', escalation: { model: 'mdl_strong', mode: 'auto', conditions: ['validation_failed'] }, budget: { amount: 1, currency: 'USD' } },
  }).data
  const d = s.run('agents.resolveModel', { agentId: a.id, task: { validationPassed: false, promptTokens: 1000, completionTokens: 1000 } }).data
  assert.equal(d.status, 'selected')
  assert.equal(d.kind, 'escalation')
  assert.equal(d.modelId, 'mdl_strong')

  const manual = s.run('agents.setModelPolicy', { agentId: a.id, policy: { principal: 'mdl_p', escalation: { model: 'mdl_strong', mode: 'manual' } } }).data
  const d2 = s.run('agents.resolveModel', { agentId: manual.id, task: { validationPassed: false } }).data
  assert.equal(d2.status, 'needs_approval')
})

// F27 / F30 — costo desconocido: no inventa ni afirma el más barato
test('F27/F30 · costo desconocido no se asume cero', () => {
  const s = svc()
  s.run('models.register', { provider: 'x', name: 'sin-tarifa' })
  const a = s.run('agents.create', { name: 'N', ownerId: 'u1', modelPolicy: { principal: 'mdl_x', budget: { amount: 1 } } })
  // el id real lo asigna el servicio
  const agent = s.run('agents.get', { agentId: a.data.id }).data
  const tarifa = s.run('models.list', {}).data[0]
  s.run('agents.setModelPolicy', { agentId: agent.id, policy: { principal: tarifa.id, budget: { amount: 1 } } })
  const d = s.run('agents.resolveModel', { agentId: agent.id, task: { promptTokens: 1000, completionTokens: 1000 } }).data
  assert.equal(d.status, 'needs_decision')
  assert.equal(d.reason, 'COST_UNKNOWN')

  const rec = s.run('agents.recommendModel', { task: { promptTokens: 1000, completionTokens: 1000 } }).data
  assert.equal(rec.recommended, null)
  assert.equal(rec.costKnown, false)
  assert.ok(rec.limitations.includes('cost_unknown'))
})

// F28 — presupuesto compartido agotado
test('F28 · presupuesto agotado detiene nuevas llamadas', () => {
  const s = svc()
  seed(s)
  const a = s.run('agents.create', { name: 'B', ownerId: 'u1', modelPolicy: { principal: 'mdl_p', budget: { amount: 0.001 } } }).data
  const d = s.run('agents.resolveModel', { agentId: a.id, task: { promptTokens: 1000, completionTokens: 1000, budgetSpent: 0.5 } }).data
  assert.equal(d.status, 'denied')
  assert.equal(d.reason, 'BUDGET_EXCEEDED')
})

// F29 — editar política crea versión y se consulta igual
test('F29 · editar política por contrato crea versión consultable', () => {
  const s = svc()
  seed(s)
  const a = s.run('agents.create', { name: 'P', ownerId: 'u1', modelPolicy: { principal: 'mdl_p' } }).data
  const up = s.run('agents.setModelPolicy', { agentId: a.id, policy: { principal: 'mdl_f' } }).data
  assert.equal(up.version, a.version + 1)
  const eff = s.run('agents.getEffectivePolicy', { agentId: a.id }).data
  assert.equal(eff.version, up.version)
  assert.equal(eff.policy.principal, 'mdl_f')
})

// F03 — duplicar copia solo lo autorizado, sin confianza ficticia
test('F03 · duplicar especialista copia skills elegidas y no confianza', () => {
  const s = svc()
  seed(s)
  const src = s.run('agents.create', { name: 'Spec', ownerId: 'u1', skills: ['a', 'b', 'c'], modelPolicy: { principal: 'mdl_p' } }).data
  const dup = s.run('agents.duplicate', { agentId: src.id, skills: ['a'], copyTeachings: false }).data
  assert.deepEqual(dup.skills, ['a'])
  assert.equal(dup.origin.fromAgentId, src.id)
  assert.deepEqual(dup.teachings, [])
  assert.ok(!('confidence' in dup))
  assert.ok(!('trust' in dup))
})

// F42 — delegar a un agente con otro modelo respeta su política y presupuesto compartido
test('F42 · delegación usa el modelo efectivo del especialista', () => {
  const s = svc()
  seed(s)
  const specialist = s.run('agents.create', { name: 'Especialista', ownerId: 'u1', modelPolicy: { principal: 'mdl_strong', budget: { amount: 5, currency: 'USD' } } }).data
  const d = s.run('agents.resolveModel', { agentId: specialist.id, task: { budgetSpent: 0, promptTokens: 1000, completionTokens: 1000 } }).data
  assert.equal(d.modelId, 'mdl_strong')
  assert.equal(d.policyVersion, specialist.version)
  assert.equal(d.currency, 'USD')
})

// Requisitos: solo modelos compatibles
test('recomendar/resolver respetan los requisitos de capacidad', () => {
  const s = svc()
  s.run('models.register', { id: 'mdl_txt', provider: 'x', name: 'text', pricing: { input: 1, output: 1 } })
  s.run('models.register', { id: 'mdl_vis', provider: 'y', name: 'vision', capabilities: { vision: true }, pricing: { input: 2, output: 2 } })
  const rec = s.run('agents.recommendModel', { requirements: { capabilities: ['vision'] }, task: { promptTokens: 10, completionTokens: 10 } }).data
  assert.deepEqual(rec.candidates.map((c) => c.modelId), ['mdl_vis'])
})
