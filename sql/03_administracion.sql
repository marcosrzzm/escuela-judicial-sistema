-- Administración y uso real (especificación, sección 10). Solo agrega: se puede aplicar sobre una base
-- que ya tiene datos y se puede aplicar dos veces sin error ni cambios (cada paso revisa antes).
-- Deshacer (solo en local): DROP TABLE rol; ALTER TABLE usuario DROP COLUMN debe_cambiar_clave;
-- ALTER TABLE sesion DROP COLUMN viendo_como_id.

CREATE TABLE IF NOT EXISTS rol (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave      VARCHAR(20) NOT NULL UNIQUE,
  nombre     VARCHAR(80) NOT NULL,
  base       VARCHAR(20) NOT NULL,
  permisos   JSON NOT NULL,
  es_sistema TINYINT NOT NULL DEFAULT 0,
  estado     VARCHAR(20) NOT NULL DEFAULT 'activo',
  creado_por INT UNSIGNED NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Los permisos de un rol del sistema salen de api/permisos.php; aquí quedan vacíos.
INSERT IGNORE INTO rol (clave, nombre, base, permisos, es_sistema) VALUES
  ('coordinacion', 'Coordinación de Posgrados', 'coordinacion', JSON_ARRAY(), 1),
  ('docente', 'Docente', 'docente', JSON_ARRAY(), 1),
  ('direccion', 'Dirección', 'direccion', JSON_ARRAY(), 1),
  ('carga_externa', 'Carga externa', 'carga_externa', JSON_ARRAY(), 1),
  ('auxiliar', 'Auxiliar', 'auxiliar', JSON_ARRAY(), 1);

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'debe_cambiar_clave');
SET @sentencia = IF(@falta, 'ALTER TABLE usuario ADD COLUMN debe_cambiar_clave TINYINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE paso FROM @sentencia;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sesion' AND column_name = 'viendo_como_id');
SET @sentencia = IF(@falta, 'ALTER TABLE sesion ADD COLUMN viendo_como_id INT UNSIGNED NULL', 'SELECT 1');
PREPARE paso FROM @sentencia;
EXECUTE paso;
DEALLOCATE PREPARE paso;
