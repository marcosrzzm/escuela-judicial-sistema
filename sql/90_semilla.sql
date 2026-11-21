-- Semilla ficticia: todo está inventado. Contraseña de todas las cuentas: Prueba2026.
SET NAMES utf8mb4;

INSERT INTO periodo (id, nombre, fecha_inicio, fecha_fin, estado) VALUES
  (1, '2026-A', '2026-01-12', '2026-06-26', 'cerrado'),
  (2, '2026-B', '2026-08-10', '2026-12-18', 'abierto');

INSERT INTO grupo (id, periodo_id, clave, programa, turno, estado) VALUES
  (1, 1, 'POS-01', 'Especialidad en Derecho Procesal (ficticia)', 'Matutino', 'cerrado'),
  (2, 1, 'POS-02', 'Maestría en Teoría Jurídica (ficticia)', 'Vespertino', 'cerrado'),
  (3, 2, 'POS-01', 'Especialidad en Derecho Procesal (ficticia)', 'Matutino', 'activo'),
  (4, 2, 'POS-02', 'Maestría en Teoría Jurídica (ficticia)', 'Vespertino', 'activo');

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
INSERT INTO asignacion_docente (id, grupo_id, materia_id, docente_id) VALUES
  (1, 1, 1, 2), (2, 1, 3, 3), (3, 2, 2, 3), (4, 2, 3, 2),
  (5, 3, 1, 2), (6, 4, 2, 3);

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
