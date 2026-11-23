<?php

declare(strict_types=1);

/**
 * Experiencia de plataforma escolar (especificación, sección 11): tablero, resumen y sábana del grupo,
 * calendario, avisos, cuenta y la cuenta de Alumno. Todo se resuelve en el servidor según el rol:
 * la interfaz solo dibuja lo que esta capa ya recortó.
 */

// --- Avisos (11.5): se crean donde ya ocurren los flujos; nunca llevan datos sensibles --------------------

/** Aviso para una persona. `clave` evita repetir uno automático (la misma clave para la misma persona se ignora). */
function avisar(int $usuario_id, string $tipo, string $texto, string $enlace, ?string $clave = null): void
{
    ejecutar(
        'INSERT IGNORE INTO aviso (usuario_id, tipo, texto, enlace, clave, creado_en) VALUES (?, ?, ?, ?, ?, ?)',
        [$usuario_id, $tipo, mb_substr($texto, 0, 255), $enlace, $clave, ahora()]
    );
}

/**
 * Avisa a cada cuenta activa que tiene el permiso (así cubre los roles personalizados). `bases` limita el rol base
 * (y exige rol del sistema); quien hizo la acción no se avisa a sí mismo.
 */
function avisar_a_permiso(string $recurso, string $accion, string $tipo, string $texto, string $enlace, array $bases = []): void
{
    $yo = actor_real_id();
    $cuentas = filas(
        'SELECT u.id, r.base, r.es_sistema, r.permisos FROM usuario u JOIN rol r ON r.clave = u.rol AND r.estado = \'activo\' WHERE u.estado = \'activo\''
    );
    foreach ($cuentas as $c) {
        if ($yo === (int) $c['id'] || ($bases !== [] && (!in_array($c['base'], $bases, true) || (int) $c['es_sistema'] !== 1))) {
            continue;
        }
        if (in_array("$recurso:$accion", permisos_de_rol($c['base'], (int) $c['es_sistema'] === 1, $c['permisos']), true)) {
            avisar((int) $c['id'], $tipo, $texto, $enlace);
        }
    }
}

/** Al aceptar una entrega, cada alumno con cuenta recibe "se publicaron tus calificaciones" (sin el valor). */
function avisar_alumnos_de_entrega(int $entrega_id, array $asig): void
{
    $cuentas = filas(
        'SELECT DISTINCT us.id FROM calificacion c JOIN usuario us ON us.alumno_id = c.alumno_id AND us.estado = \'activo\' WHERE c.entrega_id = ?',
        [$entrega_id]
    );
    foreach ($cuentas as $c) {
        avisar((int) $c['id'], 'calificaciones_publicadas', "Se publicaron tus calificaciones de {$asig['materia']} ({$asig['grupo']}).", '/historial');
    }
}

/** Aviso de fecha límite a 3 días o menos, calculado al leer los avisos (sin tareas programadas). Solo Docente. */
function avisos_de_fecha_limite(array $u): void
{
    if ($u['base'] !== 'docente' || ($u['solo_lectura'] ?? false)) {
        return;
    }
    $filas = filas(
        'SELECT a.id, a.fecha_limite_entrega AS fecha, m.nombre AS materia, g.clave AS grupo
         FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id
         WHERE a.docente_id = ? AND pe.estado = \'abierto\' AND a.fecha_limite_entrega BETWEEN UTC_DATE() AND (UTC_DATE() + INTERVAL 3 DAY)',
        [$u['id']]
    );
    foreach ($filas as $f) {
        $v = entrega_vigente((int) $f['id']);
        if ($v !== null && in_array($v['estado'], ['enviada', 'aceptada'], true)) {
            continue;
        }
        avisar((int) $u['id'], 'fecha_limite', "Se acerca la fecha límite de entrega de {$f['materia']} ({$f['grupo']}): {$f['fecha']}.", "/asignaciones/{$f['id']}/calificaciones", "limite:{$f['id']}:{$f['fecha']}");
    }
}

function ruta_avisos(): never
{
    $u = exigir_sesion();
    avisos_de_fecha_limite($u);
    $filas = filas(
        'SELECT id, tipo, texto, enlace, leido_en IS NOT NULL AS leido, creado_en
         FROM aviso WHERE usuario_id = ? AND creado_en > (UTC_TIMESTAMP() - INTERVAL 90 DAY) ORDER BY id DESC LIMIT 100',
        [$u['id']]
    );
    foreach ($filas as &$f) {
        $f['leido'] = (bool) $f['leido'];
    }
    responder(200, ['filas' => $filas, 'no_leidos' => no_leidos((int) $u['id'])]);
}

function no_leidos(int $usuario_id): int
{
    return (int) fila('SELECT COUNT(*) AS n FROM aviso WHERE usuario_id = ? AND leido_en IS NULL AND creado_en > (UTC_TIMESTAMP() - INTERVAL 90 DAY)', [$usuario_id])['n'];
}

/** Solo el número: lo consulta la barra lateral. */
function ruta_avisos_resumen(): never
{
    $u = exigir_sesion();
    avisos_de_fecha_limite($u);
    responder(200, ['no_leidos' => no_leidos((int) $u['id'])]);
}

