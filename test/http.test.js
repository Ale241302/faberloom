import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { SpacesService } from '../src/spaces/index.js'
import { createHttpHandler } from '../src/mcp/http.js'

function newService() {
  let n = 0
  return new SpacesService({ idGen: () => `id${++n}`, now: () => '2026-09-15T00:00:00.000Z' })
}

async function withServer(opts, fn) {
  const handler = createHttpHandler({ service: newService(), ...opts })
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch(() => res.destroy())
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    return await fn(base)
  } finally {
    await new Promise((r) => server.close(r))
  }
}

async function rpc(base, body, headers = {}) {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null }
}

const call = (body) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: body })

test('HTTP MCP: initialize asigna sesión y tools/list responde', async () => {
  await withServer({}, async (base) => {
    const init = await rpc(base, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }, { 'x-faberloom-user-id': 'alice' })
    assert.equal(init.status, 200)
    assert.equal(init.json.result.serverInfo.name, 'faberloom')
    assert.ok(init.headers.get('mcp-session-id'))

    const list = await rpc(base, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, { 'x-faberloom-user-id': 'alice' })
    assert.ok(list.json.result.tools.some((t) => t.name === 'spaces_add_member'))
  })
})

test('HTTP MCP: la identidad de la cabecera es el usuario', async () => {
  await withServer({}, async (base) => {
    const created = await rpc(base, call({ name: 'spaces_create', arguments: { name: 'Estudios' } }), { 'x-faberloom-user-id': 'alice' })
    const space = JSON.parse(created.json.result.content[0].text)
    assert.equal(space.ownerId, 'alice')
  })
})

test('HTTP MCP: ACL por rol end-to-end', async () => {
  await withServer({}, async (base) => {
    const created = await rpc(
      base,
      call({ name: 'spaces_create', arguments: { name: 'X', members: [{ userId: 'carol', role: 'viewer' }] } }),
      { 'x-faberloom-user-id': 'alice' },
    )
    const space = JSON.parse(created.json.result.content[0].text)

    const denied = await rpc(base, call({ name: 'spaces_update', arguments: { spaceId: space.id, name: 'Y' } }), { 'x-faberloom-user-id': 'carol' })
    assert.equal(denied.json.result.isError, true)
    assert.match(denied.json.result.content[0].text, /FORBIDDEN/)

    const visible = await rpc(base, call({ name: 'spaces_get', arguments: { spaceId: space.id } }), { 'x-faberloom-user-id': 'carol' })
    assert.equal(visible.json.result.isError, false)
  })
})

test('HTTP MCP: X-MWT-Client-ID se usa como empresa', async () => {
  await withServer({}, async (base) => {
    const created = await rpc(
      base,
      call({ name: 'spaces_create', arguments: { name: 'Sondel' } }),
      { 'x-faberloom-user-id': 'alice', 'x-mwt-client-id': 'sondel' },
    )
    const space = JSON.parse(created.json.result.content[0].text)
    assert.equal(space.companyId, 'sondel')

    const other = await rpc(base, call({ name: 'spaces_get', arguments: { spaceId: space.id } }), { 'x-faberloom-user-id': 'alice', 'x-mwt-client-id': 'otra' })
    assert.equal(other.json.result.isError, true)
    assert.match(other.json.result.content[0].text, /ACCESS_DENIED/)
  })
})

test('HTTP MCP: gateway key obligatoria si está configurada', async () => {
  await withServer({ gatewayKey: 'k1' }, async (base) => {
    assert.equal((await rpc(base, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })).status, 401)
    assert.equal((await rpc(base, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, { 'x-faberloom-gateway-key': 'k1' })).status, 200)
  })
})

test('HTTP: healthz y notificación 202', async () => {
  await withServer({}, async (base) => {
    assert.equal((await fetch(`${base}/healthz`)).status, 200)
    const note = await rpc(base, { jsonrpc: '2.0', method: 'notifications/initialized' }, { 'x-faberloom-user-id': 'alice' })
    assert.equal(note.status, 202)
  })
})
