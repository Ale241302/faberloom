/**
 * Servidor MCP de FaberLoom (primer corte): expone las operaciones de Espacios
 * como herramientas MCP sobre stdio. Sin dependencias.
 *
 * Identidad: `defaultUserId` (env o parámetro). En la versión con transporte
 * HTTP la identidad vendrá de la cabecera del gateway (por usuario).
 */

const PROTOCOL_VERSION = '2025-06-18'

const CH = {
  key: { type: 'string', description: 'Clave lógica del contexto (p. ej. moneda)' },
  value: { description: 'Valor del contexto' },
  source: { type: 'string', description: 'Origen del dato (procedencia)' },
}

const memberItem = {
  type: ['string', 'object'],
  description: "'userId' (rol editor) o { userId, role } con role: admin|editor|viewer",
}

const SPACES_TOOLS = [
  {
    name: 'spaces_create',
    description: 'Crea un espacio o subespacio.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        ownerId: { type: 'string', description: 'Por defecto, el usuario conectado' },
        parentId: { type: 'string' },
        inheritContext: { type: 'boolean' },
        inheritMembers: { type: 'boolean', description: 'Heredar miembros/roles del padre (por defecto sí)' },
        companyId: { type: 'string', description: 'Empresa (X-MWT-Client-ID); por defecto la del padre' },
        members: { type: 'array', items: memberItem },
        context: { type: 'array', items: { type: 'object', properties: CH, required: ['key'] } },
        excluded: { type: 'array', items: { type: 'string' } },
        theme: { type: 'string' },
      },
      required: ['name'],
    },
  },
  { name: 'spaces_get', description: 'Devuelve un espacio.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' } }, required: ['spaceId'] } },
  { name: 'spaces_list', description: 'Lista los espacios accesibles.', inputSchema: { type: 'object', properties: {} } },
  {
    name: 'spaces_update',
    description: 'Edita un espacio (nombre, herencia, contexto, exclusiones, miembros).',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: { type: 'string' },
        name: { type: 'string' },
        theme: { type: 'string' },
        inheritContext: { type: 'boolean' },
        inheritMembers: { type: 'boolean', description: 'Heredar miembros/roles del padre (por defecto sí)' },
        companyId: { type: 'string', description: 'Empresa (X-MWT-Client-ID); por defecto la del padre' },
        members: { type: 'array', items: memberItem },
        context: { type: 'array', items: { type: 'object', properties: CH, required: ['key'] } },
        excluded: { type: 'array', items: { type: 'string' } },
      },
      required: ['spaceId'],
    },
  },
  {
    name: 'spaces_add_member',
    description: 'Añade o actualiza un miembro del espacio.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: { type: 'string' },
        memberId: { type: 'string' },
        role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
      },
      required: ['spaceId', 'memberId'],
    },
  },
  {
    name: 'spaces_remove_member',
    description: 'Quita a un miembro del espacio (no al propietario).',
    inputSchema: { type: 'object', properties: { spaceId: { type: 'string' }, memberId: { type: 'string' } }, required: ['spaceId', 'memberId'] },
  },
  {
    name: 'spaces_set_member_role',
    description: 'Cambia el rol de un miembro.',
    inputSchema: {
      type: 'object',
      properties: { spaceId: { type: 'string' }, memberId: { type: 'string' }, role: { type: 'string', enum: ['admin', 'editor', 'viewer'] } },
      required: ['spaceId', 'memberId', 'role'],
    },
  },
  {
    name: 'spaces_link_conversation',
    description: 'Vincula una conversación a un espacio.',
    inputSchema: {
      type: 'object',
      properties: { spaceId: { type: 'string' }, conversationId: { type: 'string' }, title: { type: 'string' }, sensitive: { type: 'boolean' }, content: { description: 'Texto o JSON de la conversación; si se envía, se guarda' } },
      required: ['spaceId', 'conversationId'],
    },
  },
  {
    name: 'spaces_link_file',
    description: 'Vincula un archivo a un espacio.',
    inputSchema: {
      type: 'object',
      properties: { spaceId: { type: 'string' }, fileRef: { type: 'string' }, title: { type: 'string' }, sensitive: { type: 'boolean' }, content: { type: 'string', description: 'Contenido en base64; si se envía, se guarda' }, fileName: { type: 'string' }, mediaType: { type: 'string' } },
      required: ['spaceId'],
    },
  },
  { name: 'spaces_list_links', description: 'Lista los vínculos de un espacio.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' } }, required: ['spaceId'] } },
  { name: 'spaces_unlink', description: 'Quita un vínculo de un espacio.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' }, linkId: { type: 'string' } }, required: ['spaceId', 'linkId'] } },
  { name: 'spaces_read_link_content', description: 'Lee el contenido guardado de un vínculo (texto o base64).', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' }, linkId: { type: 'string' } }, required: ['spaceId', 'linkId'] } },
  { name: 'spaces_effective_context', description: 'Resuelve el contexto efectivo.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' } }, required: ['spaceId'] } },
  { name: 'spaces_personal', description: 'Ámbito personal del usuario (o el espacio indicado).', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' } } } },
  {
    name: 'spaces_preview_link',
    description: 'Vista previa de audiencia al vincular material a un espacio.',
    inputSchema: {
      type: 'object',
      properties: {
        targetSpaceId: { type: 'string' },
        material: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, sensitive: { type: 'boolean' } } } },
      },
      required: ['targetSpaceId'],
    },
  },
  { name: 'spaces_resolve_workdir', description: 'Referencia opaca del directorio de trabajo.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' } }, required: ['spaceId'] } },
]

