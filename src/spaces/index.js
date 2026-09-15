import { randomUUID, createHash } from 'node:crypto'

/**
 * E3 · Espacios y contexto (primer corte).
 *
 * Núcleo independiente del harness: modelo de espacios, subespacios,
 * herencia/exclusiones, contexto efectivo, ámbito personal y vista previa de
 * cambio de audiencia. Es la lógica compartida que después consumen la UI y el
 * servidor MCP de FaberLoom mediante `run(operation, params)`.
 */

export class SpacesError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'SpacesError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new SpacesError(code, message)
}
const uniq = (arr) => [...new Set(arr)]
const ok = (data) => ({ ok: true, data })
const err = (e) => ({ ok: false, error: { code: e.code, message: e.message } })

function normalizeContext(items) {
  if (!Array.isArray(items)) return []
  return items.map((it, i) => {
    if (!it || typeof it !== 'object') fail('INVALID_CONTEXT_ITEM', `context[${i}] no es un objeto`)
    if (!it.key) fail('INVALID_CONTEXT_ITEM', `context[${i}] sin key`)
    return { id: it.id || `ctx_${randomUUID()}`, key: it.key, value: it.value, source: it.source ?? null }
  })
}

export class SpacesService {
  #spaces = new Map()
  #personalByUser = new Map()
  #idGen
  #now

  constructor({ idGen, now } = {}) {
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
  }

  _id(prefix) {
    return `${prefix}_${this.#idGen()}`
  }

