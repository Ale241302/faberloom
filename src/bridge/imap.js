import net from 'node:net'
import tls from 'node:tls'

import { parseMessage } from './mime.js'

/**
 * Cliente IMAP mínimo (sin dependencias) para el puente de correo.
 * Soporta LOGIN, SELECT, UID SEARCH UNSEEN, UID FETCH (BODY.PEEK[]) y STORE.
 * Pensado para sondeo periódico de un buzón por usuario.
 */
export class ImapClient {
  #opts
  #sock
  #buffer = Buffer.alloc(0)
  #tag = 0
  #waiters = []
  #greeting

  constructor({ host, port = 993, user, password, tls: useTls = true, timeoutMs = 20000 }) {
    if (!host || !user) throw new Error('ImapClient requiere host y user')
    this.#opts = { host, port, user, password, useTls, timeoutMs }
  }

  connect() {
    const { host, port, useTls, timeoutMs } = this.#opts
    return new Promise((resolve, reject) => {
      const sock = useTls ? tls.connect({ host, port, servername: host }) : net.connect({ host, port })
      this.#sock = sock
      sock.setTimeout(timeoutMs, () => sock.destroy(new Error('imap: timeout')))
      const onError = (e) => reject(e)
      sock.once('error', onError)
      sock.on('data', (chunk) => this.#onData(chunk))
      sock.once(useTls ? 'secureConnect' : 'connect', () => {
        sock.off('error', onError)
        sock.on('error', (e) => this.#failAll(e))
        this.#greeting = { tag: null, lines: [], literals: [], resolve, reject }
        this.#waiters.push(this.#greeting)
        this.#pump()
      })
    })
  }

  async login() {
    const { user, password } = this.#opts
    await this.#command(`LOGIN ${quote(user)} ${quote(password)}`)
    return this
  }

  async select(mailbox = 'INBOX') {
    const res = await this.#command(`SELECT ${quote(mailbox)}`)
    return res
  }

  async searchUnseen() {
    const res = await this.#command('UID SEARCH UNSEEN')
    const line = res.lines.find((l) => l.startsWith('* SEARCH'))
    if (!line) return []
    return line.split(/\s+/).slice(2).filter(Boolean)
  }

  /** Devuelve [{ uid, raw }] de los mensajes no vistos. */
  async fetchUnseen() {
    const uids = await this.searchUnseen()
    if (!uids.length) return []
    const res = await this.#command(`UID FETCH ${uids.join(',')} (UID BODY.PEEK[])`)
    const out = []
    let literalIndex = 0
    for (const line of res.lines) {
      const m = /^\* \d+ FETCH \(UID (\d+)/.exec(line)
      if (!m) continue
      if (/\{(\d+)\}$/.test(line)) {
        const raw = res.literals[literalIndex++]
        if (raw) out.push({ uid: m[1], raw })
      }
    }
    return out
  }

  async markSeen(uids) {
    if (!uids.length) return
    await this.#command(`UID STORE ${uids.join(',')} +FLAGS (\\Seen)`)
  }

  close() {
    if (!this.#sock) return
    try {
      this.#sock.write('a99 LOGOUT\r\n')
    } catch {
      /* noop */
    }
    try {
      this.#sock.end()
    } catch {
      /* noop */
    }
    this.#sock = null
  }

  #command(str) {
    const tag = `a${++this.#tag}`
    return new Promise((resolve, reject) => {
      const w = { tag, lines: [], literals: [], resolve, reject }
      this.#waiters.push(w)
      this.#sock.write(`${tag} ${str}\r\n`)
      this.#pump()
    })
  }

  #onData(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk])
    this.#pump()
  }

  #pump() {
    while (this.#waiters.length) {
      const w = this.#waiters[0]
      const idx = this.#buffer.indexOf('\r\n')
      if (idx === -1) return
      const line = this.#buffer.slice(0, idx).toString('utf8')
      const lit = /\{(\d+)\}$/.exec(line)
      if (lit) {
        const n = Number(lit[1])
        if (this.#buffer.length < idx + 2 + n + 2) return // falta el literal + CRLF
        w.lines.push(line)
        w.literals.push(this.#buffer.slice(idx + 2, idx + 2 + n))
        this.#buffer = this.#buffer.slice(idx + 2 + n + 2)
        continue
      }
      this.#buffer = this.#buffer.slice(idx + 2)
      w.lines.push(line)
      if (w.tag === null) {
        this.#waiters.shift()
        w.resolve({ lines: w.lines })
      } else if (line.startsWith(`${w.tag} `)) {
        this.#waiters.shift()
        w.resolve({ lines: w.lines, literals: w.literals })
      }
    }
  }

  #failAll(err) {
    while (this.#waiters.length) this.#waiters.shift().reject(err)
  }
}

function quote(s) {
  return `"${String(s).replace(/(["\\])/g, '\\$1')}"`
}

/** Convierte un mensaje crudo (RFC822) en un evento; guarda adjuntos como blobs. */
export function messageToEvent(raw, { source = 'email', mailbox = null, blobStore = null } = {}) {
  const msg = parseMessage(raw)
  const headers = msg.headers
  const attachments = (msg.attachments || []).map((a) => {
    const base = { fileName: a.fileName, mediaType: a.mediaType, size: a.content.length }
    if (!blobStore) return base
    const put = blobStore.put(a.content, { mediaType: a.mediaType })
    return { ...base, sha256: put.sha256, ref: put.ref }
  })
  return {
    type: 'event',
    source,
    id: headers['message-id'] || null,
    from: headers.from || null,
    subject: headers.subject || null,
    mailbox,
    receivedAt: headers.date || undefined,
    data: { from: headers.from || null, subject: headers.subject || null, body: msg.text, attachments },
  }
}

/** Sondea un buzón y devuelve los eventos de los mensajes no vistos. */
export async function pollMailbox(config, { blobStore = null } = {}) {
  const client = new ImapClient(config)
  await client.connect()
  try {
    await client.login()
    await client.select(config.mailbox || 'INBOX')
    const messages = await client.fetchUnseen()
    const events = messages.map((m) => messageToEvent(m.raw, { source: config.source || 'email', mailbox: config.mailbox || 'INBOX', blobStore }))
    if (config.markSeen !== false && messages.length) await client.markSeen(messages.map((m) => m.uid))
    return events
  } finally {
    client.close()
  }
}
