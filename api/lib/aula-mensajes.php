<?php

declare(strict_types=1);

/**
 * Aula (especificación, sección 12), parte 3: mensajes uno a uno (12.8), foros con moderación (12.9) y las fechas y
 * pendientes del aula para el calendario y Por hacer (12.10). Sin envío a grupos. Nada se borra.
 */

// --- Mensajes (12.8) ---------------------------------------------------------------------------------

/** Tipo de acceso a una conversación: 'participante', 'reportada' (Coordinación, solo si alguien la reportó) o null. */
function puede_leer_conversacion(array $u, int $conversacion_id): ?string
{
    // En "ver como" los mensajes no se abren: una conversación solo la leen sus participantes o, si la reportan, Coordinación.
    if ($u['solo_lectura'] ?? false) {
        return null;
    }
    if (fila('SELECT 1 AS x FROM conversacion_participante WHERE conversacion_id = ? AND usuario_id = ?', [$conversacion_id, $u['id']]) !== null) {
        return 'participante';
    }
    if ($u['base'] === 'coordinacion' && fila('SELECT 1 AS x FROM reporte_conversacion WHERE conversacion_id = ? LIMIT 1', [$conversacion_id]) !== null) {
        return 'reportada';
    }
    return null;
}

function exigir_mensajes_propios(array $u): void
{
    if ($u['solo_lectura'] ?? false) {
        error_http(403, 'Los mensajes no se abren desde "ver como": son privados de cada persona.');
    }
}

/** Quién puede escribir a quién. Alumno con alumno no; ningún envío a grupos. */
function puede_escribir_a(array $u, array $d): bool
{
    if ((int) $u['id'] === (int) $d['id'] || !tiene_permiso($d, 'mensaje', 'ver')) {
        return false;
    }
    if (in_array($u['base'], ['coordinacion', 'direccion'], true)) {
        return true;
    }
    if ($d['base'] === 'coordinacion' && in_array($u['base'], ['docente', 'alumno'], true)) {
        return true;
    }
    if ($u['base'] === 'docente' && $d['base'] === 'alumno') {
        [$docente, $alumno] = [(int) $u['id'], $d['alumno_id']];
    } elseif ($u['base'] === 'alumno' && $d['base'] === 'docente') {
        [$docente, $alumno] = [(int) $d['id'], $u['alumno_id']];
    } else {
        return false;
    }
    if ($alumno === null) {
        return false;
    }
    return fila(
        'SELECT 1 AS x FROM asignacion_docente a JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id AND pe.estado = \'abierto\'
         JOIN inscripcion_grupo i ON i.grupo_id = a.grupo_id AND i.estado = \'activa\' WHERE a.docente_id = ? AND i.alumno_id = ? LIMIT 1',
        [$docente, $alumno]
    ) !== null;
}

function par_de(int $a, int $b): string
{
    return min($a, $b) . '-' . max($a, $b);
}

function ruta_contactos(): never
{
    $u = exigir_permiso('mensaje', 'crear');
    exigir_mensajes_propios($u);
    $salida = [];
    foreach (filas('SELECT u.id FROM usuario u JOIN rol r ON r.clave = u.rol AND r.estado = \'activo\' WHERE u.estado = \'activo\' AND u.id <> ? ORDER BY u.nombre', [$u['id']]) as $f) {
        $c = cargar_usuario((int) $f['id']);
        if ($c !== null && puede_escribir_a($u, $c)) {
            $salida[] = ['id' => (int) $c['id'], 'nombre' => $c['nombre'], 'rol' => $c['rol_nombre']];
        }
    }
    responder(200, ['contactos' => $salida]);
}

function participantes_de(int $conversacion_id): array
{
    return filas(
        'SELECT u.id, u.nombre, r.nombre AS rol FROM conversacion_participante p JOIN usuario u ON u.id = p.usuario_id JOIN rol r ON r.clave = u.rol WHERE p.conversacion_id = ?',
        [$conversacion_id]
    );
}

