import { execFileSync } from 'node:child_process'
import { createHash, createHmac, randomUUID } from 'node:crypto'

/**
 * Almacén de blobs en S3/MinIO, sin dependencias.
 *
 * Se mantiene el contrato SÍNCRONO de los demás BlobStore (`put/get/delete`)
 * resolviendo cada operación con un proceso Node hijo que hace la petición HTTP
 * (`execFileSync`). La firma AWS SigV4 se calcula aquí y viaja en cabeceras.
 */

const sha256hex = (data) => createHash('sha256').update(data).digest('hex')
const hmac = (key, data) => createHmac('sha256', key).update(data).digest()

const CHILD = `
const spec = JSON.parse(process.argv[process.argv.length - 1]);
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', async () => {
  try {
    const body = spec.method === 'PUT' ? Buffer.concat(chunks) : undefined;
    const r = await fetch(spec.url, { method: spec.method, headers: spec.headers, body });
    if (r.status === 404) process.exit(4);
    if (!r.ok) { process.stderr.write('S3 ' + r.status + ' ' + spec.method); process.exit(3); }
    const ab = await r.arrayBuffer();
    if (ab.byteLength) process.stdout.write(Buffer.from(ab));
  } catch (e) {
    process.exit(5);
  }
});
`

export class S3BlobStore {
  constructor({ endpoint, bucket, accessKey, secretKey, region = 'us-east-1' } = {}) {
    if (!endpoint || !bucket || !accessKey || !secretKey) {
      throw new Error('S3BlobStore requiere endpoint, bucket, accessKey y secretKey')
    }
    this.endpoint = String(endpoint).replace(/\/+$/, '')
    this.bucket = bucket
    this.accessKey = accessKey
    this.secretKey = secretKey
    this.region = region
    this.#ensureBucket()
  }

  put(data, meta = {}) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
    const sha256 = sha256hex(buf)
    const ref = `ref_${randomUUID()}`
    this.#request('PUT', ref, buf)
    this.#request('PUT', `${ref}.meta.json`, Buffer.from(JSON.stringify({ sha256, size: buf.length, mediaType: meta.mediaType ?? null })))
    return { ref, size: buf.length, sha256 }
  }

  get(ref) {
    let buf
    try {
      buf = this.#request('GET', ref)
    } catch {
      return null
    }
    let meta = {}
    try {
      meta = JSON.parse(this.#request('GET', `${ref}.meta.json`).toString('utf8'))
    } catch {
      /* sin metadatos */
    }
    return { buf, sha256: meta.sha256 ?? sha256hex(buf), size: buf.length, mediaType: meta.mediaType ?? null }
  }

  delete(ref) {
    for (const key of [ref, `${ref}.meta.json`]) {
      try {
        this.#request('DELETE', key)
      } catch {
        /* noop */
      }
    }
  }

  // ── Internos ───────────────────────────────────────────────────────
  #ensureBucket() {
    try {
      this.#request('PUT', '', Buffer.alloc(0), `/${this.bucket}`)
    } catch {
      /* el bucket ya existe o MinIO aún no responde: se reintenta en el próximo put */
    }
  }

  #request(method, key, body, pathOverride) {
    const path = pathOverride ?? `/${this.bucket}/${key}`
    const url = `${this.endpoint}${path}`
    const payloadHash = sha256hex(body ?? '')
    const headers = this.#sign(method, path, payloadHash)
    const spec = JSON.stringify({ url, method, headers })
    try {
      return execFileSync(process.execPath, ['-e', CHILD, spec], {
        input: body ?? Buffer.alloc(0),
        maxBuffer: 256 * 1024 * 1024,
      })
    } catch (e) {
      if (e && e.status === 4) throw Object.assign(new Error('not found'), { notFound: true })
      throw new Error(`S3 ${method} ${path} falló${e && e.status ? ` (status ${e.status})` : ''}`)
    }
  }

  #sign(method, path, payloadHash) {
    const host = new URL(this.endpoint).host
    const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    const dateStamp = amzDate.slice(0, 8)
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n')
    const key = hmac(hmac(hmac(hmac(`AWS4${this.secretKey}`, dateStamp), this.region), 's3'), 'aws4_request')
    const signature = createHmac('sha256', key).update(stringToSign).digest('hex')
    return {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    }
  }
}

/** Firma SigV4 pura (para pruebas). */
export function signRequest({ accessKey, secretKey, region = 'us-east-1', method, path, host, amzDate, payloadHash }) {
  const dateStamp = amzDate.slice(0, 8)
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const scope = `${dateStamp}/${region}/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n')
  const key = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), 's3'), 'aws4_request')
  const signature = createHmac('sha256', key).update(stringToSign).digest('hex')
  return { canonicalRequest, stringToSign, signature }
}