const AGENTS_TOOLS = [
  {
    name: 'models_register',
    description: 'Registra un modelo en el pool (capacidades, límites y tarifas).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        provider: { type: 'string' },
        name: { type: 'string' },
        capabilities: { type: 'object', properties: { vision: { type: 'boolean' }, tools: { type: 'boolean' }, structuredOutput: { type: 'boolean' }, longContext: { type: 'boolean' }, reasoning: { type: 'boolean' } } },
        contextLimit: { type: 'number' },
        outputLimit: { type: 'number' },
        available: { type: 'boolean' },
        pricing: { type: 'object', properties: { input: { type: 'number' }, output: { type: 'number' }, cacheInput: { type: 'number' }, currency: { type: 'string' } } },
        priceSource: { type: 'string' },
        priceDate: { type: 'string' },
      },
      required: ['provider', 'name'],
    },
  },
  { name: 'models_list', description: 'Lista el pool de modelos.', inputSchema: { type: 'object', properties: { availableOnly: { type: 'boolean' } } } },
  { name: 'models_get', description: 'Detalle de un modelo.', inputSchema: { type: 'object', properties: { modelId: { type: 'string' } }, required: ['modelId'] } },
  { name: 'models_remove', description: 'Quita un modelo del pool.', inputSchema: { type: 'object', properties: { modelId: { type: 'string' } }, required: ['modelId'] } },
  {
    name: 'agents_create',
    description: 'Crea un agente (route: scratch | pool | task).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        responsibility: { type: 'string' },
        spaceId: { type: 'string' },
        kind: { type: 'string', enum: ['base', 'specialist', 'temporary'] },
        route: { type: 'string', enum: ['scratch', 'pool', 'task'] },
        originRef: { type: 'string' },
        fromAgentId: { type: 'string' },
        templateId: { type: 'string' },
        requirements: { type: 'object', properties: { capabilities: { type: 'array', items: { type: 'string' } }, minContext: { type: 'number' } } },
        skills: { type: 'array', items: { type: 'string' } },
        tools: { type: 'array', items: { type: 'string' } },
        modelPolicy: { type: 'object' },
      },
      required: ['name'],
    },
  },
  { name: 'agents_get', description: 'Detalle de un agente.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' } }, required: ['agentId'] } },
  { name: 'agents_list', description: 'Lista agentes.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' }, ownerId: { type: 'string' }, kind: { type: 'string' } } } },
  { name: 'agents_update', description: 'Edita un agente (nueva versión).', inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, patch: { type: 'object' } }, required: ['agentId'] } },
  { name: 'agents_duplicate', description: 'Duplica un agente copiando solo skills/enseñanzas autorizadas.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, toSpaceId: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } }, copyTeachings: { type: 'boolean' } }, required: ['agentId'] } },
  { name: 'agents_deactivate', description: 'Desactiva un agente.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' } }, required: ['agentId'] } },
  { name: 'agents_set_model_policy', description: 'Fija la política de modelo (principal, exclusividad, alternativas, escalamiento, presupuesto).', inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, policy: { type: 'object' } }, required: ['agentId', 'policy'] } },
  { name: 'agents_get_effective_policy', description: 'Política efectiva del agente.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' } }, required: ['agentId'] } },
  { name: 'agents_recommend_model', description: 'Recomienda modelo por costo esperado entre compatibles (con incertidumbre si falta tarifa).', inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, requirements: { type: 'object' }, task: { type: 'object' } } } },
  { name: 'agents_resolve_model', description: 'Resuelve el modelo efectivo para una tarea (principal, fallback, escalamiento, presupuesto).', inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, task: { type: 'object' } }, required: ['agentId'] } },
  { name: 'agents_record_selection', description: 'Registra la selección de modelo aplicada a una ejecución.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, taskId: { type: 'string' }, decision: { type: 'object' } }, required: ['agentId', 'decision'] } },
  { name: 'agents_list_selections', description: 'Historial de selecciones de un agente.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' } } } },
  { name: 'tools_list', description: 'Herramientas ejecutables registradas.', inputSchema: { type: 'object', properties: {} } },
  { name: 'agents_execute_tool', description: 'Ejecuta una herramienta permitida al agente.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, toolId: { type: 'string' }, input: { type: 'object' }, modelId: { type: 'string' } }, required: ['agentId', 'toolId'] } },
  { name: 'agents_delegate', description: 'Delega en un subagente autorizado (política propia + presupuesto compartido).', inputSchema: { type: 'object', properties: { parentAgentId: { type: 'string' }, subagentAgentId: { type: 'string' }, task: { type: 'object' }, toolCalls: { type: 'array' } }, required: ['parentAgentId', 'subagentAgentId'] } },
  { name: 'agents_list_executions', description: 'Ejecuciones (herramientas y delegaciones) de un agente.', inputSchema: { type: 'object', properties: { agentId: { type: 'string' } } } },
  { name: 'models_record_outcome', description: 'Registra evidencia real (approved/corrected/error) de un modelo.', inputSchema: { type: 'object', properties: { modelId: { type: 'string' }, taskType: { type: 'string' }, outcome: { type: 'string', enum: ['approved', 'corrected', 'error'] }, cost: { type: 'number' }, latencyMs: { type: 'number' } }, required: ['modelId', 'outcome'] } },
  { name: 'models_evidence', description: 'Evidencia agregada por modelo/tipo de tarea.', inputSchema: { type: 'object', properties: { modelId: { type: 'string' }, taskType: { type: 'string' } } } },
]

