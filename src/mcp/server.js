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
        members: { type: 'array', items: { type: 'string' } },
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
        members: { type: 'array', items: { type: 'string' } },
        context: { type: 'array', items: { type: 'object', properties: CH, required: ['key'] } },
        excluded: { type: 'array', items: { type: 'string' } },
      },
      required: ['spaceId'],
    },
  },
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

function mapTool(name, args, userId) {
  switch (name) {
    case 'spaces_create':
      return ['spaces.create', { ...args, ownerId: args.ownerId || userId }]
    case 'spaces_get':
      return ['spaces.get', { spaceId: args.spaceId, userId }]
    case 'spaces_list':
      return ['spaces.list', { userId }]
    case 'spaces_update': {
      const { spaceId, ...patch } = args
      return ['spaces.update', { spaceId, userId, patch }]
    }
    case 'spaces_effective_context':
      return ['spaces.effectiveContext', { spaceId: args.spaceId, userId }]
    case 'spaces_personal':
      return ['spaces.personal', { userId, spaceId: args.spaceId }]
    case 'spaces_preview_link':
      return ['spaces.previewLink', { userId, targetSpaceId: args.targetSpaceId, material: args.material || [] }]
    case 'spaces_resolve_workdir':
      return ['spaces.resolveWorkdir', { spaceId: args.spaceId, userId }]
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
      const mapped = mapTool(name, args, args.userId || defaultUserId)
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
