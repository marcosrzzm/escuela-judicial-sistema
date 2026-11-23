<?php

declare(strict_types=1);

function grupo_o_404(int $id): array
{
    $g = fila('SELECT g.id, g.clave, g.estado, g.programa, g.turno, pe.id AS periodo_id, pe.nombre AS periodo FROM grupo g JOIN periodo pe ON pe.id = g.periodo_id WHERE g.id = ?', [$id]);
    if ($g === null) {
        denegar("grupo $id");
    }
    return $g;
}

/** Asignaciones del grupo con su entrega aceptada vigente (o null). */
function estado_asignaciones(int $grupo_id): array
{
    $filas = filas(
        'SELECT a.id, m.nombre AS materia, d.nombre AS docente
         FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN usuario d ON d.id = a.docente_id
         WHERE a.grupo_id = ? ORDER BY m.nombre',
        [$grupo_id]
    );
    foreach ($filas as &$f) {
        $f['entrega'] = resumen_entrega(entrega_vigente((int) $f['id']));
        $f['aceptada'] = entrega_aceptada_vigente((int) $f['id']) !== null;
    }
    return $filas;
}

function cierre_o_404(int $id): array
{
    $c = fila('SELECT c.*, g.clave AS grupo, pe.nombre AS periodo FROM cierre c JOIN grupo g ON g.id = c.grupo_id JOIN periodo pe ON pe.id = g.periodo_id WHERE c.id = ?', [$id]);
    if ($c === null) {
        denegar("cierre $id");
    }
    return $c;
}

function ruta_cierre_grupo(array $a): never
{
    $u = exigir_permiso('cierre', 'ver');
    if (!ve_todo($u)) {
        denegar('cierre de grupo');
    }
    $g = grupo_o_404((int) $a['id']);
    $asig = estado_asignaciones((int) $g['id']);
    $cierres = filas(
        'SELECT c.id, c.version, c.estado, c.requiere_autorizacion, c.excepcion, c.motivo_excepcion, c.motivo, c.fecha_aprobacion, c.creado_en,
                pr.nombre AS preparado_por, ap.nombre AS aprobado_por,
                l.id AS lote_id, l.estado AS lote_estado, l.fecha_generacion, gp.nombre AS lote_generado_por,
                rc.fecha_recepcion, rc.fecha_carga, rc.discrepancias, rg.nombre AS registrado_por,
                (SELECT COUNT(*) FROM documento_academico dc WHERE dc.cierre_id = c.id) AS documentos
         FROM cierre c JOIN usuario pr ON pr.id = c.preparado_por LEFT JOIN usuario ap ON ap.id = c.aprobado_por
         LEFT JOIN lote_entrega l ON l.cierre_id = c.id LEFT JOIN usuario gp ON gp.id = l.generado_por
         LEFT JOIN registro_carga_externa rc ON rc.lote_id = l.id LEFT JOIN usuario rg ON rg.id = rc.registrado_por
         WHERE c.grupo_id = ? ORDER BY c.version DESC',
        [$g['id']]
    );
    foreach ($cierres as &$c) {
        $c['requiere_autorizacion'] = (bool) $c['requiere_autorizacion'];
        $c['excepcion'] = (bool) $c['excepcion'];
    }
    $listo = $asig !== [] && !in_array(false, array_column($asig, 'aceptada'), true);
    responder(200, [
        'grupo' => $g, 'asignaciones' => $asig, 'listo' => $listo, 'cierres' => $cierres,
        'alumnos_activos' => count(lista_vigente((int) $g['id'])),
    ]);
}