function mapAgents(name, args, ctx) {
  const { userId } = ctx
  switch (name) {
    case 'models_register': return ['models.register', args]
    case 'models_list': return ['models.list', args]
    case 'models_get': return ['models.get', { modelId: args.modelId }]
    case 'models_remove': return ['models.remove', { modelId: args.modelId }]
    case 'templates_register': return ['templates.register', args]
    case 'templates_list': return ['templates.list', {}]
    case 'agents_create': {
      const { userId: _u, companyId: _c, ownerId: _o, ...rest } = args
      return ['agents.create', { ...rest, ownerId: userId }]
    }
    case 'agents_get': return ['agents.get', { agentId: args.agentId }]
    case 'agents_list': return ['agents.list', { spaceId: args.spaceId, ownerId: args.ownerId, kind: args.kind }]
    case 'agents_update': return ['agents.update', { agentId: args.agentId, patch: args.patch || args }]
    case 'agents_duplicate': return ['agents.duplicate', args]
    case 'agents_deactivate': return ['agents.deactivate', { agentId: args.agentId }]
    case 'agents_set_model_policy': return ['agents.setModelPolicy', { agentId: args.agentId, policy: args.policy }]
    case 'agents_get_effective_policy': return ['agents.getEffectivePolicy', { agentId: args.agentId }]
    case 'agents_recommend_model': return ['agents.recommendModel', args]
    case 'agents_resolve_model': return ['agents.resolveModel', { agentId: args.agentId, task: args.task || {} }]
    case 'agents_record_selection': return ['agents.recordSelection', { agentId: args.agentId, taskId: args.taskId, decision: args.decision }]
    case 'agents_list_selections': return ['agents.listSelections', { agentId: args.agentId }]
    case 'tools_list': return ['tools.list', {}]
    case 'agents_execute_tool': return ['agents.executeTool', { agentId: args.agentId, toolId: args.toolId, input: args.input || {}, modelId: args.modelId || null }]
    case 'agents_delegate': return ['agents.delegate', { parentAgentId: args.parentAgentId, subagentAgentId: args.subagentAgentId, task: args.task || {}, toolCalls: args.toolCalls || [] }]
    case 'agents_list_executions': return ['agents.listExecutions', { agentId: args.agentId }]
    case 'models_record_outcome': return ['models.recordOutcome', { modelId: args.modelId, taskType: args.taskType, outcome: args.outcome, cost: args.cost, latencyMs: args.latencyMs }]
    case 'models_evidence': return ['models.evidence', { modelId: args.modelId, taskType: args.taskType }]
    default: return null
  }
}

