import { randomUUID, createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * E8 · Respaldo de conocimiento y recuperación.
 *
 * Exporta todo el estado (espacios, agentes, rutinas, ejecuciones, efectos,
 * mesa, enseñanzas, usos, desempeño, concesiones…) con **manifiesto** (versión,
 * conteos y hashes) y, si hay clave, **cifrado** (AES-256-GCM). Se guarda en el
 * almacén externo (S3/MinIO o fs). La **restauración** es en modo detenido: no
 * reenvía efectos, pausa el trabajo en curso y **revalida permisos**.
 */

export class BackupError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'BackupError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new BackupError(code, message)
}
const ok = (data) => ({ ok: true, data })
const err = (e) => ({ ok: false, error: { code: e.code, message: e.message } })

const SECTIONS = ['spaces', 'links', 'models', 'agents', 'selections', 'agentExecutions', 'evidence', 'routines', 'runs', 'effects', 'sources', 'board', 'teachings', 'teachingUsages', 'outcomes', 'grants']
const IN_FLIGHT = ['pending', 'running', 'waiting', 'waiting_approval']

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

function encrypt(keyHex, buf) {
  const key = Buffer.from(keyHex, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(buf), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), enc])
}

function decrypt(keyHex, buf) {
  const key = Buffer.from(keyHex, 'hex')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()])
}

export class BackupService {
  #repo
  #blob
  #key
  #idGen
  #now
  #recheckGrant
  #offsite

  constructor({ repository, blobStore, key = null, idGen, now, recheckGrant = null, offsite = null } = {}) {
    this.#repo = repository ?? null
    this.#blob = blobStore ?? null
    this.#key = key || null
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
    this.#recheckGrant = recheckGrant
    // Runner opcional para copia offsite con una herramienta externa.
    this.#offsite = offsite
  }

  _id(prefix) {
    return `${prefix}_${this.#idGen()}`
  }