function ruta_preparar_cierre(array $a): never
{
    $u = exigir_permiso('cierre', 'crear');
    $g = grupo_o_404((int) $a['id']);
    if ($g['estado'] !== 'activo') {
        error_http(409, "El grupo {$g['clave']} del periodo {$g['periodo']} está cerrado.");
    }
    $d = cuerpo_json();
    $requiere = ($d['requiere_autorizacion'] ?? false) === true;
    $excepcion = ($d['excepcion'] ?? false) === true;
    $asig = estado_asignaciones((int) $g['id']);
    $faltan = array_values(array_map(fn ($x) => $x['materia'], array_filter($asig, fn ($x) => !$x['aceptada'])));
    if ($asig === []) {
        error_http(422, "El grupo {$g['clave']} no tiene asignaciones: no hay nada que cerrar.");
    }
    $motivo_exc = null;
    if ($faltan !== []) {
        if (!$excepcion) {
            error_http(422, 'Falta una entrega aceptada en: ' . implode(', ', $faltan) . '. Acéptalas o registra una excepción con motivo.');
        }
        $motivo_exc = texto($d, 'motivo_excepcion', 500, 'El motivo de la excepción');
    } else {
        $excepcion = false;
    }
    $id = transaccion(function () use ($g, $u, $requiere, $excepcion, $motivo_exc, $faltan, $d): int {
        $abierto = fila('SELECT version, estado FROM cierre WHERE grupo_id = ? AND estado IN (\'preparado\', \'en_autorizacion\') LIMIT 1 FOR UPDATE', [$g['id']]);
        if ($abierto !== null) {
            error_http(409, "El grupo {$g['clave']} ya tiene el cierre versión {$abierto['version']} en curso ({$abierto['estado']}). Termínalo antes de preparar otro.");
        }
        $aprobado = fila('SELECT id, version FROM cierre WHERE grupo_id = ? AND estado = \'aprobado\' FOR UPDATE', [$g['id']]);
        $motivo_reemplazo = null;
        if ($aprobado !== null) {
            $motivo_reemplazo = texto($d, 'motivo', 500, 'El motivo del reemplazo');
        }
        $max = fila('SELECT COALESCE(MAX(version), 0) AS v FROM cierre WHERE grupo_id = ?', [$g['id']]);
        $version = (int) $max['v'] + 1;
        $id = insertar('cierre', [
            'grupo_id' => $g['id'], 'version' => $version, 'estado' => 'preparado', 'requiere_autorizacion' => $requiere ? 1 : 0,
            'excepcion' => $excepcion ? 1 : 0, 'motivo_excepcion' => $motivo_exc, 'preparado_por' => $u['id'],
        ]);
        registrar_bitacora('cierre', $id, 'preparar', null, ['grupo' => $g['clave'], 'periodo' => $g['periodo'], 'version' => $version, 'requiere_autorizacion' => $requiere, 'excepcion' => $excepcion, 'sin_entrega_aceptada' => $faltan], $motivo_exc);
        if ($aprobado !== null) {
            ejecutar('UPDATE cierre SET estado = \'reemplazado\', motivo = ? WHERE id = ?', [$motivo_reemplazo, $aprobado['id']]);
            registrar_bitacora('cierre', (int) $aprobado['id'], 'reemplazar', ['estado' => 'aprobado'], ['estado' => 'reemplazado', 'version_nueva' => $version], $motivo_reemplazo);
        }
        return $id;
    });
    responder(200, ['id' => $id]);
}

function exigir_rol_cierre(array $u, string $rol): void
{
    if ($u['base'] !== $rol) {
        denegar('cierre');
    }
}

function ruta_aprobar_cierre(array $a): never
{
    $u = exigir_permiso('cierre', 'modificar');
    exigir_rol_cierre($u, 'coordinacion');
    $c = cierre_o_404((int) $a['id']);
    if ($c['estado'] !== 'preparado') {
        error_http(409, "El cierre versión {$c['version']} de {$c['grupo']} está {$c['estado']}; solo se aprueba uno preparado.");
    }
    if ((int) $c['requiere_autorizacion'] === 1) {
        error_http(409, "El cierre versión {$c['version']} de {$c['grupo']} requiere autorización: envíalo a Dirección.");
    }
    verificar_entregas_vigentes($c);
    marcar_aprobado($c, (int) $u['id'], null);
    responder(200, ['id' => (int) $c['id'], 'estado' => 'aprobado']);
}

/** Si tras preparar el cierre se reabrió una entrega, no se aprueba contenido que ya no es el aceptado. */
function verificar_entregas_vigentes(array $c): void
{
    if ((int) $c['excepcion'] === 1) {
        return;
    }
    $faltan = array_map(fn ($x) => $x['materia'], array_filter(estado_asignaciones((int) $c['grupo_id']), fn ($x) => !$x['aceptada']));
    if ($faltan !== []) {
        error_http(409, 'Ya no hay entrega aceptada en: ' . implode(', ', $faltan) . '. Acéptalas de nuevo antes de aprobar el cierre.');
    }
}

