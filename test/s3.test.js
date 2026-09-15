import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

import { S3BlobStore, signRequest } from '../src/store/s3.js'

const FAKE = `
const http = require('http');
const store = new Map();
const srv = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    if (req.method === 'PUT') { store.set(req.url, body); res.writeHead(200); res.end(); }
    else if (req.method === 'GET') { if (store.has(req.url)) { res.writeHead(200); res.end(store.get(req.url)); } else { res.writeHead(404); res.end(); } }
    else if (req.method === 'DELETE') { store.delete(req.url); res.writeHead(204); res.end(); }
    else { res.writeHead(400); res.end(); }
  });
});
srv.listen(0, '127.0.0.1', () => process.stdout.write('PORT ' + srv.address().port + '\\n'));
`

test('s3: firma SigV4 determinista con el formato esperado', () => {
  const args = {
    accessKey: 'AKID',
    secretKey: 'SECRET',
    region: 'us-east-1',
    method: 'GET',
    path: '/b/ref',
    host: 'minio:9000',
    amzDate: '20260915T000000Z',
    payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  }
  const a = signRequest(args)
  const b = signRequest(args)
  assert.equal(a.signature, b.signature)
  assert.match(a.signature, /^[0-9a-f]{64}$/)
  assert.match(a.canonicalRequest, /^GET\n\/b\/ref\n\nhost:minio:9000/m)
  assert.match(a.stringToSign, /AWS4-HMAC-SHA256/)
})

test('s3: put/get/delete contra un S3 falso', async () => {
  const server = spawn(process.execPath, ['-e', FAKE], { stdio: ['ignore', 'pipe', 'inherit'] })
  const port = await new Promise((resolve, reject) => {
    let buf = ''
    const timer = setTimeout(() => reject(new Error('timeout del S3 falso')), 5000)
    server.stdout.on('data', (d) => {
      buf += d
      const m = buf.match(/PORT (\d+)/)
      if (m) {
        clearTimeout(timer)
        resolve(Number(m[1]))
      }
    })
    server.on('error', reject)
  })

  try {
    const store = new S3BlobStore({ endpoint: `http://127.0.0.1:${port}`, bucket: 'b', accessKey: 'a', secretKey: 's' })
    const put = store.put(Buffer.from('contenido'), { mediaType: 'text/plain' })
    assert.equal(put.size, 9)
    assert.match(put.sha256, /^[0-9a-f]{64}$/)

    const got = store.get(put.ref)
    assert.equal(got.buf.toString('utf8'), 'contenido')
    assert.equal(got.size, 9)
    assert.equal(got.mediaType, 'text/plain')

    store.delete(put.ref)
    assert.equal(store.get(put.ref), null)
  } finally {
    server.kill()
  }
})
