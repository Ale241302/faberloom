import fs from 'node:fs'
import path from 'node:path'

/** Repositorio en memoria (por defecto): no persiste entre procesos. */
export class MemoryRepository {
  #state = null
  read() {
    return this.#state
  }
  write(partial) {
    this.#state = { ...(this.#state || {}), ...partial }
  }
}

/**
 * Repositorio en archivo JSON con escritura atómica (temp + rename).
 * Síncrono a propósito en este primer corte; el backend definitivo se decide
 * después del inventario de persistencia del harness.
 */
export class JsonFileRepository {
  #file
  constructor(file) {
    if (!file) throw new Error('JsonFileRepository requiere una ruta de archivo')
    this.#file = file
  }
  read() {
    try {
      return JSON.parse(fs.readFileSync(this.#file, 'utf8'))
    } catch (e) {
      if (e && e.code === 'ENOENT') return null
      throw e
    }
  }
  write(partial) {
    const current = this.read() || {}
    const next = { ...current, ...partial }
    fs.mkdirSync(path.dirname(this.#file), { recursive: true })
    const tmp = `${this.#file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
    fs.renameSync(tmp, this.#file)
  }
  get file() {
    return this.#file
  }
}