function marcar_aprobado(array $c, int $uid, ?string $motivo): void
{
    ejecutar('UPDATE cierre SET estado = \'aprobado\', aprobado_por = ?, fecha_aprobacion = ? WHERE id = ?', [$uid, ahora(), $c['id']]);
    registrar_bitacora('cierre', (int) $c['id'], 'aprobar', ['estado' => $c['estado']], ['estado' => 'aprobado', 'grupo' => $c['grupo'], 'version' => (int) $c['version']], $motivo);
}

function ruta_enviar_autorizacion(array $a): never
{
    $u = exigir_permiso('cierre', 'modificar');
    exigir_rol_cierre($u, 'coordinacion');
    $c = cierre_o_404((int) $a['id']);
    if ($c['estado'] !== 'preparado' || (int) $c['requiere_autorizacion'] !== 1) {
        error_http(409, "El cierre versión {$c['version']} de {$c['grupo']} no se puede enviar a Dirección: debe estar preparado y marcado como que requiere autorización.");
    }
    ejecutar('UPDATE cierre SET estado = \'en_autorizacion\' WHERE id = ?', [$c['id']]);
    registrar_bitacora('cierre', (int) $c['id'], 'enviar_autorizacion', ['estado' => 'preparado'], ['estado' => 'en_autorizacion', 'grupo' => $c['grupo'], 'version' => (int) $c['version']]);
    responder(200, ['id' => (int) $c['id'], 'estado' => 'en_autorizacion']);
}

function ruta_resolver_cierre(array $a): never
{
    $u = exigir_permiso('cierre', 'modificar');
    exigir_rol_cierre($u, 'direccion');
    $c = cierre_o_404((int) $a['id']);
    $d = cuerpo_json();
    $res = una_de($d, 'resolucion', ['aprobar', 'devolver'], 'La resolución');
    $motivo = texto($d, 'motivo', 500, 'El motivo', $res === 'devolver');
    if ($c['estado'] !== 'en_autorizacion') {
        error_http(409, "El cierre versión {$c['version']} de {$c['grupo']} ya no está esperando autorización.");
    }
    if ($res === 'aprobar') {
        verificar_entregas_vigentes($c);
        marcar_aprobado($c, (int) $u['id'], $motivo === '' ? null : $motivo);
        responder(200, ['id' => (int) $c['id'], 'estado' => 'aprobado']);
    }
    ejecutar('UPDATE cierre SET estado = \'devuelto\', motivo = ? WHERE id = ?', [$motivo, $c['id']]);
    registrar_bitacora('cierre', (int) $c['id'], 'devolver', ['estado' => 'en_autorizacion'], ['estado' => 'devuelto', 'grupo' => $c['grupo'], 'version' => (int) $c['version']], $motivo);
    responder(200, ['id' => (int) $c['id'], 'estado' => 'devuelto']);
}

// --- Documentos y lote -------------------------------------------------------------------

/** Una fila por alumno activo y asignación del grupo, con la entrega aceptada vigente. */
function datos_del_cierre(array $c): array
{
    $alumnos = lista_vigente((int) $c['grupo_id']);
    $asigs = filas(
        'SELECT a.id, m.nombre AS materia, d.nombre AS docente FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN usuario d ON d.id = a.docente_id WHERE a.grupo_id = ? ORDER BY m.nombre',
        [$c['grupo_id']]
    );
    $filas = [];
    foreach ($asigs as $as) {
        $e = entrega_aceptada_vigente((int) $as['id']);
        $cal = [];
        foreach ($e === null ? [] : calificaciones_de((int) $e['id']) as $x) {
            $cal[(int) $x['alumno_id']] = $x;
        }
        foreach ($alumnos as $al) {
            $x = $cal[(int) $al['alumno_id']] ?? null;
            $filas[] = [
                'alumno_id' => (int) $al['alumno_id'], 'identificador' => $al['identificador'], 'nombre' => $al['nombre'],
                'materia' => $as['materia'], 'docente' => $as['docente'],
                'valor' => $x['valor'] ?? null, 'estatus' => $e === null ? 'sin_entrega' : ($x['estatus'] ?? 'sin_entrega'),
            ];
        }
    }
    return $filas;
}

