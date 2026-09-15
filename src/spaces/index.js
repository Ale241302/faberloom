import { randomUUID, createHash } from 'node:crypto'

/**
 * E3 · Espacios y contexto.
 *
 * Núcleo independiente del harness: modelo de espacios, subespacios,
 * herencia/exclusiones, contexto efectivo, ámbito personal, audiencia y ACL por
 * espacio. Es la lógica compartida que consumen la UI y el servidor MCP de
 * FaberLoom mediante `run(operation, params)`.
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

/** Roles por espacio y qué permisos concede cada uno. */
export const ROLES = ['owner', 'admin', 'editor', 'viewer']
const PERMISSIONS = {
  view: ['owner', 'admin', 'editor', 'viewer'],
  edit: ['owner', 'admin', 'editor'],
  manage: ['owner', 'admin'],
}

function normalizeContext(items) {
  if (!Array.isArray(items)) return []
  return items.map((it, i) => {
    if (!it || typeof it !== 'object') fail('INVALID_CONTEXT_ITEM', `context[${i}] no es un objeto`)
    if (!it.key) fail('INVALID_CONTEXT_ITEM', `context[${i}] sin key`)
    return { id: it.id || `ctx_${randomUUID()}`, key: it.key, value: it.value, source: it.source ?? null }
  })
}

/** Acepta `['u2']` o `[{ userId, role }]`; el propietario siempre es `owner`. */
function normalizeMembers(ownerId, members) {
  const map = new Map([[ownerId, 'owner']])
  for (const m of Array.isArray(members) ? members : []) {
    if (typeof m === 'string') {
      if (m !== ownerId) map.set(m, 'editor')
    } else if (m && m.userId) {
      if (m.userId !== ownerId) map.set(m.userId, ROLES.includes(m.role) && m.role !== 'owner' ? m.role : 'editor')
    }
  }
  return [...map.entries()].map(([userId, role]) => ({ userId, role }))
}

export class SpacesService {
  #spaces = new Map()
  #personalByUser = new Map() // userId -> spaceId
  #idGen
  #now
  #repo

