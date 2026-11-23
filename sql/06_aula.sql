-- Aula: plataforma de clases (especificación, sección 12). Solo agrega: se puede aplicar sobre una base que ya
-- tiene datos y dos veces sin error ni cambios (CREATE TABLE IF NOT EXISTS). No lleva datos de ejemplo.
-- Nada de esto se borra desde la aplicación: lo que sale de circulación se archiva u oculta.
-- Deshacer (solo en local; en el hosting, restaurar el respaldo): DROP TABLE en este orden:
-- reporte_conversacion, mensaje, conversacion_participante, conversacion, publicacion_foro, calificacion_actividad,
-- intento_examen, pregunta, entrega_tarea, elemento_modulo, modulo, actividad, rubrica, categoria, archivo.

-- Archivos: el contenido vive fuera de la carpeta pública (ARCHIVOS_DIR); aquí solo su registro. `vinculado`
-- evita que un mismo archivo se cuelgue de dos elementos, entregas o mensajes.
CREATE TABLE IF NOT EXISTS archivo (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_original VARCHAR(200) NOT NULL,
  nombre_interno  CHAR(40) NOT NULL UNIQUE,
  tipo            VARCHAR(100) NOT NULL,
  tamano          INT UNSIGNED NOT NULL,
  huella          CHAR(64) NOT NULL,
  subido_por      INT UNSIGNED NOT NULL,
  asignacion_id   INT UNSIGNED NULL,
  vinculado       TINYINT(1) NOT NULL DEFAULT 0,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subido_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categorías con peso por curso (los pesos activos suman 100; lo exige la API).
CREATE TABLE IF NOT EXISTS categoria (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asignacion_id INT UNSIGNED NOT NULL,
  nombre        VARCHAR(80) NOT NULL,
  peso          DECIMAL(5,2) NOT NULL,
  archivada     TINYINT(1) NOT NULL DEFAULT 0,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_categoria_curso (asignacion_id),
  FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rúbrica: `criterios` es una lista JSON de {descripcion, niveles: [{nombre, puntos}]}. No se edita: se crea otra.
CREATE TABLE IF NOT EXISTS rubrica (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asignacion_id INT UNSIGNED NOT NULL,
  nombre        VARCHAR(120) NOT NULL,
  criterios     JSON NOT NULL,
  creado_por    INT UNSIGNED NOT NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rubrica_curso (asignacion_id),
  FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(id),
  FOREIGN KEY (creado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Actividad: tarea, examen o foro. Tarea: `fecha_limite` y `acepta_tarde`. Examen: ventana, tiempo e intentos.
CREATE TABLE IF NOT EXISTS actividad (
  id                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asignacion_id             INT UNSIGNED NOT NULL,
  tipo                      VARCHAR(10) NOT NULL,
  titulo                    VARCHAR(160) NOT NULL,
  instrucciones             TEXT NULL,
  categoria_id              INT UNSIGNED NULL,
  puntos                    DECIMAL(6,2) NOT NULL DEFAULT 10,
  fecha_limite              DATETIME NULL,
  acepta_tarde              TINYINT(1) NOT NULL DEFAULT 0,
  rubrica_id                INT UNSIGNED NULL,
  disponible_desde          DATETIME NULL,
  disponible_hasta          DATETIME NULL,
  tiempo_limite_min         INT UNSIGNED NULL,
  intentos_permitidos       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  calificable               TINYINT(1) NOT NULL DEFAULT 1,
  publicada                 TINYINT(1) NOT NULL DEFAULT 0,
  calificaciones_publicadas TINYINT(1) NOT NULL DEFAULT 0,
  archivada                 TINYINT(1) NOT NULL DEFAULT 0,
  creado_por                INT UNSIGNED NOT NULL,
  creado_en                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actividad_curso (asignacion_id, tipo),
  FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(id),
  FOREIGN KEY (categoria_id) REFERENCES categoria(id),
  FOREIGN KEY (rubrica_id) REFERENCES rubrica(id),
  FOREIGN KEY (creado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modulo (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asignacion_id INT UNSIGNED NOT NULL,
  titulo        VARCHAR(160) NOT NULL,
  orden         INT NOT NULL DEFAULT 0,
  publicado     TINYINT(1) NOT NULL DEFAULT 0,
  archivado     TINYINT(1) NOT NULL DEFAULT 0,
  creado_por    INT UNSIGNED NOT NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_modulo_curso (asignacion_id, orden),
  FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(id),
  FOREIGN KEY (creado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS elemento_modulo (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  modulo_id    INT UNSIGNED NOT NULL,
  tipo         VARCHAR(10) NOT NULL,
  titulo       VARCHAR(160) NOT NULL,
  texto        TEXT NULL,
  archivo_id   INT UNSIGNED NULL,
  url          VARCHAR(300) NULL,
  actividad_id INT UNSIGNED NULL,
  orden        INT NOT NULL DEFAULT 0,
  publicado    TINYINT(1) NOT NULL DEFAULT 0,
  archivado    TINYINT(1) NOT NULL DEFAULT 0,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_elemento_modulo (modulo_id, orden),
  FOREIGN KEY (modulo_id) REFERENCES modulo(id),
  FOREIGN KEY (archivo_id) REFERENCES archivo(id),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada reenvío de una tarea es una versión nueva; la anterior se conserva.
CREATE TABLE IF NOT EXISTS entrega_tarea (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actividad_id INT UNSIGNED NOT NULL,
  alumno_id    INT UNSIGNED NOT NULL,
  version      INT UNSIGNED NOT NULL,
  texto        TEXT NULL,
  archivo_id   INT UNSIGNED NULL,
  tarde        TINYINT(1) NOT NULL DEFAULT 0,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_entrega_tarea (actividad_id, alumno_id, version),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (archivo_id) REFERENCES archivo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pregunta de examen. `correcta` nunca sale en una respuesta al alumno. Una pregunta que se cambia se archiva.
CREATE TABLE IF NOT EXISTS pregunta (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actividad_id INT UNSIGNED NOT NULL,
  tipo         VARCHAR(10) NOT NULL,
  enunciado    TEXT NOT NULL,
  opciones     JSON NULL,
  correcta     VARCHAR(10) NULL,
  puntos       DECIMAL(6,2) NOT NULL DEFAULT 1,
  orden        INT NOT NULL DEFAULT 0,
  archivada    TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_pregunta_actividad (actividad_id, orden),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Intento de examen. `limite` lo calcula el servidor al iniciar; después de él no se aceptan respuestas.
CREATE TABLE IF NOT EXISTS intento_examen (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actividad_id    INT UNSIGNED NOT NULL,
  alumno_id       INT UNSIGNED NOT NULL,
  numero          INT UNSIGNED NOT NULL,
  inicio          DATETIME NOT NULL,
  limite          DATETIME NULL,
  envio           DATETIME NULL,
  estado          VARCHAR(12) NOT NULL DEFAULT 'en_curso',
  respuestas      JSON NOT NULL,
  puntos_auto     DECIMAL(6,2) NOT NULL DEFAULT 0,
  puntos_abiertas JSON NULL,
  puntos_finales  DECIMAL(6,2) NULL,
  revisado_por    INT UNSIGNED NULL,
  UNIQUE KEY uq_intento (actividad_id, alumno_id, numero),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (revisado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada cambio de calificación es una fila nueva; la vigente es la última de (actividad, alumno).
CREATE TABLE IF NOT EXISTS calificacion_actividad (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actividad_id  INT UNSIGNED NOT NULL,
  alumno_id     INT UNSIGNED NOT NULL,
  entrega_id    INT UNSIGNED NULL,
  intento_id    INT UNSIGNED NULL,
  puntos        DECIMAL(6,2) NOT NULL,
  comentario    TEXT NULL,
  detalle       JSON NULL,
  calificado_por INT UNSIGNED NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_calificacion_actividad (actividad_id, alumno_id, id),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id),
  FOREIGN KEY (calificado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foro: publicaciones en hilo. No se editan ni se borran; moderar es ocultar con motivo.
CREATE TABLE IF NOT EXISTS publicacion_foro (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actividad_id  INT UNSIGNED NOT NULL,
  autor_id      INT UNSIGNED NOT NULL,
  texto         TEXT NOT NULL,
  responde_a    INT UNSIGNED NULL,
  oculta_por    INT UNSIGNED NULL,
  motivo_oculto VARCHAR(500) NULL,
  oculta_en     DATETIME NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_publicacion_foro (actividad_id, id),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id),
  FOREIGN KEY (autor_id) REFERENCES usuario(id),
  FOREIGN KEY (responde_a) REFERENCES publicacion_foro(id),
  FOREIGN KEY (oculta_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mensajes uno a uno. `par` ("menor-mayor" de los dos ids) deja una sola conversación por pareja.
CREATE TABLE IF NOT EXISTS conversacion (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  par       VARCHAR(25) NOT NULL UNIQUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversacion_participante (
  conversacion_id INT UNSIGNED NOT NULL,
  usuario_id      INT UNSIGNED NOT NULL,
  leido_hasta     INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (conversacion_id, usuario_id),
  INDEX idx_participante_usuario (usuario_id),
  FOREIGN KEY (conversacion_id) REFERENCES conversacion(id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensaje (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id INT UNSIGNED NOT NULL,
  autor_id        INT UNSIGNED NOT NULL,
  texto           TEXT NOT NULL,
  archivo_id      INT UNSIGNED NULL,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mensaje_conversacion (conversacion_id, id),
  FOREIGN KEY (conversacion_id) REFERENCES conversacion(id),
  FOREIGN KEY (autor_id) REFERENCES usuario(id),
  FOREIGN KEY (archivo_id) REFERENCES archivo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una conversación solo la puede consultar Coordinación si alguien la reporta; la consulta queda registrada.
CREATE TABLE IF NOT EXISTS reporte_conversacion (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id INT UNSIGNED NOT NULL,
  reportado_por   INT UNSIGNED NOT NULL,
  motivo          VARCHAR(500) NOT NULL,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reporte_conversacion (conversacion_id),
  FOREIGN KEY (conversacion_id) REFERENCES conversacion(id),
  FOREIGN KEY (reportado_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