function ruta_generar_lote(array $a): never
{
    $u = exigir_permiso('lote_entrega', 'crear');
    exigir_permiso('documento_academico', 'crear');
    $c = cierre_o_404((int) $a['id']);
    if ($c['estado'] !== 'aprobado') {
        error_http(409, "El cierre versión {$c['version']} de {$c['grupo']} está {$c['estado']}; el lote sale solo de un cierre aprobado.");
    }
    $id = transaccion(function () use ($c, $u): int {
        if (fila('SELECT id FROM lote_entrega WHERE cierre_id = ? FOR UPDATE', [$c['id']]) !== null) {
            error_http(409, "El cierre versión {$c['version']} de {$c['grupo']} ya tiene su lote. Para cambiar algo, prepara una versión nueva del cierre.");
        }
        $lid = insertar('lote_entrega', ['cierre_id' => $c['id'], 'version' => $c['version'], 'estado' => 'generado', 'generado_por' => $u['id'], 'fecha_generacion' => ahora()]);
        $n = 0;
        foreach (lista_vigente((int) $c['grupo_id']) as $al) {
            insertar('documento_academico', ['alumno_id' => $al['alumno_id'], 'cierre_id' => $c['id'], 'tipo' => 'boleta', 'version' => $c['version'], 'estado' => 'preparado_pendiente_firma']);
            $n++;
        }
        registrar_bitacora('lote_entrega', $lid, 'generar', null, ['periodo' => $c['periodo'], 'grupo' => $c['grupo'], 'version_cierre' => (int) $c['version'], 'boletas' => $n]);
        return $lid;
    });
    responder(200, ['id' => $id]);
}

function ruta_boletas(array $a): never
{
    exigir_permiso('documento_academico', 'ver');
    $c = cierre_o_404((int) $a['id']);
    if ((int) fila('SELECT COUNT(*) AS n FROM documento_academico WHERE cierre_id = ?', [$c['id']])['n'] === 0) {
        error_http(409, "Todavía no se generan las boletas del cierre versión {$c['version']} de {$c['grupo']}. Genera el lote primero.");
    }
    $porAlumno = [];
    foreach (datos_del_cierre($c) as $f) {
        $k = $f['alumno_id'];
        $porAlumno[$k] ??= ['identificador' => $f['identificador'], 'nombre' => $f['nombre'], 'materias' => []];
        $porAlumno[$k]['materias'][] = ['materia' => $f['materia'], 'docente' => $f['docente'], 'valor' => $f['valor'], 'estatus' => $f['estatus']];
    }
    $lote = fila('SELECT l.fecha_generacion, u.nombre AS generado_por FROM lote_entrega l JOIN usuario u ON u.id = l.generado_por WHERE l.cierre_id = ?', [$c['id']]);
    responder(200, [
        'cierre' => ['id' => (int) $c['id'], 'version' => (int) $c['version'], 'grupo' => $c['grupo'], 'periodo' => $c['periodo']],
        'lote' => $lote,
        'leyenda' => 'Pendiente de firma institucional',
        'boletas' => array_values($porAlumno),
    ]);
}

function ruta_lotes(): never
{
    exigir_permiso('lote_entrega', 'ver');
    $donde = '1 = 1';
    $p = [];
    if (isset($_GET['estado']) && $_GET['estado'] !== '' && $_GET['estado'] !== 'todos') {
        $donde = 'l.estado = ?';
        $p[] = (string) $_GET['estado'];
    }
    $filas = filas(
        'SELECT l.id, l.cierre_id, l.version, l.estado, l.fecha_generacion, pe.nombre AS periodo, g.clave AS grupo, g.id AS grupo_id,
                gp.nombre AS generado_por, rc.fecha_recepcion, rc.fecha_carga, rc.discrepancias, rg.nombre AS registrado_por
         FROM lote_entrega l JOIN cierre c ON c.id = l.cierre_id JOIN grupo g ON g.id = c.grupo_id JOIN periodo pe ON pe.id = g.periodo_id
         JOIN usuario gp ON gp.id = l.generado_por
         LEFT JOIN registro_carga_externa rc ON rc.lote_id = l.id LEFT JOIN usuario rg ON rg.id = rc.registrado_por
         WHERE ' . $donde . ' ORDER BY l.fecha_generacion DESC, l.id DESC',
        $p
    );
    responder(200, ['filas' => $filas]);
}

