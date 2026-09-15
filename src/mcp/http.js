import http from 'node:http'
import { randomUUID, timingSafeEqual } from 'node:crypto'

import { createMcpServer } from './server.js'

/**
 * Transporte MCP por HTTP (Streamable HTTP, subset práctico) sin dependencias.
 *
 * Identidad: cabecera `X-Faberloom-User-Id` (o `X-Forwarded-User-Email`) → usuario
 * de la operación. Si `FABERLOOM_GATEWAY_KEY` está definido, se exige
 * `X-Faberloom-Gateway-Key` (fail-closed), igual que el MCP de la consola.
 */

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const A = Buffer.from(a)
  const B = Buffer.from(b)
  return A.length === B.length && timingSafeEqual(A, B)
}

function sendJson(res, status, payload, headers = {}) {
  const body = payload === undefined ? '' : JSON.stringify(payload)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), ...headers })
  res.end(body)
}

export function createHttpHandler({ service, agentsService, routinesService, gatewayKey = '', defaultUserId = 'anon', sessions = new Map() } = {}) {
  if (!service && !agentsService && !routinesService) throw new Error('createHttpHandler requiere al menos un servicio')
  const mcp = createMcpServer({ service, agentsService, routinesService, defaultUserId })

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let data = ''
      req.setEncoding('utf8')
      req.on('data', (c) => {
        data += c
      })
      req.on('end', () => resolve(data))
      req.on('error', reject)
    })

  // La identidad de la cabecera manda sobre cualquier userId/companyId del cuerpo.
  const withContext = (message, userId, companyId) => {
    if (message && message.method === 'tools/call' && message.params) {
      const extra = companyId ? { userId, companyId } : { userId }
      message.params.arguments = { ...(message.params.arguments || {}), ...extra }
    }
    return message
  }

  return async function handler(req, res) {
    const url = new URL(req.url || '/', 'http://localhost')

    if (req.method === 'GET' && url.pathname === '/healthz') {
      return sendJson(res, 200, { ok: true, service: 'faberloom', spaces: true, sessions: sessions.size })
    }

    // Entrada de eventos reales (correo/servicio) que el host reenvía.
    if (url.pathname === '/events') {
      if (!routinesService) return sendJson(res, 404, { error: 'not_found' })
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST' })
        return res.end()
      }
      const adminKeyOk = !gatewayKey || safeEqual(req.headers['x-faberloom-gateway-key'] || '', gatewayKey)
      const auth = req.headers.authorization || ''
      const token = req.headers['x-faberloom-source-token'] || (auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null)
      let userId = null
      let tokenOk = false
      if (token) {
        const src = routinesService.resolveSourceByToken(token)
        if (src) {
          userId = src.userId
          tokenOk = true
        }
      }
      if (!adminKeyOk && !tokenOk) {
        return sendJson(res, 401, { error: 'unauthorized', code: 'AUTH' })
      }
      let payload
      try {
        payload = JSON.parse((await readBody(req)) || 'null')
      } catch {
        return sendJson(res, 400, { error: 'invalid_json' })
      }
      const event = Array.isArray(payload) ? payload[0] : payload
      const out = await Promise.resolve(routinesService.run('events.ingest', { event, userId }))
      return sendJson(res, 200, out.ok ? out.data : { error: out.error })
    }

    if (url.pathname !== '/mcp') return sendJson(res, 404, { error: 'not_found' })

    if (gatewayKey && !safeEqual(req.headers['x-faberloom-gateway-key'] || '', gatewayKey)) {
      return sendJson(res, 401, { error: 'unauthorized', code: 'GATEWAY_KEY' })
    }
    const userId = req.headers['x-faberloom-user-id'] || req.headers['x-forwarded-user-email'] || defaultUserId
    const companyId = req.headers['x-mwt-client-id'] || req.headers['x-faberloom-company-id'] || undefined

    if (req.method === 'GET') {
      res.writeHead(405, { allow: 'POST, DELETE' })
      return res.end()
    }
    if (req.method === 'DELETE') {
      const sid = req.headers['mcp-session-id']
      if (sid) sessions.delete(sid)
      res.writeHead(200)
      return res.end()
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { allow: 'POST, DELETE' })
      return res.end()
    }

    let payload
    try {
      payload = JSON.parse((await readBody(req)) || 'null')
    } catch {
      return sendJson(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } })
    }

    const messages = Array.isArray(payload) ? payload : [payload]
    const responses = []
    let newSession
    for (const message of messages) {
      if (message && message.method === 'initialize') newSession = randomUUID()
      const response = await Promise.resolve(mcp.handleMessage(withContext(message, userId, companyId)))
      if (response) responses.push(response)
    }

    const headers = newSession ? { 'mcp-session-id': newSession } : {}
    if (newSession) sessions.set(newSession, { userId, createdAt: Date.now() })
    if (!responses.length) {
      res.writeHead(202, headers)
      return res.end()
    }
    return sendJson(res, 200, responses.length === 1 ? responses[0] : responses, headers)
  }
}

export function startHttp({ service, agentsService, routinesService, gatewayKey, defaultUserId, port = Number(process.env.FABERLOOM_PORT || 8090), host = '0.0.0.0' } = {}) {
  const handler = createHttpHandler({ service, agentsService, routinesService, gatewayKey, defaultUserId })
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((e) => {
      process.stderr.write(`[faberloom-mcp-http] error: ${e?.message}\n`)
      if (!res.headersSent) sendJson(res, 500, { error: 'internal' })
      else res.destroy()
    })
  })
  server.listen(port, host, () => process.stderr.write(`[faberloom-mcp-http] escuchando en ${host}:${port}\n`))
  return server
}
