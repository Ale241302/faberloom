import { TOKENS } from './tokens.js'

/**
 * E9 · UI FaberLoom (capa de proyección).
 *
 * Ensambla los modelos de vista que consumen las pantallas descritas en
 * `pantallas-faberloom.md`, a partir de los servicios (espacios, agentes,
 * rutinas, mesa, autonomía, memoria, respaldo). No es un frontend: es el contrato
 * que cualquier UI (o el propio chat del harness) puede renderizar.
 */

export class UiService {
  #services

  constructor(services = {}) {
    this.#services = services
  }

  #data(service, operation, params) {
    const svc = this.#services[service]
    if (!svc) return null
    const out = svc.run(operation, params)
    return out && out.ok ? out.data : null
  }

  /** Pantalla 1: navegación lateral y contexto personal. */
  navigation({ userId } = {}) {
    const spaces = this.#data('spaces', 'spaces.list', { userId }) || []
    const personal = this.#data('spaces', 'spaces.personal', { userId })
    const board = this.#data('board', 'board.list', { ownerId: userId }) || []
    const pending = board.filter((i) => ['waiting_approval', 'needs_review', 'waiting_data', 'in_progress'].includes(i.status)).length
    return {
      user: userId ?? null,
      sections: ['Conversar', 'Mesa de trabajo', 'Espacios', 'Agentes', 'Rutinas', 'Memoria', 'Conexiones'],
      personal: personal ? { id: personal.id, name: personal.name, label: 'Sin espacio asignado' } : null,
      spaces: spaces.map((s) => ({ id: s.id, name: s.name, parentId: s.parentId, companyId: s.companyId })),
      board: { pending },
    }
  }

  /** Pantalla 1: inicio desde cero. */
  home({ userId } = {}) {
    const nav = this.navigation({ userId })
    const models = this.#data('agents', 'models.list', { availableOnly: true }) || []
    return {
      headline: '¿Qué quieres resolver hoy?',
      sub: 'Una idea, un documento o un trabajo por descubrir.',
      context: nav.personal,
      models: models.map((m) => ({ id: m.id, name: m.name })),
      canStartWithoutSpace: true,
      navigation: nav,
    }
  }

  /** Pantalla 3: Mesa de trabajo agrupada por estado. */
  board({ userId } = {}) {
    const items = this.#data('board', 'board.list', { ownerId: userId }) || []
    const pick = (statuses) =>
      items
        .filter((i) => statuses.includes(i.status))
        .map((i) => ({ id: i.id, title: i.title, kind: i.kind, status: i.status, revision: i.revision, stale: i.stale }))
    return {
      needsReview: pick(['waiting_approval', 'needs_review']),
      waiting: pick(['waiting_data', 'in_progress']),
      done: pick(['approved', 'completed']),
      failed: pick(['failed', 'reopened']),
    }
  }

  /** Pantalla 3 (detalle): resultado, contexto y autonomía del elemento. */
  item({ userId, itemId } = {}) {
    const item = this.#data('board', 'board.get', { itemId })
    if (!item) return null
    const space = item.spaceId ? this.#data('spaces', 'spaces.get', { spaceId: item.spaceId, userId }) : null
    const grants = this.#data('access', 'access.list', { ownerId: userId, action: 'board.effect', status: 'active' }) || []
    return {
      item,
      context: space ? { id: space.id, name: space.name, companyId: space.companyId } : null,
      autonomy: { effectRequiresGrant: true, activeGrants: grants.length, note: 'Aprobar no concede permiso' },
    }
  }

  /** Pantalla 4: espacios y subespacios. */
  spaces({ userId } = {}) {
    const list = this.#data('spaces', 'spaces.list', { userId }) || []
    return {
      spaces: list.map((s) => ({ id: s.id, name: s.name, parentId: s.parentId, companyId: s.companyId, inheritContext: s.inheritContext, members: s.members.length })),
    }
  }

  /** Pantallas 5-6: catálogo y editor de agentes. */
  agents({ userId } = {}) {
    const list = this.#data('agents', 'agents.list', { ownerId: userId }) || []
    return {
      agents: list.map((a) => {
        const eff = this.#data('agents', 'agents.getEffectivePolicy', { agentId: a.id })
        return { id: a.id, name: a.name, kind: a.kind, active: a.active, version: a.version, principal: eff && eff.policy ? eff.policy.principal : null, exclusive: !!(eff && eff.policy && eff.policy.exclusive) }
      }),
      pool: (this.#data('agents', 'models.list', {}) || []).map((m) => ({ id: m.id, provider: m.provider, name: m.name, available: m.available })),
    }
  }

  /** Pantalla 7: rutinas y versiones. */
  routines({ userId } = {}) {
    const list = this.#data('routines', 'routines.list', { ownerId: userId }) || []
    return {
      routines: list.map((r) => ({ id: r.id, name: r.name, status: r.status, version: r.version, steps: r.steps.length, triggers: r.triggers.length })),
    }
  }

  /** Pantalla 8: memoria y desempeño. */
  memory({ userId, scope = {} } = {}) {
    const hasScope = Object.keys(scope).length > 0
    const teachings = this.#data('learning', 'learning.list', { ownerId: userId, scope: hasScope ? scope : undefined }) || []
    const performance = this.#data('learning', 'learning.performance', {}) || null
    return {
      teachings: teachings.map((t) => ({ id: t.id, status: t.status, kind: t.kind, text: t.text, scope: t.scope, version: t.version })),
      performance,
    }
  }

  /** Pantalla 10: conexiones, modelos, permisos y respaldos. */
  settings({ userId } = {}) {
    const sources = this.#data('routines', 'sources.list', { userId }) || []
    const models = this.#data('agents', 'models.list', {}) || []
    const grants = this.#data('access', 'access.list', { ownerId: userId }) || []
    const backups = this.#data('backup', 'backup.list', {}) || []
    return {
      connections: sources.map((s) => ({ id: s.id, type: s.type, host: s.config && s.config.host ? s.config.host : null })),
      models: models.map((m) => ({ id: m.id, provider: m.provider, name: m.name, available: m.available })),
      permissions: grants.map((g) => ({ id: g.id, action: g.action, agentId: g.agentId, status: g.status, context: g.context })),
      backups: backups.map((b) => ({ id: b.id, createdAt: b.createdAt, size: b.size, encrypted: !!(b.manifest && b.manifest.encrypted), offsite: b.offsite ? b.offsite.ok : null })),
    }
  }

  /** Tokens de identidad. */
  tokens() {
    return TOKENS
  }

  run(operation, params = {}) {
    try {
      switch (operation) {
        case 'ui.navigation': return { ok: true, data: this.navigation(params) }
        case 'ui.home': return { ok: true, data: this.home(params) }
        case 'ui.board': return { ok: true, data: this.board(params) }
        case 'ui.item': return { ok: true, data: this.item(params) }
        case 'ui.spaces': return { ok: true, data: this.spaces(params) }
        case 'ui.agents': return { ok: true, data: this.agents(params) }
        case 'ui.routines': return { ok: true, data: this.routines(params) }
        case 'ui.memory': return { ok: true, data: this.memory(params) }
        case 'ui.settings': return { ok: true, data: this.settings(params) }
        case 'ui.tokens': return { ok: true, data: this.tokens() }
        default: return { ok: false, error: { code: 'UNKNOWN_OPERATION', message: operation } }
      }
    } catch (e) {
      return { ok: false, error: { code: e.code || 'UI_ERROR', message: e.message } }
    }
  }
}
