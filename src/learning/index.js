import { randomUUID } from 'node:crypto'

/**
 * E7 · Memoria y aprendizaje.
 *
 * Enseñanzas **versionadas** con procedencia, alcance, estado (candidata, activa,
 * sustituida, revocada) y trazabilidad de usos; **desempeño contextual** sin
 * porcentajes inventados; y exportación/importación que conserva el
 * conocimiento pero **no** restaura permisos.
 */

export class LearningError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'LearningError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new LearningError(code, message)
}
const ok = (data) => ({ ok: true, data })
const err = (e) => ({ ok: false, error: { code: e.code, message: e.message } })

const KINDS = ['error', 'preference', 'requirement']
const OUTCOMES = ['approved', 'corrected', 'error', 'requirement_change']
const SCOPE_KEYS = ['spaceId', 'agentId', 'taskType']

function matchesScope(teachingScope, requested) {
  if (!teachingScope) return false
  return SCOPE_KEYS.every((k) => teachingScope[k] == null || (requested && String(requested[k] ?? '') === String(teachingScope[k])))
}

export class LearningService {
  #teachings = new Map()
  #usagesByTeaching = new Map()
  #outcomes = []
  #idGen
  #now
  #repo

  constructor({ idGen, now, repository } = {}) {
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
    this.#repo = repository ?? null
    if (this.#repo && typeof this.#repo.read === 'function') {
      const state = this.#repo.read()
      for (const t of (state && state.teachings) || []) this.#teachings.set(t.id, t)
      for (const u of (state && state.teachingUsages) || []) {
        const list = this.#usagesByTeaching.get(u.teachingId) || []
        list.push(u)
        this.#usagesByTeaching.set(u.teachingId, list)
      }
      this.#outcomes = [...((state && state.outcomes) || [])]
    }
  }

  _id(prefix) {
    return `${prefix}_${this.#idGen()}`
  }

  /** Propone una enseñanza (candidata hasta que se activa). */
  propose({ ownerId, scope = {}, kind = 'preference', text, provenance = {} } = {}) {
    if (!ownerId) fail('INVALID_OWNER', 'ownerId es obligatorio')
    if (!text) fail('INVALID_TEXT', 'text es obligatorio')
    if (!KINDS.includes(kind)) fail('INVALID_KIND', `kind inválido: ${kind}`)
    const at = this.#now()
    const teaching = {
      id: this._id('tch'),
      ownerId,
      scope: pickScope(scope),
      kind,
      status: 'candidate',
      version: 1,
      versions: [{ version: 1, text, at, by: provenance.author ?? ownerId, status: 'candidate' }],
      provenance: { source: provenance.source ?? 'user', ref: provenance.ref ?? null, caseId: provenance.caseId ?? null, executionId: provenance.executionId ?? null, itemId: provenance.itemId ?? null, author: provenance.author ?? null },
      createdAt: at,
      updatedAt: at,
    }
    this.#teachings.set(teaching.id, teaching)
    this.#persistTeaching(teaching)
    return this.#view(teaching)
  }

  /** Activa una enseñanza (instrucción explícita dentro del alcance autorizado). */
  activate({ teachingId, userId = null } = {}) {
    const t = this.#require(teachingId)
    if (t.status === 'revoked') fail('TEACHING_REVOKED', 'una enseñanza revocada no se reactiva; crea una nueva')
    t.status = 'active'
    t.versions[t.versions.length - 1].status = 'active'
    t.updatedAt = this.#now()
    t.activatedBy = userId
    this.#persistTeaching(t)
    return this.#view(t)
  }

