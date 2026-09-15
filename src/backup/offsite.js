import { spawnSync } from 'node:child_process'

/**
 * Copia offsite del respaldo con una herramienta externa.
 *
 * `FABERLOOM_BACKUP_OFFSITE_CMD` puede incluir `{file}` (se sustituye por la ruta
 * del respaldo temporal); si no, la ruta se añade al final. Ejemplos:
 *   rclone copy {file} offsite:faberloom-backups
 *   aws s3 cp {file} s3://mi-bucket/faberloom/
 *   restic backup {file}
 */
export function offsiteRunnerFromEnv(env = process.env) {
  const cmd = env.FABERLOOM_BACKUP_OFFSITE_CMD
  if (!cmd) return null
  return ({ file }) => {
    const command = cmd.includes('{file}') ? cmd.replaceAll('{file}', file) : `${cmd} ${file}`
    const res = spawnSync(command, { shell: true, encoding: 'utf8' })
    if (res.status === 0) return { ok: true, target: cmd }
    return { ok: false, error: ((res.stderr || res.stdout || '').trim()) || `exit ${res.status}` }
  }
}
