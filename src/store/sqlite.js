import { DatabaseSync } from 'node:sqlite'

/**
 * Backend de datos definitivo (primer corte): SQLite vía `node:sqlite`.
 *
 * Mantiene el mismo contrato `read()`/`write(state)` que los demás
 * repositorios: el servicio hidrata al arrancar y persiste el estado completo
 * tras cada mutación (transaccional). Las tablas están normalizadas
 * (espacios, contexto, exclusiones, miembros), de modo que un backend más
 * granular puede sustituir la escritura por lotes sin cambiar el servicio.
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
        space_id TEXT NOT NULL,
        ord INTEGER NOT NULL,
        id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        source TEXT,
        PRIMARY KEY (space_id, ord)
      );
      CREATE TABLE IF NOT EXISTS space_excluded (
        space_id TEXT NOT NULL,
        ord INTEGER NOT NULL,
        key TEXT NOT NULL,
        PRIMARY KEY (space_id, ord)
      );
      CREATE TABLE IF NOT EXISTS space_members (
        space_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        PRIMARY KEY (space_id, user_id)
      );
    `)
  }

  read() {
    const spaces = []
    const rows = this.#db.prepare('SELECT * FROM spaces ORDER BY created_at, id').all()
    for (const r of rows) {
      const context = this.#db
        .prepare('SELECT id, key, value, source FROM space_context WHERE space_id = ? ORDER BY ord')
        .all(r.id)
        .map((x) => ({ id: x.id, key: x.key, value: x.value === null ? null : JSON.parse(x.value), source: x.source }))
      const excluded = this.#db
        .prepare('SELECT key FROM space_excluded WHERE space_id = ? ORDER BY ord')
        .all(r.id)
        .map((x) => x.key)
      const members = this.#db
        .prepare('SELECT user_id, role FROM space_members WHERE space_id = ? ORDER BY user_id')
        .all(r.id)
        .map((x) => ({ userId: x.user_id, role: x.role }))
      spaces.push({
        id: r.id,
        name: r.name,
        theme: r.theme,
        ownerId: r.owner_id,
        parentId: r.parent_id,
        inheritContext: !!r.inherit_context,
        inheritMembers: !!r.inherit_members,
        personal: !!r.personal,
        companyId: r.company_id,
        members,
        context,
        excluded,
        version: r.version,
        createdAt: r.created_at,
      })
    }
    if (!spaces.length) return null
    const personalIndex = {}
    for (const s of spaces) if (s.personal) personalIndex[s.ownerId] = s.id
    return { version: 1, spaces, personalIndex }
  }

  write(state) {
    this.#db.exec('BEGIN')
    try {
      this.#db.exec('DELETE FROM space_context; DELETE FROM space_excluded; DELETE FROM space_members; DELETE FROM spaces;')

      const insSpace = this.#db.prepare('INSERT INTO spaces VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      const insCtx = this.#db.prepare('INSERT INTO space_context (space_id, ord, id, key, value, source) VALUES (?, ?, ?, ?, ?, ?)')
      const insExc = this.#db.prepare('INSERT INTO space_excluded (space_id, ord, key) VALUES (?, ?, ?)')
      const insMem = this.#db.prepare('INSERT INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)')

      for (const s of state.spaces || []) {
        insSpace.run(
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
        ;(s.context || []).forEach((c, i) => insCtx.run(s.id, i, c.id, c.key, JSON.stringify(c.value ?? null), c.source ?? null))
        ;(s.excluded || []).forEach((e, i) => insExc.run(s.id, i, typeof e === 'string' ? e : (e && e.key)))
        ;(s.members || []).forEach((m) => insMem.run(s.id, m.userId, m.role))
      }
      this.#db.exec('COMMIT')
    } catch (e) {
      this.#db.exec('ROLLBACK')
      throw e
    }
  }

  close() {
    this.#db.close()
  }
}
