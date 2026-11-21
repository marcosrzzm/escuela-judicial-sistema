-- Esquema inicial. Una sentencia por tabla. Nunca se edita una migración aplicada: se agrega otra.
-- Deshacer: DROP de cada tabla en orden inverso (solo en local; en el hosting, restaurar respaldo).

CREATE TABLE periodo (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(20) NOT NULL UNIQUE,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  estado       VARCHAR(20) NOT NULL DEFAULT 'abierto',
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE grupo (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  periodo_id INT UNSIGNED NOT NULL,
  clave      VARCHAR(20) NOT NULL,
  programa   VARCHAR(120) NOT NULL,
  turno      VARCHAR(20) NOT NULL,
  estado     VARCHAR(20) NOT NULL DEFAULT 'activo',
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grupo_periodo_clave (periodo_id, clave),
  FOREIGN KEY (periodo_id) REFERENCES periodo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alumno (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identificador VARCHAR(30) NOT NULL UNIQUE,
  nombre        VARCHAR(120) NOT NULL,
  estatus       VARCHAR(20) NOT NULL DEFAULT 'activo',
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alumno_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- activa_clave vale 1 solo si la inscripción está activa: el índice único hace cumplir RN-01.
CREATE TABLE inscripcion_grupo (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id   INT UNSIGNED NOT NULL,
  grupo_id    INT UNSIGNED NOT NULL,
  estado      VARCHAR(20) NOT NULL DEFAULT 'activa',
  fecha_alta  DATE NOT NULL,
  fecha_baja  DATE NULL,
  observacion VARCHAR(255) NOT NULL DEFAULT '',
  activa_clave TINYINT GENERATED ALWAYS AS (IF(estado = 'activa', 1, NULL)) VIRTUAL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inscripcion_activa (alumno_id, grupo_id, activa_clave),
  INDEX idx_inscripcion_grupo (grupo_id, estado),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (grupo_id) REFERENCES grupo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuario (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL,
  correo          VARCHAR(160) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol             VARCHAR(20) NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'activo',
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asignacion_auxiliar (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  grupo_id   INT UNSIGNED NOT NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_auxiliar_grupo (usuario_id, grupo_id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (grupo_id) REFERENCES grupo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE materia (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave     VARCHAR(20) NOT NULL UNIQUE,
  nombre    VARCHAR(120) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asignacion_docente (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grupo_id   INT UNSIGNED NOT NULL,
  materia_id INT UNSIGNED NOT NULL,
  docente_id INT UNSIGNED NOT NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_asignacion (grupo_id, materia_id),
  INDEX idx_asignacion_docente (docente_id),
  FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  FOREIGN KEY (materia_id) REFERENCES materia(id),
  FOREIGN KEY (docente_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE decision_evaluacion (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id            INT UNSIGNED NOT NULL,
  asignacion_id        INT UNSIGNED NOT NULL,
  resultado            VARCHAR(30) NOT NULL,
  motivo               VARCHAR(500) NOT NULL,
  referencia_evidencia VARCHAR(255) NOT NULL DEFAULT '',
  responsable_id       INT UNSIGNED NOT NULL,
  fecha                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  autorizado_por       INT UNSIGNED NULL,
  fecha_autorizacion   DATETIME NULL,
  resolucion_direccion VARCHAR(20) NULL,
  motivo_direccion     VARCHAR(500) NULL,
  creado_en            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_decision_vigente (asignacion_id, alumno_id, id),
  INDEX idx_decision_resultado (resultado, resolucion_direccion),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(id),
  FOREIGN KEY (responsable_id) REFERENCES usuario(id),
  FOREIGN KEY (autorizado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE entrega_calificaciones (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asignacion_id       INT UNSIGNED NOT NULL,
  version             INT UNSIGNED NOT NULL,
  estado              VARCHAR(20) NOT NULL DEFAULT 'borrador',
  responsable_id      INT UNSIGNED NOT NULL,
  captura_excepcional TINYINT(1) NOT NULL DEFAULT 0,
  motivo_captura      VARCHAR(500) NULL,
  fecha_envio         DATETIME NULL,
  fecha_revision      DATETIME NULL,
  revisado_por        INT UNSIGNED NULL,
  motivo              VARCHAR(500) NULL,
  creado_en           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_entrega_version (asignacion_id, version),
  INDEX idx_entrega_estado (estado),
  FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(id),
  FOREIGN KEY (responsable_id) REFERENCES usuario(id),
  FOREIGN KEY (revisado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE calificacion (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entrega_id  INT UNSIGNED NOT NULL,
  alumno_id   INT UNSIGNED NOT NULL,
  valor       DECIMAL(3,1) NULL,
  estatus     VARCHAR(20) NOT NULL DEFAULT 'acreditada',
  observacion VARCHAR(255) NOT NULL DEFAULT '',
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_calificacion (entrega_id, alumno_id),
  INDEX idx_calificacion_alumno (alumno_id),
  FOREIGN KEY (entrega_id) REFERENCES entrega_calificaciones(id),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pendiente_academico (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id         INT UNSIGNED NOT NULL,
  materia_id        INT UNSIGNED NOT NULL,
  periodo_origen_id INT UNSIGNED NOT NULL,
  tipo              VARCHAR(20) NOT NULL,
  estado            VARCHAR(20) NOT NULL DEFAULT 'abierto',
  resolucion        VARCHAR(500) NULL,
  resuelto_en       DATETIME NULL,
  creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pendiente_alumno (alumno_id, estado),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (materia_id) REFERENCES materia(id),
  FOREIGN KEY (periodo_origen_id) REFERENCES periodo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cierre (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grupo_id              INT UNSIGNED NOT NULL,
  version               INT UNSIGNED NOT NULL,
  estado                VARCHAR(20) NOT NULL DEFAULT 'preparado',
  requiere_autorizacion TINYINT(1) NOT NULL DEFAULT 0,
  excepcion             TINYINT(1) NOT NULL DEFAULT 0,
  motivo_excepcion      VARCHAR(500) NULL,
  preparado_por         INT UNSIGNED NOT NULL,
  aprobado_por          INT UNSIGNED NULL,
  fecha_aprobacion      DATETIME NULL,
  motivo                VARCHAR(500) NULL,
  creado_en             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cierre_version (grupo_id, version),
  INDEX idx_cierre_estado (estado),
  FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  FOREIGN KEY (preparado_por) REFERENCES usuario(id),
  FOREIGN KEY (aprobado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documento_academico (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id INT UNSIGNED NOT NULL,
  cierre_id INT UNSIGNED NOT NULL,
  tipo      VARCHAR(20) NOT NULL DEFAULT 'boleta',
  version   INT UNSIGNED NOT NULL,
  estado    VARCHAR(40) NOT NULL DEFAULT 'preparado_pendiente_firma',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_documento (cierre_id, alumno_id, tipo),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (cierre_id) REFERENCES cierre(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lote_entrega (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cierre_id        INT UNSIGNED NOT NULL,
  version          INT UNSIGNED NOT NULL,
  estado           VARCHAR(30) NOT NULL DEFAULT 'generado',
  generado_por     INT UNSIGNED NOT NULL,
  fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lote_cierre (cierre_id),
  INDEX idx_lote_estado (estado),
  FOREIGN KEY (cierre_id) REFERENCES cierre(id),
  FOREIGN KEY (generado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE registro_carga_externa (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lote_id          INT UNSIGNED NOT NULL,
  fecha_recepcion  DATETIME NULL,
  fecha_carga      DATETIME NULL,
  estado           VARCHAR(30) NOT NULL,
  discrepancias    TEXT NULL,
  registrado_por   INT UNSIGNED NOT NULL,
  creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_registro_lote (lote_id),
  FOREIGN KEY (lote_id) REFERENCES lote_entrega(id),
  FOREIGN KEY (registrado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bitacora_cambio (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entidad    VARCHAR(40) NOT NULL,
  registro_id INT UNSIGNED NULL,
  accion     VARCHAR(40) NOT NULL,
  usuario_id INT UNSIGNED NULL,
  fecha      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo     VARCHAR(500) NULL,
  antes      JSON NULL,
  despues    JSON NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bitacora_fecha (fecha),
  INDEX idx_bitacora_entidad (entidad, registro_id),
  INDEX idx_bitacora_usuario (usuario_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sesion (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_en  DATETIME NOT NULL,
  ultimo_uso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sesion_expira (expira_en),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE metrica_caso (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo                VARCHAR(20) NOT NULL,
  grupo_id            INT UNSIGNED NULL,
  origen              VARCHAR(20) NOT NULL,
  campos_recapturados INT UNSIGNED NOT NULL DEFAULT 0,
  segundos_activos    INT UNSIGNED NOT NULL DEFAULT 0,
  nota                VARCHAR(500) NOT NULL DEFAULT '',
  registrado_por      INT UNSIGNED NOT NULL,
  fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Un solo caso del sistema por tipo y grupo; los de línea base pueden ser varios.
  clave_sistema       VARCHAR(40) GENERATED ALWAYS AS (IF(origen = 'sistema', CONCAT(tipo, '-', grupo_id), NULL)) VIRTUAL,
  UNIQUE KEY uq_metrica_sistema (clave_sistema),
  INDEX idx_metrica_caso (origen, tipo, grupo_id),
  FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  FOREIGN KEY (registrado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE intento_login (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  correo    VARCHAR(160) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_intento (correo, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