  /** Edita una enseñanza: nueva versión; la anterior queda sustituida (historia intacta). */
  edit({ teachingId, text, userId = null } = {}) {
    const t = this.#require(teachingId)
    if (!text) fail('INVALID_TEXT', 'text es obligatorio')
    if (t.status === 'revoked') fail('TEACHING_REVOKED', 'una enseñanza revocada no se edita')
    const previous = t.versions[t.versions.length - 1]
    previous.status = 'superseded'
    const version = t.version + 1
    t.versions.push({ version, text, at: this.#now(), by: userId, status: t.status })
    t.version = version
    t.updatedAt = this.#now()
    this.#persistTeaching(t)
    return this.#view(t)
  }

  /** Revoca una enseñanza: deja de recuperarse; historia y usos se conservan. */
  revoke({ teachingId, reason = null, userId = null } = {}) {
    const t = this.#require(teachingId)
    t.status = 'revoked'
    t.revokedReason = reason
    t.revokedBy = userId
    t.versions[t.versions.length - 1].status = 'revoked'
    t.updatedAt = this.#now()
    this.#persistTeaching(t)
    return this.#view(t)
  }

  /**
   * Recupera las enseñanzas activas que corresponden al alcance pedido y registra
   * el uso (con la versión aplicada). No mezcla alcances.
   */
  retrieve({ ownerId, scope = {}, recordUsage = true, usageContext = {} } = {}) {
    const found = [...this.#teachings.values()].filter((t) => t.status === 'active' && (!ownerId || t.ownerId === ownerId) && matchesScope(t.scope, scope))
    if (recordUsage) {
      for (const t of found) {
        const usage = { id: this._id('use'), teachingId: t.id, version: t.version, at: this.#now(), context: { ...scope, ...usageContext } }
        const list = this.#usagesByTeaching.get(t.id) || []
        list.push(usage)
        this.#usagesByTeaching.set(t.id, list)
        this.#persistUsage(usage)
      }
    }
    return found.map((t) => this.#view(t))
  }

  list({ ownerId, scope, status, kind } = {}) {
    return [...this.#teachings.values()]
      .filter((t) => (ownerId === undefined || t.ownerId === ownerId) && (status === undefined || t.status === status) && (kind === undefined || t.kind === kind) && (scope === undefined || matchesScope(t.scope, scope)))
      .map((t) => this.#view(t))
  }

  usages({ teachingId } = {}) {
    return [...(this.#usagesByTeaching.get(teachingId) || [])].map((u) => ({ ...u }))
  }

  /** Registra el resultado de un caso (desempeño contextual). */
  recordOutcome({ ownerId, agentId = null, spaceId = null, taskType = null, outcome, severity = null, lateError = false, reviewMs = null } = {}) {
    if (!OUTCOMES.includes(outcome)) fail('INVALID_OUTCOME', `outcome inválido: ${outcome}`)
    const record = { id: this._id('out'), ownerId, agentId, spaceId, taskType, outcome, severity, lateError, reviewMs, at: this.#now() }
    this.#outcomes.push(record)
    this.#persistOutcome(record)
    return { ...record }
  }

  /**
   * Desempeño agregado. No fabrica confianza: solo cuenta casos; si la muestra es
   * pequeña lo indica. `requirement_change` no cuenta como fallo del agente.
   */
  performance({ agentId, spaceId, taskType } = {}) {
    const rows = this.#outcomes.filter((o) => (agentId === undefined || o.agentId === agentId) && (spaceId === undefined || o.spaceId === spaceId) && (taskType === undefined || o.taskType === taskType))
    const agg = { samples: rows.length, approved: 0, corrected: 0, errors: 0, requirementChanges: 0, lateErrors: 0, reviewMsTotal: 0, reviewMsSamples: 0 }
    for (const o of rows) {
      if (o.outcome === 'approved') agg.approved += 1
      else if (o.outcome === 'corrected') agg.corrected += 1
      else if (o.outcome === 'error') agg.errors += 1
      else if (o.outcome === 'requirement_change') agg.requirementChanges += 1
      if (o.lateError) agg.lateErrors += 1
      if (typeof o.reviewMs === 'number') {
        agg.reviewMsTotal += o.reviewMs
        agg.reviewMsSamples += 1
      }
    }
    const reviewed = agg.approved + agg.corrected
    return {
      ...agg,
      correctionRate: reviewed > 0 ? agg.corrected / reviewed : null,
      avgReviewMs: agg.reviewMsSamples > 0 ? agg.reviewMsTotal / agg.reviewMsSamples : null,
      evidence: agg.samples < 5 ? 'insuficiente' : 'suficiente',
    }
  }

  /** Error descubierto después de aprobar: nueva enseñanza vinculada al caso original. */
  recordLateError({ ownerId, scope = {}, text, provenance = {} } = {}) {
    const teaching = this.propose({ ownerId, scope, kind: 'error', text, provenance: { source: 'late_error', ...provenance } })
    return this.activate({ teachingId: teaching.id })
  }

  /**
   * Promueve una excepción (alcance estrecho) a una base común (alcance más
   * amplio). Exige que el destino sea realmente más amplio y deja rastro.
   */
  promote({ teachingId, targetScope = {}, reason = null, userId = null } = {}) {
    const src = this.#require(teachingId)
    if (src.status === 'revoked') fail('TEACHING_REVOKED', 'no se promueve una enseñanza revocada')
    const target = pickScope(targetScope)
    for (const [k, v] of Object.entries(target)) {
      if (src.scope[k] == null || String(src.scope[k]) !== String(v)) fail('NOT_A_BROADENING', `el alcance destino no amplía el origen (${k})`)
    }
    if (Object.keys(target).length >= Object.keys(src.scope).length) fail('NOT_A_BROADENING', 'el alcance destino no es más amplio que el origen')

    const current = src.versions[src.versions.length - 1]
    const at = this.#now()
    const teaching = {
      id: this._id('tch'),
      ownerId: src.ownerId,
      scope: target,
      kind: src.kind,
      status: 'active',
      version: 1,
      versions: [{ version: 1, text: current.text, at, by: userId ?? null, status: 'active' }],
      provenance: { source: 'promotion', ref: `teaching:${src.id}`, promotedFrom: src.id, reason, author: userId ?? null },
      createdAt: at,
      updatedAt: at,
    }
    this.#teachings.set(teaching.id, teaching)
    this.#persistTeaching(teaching)
    return this.#view(teaching)
  }

  /** Exporta el conocimiento de un alcance (con versiones). */
  exportScope({ ownerId, scope = {} } = {}) {
    const items = [...this.#teachings.values()].filter((t) => (!ownerId || t.ownerId === ownerId) && matchesScope(t.scope, scope))
    return { ownerId, scope: pickScope(scope), teachings: items.map((t) => structuredClone(t)) }
  }

  /** Importa conocimiento conservando versiones. NO restaura permisos ni credenciales. */
  importRecords({ ownerId, records = [] } = {}) {
    let imported = 0
    for (const r of Array.isArray(records) ? records : []) {
      if (!r || !r.id || !r.versions) continue
      const teaching = { ...structuredClone(r), ownerId: ownerId ?? r.ownerId, status: 'active', importedAt: this.#now() }
      this.#teachings.set(teaching.id, teaching)
      this.#persistTeaching(teaching)
      imported += 1
    }
    return { imported, grantsRestored: 0 }
  }

  run(operation, params = {}) {
    try {
      switch (operation) {
        case 'learning.propose': return ok(this.propose(params))
        case 'learning.activate': return ok(this.activate(params))
        case 'learning.edit': return ok(this.edit(params))
        case 'learning.revoke': return ok(this.revoke(params))
        case 'learning.retrieve': return ok(this.retrieve(params))
        case 'learning.list': return ok(this.list(params))
        case 'learning.usages': return ok(this.usages(params))
        case 'learning.recordOutcome': return ok(this.recordOutcome(params))
        case 'learning.performance': return ok(this.performance(params))
        case 'learning.recordLateError': return ok(this.recordLateError(params))
        case 'learning.promote': return ok(this.promote(params))
        case 'learning.exportScope': return ok(this.exportScope(params))
        case 'learning.importRecords': return ok(this.importRecords(params))
        default: return { ok: false, error: { code: 'UNKNOWN_OPERATION', message: operation } }
      }
    } catch (e) {
      if (e instanceof LearningError) return err(e)
      throw e
    }
  }

  #require(id) {
    const t = this.#teachings.get(id)
    if (!t) fail('TEACHING_NOT_FOUND', `enseñanza ${id} no existe`)
    return t
  }

  #persistTeaching(t) {
    if (this.#repo && typeof this.#repo.saveTeaching === 'function') this.#repo.saveTeaching(t)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ teachings: [...this.#teachings.values()] })
  }

  #persistUsage(u) {
    if (this.#repo && typeof this.#repo.saveUsage === 'function') this.#repo.saveUsage(u)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ teachingUsages: [...this.#usagesByTeaching.values()].flat() })
  }

  #persistOutcome(o) {
    if (this.#repo && typeof this.#repo.saveOutcome === 'function') this.#repo.saveOutcome(o)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ outcomes: [...this.#outcomes] })
  }

  #view(t) {
    return structuredClone({
      id: t.id,
      ownerId: t.ownerId,
      scope: t.scope,
      kind: t.kind,
      status: t.status,
      version: t.version,
      text: t.versions[t.versions.length - 1].text,
      versions: t.versions,
      provenance: t.provenance,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })
  }
}

function pickScope(scope = {}) {
  const out = {}
  for (const k of SCOPE_KEYS) if (scope[k] != null) out[k] = scope[k]
  return out
}