  /** Construye el payload (y lo cifra si hay clave). */
  #buildPayload(label) {
    const state = this.#repo.read() || {}
    const sections = {}
    for (const key of SECTIONS) sections[key] = Array.isArray(state[key]) ? state[key].length : 0
    const payload = JSON.stringify({ version: 1, createdAt: this.#now(), label, state })
    const plain = Buffer.from(payload, 'utf8')
    const encrypted = !!this.#key
    const bytes = encrypted ? encrypt(this.#key, plain) : plain
    return { bytes, sections, encrypted, plainSize: plain.length }
  }

  /** Exporta el estado completo a un blob con manifiesto y, si aplica, offsite. */
  exportBackup({ label = null } = {}) {
    if (!this.#repo) fail('NO_REPOSITORY', 'no hay repositorio configurado')
    if (!this.#blob) fail('NO_BLOB_STORE', 'no hay almacén de respaldo configurado')
    const { bytes, sections, encrypted, plainSize } = this.#buildPayload(label)
    const put = this.#blob.put(bytes, { mediaType: encrypted ? 'application/octet-stream' : 'application/json' })

    let offsiteResult = null
    if (this.#offsite) {
      const tmp = path.join(os.tmpdir(), `faberloom-backup-${randomUUID()}.bak`)
      try {
        fs.writeFileSync(tmp, bytes)
        offsiteResult = this.#offsite({ file: tmp, sha256: put.sha256, size: put.size, label }) || { ok: true }
      } catch (e) {
        offsiteResult = { ok: false, error: (e && e.message) || String(e) }
      } finally {
        try {
          fs.unlinkSync(tmp)
        } catch {
          /* noop */
        }
      }
    }

    const manifest = { version: 1, createdAt: this.#now(), label, encrypted, sections, sha256: put.sha256, plainSize, offsite: offsiteResult }
    const record = { id: this._id('bkp'), ref: put.ref, size: put.size, sha256: put.sha256, manifest, offsite: offsiteResult, createdAt: this.#now() }
    this.#persist(record)
    return this.#view(record)
  }

  /** Escribe el respaldo a un archivo (para que lo suba una herramienta externa). */
  exportToFile({ file, label = null } = {}) {
    if (!file) fail('INVALID_FILE', 'file es obligatorio')
    const { bytes, sections, encrypted, plainSize } = this.#buildPayload(label)
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true })
    fs.writeFileSync(file, bytes)
    return { file, size: bytes.length, sha256: sha256(bytes), encrypted, sections, plainSize }
  }

  listBackups() {
    const state = this.#repo && this.#repo.read()
    return [...((state && state.backups) || [])].map((b) => this.#view(b))
  }

  /** Verifica el respaldo más reciente (para una tarea programada). */
  verifyLatest() {
    const list = this.listBackups()
    if (!list.length) return { ok: false, reason: 'NO_BACKUPS' }
    const last = list[list.length - 1]
    return { backupId: last.id, createdAt: last.createdAt, ...this.verifyBackup({ backupId: last.id }) }
  }

  #readPayload(record) {
    const obj = this.#blob.get(record.ref)
    if (!obj) fail('BACKUP_NOT_FOUND', `no se encontró el respaldo ${record.ref}`)
    let bytes = obj.buf
    if (record.manifest && record.manifest.encrypted) {
      if (!this.#key) fail('NO_KEY', 'el respaldo está cifrado y no hay clave')
      try {
        bytes = decrypt(this.#key, bytes)
      } catch {
        fail('DECRYPT_FAILED', 'no se pudo descifrar el respaldo (clave incorrecta)')
      }
    }
    let parsed
    try {
      parsed = JSON.parse(bytes.toString('utf8'))
    } catch {
      fail('INVALID_BACKUP', 'el respaldo no es JSON válido')
    }
    return parsed
  }

  #requireBackup(backupId) {
    const record = [...((this.#repo.read() || {}).backups || [])].find((b) => b.id === backupId)
    if (!record) fail('BACKUP_RECORD_NOT_FOUND', `no hay registro de respaldo ${backupId}`)
    return record
  }

  /** Verifica integridad: hash del blob y conteos del manifiesto. */
  verifyBackup({ backupId, ref = null } = {}) {
    const record = backupId ? this.#requireBackup(backupId) : { id: null, ref, manifest: null }
    if (!record.ref) fail('INVALID_BACKUP', 'falta ref o backupId')
    const obj = this.#blob.get(record.ref)
    if (!obj) return { ok: false, reason: 'BACKUP_NOT_FOUND', ref: record.ref }
    const hash = sha256(obj.buf)
    const hashOk = !record.sha256 || hash === record.sha256
    let parsed = null
    try {
      parsed = this.#readPayload(record)
    } catch {
      /* cifrado/clave */
    }
    const sections = {}
    if (parsed && parsed.state) for (const key of SECTIONS) sections[key] = Array.isArray(parsed.state[key]) ? parsed.state[key].length : 0
    const manifestOk = !record.manifest ? null : Object.entries(record.manifest.sections || {}).every(([k, v]) => (sections[k] ?? 0) === v)
    return { ok: hashOk && (manifestOk !== false), ref: record.ref, hashOk, manifestOk, sections }
  }

  /** Vista previa: qué se recuperaría y qué cambios implica, sin aplicar. */
  previewRestore({ backupId } = {}) {
    const record = this.#requireBackup(backupId)
    const parsed = this.#readPayload(record)
    const state = parsed.state || {}
    const current = this.#repo.read() || {}
    const counts = {}
    for (const key of SECTIONS) counts[key] = Array.isArray(state[key]) ? state[key].length : 0
    const inFlight = (state.runs || []).filter((r) => IN_FLIGHT.includes(r.status)).length
    const activeGrants = (state.grants || []).filter((g) => g.status === 'active').length
    return {
      backupId,
      createdAt: record.createdAt,
      encrypted: !!record.manifest?.encrypted,
      counts,
      currentCounts: Object.fromEntries(SECTIONS.map((k) => [k, Array.isArray(current[k]) ? current[k].length : 0])),
      willPauseExecutions: inFlight,
      willRecheckGrants: activeGrants,
    }
  }

  /**
   * Restaura en modo detenido: escribe el estado, pausa el trabajo en curso
   * (sin reanudar) y revalida las concesiones. Conserva el libro de efectos.
   */
  restoreBackup({ backupId, confirm = false } = {}) {
    if (!confirm) fail('CONFIRM_REQUIRED', 'la restauración requiere confirmación')
    const record = this.#requireBackup(backupId)
    const parsed = this.#readPayload(record)
    const state = { ...(parsed.state || {}) }

    // Modo detenido: el trabajo en curso pasa a revisión; no se reanuda solo.
    const pausedExecutions = []
    state.runs = (state.runs || []).map((r) => {
      if (!IN_FLIGHT.includes(r.status)) return r
      pausedExecutions.push(r.id)
      return { ...r, status: 'needs_review', error: 'restored_in_stopped_mode', updatedAt: this.#now() }
    })

    // Revalidar concesiones: no reactivar revocadas ni conservar sin permiso.
    let grantsRevoked = 0
    let grantsKept = 0
    state.grants = (state.grants || []).map((g) => {
      if (g.status !== 'active') return g
      const verdict = this.#recheckGrant ? this.#recheckGrant(g) : { allowed: true }
      if (verdict && verdict.allowed === false) {
        grantsRevoked += 1
        return { ...g, status: 'revoked', revokedReason: 'permission_recheck', updatedAt: this.#now() }
      }
      grantsKept += 1
      return g
    })

    // Limpiar bloqueos de despachador (evita lease viejo).
    state.locks = []

    for (const key of SECTIONS) {
      if (state[key] !== undefined) this.#repo.write({ [key]: state[key] })
    }
    return {
      restored: Object.fromEntries(SECTIONS.map((k) => [k, Array.isArray(state[k]) ? state[k].length : 0])),
      pausedExecutions,
      grantsRevoked,
      grantsKept,
      mode: 'stopped',
    }
  }

  run(operation, params = {}) {
    try {
      switch (operation) {
        case 'backup.export': return ok(this.exportBackup(params))
        case 'backup.exportToFile': return ok(this.exportToFile(params))
        case 'backup.list': return ok(this.listBackups())
        case 'backup.verify': return ok(this.verifyBackup(params))
        case 'backup.verifyLatest': return ok(this.verifyLatest())
        case 'backup.previewRestore': return ok(this.previewRestore(params))
        case 'backup.restore': return ok(this.restoreBackup(params))
        default: return { ok: false, error: { code: 'UNKNOWN_OPERATION', message: operation } }
      }
    } catch (e) {
      if (e instanceof BackupError) return err(e)
      throw e
    }
  }

  #persist(record) {
    if (this.#repo && typeof this.#repo.saveBackup === 'function') this.#repo.saveBackup(record)
    else if (this.#repo && typeof this.#repo.write === 'function') {
      const current = (this.#repo.read() || {}).backups || []
      this.#repo.write({ backups: [...current, record] })
    }
  }

  #view(record) {
    return structuredClone(record)
  }
}