const ROUTINES_TOOLS = [
  {
    name: 'routines_create',
    description: 'Crea una rutina (borrador) con disparadores, pasos y política de fallos.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        intent: { type: 'string' },
        spaceId: { type: 'string' },
        triggers: { type: 'array' },
        inputs: { type: 'array' },
        steps: { type: 'array' },
        expectedResult: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        failurePolicy: { type: 'object' },
      },
      required: ['name'],
    },
  },
  { name: 'routines_get', description: 'Detalle de una rutina.', inputSchema: { type: 'object', properties: { routineId: { type: 'string' } }, required: ['routineId'] } },
  { name: 'routines_list', description: 'Lista rutinas.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' }, ownerId: { type: 'string' }, status: { type: 'string' } } } },
  { name: 'routines_update', description: 'Edita una rutina (nueva versión).', inputSchema: { type: 'object', properties: { routineId: { type: 'string' }, patch: { type: 'object' } }, required: ['routineId'] } },
  { name: 'routines_validate', description: 'Valida pasos, dependencias y capacidades.', inputSchema: { type: 'object', properties: { routineId: { type: 'string' } }, required: ['routineId'] } },
  { name: 'routines_activate', description: 'Activa una rutina validada.', inputSchema: { type: 'object', properties: { routineId: { type: 'string' } }, required: ['routineId'] } },
  { name: 'routines_pause', description: 'Pausa una rutina.', inputSchema: { type: 'object', properties: { routineId: { type: 'string' } }, required: ['routineId'] } },
  { name: 'executions_start', description: 'Inicia una ejecución (idempotente por clave).', inputSchema: { type: 'object', properties: { routineId: { type: 'string' }, trigger: { type: 'object' }, context: { type: 'object' }, idempotencyKey: { type: 'string' }, sources: { type: 'array' } }, required: ['routineId'] } },
  { name: 'executions_get', description: 'Detalle de una ejecución.', inputSchema: { type: 'object', properties: { executionId: { type: 'string' } }, required: ['executionId'] } },
  { name: 'executions_list', description: 'Lista ejecuciones.', inputSchema: { type: 'object', properties: { status: { type: 'string' }, routineId: { type: 'string' } } } },
  { name: 'executions_advance', description: 'Avanza una ejecución.', inputSchema: { type: 'object', properties: { executionId: { type: 'string' } }, required: ['executionId'] } },
  { name: 'executions_resume', description: 'Reanuda una espera (evento).', inputSchema: { type: 'object', properties: { executionId: { type: 'string' }, event: { type: 'object' } }, required: ['executionId'] } },
  { name: 'executions_tick', description: 'Despachador: reanuda esperas por evento o tiempo.', inputSchema: { type: 'object', properties: { now: { type: 'string' }, events: { type: 'array' } } } },
  { name: 'executions_effects', description: 'Efectos registrados de una ejecución.', inputSchema: { type: 'object', properties: { executionId: { type: 'string' } } } },
  { name: 'executions_preview_migration', description: 'Vista previa de migración a la versión vigente.', inputSchema: { type: 'object', properties: { executionId: { type: 'string' }, rename: { type: 'object' } }, required: ['executionId'] } },
  { name: 'executions_migrate', description: 'Migra explícitamente una ejecución en curso a la versión vigente de su rutina.', inputSchema: { type: 'object', properties: { executionId: { type: 'string' }, confirm: { type: 'boolean' }, rename: { type: 'object' } }, required: ['executionId'] } },
  { name: 'events_ingest', description: 'Ingresa un evento real (correo/servicio): reanuda esperas y dispara rutinas.', inputSchema: { type: 'object', properties: { event: { type: 'object' } }, required: ['event'] } },
  { name: 'sources_register', description: 'Registra una fuente de eventos del usuario (email/webhook) y devuelve su token.', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['email', 'webhook'] }, config: { type: 'object' } }, required: ['type'] } },
  { name: 'sources_list', description: 'Fuentes del usuario.', inputSchema: { type: 'object', properties: {} } },
  { name: 'sources_remove', description: 'Elimina una fuente del usuario.', inputSchema: { type: 'object', properties: { sourceId: { type: 'string' } }, required: ['sourceId'] } },
  { name: 'dispatcher_dispatch', description: 'Despacha bajo bloqueo (solo el titular ejecuta el tick).', inputSchema: { type: 'object', properties: { name: { type: 'string' }, owner: { type: 'string' }, ttlMs: { type: 'number' }, now: { type: 'string' }, events: { type: 'array' } } } },
]