  // ── Operaciones ────────────────────────────────────────────────────
  createSpace(params = {}) {
    const { name, ownerId, parentId = null, inheritContext = true, members = [], context = [], excluded = [], theme = null } = params
    if (!name || typeof name !== 'string') fail('INVALID_NAME', 'name es obligatorio')
    if (!ownerId) fail('INVALID_OWNER', 'ownerId es obligatorio')
    if (parentId && !this.#spaces.has(parentId)) fail('PARENT_NOT_FOUND', `el padre ${parentId} no existe`)

    const space = {
      id: this._id('sp'),
      name,
      theme,
      ownerId,
      parentId: parentId || null,
      inheritContext: inheritContext !== false,
      personal: false,
      members: uniq([ownerId, ...(Array.isArray(members) ? members : [])]),
      context: normalizeContext(context),
      excluded: Array.isArray(excluded) ? [...excluded] : [],
      version: 1,
      createdAt: this.#now(),
    }
    this.#spaces.set(space.id, space)
    return this.#view(space)
  }

  getSpace(spaceId, { userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId)
    return this.#view(s)
  }

  listSpaces({ userId } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    return [...this.#spaces.values()]
      .filter((s) => !s.personal && (s.ownerId === userId || s.members.includes(userId)))
      .map((s) => this.#view(s))
  }

  updateSpace(spaceId, patch = {}, { userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId)
    if (patch.name !== undefined) {
      if (!patch.name) fail('INVALID_NAME', 'name no puede quedar vacío')
      s.name = patch.name
    }
    if (patch.theme !== undefined) s.theme = patch.theme
    if (patch.inheritContext !== undefined) s.inheritContext = patch.inheritContext !== false
    if (patch.context !== undefined) s.context = normalizeContext(patch.context)
    if (patch.excluded !== undefined) s.excluded = Array.isArray(patch.excluded) ? [...patch.excluded] : []
    if (patch.members !== undefined) s.members = uniq([s.ownerId, ...(Array.isArray(patch.members) ? patch.members : [])])
    s.version += 1
    return this.#view(s)
  }

  effectiveContext(spaceId, { userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId)
    const { items, versions } = this.#collect(s.id, new Set())
    const { kept, removed } = this.#applyExclusions(items, s.excluded)
    const { resolved, conflicts } = this.#merge(kept)
    return { spaceId: s.id, items: kept, resolved, conflicts, excluded: removed, versions }
  }

  resolveScope({ userId, spaceId = null } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    if (!spaceId) return this.#view(this.#ensurePersonal(userId))
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId)
    return this.#view(s)
  }

  previewLink({ userId, targetSpaceId, material = [] } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    const target = this.#require(targetSpaceId)
    this.#assertAccess(target, userId)
    const audienceBefore = [userId]
    const audienceAfter = uniq(target.members)
    const newlyVisibleTo = audienceAfter.filter((u) => !audienceBefore.includes(u))
    const summary = { messages: 0, attachments: 0, other: 0, sensitive: 0 }
    for (const m of Array.isArray(material) ? material : []) {
      const type = (m && m.type) || 'other'
      if (type === 'message') summary.messages++
      else if (type === 'attachment') summary.attachments++
      else summary.other++
      if (m && m.sensitive) summary.sensitive++
    }
    return {
      targetSpaceId: target.id,
      audienceBefore,
      audienceAfter,
      newlyVisibleTo,
      material: summary,
      warning: newlyVisibleTo.length
        ? summary.sensitive
          ? 'Se compartirá material, incluido contenido sensible, con otros miembros'
          : 'Se compartirá material con otros miembros'
        : 'Sin cambio de audiencia',
    }
  }

  resolveWorkdir(spaceId, { userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId)
    // El path real del harness nunca se expone: solo una referencia opaca.
    const ref = 'fw_' + createHash('sha256').update(s.id).digest('hex').slice(0, 24)
    return { spaceId: s.id, ref }
  }

  /** Contrato único para UI y MCP. Devuelve {ok:true,data} o {ok:false,error}. */
  run(operation, params = {}) {
    try {
      switch (operation) {
        case 'spaces.create': return ok(this.createSpace(params))
        case 'spaces.get': return ok(this.getSpace(params.spaceId, params))
        case 'spaces.list': return ok(this.listSpaces(params))
        case 'spaces.update': return ok(this.updateSpace(params.spaceId, params.patch || {}, params))
        case 'spaces.effectiveContext': return ok(this.effectiveContext(params.spaceId, params))
        case 'spaces.personal': return ok(this.resolveScope(params))
        case 'spaces.previewLink': return ok(this.previewLink(params))
        case 'spaces.resolveWorkdir': return ok(this.resolveWorkdir(params.spaceId, params))
        default: return { ok: false, error: { code: 'UNKNOWN_OPERATION', message: operation } }
      }
    } catch (e) {
      if (e instanceof SpacesError) return err(e)
      throw e
    }
  }

  // ── Internos ───────────────────────────────────────────────────────
  #require(id) {
    const s = this.#spaces.get(id)
    if (!s) fail('SPACE_NOT_FOUND', `espacio ${id} no existe`)
    return s
  }

  #assertAccess(space, userId) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    if (space.personal) {
      if (space.ownerId !== userId) fail('ACCESS_DENIED', 'ámbito personal de otro usuario')
      return
    }
    if (space.ownerId !== userId && !space.members.includes(userId)) {
      fail('ACCESS_DENIED', `sin acceso al espacio ${space.id}`)
    }
  }

  #ensurePersonal(userId) {
    let s = this.#personalByUser.get(userId)
    if (!s) {
      s = {
        id: this._id('per'),
        name: 'Personal',
        theme: null,
        ownerId: userId,
        parentId: null,
        inheritContext: false,
        personal: true,
        members: [userId],
        context: [],
        excluded: [],
        version: 1,
        createdAt: this.#now(),
      }
      this.#spaces.set(s.id, s)
      this.#personalByUser.set(userId, s)
    }
    return s
  }

  #collect(spaceId, seen) {
    if (seen.has(spaceId)) fail('CYCLE', 'ciclo de espacios detectado')
    seen.add(spaceId)
    const s = this.#require(spaceId)
    const parent = s.inheritContext && s.parentId ? this.#collect(s.parentId, seen) : { items: [], versions: [] }
    return {
      items: [...parent.items, ...s.context],
      versions: [...parent.versions, { spaceId: s.id, version: s.version }],
    }
  }

  #applyExclusions(items, excluded) {
    const keys = new Set(excluded.map((e) => (typeof e === 'string' ? e : e && e.key)).filter(Boolean))
    const kept = []
    const removed = []
    for (const it of items) (keys.has(it.key) ? removed : kept).push(it)
    return { kept, removed }
  }

  #merge(items) {
    const groups = new Map()
    for (const it of items) {
      if (!groups.has(it.key)) groups.set(it.key, [])
      groups.get(it.key).push(it)
    }
    const resolved = {}
    const conflicts = []
    for (const [key, list] of groups) {
      const distinct = uniq(list.map((i) => JSON.stringify(i.value)))
      resolved[key] = list[list.length - 1].value
      if (distinct.length > 1) {
        conflicts.push({ key, values: list.map((i) => ({ value: i.value, source: i.source })) })
      }
    }
    return { resolved, conflicts }
  }

  #view(s) {
    return {
      id: s.id,
      name: s.name,
      theme: s.theme,
      ownerId: s.ownerId,
      parentId: s.parentId,
      inheritContext: s.inheritContext,
      personal: s.personal,
      members: [...s.members],
      version: s.version,
      createdAt: s.createdAt,
    }
  }
}
