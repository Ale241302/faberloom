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

const TOOLS = [
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

export function createMcpServer({ service, defaultUserId = process.env.FABERLOOM_USER_ID || 'anon' } = {}) {
  if (!service) throw new Error('createMcpServer requiere un SpacesService')

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
    if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } }

    if (method === 'tools/call') {
      const name = params?.name
      const args = params?.arguments || {}
      const mapped = mapTool(name, args, { userId: args.userId || defaultUserId, companyId: args.companyId })
      if (!mapped) return rpcError(id, -32602, `herramienta desconocida: ${name}`)
      const [operation, opParams] = mapped
      const out = service.run(operation, opParams)
      if (!out.ok) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `${out.error.code}: ${out.error.message}` }], isError: true } }
      }
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(out.data) }], isError: false } }
    }

    return rpcError(id, -32601, `método no soportado: ${method}`)
  }

  function serveStdio(input = process.stdin, output = process.stdout) {
    let buffer = ''
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
        const response = handleMessage(message)
        if (response) output.write(JSON.stringify(response) + '\n')
      }
    })
  }

  return { tools: TOOLS, handleMessage, serveStdio }
}