function ruta_aviso_leer(array $a): never
{
    $u = exigir_sesion();
    $av = fila('SELECT id, usuario_id FROM aviso WHERE id = ?', [(int) $a['id']]);
    if ($av === null || (int) $av['usuario_id'] !== (int) $u['id']) {
        denegar('aviso ' . (int) $a['id']);
    }
    ejecutar('UPDATE aviso SET leido_en = COALESCE(leido_en, ?) WHERE id = ?', [ahora(), $av['id']]);
    responder(200, ['no_leidos' => no_leidos((int) $u['id'])]);
}

function ruta_avisos_leer_todos(): never
{
    $u = exigir_sesion();
    ejecutar('UPDATE aviso SET leido_en = ? WHERE usuario_id = ? AND leido_en IS NULL', [ahora(), $u['id']]);
    responder(200, ['no_leidos' => 0]);
}

// --- Tablero (11.2) ------------------------------------------------------------------------------------

/** Contadores de Coordinación (antes Inicio): alimentan Por hacer del tablero y la ruta /inicio. */
function contadores_coordinacion(array $u): array
{
    $por_revisar = fila('SELECT COUNT(*) AS n FROM entrega_calificaciones WHERE estado = \'enviada\'');
    $a_direccion = fila(
        'SELECT COUNT(*) AS n FROM decision_evaluacion d
         WHERE d.resultado = \'requiere_autorizacion\' AND d.resolucion_direccion IS NULL
           AND d.id = (SELECT MAX(x.id) FROM decision_evaluacion x WHERE x.asignacion_id = d.asignacion_id AND x.alumno_id = d.alumno_id)'
    );
    $cierres_direccion = fila('SELECT COUNT(*) AS n FROM cierre WHERE estado = \'en_autorizacion\'');
    $con_discrepancias = filas('SELECT c.grupo_id FROM lote_entrega l JOIN cierre c ON c.id = l.cierre_id WHERE l.estado = \'con_discrepancias\'');
    $listos = [];
    foreach (filas('SELECT g.id FROM grupo g JOIN periodo pe ON pe.id = g.periodo_id WHERE pe.estado = \'abierto\' AND g.estado = \'activo\'') as $g) {
        $enCurso = fila('SELECT id FROM cierre WHERE grupo_id = ? AND estado IN (\'preparado\', \'en_autorizacion\', \'aprobado\') LIMIT 1', [$g['id']]);
        $asig = estado_asignaciones((int) $g['id']);
        if ($enCurso === null && $asig !== [] && !in_array(false, array_column($asig, 'aceptada'), true)) {
            $listos[] = (int) $g['id'];
        }
    }
    // Solicitudes de restablecer contraseña: solo las ve el rol del sistema coordinacion (especificación, 10.6).
    $solicitudes = $u['es_sistema'] ? (int) fila('SELECT COUNT(*) AS n FROM solicitud_restablecer WHERE estado = \'pendiente\'')['n'] : 0;
    return [
        'solicitudes_acceso' => $solicitudes,
        'entregas_por_revisar' => (int) $por_revisar['n'],
        'decisiones_en_direccion' => (int) $a_direccion['n'],
        'cierres_en_direccion' => (int) $cierres_direccion['n'],
        'grupos_listos_para_cierre' => count($listos),
        'ids_grupos_listos' => $listos,
        'lotes_con_discrepancias' => count($con_discrepancias),
        'ids_grupos_con_discrepancias' => array_map('intval', array_column($con_discrepancias, 'grupo_id')),
    ];
}

function ruta_inicio(): never
{
    $u = exigir_permiso('cierre', 'ver');
    if ($u['base'] !== 'coordinacion') {
        denegar('inicio');
    }
    $c = contadores_coordinacion($u);
    unset($c['ids_grupos_listos'], $c['ids_grupos_con_discrepancias']);
    responder(200, $c);
}

/** Enlace a la sección de un grupo si hay uno solo; si hay varios, a la lista de grupos. */
function enlace_a_grupos(array $ids, string $seccion): string
{
    return count($ids) === 1 ? "/grupos/{$ids[0]}/$seccion" : '/grupos';
}

function elemento_por_hacer(string $tipo, string $texto, string $enlace, ?int $cantidad = null, ?string $fecha = null): array
{
    return ['tipo' => $tipo, 'texto' => $texto, 'enlace' => $enlace, 'cantidad' => $cantidad, 'fecha' => $fecha];
}

