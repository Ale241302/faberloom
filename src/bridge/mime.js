/**
 * Parser MIME mínimo (sin dependencias) para extraer texto y adjuntos de un
 * mensaje RFC822. Soporta multipart (un nivel), base64 y quoted-printable.
 */

export function parseHeaders(text) {
  const headers = {}
  let current = null
  for (const line of String(text).split(/\r\n/)) {
    const m = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(line)
    if (m) {
      current = m[1].toLowerCase()
      headers[current] = m[2]
    } else if (current && /^\s/.test(line)) {
      headers[current] += ` ${line.trim()}`
    }
  }
  return headers
}

function decodeQuotedPrintable(str) {
  const bytes = []
  const s = str.replace(/=\r\n/g, '')
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /[0-9A-Fa-f]{2}/.test(s.slice(i + 1, i + 3))) {
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16))
      i += 2
    } else {
      bytes.push(s.charCodeAt(i) & 0xff)
    }
  }
  return Buffer.from(bytes)
}

function decodeBody(buf, encoding) {
  const enc = String(encoding || '').toLowerCase().trim()
  if (enc === 'base64') return Buffer.from(buf.toString('ascii').replace(/\s+/g, ''), 'base64')
  if (enc === 'quoted-printable') return decodeQuotedPrintable(buf.toString('utf8'))
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
}

function splitParts(buf, boundary) {
  const delim = Buffer.from(boundary)
  const parts = []
  let start = buf.indexOf(delim)
  if (start === -1) return parts
  let pos = start + delim.length
  while (pos < buf.length) {
    if (buf.slice(pos, pos + 2).toString() === '--') break
    const lineEnd = buf.indexOf('\r\n', pos)
    if (lineEnd === -1) break
    const bodyStart = lineEnd + 2
    const next = buf.indexOf(delim, bodyStart)
    if (next === -1) break
    let bodyEnd = next
    if (buf.slice(next - 2, next).toString() === '\r\n') bodyEnd = next - 2
    parts.push(buf.slice(bodyStart, bodyEnd))
    pos = next + delim.length
  }
  return parts
}

function filenameOf(headers) {
  const disp = headers['content-disposition'] || ''
  const ct = headers['content-type'] || ''
  const m =
    /filename\*?=(?:"([^"]*)"|([^;]+))/i.exec(disp) ||
    /name\*?=(?:"([^"]*)"|([^;]+))/i.exec(ct)
  if (!m) return null
  let name = (m[1] || m[2] || '').trim()
  if (/utf-8''/i.test(name)) name = decodeURIComponent(name.split("''").pop())
  return name || null
}

export function parseMessage(raw) {
  const text = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw))
  const sep = text.indexOf('\r\n\r\n')
  const headText = sep === -1 ? text.toString('utf8') : text.slice(0, sep).toString('utf8')
  const body = sep === -1 ? Buffer.alloc(0) : text.slice(sep + 4)
  const headers = parseHeaders(headText)
  const ctype = headers['content-type'] || 'text/plain'
  const m = /multipart\/[a-z]+\s*;\s*boundary="?([^";]+)"?/i.exec(ctype)
  if (!m) {
    return { headers, text: decodeBody(body, headers['content-transfer-encoding']).toString('utf8'), attachments: [] }
  }
  const parts = splitParts(body, `--${m[1]}`)
  const attachments = []
  let mainText = ''
  for (const part of parts) {
    const psep = part.indexOf('\r\n\r\n')
    const pheaders = parseHeaders(psep === -1 ? part.toString('utf8') : part.slice(0, psep).toString('utf8'))
    const pbody = psep === -1 ? Buffer.alloc(0) : part.slice(psep + 4)
    const decoded = decodeBody(pbody, pheaders['content-transfer-encoding'])
    const pct = (pheaders['content-type'] || 'text/plain').split(';')[0].trim().toLowerCase()
    const fileName = filenameOf(pheaders)
    const isAttachment = !!fileName || /attachment/i.test(pheaders['content-disposition'] || '')
    if (isAttachment) attachments.push({ fileName, mediaType: pct || 'application/octet-stream', content: decoded })
    else if (pct === 'text/plain' && !mainText) mainText = decoded.toString('utf8')
  }
  return { headers, text: mainText, attachments }
}
