-- Invitaciones y restablecimiento por correo (especificación, sección 10.6). Solo agrega tablas: se puede
-- aplicar sobre una base con datos y dos veces sin error ni cambios (CREATE TABLE IF NOT EXISTS).
-- Deshacer (solo en local): DROP TABLE solicitud_restablecer; DROP TABLE token_acceso;

-- Enlaces de un solo uso. Solo se guarda el hash del token; usarlo, que venza o que se emita otro lo invalida.
CREATE TABLE IF NOT EXISTS token_acceso (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  tipo       VARCHAR(20) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  vence_en   DATETIME NOT NULL,
  usado_en   DATETIME NULL,
  creado_por INT UNSIGNED NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_usuario (usuario_id, tipo, id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (creado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Solicitudes de "olvidé mi contraseña": solo existen para cuentas activas; nada se manda hasta que Coordinación autoriza.
CREATE TABLE IF NOT EXISTS solicitud_restablecer (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  correo       VARCHAR(160) NOT NULL,
  usuario_id   INT UNSIGNED NULL,
  estado       VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo       VARCHAR(500) NULL,
  resuelto_por INT UNSIGNED NULL,
  resuelto_en  DATETIME NULL,
  ip           VARCHAR(45) NOT NULL,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_solicitud_correo (correo, creado_en),
  INDEX idx_solicitud_ip (ip, creado_en),
  INDEX idx_solicitud_estado (estado),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (resuelto_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
