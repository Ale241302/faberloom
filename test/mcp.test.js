import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'

import { SpacesService } from '../src/spaces/index.js'
import { AgentsService } from '../src/agents/index.js'
import { RoutinesService } from '../src/routines/index.js'
import { createMcpServer } from '../src/mcp/server.js'

const fixedNow = () => '2026-09-15T00:00:00.000Z'
const seq = (prefix) => {
  let n = 0
  return () => `${prefix}${++n}`
}

function server() {
  const service = new SpacesService({ idGen: seq('id'), now: fixedNow })
  return createMcpServer({ service, defaultUserId: 'u1' })
}

test('MCP: initialize devuelve serverInfo', () => {
  const r = server().handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
  assert.equal(r.result.serverInfo.name, 'faberloom')
  assert.equal(r.result.protocolVersion, '2025-06-18')
})

test('MCP: tools/list expone las operaciones de Espacios', () => {
  const names = server().handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }).result.tools.map((t) => t.name)
  assert.ok(names.includes('spaces_create'))
  assert.ok(names.includes('spaces_effective_context'))
  assert.ok(names.includes('spaces_preview_link'))
})

test('MCP: tools/call usa el usuario por defecto', () => {
  const mcp = server()
  const created = mcp.handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'spaces_create', arguments: { name: 'Estudios' } } })
  assert.equal(created.result.isError, false)
  const space = JSON.parse(created.result.content[0].text)
  assert.equal(space.ownerId, 'u1')

  const got = mcp.handleMessage({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'spaces_get', arguments: { spaceId: space.id } } })
  assert.equal(JSON.parse(got.result.content[0].text).name, 'Estudios')
})

test('MCP: error de dominio llega como isError, no como excepción', () => {
  const r = server().handleMessage({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'spaces_get', arguments: { spaceId: 'no-existe' } } })
  assert.equal(r.result.isError, true)
  assert.match(r.result.content[0].text, /SPACE_NOT_FOUND/)
})

test('MCP: herramienta y método desconocidos', () => {
  const mcp = server()
  assert.equal(mcp.handleMessage({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'spaces_nope', arguments: {} } }).error.code, -32602)
  assert.equal(mcp.handleMessage({ jsonrpc: '2.0', id: 7, method: 'no/existe', params: {} }).error.code, -32601)
})

test('MCP: notificación no genera respuesta', () => {
  assert.equal(server().handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null)
})

test('MCP: expone Agentes y resuelve la política de modelo', () => {
  const service = new SpacesService({ idGen: seq('sp'), now: fixedNow })
  const agentsService = new AgentsService({ idGen: seq('ag'), now: fixedNow })
  const mcp = createMcpServer({ service, agentsService, defaultUserId: 'u1' })

  const names = mcp.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }).result.tools.map((t) => t.name)
  assert.ok(names.includes('agents_create'))
  assert.ok(names.includes('models_register'))

  mcp.handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'models_register', arguments: { id: 'mdl_a', provider: 'deepseek', name: 'chat', pricing: { input: 1, output: 2 } } } })
  const created = mcp.handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'agents_create', arguments: { name: 'Proformas', modelPolicy: { principal: 'mdl_a' } } } })
  const agent = JSON.parse(created.result.content[0].text)
  assert.equal(agent.ownerId, 'u1')

  const resolved = mcp.handleMessage({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'agents_resolve_model', arguments: { agentId: agent.id, task: {} } } })
  assert.equal(JSON.parse(resolved.result.content[0].text).modelId, 'mdl_a')
})

test('MCP: operación asíncrona se espera y resuelve', async () => {
  const service = new SpacesService({ idGen: seq('sp'), now: fixedNow })
  const agentsService = new AgentsService({ idGen: seq('ag'), now: fixedNow })
  agentsService.run('tools.register', { id: 'aupper', handler: async (input) => ({ text: String((input && input.text) || '').toUpperCase() }) })
  const mcp = createMcpServer({ service, agentsService, defaultUserId: 'u1' })

  const created = mcp.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'agents_create', arguments: { name: 'A', tools: ['aupper'] } } })
  const agent = JSON.parse(created.result.content[0].text)

  const pending = mcp.handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'agents_execute_tool', arguments: { agentId: agent.id, toolId: 'aupper', input: { text: 'hi' } } } })
  assert.equal(typeof pending.then, 'function')
  const res = await pending
  assert.equal(JSON.parse(res.result.content[0].text).output.text, 'HI')
})

test('MCP: expone Rutinas y ejecuta un recorrido', () => {
  const service = new SpacesService({ idGen: seq('sp'), now: fixedNow })
  const agentsService = new AgentsService({ idGen: seq('ag'), now: fixedNow })
  const routinesService = new RoutinesService({ idGen: seq('rt'), now: fixedNow })
  routinesService.registerStepHandler('noop', () => ({ output: 'ok' }))
  const mcp = createMcpServer({ service, agentsService, routinesService, defaultUserId: 'u1' })

  const names = mcp.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }).result.tools.map((t) => t.name)
  assert.ok(names.includes('routines_create'))
  assert.ok(names.includes('executions_start'))

  const created = mcp.handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'routines_create', arguments: { name: 'R', steps: [{ id: 'a', type: 'noop' }] } } })
  const routine = JSON.parse(created.result.content[0].text)
  mcp.handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'routines_activate', arguments: { routineId: routine.id } } })
  const started = mcp.handleMessage({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'executions_start', arguments: { routineId: routine.id } } })
  const ex = JSON.parse(started.result.content[0].text).execution
  const advanced = mcp.handleMessage({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'executions_advance', arguments: { executionId: ex.id } } })
  assert.equal(JSON.parse(advanced.result.content[0].text).status, 'completed')
})

test('MCP: serveStdio responde una línea JSON-RPC', async () => {
  const mcp = server()
  const input = new PassThrough()
  const output = new PassThrough()
  let out = ''
  output.on('data', (c) => {
    out += c
  })
  mcp.serveStdio(input, output)
  input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) + '\n')
  await new Promise((r) => setTimeout(r, 50))
  assert.match(out, /spaces_create/)
})
