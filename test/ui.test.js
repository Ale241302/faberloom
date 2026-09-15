import { test } from 'node:test'
import assert from 'node:assert/strict'

import { UiService } from '../src/ui/index.js'
import { SpacesService } from '../src/spaces/index.js'
import { AgentsService } from '../src/agents/index.js'
import { RoutinesService } from '../src/routines/index.js'
import { BoardService } from '../src/board/index.js'
import { AccessService } from '../src/access/index.js'
import { LearningService } from '../src/learning/index.js'
import { BackupService } from '../src/backup/index.js'
import { SqliteRepository } from '../src/store/sqlite.js'
import { MemoryBlobStore } from '../src/store/blob.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}

function build() {
  const repository = new SqliteRepository(':memory:')
  const spaces = new SpacesService({ repository, idGen: seq('sp'), now: fixedNow })
  const agents = new AgentsService({ repository, idGen: seq('ag'), now: fixedNow })
  const routines = new RoutinesService({ repository, idGen: seq('rt'), now: fixedNow })
  const board = new BoardService({ repository, idGen: seq('b'), now: fixedNow })
  const access = new AccessService({ repository, idGen: seq('g'), now: fixedNow })
  const learning = new LearningService({ repository, idGen: seq('l'), now: fixedNow })
  const backup = new BackupService({ repository, blobStore: new MemoryBlobStore(), idGen: seq('bk'), now: fixedNow })
  const ui = new UiService({ spaces, agents, routines, board, access, learning, backup })
  return { spaces, agents, routines, board, access, learning, backup, ui }
}

test('ui: la navegación y el inicio reflejan espacios y modelos', () => {
  const { spaces, agents, ui } = build()
  spaces.run('spaces.create', { name: 'Eguisa', ownerId: 'u1' })
  agents.run('models.register', { id: 'mdl_p', provider: 'deepseek', name: 'chat', available: true })

  const nav = ui.run('ui.navigation', { userId: 'u1' }).data
  assert.equal(nav.spaces.length, 1)
  assert.equal(nav.spaces[0].name, 'Eguisa')
  assert.ok(nav.personal)
  assert.ok(nav.sections.includes('Mesa de trabajo'))

  const home = ui.run('ui.home', { userId: 'u1' }).data
  assert.equal(home.canStartWithoutSpace, true)
  assert.ok(home.models.some((m) => m.name === 'chat'))
})

test('ui: la Mesa agrupa por estado y el detalle muestra contexto y autonomía', () => {
  const { spaces, agents, board, access, ui } = build()
  const space = spaces.run('spaces.create', { name: 'Eguisa', ownerId: 'u1' }).data
  agents.run('models.register', { id: 'mdl_p', provider: 'deepseek', name: 'chat' })
  const item = board.run('board.submit', { ownerId: 'u1', spaceId: space.id, title: 'Proforma Eguisa', kind: 'proforma', evidence: { ref: 'e1' } }).data
  access.run('access.grant', { ownerId: 'u1', action: 'board.effect' })

  const mesa = ui.run('ui.board', { userId: 'u1' }).data
  assert.equal(mesa.needsReview.length, 1)
  assert.equal(mesa.needsReview[0].title, 'Proforma Eguisa')

  const detail = ui.run('ui.item', { userId: 'u1', itemId: item.id }).data
  assert.equal(detail.context.name, 'Eguisa')
  assert.equal(detail.autonomy.effectRequiresGrant, true)
  assert.equal(detail.autonomy.activeGrants, 1)
})

test('ui: agentes, rutinas, memoria y configuración se proyectan', () => {
  const { spaces, agents, routines, board, access, learning, backup, ui } = build()
  spaces.run('spaces.create', { name: 'Eguisa', ownerId: 'u1' })
  agents.run('models.register', { id: 'mdl_p', provider: 'deepseek', name: 'chat' })
  agents.run('agents.create', { name: 'Proformas', ownerId: 'u1', modelPolicy: { principal: 'mdl_p' } })
  routines.run('routines.create', { name: 'R', ownerId: 'u1', steps: [{ id: 'a' }] })
  const t = learning.run('learning.propose', { ownerId: 'u1', scope: { spaceId: 'e1' }, text: 'regla' }).data
  learning.run('learning.activate', { teachingId: t.id })
  access.run('access.grant', { ownerId: 'u1', action: 'board.effect' })
  backup.run('backup.export', {})

  const agentsView = ui.run('ui.agents', { userId: 'u1' }).data
  assert.equal(agentsView.agents[0].principal, 'mdl_p')
  assert.equal(agentsView.pool.length, 1)

  assert.equal(ui.run('ui.routines', { userId: 'u1' }).data.routines.length, 1)
  assert.equal(ui.run('ui.memory', { userId: 'u1' }).data.teachings.length, 1)

  const settings = ui.run('ui.settings', { userId: 'u1' }).data
  assert.equal(settings.models.length, 1)
  assert.equal(settings.permissions.length, 1)
  assert.equal(settings.backups.length, 1)

  const tokens = ui.run('ui.tokens', {}).data
  assert.ok(tokens.color.accent)
  assert.equal(tokens.name, 'FaberLoom')
})
