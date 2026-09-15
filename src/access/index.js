import { randomUUID } from 'node:crypto'

/**
 * E7 · Autonomía electiva (concesiones).
 *
 * El humano concede permiso por **acción, agente y contexto**, con vigencia y
 * límite de usos. Es independiente de la confianza y del aprendizaje: **aprobar
 * o aprender nunca concede permiso**. Antes de cada efecto se comprueba la
 * concesión; una revocación detiene los pasos pendientes.
 */

export class AccessError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'AccessError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new AccessError(code, message)
}
const ok = (data) => ({ ok: true, data })
const err = (e) => ({ ok: false, error: { code: e.code, message: e.message } })

export class AccessService {
  #grants = new Map()
  #idGen
  #now
  #repo

  constructor({ idGen, now, repository } = {}) {
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
    this.#repo = repository ?? null
    if (this.#repo && typeof this.#repo.read === 'function') {
      const state = this.#repo.read()
      for (const g of (state && state.grants) || []) this.#grants.set(g.id, g)
    }
  }

  _id(prefix) {
    return `${prefix}_${this.#idGen()}`
  }

  /** Concede autonomía para una acción, agente y contexto. */
  grant({ ownerId, agentId = null, action, context = null, expiresAt = null, maxUses = null, reason = null, userId = null } = {}) {
    if (!ownerId) fail('INVALID_OWNER', 'ownerId es obligatorio')
    if (!action) fail('INVALID_ACTION', 'action es obligatoria')
    const grant = {
      id: this._id('grn'),
      ownerId,
      agentId,
      action,
      context: context ? { ...context } : null,
      status: 'active',
      expiresAt,
      maxUses,
      uses: 0,
      reason,
      grantedBy: userId ?? ownerId,
      createdAt: this.#now(),
      updatedAt: this.#now(),
    }
    this.#grants.set(grant.id, grant)
    this.#persist(grant)
    return this.#view(grant)
  }

  revoke({ grantId, userId = null, reason = null } = {}) {
    const g = this.#require(grantId)
    g.status = 'revoked'
    g.revokedBy = userId ?? null
    g.revokedReason = reason
    g.updatedAt = this.#now()
    this.#persist(g)
    return this.#view(g)
  }

  get(grantId) {
    return this.#view(this.#require(grantId))
  }

  list({ ownerId, agentId, action, status } = {}) {
    return [...this.#grants.values()]
      .filter((g) => (ownerId === undefined || g.ownerId === ownerId) && (agentId === undefined || g.agentId === agentId) && (action === undefined || g.action === action) && (status === undefined || g.status === status))
      .map((g) => this.#view(g))
  }

  /** Comprueba la concesión antes de un efecto. */
  check({ grantId = null, ownerId = null, agentId = null, action, context = null } = {}) {
    if (!action) fail('INVALID_ACTION', 'action es obligatoria')
    const nowMs = Date.now()
    let grant = null
    if (grantId) {
      // Un grantId explícito no cae al respaldo: debe existir.
      grant = this.#grants.get(grantId) || null
      if (!grant) return { allowed: false, reason: 'GRANT_NOT_FOUND' }
    } else {
      grant = [...this.#grants.values()].find(
        (g) => g.status === 'active' && g.action === action && (ownerId === null || g.ownerId === ownerId) && (agentId === null || g.agentId === null || g.agentId === agentId),
      )
    }
    if (!grant) return { allowed: false, reason: 'NO_GRANT' }
    if (grant.status !== 'active') return { allowed: false, reason: `GRANT_${grant.status.toUpperCase()}`, grantId: grant.id }
    if (grant.expiresAt && new Date(grant.expiresAt).getTime() <= nowMs) return { allowed: false, reason: 'GRANT_EXPIRED', grantId: grant.id }
    if (grant.maxUses != null && grant.uses >= grant.maxUses) return { allowed: false, reason: 'GRANT_EXHAUSTED', grantId: grant.id }
    if (grant.context && !contextMatches(grant.context, context)) return { allowed: false, reason: 'OUT_OF_CONTEXT', grantId: grant.id }
    return { allowed: true, reason: 'ALLOWED', grantId: grant.id }
  }

  /** Consume un uso (el límite se evalúa en `check`). */
  consume({ grantId } = {}) {
    const g = this.#require(grantId)
    g.uses += 1
    g.updatedAt = this.#now()
    this.#persist(g)
    return this.#view(g)
  }

  run(operation, params = {}) {
    try {
      switch (operation) {
        case 'access.grant': return ok(this.grant(params))
        case 'access.revoke': return ok(this.revoke(params))
        case 'access.get': return ok(this.get(params.grantId))
        case 'access.list': return ok(this.list(params))
        case 'access.check': return ok(this.check(params))
        case 'access.consume': return ok(this.consume(params))
        default: return { ok: false, error: { code: 'UNKNOWN_OPERATION', message: operation } }
      }
    } catch (e) {
      if (e instanceof AccessError) return err(e)
      throw e
    }
  }

  #require(id) {
    const g = this.#grants.get(id)
    if (!g) fail('GRANT_NOT_FOUND', `concesión ${id} no existe`)
    return g
  }

  #persist(g) {
    if (this.#repo && typeof this.#repo.saveGrant === 'function') this.#repo.saveGrant(g)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ grants: [...this.#grants.values()] })
  }

  #view(g) {
    return structuredClone(g)
  }
}

function contextMatches(required, provided) {
  if (!required) return true
  if (!provided) return false
  return Object.entries(required).every(([k, v]) => v == null || String(provided[k] ?? '') === String(v))
}
