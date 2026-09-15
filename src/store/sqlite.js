import { DatabaseSync } from 'node:sqlite'

/**
 * Backend de datos definitivo (primer corte): SQLite vía `node:sqlite`.
 *
 * Contrato:
 *   - `read()`: hidrata el estado completo.
 *   - `write(state)`: snapshot completo (transaccional).
 *   - `saveSpace(space)` / `saveLink(link)` / `deleteLink(id)`: **escritura
 *     incremental** de un solo objeto, sin tocar los demás.
 *
 * Tablas normalizadas (espacios, contexto, exclusiones, miembros, vínculos).
 */
export class SqliteRepository {
  #db
  constructor(file) {
    if (!file) throw new Error('SqliteRepository requiere una ruta de archivo')
    this.#db = new DatabaseSync(file)
    this.#migrate()
  }

  #migrate() {
    this.#db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        theme TEXT,
        owner_id TEXT NOT NULL,
        parent_id TEXT,
        inherit_context INTEGER NOT NULL DEFAULT 1,
        inherit_members INTEGER NOT NULL DEFAULT 1,
        personal INTEGER NOT NULL DEFAULT 0,
        company_id TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS space_context (
        space_id TEXT NOT NULL, ord INTEGER NOT NULL, id TEXT NOT NULL,
        key TEXT NOT NULL, value TEXT, source TEXT, PRIMARY KEY (space_id, ord)
      );
      CREATE TABLE IF NOT EXISTS space_excluded (
        space_id TEXT NOT NULL, ord INTEGER NOT NULL, key TEXT NOT NULL,
        PRIMARY KEY (space_id, ord)
      );
      CREATE TABLE IF NOT EXISTS space_members (
        space_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
        PRIMARY KEY (space_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS space_links (
        id TEXT PRIMARY KEY, space_id TEXT NOT NULL, kind TEXT NOT NULL,
        ref TEXT NOT NULL, title TEXT, sensitive INTEGER NOT NULL DEFAULT 0,
        added_by TEXT NOT NULL, created_at TEXT NOT NULL,
        stored INTEGER NOT NULL DEFAULT 0, size INTEGER, sha256 TEXT,
        media_type TEXT, file_name TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_space_links_space ON space_links (space_id);
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, name TEXT NOT NULL,
        capabilities TEXT, context_limit INTEGER, output_limit INTEGER,
        available INTEGER NOT NULL DEFAULT 1, pricing TEXT, price_source TEXT,
        price_date TEXT, notes TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, responsibility TEXT,
        owner_id TEXT, space_id TEXT, kind TEXT, origin TEXT, model_policy TEXT,
        requirements TEXT, skills TEXT, tools TEXT, subagents TEXT,
        active INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1,
        history TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agent_selections (
        id TEXT PRIMARY KEY, agent_id TEXT, task_id TEXT, model_id TEXT,
        kind TEXT, reason TEXT, policy_version INTEGER, estimated_cost REAL,
        currency TEXT, created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_selections_agent ON agent_selections (agent_id);
      CREATE TABLE IF NOT EXISTS agent_executions (
        id TEXT PRIMARY KEY, agent_id TEXT, kind TEXT, tool_id TEXT, subagent_id TEXT,
        model_id TEXT, status TEXT, cost REAL, duration_ms INTEGER, error TEXT, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS model_evidence (
        id TEXT PRIMARY KEY, model_id TEXT, task_type TEXT, outcome TEXT, cost REAL, latency_ms INTEGER, created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_model ON model_evidence (model_id, task_type);
      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, intent TEXT, owner_id TEXT, space_id TEXT,
        version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'draft',
        data TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY, routine_id TEXT, routine_version INTEGER, status TEXT,
        idempotency_key TEXT, data TEXT, created_at TEXT, updated_at TEXT, finished_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_executions_idem ON executions (idempotency_key);
      CREATE TABLE IF NOT EXISTS effects (
        key TEXT PRIMARY KEY, execution_id TEXT, step_id TEXT, ref TEXT, cancelled INTEGER NOT NULL DEFAULT 0, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL,
        config TEXT, token_hash TEXT, created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sources_user ON sources (user_id);
      CREATE TABLE IF NOT EXISTS locks (
        name TEXT PRIMARY KEY, owner TEXT, expires_at TEXT
      );
      CREATE TABLE IF NOT EXISTS board_items (
        id TEXT PRIMARY KEY, owner_id TEXT, space_id TEXT, status TEXT,
        revision INTEGER, data TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_board_owner ON board_items (owner_id, status);
    `)
    this.#ensureColumns('space_links', {
      stored: 'INTEGER NOT NULL DEFAULT 0',
      size: 'INTEGER',
      sha256: 'TEXT',
      media_type: 'TEXT',
      file_name: 'TEXT',
    })
  }

  #ensureColumns(table, cols) {
    const existing = new Set(this.#db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name))
    for (const [name, type] of Object.entries(cols)) {
      if (!existing.has(name)) this.#db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`)
    }
  }

  read() {
    const spaces = this.#db.prepare('SELECT * FROM spaces ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      name: r.name,
      theme: r.theme,
      ownerId: r.owner_id,
      parentId: r.parent_id,
      inheritContext: !!r.inherit_context,
      inheritMembers: !!r.inherit_members,
      personal: !!r.personal,
      companyId: r.company_id,
      members: this.#db
        .prepare('SELECT user_id, role FROM space_members WHERE space_id = ? ORDER BY user_id')
        .all(r.id)
        .map((x) => ({ userId: x.user_id, role: x.role })),
      context: this.#db
        .prepare('SELECT id, key, value, source FROM space_context WHERE space_id = ? ORDER BY ord')
        .all(r.id)
        .map((x) => ({ id: x.id, key: x.key, value: x.value === null ? null : JSON.parse(x.value), source: x.source })),
      excluded: this.#db.prepare('SELECT key FROM space_excluded WHERE space_id = ? ORDER BY ord').all(r.id).map((x) => x.key),
      version: r.version,
      createdAt: r.created_at,
    }))

    const links = this.#db.prepare('SELECT * FROM space_links ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      spaceId: r.space_id,
      kind: r.kind,
      ref: r.ref,
      title: r.title,
      sensitive: !!r.sensitive,
      addedBy: r.added_by,
      createdAt: r.created_at,
      stored: !!r.stored,
      ...(r.stored ? { size: r.size, sha256: r.sha256, mediaType: r.media_type, fileName: r.file_name } : {}),
    }))

