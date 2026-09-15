import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

import { S3BlobStore } from './s3.js'

/**
 * Almacenamiento de contenido de los vínculos (archivos y conversaciones).
 *
 * Contrato: `put(data, meta) -> { ref, size, sha256 }`, `get(ref) -> { buf, size,
 * sha256, mediaType } | null`, `delete(ref)`.
 */

export class MemoryBlobStore {
  #map = new Map()
  put(data, meta = {}) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
    const sha256 = createHash('sha256').update(buf).digest('hex')
    const ref = `ref_${randomUUID()}`
    this.#map.set(ref, { buf, sha256, size: buf.length, mediaType: meta.mediaType ?? null })
    return { ref, size: buf.length, sha256 }
  }
  get(ref) {
    const e = this.#map.get(ref)
    return e ? { ...e, buf: Buffer.from(e.buf) } : null
  }
  delete(ref) {
    this.#map.delete(ref)
  }
}

export class FsBlobStore {
  #dir
  constructor(dir) {
    if (!dir) throw new Error('FsBlobStore requiere un directorio')
    this.#dir = dir
    fs.mkdirSync(dir, { recursive: true })
  }

  #file(ref) {
    return path.join(this.#dir, String(ref).replace(/[^a-zA-Z0-9_.-]/g, '_'))
  }

  put(data, meta = {}) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
    const sha256 = createHash('sha256').update(buf).digest('hex')
    const ref = `ref_${randomUUID()}`
    fs.writeFileSync(this.#file(ref), buf)
    fs.writeFileSync(`${this.#file(ref)}.json`, JSON.stringify({ sha256, size: buf.length, mediaType: meta.mediaType ?? null }))
    return { ref, size: buf.length, sha256 }
  }

  get(ref) {
    try {
      const buf = fs.readFileSync(this.#file(ref))
      let meta = {}
      try {
        meta = JSON.parse(fs.readFileSync(`${this.#file(ref)}.json`, 'utf8'))
      } catch {
        /* sin metadatos */
      }
      return { buf, sha256: meta.sha256 ?? createHash('sha256').update(buf).digest('hex'), size: buf.length, mediaType: meta.mediaType ?? null }
    } catch {
      return null
    }
  }

  delete(ref) {
    try {
      fs.unlinkSync(this.#file(ref))
    } catch {
      /* noop */
    }
    try {
      fs.unlinkSync(`${this.#file(ref)}.json`)
    } catch {
      /* noop */
    }
  }
}

export function blobStoreFromEnv(env = process.env) {
  const kind = (env.FABERLOOM_BLOB_STORE || (env.FABERLOOM_BLOB_DIR ? 'fs' : 'memory')).toLowerCase()
  if (kind === 's3') {
    return new S3BlobStore({
      endpoint: env.FABERLOOM_S3_ENDPOINT,
      bucket: env.FABERLOOM_S3_BUCKET,
      accessKey: env.FABERLOOM_S3_ACCESS_KEY,
      secretKey: env.FABERLOOM_S3_SECRET_KEY,
      region: env.FABERLOOM_S3_REGION || 'us-east-1',
    })
  }
  if (kind === 'fs') return new FsBlobStore(env.FABERLOOM_BLOB_DIR)
  return new MemoryBlobStore()
}
