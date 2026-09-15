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
        added_by TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_space_links_space ON space_links (space_id);
    `)
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
    }))

    if (!spaces.length && !links.length) return null
    const personalIndex = {}
    for (const s of spaces) if (s.personal) personalIndex[s.ownerId] = s.id
    return { version: 1, spaces, personalIndex, links }
  }

  // ── Escritura incremental ──────────────────────────────────────────
  saveSpace(s) {
    this.#tx(() => {
      this.#delChildren(s.id)
      this.#insSpace(s)
      this.#insChildren(s)
    })
  }

  saveLink(link) {
    this.#db
      .prepare(
        `INSERT INTO space_links (id, space_id, kind, ref, title, sensitive, added_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET space_id=excluded.space_id, kind=excluded.kind,
           ref=excluded.ref, title=excluded.title, sensitive=excluded.sensitive,
           added_by=excluded.added_by, created_at=excluded.created_at`,
      )
      .run(link.id, link.spaceId, link.kind, link.ref, link.title ?? null, link.sensitive ? 1 : 0, link.addedBy, link.createdAt)
  }

  deleteLink(id) {
    this.#db.prepare('DELETE FROM space_links WHERE id = ?').run(id)
  }

  // ── Snapshot completo ──────────────────────────────────────────────
  write(state) {
    this.#tx(() => {
      this.#db.exec('DELETE FROM space_context; DELETE FROM space_excluded; DELETE FROM space_members; DELETE FROM space_links; DELETE FROM spaces;')
      for (const s of state.spaces || []) {
        this.#insSpace(s)
        this.#insChildren(s)
      }
      for (const link of state.links || []) this.saveLink(link)
    })
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

  #delChildren(spaceId) {
    this.#db.prepare('DELETE FROM space_context WHERE space_id = ?').run(spaceId)
    this.#db.prepare('DELETE FROM space_excluded WHERE space_id = ?').run(spaceId)
    this.#db.prepare('DELETE FROM space_members WHERE space_id = ?').run(spaceId)
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
