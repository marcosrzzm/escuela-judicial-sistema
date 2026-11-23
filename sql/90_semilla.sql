-- Semilla ficticia: todo está inventado. Contraseña de todas las cuentas: Prueba2026.
SET NAMES utf8mb4;

INSERT INTO periodo (id, nombre, fecha_inicio, fecha_fin, estado) VALUES
  (1, '2026-A', '2026-01-12', '2026-06-26', 'cerrado'),
  (2, '2026-B', '2026-08-10', '2026-12-18', 'abierto');

-- Las fechas del periodo abierto se calculan desde hoy para que el calendario y Por hacer siempre tengan contenido.
INSERT INTO grupo (id, periodo_id, clave, programa, turno, estado, fecha_cierre_prevista) VALUES
  (1, 1, 'POS-01', 'Especialidad en Derecho Procesal (ficticia)', 'Matutino', 'cerrado', NULL),
  (2, 1, 'POS-02', 'Maestría en Teoría Jurídica (ficticia)', 'Vespertino', 'cerrado', NULL),
  (3, 2, 'POS-01', 'Especialidad en Derecho Procesal (ficticia)', 'Matutino', 'activo', CURDATE() + INTERVAL 21 DAY),
  (4, 2, 'POS-02', 'Maestría en Teoría Jurídica (ficticia)', 'Vespertino', 'activo', CURDATE() + INTERVAL 24 DAY);

INSERT INTO usuario (id, nombre, correo, contrasena_hash, rol) VALUES
  (1, 'Lic. Marina Solís', 'coordinacion@prueba.local', '$2y$10$o38ORkOK93ATeYA2Uorg2OX8uj9LL5R3cdYeIG.AeVYPdsESDE63O', 'coordinacion'),
  (2, 'Dra. Ana Torres', 'docente.a@prueba.local', '$2y$10$o38ORkOK93ATeYA2Uorg2OX8uj9LL5R3cdYeIG.AeVYPdsESDE63O', 'docente'),
  (3, 'Mtro. Luis Méndez', 'docente.b@prueba.local', '$2y$10$o38ORkOK93ATeYA2Uorg2OX8uj9LL5R3cdYeIG.AeVYPdsESDE63O', 'docente'),
  (4, 'Mtro. Ernesto Villalobos', 'direccion@prueba.local', '$2y$10$o38ORkOK93ATeYA2Uorg2OX8uj9LL5R3cdYeIG.AeVYPdsESDE63O', 'direccion'),
  (5, 'Lic. Paula Ibarra', 'carga@prueba.local', '$2y$10$o38ORkOK93ATeYA2Uorg2OX8uj9LL5R3cdYeIG.AeVYPdsESDE63O', 'carga_externa'),
  (6, 'C. Diego Ramos', 'auxiliar@prueba.local', '$2y$10$o38ORkOK93ATeYA2Uorg2OX8uj9LL5R3cdYeIG.AeVYPdsESDE63O', 'auxiliar');


INSERT INTO asignacion_auxiliar (usuario_id, grupo_id) VALUES (6, 3), (6, 1);

INSERT INTO materia (id, clave, nombre) VALUES
  (1, 'DPR', 'Derecho Procesal'),
  (2, 'TJU', 'Teoría Jurídica'),
  (3, 'ARG', 'Argumentación');

INSERT INTO alumno (id, identificador, nombre) VALUES
  (1, 'EJ-2026-001', 'Valeria Camacho Ortega'),
  (2, 'EJ-2026-002', 'Rodrigo Esparza Núñez'),
  (3, 'EJ-2026-003', 'Itzel Barragán Luna'),
  (4, 'EJ-2026-004', 'Héctor Domínguez Prieto'),
  (5, 'EJ-2026-005', 'Mariana Orozco Vela'),
  (6, 'EJ-2026-006', 'Santiago Quintero Rey'),
  (7, 'EJ-2026-007', 'Fernanda Lozano Cruz'),
  (8, 'EJ-2026-008', 'Emilio Gallegos Soto'),
  (9, 'EJ-2026-009', 'Regina Padilla Mora'),
  (10, 'EJ-2026-010', 'Andrés Villaseñor Pino');

UPDATE alumno SET correo = 'alumno@prueba.local' WHERE id = 1;
INSERT INTO usuario (id, nombre, correo, contrasena_hash, rol, alumno_id) VALUES
  (7, 'Valeria Camacho Ortega', 'alumno@prueba.local', '$2y$10$o38ORkOK93ATeYA2Uorg2OX8uj9LL5R3cdYeIG.AeVYPdsESDE63O', 'alumno', 1);

