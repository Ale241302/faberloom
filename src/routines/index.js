import { randomUUID, createHash } from 'node:crypto'

/**
 * E5 · Rutinas y ejecución persistente.
 *
 * Rutinas versionadas (borrador → activa → pausada) con disparadores, pasos,
 * dependencias, permisos y política de fallos; y un motor de ejecución que
 * persiste antes de cada efecto, deduplica por clave (idempotencia), soporta
 * esperas con revalidación, reconcilia timeouts tras escritura y se recupera
 * fuera de la sesión (despachador `tick`).
 */

export class RoutinesError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'RoutinesError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new RoutinesError(code, message)
}
const uniq = (a) => [...new Set(a)]
const ok = (data) => ({ ok: true, data })
const err = (e) => ({ ok: false, error: { code: e.code, message: e.message } })
const RUN_TERMINAL = ['completed', 'failed', 'cancelled']

function normalizeSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map((s, i) => {
    if (!s || typeof s !== 'object') fail('INVALID_STEP', `steps[${i}] no es un objeto`)
    return {
      id: s.id || `stp_${i + 1}`,
      type: s.type || null,
      instruction: s.instruction || null,
      agentId: s.agentId || null,
      toolId: s.toolId || null,
      dependsOn: Array.isArray(s.dependsOn) ? [...s.dependsOn] : [],
      isEffect: !!s.isEffect,
      reconcileType: s.reconcileType || null,
      revalidateType: s.revalidateType || null,
      onMissingData: s.onMissingData || 'ask',
    }
  })
}

function normalizeTrigger(t) {
  if (typeof t === 'string') return { type: t }
  if (!t || typeof t !== 'object') fail('INVALID_TRIGGER', 'disparador inválido')
  const type = t.type || 'manual'
  return {
    type,
    source: t.source || (type === 'email' ? 'email' : null),
    match: t.match || null,
    at: t.at || null,
    intervalMinutes: t.intervalMinutes || null,
  }
}

function normalizeEvent(event, receivedAt) {
  const ev = typeof event === 'string' ? { type: event } : { ...(event || {}) }
  return {
    ...ev,
    type: ev.type || 'event',
    source: ev.source || (ev.from || ev.subject ? 'email' : 'event'),
    key: ev.key ?? ev.id ?? null,
    receivedAt: ev.receivedAt || receivedAt,
  }
}

const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex')

function detectCycle(steps) {
  const byId = new Map(steps.map((s) => [s.id, s]))
  const state = new Map() // 0=por visitar, 1=en pila, 2=listo
  const path = []
  let cycle = null
  const visit = (id) => {
    if (cycle) return
    const s = byId.get(id)
    if (!s) return
    const st = state.get(id) || 0
    if (st === 1) {
      cycle = [...path.slice(path.indexOf(id)), id].join(' -> ')
      return
    }
    if (st === 2) return
    state.set(id, 1)
    path.push(id)
    for (const d of s.dependsOn) visit(d)
    path.pop()
    state.set(id, 2)
  }
  for (const s of steps) visit(s.id)
  return cycle
}

export class RoutinesService {
  #routines = new Map()
  #runs = new Map()
  #effects = new Map() // key -> { key, executionId, stepId, ref, cancelled, createdAt }
  #sources = new Map() // id -> { id, userId, type, config, tokenHash, createdAt }
  #locks = new Map() // name -> { name, owner, expiresAt }
  #handlers = new Map()
  #idGen
  #now
  #repo
  #availableTools
  #availableAgents

  constructor({ idGen, now, repository, availableTools = () => [], availableAgents = () => [] } = {}) {
    this.#idGen = idGen ?? (() => randomUUID())
    this.#now = now ?? (() => new Date().toISOString())
    this.#repo = repository ?? null
    this.#availableTools = availableTools
    this.#availableAgents = availableAgents
    if (this.#repo && typeof this.#repo.read === 'function') {
      const state = this.#repo.read()
      if (state) {
        for (const r of state.routines || []) this.#routines.set(r.id, r)
        for (const run of state.runs || []) this.#runs.set(run.id, run)
        for (const ef of state.effects || []) this.#effects.set(ef.key, ef)
        for (const s of state.sources || []) this.#sources.set(s.id, s)
        for (const l of state.locks || []) this.#locks.set(l.name, l)
      }
    }
  }

  _id(prefix) {
    return `${prefix}_${this.#idGen()}`
  }

