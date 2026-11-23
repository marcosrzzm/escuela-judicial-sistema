<?php

declare(strict_types=1);

/** Campos recapturados de un grupo: valores que Coordinación escribió por un docente (CA-11). */
function recalcular_recaptura(int $grupo_id): void
{
    $n = fila(
        'SELECT COUNT(*) AS n FROM calificacion c
         JOIN entrega_calificaciones e ON e.id = c.entrega_id AND e.captura_excepcional = 1
         JOIN asignacion_docente a ON a.id = e.asignacion_id
         WHERE a.grupo_id = ? AND c.valor IS NOT NULL',
        [$grupo_id]
    );
    ejecutar(
        'INSERT INTO metrica_caso (tipo, grupo_id, origen, campos_recapturados, registrado_por) VALUES (\'cierre\', ?, \'sistema\', ?, ?)
         ON DUPLICATE KEY UPDATE campos_recapturados = VALUES(campos_recapturados)',
        [$grupo_id, (int) $n['n'], usuario_actual()['id']]
    );
}

function resumen_casos(array $casos): array
{
    $n = count($casos);
    return [
        'casos' => $n,
        'campos_promedio' => $n === 0 ? null : round(array_sum(array_column($casos, 'campos_recapturados')) / $n, 1),
        'minutos_promedio' => $n === 0 ? null : round(array_sum(array_column($casos, 'segundos_activos')) / 60 / $n, 1),
    ];
}