-- 2026-A: todos inscritos en su grupo. 2026-B: igual, salvo una baja en POS-02.
INSERT INTO inscripcion_grupo (alumno_id, grupo_id, estado, fecha_alta, fecha_baja, observacion) VALUES
  (1, 1, 'activa', '2026-01-12', NULL, ''), (2, 1, 'activa', '2026-01-12', NULL, ''),
  (3, 1, 'activa', '2026-01-12', NULL, ''), (4, 1, 'activa', '2026-01-12', NULL, ''),
  (5, 1, 'activa', '2026-01-12', NULL, ''),
  (6, 2, 'activa', '2026-01-12', NULL, ''), (7, 2, 'activa', '2026-01-12', NULL, ''),
  (8, 2, 'activa', '2026-01-12', NULL, ''), (9, 2, 'activa', '2026-01-12', NULL, ''),
  (10, 2, 'activa', '2026-01-12', NULL, ''),
  (1, 3, 'activa', '2026-08-10', NULL, ''), (2, 3, 'activa', '2026-08-10', NULL, ''),
  (3, 3, 'activa', '2026-08-10', NULL, ''), (4, 3, 'activa', '2026-08-10', NULL, ''),
  (5, 3, 'activa', '2026-08-10', NULL, ''),
  (6, 4, 'activa', '2026-08-10', NULL, ''), (7, 4, 'activa', '2026-08-10', NULL, ''),
  (8, 4, 'activa', '2026-08-10', NULL, ''), (9, 4, 'activa', '2026-08-10', NULL, ''),
  (10, 4, 'baja', '2026-08-10', '2026-09-14', 'Baja voluntaria (dato ficticio)');

-- Asignaciones. 2026-A (grupos 1 y 2) con historial; 2026-B (grupos 3 y 4) las de la cuenta de prueba.
INSERT INTO asignacion_docente (id, grupo_id, materia_id, docente_id, fecha_limite_entrega) VALUES
  (1, 1, 1, 2, NULL), (2, 1, 3, 3, NULL), (3, 2, 2, 3, NULL), (4, 2, 3, 2, NULL),
  (5, 3, 1, 2, CURDATE() + INTERVAL 2 DAY), (6, 4, 2, 3, CURDATE() + INTERVAL 5 DAY);

-- Historial 2026-A: entregas v1 aceptadas.
INSERT INTO entrega_calificaciones (id, asignacion_id, version, estado, responsable_id, fecha_envio, fecha_revision, revisado_por) VALUES
  (1, 1, 1, 'aceptada', 2, '2026-06-20 10:00:00', '2026-06-22 09:30:00', 1),
  (2, 2, 1, 'aceptada', 3, '2026-06-20 11:00:00', '2026-06-22 09:40:00', 1),
  (3, 3, 1, 'aceptada', 3, '2026-06-21 10:00:00', '2026-06-22 09:50:00', 1),
  (4, 4, 1, 'aceptada', 2, '2026-06-21 11:00:00', '2026-06-22 10:00:00', 1);

INSERT INTO calificacion (entrega_id, alumno_id, valor, estatus) VALUES
  (1, 1, 9.5, 'acreditada'), (1, 2, 8.5, 'acreditada'), (1, 3, 6.5, 'no_acreditada'), (1, 4, 9.0, 'acreditada'), (1, 5, 8.0, 'acreditada'),
  (2, 1, 9.0, 'acreditada'), (2, 2, 8.0, 'acreditada'), (2, 3, 8.5, 'acreditada'), (2, 4, 7.5, 'no_acreditada'), (2, 5, 9.5, 'acreditada'),
  (3, 6, 9.0, 'acreditada'), (3, 7, 8.5, 'acreditada'), (3, 8, 7.0, 'no_acreditada'), (3, 9, 10.0, 'acreditada'), (3, 10, 8.0, 'acreditada'),
  (4, 6, 8.5, 'acreditada'), (4, 7, 9.0, 'acreditada'), (4, 8, 8.0, 'acreditada'), (4, 9, 9.5, 'acreditada'), (4, 10, 8.5, 'acreditada');

INSERT INTO pendiente_academico (alumno_id, materia_id, periodo_origen_id, tipo, estado) VALUES
  (3, 1, 1, 'reprobada', 'abierto'),
  (4, 3, 1, 'reprobada', 'abierto'),
  (8, 2, 1, 'reprobada', 'abierto');

-- Los cuatro cierres de 2026-A ya existen aprobados, para que el historial tenga su respaldo.
INSERT INTO cierre (id, grupo_id, version, estado, requiere_autorizacion, preparado_por, aprobado_por, fecha_aprobacion) VALUES
  (1, 1, 1, 'aprobado', 0, 1, 1, '2026-06-24 12:00:00'),
  (2, 2, 1, 'aprobado', 0, 1, 1, '2026-06-24 12:10:00');

-- Aula (sección 12): contenido ficticio de POS-01 · Derecho Procesal (asignación 5, Docente A) para recorrerla en la demostración.
-- Las fechas se calculan desde hoy en UTC, como las de la API.
INSERT INTO categoria (id, asignacion_id, nombre, peso) VALUES (1, 5, 'Tareas', 40), (2, 5, 'Examen', 60);