    const models = this.#db.prepare('SELECT * FROM models ORDER BY name').all().map((r) => ({
      id: r.id,
      provider: r.provider,
      name: r.name,
      capabilities: r.capabilities ? JSON.parse(r.capabilities) : {},
      contextLimit: r.context_limit,
      outputLimit: r.output_limit,
      available: !!r.available,
      pricing: r.pricing ? JSON.parse(r.pricing) : null,
      priceSource: r.price_source,
      priceDate: r.price_date,
      notes: r.notes,
      updatedAt: r.updated_at,
    }))

    const agents = this.#db.prepare('SELECT * FROM agents ORDER BY name').all().map((r) => ({
      id: r.id,
      name: r.name,
      responsibility: r.responsibility,
      ownerId: r.owner_id,
      spaceId: r.space_id,
      kind: r.kind,
      origin: r.origin ? JSON.parse(r.origin) : null,
      modelPolicy: r.model_policy ? JSON.parse(r.model_policy) : null,
      requirements: r.requirements ? JSON.parse(r.requirements) : {},
      skills: r.skills ? JSON.parse(r.skills) : [],
      tools: r.tools ? JSON.parse(r.tools) : [],
      subagents: r.subagents ? JSON.parse(r.subagents) : [],
      active: !!r.active,
      version: r.version,
      history: r.history ? JSON.parse(r.history) : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    const selections = this.#db.prepare('SELECT * FROM agent_selections ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      taskId: r.task_id,
      modelId: r.model_id,
      kind: r.kind,
      reason: r.reason,
      policyVersion: r.policy_version,
      estimatedCost: r.estimated_cost,
      currency: r.currency,
      createdAt: r.created_at,
    }))

    const personalIndex = {}
    for (const s of spaces) if (s.personal) personalIndex[s.ownerId] = s.id

    const agentExecutions = this.#db.prepare('SELECT * FROM agent_executions ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      kind: r.kind,
      toolId: r.tool_id,
      subagentId: r.subagent_id,
      modelId: r.model_id,
      status: r.status,
      cost: r.cost,
      durationMs: r.duration_ms,
      error: r.error,
      createdAt: r.created_at,
    }))

    const evidence = this.#db.prepare('SELECT * FROM model_evidence ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      modelId: r.model_id,
      taskType: r.task_type,
      outcome: r.outcome,
      cost: r.cost,
      latencyMs: r.latency_ms,
      createdAt: r.created_at,
    }))

    const routines = this.#db.prepare('SELECT * FROM routines ORDER BY name').all().map((r) => ({
      id: r.id,
      name: r.name,
      intent: r.intent,
      ownerId: r.owner_id,
      spaceId: r.space_id,
      version: r.version,
      status: r.status,
      ...(r.data ? JSON.parse(r.data) : {}),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    const runs = this.#db.prepare('SELECT * FROM executions ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      routineId: r.routine_id,
      routineVersion: r.routine_version,
      status: r.status,
      idempotencyKey: r.idempotency_key,
      ...(r.data ? JSON.parse(r.data) : {}),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      finishedAt: r.finished_at,
    }))

    const effects = this.#db.prepare('SELECT * FROM effects ORDER BY created_at, key').all().map((r) => ({
      key: r.key,
      executionId: r.execution_id,
      stepId: r.step_id,
      ref: r.ref,
      cancelled: !!r.cancelled,
      createdAt: r.created_at,
    }))

    const sources = this.#db.prepare('SELECT * FROM sources ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      config: r.config ? JSON.parse(r.config) : {},
      tokenHash: r.token_hash,
      createdAt: r.created_at,
    }))

    const locks = this.#db.prepare('SELECT * FROM locks').all().map((r) => ({ name: r.name, owner: r.owner, expiresAt: r.expires_at }))

    const board = this.#db.prepare('SELECT * FROM board_items ORDER BY created_at, id').all().map((r) => ({
      id: r.id,
      ownerId: r.owner_id,
      spaceId: r.space_id,
      status: r.status,
      revision: r.revision,
      ...(r.data ? JSON.parse(r.data) : {}),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return { version: 1, spaces, personalIndex, links, models, agents, selections, agentExecutions, evidence, routines, runs, effects, sources, locks, board }
  }

  // ── Escritura incremental ──────────────────────────────────────────
  saveSpace(s) {
    const cur = this.#db.prepare('SELECT * FROM spaces WHERE id = ?').get(s.id)
    const rowChanged = !cur || this.#rowDiffers(cur, s)

    const curMembers = this.#db.prepare('SELECT user_id, role FROM space_members WHERE space_id = ? ORDER BY user_id').all(s.id)
    const curContext = this.#db.prepare('SELECT id, key, value, source FROM space_context WHERE space_id = ? ORDER BY ord').all(s.id)
    const curExcluded = this.#db.prepare('SELECT key FROM space_excluded WHERE space_id = ? ORDER BY ord').all(s.id)

    const newMembers = (s.members || []).map((m) => ({ user_id: m.userId, role: m.role })).sort((a, b) => (a.user_id < b.user_id ? -1 : 1))
    const newContext = (s.context || []).map((c) => ({ id: c.id, key: c.key, value: JSON.stringify(c.value ?? null), source: c.source ?? null }))
    const newExcluded = (s.excluded || []).map((e) => ({ key: typeof e === 'string' ? e : (e && e.key) }))

    const membersChanged = JSON.stringify(curMembers) !== JSON.stringify(newMembers)
    const contextChanged = JSON.stringify(curContext) !== JSON.stringify(newContext)
    const excludedChanged = JSON.stringify(curExcluded) !== JSON.stringify(newExcluded)

    if (!rowChanged && !membersChanged && !contextChanged && !excludedChanged) {
      return { row: false, members: false, context: false, excluded: false }
    }

    this.#tx(() => {
      if (rowChanged) this.#insSpace(s)
      if (membersChanged) {
        this.#db.prepare('DELETE FROM space_members WHERE space_id = ?').run(s.id)
        const ins = this.#db.prepare('INSERT INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)')
        for (const m of s.members || []) ins.run(s.id, m.userId, m.role)
      }
      if (contextChanged) {
        this.#db.prepare('DELETE FROM space_context WHERE space_id = ?').run(s.id)
        const ins = this.#db.prepare('INSERT INTO space_context (space_id, ord, id, key, value, source) VALUES (?, ?, ?, ?, ?, ?)')
        ;(s.context || []).forEach((c, i) => ins.run(s.id, i, c.id, c.key, JSON.stringify(c.value ?? null), c.source ?? null))
      }
      if (excludedChanged) {
        this.#db.prepare('DELETE FROM space_excluded WHERE space_id = ?').run(s.id)
        const ins = this.#db.prepare('INSERT INTO space_excluded (space_id, ord, key) VALUES (?, ?, ?)')
        ;(s.excluded || []).forEach((e, i) => ins.run(s.id, i, typeof e === 'string' ? e : (e && e.key)))
      }
    })
    return { row: rowChanged, members: membersChanged, context: contextChanged, excluded: excludedChanged }
  }

  #rowDiffers(r, s) {
    return (
      r.name !== s.name ||
      (r.theme ?? null) !== (s.theme ?? null) ||
      r.owner_id !== s.ownerId ||
      (r.parent_id ?? null) !== (s.parentId ?? null) ||
      !!r.inherit_context !== (s.inheritContext !== false) ||
      !!r.inherit_members !== (s.inheritMembers !== false) ||
      !!r.personal !== !!s.personal ||
      (r.company_id ?? null) !== (s.companyId ?? null) ||
      r.version !== s.version ||
      r.created_at !== s.createdAt
    )
  }

  saveLink(link) {
    this.#db
      .prepare(
        `INSERT INTO space_links (id, space_id, kind, ref, title, sensitive, added_by, created_at, stored, size, sha256, media_type, file_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET space_id=excluded.space_id, kind=excluded.kind,
           ref=excluded.ref, title=excluded.title, sensitive=excluded.sensitive,
           added_by=excluded.added_by, created_at=excluded.created_at, stored=excluded.stored,
           size=excluded.size, sha256=excluded.sha256, media_type=excluded.media_type, file_name=excluded.file_name`,
      )
      .run(
        link.id,
        link.spaceId,
        link.kind,
        link.ref,
        link.title ?? null,
        link.sensitive ? 1 : 0,
        link.addedBy,
        link.createdAt,
        link.stored ? 1 : 0,
        link.size ?? null,
        link.sha256 ?? null,
        link.mediaType ?? null,
        link.fileName ?? null,
      )
  }

  deleteLink(id) {
    this.#db.prepare('DELETE FROM space_links WHERE id = ?').run(id)
  }

  saveModel(m) {
    this.#db
      .prepare(
        `INSERT INTO models (id, provider, name, capabilities, context_limit, output_limit, available, pricing, price_source, price_date, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET provider=excluded.provider, name=excluded.name, capabilities=excluded.capabilities,
           context_limit=excluded.context_limit, output_limit=excluded.output_limit, available=excluded.available,
           pricing=excluded.pricing, price_source=excluded.price_source, price_date=excluded.price_date,
           notes=excluded.notes, updated_at=excluded.updated_at`,
      )
      .run(
        m.id,
        m.provider,
        m.name,
        JSON.stringify(m.capabilities || {}),
        m.contextLimit ?? null,
        m.outputLimit ?? null,
        m.available ? 1 : 0,
        m.pricing ? JSON.stringify(m.pricing) : null,
        m.priceSource ?? null,
        m.priceDate ?? null,
        m.notes ?? null,
        m.updatedAt ?? null,
      )
  }

  saveAgent(a) {
    this.#db
      .prepare(
        `INSERT INTO agents (id, name, responsibility, owner_id, space_id, kind, origin, model_policy, requirements, skills, tools, subagents, active, version, history, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, responsibility=excluded.responsibility, owner_id=excluded.owner_id,
           space_id=excluded.space_id, kind=excluded.kind, origin=excluded.origin, model_policy=excluded.model_policy,
           requirements=excluded.requirements, skills=excluded.skills, tools=excluded.tools, subagents=excluded.subagents,
           active=excluded.active, version=excluded.version, history=excluded.history, created_at=excluded.created_at, updated_at=excluded.updated_at`,
      )
      .run(
        a.id,
        a.name,
        a.responsibility ?? null,
        a.ownerId ?? null,
        a.spaceId ?? null,
        a.kind ?? null,
        a.origin ? JSON.stringify(a.origin) : null,
        a.modelPolicy ? JSON.stringify(a.modelPolicy) : null,
        JSON.stringify(a.requirements || {}),
        JSON.stringify(a.skills || []),
        JSON.stringify(a.tools || []),
        JSON.stringify(a.subagents || []),
        a.active === false ? 0 : 1,
        a.version,
        JSON.stringify(a.history || []),
        a.createdAt ?? null,
        a.updatedAt ?? null,
      )
  }

  deleteAgent(id) {
    this.#db.prepare('DELETE FROM agents WHERE id = ?').run(id)
    this.#db.prepare('DELETE FROM agent_selections WHERE agent_id = ?').run(id)
  }

  saveSelection(s) {
    this.#db
      .prepare('INSERT OR REPLACE INTO agent_selections (id, agent_id, task_id, model_id, kind, reason, policy_version, estimated_cost, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(s.id, s.agentId, s.taskId ?? null, s.modelId ?? null, s.kind ?? null, s.reason ?? null, s.policyVersion ?? null, s.estimatedCost ?? null, s.currency ?? null, s.createdAt)
  }

  saveExecution(e) {
    this.#db
      .prepare('INSERT OR REPLACE INTO agent_executions (id, agent_id, kind, tool_id, subagent_id, model_id, status, cost, duration_ms, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(e.id, e.agentId ?? null, e.kind ?? null, e.toolId ?? null, e.subagentId ?? null, e.modelId ?? null, e.status ?? null, e.cost ?? null, e.durationMs ?? null, e.error ?? null, e.createdAt)
  }

  saveEvidence(ev) {
    this.#db
      .prepare('INSERT OR REPLACE INTO model_evidence (id, model_id, task_type, outcome, cost, latency_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(ev.id, ev.modelId, ev.taskType ?? null, ev.outcome, ev.cost ?? null, ev.latencyMs ?? null, ev.createdAt)
  }

  // ── Snapshot completo (solo de las secciones presentes) ─────────────
  write(state) {
    this.#tx(() => {
      if (state.spaces !== undefined) {
        this.#db.exec('DELETE FROM space_context; DELETE FROM space_excluded; DELETE FROM space_members; DELETE FROM spaces;')
        for (const s of state.spaces || []) {
          this.#insSpace(s)
          this.#insChildren(s)
        }
      }
      if (state.links !== undefined) {
        this.#db.exec('DELETE FROM space_links;')
        for (const link of state.links || []) this.saveLink(link)
      }
      if (state.models !== undefined) {
        this.#db.exec('DELETE FROM models;')
        for (const m of state.models || []) this.saveModel(m)
      }
      if (state.agents !== undefined) {
        this.#db.exec('DELETE FROM agents;')
        for (const a of state.agents || []) this.saveAgent(a)
      }
      if (state.selections !== undefined) {
        this.#db.exec('DELETE FROM agent_selections;')
        for (const s of state.selections || []) this.saveSelection(s)
      }
      if (state.agentExecutions !== undefined) {
        this.#db.exec('DELETE FROM agent_executions;')
        for (const e of state.agentExecutions || []) this.saveExecution(e)
      }
      if (state.evidence !== undefined) {
        this.#db.exec('DELETE FROM model_evidence;')
        for (const ev of state.evidence || []) this.saveEvidence(ev)
      }
      if (state.routines !== undefined) {
        this.#db.exec('DELETE FROM routines;')
        for (const r of state.routines || []) this.saveRoutine(r)
      }
      if (state.runs !== undefined) {
        this.#db.exec('DELETE FROM executions;')
        for (const run of state.runs || []) this.saveRun(run)
      }
      if (state.effects !== undefined) {
        this.#db.exec('DELETE FROM effects;')
        for (const ef of state.effects || []) this.saveEffect(ef)
      }
      if (state.sources !== undefined) {
        this.#db.exec('DELETE FROM sources;')
        for (const s of state.sources || []) this.saveSource(s)
      }
      if (state.locks !== undefined) {
        this.#db.exec('DELETE FROM locks;')
        for (const l of state.locks || []) this.saveLock(l)
      }
      if (state.board !== undefined) {
        this.#db.exec('DELETE FROM board_items;')
        for (const b of state.board || []) this.saveBoardItem(b)
      }
    })
  }

  saveBoardItem(b) {
    const { id, ownerId, spaceId, status, revision, createdAt, updatedAt, ...data } = b
    this.#db
      .prepare(
        `INSERT INTO board_items (id, owner_id, space_id, status, revision, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET owner_id=excluded.owner_id, space_id=excluded.space_id, status=excluded.status,
           revision=excluded.revision, data=excluded.data, created_at=excluded.created_at, updated_at=excluded.updated_at`,
      )
      .run(id, ownerId ?? null, spaceId ?? null, status ?? null, revision ?? 0, JSON.stringify(data), createdAt ?? null, updatedAt ?? null)
  }

  saveSource(s) {
    this.#db
      .prepare('INSERT OR REPLACE INTO sources (id, user_id, type, config, token_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(s.id, s.userId, s.type, JSON.stringify(s.config || {}), s.tokenHash ?? null, s.createdAt ?? null)
  }

  deleteSource(id) {
    this.#db.prepare('DELETE FROM sources WHERE id = ?').run(id)
  }

  saveLock(l) {
    this.#db.prepare('INSERT OR REPLACE INTO locks (name, owner, expires_at) VALUES (?, ?, ?)').run(l.name, l.owner ?? null, l.expiresAt ?? null)
  }

  /** Adquiere el bloqueo de forma atómica (una sola sentencia SQL). */
  tryAcquireLock(name, owner, nowIso, expiresAt) {
    const info = this.#db
      .prepare(
        `INSERT INTO locks (name, owner, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET owner=excluded.owner, expires_at=excluded.expires_at
         WHERE locks.owner IS NULL OR locks.owner = excluded.owner OR locks.expires_at IS NULL OR locks.expires_at <= ?`,
      )
      .run(name, owner, expiresAt, nowIso)
    return info.changes > 0
  }

  /** Libera el bloqueo solo si lo tiene ese owner. */
  releaseLock(name, owner) {
    const info = this.#db.prepare('DELETE FROM locks WHERE name = ? AND owner = ?').run(name, owner)
    return info.changes > 0
  }

  saveRoutine(r) {
    const { id, name, intent, ownerId, spaceId, version, status, createdAt, updatedAt, ...data } = r
    this.#db
      .prepare(
        `INSERT INTO routines (id, name, intent, owner_id, space_id, version, status, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, intent=excluded.intent, owner_id=excluded.owner_id,
           space_id=excluded.space_id, version=excluded.version, status=excluded.status, data=excluded.data,
           created_at=excluded.created_at, updated_at=excluded.updated_at`,
      )
      .run(id, name, intent ?? null, ownerId ?? null, spaceId ?? null, version, status, JSON.stringify(data), createdAt ?? null, updatedAt ?? null)
  }

  saveRun(run) {
    const { id, routineId, routineVersion, status, idempotencyKey, createdAt, updatedAt, finishedAt, ...data } = run
    this.#db
      .prepare(
        `INSERT INTO executions (id, routine_id, routine_version, status, idempotency_key, data, created_at, updated_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET routine_id=excluded.routine_id, routine_version=excluded.routine_version,
           status=excluded.status, idempotency_key=excluded.idempotency_key, data=excluded.data,
           created_at=excluded.created_at, updated_at=excluded.updated_at, finished_at=excluded.finished_at`,
      )
      .run(id, routineId ?? null, routineVersion ?? null, status ?? null, idempotencyKey ?? null, JSON.stringify(data), createdAt ?? null, updatedAt ?? null, finishedAt ?? null)
  }

  saveEffect(ef) {
    this.#db
      .prepare('INSERT INTO effects (key, execution_id, step_id, ref, cancelled, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET ref=excluded.ref, cancelled=excluded.cancelled')
      .run(ef.key, ef.executionId ?? null, ef.stepId ?? null, ef.ref ?? null, ef.cancelled ? 1 : 0, ef.createdAt ?? null)
  }

  close() {
    this.#db.close()
  }

  // ── Internos ───────────────────────────────────────────────────────
  #tx(fn) {
    this.#db.exec('BEGIN')
    try {
      fn()
      this.#db.exec('COMMIT')
    } catch (e) {
      this.#db.exec('ROLLBACK')
      throw e
    }
  }

  #insSpace(s) {
    this.#db
      .prepare(
        `INSERT INTO spaces (id, name, theme, owner_id, parent_id, inherit_context, inherit_members, personal, company_id, version, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, theme=excluded.theme, owner_id=excluded.owner_id,
           parent_id=excluded.parent_id, inherit_context=excluded.inherit_context, inherit_members=excluded.inherit_members,
           personal=excluded.personal, company_id=excluded.company_id, version=excluded.version, created_at=excluded.created_at`,
      )
      .run(
        s.id,
        s.name,
        s.theme ?? null,
        s.ownerId,
        s.parentId ?? null,
        s.inheritContext === false ? 0 : 1,
        s.inheritMembers === false ? 0 : 1,
        s.personal ? 1 : 0,
        s.companyId ?? null,
        s.version,
        s.createdAt,
      )
  }

  #insChildren(s) {
    const insCtx = this.#db.prepare('INSERT INTO space_context (space_id, ord, id, key, value, source) VALUES (?, ?, ?, ?, ?, ?)')
    const insExc = this.#db.prepare('INSERT INTO space_excluded (space_id, ord, key) VALUES (?, ?, ?)')
    const insMem = this.#db.prepare('INSERT INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)')
    ;(s.context || []).forEach((c, i) => insCtx.run(s.id, i, c.id, c.key, JSON.stringify(c.value ?? null), c.source ?? null))
    ;(s.excluded || []).forEach((e, i) => insExc.run(s.id, i, typeof e === 'string' ? e : (e && e.key)))
    ;(s.members || []).forEach((m) => insMem.run(s.id, m.userId, m.role))
  }
}
