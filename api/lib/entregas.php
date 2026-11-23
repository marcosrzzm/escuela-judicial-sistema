<?php

declare(strict_types=1);

// --- Consultas compartidas -----------------------------------------------------

/** Decisión más reciente de cada alumno en una asignación (la vigente). */
function decisiones_vigentes(int $asignacion_id): array
{
    $filas = filas(
        'SELECT d.id, d.alumno_id, d.resultado, d.motivo, d.referencia_evidencia, d.fecha, d.resolucion_direccion, d.motivo_direccion, r.nombre AS responsable
         FROM decision_evaluacion d JOIN usuario r ON r.id = d.responsable_id
         WHERE d.asignacion_id = ? AND d.id = (SELECT MAX(x.id) FROM decision_evaluacion x WHERE x.asignacion_id = d.asignacion_id AND x.alumno_id = d.alumno_id)',
        [$asignacion_id]
    );
    $mapa = [];
    foreach ($filas as $f) {
        // Solo "sin derecho" y una autorización rechazada bloquean la captura (especificación, 3.2).
        $f['bloqueado'] = $f['resultado'] === 'sin_derecho' || ($f['resultado'] === 'requiere_autorizacion' && $f['resolucion_direccion'] === 'rechazada');
        $mapa[(int) $f['alumno_id']] = $f;
    }
    return $mapa;
}

function calificaciones_de(int $entrega_id): array
{
    return array_map(static function (array $c): array {
        $c['valor'] = $c['valor'] === null ? null : (float) $c['valor'];
        return $c;
    }, filas('SELECT alumno_id, valor, estatus, observacion FROM calificacion WHERE entrega_id = ?', [$entrega_id]));
}

function entrega_completa(int $id): ?array
{
    $e = fila(
        'SELECT e.id, e.asignacion_id, e.version, e.estado, e.responsable_id, r.nombre AS responsable, e.captura_excepcional, e.motivo_captura,
                e.fecha_envio, e.fecha_revision, rv.nombre AS revisado_por, e.motivo
         FROM entrega_calificaciones e JOIN usuario r ON r.id = e.responsable_id LEFT JOIN usuario rv ON rv.id = e.revisado_por
         WHERE e.id = ?',
        [$id]
    );
    if ($e === null) {
        return null;
    }
    $e['captura_excepcional'] = (bool) $e['captura_excepcional'];
    $e['calificaciones'] = calificaciones_de($id);
    return $e;
}

function estatus_de(?float $valor, bool $bloqueado): string
{
    if ($bloqueado) {
        return 'sin_derecho';
    }
    return $valor !== null && $valor >= (float) config('calificacion_minima') ? 'acreditada' : 'no_acreditada';
}

function resumen_entrega(?array $e): ?array
{
    if ($e === null) {
        return null;
    }
    return [
        'id' => (int) $e['id'], 'version' => (int) $e['version'], 'estado' => $e['estado'], 'responsable' => $e['responsable'] ?? null,
        'fecha_envio' => $e['fecha_envio'], 'fecha_revision' => $e['fecha_revision'], 'motivo' => $e['motivo'],
        'captura_excepcional' => (bool) $e['captura_excepcional'],
    ];
}

// --- Asignaciones ------------------------------------------------------------------

