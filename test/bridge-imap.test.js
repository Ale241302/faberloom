import { test } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'

import { pollMailbox, messageToEvent } from '../src/bridge/imap.js'
import { parseMessage } from '../src/bridge/mime.js'
import { MemoryBlobStore } from '../src/store/blob.js'

function startFakeImap() {
  const messages = [
    { uid: '101', raw: 'From: cliente@x.com\r\nSubject: Orden de Compra 1\r\nMessage-ID: <m1@x>\r\n\r\ncuerpo 1' },
    { uid: '102', raw: 'From: otro@y.com\r\nSubject: spam\r\nMessage-ID: <m2@y>\r\n\r\ncuerpo 2' },
  ]
  const server = net.createServer((sock) => {
    sock.write('* OK IMAP4rev1 ready\r\n')
    let buf = ''
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8')
      let idx
      while ((idx = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        const tag = line.split(' ')[0]
        const rest = line.slice(tag.length + 1)
        if (/^LOGIN /i.test(rest)) sock.write(`${tag} OK LOGIN completed\r\n`)
        else if (/^SELECT /i.test(rest)) sock.write(`* 2 EXISTS\r\n${tag} OK [READ-WRITE] SELECT completed\r\n`)
        else if (/^UID SEARCH UNSEEN/i.test(rest)) sock.write(`* SEARCH 101 102\r\n${tag} OK SEARCH completed\r\n`)
        else if (/^UID FETCH /i.test(rest)) {
          let out = ''
          messages.forEach((m, i) => {
            out += `* ${i + 1} FETCH (UID ${m.uid} BODY[] {${Buffer.byteLength(m.raw)}}\r\n${m.raw}\r\n)\r\n`
          })
          sock.write(`${out}${tag} OK FETCH completed\r\n`)
        } else if (/^UID STORE /i.test(rest)) sock.write(`${tag} OK STORE completed\r\n`)
        else if (/^LOGOUT/i.test(rest)) sock.write(`* BYE\r\n${tag} OK LOGOUT completed\r\n`)
        else sock.write(`${tag} OK\r\n`)
      }
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })))
}

test('imap: sondea no vistos y los convierte en eventos', async () => {
  const { server, port } = await startFakeImap()
  try {
    const events = await pollMailbox({ host: '127.0.0.1', port, user: 'u', password: 'p', tls: false, mailbox: 'INBOX', markSeen: true })
    assert.equal(events.length, 2)
    assert.equal(events[0].source, 'email')
    assert.match(events[0].from, /cliente@x\.com/)
    assert.match(events[0].subject, /Orden de Compra/)
    assert.equal(events[0].id, '<m1@x>')
    assert.equal(events[0].data.body, 'cuerpo 1')
  } finally {
    server.close()
  }
})

test('imap: messageToEvent parsea cabeceras y cuerpo', () => {
  const ev = messageToEvent('From: a@b\r\nSubject: Hola\r\nMessage-ID: <x>\r\n\r\ncuerpo')
  assert.equal(ev.from, 'a@b')
  assert.equal(ev.subject, 'Hola')
  assert.equal(ev.id, '<x>')
  assert.equal(ev.data.body, 'cuerpo')
})

test('mime: extrae texto y adjunto (base64) como blob', () => {
  const pdf = Buffer.from('PDFDATA').toString('base64')
  const raw = [
    'From: cliente@x.com',
    'Subject: Con adjunto',
    'Message-ID: <m9@x>',
    'Content-Type: multipart/mixed; boundary="BOUND"',
    '',
    '--BOUND',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'cuerpo texto',
    '--BOUND',
    'Content-Type: application/pdf; name="oc.pdf"',
    'Content-Disposition: attachment; filename="oc.pdf"',
    'Content-Transfer-Encoding: base64',
    '',
    pdf,
    '--BOUND--',
    '',
  ].join('\r\n')

  const parsed = parseMessage(raw)
  assert.equal(parsed.text.trim(), 'cuerpo texto')
  assert.equal(parsed.attachments.length, 1)

  const blob = new MemoryBlobStore()
  const ev = messageToEvent(raw, { blobStore: blob })
  assert.equal(ev.subject, 'Con adjunto')
  assert.equal(ev.data.body.trim(), 'cuerpo texto')
  const att = ev.data.attachments[0]
  assert.equal(att.fileName, 'oc.pdf')
  assert.equal(att.mediaType, 'application/pdf')
  assert.equal(blob.get(att.ref).buf.toString('utf8'), 'PDFDATA')
})