function ruta_conversaciones(): never
{
    $u = exigir_permiso('mensaje', 'ver');
    exigir_mensajes_propios($u);
    $filas = filas(
        'SELECT c.id, p.leido_hasta,
                (SELECT MAX(m.id) FROM mensaje m WHERE m.conversacion_id = c.id) AS ultimo_id
         FROM conversacion_participante p JOIN conversacion c ON c.id = p.conversacion_id WHERE p.usuario_id = ?',
        [$u['id']]
    );
    $salida = [];
    foreach ($filas as $f) {
        $ult = $f['ultimo_id'] === null ? null : fila('SELECT autor_id, texto, creado_en FROM mensaje WHERE id = ?', [$f['ultimo_id']]);
        $sin_leer = (int) fila('SELECT COUNT(*) AS n FROM mensaje WHERE conversacion_id = ? AND id > ? AND autor_id <> ?', [$f['id'], $f['leido_hasta'], $u['id']])['n'];
        $otro = array_values(array_filter(participantes_de((int) $f['id']), static fn (array $p): bool => (int) $p['id'] !== (int) $u['id']))[0] ?? null;
        $salida[] = [
            'id' => (int) $f['id'], 'con' => $otro === null ? null : ['id' => (int) $otro['id'], 'nombre' => $otro['nombre'], 'rol' => $otro['rol']],
            'ultimo' => $ult === null ? null : ['texto' => mb_substr($ult['texto'], 0, 120), 'fecha' => $ult['creado_en'], 'mio' => (int) $ult['autor_id'] === (int) $u['id']],
            'sin_leer' => $sin_leer,
        ];
    }
    usort($salida, static fn (array $x, array $y): int => strcmp($y['ultimo']['fecha'] ?? '', $x['ultimo']['fecha'] ?? ''));
    responder(200, ['conversaciones' => $salida, 'sin_leer' => array_sum(array_column($salida, 'sin_leer'))]);
}

function ruta_conversacion(array $a): never
{
    $u = exigir_permiso('mensaje', 'ver');
    exigir_mensajes_propios($u);
    $id = (int) $a['id'];
    $acceso = puede_leer_conversacion($u, $id);
    if ($acceso === null) {
        denegar("conversación $id");
    }
    if ($acceso === 'reportada') {
        registrar_bitacora('conversacion', $id, 'consulta_conversacion_reportada', null, null, 'Consulta de una conversación reportada');
    }
    $mensajes = filas(
        'SELECT m.id, m.autor_id, m.texto, m.archivo_id, m.creado_en, u.nombre AS autor FROM mensaje m JOIN usuario u ON u.id = m.autor_id WHERE m.conversacion_id = ? ORDER BY m.id',
        [$id]
    );
    $mensajes = array_map(static fn (array $m): array => [
        'id' => (int) $m['id'], 'autor_id' => (int) $m['autor_id'], 'autor' => $m['autor'], 'mio' => (int) $m['autor_id'] === (int) $u['id'], 'texto' => $m['texto'],
        'archivo' => datos_de_archivo($m['archivo_id'] === null ? null : (int) $m['archivo_id']), 'fecha' => $m['creado_en'],
    ], $mensajes);
    responder(200, ['id' => $id, 'acceso' => $acceso, 'participantes' => participantes_de($id), 'mensajes' => $mensajes]);
}

function ruta_leer_conversacion(array $a): never
{
    $u = exigir_permiso('mensaje', 'ver');
    exigir_mensajes_propios($u);
    $id = (int) $a['id'];
    if (puede_leer_conversacion($u, $id) !== 'participante') {
        denegar("conversación $id");
    }
    ejecutar(
        'UPDATE conversacion_participante SET leido_hasta = (SELECT COALESCE(MAX(id), 0) FROM mensaje WHERE conversacion_id = ?) WHERE conversacion_id = ? AND usuario_id = ?',
        [$id, $id, $u['id']]
    );
    responder(200, ['id' => $id]);
}