  registerStepHandler(type, fn) {
    if (!type || typeof fn !== 'function') fail('INVALID_HANDLER', 'type y fn son obligatorios')
    this.#handlers.set(type, fn)
    return { type }
  }

  // ── Rutinas ────────────────────────────────────────────────────────
  createRoutine(params = {}) {
    const { name, intent = null, ownerId, spaceId = null, triggers = [], inputs = [], steps = [], expectedResult = null, permissions = [], failurePolicy = null } = params
    if (!name) fail('INVALID_NAME', 'name es obligatorio')
    if (!ownerId) fail('INVALID_OWNER', 'ownerId es obligatorio')
    const routine = {
      id: this._id('rtn'),
      name,
      intent,
      ownerId,
      spaceId,
      version: 1,
      status: 'draft',
      triggers: (triggers || []).map(normalizeTrigger),
      triggerState: {},
      inputs: [...inputs],
      steps: normalizeSteps(steps),
      expectedResult,
      permissions: [...permissions],
      failurePolicy: failurePolicy || { onStepFailure: 'stop' },
      history: [{ version: 1, at: this.#now(), changes: ['create'] }],
      createdAt: this.#now(),
      updatedAt: this.#now(),
    }
    this.#routines.set(routine.id, routine)
    this.#persistRoutine(routine)
    return this.#routineView(routine)
  }

  getRoutine(id) {
    return this.#routineView(this.#requireRoutine(id))
  }

  listRoutines({ spaceId, ownerId, status } = {}) {
    return [...this.#routines.values()]
      .filter((r) => (spaceId === undefined || r.spaceId === spaceId) && (ownerId === undefined || r.ownerId === ownerId) && (status === undefined || r.status === status))
      .map((r) => this.#routineView(r))
  }

  updateRoutine(id, patch = {}) {
    const r = this.#requireRoutine(id)
    const changes = []
    for (const key of ['name', 'intent', 'spaceId', 'expectedResult']) {
      if (patch[key] !== undefined) {
        r[key] = patch[key]
        changes.push(key)
      }
    }
    if (patch.triggers !== undefined) {
      r.triggers = (patch.triggers || []).map(normalizeTrigger)
      changes.push('triggers')
    }
    if (patch.inputs !== undefined) {
      r.inputs = [...patch.inputs]
      changes.push('inputs')
    }
    if (patch.steps !== undefined) {
      r.steps = normalizeSteps(patch.steps)
      changes.push('steps')
    }
    if (patch.permissions !== undefined) {
      r.permissions = [...patch.permissions]
      changes.push('permissions')
    }
    if (patch.failurePolicy !== undefined) {
      r.failurePolicy = patch.failurePolicy
      changes.push('failurePolicy')
    }
    if (!changes.length) return this.#routineView(r)
    r.version += 1
    r.updatedAt = this.#now()
    r.history.push({ version: r.version, at: r.updatedAt, changes })
    this.#persistRoutine(r)
    return this.#routineView(r)
  }

  validateRoutine(id, { checkHandlers = true } = {}) {
    const r = this.#requireRoutine(id)
    const errors = []
    const missing = []
    const ids = new Set(r.steps.map((s) => s.id))
    for (const s of r.steps) {
      for (const d of s.dependsOn) if (!ids.has(d)) errors.push(`paso ${s.id} depende de ${d}, que no existe`)
      if (checkHandlers && s.type && !this.#handlers.has(s.type)) missing.push(`handler:${s.type}`)
      if (s.toolId && !this.#availableTools().includes(s.toolId)) missing.push(`tool:${s.toolId}`)
      if (s.agentId && !this.#availableAgents().includes(s.agentId)) missing.push(`agent:${s.agentId}`)
    }
    const cycle = detectCycle(r.steps)
    if (cycle) errors.push(`dependencias cíclicas: ${cycle}`)
    return { routineId: r.id, version: r.version, ok: errors.length === 0 && missing.length === 0, errors, missing: uniq(missing) }
  }

  activateRoutine(id) {
    const r = this.#requireRoutine(id)
    const v = this.validateRoutine(id)
    if (!v.ok) fail('ROUTINE_NOT_EXECUTABLE', JSON.stringify(v))
    r.status = 'active'
    r.updatedAt = this.#now()
    r.history.push({ version: r.version, at: r.updatedAt, changes: ['activate'] })
    this.#persistRoutine(r)
    return this.#routineView(r)
  }

  pauseRoutine(id) {
    const r = this.#requireRoutine(id)
    r.status = 'paused'
    r.updatedAt = this.#now()
    r.history.push({ version: r.version, at: r.updatedAt, changes: ['pause'] })
    this.#persistRoutine(r)
    return this.#routineView(r)
  }

  // ── Ejecuciones ────────────────────────────────────────────────────
  startExecution({ routineId, trigger = null, context = {}, idempotencyKey = null, sources = [] } = {}) {
    const routine = this.#requireRoutine(routineId)
    if (routine.status !== 'active') fail('ROUTINE_NOT_ACTIVE', `la rutina ${routineId} no está activa`)
    const v = this.validateRoutine(routineId, { checkHandlers: false })
    if (!v.ok) fail('MISSING_CAPABILITY', JSON.stringify(v))

    if (idempotencyKey) {
      const existing = [...this.#runs.values()].find((run) => run.idempotencyKey === idempotencyKey)
      if (existing) {
        for (const src of sources) existing.sources.push({ ...src, at: this.#now() })
        existing.updatedAt = this.#now()
        this.#persistRun(existing)
        return { execution: this.#runView(existing), deduped: true }
      }
    }

    const run = {
      id: this._id('run'),
      routineId,
      routineVersion: routine.version,
      status: 'pending',
      idempotencyKey,
      trigger,
      context,
      sources: sources.map((s) => ({ ...s, at: this.#now() })),
      steps: routine.steps.map((s) => ({ stepId: s.id, status: 'pending', attempts: 0, output: null, error: null, ref: null, startedAt: null, finishedAt: null })),
      waitState: null,
      error: null,
      createdAt: this.#now(),
      updatedAt: this.#now(),
      finishedAt: null,
    }
    this.#runs.set(run.id, run)
    this.#persistRun(run)
    return { execution: this.#runView(run), deduped: false }
  }

  getExecution(id) {
    return this.#runView(this.#requireRun(id))
  }

  listExecutions({ status, routineId } = {}) {
    return [...this.#runs.values()]
      .filter((r) => (status === undefined || r.status === status) && (routineId === undefined || r.routineId === routineId))
      .map((r) => this.#runView(r))
  }

  listEffects({ executionId } = {}) {
    return [...this.#effects.values()].filter((e) => !executionId || e.executionId === executionId).map((e) => ({ ...e }))
  }

  advanceExecution(id) {
    const ex = this.#requireRun(id)
    if (RUN_TERMINAL.includes(ex.status)) return this.#runView(ex)
    const routine = this.#routines.get(ex.routineId)
    if (!routine) return this.#terminal(ex, 'failed', 'ROUTINE_NOT_FOUND')
    ex.status = 'running'
    ex.updatedAt = this.#now()
    this.#persistRun(ex)
    return this.#advanceFrom(ex, routine, 0)
  }

  resumeExecution(id, { event = null } = {}) {
    const ex = this.#requireRun(id)
    if (ex.status !== 'waiting' || !ex.waitState) fail('NOT_WAITING', `la ejecución ${id} no está esperando`)
    if (event && !matches(ex.waitState, event)) fail('EVENT_MISMATCH', `el evento no coincide con la espera (${ex.waitState.key})`)
    const routine = this.#routines.get(ex.routineId)
    const index = routine.steps.findIndex((s) => s.id === ex.waitState.stepId)
    ex.status = 'running'
    ex.pendingEvent = event || null
    ex.updatedAt = this.#now()
    this.#persistRun(ex)
    return this.#advanceFrom(ex, routine, index)
  }

  /** Despachador persistente: reanuda esperas por evento/tiempo y lanza disparos programados. */
  tick({ now = null, events = [] } = {}) {
    const at = now || this.#now()
    const resumed = []
    for (const ex of [...this.#runs.values()]) {
      if (ex.status !== 'waiting' || !ex.waitState) continue
      const event = events.find((ev) => matches(ex.waitState, ev))
      if (event) {
        resumed.push(this.resumeExecution(ex.id, { event }))
        continue
      }
      if (ex.waitState.timeoutAt && new Date(ex.waitState.timeoutAt).getTime() <= new Date(at).getTime()) {
        resumed.push(this.#failWait(ex, 'WAIT_TIMEOUT'))
      }
    }
    const started = this.#fireScheduled(at)
    const advanced = []
    for (const ex of [...this.#runs.values()]) {
      if (ex.status !== 'pending') continue
      try {
        advanced.push(this.advanceExecution(ex.id))
      } catch {
        /* sin handler en este proceso: se dejará para el anfitrión */
      }
    }
    return { now: at, resumed, started, advanced }
  }

  /** Todas las fuentes (uso del host/puente, no expuesto al usuario final). */
  listAllSources() {
    return [...this.#sources.values()].map((s) => this.#sourceView(s))
  }

  /** Entrada real de eventos (correo/servicio): reanuda esperas y dispara rutinas. */
  ingestEvent(event = {}, { userId = null } = {}) {
    const ev = normalizeEvent(event, this.#now())
    const resumed = []
    for (const ex of [...this.#runs.values()]) {
      if (ex.status !== 'waiting' || !ex.waitState) continue
      if (userId && (this.#routines.get(ex.routineId) || {}).ownerId !== userId) continue
      if (matches(ex.waitState, ev)) resumed.push(this.resumeExecution(ex.id, { event: ev }))
    }
    const started = []
    for (const r of this.#routines.values()) {
      if (r.status !== 'active' || !this.#triggersMatch(r, ev)) continue
      if (userId && r.ownerId !== userId) continue
      try {
        started.push(
          this.startExecution({
            routineId: r.id,
            trigger: ev,
            idempotencyKey: ev.id ? `${r.id}:${ev.id}` : null,
            sources: [{ channel: ev.source || ev.type, ref: ev.id || null }],
            context: ev.data || {},
          }),
        )
      } catch {
        /* rutina no ejecutable con este evento: se ignora, no rompe el despacho */
      }
    }
    return { event: ev, resumed, started }
  }

  // ── Fuentes por usuario (correo/webhook) ───────────────────────────
  registerSource({ userId, type = 'email', config = {}, token = null } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    if (!['email', 'webhook'].includes(type)) fail('INVALID_SOURCE', `tipo inválido: ${type}`)
    const plain = token || `fb_${randomUUID().replace(/-/g, '')}`
    const source = { id: this._id('src'), userId, type, config, tokenHash: hashToken(plain), createdAt: this.#now() }
    this.#sources.set(source.id, source)
    this.#persistSource(source)
    return { ...this.#sourceView(source), token: plain } // el token solo se devuelve al crear
  }

  listSources({ userId } = {}) {
    if (!userId) fail('INVALID_USER', 'userId es obligatorio')
    return [...this.#sources.values()].filter((s) => s.userId === userId).map((s) => this.#sourceView(s))
  }

  removeSource({ sourceId, userId } = {}) {
    const s = this.#sources.get(sourceId)
    if (!s) fail('SOURCE_NOT_FOUND', `fuente ${sourceId} no existe`)
    if (userId && s.userId !== userId) fail('ACCESS_DENIED', 'la fuente es de otro usuario')
    this.#sources.delete(sourceId)
    this.#persistDeleteSource(sourceId)
    return this.#sourceView(s)
  }

  resolveSourceByToken(token) {
    if (!token) return null
    const h = hashToken(token)
    return [...this.#sources.values()].find((s) => s.tokenHash === h) || null
  }

  // ── Bloqueo de despachador (concurrencia) ──────────────────────────
  acquireLock({ name = 'dispatcher', owner, ttlMs = 60000 } = {}) {
    const nowMs = Date.now()
    const expiresAt = new Date(nowMs + ttlMs).toISOString()
    const nowIso = new Date(nowMs).toISOString()
    // Atómico en la BD cuando el repositorio lo soporta.
    if (this.#repo && typeof this.#repo.tryAcquireLock === 'function') {
      const acquired = this.#repo.tryAcquireLock(name, owner, nowIso, expiresAt)
      if (!acquired) {
        const st = this.#repo.read()
        const cur = ((st && st.locks) || []).find((l) => l.name === name)
        return { acquired: false, owner: cur ? cur.owner : undefined, expiresAt: cur ? cur.expiresAt : undefined }
      }
      this.#locks.set(name, { name, owner, expiresAt })
      return { acquired: true, name, owner, expiresAt }
    }
    const current = this.#locks.get(name)
    if (current && current.owner !== owner && current.expiresAt && new Date(current.expiresAt).getTime() > nowMs) {
      return { acquired: false, owner: current.owner, expiresAt: current.expiresAt }
    }
    const lock = { name, owner, expiresAt }
    this.#locks.set(name, lock)
    this.#persistLock(lock)
    return { acquired: true, ...lock }
  }

  releaseLock({ name = 'dispatcher', owner } = {}) {
    if (this.#repo && typeof this.#repo.releaseLock === 'function') {
      const released = this.#repo.releaseLock(name, owner)
      this.#locks.delete(name)
      return { released }
    }
    const current = this.#locks.get(name)
    if (!current || current.owner !== owner) return { released: false }
    this.#locks.delete(name)
    this.#persistLock({ name, owner: null, expiresAt: null })
    return { released: true }
  }

  /** Despacha bajo bloqueo: solo el titular ejecuta el tick (evita doble proceso). */
  dispatchOnce({ name = 'dispatcher', owner, ttlMs = 60000, now = null, events = [] } = {}) {
    if (!owner) fail('INVALID_OWNER', 'owner es obligatorio')
    const lock = this.acquireLock({ name, owner, ttlMs })
    if (!lock.acquired) return { acquired: false, owner: lock.owner, dispatched: false }
    try {
      return { acquired: true, dispatched: true, result: this.tick({ now, events }) }
    } finally {
      this.releaseLock({ name, owner })
    }
  }

  /** Vista previa de migración de una ejecución a la versión vigente de su rutina. */
  previewMigration({ executionId, rename = {} } = {}) {
    return this.#migrationReport(executionId, rename)
  }

  /** Migra explícitamente una ejecución en curso a otra versión (con confirmación). */
  migrateExecution({ executionId, confirm = true, rename = {} } = {}) {
    const ex = this.#requireRun(executionId)
    if (RUN_TERMINAL.includes(ex.status)) fail('MIGRATION_NOT_ALLOWED', 'la ejecución ya terminó')
    const routine = this.#requireRoutine(ex.routineId)
    if (routine.version === ex.routineVersion) {
      return { execution: this.#runView(ex), migrated: false, report: { ok: true, sameVersion: true, fromVersion: ex.routineVersion, toVersion: routine.version } }
    }
    const report = this.#migrationReport(executionId, rename)
    if (!report.ok) fail('MIGRATION_INCOMPATIBLE', JSON.stringify(report))
    if (!confirm) return { execution: this.#runView(ex), migrated: false, report }

    const fromVersion = ex.routineVersion
    ex.routineVersion = routine.version
    ex.steps = ex.steps.map((st) => ({ ...st, stepId: rename[st.stepId] || st.stepId }))
    for (const s of routine.steps) {
      if (!ex.steps.some((x) => x.stepId === s.id)) {
        ex.steps.push({ stepId: s.id, status: 'pending', attempts: 0, output: null, error: null, ref: null, startedAt: null, finishedAt: null })
      }
    }
    ex.migrations = [...(ex.migrations || []), { from: fromVersion, to: routine.version, rename, at: this.#now() }]
    ex.updatedAt = this.#now()
    this.#persistRun(ex)
    return { execution: this.#runView(ex), migrated: true, report }
  }

  #migrationReport(executionId, rename = {}) {
    const ex = this.#requireRun(executionId)
    const routine = this.#requireRoutine(ex.routineId)
    const newIds = new Set(routine.steps.map((s) => s.id))
    const pending = ex.steps.filter((s) => s.status !== 'done').map((s) => s.stepId)
    const unmapped = pending.filter((id) => !newIds.has(rename[id] || id))
    return { ok: unmapped.length === 0, fromVersion: ex.routineVersion, toVersion: routine.version, pendingSteps: pending, unmappedSteps: unmapped }
  }

  #fireScheduled(at) {
    const started = []
    const atMs = new Date(at).getTime()
    for (const r of this.#routines.values()) {
      if (r.status !== 'active') continue
      r.triggerState = r.triggerState || {}
      r.triggers.forEach((t, i) => {
        try {
          if (t.type === 'date' && t.at && atMs >= new Date(t.at).getTime() && r.triggerState[i] !== t.at) {
            started.push(this.startExecution({ routineId: r.id, trigger: { type: 'date', at: t.at }, idempotencyKey: `${r.id}:date:${t.at}`, sources: [{ channel: 'schedule', ref: t.at }] }))
            r.triggerState[i] = t.at
            this.#persistRoutine(r)
          } else if (t.type === 'recurrence' && t.intervalMinutes) {
            const last = r.triggerState[i] ? new Date(r.triggerState[i]).getTime() : 0
            if (atMs - last >= t.intervalMinutes * 60000) {
              const bucket = Math.floor(atMs / (t.intervalMinutes * 60000))
              started.push(this.startExecution({ routineId: r.id, trigger: { type: 'recurrence', intervalMinutes: t.intervalMinutes }, idempotencyKey: `${r.id}:rec:${bucket}`, sources: [{ channel: 'schedule' }] }))
              r.triggerState[i] = at
              this.#persistRoutine(r)
            }
          }
        } catch {
          /* rutina no ejecutable: se ignora */
        }
      })
    }
    return started
  }

  #triggersMatch(routine, ev) {
    return (routine.triggers || []).some((t) => {
      if (t.type !== 'event' && t.type !== 'email') return false
      if (t.type === 'email' && ev.source !== 'email') return false
      if (t.source && t.source !== ev.source) return false
      return this.#matchFields(t.match, ev)
    })
  }

  #matchFields(match, ev) {
    if (!match) return true
    for (const [key, expected] of Object.entries(match)) {
      const actual = key.includes('.') ? key.split('.').reduce((o, p) => (o == null ? undefined : o[p]), ev) : ev[key]
      if (expected && typeof expected === 'object' && expected.regex) {
        if (!new RegExp(expected.regex, 'i').test(String(actual ?? ''))) return false
      } else if (String(actual ?? '') !== String(expected)) {
        return false
      }
    }
    return true
  }

  run(operation, params = {}) {
    let result
    try {
      result = this.#dispatch(operation, params)
    } catch (e) {
      if (e instanceof RoutinesError) return err(e)
      throw e
    }
    if (result && typeof result.then === 'function') {
      return result.then(
        (data) => ok(data),
        (e) => {
          if (e instanceof RoutinesError) return err(e)
          throw e
        },
      )
    }
    return ok(result)
  }

  #dispatch(operation, params) {
    switch (operation) {
      case 'routines.create': return this.createRoutine(params)
      case 'routines.get': return this.getRoutine(params.routineId)
      case 'routines.list': return this.listRoutines(params)
      case 'routines.update': return this.updateRoutine(params.routineId, params.patch || {})
      case 'routines.validate': return this.validateRoutine(params.routineId)
      case 'routines.activate': return this.activateRoutine(params.routineId)
      case 'routines.pause': return this.pauseRoutine(params.routineId)
      case 'executions.start': return this.startExecution(params)
      case 'executions.get': return this.getExecution(params.executionId)
      case 'executions.list': return this.listExecutions(params)
      case 'executions.advance': return this.advanceExecution(params.executionId)
      case 'executions.resume': return this.resumeExecution(params.executionId, { event: params.event })
      case 'executions.tick': return this.tick(params)
      case 'executions.migrate': return this.migrateExecution(params)
      case 'executions.previewMigration': return this.previewMigration(params)
      case 'events.ingest': return this.ingestEvent(params.event || params, { userId: params.userId || null })
      case 'sources.register': return this.registerSource(params)
      case 'sources.list': return this.listSources(params)
      case 'sources.remove': return this.removeSource(params)
      case 'dispatcher.dispatch': return this.dispatchOnce(params)
      case 'executions.effects': return this.listEffects(params)
      case 'stepHandlers.register': return this.registerStepHandler(params.type, params.handler)
      default: return fail('UNKNOWN_OPERATION', operation)
    }
  }

  // ── Motor ──────────────────────────────────────────────────────────
  #advanceFrom(ex, routine, i) {
    if (i >= routine.steps.length) return this.#terminal(ex, 'completed', null)
    const step = routine.steps[i]
    const st = ex.steps.find((s) => s.stepId === step.id)

    if (st.status === 'done') return this.#advanceFrom(ex, routine, i + 1)
    if (step.dependsOn.some((d) => (ex.steps.find((s) => s.stepId === d) || {}).status !== 'done')) {
      return this.#finishStep(ex, routine, i, { ok: false, error: 'DEPENDENCY_NOT_MET' })
    }

    if (ex.waitState && ex.waitState.stepId === step.id) {
      if (step.revalidateType && this.#handlers.has(step.revalidateType)) {
        const snap = this.#invoke(step.revalidateType, { step, ex })
        if (snap && typeof snap.then === 'function') {
          return snap.then((s) => {
            if (!sameValue(s, ex.waitState.snapshot)) return this.#finishStep(ex, routine, i, { ok: false, error: 'REVALIDATION_CHANGED' })
            ex.waitState = null
            return this.#executeStep(ex, routine, i)
          })
        }
        if (!sameValue(snap, ex.waitState.snapshot)) return this.#finishStep(ex, routine, i, { ok: false, error: 'REVALIDATION_CHANGED' })
      }
      ex.waitState = null
    }

    if (step.isEffect && st.status === 'running') {
      const rec = this.#reconcile(step, ex)
      if (rec && typeof rec.then === 'function') return rec.then((r) => this.#afterReconcile(ex, routine, i, r))
      return this.#afterReconcile(ex, routine, i, rec)
    }

    return this.#executeStep(ex, routine, i)
  }

  #executeStep(ex, routine, i) {
    const step = routine.steps[i]
    const st = ex.steps.find((s) => s.stepId === step.id)
    st.status = 'running'
    st.attempts += 1
    st.startedAt = this.#now()
    ex.updatedAt = this.#now()
    this.#persistRun(ex) // persistir antes del efecto

    const effectKey = `${ex.id}:${step.id}`
    if (step.isEffect && this.#effects.has(effectKey)) {
      const ef = this.#effects.get(effectKey)
      st.status = 'done'
      st.ref = ef.ref
      st.finishedAt = this.#now()
      this.#persistRun(ex)
      return this.#advanceFrom(ex, routine, i + 1)
    }

    let result
    try {
      result = this.#invoke(step.type, { step, ex, effectKey, event: ex.pendingEvent || null })
    } catch (e) {
      return this.#handleStepError(ex, routine, i, e)
    }
    if (result && typeof result.then === 'function') {
      return result.then(
        (r) => this.#applyStepResult(ex, routine, i, r),
        (e) => this.#handleStepError(ex, routine, i, e),
      )
    }
    return this.#applyStepResult(ex, routine, i, result)
  }

  #applyStepResult(ex, routine, i, result) {
    const step = routine.steps[i]
    const st = ex.steps.find((s) => s.stepId === step.id)

    if (result && result.waitFor) {
      const snapshot = step.revalidateType && this.#handlers.has(step.revalidateType) ? this.#invoke(step.revalidateType, { step, ex }) : null
      ex.waitState = { stepId: step.id, type: result.waitFor.type, key: result.waitFor.key || null, timeoutAt: result.waitFor.timeoutAt || null, snapshot }
      ex.pendingEvent = null
      ex.status = 'waiting'
      st.status = 'waiting'
      ex.updatedAt = this.#now()
      this.#persistRun(ex)
      return this.#runView(ex)
    }

    if (result && result.effect) {
      const key = result.effect.key || `${ex.id}:${step.id}`
      const ef = this.#recordEffect(key, result.effect.ref ?? null, ex, step)
      st.ref = ef.ref
      if (result.effect.cancelledRef) this.#cancelEffect(result.effect.cancelledRef)
    }

    st.status = 'done'
    st.output = result && Object.prototype.hasOwnProperty.call(result, 'output') ? result.output : (result ?? null)
    st.finishedAt = this.#now()
    ex.updatedAt = this.#now()
    this.#persistRun(ex)
    return this.#advanceFrom(ex, routine, i + 1)
  }

  #handleStepError(ex, routine, i, e) {
    const step = routine.steps[i]
    if (e && e.timeoutAfterWrite) {
      const rec = this.#reconcile(step, ex)
      if (rec && typeof rec.then === 'function') return rec.then((r) => this.#afterReconcile(ex, routine, i, r))
      return this.#afterReconcile(ex, routine, i, rec)
    }
    return this.#finishStep(ex, routine, i, { ok: false, error: (e && e.message) || String(e) })
  }

  #afterReconcile(ex, routine, i, rec) {
    const step = routine.steps[i]
    const st = ex.steps.find((s) => s.stepId === step.id)
    if (rec && rec.found) {
      const ef = this.#recordEffect(`${ex.id}:${step.id}`, rec.ref ?? null, ex, step)
      st.status = 'done'
      st.ref = ef.ref
      st.output = rec.output ?? st.output
      st.finishedAt = this.#now()
      this.#persistRun(ex)
      return this.#advanceFrom(ex, routine, i + 1)
    }
    ex.status = 'needs_review'
    ex.error = 'RECONCILE_REQUIRED'
    ex.updatedAt = this.#now()
    this.#persistRun(ex)
    return this.#runView(ex)
  }

  #finishStep(ex, routine, i, { ok: pass, error }) {
    const step = routine.steps[i]
    const st = ex.steps.find((s) => s.stepId === step.id)
    if (pass) {
      st.status = 'done'
      st.finishedAt = this.#now()
      this.#persistRun(ex)
      return this.#advanceFrom(ex, routine, i + 1)
    }
    st.status = 'failed'
    st.error = error
    st.finishedAt = this.#now()
    const policy = routine.failurePolicy || { onStepFailure: 'stop' }
    if (policy.onStepFailure === 'continue') {
      ex.updatedAt = this.#now()
      this.#persistRun(ex)
      return this.#advanceFrom(ex, routine, i + 1)
    }
    return this.#terminal(ex, 'failed', error)
  }

  #terminal(ex, status, error) {
    ex.status = status
    ex.error = error
    ex.finishedAt = this.#now()
    ex.updatedAt = ex.finishedAt
    this.#persistRun(ex)
    return this.#runView(ex)
  }

  #failWait(ex, error) {
    const st = ex.steps.find((s) => s.stepId === ex.waitState.stepId)
    if (st) {
      st.status = 'failed'
      st.error = error
      st.finishedAt = this.#now()
    }
    ex.waitState = null
    return this.#terminal(ex, 'failed', error)
  }

  #reconcile(step, ex) {
    if (step.reconcileType && this.#handlers.has(step.reconcileType)) {
      return this.#invoke(step.reconcileType, { step, ex })
    }
    const key = `${ex.id}:${step.id}`
    if (this.#effects.has(key)) return { found: true, ref: this.#effects.get(key).ref }
    return { found: false }
  }

  #invoke(type, ctx) {
    const fn = this.#handlers.get(type)
    if (!fn) fail('HANDLER_NOT_FOUND', `no hay handler para el paso "${type}"`)
    return fn(ctx)
  }

  #recordEffect(key, ref, ex, step) {
    const ef = { key, executionId: ex.id, stepId: step.id, ref: ref ?? null, cancelled: false, createdAt: this.#now() }
    this.#effects.set(key, ef)
    this.#persistEffect(ef)
    return ef
  }

  #cancelEffect(ref) {
    for (const ef of this.#effects.values()) {
      if (ef.ref === ref) {
        ef.cancelled = true
        this.#persistEffect(ef)
      }
    }
  }

  #requireRoutine(id) {
    const r = this.#routines.get(id)
    if (!r) fail('ROUTINE_NOT_FOUND', `rutina ${id} no existe`)
    return r
  }

  #requireRun(id) {
    const r = this.#runs.get(id)
    if (!r) fail('EXECUTION_NOT_FOUND', `ejecución ${id} no existe`)
    return r
  }

  #persistRoutine(r) {
    if (this.#repo && typeof this.#repo.saveRoutine === 'function') this.#repo.saveRoutine(r)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ routines: [...this.#routines.values()] })
  }

  #persistRun(run) {
    if (this.#repo && typeof this.#repo.saveRun === 'function') this.#repo.saveRun(run)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ runs: [...this.#runs.values()] })
  }

  #persistEffect(ef) {
    if (this.#repo && typeof this.#repo.saveEffect === 'function') this.#repo.saveEffect(ef)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ effects: [...this.#effects.values()] })
  }

  #persistSource(s) {
    if (this.#repo && typeof this.#repo.saveSource === 'function') this.#repo.saveSource(s)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ sources: [...this.#sources.values()] })
  }

  #persistDeleteSource(id) {
    if (this.#repo && typeof this.#repo.deleteSource === 'function') this.#repo.deleteSource(id)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ sources: [...this.#sources.values()] })
  }

  #persistLock(l) {
    if (this.#repo && typeof this.#repo.saveLock === 'function') this.#repo.saveLock(l)
    else if (this.#repo && typeof this.#repo.write === 'function') this.#repo.write({ locks: [...this.#locks.values()] })
  }

  #sourceView(s) {
    return { id: s.id, userId: s.userId, type: s.type, config: structuredClone(s.config || {}), createdAt: s.createdAt }
  }

  #routineView(r) {
    return structuredClone({ ...r, steps: r.steps })
  }

  #runView(run) {
    return structuredClone({ ...run, steps: run.steps, sources: run.sources })
  }
}

function matches(waitState, event) {
  if (!waitState || !event) return false
  if (event.type && waitState.type && event.type !== waitState.type) return false
  if (waitState.key && event.key && waitState.key !== event.key) return false
  if (!event.type && !event.key) return false
  return true
}

function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}
