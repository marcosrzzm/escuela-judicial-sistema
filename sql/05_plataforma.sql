-- Experiencia de plataforma escolar (especificación, sección 11). Solo agrega: se puede aplicar sobre una base
-- que ya tiene datos y dos veces sin error ni cambios (cada paso revisa antes). No lleva datos de ejemplo.
-- Deshacer (solo en local): DROP TABLE aviso; ALTER TABLE asignacion_docente DROP COLUMN fecha_limite_entrega;
-- ALTER TABLE grupo DROP COLUMN fecha_cierre_prevista; ALTER TABLE usuario DROP COLUMN preferencia_tema;
-- ALTER TABLE usuario DROP COLUMN alumno_id; ALTER TABLE alumno DROP COLUMN correo; DELETE FROM rol WHERE clave = 'alumno'.

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'asignacion_docente' AND column_name = 'fecha_limite_entrega');
SET @sentencia = IF(@falta, 'ALTER TABLE asignacion_docente ADD COLUMN fecha_limite_entrega DATE NULL', 'SELECT 1');
PREPARE paso FROM @sentencia;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'grupo' AND column_name = 'fecha_cierre_prevista');
SET @sentencia = IF(@falta, 'ALTER TABLE grupo ADD COLUMN fecha_cierre_prevista DATE NULL', 'SELECT 1');
PREPARE paso FROM @sentencia;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'preferencia_tema');
SET @sentencia = IF(@falta, 'ALTER TABLE usuario ADD COLUMN preferencia_tema VARCHAR(10) NOT NULL DEFAULT ''claro''', 'SELECT 1');
PREPARE paso FROM @sentencia;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'alumno_id');
SET @sentencia = IF(@falta, 'ALTER TABLE usuario ADD COLUMN alumno_id INT UNSIGNED NULL UNIQUE', 'SELECT 1');
PREPARE paso FROM @sentencia;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'alumno' AND column_name = 'correo');
SET @sentencia = IF(@falta, 'ALTER TABLE alumno ADD COLUMN correo VARCHAR(160) NULL', 'SELECT 1');
PREPARE paso FROM @sentencia;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- Rol del sistema Alumno (sus permisos salen de api/permisos.php).
INSERT IGNORE INTO rol (clave, nombre, base, permisos, es_sistema) VALUES ('alumno', 'Alumno', 'alumno', JSON_ARRAY(), 1);

-- Bandeja de avisos por persona. `clave` evita repetir un aviso automático (por ejemplo, el de fecha límite).
CREATE TABLE IF NOT EXISTS aviso (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  tipo       VARCHAR(30) NOT NULL,
  texto      VARCHAR(255) NOT NULL,
  enlace     VARCHAR(160) NOT NULL,
  clave      VARCHAR(80) NULL,
  leido_en   DATETIME NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aviso_bandeja (usuario_id, leido_en, creado_en),
  UNIQUE KEY uq_aviso_clave (usuario_id, clave),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