function ruta_enviar_mensaje(): never
{
    $u = exigir_permiso('mensaje', 'crear');
    exigir_mensajes_propios($u);
    $d = cuerpo_json();
    $destino = cargar_usuario(entero($d, 'destinatario_id', 'El destinatario'));
    $existente = $destino === null ? null : fila('SELECT id FROM conversacion WHERE par = ?', [par_de((int) $u['id'], (int) $destino['id'])]);
    // Se responde dentro de una conversación ya abierta si quien escribió primero tenía permiso de escribirnos.
    if ($destino === null || !(puede_escribir_a($u, $destino) || ($existente !== null && puede_escribir_a($destino, $u)))) {
        denegar('mensaje a la cuenta ' . (int) ($d['destinatario_id'] ?? 0));
    }
    $texto = texto($d, 'texto', 5000, 'El mensaje');
    $archivo = isset($d['archivo_id']) && $d['archivo_id'] !== null ? entero($d, 'archivo_id', 'El archivo') : null;
    if ($archivo !== null && !tiene_permiso($u, 'archivo', 'crear')) {
        denegar('archivo en un mensaje');
    }
    $resultado = transaccion(function () use ($u, $destino, $texto, $archivo): array {
        $par = par_de((int) $u['id'], (int) $destino['id']);
        $conv = fila('SELECT id FROM conversacion WHERE par = ?', [$par]);
        if ($conv === null) {
            $cid = insertar('conversacion', ['par' => $par]);
            foreach ([(int) $u['id'], (int) $destino['id']] as $uid) {
                insertar('conversacion_participante', ['conversacion_id' => $cid, 'usuario_id' => $uid]);
            }
        } else {
            $cid = (int) $conv['id'];
        }
        if ($archivo !== null) {
            vincular_archivo($archivo, $u);
        }
        $mid = insertar('mensaje', ['conversacion_id' => $cid, 'autor_id' => $u['id'], 'texto' => $texto, 'archivo_id' => $archivo]);
        ejecutar('UPDATE conversacion_participante SET leido_hasta = ? WHERE conversacion_id = ? AND usuario_id = ?', [$mid, $cid, $u['id']]);
        return [$cid, $mid];
    });
    [$cid, $mid] = $resultado;
    avisar((int) $destino['id'], 'mensaje', 'Tienes un mensaje nuevo.', "/mensajes?c=$cid", "msg:$mid");
    responder(200, ['conversacion_id' => $cid, 'id' => $mid]);
}

function ruta_reportar_conversacion(array $a): never
{
    $u = exigir_permiso('mensaje', 'ver');
    exigir_mensajes_propios($u);
    $id = (int) $a['id'];
    if (puede_leer_conversacion($u, $id) !== 'participante') {
        denegar("conversación $id");
    }
    $motivo = texto(cuerpo_json(), 'motivo', 500, 'El motivo del reporte');
    $rid = insertar('reporte_conversacion', ['conversacion_id' => $id, 'reportado_por' => $u['id'], 'motivo' => $motivo]);
    registrar_bitacora('conversacion', $id, 'reportar_conversacion', null, ['reporte_id' => $rid], $motivo);
    avisar_a_permiso('usuario', 'crear', 'mensaje_reportado', 'Una conversación fue reportada. Puedes consultarla desde Mensajes.', '/mensajes', ['coordinacion']);
    responder(200, ['id' => $rid]);
}