INSERT INTO rubrica (id, asignacion_id, nombre, criterios, creado_por) VALUES
  (1, 5, 'Análisis de un caso', JSON_ARRAY(
    JSON_OBJECT('descripcion', 'Fundamentación jurídica', 'niveles', JSON_ARRAY(
      JSON_OBJECT('nombre', 'Completa', 'puntos', 5), JSON_OBJECT('nombre', 'Suficiente', 'puntos', 3), JSON_OBJECT('nombre', 'Insuficiente', 'puntos', 1))),
    JSON_OBJECT('descripcion', 'Redacción y orden', 'niveles', JSON_ARRAY(
      JSON_OBJECT('nombre', 'Clara', 'puntos', 5), JSON_OBJECT('nombre', 'Con detalles por corregir', 'puntos', 3), JSON_OBJECT('nombre', 'Confusa', 'puntos', 1)))
  ), 2);

INSERT INTO actividad (id, asignacion_id, tipo, titulo, instrucciones, categoria_id, puntos, fecha_limite, acepta_tarde, rubrica_id, disponible_desde, disponible_hasta, tiempo_limite_min, intentos_permitidos, calificable, publicada, creado_por) VALUES
  (1, 5, 'tarea', 'Análisis de un caso (ficticio)', 'Lee el caso de la unidad 1 y redacta un análisis de una a dos páginas. Puedes escribir aquí, adjuntar un archivo o las dos cosas.', 1, 10, UTC_TIMESTAMP() + INTERVAL 5 DAY, 0, 1, NULL, NULL, NULL, 1, 1, 1, 2),
  (2, 5, 'examen', 'Examen corto de la unidad 1 (ficticio)', 'Tres preguntas. Tienes 20 minutos desde que empiezas.', 2, 10, NULL, 0, NULL, UTC_TIMESTAMP() - INTERVAL 1 DAY, UTC_TIMESTAMP() + INTERVAL 14 DAY, 20, 1, 1, 1, 2),
  (3, 5, 'foro', 'Foro de dudas (ficticio)', 'Plantea aquí tus dudas de la unidad 1 y responde las de tus compañeros.', NULL, 10, NULL, 0, NULL, NULL, NULL, NULL, 1, 0, 1, 2);

INSERT INTO pregunta (id, actividad_id, tipo, enunciado, opciones, correcta, puntos, orden) VALUES
  (1, 2, 'opcion', '¿Qué principio exige que las dos partes sean escuchadas antes de resolver?', JSON_ARRAY('Contradicción', 'Economía procesal', 'Definitividad'), '0', 3, 1),
  (2, 2, 'vf', 'Una demanda puede presentarse sin señalar el domicilio del demandado.', NULL, 'f', 3, 2),
  (3, 2, 'abierta', 'Explica con tus palabras qué es la legitimación en la causa.', NULL, NULL, 4, 3);

INSERT INTO modulo (id, asignacion_id, titulo, orden, publicado, creado_por) VALUES
  (1, 5, 'Unidad 1: Principios del proceso', 1, 1, 2),
  (2, 5, 'Unidad 2: Pruebas y alegatos', 2, 1, 2);

INSERT INTO elemento_modulo (id, modulo_id, tipo, titulo, texto, url, actividad_id, orden, publicado) VALUES
  (1, 1, 'pagina', 'Bienvenida al curso', 'Este es el espacio de la materia. Aquí encontrarás el contenido de cada unidad, tus tareas, el examen y el foro. Todo el contenido de esta demostración es ficticio.', NULL, NULL, 1, 1),
  (2, 1, 'enlace', 'Constitución Política de los Estados Unidos Mexicanos (sitio oficial)', 'Lectura de apoyo.', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CPEUM.pdf', NULL, 2, 1),
  (3, 1, 'tarea', 'Análisis de un caso (ficticio)', NULL, NULL, 1, 3, 1),
  (4, 1, 'foro', 'Foro de dudas (ficticio)', NULL, NULL, 3, 4, 1),
  (5, 2, 'pagina', 'Qué se prueba y cómo', 'Las pruebas se ofrecen, se admiten y se desahogan en momentos distintos. Contenido de ejemplo para la demostración.', NULL, NULL, 1, 1),
  (6, 2, 'examen', 'Examen corto de la unidad 1 (ficticio)', NULL, NULL, 2, 2, 1);

INSERT INTO publicacion_foro (id, actividad_id, autor_id, texto, creado_en) VALUES
  (1, 3, 2, 'Bienvenidas y bienvenidos. Escriban aquí sus dudas de la unidad 1 (publicación de ejemplo).', UTC_TIMESTAMP());

INSERT INTO conversacion (id, par) VALUES (1, '2-7');
INSERT INTO mensaje (id, conversacion_id, autor_id, texto, creado_en) VALUES
  (1, 1, 2, 'Hola Valeria, quedo al pendiente de tus dudas sobre la primera tarea (mensaje de ejemplo).', UTC_TIMESTAMP());
INSERT INTO conversacion_participante (conversacion_id, usuario_id, leido_hasta) VALUES (1, 2, 1), (1, 7, 0);