function ruta_metricas(): never
{
    exigir_permiso('metrica_caso', 'ver');
    $sistema = filas(
        'SELECT g.id AS grupo_id, g.clave AS grupo, pe.nombre AS periodo, t.tipo,
                CAST(COALESCE(m.campos_recapturados, 0) AS SIGNED) AS campos_recapturados, CAST(COALESCE(m.segundos_activos, 0) AS SIGNED) AS segundos_activos
         FROM grupo g JOIN periodo pe ON pe.id = g.periodo_id
         CROSS JOIN (SELECT \'lista\' AS tipo UNION SELECT \'cierre\') t
         LEFT JOIN metrica_caso m ON m.origen = \'sistema\' AND m.tipo = t.tipo AND m.grupo_id = g.id
         WHERE pe.estado = \'abierto\' ORDER BY g.clave, t.tipo'
    );
    $base = filas(
        'SELECT m.id, m.tipo, g.clave AS grupo, pe.nombre AS periodo, m.campos_recapturados, m.segundos_activos, m.nota, u.nombre AS registrado_por, m.fecha
         FROM metrica_caso m LEFT JOIN grupo g ON g.id = m.grupo_id LEFT JOIN periodo pe ON pe.id = g.periodo_id JOIN usuario u ON u.id = m.registrado_por
         WHERE m.origen = \'linea_base\' ORDER BY m.id DESC'
    );
    $resumen = [];
    foreach (['lista', 'cierre'] as $tipo) {
        $resumen[$tipo] = [
            'sistema' => resumen_casos(array_values(array_filter($sistema, fn ($c) => $c['tipo'] === $tipo && ((int) $c['segundos_activos'] > 0 || (int) $c['campos_recapturados'] > 0)))),
            'linea_base' => resumen_casos(array_values(array_filter($base, fn ($c) => $c['tipo'] === $tipo))),
        ];
    }
    responder(200, ['sistema' => $sistema, 'linea_base' => $base, 'resumen' => $resumen]);
}

function ruta_linea_base(): never
{
    exigir_permiso('metrica_caso', 'crear');
    $d = cuerpo_json();
    $tipo = una_de($d, 'tipo', ['lista', 'cierre'], 'El tipo de caso');
    $campos = entero($d, 'campos_recapturados', 'Los campos recapturados');
    $min = $d['minutos'] ?? null;
    if (!(is_int($min) || is_float($min)) || $min < 0 || $min > 9999) {
        error_http(422, 'Escribe los minutos activos del caso (un número de 0 a 9999).', ['minutos' => 'Escribe un número de 0 a 9999.']);
    }
    if ($campos > 9999) {
        error_http(422, 'Los campos recapturados admiten hasta 9999.', ['campos_recapturados' => 'Máximo 9999.']);
    }
    $grupo = null;
    if (($d['grupo_id'] ?? null) !== null && $d['grupo_id'] !== '') {
        $grupo = entero($d, 'grupo_id', 'El grupo');
        if (fila('SELECT id FROM grupo WHERE id = ?', [$grupo]) === null) {
            error_http(422, 'Elige un grupo de la lista.', ['grupo_id' => 'Elige un grupo de la lista.']);
        }
    }
    $nota = texto($d, 'nota', 500, 'La nota', false);
    $id = insertar('metrica_caso', [
        'tipo' => $tipo, 'grupo_id' => $grupo, 'origen' => 'linea_base', 'campos_recapturados' => $campos,
        'segundos_activos' => (int) round($min * 60), 'nota' => $nota, 'registrado_por' => usuario_actual()['id'], 'fecha' => ahora(),
    ]);
    registrar_bitacora('metrica_caso', $id, 'linea_base', null, ['tipo' => $tipo, 'campos_recapturados' => $campos, 'minutos' => $min], $nota === '' ? null : $nota);
    responder(200, ['id' => $id]);
}

/** Latido del navegador cada 30 s con los segundos activos; el servidor nunca acepta más de 30 por latido. */
function ruta_tiempo(): never
{
    $u = exigir_permiso('metrica_caso', 'crear');
    $d = cuerpo_json();
    $tipo = una_de($d, 'tipo', ['lista', 'cierre'], 'El tipo de caso');
    $gid = entero($d, 'grupo_id', 'El grupo');
    if (fila('SELECT id FROM grupo WHERE id = ?', [$gid]) === null) {
        error_http(404, 'Ese grupo ya no existe.');
    }
    $seg = max(0, min(30, (int) ($d['segundos'] ?? 0)));
    ejecutar(
        'INSERT INTO metrica_caso (tipo, grupo_id, origen, segundos_activos, registrado_por) VALUES (?, ?, \'sistema\', ?, ?)
         ON DUPLICATE KEY UPDATE segundos_activos = segundos_activos + VALUES(segundos_activos)',
        [$tipo, $gid, $seg, $u['id']]
    );
    responder(200, ['segundos_aceptados' => $seg]);
}

function ruta_bitacora(): never
{
    $u = exigir_permiso('bitacora_cambio', 'ver');
    // Coordinación y Dirección ven la bitácora completa; los demás roles no tienen acceso (especificación, 10.7).
    $completa = ve_todo($u);
    $donde = ['1 = 1'];
    $p = [];
    foreach (['entidad' => 'b.entidad', 'accion' => 'b.accion'] as $param => $col) {
        if (isset($_GET[$param]) && $_GET[$param] !== '' && $_GET[$param] !== 'todos') {
            $donde[] = "$col = ?";
            $p[] = (string) $_GET[$param];
        }
    }
    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $donde[] = $completa ? '(u.nombre LIKE ? OR b.motivo LIKE ?)' : 'u.nombre LIKE ?';
        $p[] = "%$q%";
        if ($completa) {
            $p[] = "%$q%";
        }
    }
    $w = implode(' AND ', $donde);
    $total = (int) fila("SELECT COUNT(*) AS n FROM bitacora_cambio b LEFT JOIN usuario u ON u.id = b.usuario_id WHERE $w", $p)['n'];
    [$pagina, $offset, $por, $paginas] = paginar($total);
    $filas = filas(
        "SELECT b.id, b.entidad, b.registro_id, b.accion, b.fecha, b.motivo, b.antes, b.despues, u.nombre AS usuario
         FROM bitacora_cambio b LEFT JOIN usuario u ON u.id = b.usuario_id WHERE $w ORDER BY b.id DESC LIMIT $por OFFSET $offset",
        $p
    );
    foreach ($filas as &$f) {
        $f['antes'] = !$completa || $f['antes'] === null ? null : json_decode($f['antes'], true);
        $f['despues'] = !$completa || $f['despues'] === null ? null : json_decode($f['despues'], true);
        if (!$completa) {
            $f['motivo'] = null;
        }
    }
    $entidades = array_column(filas('SELECT DISTINCT entidad FROM bitacora_cambio ORDER BY entidad'), 'entidad');
    responder(200, ['filas' => $filas, 'total' => $total, 'pagina' => $pagina, 'paginas' => $paginas, 'entidades' => $entidades]);
}