/** Conversaciones reportadas: solo Coordinación; sin texto hasta que abre una. */
function ruta_conversaciones_reportadas(): never
{
    $u = exigir_permiso('mensaje', 'ver');
    if ($u['base'] !== 'coordinacion') {
        denegar('conversaciones reportadas');
    }
    exigir_mensajes_propios($u);
    $filas = filas(
        'SELECT r.id, r.conversacion_id, r.motivo, r.creado_en, ur.nombre AS reportado_por FROM reporte_conversacion r JOIN usuario ur ON ur.id = r.reportado_por ORDER BY r.id DESC LIMIT 100'
    );
    foreach ($filas as &$f) {
        $f['id'] = (int) $f['id'];
        $f['conversacion_id'] = (int) $f['conversacion_id'];
        $f['participantes'] = array_column(participantes_de($f['conversacion_id']), 'nombre');
    }
    responder(200, ['reportes' => $filas]);
}

// --- Foros (12.9) ------------------------------------------------------------------------------------

function foro_visible(array $u, int $id): array
{
    [$ac, $curso, $modo] = actividad_visible($u, $id);
    if ($ac['tipo'] !== 'foro') {
        error_http(422, 'Esta actividad no es un foro.');
    }
    return [$ac, $curso, $modo];
}

function ruta_publicaciones(array $a): never
{
    $u = exigir_permiso('publicacion_foro', 'ver');
    [$ac, $curso, $modo] = foro_visible($u, (int) $a['id']);
    $modera = in_array($modo, ['docente', 'coordinacion'], true);
    $filas = filas(
        'SELECT p.*, u.nombre AS autor, ro.nombre AS oculta_por_nombre FROM publicacion_foro p JOIN usuario u ON u.id = p.autor_id LEFT JOIN usuario ro ON ro.id = p.oculta_por WHERE p.actividad_id = ? ORDER BY p.id',
        [$ac['id']]
    );
    $salida = array_map(static function (array $p) use ($modera, $u): array {
        $oculta = $p['oculta_por'] !== null;
        return [
            'id' => (int) $p['id'], 'autor_id' => (int) $p['autor_id'], 'autor' => $p['autor'], 'mio' => (int) $p['autor_id'] === (int) $u['id'], 'responde_a' => $p['responde_a'] === null ? null : (int) $p['responde_a'],
            'fecha' => $p['creado_en'], 'oculta' => $oculta, 'texto' => $oculta && !$modera ? null : $p['texto'],
            'motivo_oculto' => $oculta && $modera ? $p['motivo_oculto'] : null, 'oculta_por' => $oculta && $modera ? $p['oculta_por_nombre'] : null,
        ];
    }, $filas);
    responder(200, ['actividad' => actividad_a_salida($ac, $modo), 'curso' => curso_resumen($curso, $modo), 'puede_moderar' => $modera, 'publicaciones' => $salida]);
}

function ruta_publicar_en_foro(array $a): never
{
    $u = exigir_permiso('publicacion_foro', 'crear');
    [$ac, $curso, $modo] = foro_visible($u, (int) $a['id']);
    if ($modo === 'direccion') {
        denegar('publicar en el foro');
    }
    exigir_periodo_abierto($curso);
    $d = cuerpo_json();
    $texto = texto($d, 'texto', 5000, 'La publicación');
    $padre = null;
    if (isset($d['responde_a']) && $d['responde_a'] !== null) {
        $padre = fila('SELECT id, autor_id, actividad_id FROM publicacion_foro WHERE id = ?', [entero($d, 'responde_a', 'La publicación a responder')]);
        if ($padre === null || (int) $padre['actividad_id'] !== (int) $ac['id']) {
            error_http(422, 'Esa publicación no es de este foro.', ['responde_a' => 'Elige una publicación de este foro.']);
        }
    }
    $id = insertar('publicacion_foro', ['actividad_id' => $ac['id'], 'autor_id' => $u['id'], 'texto' => $texto, 'responde_a' => $padre['id'] ?? null]);
    if ($padre !== null && (int) $padre['autor_id'] !== (int) $u['id']) {
        avisar((int) $padre['autor_id'], 'aula_foro', "Respondieron tu publicación en el foro {$ac['titulo']} ({$curso['materia']}).", "/cursos/{$curso['id']}/foros?foro={$ac['id']}", "foro:$id");
    }
    responder(200, ['id' => $id]);
}

