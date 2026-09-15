# E8 · Operación permanente, respaldo y actualizaciones

**Fecha:** 15 de septiembre de 2026. **Estado:** respaldo/restauración
implementados (`src/backup/index.js`), integrados en el MCP y con CLI; el resto es
operación documentada del despliegue.

## 1. Continuidad

- El proceso `faberloom-mcp` mantiene el estado en **SQLite** (`/data/spaces.sqlite`)
  y el contenido en el **almacén de blobs** (MinIO/S3 o fs). Cerrar el cliente o
  reiniciar el proceso no pierde trabajo: los `dsh` y los clientes se reconectan.
- El **despachador** (`FABERLOOM_DISPATCH_MS`) avanza pendientes y reanuda esperas
  bajo **bloqueo** (`dispatcher.dispatch`), de modo que varios despachadores no
  procesan la misma cola. Las ejecuciones interrumpidas con efecto se
  **reconcilian** antes de repetir (`reconcileType`), y el libro de efectos evita
  duplicados.
- El **puente de correo** (`faberloom-bridge`) entrega eventos; el trabajo
  pendiente queda en el estado persistente, no en la conversación efímera.

## 2. Respaldo de conocimiento

`backup.export` serializa **todo** el estado (espacios, enlaces, modelos, agentes,
selecciones, ejecuciones de agente, evidencia, rutinas, ejecuciones, efectos,
fuentes, mesa, enseñanzas, usos, desempeño y concesiones) con un **manifiesto**
(versión, conteos por sección y `sha256`). Se guarda en el almacén externo.

- **Cifrado**: si `FABERLOOM_BACKUP_KEY` (32 bytes hex) está definido, el respaldo
  se cifra con **AES-256-GCM**. La clave va **fuera** del respaldo y se gestiona
  como secreto.
- `backup.list` / `backup.verify` (hash + manifiesto) / `backup.verifyLatest` /
  `backup.previewRestore`.
- **Copia offsite con herramienta externa:** `FABERLOOM_BACKUP_OFFSITE_CMD` se
  ejecuta tras exportar con la ruta del respaldo (`{file}`):
  `rclone copy {file} offsite:faberloom-backups`, `aws s3 cp {file} s3://…`,
  `restic backup {file}`, etc. El resultado (`ok`/`error`) queda en el registro. Un
  fallo offsite **no** impide el respaldo local.
- `backup.exportToFile` escribe el respaldo a un archivo para que lo suba una
  herramienta externa.
- CLI: `npm run backup -- export|export-to-file|list|verify|verify-latest|restore`
  (restaurar exige `FABERLOOM_BACKUP_CONFIRM=1`).

Operación propuesta: copia **diaria**, copia **previa a cada actualización** y
**prueba de restauración mensual** en un entorno aislado.

**Verificación programada:** `FABERLOOM_BACKUP_INTERVAL_MS` exporta y verifica
periódicamente; `FABERLOOM_BACKUP_VERIFY_MS` verifica el último respaldo. Con
`0` (por defecto) se usa **cron**:

```cron
10 4 * * * docker exec faberloom-mcp node src/backup/main.js export scheduled >> /opt/faberloom/backup.log 2>&1
40 4 * * * docker exec faberloom-mcp node src/backup/main.js verify-latest   >> /opt/faberloom/backup.log 2>&1
```

## 3. Restauración en modo detenido

`backup.restore` **exige confirmación** y aplica el estado con reglas seguras:

- **No reenvía** correos ni repite efectos: el libro de efectos se conserva.
- El trabajo en curso (`pending`, `running`, `waiting`, `waiting_approval`) pasa a
  **`needs_review`** (`restored_in_stopped_mode`); no se reanuda solo.
- **Revalida permisos**: una concesión cuyo espacio ya no es accesible se
  **revoca** (`permission_recheck`); las revocadas no se reactivan.
- Limpia bloqueos de despachador (evita un lease viejo).

Después: reconectar credenciales/servicios y reanudar solo lo permitido.

## 4. Actualizaciones y compatibilidad

- **Versión fijada** de `dsh` (hoy `0.1.5-rc.2`) y del conjunto de módulos; el
  `MANIFEST.md` del gateway registra versiones, imagen y límites.
- Actualización **controlada**: copia → actualizar en un entorno de prueba →
  comprobar rutinas y recorridos → promover. Probar también la **restauración** de
  la versión anterior (volver al binario por sí solo puede no bastar).
- Los cambios de esquema se reflejan con migraciones **idempotentes** en
  `SqliteRepository` (`CREATE TABLE IF NOT EXISTS` + `ensureColumns`).

## 5. Pruebas

`test/backup.test.js` cubre **F20** (restauración en un repositorio limpio),
cifrado (verificación y restauración con/sin clave correcta), modo detenido (pausa
de ejecuciones y **revalidación de concesiones**) y confirmación obligatoria.
**F10/F11** (reinicio/reconciliación) y **F21** (actualización sin romper) se
cubren por las pruebas de rutinas y por el procedimiento documentado.

## 6. Estado

- Respaldo cifrado con manifiesto, verificación (bajo demanda y **programada**),
  **copia offsite** con herramienta externa y restauración en modo detenido
  implementadas. Sin pendientes funcionales de E8.
- El offsite depende de que exista una herramienta (rclone/aws/restic) y su
  credencial en el host; aquí se documenta y se deja configurable.