/** Fechas límite de la semana de las asignaciones que el rol ve y cuya entrega aún no se envía. */
function fechas_de_la_semana(array $u): array
{
    $donde = $u['base'] === 'docente' ? ' AND a.docente_id = ' . (int) $u['id'] : '';
    $filas = filas(
        'SELECT a.id, a.grupo_id, a.fecha_limite_entrega AS fecha, m.nombre AS materia, g.clave AS grupo
         FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id
         WHERE pe.estado = \'abierto\' AND a.fecha_limite_entrega BETWEEN UTC_DATE() AND (UTC_DATE() + INTERVAL 7 DAY)' . $donde . ' ORDER BY a.fecha_limite_entrega'
    );
    $salida = [];
    foreach ($filas as $f) {
        $v = entrega_vigente((int) $f['id']);
        if ($v !== null && in_array($v['estado'], ['enviada', 'aceptada'], true)) {
            continue;
        }
        $enlace = $u['base'] === 'docente' ? "/asignaciones/{$f['id']}/calificaciones" : "/grupos/{$f['grupo_id']}/materias";
        $salida[] = elemento_por_hacer('fecha_limite', "Vence la entrega de {$f['materia']} ({$f['grupo']})", $enlace, null, $f['fecha']);
    }
    return $salida;
}