function ruta_csv_lote(array $a): never
{
    exigir_permiso('lote_entrega', 'ver');
    $l = fila('SELECT l.id, l.cierre_id, l.version FROM lote_entrega l WHERE l.id = ?', [(int) $a['id']]);
    if ($l === null) {
        denegar('lote ' . (int) $a['id']);
    }
    $c = cierre_o_404((int) $l['cierre_id']);
    $et = ['acreditada' => 'acreditada', 'no_acreditada' => 'no acreditada', 'sin_derecho' => 'sin derecho', 'sin_entrega' => 'sin entrega'];
    $celda = static function (mixed $v): string {
        $t = $v === null ? '' : (string) $v;
        if (preg_match('/^[=+\-@\t\r]/', $t) === 1) {
            $t = "'" . $t;
        }
        return '"' . str_replace('"', '""', $t) . '"';
    };
    $lineas = [implode(',', array_map($celda, ['matricula', 'nombre', 'materia', 'calificacion', 'estatus']))];
    foreach (datos_del_cierre($c) as $f) {
        $lineas[] = implode(',', array_map($celda, [$f['identificador'], $f['nombre'], $f['materia'], $f['valor'] === null ? '' : number_format((float) $f['valor'], 1, '.', ''), $et[$f['estatus']] ?? $f['estatus']]));
    }
    $nombre = 'lote-' . preg_replace('/[^A-Za-z0-9-]/', '', $c['periodo'] . '-' . $c['grupo']) . '-v' . (int) $l['version'] . '.csv';
    responder_archivo("\xEF\xBB\xBF" . implode("\r\n", $lineas) . "\r\n", 'text/csv; charset=utf-8', $nombre);
}

function lote_o_denegar(int $id): array
{
    $l = fila('SELECT l.id, l.estado, l.version, c.id AS cierre_id, g.clave AS grupo, pe.nombre AS periodo FROM lote_entrega l JOIN cierre c ON c.id = l.cierre_id JOIN grupo g ON g.id = c.grupo_id JOIN periodo pe ON pe.id = g.periodo_id WHERE l.id = ?', [$id]);
    if ($l === null) {
        denegar("lote $id");
    }
    return $l;
}

function ruta_recepcion_lote(array $a): never
{
    $u = exigir_permiso('registro_carga_externa', 'crear');
    $l = lote_o_denegar((int) $a['id']);
    if ($l['estado'] !== 'generado') {
        error_http(409, "El lote de {$l['grupo']} ({$l['periodo']}) ya está {$l['estado']}; la recepción solo se registra una vez.");
    }
    transaccion(function () use ($l, $u): void {
        insertar('registro_carga_externa', ['lote_id' => $l['id'], 'fecha_recepcion' => ahora(), 'estado' => 'recibido', 'registrado_por' => $u['id']]);
        ejecutar('UPDATE lote_entrega SET estado = \'recibido\' WHERE id = ?', [$l['id']]);
        registrar_bitacora('lote_entrega', (int) $l['id'], 'recibir', ['estado' => 'generado'], ['estado' => 'recibido', 'grupo' => $l['grupo'], 'periodo' => $l['periodo']]);
    });
    responder(200, ['id' => (int) $l['id'], 'estado' => 'recibido']);
}

function ruta_carga_lote(array $a): never
{
    $u = exigir_permiso('registro_carga_externa', 'modificar');
    $l = lote_o_denegar((int) $a['id']);
    $d = cuerpo_json();
    $con = ($d['con_discrepancias'] ?? false) === true;
    $texto = texto($d, 'discrepancias', 2000, 'El texto de la discrepancia', $con);
    if ($l['estado'] !== 'recibido') {
        error_http(409, "El lote de {$l['grupo']} ({$l['periodo']}) está {$l['estado']}; la carga se registra después de la recepción y una sola vez.");
    }
    $estado = $con ? 'con_discrepancias' : 'cargado';
    transaccion(function () use ($l, $u, $estado, $texto, $con): void {
        ejecutar('UPDATE registro_carga_externa SET fecha_carga = ?, estado = ?, discrepancias = ?, registrado_por = ? WHERE lote_id = ?', [ahora(), $estado, $con ? $texto : null, $u['id'], $l['id']]);
        ejecutar('UPDATE lote_entrega SET estado = ? WHERE id = ?', [$estado, $l['id']]);
        registrar_bitacora('lote_entrega', (int) $l['id'], 'cargar', ['estado' => 'recibido'], ['estado' => $estado, 'grupo' => $l['grupo'], 'periodo' => $l['periodo'], 'discrepancias' => $con ? $texto : null], $con ? $texto : null);
    });
    responder(200, ['id' => (int) $l['id'], 'estado' => $estado]);
}
