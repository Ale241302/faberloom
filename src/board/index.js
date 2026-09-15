import { randomUUID } from 'node:crypto'

/**
 * E6 · Mesa de trabajo y revisión.
 *
 * Reúne resultados y excepciones que requieren atención. Una **aprobación apunta
 * a la versión exacta** revisada y **no** produce efectos (no envía nada). Antes
 * de un efecto se **revalida**: si los datos cambiaron durante la espera, la
 * aprobación queda obsoleta. El contenido «preparado» solo existe con evidencia
 * real.
 */

export class BoardError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'BoardError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new BoardError(code, message)
}
const ok = (data) => ({ ok: true, data })
const err = (e) => ({ ok: false, error: { code: e.code, message: e.message } })

const STATUSES = ['in_progress', 'waiting_data', 'waiting_approval', 'approved', 'completed', 'failed', 'reopened', 'needs_review']

export class BoardService {
  #items = new Map()
  #idGen
  #now
  #repo
  #blob
  #authorize
  #onCorrection

  constructor({ idGen, now, repository, blobStore, authorize = null, onCorrection = null } = {}) {
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
    this.#repo = repository ?? null
    this.#blob = blobStore ?? null
    this.#authorize = authorize
    this.#onCorrection = onCorrection
    if (this.#repo && typeof this.#repo.read === 'function') {
      const state = this.#repo.read()
      for (const b of (state && state.board) || []) this.#items.set(b.id, b)
    }
  }

  _id(prefix) {
    return `${prefix}_${this.#idGen()}`
  }

  /** Guarda un documento adjunto en el almacén de blobs. */
  #storeDocument(doc) {
    if (!doc) return null
    if (!this.#blob) fail('NO_BLOB_STORE', 'no hay almacenamiento de contenido configurado')
    const content = Buffer.isBuffer(doc.content)
      ? doc.content
      : Buffer.from(String(doc.content ?? ''), doc.encoding === 'base64' ? 'base64' : 'utf8')
    const put = this.#blob.put(content, { mediaType: doc.mediaType ?? 'application/octet-stream' })
    return { ref: put.ref, fileName: doc.fileName ?? null, mediaType: doc.mediaType ?? 'application/octet-stream', size: put.size, sha256: put.sha256 }
  }