function por_hacer_de(array $u): array
{
    $items = [];
    if ($u['base'] === 'coordinacion') {
        $c = contadores_coordinacion($u);
        if ($c['entregas_por_revisar'] > 0) {
            $items[] = elemento_por_hacer('entregas_por_revisar', 'Entregas por revisar', '/revision?estado=enviada', $c['entregas_por_revisar']);
        }
        if ($c['solicitudes_acceso'] > 0) {
            $items[] = elemento_por_hacer('solicitudes_acceso', 'Solicitudes de contraseña por resolver', '/usuarios', $c['solicitudes_acceso']);
        }
        if ($c['grupos_listos_para_cierre'] > 0) {
            $items[] = elemento_por_hacer('grupos_listos', 'Grupos listos para cierre', enlace_a_grupos($c['ids_grupos_listos'], 'cierre'), $c['grupos_listos_para_cierre']);
        }
        if ($c['decisiones_en_direccion'] + $c['cierres_en_direccion'] > 0) {
            $items[] = elemento_por_hacer('esperando_direccion', 'Esperando a Dirección', '/derecho', $c['decisiones_en_direccion'] + $c['cierres_en_direccion']);
        }
        if ($c['lotes_con_discrepancias'] > 0) {
            $items[] = elemento_por_hacer('lotes_discrepancias', 'Lotes con discrepancias', enlace_a_grupos($c['ids_grupos_con_discrepancias'], 'cierre'), $c['lotes_con_discrepancias']);
        }
    }
    if ($u['base'] === 'direccion') {
        $c = contadores_coordinacion($u);
        if ($c['decisiones_en_direccion'] > 0) {
            $items[] = elemento_por_hacer('autorizaciones', 'Decisiones por autorizar', '/autorizaciones', $c['decisiones_en_direccion']);
        }
        if ($c['cierres_en_direccion'] > 0) {
            $items[] = elemento_por_hacer('cierres_autorizar', 'Cierres por autorizar', '/autorizaciones', $c['cierres_en_direccion']);
        }
    }
    if ($u['base'] === 'docente') {
        $devueltas = filas(
            'SELECT a.id, m.nombre AS materia, g.clave AS grupo
             FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id
             WHERE a.docente_id = ? AND pe.estado = \'abierto\'
               AND (SELECT e.estado FROM entrega_calificaciones e WHERE e.asignacion_id = a.id ORDER BY e.version DESC LIMIT 1) = \'borrador\'
               AND EXISTS (SELECT 1 FROM entrega_calificaciones p WHERE p.asignacion_id = a.id AND p.estado = \'devuelta\')',
            [$u['id']]
        );
        foreach ($devueltas as $d) {
            $items[] = elemento_por_hacer('entrega_devuelta', "Corregir la entrega de {$d['materia']} ({$d['grupo']})", "/asignaciones/{$d['id']}/calificaciones");
        }
    }
    if ($u['base'] === 'carga_externa') {
        foreach (['generado' => 'Lotes por recibir', 'recibido' => 'Lotes por cargar'] as $estado => $texto) {
            $n = (int) fila('SELECT COUNT(*) AS n FROM lote_entrega WHERE estado = ?', [$estado])['n'];
            if ($n > 0) {
                $items[] = elemento_por_hacer("lotes_$estado", $texto, '/lotes', $n);
            }
        }
    }
    if (in_array($u['base'], ['coordinacion', 'direccion', 'docente'], true)) {
        $items = array_merge($items, fechas_de_la_semana($u));
    }
    return array_merge($items, por_hacer_de_aula($u));
}

/**
 * Últimos cambios de entregas que afectan a la persona, de la bitácora y sin motivos ni valores:
 * Coordinación y Dirección ven todas; el Docente, las de sus asignaciones. Los demás roles, ninguna.
 */
function actividad_entregas(array $u, ?int $grupo_id, int $limite): array
{
    if (!in_array($u['base'], ['coordinacion', 'direccion', 'docente'], true)) {
        return [];
    }
    $p = [];
    $donde = '';
    if ($u['base'] === 'docente') {
        $donde .= ' AND a.docente_id = ?';
        $p[] = $u['id'];
    }
    if ($grupo_id !== null) {
        $donde .= ' AND a.grupo_id = ?';
        $p[] = $grupo_id;
    }
    $filas = filas(
        'SELECT b.id, b.accion, b.fecha, us.nombre AS actor, a.id AS asignacion_id, a.grupo_id, m.nombre AS materia, g.clave AS grupo
         FROM bitacora_cambio b
         JOIN entrega_calificaciones e ON e.id = b.registro_id
         JOIN asignacion_docente a ON a.id = e.asignacion_id JOIN materia m ON m.id = a.materia_id JOIN grupo g ON g.id = a.grupo_id
         LEFT JOIN usuario us ON us.id = b.usuario_id
         WHERE b.entidad = \'entrega_calificaciones\' AND b.accion IN (\'enviar\', \'aceptar\', \'devolver\', \'reabrir\')' . $donde . '
         ORDER BY b.id DESC LIMIT ' . (int) $limite,
        $p
    );
    $docente = $u['base'] === 'docente';
    $verbos = ['enviar' => ['envió', 'Enviaste'], 'aceptar' => ['aceptó', 'Se aceptó'], 'devolver' => ['devolvió', 'Te devolvieron'], 'reabrir' => ['reabrió', 'Se reabrió']];
    $salida = [];
    foreach ($filas as $f) {
        [$verbo, $propio] = $verbos[$f['accion']];
        $de = "{$f['materia']} ({$f['grupo']})";
        $texto = match (true) {
            $docente && $f['accion'] === 'enviar' => "Enviaste la entrega de $de.",
            $docente && $f['accion'] === 'aceptar' => "Se aceptó tu entrega de $de.",
            $docente && $f['accion'] === 'devolver' => "Te devolvieron la entrega de $de.",
            $docente => "Se reabrió tu entrega de $de.",
            default => ($f['actor'] ?? 'Alguien') . " $verbo la entrega de $de.",
        };
        $salida[] = [
            'id' => (int) $f['id'], 'fecha' => $f['fecha'], 'texto' => $texto,
            'enlace' => $docente ? "/asignaciones/{$f['asignacion_id']}/calificaciones" : "/grupos/{$f['grupo_id']}/materias",
        ];
    }
    return $salida;
}

/** Calificación aceptada, derecho y datos de cada materia del grupo de un alumno, solo los suyos. */
function tarjetas_de_alumno(array $u, int $periodo_id): array
{
    $alumno_id = (int) $u['alumno_id'];
    $filas = filas(
        'SELECT a.id AS asignacion_id, m.nombre AS materia, g.id AS grupo_id, g.clave AS grupo, g.programa, pe.nombre AS periodo, d.nombre AS docente
         FROM inscripcion_grupo i JOIN grupo g ON g.id = i.grupo_id JOIN periodo pe ON pe.id = g.periodo_id
         JOIN asignacion_docente a ON a.grupo_id = g.id JOIN materia m ON m.id = a.materia_id JOIN usuario d ON d.id = a.docente_id
         WHERE i.alumno_id = ? AND i.estado = \'activa\' AND g.periodo_id = ? ORDER BY g.clave, m.nombre',
        [$alumno_id, $periodo_id]
    );
    foreach ($filas as &$f) {
        $e = entrega_aceptada_vigente((int) $f['asignacion_id']);
        $cal = $e === null ? null : fila('SELECT valor, estatus FROM calificacion WHERE entrega_id = ? AND alumno_id = ?', [$e['id'], $alumno_id]);
        $d = decisiones_vigentes((int) $f['asignacion_id'])[$alumno_id] ?? null;
        $f['tipo'] = 'materia';
        $f['titulo'] = $f['materia'];
        $f['calificacion'] = $cal === null ? null : ['valor' => $cal['valor'] === null ? null : (float) $cal['valor'], 'estatus' => $cal['estatus']];
        $f['derecho'] = $d === null ? null : ($d['bloqueado'] ? 'sin_derecho' : ($d['resultado'] === 'con_derecho' ? 'con_derecho' : 'pendiente'));
        $f['enlace'] = "/cursos/{$f['asignacion_id']}";
    }
    return $filas;
}

function ruta_tablero(): never
{
    $u = exigir_permiso('periodo', 'ver');
    $periodos = filas('SELECT id, nombre, estado FROM periodo ORDER BY fecha_inicio DESC');
    $elegido = null;
    foreach ($periodos as $p) {
        if (isset($_GET['periodo_id']) && (int) $_GET['periodo_id'] === (int) $p['id']) {
            $elegido = $p;
        }
    }
    foreach ($periodos as $p) {
        $elegido ??= $p['estado'] === 'abierto' ? $p : null;
    }
    $elegido ??= $periodos[0] ?? null;
    $pid = $elegido === null ? null : (int) $elegido['id'];

    $tarjetas = [];
    if ($pid !== null) {
        if ($u['base'] === 'docente') {
            foreach (asignaciones_en_alcance($u, $pid) as $a) {
                $tarjetas[] = [
                    'tipo' => 'asignacion', 'id' => (int) $a['id'], 'titulo' => $a['materia'], 'grupo' => $a['grupo'], 'programa' => $a['programa'], 'periodo' => $a['periodo'],
                    'enlace' => "/asignaciones/{$a['id']}/inicio", 'alumnos_activos' => (int) $a['alumnos_activos'],
                    'fecha_limite' => $a['fecha_limite_entrega'], 'entrega' => $a['entrega'] === null ? null : ['estado' => $a['entrega']['estado'], 'version' => $a['entrega']['version']],
                ];
            }
        } elseif ($u['base'] === 'alumno') {
            $tarjetas = tarjetas_de_alumno($u, $pid);
        } elseif (in_array($u['base'], ['coordinacion', 'direccion', 'auxiliar'], true)) {
            foreach (grupos_en_alcance($u, $pid) as $g) {
                $t = [
                    'tipo' => 'grupo', 'id' => (int) $g['id'], 'titulo' => $g['clave'], 'grupo' => $g['clave'], 'programa' => $g['programa'], 'turno' => $g['turno'], 'periodo' => $g['periodo'],
                    'enlace' => $u['base'] === 'auxiliar' ? "/grupos/{$g['id']}/personas" : "/grupos/{$g['id']}/inicio", 'alumnos_activos' => (int) $g['alumnos_activos'],
                    'fecha_cierre_prevista' => $g['fecha_cierre_prevista'],
                ];
                if (ve_todo($u)) {
                    $asig = estado_asignaciones((int) $g['id']);
                    $t['entregas_esperadas'] = count($asig);
                    $t['entregas_recibidas'] = count(array_filter($asig, static fn (array $x): bool => in_array($x['entrega']['estado'] ?? '', ['enviada', 'aceptada'], true)));
                    $c = fila('SELECT estado FROM cierre WHERE grupo_id = ? ORDER BY version DESC LIMIT 1', [$g['id']]);
                    $t['cierre'] = $c['estado'] ?? null;
                }
                $tarjetas[] = $t;
            }
        }
    }
    responder(200, [
        'periodos' => $periodos,
        'periodo_id' => $pid,
        'tarjetas' => $tarjetas,
        'por_hacer' => por_hacer_de($u),
        'actividad' => actividad_entregas($u, null, 8),
    ]);
}

// --- Grupo: resumen y sábana (11.3) ------------------------------------------------------------------

/** Resumen, sábana y CSV son de Coordinación y Dirección: no basta el permiso (el Docente ya tiene calificacion:ver). */
function exigir_vista_completa(string $recurso, string $accion): array
{
    $u = exigir_permiso($recurso, $accion);
    if (!ve_todo($u)) {
        denegar('vista completa del grupo');
    }
    return $u;
}

function ruta_grupo_resumen(array $a): never
{
    $u = exigir_vista_completa('cierre', 'ver');
    $g = grupo_o_404((int) $a['id']);
    $extra = fila('SELECT g.fecha_cierre_prevista, pe.estado AS periodo_estado, pe.fecha_fin FROM grupo g JOIN periodo pe ON pe.id = g.periodo_id WHERE g.id = ?', [$g['id']]);
    $materias = estado_asignaciones((int) $g['id']);
    $por_estado = ['sin_entrega' => 0, 'borrador' => 0, 'enviada' => 0, 'aceptada' => 0];
    foreach ($materias as $m) {
        $por_estado[$m['entrega']['estado'] ?? 'sin_entrega'] = ($por_estado[$m['entrega']['estado'] ?? 'sin_entrega'] ?? 0) + 1;
    }
    $dec = fila(
        'SELECT SUM(d.resultado = \'requiere_autorizacion\' AND d.resolucion_direccion IS NULL) AS en_direccion, SUM(d.resultado = \'pendiente_revision\') AS por_revisar
         FROM decision_evaluacion d JOIN asignacion_docente a ON a.id = d.asignacion_id
         WHERE a.grupo_id = ? AND d.id = (SELECT MAX(x.id) FROM decision_evaluacion x WHERE x.asignacion_id = d.asignacion_id AND x.alumno_id = d.alumno_id)',
        [$g['id']]
    );
    $cierre = fila('SELECT id, version, estado FROM cierre WHERE grupo_id = ? ORDER BY version DESC LIMIT 1', [$g['id']]);
    $fechas = [];
    foreach ($materias as $m) {
        if ($m['fecha_limite_entrega'] !== null) {
            $fechas[] = ['tipo' => 'entrega', 'fecha' => $m['fecha_limite_entrega'], 'titulo' => "Entrega de {$m['materia']}"];
        }
    }
    if ($extra['fecha_cierre_prevista'] !== null) {
        $fechas[] = ['tipo' => 'cierre', 'fecha' => $extra['fecha_cierre_prevista'], 'titulo' => "Cierre de {$g['clave']}"];
    }
    $fechas[] = ['tipo' => 'periodo_fin', 'fecha' => $extra['fecha_fin'], 'titulo' => "Termina el periodo {$g['periodo']}"];
    usort($fechas, static fn (array $x, array $y): int => strcmp($x['fecha'], $y['fecha']));
    $hoy = gmdate('Y-m-d');
    $proximas = array_values(array_filter($fechas, static fn (array $f): bool => $f['fecha'] >= $hoy));

    $por_hacer = [];
    if ($por_estado['enviada'] > 0 && $u['base'] === 'coordinacion') {
        $por_hacer[] = elemento_por_hacer('entregas_por_revisar', 'Entregas por revisar', '/revision?estado=enviada&grupo=' . $g['id'], $por_estado['enviada']);
    }
    if ((int) ($dec['en_direccion'] ?? 0) > 0) {
        $por_hacer[] = elemento_por_hacer('esperando_direccion', 'Decisiones esperando a Dirección', "/grupos/{$g['id']}/derecho", (int) $dec['en_direccion']);
    }
    if ($cierre !== null && $cierre['estado'] === 'en_autorizacion') {
        $por_hacer[] = elemento_por_hacer('cierre_en_autorizacion', 'Cierre esperando autorización', "/grupos/{$g['id']}/cierre");
    }
    responder(200, [
        'grupo' => $g + ['fecha_cierre_prevista' => $extra['fecha_cierre_prevista'], 'periodo_estado' => $extra['periodo_estado']],
        'alumnos_activos' => count(lista_vigente((int) $g['id'])),
        'materias' => $materias,
        'entregas_por_estado' => $por_estado,
        'decisiones' => ['en_direccion' => (int) ($dec['en_direccion'] ?? 0), 'por_revisar' => (int) ($dec['por_revisar'] ?? 0)],
        'cierre' => $cierre,
        'proximas_fechas' => array_slice($proximas, 0, 6),
        'por_hacer' => $por_hacer,
        'actividad' => actividad_entregas($u, (int) $g['id'], 5),
    ]);
}

/** Sábana: una fila por alumno vigente, una columna por materia, con la calificación aceptada vigente. */
function datos_de_sabana(int $grupo_id): array
{
    $asigs = filas('SELECT a.id, m.nombre AS materia FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id WHERE a.grupo_id = ? ORDER BY m.nombre', [$grupo_id]);
    $alumnos = [];
    foreach (datos_del_cierre(['grupo_id' => $grupo_id]) as $f) {
        $k = $f['alumno_id'];
        $alumnos[$k] ??= ['alumno_id' => $k, 'identificador' => $f['identificador'], 'nombre' => $f['nombre'], 'celdas' => [], 'pendientes' => []];
        $alumnos[$k]['celdas'][$f['materia']] = ['valor' => $f['valor'] === null ? null : (float) $f['valor'], 'estatus' => $f['estatus']];
    }
    foreach (lista_vigente($grupo_id) as $al) {
        $alumnos[(int) $al['alumno_id']] ??= ['alumno_id' => (int) $al['alumno_id'], 'identificador' => $al['identificador'], 'nombre' => $al['nombre'], 'celdas' => [], 'pendientes' => []];
    }
    foreach ($alumnos as $id => &$al) {
        $al['pendientes'] = array_column(filas(
            'SELECT m.nombre FROM pendiente_academico pa JOIN materia m ON m.id = pa.materia_id WHERE pa.alumno_id = ? AND pa.estado = \'abierto\' ORDER BY m.nombre',
            [$id]
        ), 'nombre');
    }
    unset($al);
    usort($alumnos, static fn (array $x, array $y): int => strcmp($x['nombre'], $y['nombre']));
    return ['materias' => array_column($asigs, 'materia'), 'alumnos' => array_values($alumnos)];
}

function ruta_sabana(array $a): never
{
    exigir_vista_completa('calificacion', 'ver');
    exigir_permiso('pendiente_academico', 'ver');
    $g = grupo_o_404((int) $a['id']);
    responder(200, ['grupo' => $g] + datos_de_sabana((int) $g['id']));
}

function ruta_sabana_csv(array $a): never
{
    exigir_vista_completa('calificacion', 'ver');
    exigir_permiso('pendiente_academico', 'ver');
    $g = grupo_o_404((int) $a['id']);
    $s = datos_de_sabana((int) $g['id']);
    $et = ['acreditada' => '', 'no_acreditada' => ' (no acreditada)', 'sin_derecho' => ' (sin derecho)', 'sin_entrega' => ''];
    $lineas = [implode(',', array_map('celda_csv', array_merge(['matricula', 'nombre'], $s['materias'], ['pendientes abiertos'])))];
    foreach ($s['alumnos'] as $al) {
        $fila = [$al['identificador'], $al['nombre']];
        foreach ($s['materias'] as $m) {
            $c = $al['celdas'][$m] ?? null;
            $fila[] = $c === null || $c['valor'] === null ? ($c['estatus'] ?? 'sin entrega') : number_format($c['valor'], 1, '.', '') . ($et[$c['estatus']] ?? '');
        }
        $fila[] = implode('; ', $al['pendientes']);
        $lineas[] = implode(',', array_map('celda_csv', $fila));
    }
    $nombre = 'calificaciones-' . preg_replace('/[^A-Za-z0-9-]/', '', $g['periodo'] . '-' . $g['clave']) . '.csv';
    responder_archivo("\xEF\xBB\xBF" . implode("\r\n", $lineas) . "\r\n", 'text/csv; charset=utf-8', $nombre);
}

// --- Calendario (11.4) ------------------------------------------------------------------------------------

function ruta_calendario(): never
{
    $u = exigir_permiso('periodo', 'ver');
    $gid = isset($_GET['grupo_id']) && $_GET['grupo_id'] !== '' ? (int) $_GET['grupo_id'] : null;
    if ($gid !== null && !grupo_en_alcance($u, $gid)) {
        denegar("calendario del grupo $gid");
    }
    // Grupos del rol: Carga externa solo ve las fechas de los periodos.
    $grupos = $u['base'] === 'carga_externa' ? [] : grupos_en_alcance($u);
    if ($gid !== null) {
        $grupos = array_values(array_filter($grupos, static fn (array $g): bool => (int) $g['id'] === $gid));
    }
    $eventos = [];
    $periodos = filas('SELECT id, nombre, fecha_inicio, fecha_fin FROM periodo');
    // Cada rol ve las fechas de los periodos de sus grupos; Coordinación, Dirección y Carga externa, las de todos (salvo con un grupo elegido).
    $de_grupos = array_map(static fn (array $g): int => (int) $g['periodo_id'], $grupos);
    foreach ($periodos as $p) {
        $todos = $gid === null && ($u['base'] === 'carga_externa' || ve_todo($u));
        if (!$todos && !in_array((int) $p['id'], $de_grupos, true)) {
            continue;
        }
        $eventos[] = ['id' => "periodo-{$p['id']}-inicio", 'tipo' => 'periodo_inicio', 'fecha' => $p['fecha_inicio'], 'titulo' => "Inicia el periodo {$p['nombre']}", 'grupo_id' => null, 'grupo' => null, 'enlace' => "/?periodo={$p['id']}"];
        $eventos[] = ['id' => "periodo-{$p['id']}-fin", 'tipo' => 'periodo_fin', 'fecha' => $p['fecha_fin'], 'titulo' => "Termina el periodo {$p['nombre']}", 'grupo_id' => null, 'grupo' => null, 'enlace' => "/?periodo={$p['id']}"];
    }
    $enlace_cierre = static fn (array $g): string => match ($u['base']) {
        'coordinacion', 'direccion' => "/grupos/{$g['id']}/cierre",
        'auxiliar' => "/grupos/{$g['id']}/personas",
        'alumno' => '/historial',
        default => '/asignaciones',
    };
    foreach ($grupos as $g) {
        if ($g['fecha_cierre_prevista'] !== null) {
            $eventos[] = ['id' => "cierre-{$g['id']}", 'tipo' => 'cierre', 'fecha' => $g['fecha_cierre_prevista'], 'titulo' => "Cierre previsto de {$g['clave']}", 'grupo_id' => (int) $g['id'], 'grupo' => $g['clave'], 'enlace' => $enlace_cierre($g)];
        }
    }
    // Fechas de entrega: solo quien ve asignaciones (Coordinación y Dirección todas; el Docente, las suyas).
    if (tiene_permiso($u, 'asignacion_docente', 'ver') && in_array($u['base'], ['coordinacion', 'direccion', 'docente'], true)) {
        $ids = array_column($grupos, 'id');
        foreach ($u['base'] === 'docente' ? asignaciones_de_docente($u) : asignaciones_de_grupos($ids) as $x) {
            if ($x['fecha_limite_entrega'] === null || ($gid !== null && (int) $x['grupo_id'] !== $gid) || !in_array($x['grupo_id'], array_map('intval', $ids), false)) {
                continue;
            }
            $eventos[] = [
                'id' => "entrega-{$x['id']}", 'tipo' => 'entrega', 'fecha' => $x['fecha_limite_entrega'], 'titulo' => "Entrega de {$x['materia']} ({$x['grupo']})",
                'grupo_id' => (int) $x['grupo_id'], 'grupo' => $x['grupo'],
                'enlace' => $u['base'] === 'docente' ? "/asignaciones/{$x['id']}/calificaciones" : "/grupos/{$x['grupo_id']}/materias",
            ];
        }
    }
    $eventos = array_merge($eventos, eventos_de_aula($u, $gid));
    usort($eventos, static fn (array $x, array $y): int => strcmp($x['fecha'], $y['fecha']));
    responder(200, ['eventos' => $eventos, 'grupos' => array_map(static fn (array $g): array => ['id' => (int) $g['id'], 'clave' => $g['clave'], 'periodo' => $g['periodo']], $grupos)]);
}

function asignaciones_de_docente(array $u): array
{
    return filas(
        'SELECT a.id, a.grupo_id, a.fecha_limite_entrega, m.nombre AS materia, g.clave AS grupo
         FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN grupo g ON g.id = a.grupo_id WHERE a.docente_id = ?',
        [$u['id']]
    );
}

function asignaciones_de_grupos(array $ids): array
{
    if ($ids === []) {
        return [];
    }
    $marcas = implode(',', array_fill(0, count($ids), '?'));
    return filas(
        "SELECT a.id, a.grupo_id, a.fecha_limite_entrega, m.nombre AS materia, g.clave AS grupo
         FROM asignacion_docente a JOIN materia m ON m.id = a.materia_id JOIN grupo g ON g.id = a.grupo_id WHERE a.grupo_id IN ($marcas)",
        array_map('intval', $ids)
    );
}

// --- Fechas (11.4) y cuenta (11.6) -----------------------------------------------------------------------

function ruta_fecha_limite(array $a): never
{
    exigir_permiso('asignacion_docente', 'modificar');
    $asig = cargar_asignacion((int) $a['id']);
    if ($asig === null) {
        error_http(404, 'Esa asignación ya no existe.');
    }
    exigir_grupo_abierto((int) $asig['grupo_id']);
    $nueva = fecha_opcional(cuerpo_json(), 'fecha_limite_entrega', 'La fecha límite de entrega');
    $antes = fila('SELECT fecha_limite_entrega FROM asignacion_docente WHERE id = ?', [$asig['id']])['fecha_limite_entrega'];
    ejecutar('UPDATE asignacion_docente SET fecha_limite_entrega = ? WHERE id = ?', [$nueva, $asig['id']]);
    registrar_bitacora('asignacion_docente', (int) $asig['id'], 'fecha_limite', ['fecha_limite_entrega' => $antes], ['fecha_limite_entrega' => $nueva, 'materia' => $asig['materia'], 'grupo' => $asig['grupo']]);
    responder(200, ['id' => (int) $asig['id']]);
}

function ruta_sesiones(): never
{
    $u = exigir_sesion();
    // En "ver como" no se muestran las sesiones de la cuenta vista.
    $filas = $u['solo_lectura'] ? [] : filas(
        'SELECT id, creado_en, ultimo_uso, expira_en FROM sesion WHERE usuario_id = ? AND expira_en > UTC_TIMESTAMP() ORDER BY ultimo_uso DESC',
        [$u['id']]
    );
    foreach ($filas as &$f) {
        $f['actual'] = (int) $f['id'] === (int) $u['sesion_id'];
    }
    responder(200, ['filas' => $filas]);
}

function ruta_cerrar_sesion_ajena(array $a): never
{
    $u = exigir_sesion();
    $s = fila('SELECT id, usuario_id FROM sesion WHERE id = ?', [(int) $a['id']]);
    if ($s === null || (int) $s['usuario_id'] !== (int) $u['id']) {
        denegar('sesión ' . (int) $a['id']);
    }
    if ((int) $s['id'] === (int) $u['sesion_id']) {
        error_http(409, 'Esa es la sesión que estás usando. Para salir, usa Cerrar sesión.');
    }
    ejecutar('DELETE FROM sesion WHERE id = ?', [$s['id']]);
    registrar_bitacora('sesion', (int) $u['id'], 'cerrar_otra_sesion', null, null);
    responder(200, ['ok' => true]);
}

function ruta_tema(): never
{
    $u = exigir_sesion();
    $tema = una_de(cuerpo_json(), 'tema', ['claro', 'oscuro'], 'El tema');
    ejecutar('UPDATE usuario SET preferencia_tema = ? WHERE id = ?', [$tema, $u['id']]);
    responder(200, ['tema' => $tema]);
}

// --- Cuenta de Alumno (11.8) ------------------------------------------------------------------------------

/** Coordinación (rol del sistema) invita a un alumno: crea su cuenta ligada y manda el enlace de invitación (10.6). */
function ruta_invitar_alumno(array $a): never
{
    $admin = exigir_admin('usuario', 'crear');
    $al = fila('SELECT id, nombre, correo FROM alumno WHERE id = ?', [(int) $a['id']]);
    if ($al === null) {
        error_http(404, 'Ese alumno ya no existe.');
    }
    if (fila('SELECT id FROM usuario WHERE alumno_id = ?', [$al['id']]) !== null) {
        error_http(409, 'Ese alumno ya tiene cuenta. Si perdió el acceso, mándale el enlace para restablecerla desde Usuarios y roles.');
    }
    $d = cuerpo_json();
    $correo = correo_valido(($d['correo'] ?? '') !== '' ? $d : ['correo' => (string) $al['correo']]);
    if (fila('SELECT id FROM usuario WHERE correo = ?', [$correo]) !== null) {
        error_http(422, 'Ya existe una cuenta con ese correo.', ['correo' => 'Ese correo ya tiene cuenta.']);
    }
    $clave = clave_temporal();
    $id = transaccion(function () use ($al, $correo, $clave): int {
        ejecutar('UPDATE alumno SET correo = ? WHERE id = ?', [$correo, $al['id']]);
        $id = insertar('usuario', [
            'nombre' => $al['nombre'], 'correo' => $correo, 'contrasena_hash' => password_hash($clave, PASSWORD_DEFAULT),
            'rol' => 'alumno', 'alumno_id' => $al['id'], 'debe_cambiar_clave' => 1,
        ]);
        registrar_bitacora('usuario', $id, 'alta', null, ['nombre' => $al['nombre'], 'correo' => $correo, 'rol' => 'alumno', 'estado' => 'activo', 'debe_cambiar_clave' => true]);
        return $id;
    });
    $r = mandar_enlace('invitacion', ['id' => $id, 'correo' => $correo], $admin, 'invitacion_enviada');
    responder(200, ['id' => $id] + $r + ($r['correo_enviado'] ? [] : ['clave_temporal' => $clave]));
}