function mapRoutines(name, args, ctx) {
  const { userId } = ctx
  switch (name) {
    case 'routines_create': {
      const { userId: _u, companyId: _c, ownerId: _o, ...rest } = args
      return ['routines.create', { ...rest, ownerId: userId }]
    }
    case 'routines_get': return ['routines.get', { routineId: args.routineId }]
    case 'routines_list': return ['routines.list', { spaceId: args.spaceId, ownerId: args.ownerId, status: args.status }]
    case 'routines_update': return ['routines.update', { routineId: args.routineId, patch: args.patch || args }]
    case 'routines_validate': return ['routines.validate', { routineId: args.routineId }]
    case 'routines_activate': return ['routines.activate', { routineId: args.routineId }]
    case 'routines_pause': return ['routines.pause', { routineId: args.routineId }]
    case 'executions_start': return ['executions.start', { routineId: args.routineId, trigger: args.trigger, context: args.context || {}, idempotencyKey: args.idempotencyKey || null, sources: args.sources || [] }]
    case 'executions_get': return ['executions.get', { executionId: args.executionId }]
    case 'executions_list': return ['executions.list', { status: args.status, routineId: args.routineId }]
    case 'executions_advance': return ['executions.advance', { executionId: args.executionId }]
    case 'executions_resume': return ['executions.resume', { executionId: args.executionId, event: args.event }]
    case 'executions_tick': return ['executions.tick', { now: args.now, events: args.events || [] }]
    case 'executions_effects': return ['executions.effects', { executionId: args.executionId }]
    case 'executions_preview_migration': return ['executions.previewMigration', { executionId: args.executionId, rename: args.rename || {} }]
    case 'executions_migrate': return ['executions.migrate', { executionId: args.executionId, confirm: args.confirm !== false, rename: args.rename || {} }]
    case 'events_ingest': return ['events.ingest', { event: args.event || args, userId: args.userId || undefined }]
    case 'sources_register': return ['sources.register', { userId, type: args.type, config: args.config || {}, token: args.token || null }]
    case 'sources_list': return ['sources.list', { userId }]
    case 'sources_remove': return ['sources.remove', { sourceId: args.sourceId, userId }]
    case 'dispatcher_dispatch': return ['dispatcher.dispatch', { name: args.name || 'dispatcher', owner: args.owner || userId, ttlMs: args.ttlMs, now: args.now, events: args.events || [] }]
    default: return null
  }
}