  /** Envía un resultado a revisión. Exige evidencia real del resultado. */
  submit({ ownerId, title, kind = 'document', result = null, evidence = null, links = [], document = null, executionId = null, spaceId = null, status = 'waiting_approval' } = {}) {
    if (!ownerId) fail('INVALID_OWNER', 'ownerId es obligatorio')
    if (!title) fail('INVALID_TITLE', 'title es obligatorio')
    if (!evidence) fail('NO_EVIDENCE', 'no se puede presentar «preparado» sin evidencia real')
    if (!STATUSES.includes(status)) fail('INVALID_STATUS', `estado inválido: ${status}`)
    const at = this.#now()
    const item = {
      id: this._id('brd'),
      ownerId,
      spaceId,
      title,
      kind,
      status,
      revision: 1,
      versions: [{ revision: 1, result, evidence, links: [...links], document: this.#storeDocument(document), at, by: ownerId }],
      reviews: [],
      effects: [],
      stale: false,
      staleReason: null,
      executionId,
      createdAt: at,
      updatedAt: at,
    }
    this.#items.set(item.id, item)
    this.#persist(item)
    return this.#view(item)
  }

  get(itemId) {
    return this.#view(this.#require(itemId))
  }

  list({ ownerId, status, spaceId, kind } = {}) {
    return [...this.#items.values()]
      .filter((i) => (ownerId === undefined || i.ownerId === ownerId) && (status === undefined || i.status === status) && (spaceId === undefined || i.spaceId === spaceId) && (kind === undefined || i.kind === kind))
      .map((i) => this.#view(i))
  }

  /** Revisa la versión exacta: aprobar o pedir corrección. Aprobar no envía nada. */
  review({ itemId, revision, decision, comment = null, result = null, evidence = null, document = null, teachingKind = null, userId } = {}) {
    const item = this.#require(itemId)
    if (!['approve', 'correction'].includes(decision)) fail('INVALID_DECISION', `decisión inválida: ${decision}`)
    if (item.status === 'completed') fail('ALREADY_COMPLETED', 'el elemento ya se completó')

    if (decision === 'approve') {
      if (revision !== item.revision) fail('STALE_REVISION', `la revisión ${revision} no es la vigente (${item.revision})`)
      if (item.stale) fail('REVALIDATION_REQUIRED', 'los datos cambiaron; revalida antes de aprobar')
      item.reviews.push({ revision, decision: 'approve', comment, at: this.#now(), by: userId ?? null })
      item.status = 'approved'
      item.updatedAt = this.#now()
      this.#persist(item)
      return this.#view(item) // sin efectos: aprobar no envía
    }

    // Corrección → nueva versión
    const nextRevision = item.revision + 1
    const base = item.versions[item.versions.length - 1]
    item.versions.push({
      revision: nextRevision,
      result: result ?? base.result,
      evidence: evidence ?? base.evidence,
      links: [...(base.links || [])],
      document: document ? this.#storeDocument(document) : base.document ?? null,
      at: this.#now(),
      by: userId ?? null,
    })
    item.revision = nextRevision
    item.stale = false
    item.staleReason = null
    item.reviews.push({ revision, decision: 'correction', comment, at: this.#now(), by: userId ?? null })
    item.status = 'in_progress'
    // Extracción automática de una enseñanza desde la corrección.
    if (this.#onCorrection) {
      try {
        const teaching = this.#onCorrection({
          ownerId: item.ownerId,
          scope: { spaceId: item.spaceId, taskType: item.kind },
          kind: teachingKind || 'preference',
          text: comment || `Corrección de «${item.title}»`,
          provenance: { source: 'correction', ref: `board:${item.id}`, itemId: item.id, revision, author: userId ?? null },
        })
        if (teaching && teaching.id) item.teachings = [...(item.teachings || []), teaching.id]
      } catch {
        /* la corrección no debe fallar si el aprendizaje no está disponible */
      }
    }
    item.updatedAt = this.#now()
    this.#persist(item)
    return this.#view(item)
  }

  /** Devuelve el documento de una versión (por defecto la vigente) como base64. */
  readDocument({ itemId, revision = null, userId } = {}) {
    const item = this.#require(itemId)
    if (userId && item.ownerId !== userId) fail('ACCESS_DENIED', 'el elemento es de otro usuario')
    const rev = revision ?? item.revision
    const version = item.versions.find((v) => v.revision === rev)
    if (!version) fail('VERSION_NOT_FOUND', `revisión ${rev} no existe`)
    if (!version.document || !version.document.ref) fail('NO_DOCUMENT', 'la versión no tiene documento adjunto')
    if (!this.#blob) fail('NO_BLOB_STORE', 'no hay almacenamiento de contenido configurado')
    const obj = this.#blob.get(version.document.ref)
    if (!obj) fail('CONTENT_NOT_FOUND', `no se encontró ${version.document.ref}`)
    return { itemId, revision: rev, ref: version.document.ref, fileName: version.document.fileName, mediaType: version.document.mediaType, size: obj.size, sha256: obj.sha256, base64: obj.buf.toString('base64') }
  }

  /** Marca que faltan datos (excepción en la Mesa). */
  requestData({ itemId, reason = null, userId } = {}) {
    const item = this.#require(itemId)
    item.status = 'waiting_data'
    item.reviews.push({ revision: item.revision, decision: 'request_data', comment: reason, at: this.#now(), by: userId ?? null })
    item.updatedAt = this.#now()
    this.#persist(item)
    return this.#view(item)
  }

  /** Los datos cambiaron durante la espera: la aprobación vigente queda obsoleta. */
  markStale({ itemId, reason = 'data_changed', userId } = {}) {
    const item = this.#require(itemId)
    item.stale = true
    item.staleReason = reason
    if (item.status === 'approved') item.status = 'waiting_approval'
    item.updatedAt = this.#now()
    this.#persist(item)
    return this.#view(item)
  }

  /** Revalida antes del efecto. Si cambió, exige nueva revisión. */
  revalidate({ itemId, changed, note = null } = {}) {
    const item = this.#require(itemId)
    if (changed) {
      item.stale = true
      item.staleReason = note || 'data_changed'
      item.status = 'waiting_approval'
    } else {
      item.stale = false
      item.staleReason = null
    }
    item.updatedAt = this.#now()
    this.#persist(item)
    return this.#view(item)
  }

  /** Registra el efecto externo de una versión aprobada (requiere autorización explícita). */
  recordEffect({ itemId, revision, ref, userId, authorizationRef } = {}) {
    const item = this.#require(itemId)
    if (item.status !== 'approved') fail('NOT_APPROVED', 'solo se registra el efecto de una versión aprobada')
    if (revision !== item.revision) fail('STALE_REVISION', `la revisión ${revision} no es la vigente (${item.revision})`)
    if (item.stale) fail('REVALIDATION_REQUIRED', 'los datos cambiaron; revalida antes del efecto')
    if (!authorizationRef) fail('NO_AUTHORIZATION', 'el efecto requiere una autorización explícita')
    // La autonomía es un módulo aparte: aprobar en la Mesa no concede permiso.
    if (this.#authorize) {
      const verdict = this.#authorize(authorizationRef, { item: this.#view(item), action: 'board.effect', context: { spaceId: item.spaceId, itemId: item.id, kind: item.kind } })
      const allowed = verdict === true || (verdict && verdict.allowed === true)
      if (!allowed) fail('NO_AUTHORIZATION', (verdict && verdict.reason) || 'la autorización no es válida o está fuera de contexto')
    }
    const effect = { revision, ref, at: this.#now(), by: userId ?? null, authorizationRef }
    item.effects.push(effect)
    item.status = 'completed'
    item.updatedAt = this.#now()
    this.#persist(item)
    return this.#view(item)
  }

  /** Reabre un elemento ya aprobado o completado (corrección posterior). */
  reopen({ itemId, reason = null, userId } = {}) {
    const item = this.#require(itemId)
    item.reviews.push({ revision: item.revision, decision: 'reopen', comment: reason, at: this.#now(), by: userId ?? null })
    item.status = 'reopened'
    item.updatedAt = this.#now()
    this.#persist(item)
    return this.#view(item)
  }

  /** Marca un fallo (excepción) conservando la evidencia. */
  fail({ itemId, reason = null } = {}) {
    const item = this.#require(itemId)
    item.status = 'failed'
    item.staleReason = reason
    item.updatedAt = this.#now()
    this.#persist(item)
    return this.#view(item)
  }

  run(operation, params = {}) {
    try {
      switch (operation) {
        case 'board.submit': return ok(this.submit(params))
        case 'board.get': return ok(this.get(params.itemId))
        case 'board.list': return ok(this.list(params))
        case 'board.review': return ok(this.review(params))
        case 'board.requestData': return ok(this.requestData(params))
        case 'board.markStale': return ok(this.markStale(params))
        case 'board.revalidate': return ok(this.revalidate(params))
        case 'board.recordEffect': return ok(this.recordEffect(params))
        case 'board.reopen': return ok(this.reopen(params))
        case 'board.fail': return ok(this.fail(params))
        case 'board.readDocument': return ok(this.readDocument(params))
        default: return { ok: false, error: { code: 'UNKNOWN_OPERATION', message: operation } }
      }
    } catch (e) {
      if (e instanceof BoardError) return err(e)
      throw e
    }
  }

  #require(id) {
    const item = this.#items.get(id)
    if (!item) fail('ITEM_NOT_FOUND', `elemento ${id} no existe`)
    return item
  }

  #persist(item) {
    if (this.#repo && typeof this.#repo.saveBoardItem === 'function') this.#repo.saveBoardItem(item)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ board: [...this.#items.values()] })
  }

  #view(item) {
    return structuredClone({
      id: item.id,
      ownerId: item.ownerId,
      spaceId: item.spaceId,
      title: item.title,
      kind: item.kind,
      status: item.status,
      revision: item.revision,
      versions: item.versions,
      reviews: item.reviews,
      effects: item.effects,
      teachings: item.teachings || [],
      stale: item.stale,
      staleReason: item.staleReason,
      executionId: item.executionId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  }
}
