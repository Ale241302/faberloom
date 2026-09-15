import { randomUUID } from 'node:crypto'

/**
 * E4 · Agentes y política de modelos.
 *
 * Catálogo de agentes con versiones, pool de modelos accesibles, política de
 * modelo por agente (principal, exclusividad, alternativas, escalamiento y
 * presupuesto) y un resolver/recomendador común. Contrato `run(operation,
 * params)` como en Espacios.
 */

export class AgentsError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'AgentsError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new AgentsError(code, message)
}
const uniq = (a) => [...new Set(a)]
const ok = (data) => ({ ok: true, data })
const err = (e) => ({ ok: false, error: { code: e.code, message: e.message } })

const CAPABILITIES = ['vision', 'tools', 'structuredOutput', 'longContext', 'reasoning']
const AGENT_KINDS = ['base', 'specialist', 'temporary']
const ROUTES = ['pool', 'scratch', 'task']

function normalizeRequirements(req = {}) {
  return { capabilities: uniq((req.capabilities || []).filter((c) => CAPABILITIES.includes(c))), minContext: req.minContext ?? null }
}

function normalizePolicy(policy) {
  if (!policy) return null
  const p = {
    principal: policy.principal || null,
    exclusive: !!policy.exclusive,
    fallback: Array.isArray(policy.fallback) ? [...policy.fallback] : [],
    escalation: policy.escalation
      ? { model: policy.escalation.model || null, conditions: [...(policy.escalation.conditions || [])], mode: policy.escalation.mode === 'manual' ? 'manual' : 'auto' }
      : null,
    budget: policy.budget
      ? {
          amount: policy.budget.amount ?? null,
          currency: policy.budget.currency || 'USD',
          perTask: policy.budget.perTask !== false,
          maxEscalations: policy.budget.maxEscalations ?? null,
          maxAttempts: policy.budget.maxAttempts ?? null,
        }
      : null,
  }
  if (p.exclusive) {
    // Exclusividad desactiva sustituciones y escalamiento.
    p.fallback = []
    p.escalation = null
  }
  return p
}

export class AgentsService {
  #models = new Map()
  #agents = new Map()
  #templates = new Map()
  #tools = new Map()
  #selections = []
  #executions = []
  #evidence = new Map() // `${modelId}|${taskType}` -> agregado
  #evidenceRecords = []
  #idGen
  #now
  #repo