function ruta_asignaciones(): never
{
    $u = exigir_permiso('asignacion_docente', 'ver');
    $donde = ['1 = 1'];
    $p = [];
    if (isset($_GET['periodo_id'])) {
        $donde[] = 'g.periodo_id = ?';
        $p[] = (int) $_GET['periodo_id'];
    } else {
        $donde[] = 'pe.estado = \'abierto\'';
    }
    if ($u['base'] === 'docente') {
        $donde[] = 'a.docente_id = ?';
        $p[] = $u['id'];
    } elseif (!ve_todo($u)) {
        denegar('asignaciones');
    }
    $asig = filas(
        'SELECT a.id, a.grupo_id, g.clave AS grupo, g.periodo_id, pe.nombre AS periodo, m.nombre AS materia, d.nombre AS docente,
                (SELECT COUNT(*) FROM inscripcion_grupo i WHERE i.grupo_id = a.grupo_id AND i.estado = \'activa\') AS alumnos_activos
         FROM asignacion_docente a JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id
         JOIN materia m ON m.id = a.materia_id JOIN usuario d ON d.id = a.docente_id
         WHERE ' . implode(' AND ', $donde) . ' ORDER BY pe.fecha_inicio DESC, g.clave, m.nombre',
        $p
    );
    foreach ($asig as &$a) {
        $a['entrega'] = resumen_entrega(entrega_vigente((int) $a['id']));
    }
    responder(200, ['filas' => $asig]);
}

function ruta_asignacion(array $a): never
{
    $u = exigir_permiso('asignacion_docente', 'ver');
    $asig = asignacion_en_alcance($u, (int) $a['id']);
    if ($asig === null) {
        denegar('asignacion ' . (int) $a['id']);
    }
    $decisiones = decisiones_vigentes((int) $asig['id']);
    $alumnos = array_map(static function (array $al) use ($decisiones): array {
        $d = $decisiones[(int) $al['alumno_id']] ?? null;
        $al['decision'] = $d;
        $al['bloqueado'] = $d['bloqueado'] ?? false;
        return $al;
    }, lista_vigente((int) $asig['grupo_id']));
    $vigente = entrega_vigente((int) $asig['id']);
    $versiones = filas(
        'SELECT e.id, e.version, e.estado, e.motivo, e.fecha_envio, e.fecha_revision, r.nombre AS responsable
         FROM entrega_calificaciones e JOIN usuario r ON r.id = e.responsable_id WHERE e.asignacion_id = ? ORDER BY e.version DESC',
        [$asig['id']]
    );
    $historial = filas(
        'SELECT d.id, al.nombre AS alumno, d.resultado, d.motivo, d.fecha, d.resolucion_direccion, r.nombre AS responsable
         FROM decision_evaluacion d JOIN alumno al ON al.id = d.alumno_id JOIN usuario r ON r.id = d.responsable_id
         WHERE d.asignacion_id = ? ORDER BY d.id DESC LIMIT 30',
        [$asig['id']]
    );
    responder(200, [
        'asignacion' => $asig,
        'alumnos' => $alumnos,
        'entrega' => $vigente === null ? null : entrega_completa((int) $vigente['id']),
        'versiones' => $versiones,
        'historial_decisiones' => $historial,
    ]);
}

// --- Captura de calificaciones --------------------------------------------------------

function entrega_o_404(int $id): array
{
    $e = fila('SELECT * FROM entrega_calificaciones WHERE id = ?', [$id]);
    if ($e === null) {
        denegar("entrega $id");
    }
    return $e;
}

/** El docente dueño de la asignación; cualquier otro recibe 403 sin saber si existe. */
function entrega_de_docente(array $u, int $id): array
{
    $e = entrega_o_404($id);
    $asig = asignacion_en_alcance($u, (int) $e['asignacion_id']);
    if ($asig === null || $u['base'] !== 'docente') {
        denegar("entrega $id");
    }
    return [$e, $asig];
}

function ruta_crear_entrega(array $a): never
{
    $u = exigir_permiso('entrega_calificaciones', 'crear');
    $asig = asignacion_en_alcance($u, (int) $a['id']);
    if ($asig === null || $u['base'] !== 'docente') {
        denegar('asignacion ' . (int) $a['id']);
    }
    if ($asig['periodo_estado'] !== 'abierto') {
        error_http(409, "El periodo {$asig['periodo']} está cerrado: ya no se capturan calificaciones.");
    }
    $vigente = entrega_vigente((int) $asig['id']);
    if ($vigente === null) {
        $id = insertar('entrega_calificaciones', ['asignacion_id' => $asig['id'], 'version' => 1, 'estado' => 'borrador', 'responsable_id' => $u['id']]);
        registrar_bitacora('entrega_calificaciones', $id, 'crear', null, ['version' => 1, 'estado' => 'borrador']);
        responder(200, entrega_completa($id));
    }
    if ($vigente['estado'] !== 'borrador') {
        error_http(409, "La entrega de {$asig['materia']} está en estado {$vigente['estado']}; no se puede abrir una captura nueva.");
    }
    responder(200, entrega_completa((int) $vigente['id']));
}

/** Valida y guarda las calificaciones de un borrador. Devuelve cuántos valores quedaron capturados. */
function guardar_calificaciones(array $entrega, array $asig, array $items): int
{
    $lista = [];
    foreach (lista_vigente((int) $asig['grupo_id']) as $al) {
        $lista[(int) $al['alumno_id']] = $al;
    }
    $bloq = decisiones_vigentes((int) $asig['id']);
    $errores = [];
    $limpios = [];
    foreach ($items as $it) {
        $aid = is_array($it) && isset($it['alumno_id']) ? (int) $it['alumno_id'] : 0;
        if (!isset($lista[$aid])) {
            error_http(422, 'Una de las calificaciones es de un alumno que no está en la lista vigente del grupo.');
        }
        $v = $it['valor'] ?? null;
        if ($v === '' || $v === null) {
            $valor = null;
        } elseif (is_int($v) || is_float($v) || (is_string($v) && is_numeric($v))) {
            $valor = (float) $v;
            if ($valor < 0 || $valor > 10 || abs($valor * 10 - round($valor * 10)) > 1e-9) {
                $errores[(string) $aid] = 'Usa un valor de 0 a 10 con un decimal.';
                continue;
            }
        } else {
            $errores[(string) $aid] = 'Usa un valor de 0 a 10 con un decimal.';
            continue;
        }
        $obs = is_string($it['observacion'] ?? null) ? mb_substr(trim($it['observacion']), 0, 255) : '';
        $limpios[$aid] = [$valor, $obs];
    }
    if ($errores !== []) {
        error_http(422, 'Hay calificaciones fuera de rango. Revisa los valores marcados: van de 0 a 10 con un decimal.', $errores);
    }
    $capturados = 0;
    foreach ($limpios as $aid => [$valor, $obs]) {
        $bloqueado = $bloq[$aid]['bloqueado'] ?? false;
        if ($bloqueado) {
            $valor = null;
        }
        ejecutar(
            'INSERT INTO calificacion (entrega_id, alumno_id, valor, estatus, observacion) VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor), estatus = VALUES(estatus), observacion = VALUES(observacion)',
            [$entrega['id'], $aid, $valor, estatus_de($valor, $bloqueado), $obs]
        );
    }
    // Los alumnos sin derecho siempre quedan con su fila bloqueada.
    foreach ($lista as $aid => $_) {
        if ($bloq[$aid]['bloqueado'] ?? false) {
            ejecutar(
                'INSERT INTO calificacion (entrega_id, alumno_id, valor, estatus) VALUES (?,?,NULL,\'sin_derecho\')
                 ON DUPLICATE KEY UPDATE valor = NULL, estatus = \'sin_derecho\'',
                [$entrega['id'], $aid]
            );
        }
    }
    $n = fila('SELECT COUNT(*) AS n FROM calificacion WHERE entrega_id = ? AND valor IS NOT NULL', [$entrega['id']]);
    return (int) $n['n'];
}

function exigir_borrador(array $e, array $asig): void
{
    if ($e['estado'] !== 'borrador') {
        error_http(409, "La versión {$e['version']} de {$asig['materia']} ya está {$e['estado']} y no se edita. Trabaja sobre la versión vigente.");
    }
}

function ruta_guardar_calificaciones(array $a): never
{
    $u = exigir_permiso('calificacion', 'modificar');
    [$e, $asig] = entrega_de_docente($u, (int) $a['id']);
    exigir_borrador($e, $asig);
    $items = cuerpo_json()['calificaciones'] ?? null;
    if (!is_array($items)) {
        error_http(422, 'No llegaron calificaciones para guardar.');
    }
    $n = transaccion(fn () => guardar_calificaciones($e, $asig, $items));
    registrar_bitacora('entrega_calificaciones', (int) $e['id'], 'guardar_borrador', null, ['version' => (int) $e['version'], 'capturadas' => $n]);
    responder(200, entrega_completa((int) $e['id']));
}

/** Verifica que todos los alumnos con derecho tengan valor; devuelve cuántos faltan. */
function faltantes(int $entrega_id, array $asig): int
{
    $bloq = decisiones_vigentes((int) $asig['id']);
    $con_valor = array_column(filas('SELECT alumno_id FROM calificacion WHERE entrega_id = ? AND valor IS NOT NULL', [$entrega_id]), 'alumno_id');
    $con_valor = array_map('intval', $con_valor);
    $faltan = 0;
    foreach (lista_vigente((int) $asig['grupo_id']) as $al) {
        $aid = (int) $al['alumno_id'];
        if (!($bloq[$aid]['bloqueado'] ?? false) && !in_array($aid, $con_valor, true)) {
            $faltan++;
        }
    }
    return $faltan;
}

function marcar_enviada(array $e, array $asig, int $responsable_id): void
{
    $faltan = faltantes((int) $e['id'], $asig);
    if ($faltan > 0) {
        error_http(422, "Faltan $faltan calificaciones por capturar. Completa todas (de 0 a 10) antes de enviar.");
    }
    ejecutar('UPDATE entrega_calificaciones SET estado = \'enviada\', fecha_envio = ?, responsable_id = ? WHERE id = ?', [ahora(), $responsable_id, $e['id']]);
}

function ruta_enviar_entrega(array $a): never
{
    $u = exigir_permiso('entrega_calificaciones', 'modificar');
    [$e, $asig] = entrega_de_docente($u, (int) $a['id']);
    exigir_borrador($e, $asig);
    $items = cuerpo_json()['calificaciones'] ?? null;
    transaccion(function () use ($e, $asig, $items, $u): void {
        if (is_array($items)) {
            guardar_calificaciones($e, $asig, $items);
        }
        marcar_enviada($e, $asig, (int) $u['id']);
    });
    registrar_bitacora('entrega_calificaciones', (int) $e['id'], 'enviar', ['estado' => 'borrador'], ['estado' => 'enviada', 'version' => (int) $e['version']]);
    responder(200, entrega_completa((int) $e['id']));
}

/** Ruta D03: Coordinación captura por un docente que no puede usar el sistema. Cuenta como recaptura. */
function ruta_captura_excepcional(array $a): never
{
    $u = exigir_permiso('entrega_calificaciones', 'crear');
    if ($u['base'] !== 'coordinacion') {
        denegar('captura excepcional');
    }
    $asig = cargar_asignacion((int) $a['id']);
    if ($asig === null) {
        error_http(404, 'Esa asignación ya no existe.');
    }
    if ($asig['periodo_estado'] !== 'abierto') {
        error_http(409, "El periodo {$asig['periodo']} está cerrado: ya no se capturan calificaciones.");
    }
    $d = cuerpo_json();
    $motivo = texto($d, 'motivo', 500, 'El motivo de la captura excepcional');
    $items = $d['calificaciones'] ?? null;
    if (!is_array($items)) {
        error_http(422, 'No llegaron calificaciones para capturar.');
    }
    $vigente = entrega_vigente((int) $asig['id']);
    if ($vigente !== null && $vigente['estado'] !== 'borrador') {
        error_http(409, "La entrega de {$asig['materia']} está en estado {$vigente['estado']}; la captura excepcional solo aplica sobre un borrador o una asignación sin entrega.");
    }
    $id = transaccion(function () use ($vigente, $asig, $items, $motivo, $u): int {
        if ($vigente === null) {
            $id = insertar('entrega_calificaciones', ['asignacion_id' => $asig['id'], 'version' => 1, 'estado' => 'borrador', 'responsable_id' => $u['id']]);
        } else {
            $id = (int) $vigente['id'];
        }
        ejecutar('UPDATE entrega_calificaciones SET captura_excepcional = 1, motivo_captura = ? WHERE id = ?', [$motivo, $id]);
        $e = ['id' => $id];
        $n = guardar_calificaciones($e, $asig, $items);
        marcar_enviada($e, $asig, (int) $u['id']);
        recalcular_recaptura((int) $asig['grupo_id']);
        registrar_bitacora('entrega_calificaciones', $id, 'captura_excepcional', null, ['estado' => 'enviada', 'campos_capturados' => $n, 'por_docente' => $asig['docente']], $motivo);
        return $id;
    });
    responder(200, entrega_completa($id));
}

// --- Revisión ----------------------------------------------------------------------------

function ruta_entrega(array $a): never
{
    $u = exigir_permiso('entrega_calificaciones', 'ver');
    $e = entrega_o_404((int) $a['id']);
    $asig = asignacion_en_alcance($u, (int) $e['asignacion_id']);
    if ($asig === null) {
        denegar('entrega ' . (int) $e['id']);
    }
    $alumnos = lista_vigente((int) $asig['grupo_id']);
    responder(200, ['asignacion' => $asig, 'alumnos' => $alumnos, 'entrega' => entrega_completa((int) $e['id'])]);
}

function entrega_para_revisar(int $id, string $accion): array
{
    $u = exigir_permiso('entrega_calificaciones', $accion);
    $e = entrega_o_404($id);
    return [$u, $e, cargar_asignacion((int) $e['asignacion_id'])];
}

function nueva_version_borrador(array $e, array $asig): int
{
    $nuevo = insertar('entrega_calificaciones', [
        'asignacion_id' => $e['asignacion_id'], 'version' => (int) $e['version'] + 1, 'estado' => 'borrador', 'responsable_id' => $asig['docente_id'],
    ]);
    ejecutar(
        'INSERT INTO calificacion (entrega_id, alumno_id, valor, estatus, observacion)
         SELECT ?, alumno_id, valor, estatus, observacion FROM calificacion WHERE entrega_id = ?',
        [$nuevo, $e['id']]
    );
    return $nuevo;
}

function ruta_aceptar(array $a): never
{
    [$u, $e, $asig] = entrega_para_revisar((int) $a['id'], 'aceptar');
    if ($e['estado'] !== 'enviada') {
        error_http(409, "La versión {$e['version']} de {$asig['materia']} está {$e['estado']}; solo se acepta una entrega enviada.");
    }
    transaccion(function () use ($e, $asig, $u): void {
        ejecutar('UPDATE entrega_calificaciones SET estado = \'aceptada\', fecha_revision = ?, revisado_por = ? WHERE id = ?', [ahora(), $u['id'], $e['id']]);
        aplicar_pendientes($asig, (int) $e['id'], (int) $e['version']);
        registrar_bitacora('entrega_calificaciones', (int) $e['id'], 'aceptar', ['estado' => 'enviada'], ['estado' => 'aceptada', 'version' => (int) $e['version'], 'materia' => $asig['materia'], 'grupo' => $asig['grupo']]);
    });
    responder(200, entrega_completa((int) $e['id']));
}

function ruta_devolver(array $a): never
{
    [$u, $e, $asig] = entrega_para_revisar((int) $a['id'], 'devolver');
    $motivo = texto(cuerpo_json(), 'motivo', 500, 'El motivo de la devolución');
    if ($e['estado'] !== 'enviada') {
        error_http(409, "La versión {$e['version']} de {$asig['materia']} está {$e['estado']}; solo se devuelve una entrega enviada.");
    }
    $nuevo = transaccion(function () use ($e, $asig, $u, $motivo): int {
        ejecutar('UPDATE entrega_calificaciones SET estado = \'devuelta\', fecha_revision = ?, revisado_por = ?, motivo = ? WHERE id = ?', [ahora(), $u['id'], $motivo, $e['id']]);
        $nuevo = nueva_version_borrador($e, $asig);
        registrar_bitacora('entrega_calificaciones', (int) $e['id'], 'devolver', ['estado' => 'enviada', 'version' => (int) $e['version']], ['estado' => 'devuelta', 'version_nueva' => (int) $e['version'] + 1, 'materia' => $asig['materia'], 'grupo' => $asig['grupo']], $motivo);
        return $nuevo;
    });
    responder(200, ['devuelta' => entrega_completa((int) $e['id']), 'nueva' => entrega_completa($nuevo)]);
}

function ruta_reabrir(array $a): never
{
    [$u, $e, $asig] = entrega_para_revisar((int) $a['id'], 'reabrir');
    $motivo = texto(cuerpo_json(), 'motivo', 500, 'El motivo de la reapertura');
    if ($e['estado'] !== 'aceptada') {
        error_http(409, "La versión {$e['version']} de {$asig['materia']} está {$e['estado']}; solo se reabre una entrega aceptada.");
    }
    $cierre = fila('SELECT version FROM cierre WHERE grupo_id = ? AND estado = \'aprobado\' LIMIT 1', [$asig['grupo_id']]);
    if ($cierre !== null) {
        error_http(409, "El grupo {$asig['grupo']} tiene el cierre versión {$cierre['version']} aprobado. Prepara una versión nueva del cierre, con motivo, antes de reabrir esta entrega.");
    }
    $nuevo = transaccion(function () use ($e, $asig, $u, $motivo): int {
        ejecutar('UPDATE entrega_calificaciones SET estado = \'reabierta\', fecha_revision = ?, revisado_por = ?, motivo = ? WHERE id = ?', [ahora(), $u['id'], $motivo, $e['id']]);
        $nuevo = nueva_version_borrador($e, $asig);
        registrar_bitacora('entrega_calificaciones', (int) $e['id'], 'reabrir', ['estado' => 'aceptada', 'version' => (int) $e['version']], ['estado' => 'reabierta', 'version_nueva' => (int) $e['version'] + 1, 'materia' => $asig['materia'], 'grupo' => $asig['grupo']], $motivo);
        return $nuevo;
    });
    responder(200, ['reabierta' => entrega_completa((int) $e['id']), 'nueva' => entrega_completa($nuevo)]);
}

/** Abre pendientes por calificación no aprobatoria o sin derecho, y resuelve los de la misma materia si ya aprobó. */
function aplicar_pendientes(array $asig, int $entrega_id, int $version): void
{
    foreach (filas('SELECT alumno_id, estatus FROM calificacion WHERE entrega_id = ?', [$entrega_id]) as $c) {
        $aid = (int) $c['alumno_id'];
        if ($c['estatus'] === 'acreditada') {
            $abiertos = filas('SELECT id FROM pendiente_academico WHERE alumno_id = ? AND materia_id = ? AND estado = \'abierto\'', [$aid, $asig['materia_id']]);
            foreach ($abiertos as $p) {
                $res = "Resuelto con la entrega v$version de {$asig['materia']} ({$asig['periodo']})";
                ejecutar('UPDATE pendiente_academico SET estado = \'resuelto\', resolucion = ?, resuelto_en = ? WHERE id = ?', [$res, ahora(), $p['id']]);
                registrar_bitacora('pendiente_academico', (int) $p['id'], 'resolver_automatico', ['estado' => 'abierto'], ['estado' => 'resuelto', 'resolucion' => $res], $res);
            }
            continue;
        }
        $existe = fila(
            'SELECT id FROM pendiente_academico WHERE alumno_id = ? AND materia_id = ? AND periodo_origen_id = ? AND estado = \'abierto\'',
            [$aid, $asig['materia_id'], $asig['periodo_id']]
        );
        if ($existe === null) {
            $tipo = $c['estatus'] === 'sin_derecho' ? 'sin_derecho' : 'reprobada';
            $id = insertar('pendiente_academico', ['alumno_id' => $aid, 'materia_id' => $asig['materia_id'], 'periodo_origen_id' => $asig['periodo_id'], 'tipo' => $tipo]);
            registrar_bitacora('pendiente_academico', $id, 'abrir_automatico', null, ['materia' => $asig['materia'], 'tipo' => $tipo, 'periodo' => $asig['periodo']]);
        }
    }
}

// --- Decisiones de evaluación y autorizaciones ------------------------------------------------

function ruta_crear_decision(array $a): never
{
    $u = exigir_permiso('decision_evaluacion', 'crear');
    $asig = cargar_asignacion((int) $a['id']);
    if ($asig === null) {
        error_http(404, 'Esa asignación ya no existe.');
    }
    if ($asig['periodo_estado'] !== 'abierto') {
        error_http(409, "El periodo {$asig['periodo']} está cerrado: ya no se registran decisiones.");
    }
    $d = cuerpo_json();
    $resultado = una_de($d, 'resultado', ['con_derecho', 'sin_derecho', 'pendiente_revision', 'requiere_autorizacion'], 'El resultado');
    $motivo = texto($d, 'motivo', 500, 'El motivo');
    $evid = texto($d, 'referencia_evidencia', 255, 'La referencia de evidencia', false);
    $alumno = null;
    foreach (lista_vigente((int) $asig['grupo_id']) as $al) {
        if ((int) $al['alumno_id'] === (int) ($d['alumno_id'] ?? 0)) {
            $alumno = $al;
        }
    }
    if ($alumno === null) {
        error_http(422, 'Elige un alumno de la lista vigente del grupo.', ['alumno_id' => 'Elige un alumno de la lista.']);
    }
    $previa = decisiones_vigentes((int) $asig['id'])[(int) $alumno['alumno_id']] ?? null;
    $id = insertar('decision_evaluacion', [
        'alumno_id' => $alumno['alumno_id'], 'asignacion_id' => $asig['id'], 'resultado' => $resultado, 'motivo' => $motivo,
        'referencia_evidencia' => $evid, 'responsable_id' => $u['id'], 'fecha' => ahora(),
    ]);
    registrar_bitacora('decision_evaluacion', $id, 'decidir', $previa === null ? null : ['resultado' => $previa['resultado']], ['alumno' => $alumno['identificador'], 'materia' => $asig['materia'], 'grupo' => $asig['grupo'], 'resultado' => $resultado], $motivo);
    responder(200, ['id' => $id]);
}

function ruta_autorizaciones(): never
{
    $u = exigir_permiso('decision_evaluacion', 'ver');
    if ($u['base'] !== 'direccion') {
        denegar('autorizaciones');
    }
    $decisiones = filas(
        'SELECT d.id, al.nombre AS alumno, al.identificador, m.nombre AS materia, g.clave AS grupo, pe.nombre AS periodo,
                d.motivo, d.referencia_evidencia, d.fecha, r.nombre AS responsable
         FROM decision_evaluacion d
         JOIN alumno al ON al.id = d.alumno_id JOIN asignacion_docente a ON a.id = d.asignacion_id
         JOIN materia m ON m.id = a.materia_id JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id
         JOIN usuario r ON r.id = d.responsable_id
         WHERE d.resultado = \'requiere_autorizacion\' AND d.resolucion_direccion IS NULL
           AND d.id = (SELECT MAX(x.id) FROM decision_evaluacion x WHERE x.asignacion_id = d.asignacion_id AND x.alumno_id = d.alumno_id)
         ORDER BY d.fecha'
    );
    $cierres = filas(
        'SELECT c.id, c.version, g.clave AS grupo, pe.nombre AS periodo, c.excepcion, c.motivo_excepcion, r.nombre AS preparado_por, c.creado_en
         FROM cierre c JOIN grupo g ON g.id = c.grupo_id JOIN periodo pe ON pe.id = g.periodo_id JOIN usuario r ON r.id = c.preparado_por
         WHERE c.estado = \'en_autorizacion\' ORDER BY c.creado_en'
    );
    foreach ($cierres as &$c) {
        $c['excepcion'] = (bool) $c['excepcion'];
    }
    responder(200, ['decisiones' => $decisiones, 'cierres' => $cierres]);
}

function ruta_resolver_decision(array $a): never
{
    $u = exigir_permiso('decision_evaluacion', 'modificar');
    $d = cuerpo_json();
    $resolucion = una_de($d, 'resolucion', ['autorizada', 'rechazada'], 'La resolución');
    $motivo = texto($d, 'motivo', 500, 'El motivo');
    $dec = fila(
        'SELECT d.*, al.nombre AS alumno FROM decision_evaluacion d JOIN alumno al ON al.id = d.alumno_id WHERE d.id = ?',
        [(int) $a['id']]
    );
    if ($dec === null) {
        error_http(404, 'Esa decisión ya no existe.');
    }
    $vigente = decisiones_vigentes((int) $dec['asignacion_id'])[(int) $dec['alumno_id']] ?? null;
    if ($dec['resultado'] !== 'requiere_autorizacion' || $dec['resolucion_direccion'] !== null || $vigente === null || (int) $vigente['id'] !== (int) $dec['id']) {
        error_http(409, "La decisión sobre {$dec['alumno']} ya no está esperando autorización.");
    }
    ejecutar(
        'UPDATE decision_evaluacion SET resolucion_direccion = ?, motivo_direccion = ?, autorizado_por = ?, fecha_autorizacion = ? WHERE id = ?',
        [$resolucion, $motivo, $u['id'], ahora(), $dec['id']]
    );
    registrar_bitacora('decision_evaluacion', (int) $dec['id'], $resolucion === 'autorizada' ? 'autorizar' : 'rechazar', ['resolucion_direccion' => null], ['resolucion_direccion' => $resolucion, 'alumno' => $dec['alumno']], $motivo);
    responder(200, ['id' => (int) $dec['id'], 'resolucion' => $resolucion]);
}