function ruta_ocultar_publicacion(array $a): never
{
    exigir_sesion();
    $p = fila('SELECT p.*, ac.asignacion_id FROM publicacion_foro p JOIN actividad ac ON ac.id = p.actividad_id WHERE p.id = ?', [(int) $a['id']]);
    if ($p === null) {
        exigir_permiso('publicacion_foro', 'modificar');
        denegar('publicación ' . (int) $a['id']);
    }
    curso_para_escribir('publicacion_foro', 'modificar', (int) $p['asignacion_id']);
    $motivo = texto(cuerpo_json(), 'motivo', 500, 'El motivo');
    if ($p['oculta_por'] !== null) {
        error_http(409, 'Esa publicación ya está oculta.');
    }
    ejecutar('UPDATE publicacion_foro SET oculta_por = ?, motivo_oculto = ?, oculta_en = ? WHERE id = ?', [actor_real_id(), $motivo, ahora(), $p['id']]);
    registrar_bitacora('publicacion_foro', (int) $p['id'], 'ocultar', null, ['actividad_id' => (int) $p['actividad_id'], 'autor_id' => (int) $p['autor_id']], $motivo);
    responder(200, ['id' => (int) $p['id']]);
}

// --- Calendario y Por hacer del aula (12.10) ----------------------------------------------------------

/** Cursos del periodo abierto que la persona ve en el aula: [asignacion_id => curso]. Solo Docente y Alumno. */
function cursos_abiertos_de(array $u): array
{
    if ($u['base'] === 'docente') {
        $filas = filas('SELECT a.id FROM asignacion_docente a JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id WHERE a.docente_id = ? AND pe.estado = \'abierto\'', [$u['id']]);
    } elseif ($u['base'] === 'alumno' && $u['alumno_id'] !== null) {
        $filas = filas(
            'SELECT a.id FROM asignacion_docente a JOIN grupo g ON g.id = a.grupo_id JOIN periodo pe ON pe.id = g.periodo_id AND pe.estado = \'abierto\'
             JOIN inscripcion_grupo i ON i.grupo_id = g.id AND i.estado = \'activa\' WHERE i.alumno_id = ?',
            [$u['alumno_id']]
        );
    } else {
        return [];
    }
    $salida = [];
    foreach ($filas as $f) {
        $salida[(int) $f['id']] = cargar_asignacion((int) $f['id']);
    }
    return $salida;
}

function enlace_de_curso(array $u, int $asignacion_id, string $tab): string
{
    return $u['base'] === 'docente' ? "/asignaciones/$asignacion_id/$tab" : "/cursos/$asignacion_id/$tab";
}

/** Fechas de entrega de tareas y ventana de cada examen, para el docente y los alumnos del curso. */
function eventos_de_aula(array $u, ?int $grupo_id): array
{
    if (!tiene_permiso($u, 'actividad', 'ver')) {
        return [];
    }
    $eventos = [];
    foreach (cursos_abiertos_de($u) as $id => $c) {
        if ($grupo_id !== null && (int) $c['grupo_id'] !== $grupo_id) {
            continue;
        }
        foreach (filas('SELECT id, tipo, titulo, fecha_limite, disponible_desde, disponible_hasta FROM actividad WHERE asignacion_id = ? AND publicada = 1 AND archivada = 0 AND tipo IN (\'tarea\', \'examen\')', [$id]) as $ac) {
            $comunes = ['grupo_id' => (int) $c['grupo_id'], 'grupo' => $c['grupo'], 'enlace' => enlace_de_curso($u, $id, $ac['tipo'] === 'tarea' ? 'tareas' : 'examenes')];
            if ($ac['tipo'] === 'tarea' && $ac['fecha_limite'] !== null) {
                $eventos[] = ['id' => "tarea-{$ac['id']}", 'tipo' => 'tarea', 'fecha' => substr($ac['fecha_limite'], 0, 10), 'titulo' => "Entrega de tarea: {$ac['titulo']} ({$c['materia']})"] + $comunes;
            }
            if ($ac['tipo'] === 'examen') {
                if ($ac['disponible_desde'] !== null) {
                    $eventos[] = ['id' => "examen-{$ac['id']}-abre", 'tipo' => 'examen', 'fecha' => substr($ac['disponible_desde'], 0, 10), 'titulo' => "Abre el examen: {$ac['titulo']} ({$c['materia']})"] + $comunes;
                }
                if ($ac['disponible_hasta'] !== null) {
                    $eventos[] = ['id' => "examen-{$ac['id']}-cierra", 'tipo' => 'examen', 'fecha' => substr($ac['disponible_hasta'], 0, 10), 'titulo' => "Cierra el examen: {$ac['titulo']} ({$c['materia']})"] + $comunes;
                }
            }
        }
    }
    return $eventos;
}