  constructor({ idGen, now, repository } = {}) {
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
    this.#repo = repository ?? null
    if (this.#repo && typeof this.#repo.read === 'function') {
      const state = this.#repo.read()
      if (state) {
        for (const m of state.models || []) this.#models.set(m.id, m)
        for (const a of state.agents || []) this.#agents.set(a.id, a)
        this.#selections = [...(state.selections || [])]
        this.#executions = [...(state.executions || [])]
        this.#evidenceRecords = [...(state.evidence || [])]
        for (const ev of this.#evidenceRecords) this.#applyEvidence(ev)
      }
    }
  }

  _id(prefix) {
    return `${prefix}_${this.#idGen()}`
  }

  // ── Pool de modelos ────────────────────────────────────────────────
  registerModel(params = {}) {
    const { id, provider, name, capabilities = {}, contextLimit = null, outputLimit = null, available = true, pricing = null, priceSource = null, priceDate = null, notes = null } = params
    if (!provider || !name) fail('INVALID_MODEL', 'provider y name son obligatorios')
    const model = {
      id: id || this._id('mdl'),
      provider,
      name,
      capabilities: Object.fromEntries(CAPABILITIES.map((c) => [c, !!capabilities[c]])),
      contextLimit,
      outputLimit,
      available: available !== false,
      pricing: pricing ? { input: pricing.input ?? null, output: pricing.output ?? null, cacheInput: pricing.cacheInput ?? null, currency: pricing.currency || 'USD', unit: pricing.unit || 'per_million_tokens' } : null,
      priceSource,
      priceDate,
      notes,
      updatedAt: this.#now(),
    }
    this.#models.set(model.id, model)
    this.#persistModel(model)
    return this.#modelView(model)
  }

  listModels({ availableOnly = false } = {}) {
    return [...this.#models.values()].filter((m) => !availableOnly || m.available).map((m) => this.#modelView(m))
  }

  getModel(modelId) {
    const m = this.#requireModel(modelId)
    return this.#modelView(m)
  }

  removeModel(modelId) {
    const m = this.#requireModel(modelId)
    this.#models.delete(modelId)
    this.#persistDeleteModel(modelId)
    return this.#modelView(m)
  }

  // ── Catálogo de agentes ────────────────────────────────────────────
  registerTemplate(params = {}) {
    if (!params.id) fail('INVALID_TEMPLATE', 'id es obligatorio')
    this.#templates.set(params.id, { ...params })
    return { ...params }
  }

  listTemplates() {
    return [...this.#templates.values()].map((t) => ({ ...t }))
  }

  createAgent(params = {}) {
    const { name, responsibility = null, ownerId, spaceId = null, kind = 'specialist', route = 'scratch', originRef = null, fromAgentId = null, templateId = null, modelPolicy = null, requirements = {}, skills = [], tools = [], subagents = [] } = params
    if (!name || typeof name !== 'string') fail('INVALID_NAME', 'name es obligatorio')
    if (!ownerId) fail('INVALID_OWNER', 'ownerId es obligatorio')
    if (!AGENT_KINDS.includes(kind)) fail('INVALID_KIND', `kind inválido: ${kind}`)
    if (!ROUTES.includes(route)) fail('INVALID_ROUTE', `route inválido: ${route}`)

    let seed = {}
    if (route === 'pool') {
      if (!templateId && !fromAgentId) fail('INVALID_ROUTE', 'route "pool" requiere templateId o fromAgentId')
      if (fromAgentId) {
        const base = this.#requireAgent(fromAgentId)
        seed = { responsibility: base.responsibility, requirements: base.requirements, skills: base.skills, tools: base.tools, modelPolicy: base.modelPolicy }
      } else {
        const t = this.#templates.get(templateId)
        if (!t) fail('TEMPLATE_NOT_FOUND', `plantilla ${templateId} no existe`)
        seed = { responsibility: t.responsibility ?? null, requirements: t.requirements ?? {}, skills: t.skills ?? [], tools: t.tools ?? [], modelPolicy: t.modelPolicy ?? null }
      }
    } else if (route === 'task' && !originRef) {
      fail('INVALID_ROUTE', 'route "task" requiere originRef (conversación o tarea de origen)')
    }

    const explicitReq = requirements && (requirements.capabilities?.length || requirements.minContext != null)
    const chosenReq = explicitReq ? requirements : (seed.requirements && Object.keys(seed.requirements).length ? seed.requirements : requirements)

    const agent = {
      id: this._id('agt'),
      name,
      responsibility: responsibility ?? seed.responsibility ?? null,
      ownerId,
      spaceId,
      kind,
      origin: { route, ref: originRef, fromAgentId, templateId },
      modelPolicy: normalizePolicy(modelPolicy ?? seed.modelPolicy),
      requirements: normalizeRequirements(chosenReq),
      skills: [...(skills.length ? skills : seed.skills || [])],
      tools: [...(tools.length ? tools : seed.tools || [])],
      subagents: [...subagents],
      active: true,
      version: 1,
      history: [{ version: 1, at: this.#now(), changes: ['create'] }],
      createdAt: this.#now(),
      updatedAt: this.#now(),
    }
    this.#agents.set(agent.id, agent)
    this.#persistAgent(agent)
    return this.#agentView(agent)
  }

  getAgent(agentId) {
    return this.#agentView(this.#requireAgent(agentId))
  }

  listAgents({ spaceId, ownerId, kind } = {}) {
    return [...this.#agents.values()]
      .filter((a) => (spaceId === undefined || a.spaceId === spaceId) && (ownerId === undefined || a.ownerId === ownerId) && (kind === undefined || a.kind === kind))
      .map((a) => this.#agentView(a))
  }

  updateAgent(agentId, patch = {}) {
    const a = this.#requireAgent(agentId)
    const changes = []
    for (const key of ['name', 'responsibility', 'kind', 'spaceId']) {
      if (patch[key] !== undefined) {
        a[key] = patch[key]
        changes.push(key)
      }
    }
    if (patch.requirements !== undefined) {
      a.requirements = normalizeRequirements(patch.requirements)
      changes.push('requirements')
    }
    if (patch.skills !== undefined) {
      a.skills = [...patch.skills]
      changes.push('skills')
    }
    if (patch.tools !== undefined) {
      a.tools = [...patch.tools]
      changes.push('tools')
    }
    if (patch.subagents !== undefined) {
      a.subagents = [...patch.subagents]
      changes.push('subagents')
    }
    if (patch.active !== undefined) {
      a.active = patch.active !== false
      changes.push('active')
    }
    if (patch.modelPolicy !== undefined) {
      a.modelPolicy = normalizePolicy(patch.modelPolicy)
      changes.push('modelPolicy')
    }
    if (!changes.length) return this.#agentView(a)
    a.version += 1
    a.updatedAt = this.#now()
    a.history.push({ version: a.version, at: a.updatedAt, changes })
    this.#persistAgent(a)
    return this.#agentView(a)
  }

  setModelPolicy({ agentId, policy } = {}) {
    const a = this.#requireAgent(agentId)
    if (!policy) fail('INVALID_POLICY', 'policy es obligatoria')
    if (policy.principal) this.#requireModel(policy.principal)
    for (const f of policy.fallback || []) this.#requireModel(f)
    if (policy.escalation && policy.escalation.model) this.#requireModel(policy.escalation.model)
    a.modelPolicy = normalizePolicy(policy)
    a.version += 1
    a.updatedAt = this.#now()
    a.history.push({ version: a.version, at: a.updatedAt, changes: ['modelPolicy'] })
    this.#persistAgent(a)
    return this.#agentView(a)
  }

  getEffectivePolicy(agentId) {
    const a = this.#requireAgent(agentId)
    return { agentId: a.id, version: a.version, policy: a.modelPolicy ? structuredClone(a.modelPolicy) : null }
  }

  duplicate({ agentId, toSpaceId = null, skills = null, copyTeachings = false } = {}) {
    const src = this.#requireAgent(agentId)
    const copy = {
      id: this._id('agt'),
      name: `${src.name} (copia)`,
      responsibility: src.responsibility,
      ownerId: src.ownerId,
      spaceId: toSpaceId,
      kind: src.kind,
      origin: { route: 'duplicate', fromAgentId: src.id },
      modelPolicy: src.modelPolicy ? structuredClone(src.modelPolicy) : null,
      requirements: structuredClone(src.requirements),
      // Solo se copian las skills elegidas y las enseñanzas autorizadas explícitamente.
      skills: skills ? [...skills] : [...src.skills],
      tools: [...src.tools],
      subagents: [],
      teachings: copyTeachings ? [...(src.teachings || [])] : [],
      active: true,
      version: 1,
      history: [{ version: 1, at: this.#now(), changes: ['duplicate'] }],
      createdAt: this.#now(),
      updatedAt: this.#now(),
    }
    this.#agents.set(copy.id, copy)
    this.#persistAgent(copy)
    return this.#agentView(copy)
  }

  deactivate(agentId) {
    return this.updateAgent(agentId, { active: false })
  }

  // ── Herramientas ejecutables ───────────────────────────────────────
  registerTool({ id, name = null, handler, cost = null } = {}) {
    if (!id) fail('INVALID_TOOL', 'id es obligatorio')
    if (typeof handler !== 'function') fail('INVALID_TOOL', 'handler debe ser una función')
    this.#tools.set(id, { id, name: name || id, handler, cost })
    return { id, name: name || id }
  }

  listTools() {
    return [...this.#tools.values()].map((t) => ({ id: t.id, name: t.name, cost: t.cost }))
  }

  executeTool({ agentId, toolId, input = {}, modelId = null } = {}) {
    const agent = this.#requireAgent(agentId)
    if (agent.active === false) fail('AGENT_INACTIVE', `agente ${agentId} inactivo`)
    const tool = this.#tools.get(toolId)
    if (!tool) fail('TOOL_NOT_FOUND', `herramienta ${toolId} no registrada`)
    if (!this.#toolAllowed(agent, toolId)) fail('FORBIDDEN_TOOL', `el agente ${agentId} no tiene permitida ${toolId}`)

    const executionId = this._id('exe')
    const started = Date.now()
    const base = { id: executionId, agentId, kind: 'tool', toolId, subagentId: null, modelId, cost: tool.cost ?? null, error: null, createdAt: this.#now() }

    let result
    try {
      result = tool.handler(input, { agentId, modelId, executionId })
    } catch (e) {
      return this.#recordExecution({ ...base, status: 'error', durationMs: Date.now() - started, error: (e && e.message) || String(e) })
    }
    if (result && typeof result.then === 'function') {
      return result.then(
        (output) => this.#recordExecution({ ...base, status: 'ok', durationMs: Date.now() - started, output }),
        (e) => this.#recordExecution({ ...base, status: 'error', durationMs: Date.now() - started, error: (e && e.message) || String(e) }),
      )
    }
    return this.#recordExecution({ ...base, status: 'ok', durationMs: Date.now() - started, output: result })
  }

  #recordExecution(record) {
    this.#executions.push(record)
    this.#persistExecution(record)
    return record.status === 'ok'
      ? { executionId: record.id, status: 'ok', output: record.output, durationMs: record.durationMs }
      : { executionId: record.id, status: 'error', error: record.error, durationMs: record.durationMs }
  }

  /** Delegación a un subagente: respeta su política y el presupuesto compartido. */
  delegate({ parentAgentId, subagentAgentId, task = {}, toolCalls = [] } = {}) {
    const parent = this.#requireAgent(parentAgentId)
    if (parent.active === false) fail('AGENT_INACTIVE', `agente ${parentAgentId} inactivo`)
    if (!subagentAgentId) fail('INVALID_DELEGATION', 'subagentAgentId es obligatorio')
    if (!parent.subagents.includes(subagentAgentId)) fail('FORBIDDEN_SUBAGENT', `el padre ${parentAgentId} no tiene autorizado ${subagentAgentId}`)
    const child = this.#requireAgent(subagentAgentId)

    const decision = this.resolveModel({ agentId: child.id, task })
    if (decision.status !== 'selected') {
      return { status: decision.status, reason: decision.reason, childAgentId: child.id, decision }
    }

    const amount = parent.modelPolicy?.budget?.amount
    const spent = Number(task.budgetSpent || 0)
    if (typeof amount === 'number') {
      if (decision.estimatedCost == null) return { status: 'needs_decision', reason: 'COST_UNKNOWN', childAgentId: child.id, decision }
      if (spent + decision.estimatedCost > amount) return { status: 'denied', reason: 'BUDGET_EXCEEDED', childAgentId: child.id, decision }
    }

    const finish = (executions) => {
      const failed = executions.some((e) => e.status === 'error')
      const record = { id: this._id('exe'), agentId: parent.id, kind: 'delegation', toolId: null, subagentId: child.id, modelId: decision.modelId, status: failed ? 'error' : 'ok', cost: decision.estimatedCost ?? null, durationMs: 0, error: failed ? 'tool_error' : null, createdAt: this.#now() }
      this.#executions.push(record)
      this.#persistExecution(record)
      return { status: 'selected', delegationId: record.id, childAgentId: child.id, modelId: decision.modelId, policyVersion: decision.policyVersion, estimatedCost: decision.estimatedCost, executions, failed }
    }

    // Ejecuta las herramientas del hijo en orden; soporta handlers sync y async.
    const step = (index, acc) => {
      if (index >= toolCalls.length) return finish(acc)
      const call = toolCalls[index]
      let r
      try {
        r = this.executeTool({ agentId: child.id, toolId: call.toolId, input: call.input || {}, modelId: decision.modelId })
      } catch (e) {
        acc.push({ status: 'error', error: (e && e.message) || String(e) })
        return finish(acc)
      }
      if (r && typeof r.then === 'function') {
        return r.then((res) => {
          acc.push(res)
          return res.status === 'error' ? finish(acc) : step(index + 1, acc)
        })
      }
      acc.push(r)
      return r.status === 'error' ? finish(acc) : step(index + 1, acc)
    }

    return step(0, [])
  }

  listExecutions({ agentId } = {}) {
    return this.#executions.filter((e) => !agentId || e.agentId === agentId).map((e) => ({ ...e }))
  }

  // ── Evidencia real por modelo ──────────────────────────────────────
  recordOutcome({ modelId, taskType = 'general', outcome, cost = null, latencyMs = null } = {}) {
    this.#requireModel(modelId)
    if (!['approved', 'corrected', 'error'].includes(outcome)) fail('INVALID_OUTCOME', `outcome inválido: ${outcome}`)
    const ev = { id: this._id('ev'), modelId, taskType, outcome, cost, latencyMs, createdAt: this.#now() }
    this.#applyEvidence(ev)
    this.#evidenceRecords.push(ev)
    this.#persistEvidence(ev)
    return this.#evidenceView(this.#evidence.get(`${modelId}|${taskType}`))
  }

  evidence({ modelId, taskType } = {}) {
    return [...this.#evidence.values()]
      .map((a) => this.#evidenceView(a))
      .filter((a) => (!modelId || a.modelId === modelId) && (!taskType || a.taskType === taskType))
  }

  // ── Recomendación ──────────────────────────────────────────────────
  recommendModel({ agentId = null, requirements = null, task = null, taskType = 'general' } = {}) {
    const agent = agentId ? this.#requireAgent(agentId) : null
    const req = normalizeRequirements(requirements || (agent ? agent.requirements : {}))
    const limitations = []

    const candidates = [...this.#models.values()]
      .filter((m) => m.available && this.#compatible(m, req))
      .map((m) => {
        const ev = this.#evidenceView(this.#evidence.get(`${m.id}|${taskType}`))
        const est = task ? this.#estimateCost(m, task) : null
        const costKnown = !!(m.pricing && m.pricing.input != null && m.pricing.output != null) && !!task
        return {
          modelId: m.id,
          provider: m.provider,
          name: m.name,
          capabilities: { ...m.capabilities },
          estimatedCost: est ? est.total : null,
          costKnown,
          probed: ev.samples > 0,
          evidence: ev,
        }
      })

    if (!candidates.length) {
      return { requirements: req, candidates: [], recommended: null, provisional: true, limitations: ['sin_candidatos_compatibles'] }
    }

    const probed = candidates.filter((c) => c.probed && c.evidence.costPerUsefulResult != null).sort((a, b) => a.evidence.costPerUsefulResult - b.evidence.costPerUsefulResult)
    const known = candidates.filter((c) => c.costKnown).sort((a, b) => a.estimatedCost - b.estimatedCost)
    if (!known.length) limitations.push('cost_unknown')

    let recommended = null
    let basis = 'unknown'
    if (probed.length) {
      recommended = probed[0]
      basis = 'evidence'
    } else if (known.length) {
      recommended = known[0]
      basis = 'estimated'
    }

    const provisional = !recommended || recommended.evidence.samples === 0
    if (provisional && recommended) limitations.push('recomendacion_provisional_por_capacidades_declaradas')

    return {
      requirements: req,
      taskType,
      candidates,
      recommended: recommended ? recommended.modelId : null,
      basis,
      costKnown: known.length > 0,
      provisional,
      limitations,
    }
  }

  // ── Resolver de selección efectiva ─────────────────────────────────
  resolveModel({ agentId, task = {} } = {}) {
    const agent = this.#requireAgent(agentId)
    const policy = agent.modelPolicy
    const uncertainty = []
    if (!policy || !policy.principal) {
      return { agentId, policyVersion: agent.version, status: 'denied', reason: 'NO_PRINCIPAL', uncertainty }
    }
    if (agent.active === false) {
      return { agentId, policyVersion: agent.version, status: 'denied', reason: 'AGENT_INACTIVE', uncertainty }
    }

    const principal = this.#models.get(policy.principal)
    const principalOk = !!(principal && principal.available)
    const providerFailed = !!(task.providerFailure && principal && task.providerFailure === principal.provider)
    const req = normalizeRequirements(task.requirements || agent.requirements)

    const decide = (modelId, kind, reason) => {
      const model = this.#models.get(modelId)
      const est = this.#estimateCost(model, task)
      const costUnknown = est === null && !!policy.budget && typeof policy.budget.amount === 'number'
      if (costUnknown) {
        return { agentId, policyVersion: agent.version, status: 'needs_decision', kind, modelId, provider: model?.provider ?? null, reason: 'COST_UNKNOWN', uncertainty: ['cost_unknown'] }
      }
      if (policy.budget && typeof policy.budget.amount === 'number') {
        const spent = Number(task.budgetSpent || 0)
        const total = spent + (est ? est.total : 0)
        if (total > policy.budget.amount) {
          return { agentId, policyVersion: agent.version, status: 'denied', kind, modelId, provider: model?.provider ?? null, reason: 'BUDGET_EXCEEDED', estimatedCost: est ? est.total : null, currency: policy.budget.currency, uncertainty }
        }
      }
      return {
        agentId,
        policyVersion: agent.version,
        status: 'selected',
        kind,
        modelId,
        provider: model?.provider ?? null,
        reason,
        estimatedCost: est ? est.total : null,
        currency: policy.budget?.currency ?? model?.pricing?.currency ?? null,
        uncertainty,
      }
    }

    if (policy.exclusive) {
      if (principalOk && !providerFailed && this.#compatible(principal, req)) return decide(policy.principal, 'principal', 'EXCLUSIVE_PRINCIPAL')
      return { agentId, policyVersion: agent.version, status: 'denied', kind: 'principal', modelId: policy.principal, reason: 'EXCLUSIVE_UNAVAILABLE', uncertainty: principal ? [] : ['model_unknown'] }
    }

    if (principalOk && !providerFailed && this.#compatible(principal, req)) {
      const esc = policy.escalation
      const wantsEscalation = task.validationPassed === false || task.difficulty === true
      if (esc && esc.model && wantsEscalation && this.#escalationAllowed(task, esc.conditions)) {
        const em = this.#models.get(esc.model)
        if (em && em.available && this.#compatible(em, req)) {
          if (esc.mode === 'manual') {
            return { agentId, policyVersion: agent.version, status: 'needs_approval', kind: 'escalation', modelId: esc.model, provider: em.provider, reason: 'ESCALATION_MANUAL', uncertainty }
          }
          const max = policy.budget?.maxEscalations
          if (typeof max === 'number' && Number(task.escalations || 0) >= max) {
            return { agentId, policyVersion: agent.version, status: 'denied', kind: 'escalation', modelId: esc.model, reason: 'ESCALATION_LIMIT', uncertainty }
          }
          return decide(esc.model, 'escalation', 'ESCALATION_AUTO')
        }
      }
      return decide(policy.principal, 'principal', 'PRINCIPAL')
    }

    for (const fid of policy.fallback || []) {
      const fm = this.#models.get(fid)
      if (fm && fm.available && this.#compatible(fm, req) && !(task.providerFailure && task.providerFailure === fm.provider)) {
        return decide(fid, 'fallback', 'FALLBACK')
      }
    }

    const esc = policy.escalation
    if (esc && esc.model) {
      const em = this.#models.get(esc.model)
      if (em && em.available && this.#compatible(em, req)) {
        if (esc.mode === 'manual') {
          return { agentId, policyVersion: agent.version, status: 'needs_approval', kind: 'escalation', modelId: esc.model, provider: em.provider, reason: 'ESCALATION_MANUAL', uncertainty }
        }
        return decide(esc.model, 'escalation', 'ESCALATION_AUTO')
      }
    }

    return { agentId, policyVersion: agent.version, status: 'denied', reason: 'NO_CANDIDATE', unavailability: { principal: !principalOk, providerFailed }, uncertainty }
  }

  recordSelection({ agentId, taskId = null, decision } = {}) {
    if (!decision) fail('INVALID_SELECTION', 'decision es obligatoria')
    const sel = {
      id: this._id('sel'),
      agentId,
      taskId,
      modelId: decision.modelId ?? null,
      kind: decision.kind ?? null,
      reason: decision.reason ?? null,
      policyVersion: decision.policyVersion ?? null,
      estimatedCost: decision.estimatedCost ?? null,
      currency: decision.currency ?? null,
      createdAt: this.#now(),
    }
    this.#selections.push(sel)
    this.#persistSelection(sel)
    return { ...sel }
  }

  listSelections({ agentId } = {}) {
    return this.#selections.filter((s) => !agentId || s.agentId === agentId).map((s) => ({ ...s }))
  }

  /**
   * Contrato único para UI y MCP. Devuelve `{ok,data}` o `{ok:false,error}`.
   * Si la operación es asíncrona (handler async), devuelve una Promesa de ese
   * mismo objeto; el transporte la espera.
   */
  run(operation, params = {}) {
    let result
    try {
      result = this.#dispatch(operation, params)
    } catch (e) {
      if (e instanceof AgentsError) return err(e)
      throw e
    }
    if (result && typeof result.then === 'function') {
      return result.then(
        (data) => ok(data),
        (e) => {
          if (e instanceof AgentsError) return err(e)
          throw e
        },
      )
    }
    return ok(result)
  }

  #dispatch(operation, params) {
    switch (operation) {
      case 'models.register': return this.registerModel(params)
      case 'models.list': return this.listModels(params)
      case 'models.get': return this.getModel(params.modelId)
      case 'models.remove': return this.removeModel(params.modelId)
      case 'templates.register': return this.registerTemplate(params)
      case 'templates.list': return this.listTemplates()
      case 'agents.create': return this.createAgent(params)
      case 'agents.get': return this.getAgent(params.agentId)
      case 'agents.list': return this.listAgents(params)
      case 'agents.update': return this.updateAgent(params.agentId, params.patch || {})
      case 'agents.duplicate': return this.duplicate(params)
      case 'agents.deactivate': return this.deactivate(params.agentId)
      case 'agents.setModelPolicy': return this.setModelPolicy(params)
      case 'agents.getEffectivePolicy': return this.getEffectivePolicy(params.agentId)
      case 'agents.recommendModel': return this.recommendModel(params)
      case 'agents.resolveModel': return this.resolveModel(params)
      case 'agents.recordSelection': return this.recordSelection(params)
      case 'agents.listSelections': return this.listSelections(params)
      case 'tools.register': return this.registerTool(params)
      case 'tools.list': return this.listTools()
      case 'agents.executeTool': return this.executeTool(params)
      case 'agents.delegate': return this.delegate(params)
      case 'agents.listExecutions': return this.listExecutions(params)
      case 'models.recordOutcome': return this.recordOutcome(params)
      case 'models.evidence': return this.evidence(params)
      default: return fail('UNKNOWN_OPERATION', operation)
    }
  }

  // ── Internos ───────────────────────────────────────────────────────
  #requireModel(id) {
    const m = this.#models.get(id)
    if (!m) fail('MODEL_NOT_FOUND', `modelo ${id} no está en el pool`)
    return m
  }

  #requireAgent(id) {
    const a = this.#agents.get(id)
    if (!a) fail('AGENT_NOT_FOUND', `agente ${id} no existe`)
    return a
  }

  #compatible(model, req) {
    if (!model) return false
    for (const c of req.capabilities || []) if (!model.capabilities?.[c]) return false
    if (req.minContext && model.contextLimit && model.contextLimit < req.minContext) return false
    return true
  }

  #escalationAllowed(task, conditions) {
    if (!conditions || !conditions.length) return true
    return conditions.some((c) => (c === 'validation_failed' && task.validationPassed === false) || (c === 'complexity' && task.difficulty === true))
  }

  #estimateCost(model, task) {
    if (!model || !model.pricing || model.pricing.input == null || model.pricing.output == null) return null
    const prompt = task.promptTokens
    const completion = task.completionTokens
    if (typeof prompt !== 'number' || typeof completion !== 'number') return null
    const attempts = Math.max(1, Number(task.attempts || 1))
    const base = (prompt / 1e6) * model.pricing.input + (completion / 1e6) * model.pricing.output
    return { total: base * attempts, base, attempts, currency: model.pricing.currency || 'USD', result: { attempts } }
  }

  #snapshotModels() {
    return { models: [...this.#models.values()] }
  }

  #persistModel(m) {
    if (this.#repo && typeof this.#repo.saveModel === 'function') this.#repo.saveModel(m)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write(this.#snapshotModels())
  }

  #persistDeleteModel(id) {
    if (this.#repo && typeof this.#repo.deleteModel === 'function') this.#repo.deleteModel(id)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write(this.#snapshotModels())
  }

  #persistAgent(a) {
    if (this.#repo && typeof this.#repo.saveAgent === 'function') this.#repo.saveAgent(a)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ agents: [...this.#agents.values()] })
  }

  #persistSelection(s) {
    if (this.#repo && typeof this.#repo.saveSelection === 'function') this.#repo.saveSelection(s)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ selections: [...this.#selections] })
  }

  #persistExecution(e) {
    if (this.#repo && typeof this.#repo.saveExecution === 'function') this.#repo.saveExecution(e)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ executions: [...this.#executions] })
  }

  #persistEvidence(ev) {
    if (this.#repo && typeof this.#repo.saveEvidence === 'function') this.#repo.saveEvidence(ev)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ evidence: [...this.#evidenceRecords] })
  }

  #applyEvidence(ev) {
    const key = `${ev.modelId}|${ev.taskType}`
    const agg =
      this.#evidence.get(key) ||
      { modelId: ev.modelId, taskType: ev.taskType, approved: 0, corrected: 0, errors: 0, totalCost: 0, costSamples: 0, totalLatency: 0, latencySamples: 0, samples: 0 }
    agg.samples += 1
    if (ev.outcome === 'approved') agg.approved += 1
    else if (ev.outcome === 'corrected') agg.corrected += 1
    else agg.errors += 1
    if (typeof ev.cost === 'number') {
      agg.totalCost += ev.cost
      agg.costSamples += 1
    }
    if (typeof ev.latencyMs === 'number') {
      agg.totalLatency += ev.latencyMs
      agg.latencySamples += 1
    }
    this.#evidence.set(key, agg)
    return agg
  }

  #evidenceView(agg) {
    if (!agg) {
      return { modelId: null, taskType: null, samples: 0, approved: 0, corrected: 0, errors: 0, correctionRate: null, avgCost: null, costPerUsefulResult: null, avgLatencyMs: null }
    }
    return {
      modelId: agg.modelId,
      taskType: agg.taskType,
      samples: agg.samples,
      approved: agg.approved,
      corrected: agg.corrected,
      errors: agg.errors,
      correctionRate: agg.approved + agg.corrected > 0 ? agg.corrected / (agg.approved + agg.corrected) : null,
      avgCost: agg.costSamples ? agg.totalCost / agg.costSamples : null,
      costPerUsefulResult: agg.costSamples ? agg.totalCost / Math.max(1, agg.approved) : null,
      avgLatencyMs: agg.latencySamples ? agg.totalLatency / agg.latencySamples : null,
    }
  }

  #toolAllowed(agent, toolId) {
    return agent.tools.includes('*') || agent.tools.includes(toolId)
  }

  #modelView(m) {
    return { ...m, capabilities: { ...m.capabilities }, pricing: m.pricing ? { ...m.pricing } : null }
  }

  #agentView(a) {
    return {
      id: a.id,
      name: a.name,
      responsibility: a.responsibility,
      ownerId: a.ownerId,
      spaceId: a.spaceId,
      kind: a.kind,
      origin: a.origin ? { ...a.origin } : null,
      modelPolicy: a.modelPolicy ? structuredClone(a.modelPolicy) : null,
      requirements: structuredClone(a.requirements),
      skills: [...a.skills],
      tools: [...a.tools],
      subagents: [...a.subagents],
      teachings: [...(a.teachings || [])],
      active: a.active,
      version: a.version,
      history: a.history.map((h) => ({ ...h })),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }
  }
}
