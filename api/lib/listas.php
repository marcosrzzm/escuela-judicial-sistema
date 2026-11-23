<?php

declare(strict_types=1);

function ruta_periodos(): never
{
    exigir_permiso('periodo', 'ver');
    responder(200, ['filas' => filas('SELECT id, nombre, fecha_inicio, fecha_fin, estado FROM periodo ORDER BY fecha_inicio DESC')]);
}

/** Grupos que el rol puede ver (Docente y Auxiliar, solo los suyos), con su lista vigente contada. */
function grupos_en_alcance(array $u, ?int $periodo_id = null): array
{
    $donde = ['1 = 1'];
    $p = [];
    if ($periodo_id) {
        $donde[] = 'g.periodo_id = ?';
        $p[] = $periodo_id;
    }
    if ($u['base'] === 'docente') {
        $donde[] = 'EXISTS (SELECT 1 FROM asignacion_docente a WHERE a.grupo_id = g.id AND a.docente_id = ?)';
        $p[] = $u['id'];
    } elseif ($u['base'] === 'auxiliar') {
        $donde[] = 'EXISTS (SELECT 1 FROM asignacion_auxiliar x WHERE x.grupo_id = g.id AND x.usuario_id = ?)';
        $p[] = $u['id'];
    } elseif ($u['base'] === 'alumno') {
        $donde[] = 'EXISTS (SELECT 1 FROM inscripcion_grupo i WHERE i.grupo_id = g.id AND i.alumno_id = ? AND i.estado = \'activa\')';
        $p[] = (int) $u['alumno_id'];
    }
    return filas(
        'SELECT g.id, g.periodo_id, pe.nombre AS periodo, pe.estado AS periodo_estado, g.clave, g.programa, g.turno, g.estado, g.fecha_cierre_prevista,
                (SELECT COUNT(*) FROM inscripcion_grupo i WHERE i.grupo_id = g.id AND i.estado = \'activa\') AS alumnos_activos
         FROM grupo g JOIN periodo pe ON pe.id = g.periodo_id
         WHERE ' . implode(' AND ', $donde) . ' ORDER BY pe.fecha_inicio DESC, g.clave',
        $p
    );
}

function ruta_grupos(): never
{
    $u = exigir_permiso('grupo', 'ver');
    responder(200, ['filas' => grupos_en_alcance($u, isset($_GET['periodo_id']) ? (int) $_GET['periodo_id'] : null)]);
}

function ruta_lista_grupo(array $a): never
{
    $u = exigir_permiso('inscripcion_grupo', 'ver');
    $gid = (int) $a['id'];
    if (!grupo_en_alcance($u, $gid)) {
        denegar("grupo $gid");
    }
    $grupo = fila(
        'SELECT g.id, g.periodo_id, pe.nombre AS periodo, pe.estado AS periodo_estado, g.clave, g.programa, g.turno, g.estado, g.fecha_cierre_prevista
         FROM grupo g JOIN periodo pe ON pe.id = g.periodo_id WHERE g.id = ?',
        [$gid]
    );
    // Fuera de Coordinación solo se ve la lista vigente, y de cada alumno nombre y matrícula (especificación, 10.7).
    $coordinacion = ve_todo($u);
    $alumnos = $coordinacion
        ? filas(
            'SELECT i.id AS inscripcion_id, al.id AS alumno_id, al.identificador, al.nombre, i.estado, i.fecha_alta, i.fecha_baja, i.observacion
             FROM inscripcion_grupo i JOIN alumno al ON al.id = i.alumno_id
             WHERE i.grupo_id = ? ORDER BY i.estado, al.nombre',
            [$gid]
        )
        : filas(
            'SELECT al.identificador, al.nombre
             FROM inscripcion_grupo i JOIN alumno al ON al.id = i.alumno_id
             WHERE i.grupo_id = ? AND i.estado = \'activa\' ORDER BY al.nombre',
            [$gid]
        );
    $asig = [];
    if (tiene_permiso($u, 'asignacion_docente', 'ver')) {
        $extra = $u['base'] === 'docente' ? ' AND a.docente_id = ' . (int) $u['id'] : '';
        $asig = filas(
            'SELECT a.id, m.nombre AS materia, d.nombre AS docente
             FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN usuario d ON d.id = a.docente_id
             WHERE a.grupo_id = ?' . $extra . ' ORDER BY m.nombre',
            [$gid]
        );
    }
    $extra = [];
    if ($coordinacion) {
        // Quién apoya y qué alumnos ya tienen cuenta (solo Coordinación y Dirección; sin correos).
        $extra['auxiliares'] = filas('SELECT u.id, u.nombre FROM asignacion_auxiliar x JOIN usuario u ON u.id = x.usuario_id WHERE x.grupo_id = ? ORDER BY u.nombre', [$gid]);
        $extra['cuentas_alumno'] = array_map('intval', array_column(filas(
            'SELECT u.alumno_id FROM usuario u JOIN inscripcion_grupo i ON i.alumno_id = u.alumno_id WHERE i.grupo_id = ? AND u.alumno_id IS NOT NULL',
            [$gid]
        ), 'alumno_id'));
    }
    responder(200, ['grupo' => $grupo, 'alumnos' => $alumnos, 'asignaciones' => $asig] + $extra);
}

function grupo_editable(int $gid): array
{
    $g = fila('SELECT g.id, g.clave, g.estado, pe.nombre AS periodo FROM grupo g JOIN periodo pe ON pe.id = g.periodo_id WHERE g.id = ?', [$gid]);
    if ($g === null) {
        error_http(404, 'Ese grupo ya no existe.');
    }
    if ($g['estado'] !== 'activo') {
        error_http(409, "El grupo {$g['clave']} del periodo {$g['periodo']} está cerrado y su lista ya no se modifica.");
    }
    return $g;
}

function ruta_alta_inscripcion(array $a): never
{
    $u = exigir_permiso('inscripcion_grupo', 'crear');
    $g = grupo_editable((int) $a['id']);
    $d = cuerpo_json();
    $obs = texto($d, 'observacion', 255, 'La observación', false);

    $id = transaccion(function () use ($d, $g, $obs, $u): int {
        if (isset($d['alumno_id'])) {
            $alumno = fila('SELECT id, identificador, nombre FROM alumno WHERE id = ?', [entero($d, 'alumno_id', 'El alumno')]);
            if ($alumno === null) {
                error_http(404, 'Ese alumno ya no existe.');
            }
        } else {
            if (!tiene_permiso($u, 'alumno', 'crear')) {
                denegar('alumno:crear');
            }
            $ident = texto($d, 'identificador', 30, 'La matrícula');
            if (preg_match('/^[A-Za-z0-9-]{3,30}$/', $ident) !== 1) {
                error_http(422, 'La matrícula solo admite letras, números y guiones.', ['identificador' => 'Solo letras, números y guiones.']);
            }
            $nombre = texto($d, 'nombre', 120, 'El nombre');
            if (fila('SELECT id FROM alumno WHERE identificador = ?', [$ident]) !== null) {
                error_http(422, "Ya existe un alumno con la matrícula $ident. Búscalo en la lista de alumnos y selecciónalo.", ['identificador' => 'Esa matrícula ya existe.']);
            }
            $nuevo = insertar('alumno', ['identificador' => $ident, 'nombre' => $nombre]);
            $alumno = ['id' => $nuevo, 'identificador' => $ident, 'nombre' => $nombre];
            registrar_bitacora('alumno', $nuevo, 'alta', null, $alumno);
        }
        try {
            $iid = insertar('inscripcion_grupo', [
                'alumno_id' => $alumno['id'], 'grupo_id' => $g['id'], 'estado' => 'activa',
                'fecha_alta' => gmdate('Y-m-d'), 'observacion' => $obs,
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                error_http(409, "{$alumno['nombre']} ya tiene una inscripción activa en el grupo {$g['clave']} de {$g['periodo']}.");
            }
            throw $e;
        }
        registrar_bitacora('inscripcion_grupo', $iid, 'alta', null, ['alumno' => $alumno['identificador'], 'grupo' => $g['clave'], 'periodo' => $g['periodo'], 'estado' => 'activa'], $obs !== '' ? $obs : null);
        return $iid;
    });
    responder(200, ['id' => $id]);
}

function ruta_baja_inscripcion(array $a): never
{
    exigir_permiso('inscripcion_grupo', 'modificar');
    $ins = fila('SELECT i.id, i.grupo_id, i.estado, i.observacion, i.fecha_baja, al.nombre FROM inscripcion_grupo i JOIN alumno al ON al.id = i.alumno_id WHERE i.id = ?', [(int) $a['id']]);
    if ($ins === null) {
        error_http(404, 'Esa inscripción ya no existe.');
    }
    grupo_editable((int) $ins['grupo_id']);
    $motivo = texto(cuerpo_json(), 'observacion', 255, 'El motivo de la baja');
    if ($ins['estado'] !== 'activa') {
        error_http(409, "{$ins['nombre']} ya estaba dado de baja en este grupo.");
    }
    ejecutar('UPDATE inscripcion_grupo SET estado = \'baja\', fecha_baja = ?, observacion = ? WHERE id = ?', [gmdate('Y-m-d'), $motivo, $ins['id']]);
    registrar_bitacora('inscripcion_grupo', (int) $ins['id'], 'baja', ['estado' => 'activa', 'observacion' => $ins['observacion']], ['estado' => 'baja', 'observacion' => $motivo], $motivo);
    responder(200, ['id' => (int) $ins['id']]);
}

function ruta_alumnos(): never
{
    $u = exigir_permiso('alumno', 'ver');
    $q = trim((string) ($_GET['q'] ?? ''));
    $p = [];
    $donde = '1 = 1';
    if ($q !== '') {
        $donde = '(al.nombre LIKE ? OR al.identificador LIKE ?)';
        $p = ['%' . $q . '%', '%' . $q . '%'];
    }
    if (!ve_todo($u)) {
        // Docente y Auxiliar solo encuentran alumnos con inscripción vigente en sus grupos; nada más que nombre y matrícula.
        $propios = match ($u['base']) {
            'docente' => 'SELECT 1 FROM inscripcion_grupo i JOIN asignacion_docente a ON a.grupo_id = i.grupo_id WHERE i.alumno_id = al.id AND i.estado = \'activa\' AND a.docente_id = ?',
            'auxiliar' => 'SELECT 1 FROM inscripcion_grupo i JOIN asignacion_auxiliar x ON x.grupo_id = i.grupo_id WHERE i.alumno_id = al.id AND i.estado = \'activa\' AND x.usuario_id = ?',
            default => denegar('alumnos'),
        };
        $p[] = $u['id'];
        responder(200, ['filas' => filas(
            "SELECT al.id, al.identificador, al.nombre FROM alumno al WHERE $donde AND EXISTS ($propios) ORDER BY al.nombre LIMIT 40",
            $p
        )]);
    }
    if (!tiene_permiso($u, 'pendiente_academico', 'ver')) {
        denegar('(pendiente_academico:ver)');
    }
    $filas = filas(
        'SELECT al.id, al.identificador, al.nombre, al.estatus,
                (SELECT COUNT(*) FROM pendiente_academico pa WHERE pa.alumno_id = al.id AND pa.estado = \'abierto\') AS pendientes_abiertos
         FROM alumno al WHERE ' . $donde . ' ORDER BY al.nombre LIMIT 40',
        $p
    );
    responder(200, ['filas' => $filas]);
}

function ruta_historial(array $a): never
{
    $u = exigir_permiso('pendiente_academico', 'ver');
    $es_alumno = $u['base'] === 'alumno';
    if ($es_alumno && (int) $u['alumno_id'] !== (int) $a['id']) {
        denegar('historial de otro alumno');
    }
    $alumno = fila('SELECT id, identificador, nombre, estatus FROM alumno WHERE id = ?', [(int) $a['id']]);
    if ($alumno === null) {
        denegar('alumno ' . (int) $a['id']);
    }
    $cal = filas(
        'SELECT pe.id AS periodo_id, pe.nombre AS periodo, g.clave AS grupo, m.nombre AS materia, c.valor, c.estatus,
                e.version, e.id AS entrega_id, e.fecha_revision
         FROM calificacion c
         JOIN entrega_calificaciones e ON e.id = c.entrega_id AND e.estado = \'aceptada\'
         JOIN asignacion_docente a ON a.id = e.asignacion_id
         JOIN grupo g ON g.id = a.grupo_id
         JOIN periodo pe ON pe.id = g.periodo_id
         JOIN materia m ON m.id = a.materia_id
         WHERE c.alumno_id = ? ORDER BY pe.fecha_inicio, m.nombre',
        [$alumno['id']]
    );
    $periodos = [];
    foreach ($cal as $c) {
        $k = (int) $c['periodo_id'];
        $periodos[$k] ??= ['periodo_id' => $k, 'periodo' => $c['periodo'], 'grupo' => $c['grupo'], 'materias' => []];
        $periodos[$k]['materias'][] = [
            'materia' => $c['materia'], 'valor' => $c['valor'] === null ? null : (float) $c['valor'], 'estatus' => $c['estatus'],
            'version' => (int) $c['version'], 'fecha_revision' => $c['fecha_revision'],
        ];
    }
    $pend = filas(
        'SELECT pa.id, m.nombre AS materia, pe.nombre AS periodo_origen, pa.tipo, pa.estado, pa.resolucion, pa.resuelto_en
         FROM pendiente_academico pa JOIN materia m ON m.id = pa.materia_id JOIN periodo pe ON pe.id = pa.periodo_origen_id
         WHERE pa.alumno_id = ? ORDER BY pa.estado, pe.fecha_inicio',
        [$alumno['id']]
    );
    if ($es_alumno) {
        // El texto de resolución lo escribe Coordinación: el alumno ve el estado, no esa nota.
        $pend = array_map(static fn (array $p): array => ['resolucion' => null] + $p, $pend);
    }
    responder(200, [
        'alumno' => $alumno,
        'periodos' => array_values($periodos),
        'pendientes' => $pend,
        'materias' => $es_alumno ? [] : filas('SELECT id, nombre FROM materia ORDER BY nombre'),
        'periodos_catalogo' => $es_alumno ? [] : filas('SELECT id, nombre FROM periodo ORDER BY fecha_inicio'),
    ]);
}

function ruta_crear_pendiente(array $a): never
{
    exigir_permiso('pendiente_academico', 'crear');
    $alumno = fila('SELECT id, nombre FROM alumno WHERE id = ?', [(int) $a['id']]);
    if ($alumno === null) {
        error_http(404, 'Ese alumno ya no existe.');
    }
    $d = cuerpo_json();
    $materia = fila('SELECT id, nombre FROM materia WHERE id = ?', [entero($d, 'materia_id', 'La materia')]);
    $periodo = fila('SELECT id, nombre FROM periodo WHERE id = ?', [entero($d, 'periodo_origen_id', 'El periodo')]);
    if ($materia === null || $periodo === null) {
        error_http(422, 'Elige una materia y un periodo de la lista.');
    }
    $motivo = texto($d, 'motivo', 500, 'El motivo');
    $id = insertar('pendiente_academico', ['alumno_id' => $alumno['id'], 'materia_id' => $materia['id'], 'periodo_origen_id' => $periodo['id'], 'tipo' => 'manual']);
    registrar_bitacora('pendiente_academico', $id, 'alta_manual', null, ['alumno' => $alumno['nombre'], 'materia' => $materia['nombre'], 'periodo' => $periodo['nombre']], $motivo);
    responder(200, ['id' => $id]);
}

function ruta_resolver_pendiente(array $a): never
{
    exigir_permiso('pendiente_academico', 'modificar');
    $p = fila('SELECT id, estado, resolucion FROM pendiente_academico WHERE id = ?', [(int) $a['id']]);
    if ($p === null) {
        error_http(404, 'Ese pendiente ya no existe.');
    }
    $res = texto(cuerpo_json(), 'resolucion', 500, 'La resolución');
    if ($p['estado'] !== 'abierto') {
        error_http(409, 'Ese pendiente ya estaba resuelto.');
    }
    ejecutar('UPDATE pendiente_academico SET estado = \'resuelto\', resolucion = ?, resuelto_en = ? WHERE id = ?', [$res, ahora(), $p['id']]);
    registrar_bitacora('pendiente_academico', (int) $p['id'], 'resolver', ['estado' => 'abierto'], ['estado' => 'resuelto', 'resolucion' => $res], $res);
    responder(200, ['id' => (int) $p['id']]);
}