  constructor({ idGen, now, repository } = {}) {
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
    this.#repo = repository ?? null
    if (this.#repo && typeof this.#repo.read === 'function') {
      const state = this.#repo.read()
      if (state && Array.isArray(state.spaces)) {
        for (const s of state.spaces) this.#spaces.set(s.id, s)
        for (const [uid, sid] of Object.entries(state.personalIndex || {})) this.#personalByUser.set(uid, sid)
      }
    }
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
      members: normalizeMembers(ownerId, members),
      context: normalizeContext(context),
      excluded: Array.isArray(excluded) ? [...excluded] : [],
      version: 1,
      createdAt: this.#now(),
    }
    this.#spaces.set(space.id, space)
    this.#persist()
    return this.#view(space)
  }

  getSpace(spaceId, { userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId, 'view')
    return this.#view(s)
  }

  listSpaces({ userId } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    return [...this.#spaces.values()]
      .filter((s) => !s.personal && this.#memberRole(s, userId))
      .map((s) => this.#view(s))
  }

  updateSpace(spaceId, patch = {}, { userId } = {}) {
    const s = this.#require(spaceId)
    const touchesMembers = patch.members !== undefined
    this.#assertAccess(s, userId, touchesMembers ? 'manage' : 'edit')
    if (patch.name !== undefined) {
      if (!patch.name) fail('INVALID_NAME', 'name no puede quedar vacío')
      s.name = patch.name
    }
    if (patch.theme !== undefined) s.theme = patch.theme
    if (patch.inheritContext !== undefined) s.inheritContext = patch.inheritContext !== false
    if (patch.context !== undefined) s.context = normalizeContext(patch.context)
    if (patch.excluded !== undefined) s.excluded = Array.isArray(patch.excluded) ? [...patch.excluded] : []
    if (touchesMembers) s.members = normalizeMembers(s.ownerId, patch.members)
    s.version += 1
    this.#persist()
    return this.#view(s)
  }

  addMember({ spaceId, memberId, role = 'editor', userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId, 'manage')
    if (!memberId) fail('INVALID_MEMBER', 'memberId es obligatorio')
    if (memberId === s.ownerId) fail('INVALID_MEMBER', 'el propietario ya pertenece al espacio')
    if (!ROLES.includes(role) || role === 'owner') fail('INVALID_ROLE', `rol inválido: ${role}`)
    const existing = s.members.find((m) => m.userId === memberId)
    if (existing) existing.role = role
    else s.members.push({ userId: memberId, role })
    s.version += 1
    this.#persist()
    return this.#view(s)
  }

  removeMember({ spaceId, memberId, userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId, 'manage')
    if (memberId === s.ownerId) fail('INVALID_MEMBER', 'no se puede quitar al propietario')
    s.members = s.members.filter((m) => m.userId !== memberId)
    s.version += 1
    this.#persist()
    return this.#view(s)
  }

  setMemberRole({ spaceId, memberId, role, userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId, 'manage')
    if (memberId === s.ownerId) fail('INVALID_MEMBER', 'no se puede cambiar el rol del propietario')
    if (!ROLES.includes(role) || role === 'owner') fail('INVALID_ROLE', `rol inválido: ${role}`)
    const member = s.members.find((m) => m.userId === memberId)
    if (!member) fail('MEMBER_NOT_FOUND', `${memberId} no es miembro de ${spaceId}`)
    member.role = role
    s.version += 1
    this.#persist()
    return this.#view(s)
  }

  effectiveContext(spaceId, { userId } = {}) {
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId, 'view')
    const { items, versions } = this.#collect(s.id, new Set())
    const { kept, removed } = this.#applyExclusions(items, s.excluded)
    const { resolved, conflicts } = this.#merge(kept)
    return { spaceId: s.id, items: kept, resolved, conflicts, excluded: removed, versions }
  }

  resolveScope({ userId, spaceId = null } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    if (!spaceId) return this.#view(this.#ensurePersonal(userId))
    const s = this.#require(spaceId)
    this.#assertAccess(s, userId, 'view')
    return this.#view(s)
  }

  previewLink({ userId, targetSpaceId, material = [] } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    const target = this.#require(targetSpaceId)
    this.#assertAccess(target, userId, 'view')
    const audienceBefore = [userId]
    const audienceAfter = uniq(target.members.map((m) => m.userId))
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
    this.#assertAccess(s, userId, 'view')
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
        case 'spaces.addMember': return ok(this.addMember(params))
        case 'spaces.removeMember': return ok(this.removeMember(params))
        case 'spaces.setMemberRole': return ok(this.setMemberRole(params))
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

  #memberRole(space, userId) {
    if (!userId) return undefined
    if (space.ownerId === userId) return 'owner'
    const m = (space.members || []).find((x) => x.userId === userId)
    return m ? m.role : undefined
  }

  #assertAccess(space, userId, permission = 'view') {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    if (space.personal) {
      if (space.ownerId !== userId) fail('ACCESS_DENIED', 'ámbito personal de otro usuario')
      return
    }
    const role = this.#memberRole(space, userId)
    if (!role) fail('ACCESS_DENIED', `sin acceso al espacio ${space.id}`)
    if (!PERMISSIONS[permission].includes(role)) {
      fail('FORBIDDEN', `el rol ${role} no permite ${permission} en ${space.id}`)
    }
  }

  #ensurePersonal(userId) {
    const existingId = this.#personalByUser.get(userId)
    if (existingId) return this.#spaces.get(existingId)
    const s = {
      id: this._id('per'),
      name: 'Personal',
      theme: null,
      ownerId: userId,
      parentId: null,
      inheritContext: false,
      personal: true,
      members: [{ userId, role: 'owner' }],
      context: [],
      excluded: [],
      version: 1,
      createdAt: this.#now(),
    }
    this.#spaces.set(s.id, s)
    this.#personalByUser.set(userId, s.id)
    this.#persist()
    return s
  }

  #persist() {
    if (!this.#repo || typeof this.#repo.write !== 'function') return
    this.#repo.write({
      version: 1,
      spaces: [...this.#spaces.values()],
      personalIndex: Object.fromEntries(this.#personalByUser),
    })
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
      members: (s.members || []).map((m) => ({ ...m })),
      version: s.version,
      createdAt: s.createdAt,
    }
  }
}