/** Por hacer del aula: el alumno ve tareas por entregar y exámenes abiertos; el docente, entregas por calificar. */
function por_hacer_de_aula(array $u): array
{
    if (!tiene_permiso($u, 'actividad', 'ver')) {
        return [];
    }
    $items = [];
    $ahora = ahora();
    foreach (cursos_abiertos_de($u) as $id => $c) {
        if ($u['base'] === 'alumno') {
            $alumno = (int) $u['alumno_id'];
            foreach (filas('SELECT * FROM actividad WHERE asignacion_id = ? AND publicada = 1 AND archivada = 0 AND tipo IN (\'tarea\', \'examen\')', [$id]) as $ac) {
                if ($ac['tipo'] === 'tarea' && !entregada($ac, $alumno) && ($ac['fecha_limite'] === null || $ahora <= $ac['fecha_limite'] || (int) $ac['acepta_tarde'] === 1)) {
                    $items[] = elemento_por_hacer('aula_tarea', "Entregar la tarea {$ac['titulo']} ({$c['materia']})", "/cursos/$id/tareas", null, $ac['fecha_limite'] === null ? null : substr($ac['fecha_limite'], 0, 10));
                }
                if ($ac['tipo'] === 'examen' && ($ac['disponible_desde'] === null || $ahora >= $ac['disponible_desde']) && ($ac['disponible_hasta'] === null || $ahora <= $ac['disponible_hasta'])) {
                    $usados = (int) fila('SELECT COUNT(*) AS n FROM intento_examen WHERE actividad_id = ? AND alumno_id = ?', [$ac['id'], $alumno])['n'];
                    if ($usados < (int) $ac['intentos_permitidos']) {
                        $items[] = elemento_por_hacer('aula_examen', "Examen abierto: {$ac['titulo']} ({$c['materia']})", "/cursos/$id/examenes", null, $ac['disponible_hasta'] === null ? null : substr($ac['disponible_hasta'], 0, 10));
                    }
                }
            }
        } else {
            $n = (int) fila(
                'SELECT COUNT(*) AS n FROM entrega_tarea t JOIN actividad ac ON ac.id = t.actividad_id
                 WHERE ac.asignacion_id = ? AND ac.archivada = 0
                   AND t.id = (SELECT MAX(x.id) FROM entrega_tarea x WHERE x.actividad_id = t.actividad_id AND x.alumno_id = t.alumno_id)
                   AND NOT EXISTS (SELECT 1 FROM calificacion_actividad c WHERE c.actividad_id = t.actividad_id AND c.alumno_id = t.alumno_id AND c.entrega_id = t.id)',
                [$id]
            )['n'];
            if ($n > 0) {
                $items[] = elemento_por_hacer('aula_calificar', "Entregas por calificar en {$c['materia']} ({$c['grupo']})", "/asignaciones/$id/tareas", $n);
            }
        }
    }
    return $items;
}