function mapTool(name, args, ctx) {
  const { userId, companyId } = ctx
  const common = companyId ? { userId, companyId } : { userId }
  switch (name) {
    case 'spaces_create': {
      const { userId: _u, companyId: _c, ownerId, ...rest } = args
      return ['spaces.create', { ...rest, ownerId: ownerId || userId, companyId }]
    }
    case 'spaces_get':
      return ['spaces.get', { ...common, spaceId: args.spaceId }]
    case 'spaces_list':
      return ['spaces.list', common]
    case 'spaces_update': {
      const { spaceId, userId: _ignored, companyId: _c, ...patch } = args
      return ['spaces.update', { ...common, spaceId, patch }]
    }
    case 'spaces_add_member':
      return ['spaces.addMember', { ...common, spaceId: args.spaceId, memberId: args.memberId, role: args.role || 'editor' }]
    case 'spaces_remove_member':
      return ['spaces.removeMember', { ...common, spaceId: args.spaceId, memberId: args.memberId }]
    case 'spaces_set_member_role':
      return ['spaces.setMemberRole', { ...common, spaceId: args.spaceId, memberId: args.memberId, role: args.role }]
    case 'spaces_link_conversation':
      return ['spaces.linkConversation', { ...common, spaceId: args.spaceId, conversationId: args.conversationId, content: args.content, title: args.title, sensitive: args.sensitive }]
    case 'spaces_link_file': {
      // El contenido de archivo viaja en base64; el servicio guarda bytes.
      const content = typeof args.content === 'string' ? Buffer.from(args.content, 'base64') : args.content
      return ['spaces.linkFile', { ...common, spaceId: args.spaceId, fileRef: args.fileRef, content, fileName: args.fileName, mediaType: args.mediaType, title: args.title, sensitive: args.sensitive }]
    }
    case 'spaces_unlink':
      return ['spaces.unlink', { ...common, spaceId: args.spaceId, linkId: args.linkId }]
    case 'spaces_list_links':
      return ['spaces.listLinks', { ...common, spaceId: args.spaceId }]
    case 'spaces_read_link_content':
      return ['spaces.readLinkContent', { ...common, spaceId: args.spaceId, linkId: args.linkId }]
    case 'spaces_effective_context':
      return ['spaces.effectiveContext', { ...common, spaceId: args.spaceId }]
    case 'spaces_personal':
      return ['spaces.personal', { ...common, spaceId: args.spaceId }]
    case 'spaces_preview_link':
      return ['spaces.previewLink', { ...common, targetSpaceId: args.targetSpaceId, material: args.material || [] }]
    case 'spaces_resolve_workdir':
      return ['spaces.resolveWorkdir', { ...common, spaceId: args.spaceId }]
    default:
      return null
  }
}

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

function toolResponse(id, out) {
  if (!out.ok) {
    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `${out.error.code}: ${out.error.message}` }], isError: true } }
  }
  return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(out.data) }], isError: false } }
}

export function createMcpServer({ service, agentsService, routinesService, defaultUserId = process.env.FABERLOOM_USER_ID || 'anon' } = {}) {
  if (!service && !agentsService && !routinesService) throw new Error('createMcpServer requiere al menos un servicio')
  const tools = [
    ...(service ? SPACES_TOOLS : []),
    ...(agentsService ? AGENTS_TOOLS : []),
    ...(routinesService ? ROUTINES_TOOLS : []),
  ]

  function handleMessage(msg) {
    const { id, method, params } = msg || {}

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: 'faberloom', version: '0.1.0' },
        },
      }
    }
    if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return null
    if (method === 'ping') return { jsonrpc: '2.0', id, result: {} }
    if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools } }

    if (method === 'tools/call') {
      const name = params?.name
      const args = params?.arguments || {}
      const ctx = { userId: args.userId || defaultUserId, companyId: args.companyId }
      let svc = null
      let mapped = null
      if (service && name && name.startsWith('spaces_')) {
        svc = service
        mapped = mapTool(name, args, ctx)
      } else if (agentsService && name && (name.startsWith('models_') || name.startsWith('templates_') || name.startsWith('agents_') || name.startsWith('tools_'))) {
        svc = agentsService
        mapped = mapAgents(name, args, ctx)
      } else if (routinesService && name && (name.startsWith('routines_') || name.startsWith('executions_') || name.startsWith('events_') || name.startsWith('sources_') || name.startsWith('dispatcher_'))) {
        svc = routinesService
        mapped = mapRoutines(name, args, ctx)
      }
      if (!mapped) return rpcError(id, -32602, `herramienta desconocida: ${name}`)
      const [operation, opParams] = mapped
      const out = svc.run(operation, opParams)
      // Soporta operaciones asíncronas (handlers async): devuelve la promesa.
      if (out && typeof out.then === 'function') return out.then((res) => toolResponse(id, res))
      return toolResponse(id, out)
    }

    return rpcError(id, -32601, `método no soportado: ${method}`)
  }

  function serveStdio(input = process.stdin, output = process.stdout) {
    let buffer = ''
    let chain = Promise.resolve()
    input.setEncoding('utf8')
    input.on('data', (chunk) => {
      buffer += chunk
      let at
      while ((at = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, at).trim()
        buffer = buffer.slice(at + 1)
        if (!line) continue
        let message
        try {
          message = JSON.parse(line)
        } catch {
          continue
        }
        // Encola para preservar el orden y esperar respuestas asíncronas.
        chain = chain.then(async () => {
          const response = await Promise.resolve(handleMessage(message))
          if (response) output.write(JSON.stringify(response) + '\n')
        })
      }
    })
  }

  return { tools, handleMessage, serveStdio }
}
