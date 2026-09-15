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
  #selections = []
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

  // ── Recomendación ──────────────────────────────────────────────────
  recommendModel({ agentId = null, requirements = null, task = null } = {}) {
    const agent = agentId ? this.#requireAgent(agentId) : null
    const req = normalizeRequirements(requirements || (agent ? agent.requirements : {}))
    const limitations = []
    const candidates = [...this.#models.values()]
      .filter((m) => m.available)
      .map((m) => {
        const meets = this.#compatible(m, req)
        const est = task ? this.#estimateCost(m, task) : null
        const expected = est === null ? null : { ...est, result: { ...est.result, cost: est.total } }
        return {
          modelId: m.id,
          provider: m.provider,
          name: m.name,
          capabilities: { ...m.capabilities },
          meetsRequirements: meets,
          estimatedCost: est ? est.total : null,
          costKnown: !!(m.pricing && m.pricing.input != null && m.pricing.output != null) && !!task,
          evidence: m.notes ? 'declared' : 'none',
        }
      })
      .filter((c) => c.meetsRequirements)

    const known = candidates.filter((c) => c.costKnown).sort((a, b) => a.estimatedCost - b.estimatedCost)
    const unknown = candidates.filter((c) => !c.costKnown)
    if (!candidates.length) {
      return { requirements: req, candidates: [], recommended: null, provisional: true, limitations: ['sin_candidatos_compatibles'] }
    }
    if (!known.length) limitations.push('cost_unknown')
    const provisional = !known.length || known[0].evidence === 'none'
    if (provisional) limitations.push('recomendacion_provisional_por_capacidades_declaradas')
    return {
      requirements: req,
      candidates,
      recommended: known.length ? known[0].modelId : null,
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

  /** Contrato único para UI y MCP. */
  run(operation, params = {}) {
    try {
      switch (operation) {
        case 'models.register': return ok(this.registerModel(params))
        case 'models.list': return ok(this.listModels(params))
        case 'models.get': return ok(this.getModel(params.modelId))
        case 'models.remove': return ok(this.removeModel(params.modelId))
        case 'templates.register': return ok(this.registerTemplate(params))
        case 'templates.list': return ok(this.listTemplates())
        case 'agents.create': return ok(this.createAgent(params))
        case 'agents.get': return ok(this.getAgent(params.agentId))
        case 'agents.list': return ok(this.listAgents(params))
        case 'agents.update': return ok(this.updateAgent(params.agentId, params.patch || {}))
        case 'agents.duplicate': return ok(this.duplicate(params))
        case 'agents.deactivate': return ok(this.deactivate(params.agentId))
        case 'agents.setModelPolicy': return ok(this.setModelPolicy(params))
        case 'agents.getEffectivePolicy': return ok(this.getEffectivePolicy(params.agentId))
        case 'agents.recommendModel': return ok(this.recommendModel(params))
        case 'agents.resolveModel': return ok(this.resolveModel(params))
        case 'agents.recordSelection': return ok(this.recordSelection(params))
        case 'agents.listSelections': return ok(this.listSelections(params))
        default: return { ok: false, error: { code: 'UNKNOWN_OPERATION', message: operation } }
      }
    } catch (e) {
      if (e instanceof AgentsError) return err(e)
      throw e
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
