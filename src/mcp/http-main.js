import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SpacesService } from '../spaces/index.js'
import { AgentsService } from '../agents/index.js'
import { RoutinesService } from '../routines/index.js'
import { BoardService } from '../board/index.js'
import { AccessService } from '../access/index.js'
import { LearningService } from '../learning/index.js'
import { BackupService } from '../backup/index.js'
import { offsiteRunnerFromEnv } from '../backup/offsite.js'
import { repositoryFromEnv } from '../store/from-env.js'
import { blobStoreFromEnv } from '../store/blob.js'
import { startHttp } from './http.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')

const repository = await repositoryFromEnv(process.env, dataDir)
const blobStore = blobStoreFromEnv(process.env)
const service = new SpacesService({ repository, blobStore })
const agentsService = new AgentsService({ repository })
agentsService.registerTool({ id: 'echo', name: 'echo', handler: (input) => input })
agentsService.registerTool({ id: 'upper', name: 'upper', handler: (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })
agentsService.registerTool({ id: 'async_upper', name: 'async_upper', handler: async (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })

const accessService = new AccessService({ repository })
const learningService = new LearningService({
  repository,
  // Promover exige permiso sobre el alcance: editar el espacio destino, o
  // administrar el espacio de origen si se promueve a una base común.
  authorizePromotion: ({ userId, targetScope, originScope }) => {
    if (targetScope.spaceId) return service.checkPermission(targetScope.spaceId, userId, 'edit')
    if (originScope.spaceId) return service.checkPermission(originScope.spaceId, userId, 'manage')
    return { allowed: true }
  },
})
const boardService = new BoardService({
  repository,
  blobStore,
  // Aprobar en la Mesa NO concede permiso: el efecto valida la concesión.
  authorize: (ref, ctx) => accessService.check({ grantId: ref, action: ctx.action, context: ctx.context }),
  // Una corrección extrae automáticamente una enseñanza (candidata).
  onCorrection: (payload) => learningService.propose(payload),
})

const routinesService = new RoutinesService({
  repository,
  availableTools: () => agentsService.listTools().map((t) => t.id),
  availableAgents: () => agentsService.listAgents().map((a) => a.id),
  // Un paso puede devolver { review } y se crea el elemento de Mesa automáticamente.
  onReview: (payload) => boardService.submit(payload),
})
routinesService.registerStepHandler('noop', () => ({ output: 'ok' }))
routinesService.registerStepHandler('echo', (ctx) => ({ output: ctx.ex.context }))
routinesService.registerStepHandler('effect_echo', (ctx) => ({ output: 'hecho', effect: { ref: `ef_${ctx.effectKey}` } }))
routinesService.registerStepHandler('wait_event', (ctx) => (ctx.event ? { output: 'respondido' } : { waitFor: { type: 'event', key: ctx.step?.id || 'event' } }))
routinesService.registerStepHandler('propose_review', (ctx) =>
  ctx.event
    ? { output: `revisión ${ctx.event.decision || 'aprobada'}` }
    : { output: 'propuesta creada', review: { title: ctx.step.instruction || 'Revisar resultado', kind: 'document', result: ctx.ex.context, evidence: { ref: `exec:${ctx.ex.id}:${ctx.step.id}` } } },
)

// Despachador periódico del host: avanza pendientes y reanuda esperas bajo bloqueo.
const dispatchMs = Number(process.env.FABERLOOM_DISPATCH_MS || 15000)
if (dispatchMs > 0) {
  const owner = `host-${process.pid}`
  setInterval(() => {
    try {
      routinesService.run('dispatcher.dispatch', { owner })
    } catch {
      /* noop */
    }
  }, dispatchMs).unref?.()
}

const backupService = new BackupService({
  repository,
  blobStore,
  key: process.env.FABERLOOM_BACKUP_KEY || null,
  offsite: offsiteRunnerFromEnv(process.env),
  // Al restaurar se revalidan permisos: una concesión de un espacio ya no accesible se revoca.
  recheckGrant: (g) => (g.context && g.context.spaceId ? service.checkPermission(g.context.spaceId, g.ownerId, 'view') : { allowed: true }),
})

// Respaldo y verificación programados (0 = desactivado; se puede usar cron).
const backupIntervalMs = Number(process.env.FABERLOOM_BACKUP_INTERVAL_MS || 0)
if (backupIntervalMs > 0) {
  setInterval(() => {
    const r = backupService.run('backup.export', { label: 'scheduled' })
    if (!r.ok) {
      process.stderr.write(`[backup] programado falló: ${r.error.code}\n`)
      return
    }
    const v = backupService.run('backup.verify', { backupId: r.data.id })
    process.stderr.write(`[backup] programado ${r.data.id}: verificado=${v.data.ok} offsite=${r.data.offsite ? r.data.offsite.ok : 'n/a'}\n`)
  }, backupIntervalMs).unref?.()
}
const backupVerifyMs = Number(process.env.FABERLOOM_BACKUP_VERIFY_MS || 0)
if (backupVerifyMs > 0) {
  setInterval(() => {
    const v = backupService.run('backup.verifyLatest', {})
    process.stderr.write(`[backup] verificación programada: ${v.data.ok ? 'ok' : `FALLO ${v.data.reason || ''}`}\n`)
  }, backupVerifyMs).unref?.()
}

startHttp({
  service,
  agentsService,
  routinesService,
  boardService,
  accessService,
  learningService,
  backupService,
  gatewayKey: process.env.FABERLOOM_GATEWAY_KEY || '',
  defaultUserId: process.env.FABERLOOM_USER_ID || 'anon',
  port: Number(process.env.FABERLOOM_PORT || 8090),
})
