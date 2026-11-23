<?php

declare(strict_types=1);

/**
 * Aula (especificación, sección 12), parte 2: categorías, rúbricas, actividades (tarea, examen, foro),
 * entregas con versiones, exámenes con tiempo controlado en el servidor y calificación por actividades.
 * Regla de oro del alumno: nunca recibe la respuesta correcta, ni entregas, intentos o calificaciones de otro,
 * ni puntos propios antes de que el docente publique las calificaciones de la actividad.
 */

const TIPOS_ACTIVIDAD = ['tarea', 'examen', 'foro'];

function num(array $d, string $campo, string $etiqueta, float $min, float $max): float
{
    $v = $d[$campo] ?? null;
    if (!(is_int($v) || is_float($v) || (is_string($v) && is_numeric($v))) || (float) $v < $min || (float) $v > $max) {
        error_http(422, "$etiqueta no es válido.", [$campo => "Usa un número de $min a $max."]);
    }
    return round((float) $v, 2);
}

// --- Categorías (12.7) -------------------------------------------------------------------------------

function categorias_de(int $asignacion_id): array
{
    $filas = filas('SELECT id, nombre, peso FROM categoria WHERE asignacion_id = ? AND archivada = 0 ORDER BY id', [$asignacion_id]);
    foreach ($filas as &$f) {
        $f['id'] = (int) $f['id'];
        $f['peso'] = (float) $f['peso'];
    }
    return $filas;
}

function ruta_categorias(array $a): never
{
    $u = exigir_permiso('actividad', 'ver');
    curso_o_denegar($u, (int) $a['id']);
    responder(200, ['categorias' => categorias_de((int) $a['id'])]);
}

function ruta_guardar_categorias(array $a): never
{
    [, $curso] = curso_para_escribir('actividad', 'modificar', (int) $a['id']);
    $lista = cuerpo_json()['categorias'] ?? null;
    if (!is_array($lista) || $lista === [] || count($lista) > 12) {
        error_http(422, 'Define de 1 a 12 categorías con su peso.');
    }
    $suma = 0.0;
    $limpias = [];
    foreach ($lista as $c) {
        $c = is_array($c) ? $c : [];
        $peso = num($c, 'peso', 'El peso', 0, 100);
        $suma += $peso;
        $limpias[] = ['id' => isset($c['id']) ? (int) $c['id'] : null, 'nombre' => texto($c, 'nombre', 80, 'El nombre de la categoría'), 'peso' => $peso];
    }
    if (abs($suma - 100) > 0.005) {
        error_http(422, 'Los pesos de las categorías deben sumar 100. Ahora suman ' . rtrim(rtrim(number_format($suma, 2, '.', ''), '0'), '.') . '.', ['categorias' => 'Los pesos deben sumar 100.']);
    }
    $antes = categorias_de((int) $curso['id']);
    $vigentes = array_column($antes, null, 'id');
    transaccion(function () use ($limpias, $vigentes, $curso): void {
        $conservadas = [];
        foreach ($limpias as $c) {
            if ($c['id'] !== null && isset($vigentes[$c['id']])) {
                ejecutar('UPDATE categoria SET nombre = ?, peso = ? WHERE id = ?', [$c['nombre'], $c['peso'], $c['id']]);
                $conservadas[] = $c['id'];
            } else {
                $conservadas[] = insertar('categoria', ['asignacion_id' => $curso['id'], 'nombre' => $c['nombre'], 'peso' => $c['peso']]);
            }
        }
        foreach (array_diff(array_keys($vigentes), $conservadas) as $quitar) {
            if ((int) fila('SELECT COUNT(*) AS n FROM actividad WHERE categoria_id = ? AND archivada = 0', [$quitar])['n'] > 0) {
                error_http(422, 'No puedes quitar una categoría que tiene actividades. Cambia primero la categoría de esas actividades.');
            }
            ejecutar('UPDATE categoria SET archivada = 1 WHERE id = ?', [$quitar]);
        }
    });
    $despues = categorias_de((int) $curso['id']);
    registrar_bitacora('categoria', (int) $curso['id'], 'definir_pesos', ['categorias' => $antes], ['categorias' => $despues]);
    responder(200, ['categorias' => $despues]);
}

// --- Rúbricas (12.5) ---------------------------------------------------------------------------------

function puntos_maximos(array $criterios): float
{
    return round(array_sum(array_map(static fn (array $c): float => max(array_map(static fn (array $n): float => (float) $n['puntos'], $c['niveles'])), $criterios)), 2);
}

function rubrica_de(?int $id): ?array
{
    $r = $id === null ? null : fila('SELECT id, asignacion_id, nombre, criterios FROM rubrica WHERE id = ?', [$id]);
    if ($r === null) {
        return null;
    }
    $criterios = json_decode($r['criterios'], true);
    return ['id' => (int) $r['id'], 'asignacion_id' => (int) $r['asignacion_id'], 'nombre' => $r['nombre'], 'criterios' => $criterios, 'maximo' => puntos_maximos($criterios)];
}

function ruta_rubricas(array $a): never
{
    $u = exigir_permiso('actividad', 'ver');
    [, $modo] = curso_o_denegar($u, (int) $a['id']);
    if ($modo === 'alumno') {
        denegar('rúbricas del curso');
    }
    $filas = filas('SELECT id FROM rubrica WHERE asignacion_id = ? ORDER BY id DESC', [(int) $a['id']]);
    responder(200, ['rubricas' => array_map(static fn (array $f): ?array => rubrica_de((int) $f['id']), $filas)]);
}

function ruta_crear_rubrica(array $a): never
{
    [$u, $curso] = curso_para_escribir('actividad', 'crear', (int) $a['id']);
    $d = cuerpo_json();
    $crudos = $d['criterios'] ?? null;
    if (!is_array($crudos) || $crudos === [] || count($crudos) > 10) {
        error_http(422, 'La rúbrica necesita de 1 a 10 criterios.', ['criterios' => 'Agrega al menos un criterio.']);
    }
    $criterios = [];
    foreach ($crudos as $c) {
        $c = is_array($c) ? $c : [];
        $niveles = [];
        foreach (is_array($c['niveles'] ?? null) ? $c['niveles'] : [] as $n) {
            $n = is_array($n) ? $n : [];
            $niveles[] = ['nombre' => texto($n, 'nombre', 80, 'El nombre del nivel'), 'puntos' => num($n, 'puntos', 'Los puntos del nivel', 0, 1000)];
        }
        if (count($niveles) < 2 || count($niveles) > 6) {
            error_http(422, 'Cada criterio necesita de 2 a 6 niveles.', ['criterios' => 'Cada criterio lleva de 2 a 6 niveles.']);
        }
        $criterios[] = ['descripcion' => texto($c, 'descripcion', 300, 'La descripción del criterio'), 'niveles' => $niveles];
    }
    $nombre = texto($d, 'nombre', 120, 'El nombre de la rúbrica');
    $id = insertar('rubrica', ['asignacion_id' => $curso['id'], 'nombre' => $nombre, 'criterios' => json_encode($criterios, JSON_UNESCAPED_UNICODE), 'creado_por' => $u['id']]);
    registrar_bitacora('rubrica', $id, 'crear', null, ['nombre' => $nombre, 'criterios' => count($criterios)]);
    responder(200, rubrica_de($id));
}

// --- Actividades (12.4, 12.6, 12.9) ------------------------------------------------------------------

function preguntas_de(int $actividad_id, bool $con_correcta): array
{
    $filas = filas('SELECT id, tipo, enunciado, opciones, correcta, puntos, orden FROM pregunta WHERE actividad_id = ? AND archivada = 0 ORDER BY orden, id', [$actividad_id]);
    return array_map(static function (array $p) use ($con_correcta): array {
        $s = ['id' => (int) $p['id'], 'tipo' => $p['tipo'], 'enunciado' => $p['enunciado'], 'opciones' => $p['opciones'] === null ? null : json_decode($p['opciones'], true), 'puntos' => (float) $p['puntos']];
        if ($con_correcta) {
            $s['correcta'] = $p['correcta'];
        }
        return $s;
    }, $filas);
}

/** Valida las preguntas de un examen y devuelve las filas a guardar. */
function preguntas_validas(mixed $crudas): array
{
    if (!is_array($crudas) || $crudas === [] || count($crudas) > 50) {
        error_http(422, 'El examen necesita de 1 a 50 preguntas.', ['preguntas' => 'Agrega al menos una pregunta.']);
    }
    $salida = [];
    foreach (array_values($crudas) as $i => $p) {
        $p = is_array($p) ? $p : [];
        $tipo = una_de($p, 'tipo', ['opcion', 'vf', 'abierta'], 'El tipo de pregunta');
        $fila = ['tipo' => $tipo, 'enunciado' => texto($p, 'enunciado', 2000, 'El enunciado'), 'opciones' => null, 'correcta' => null, 'puntos' => num($p, 'puntos', 'Los puntos de la pregunta', 0.01, 1000), 'orden' => $i + 1];
        if ($tipo === 'opcion') {
            $ops = array_values(array_filter(array_map(static fn ($o): string => is_string($o) ? trim($o) : '', is_array($p['opciones'] ?? null) ? $p['opciones'] : []), static fn (string $o): bool => $o !== ''));
            if (count($ops) < 2 || count($ops) > 6) {
                error_http(422, 'Una pregunta de opción múltiple lleva de 2 a 6 opciones.', ['preguntas' => 'Revisa las opciones.']);
            }
            $c = $p['correcta'] ?? null;
            if (!(is_int($c) || (is_string($c) && ctype_digit($c))) || (int) $c >= count($ops)) {
                error_http(422, 'Marca cuál opción es la correcta.', ['preguntas' => 'Marca la opción correcta.']);
            }
            $fila['opciones'] = json_encode($ops, JSON_UNESCAPED_UNICODE);
            $fila['correcta'] = (string) (int) $c;
        } elseif ($tipo === 'vf') {
            $fila['correcta'] = una_de($p, 'correcta', ['v', 'f'], 'La respuesta correcta');
        }
        $salida[] = $fila;
    }
    return $salida;
}

function actividad_o_404(int $id): array
{
    $ac = fila('SELECT * FROM actividad WHERE id = ?', [$id]);
    if ($ac === null) {
        denegar("actividad $id");
    }
    return $ac;
}

/** La actividad y el modo de la persona en su curso; el alumno no ve lo no publicado (404). */
function actividad_visible(array $u, int $id): array
{
    $ac = actividad_o_404($id);
    [$curso, $modo] = curso_o_denegar($u, (int) $ac['asignacion_id']);
    if ($modo === 'alumno' && ((int) $ac['publicada'] !== 1 || (int) $ac['archivada'] === 1)) {
        error_http(404, 'Esa actividad no existe o todavía no está publicada.');
    }
    return [$ac, $curso, $modo];
}

function ultima_calificacion(int $actividad_id, int $alumno_id): ?array
{
    return fila('SELECT * FROM calificacion_actividad WHERE actividad_id = ? AND alumno_id = ? ORDER BY id DESC LIMIT 1', [$actividad_id, $alumno_id]);
}

function version_de_entrega(array $e): array
{
    return ['id' => (int) $e['id'], 'version' => (int) $e['version'], 'texto' => $e['texto'], 'tarde' => (int) $e['tarde'] === 1, 'fecha' => $e['creado_en'], 'archivo' => datos_de_archivo($e['archivo_id'] === null ? null : (int) $e['archivo_id'])];
}

/** Lo que el alumno ve de su propia situación en una actividad: sin puntos hasta que se publican. */
function estado_del_alumno(array $ac, int $alumno_id): array
{
    $publicadas = (int) $ac['calificaciones_publicadas'] === 1;
    $r = [];
    if ($ac['tipo'] === 'tarea') {
        $e = fila('SELECT * FROM entrega_tarea WHERE actividad_id = ? AND alumno_id = ? ORDER BY version DESC LIMIT 1', [$ac['id'], $alumno_id]);
        $r['estado'] = $e === null ? 'sin_entregar' : 'entregada';
        $r['version'] = $e === null ? 0 : (int) $e['version'];
        $r['tarde'] = $e !== null && (int) $e['tarde'] === 1;
    } elseif ($ac['tipo'] === 'examen') {
        $n = (int) fila('SELECT COUNT(*) AS n FROM intento_examen WHERE actividad_id = ? AND alumno_id = ?', [$ac['id'], $alumno_id])['n'];
        $abierto = fila('SELECT id FROM intento_examen WHERE actividad_id = ? AND alumno_id = ? AND estado = \'en_curso\' LIMIT 1', [$ac['id'], $alumno_id]);
        $r['intentos_usados'] = $n;
        $r['intento_en_curso'] = $abierto === null ? null : (int) $abierto['id'];
        $r['estado'] = $abierto !== null ? 'en_curso' : ($n > 0 ? 'entregada' : 'sin_entregar');
    }
    $cal = $publicadas ? ultima_calificacion((int) $ac['id'], $alumno_id) : null;
    $r['calificacion'] = $cal === null ? null : ['puntos' => (float) $cal['puntos'], 'comentario' => $cal['comentario'], 'detalle' => $cal['detalle'] === null ? null : json_decode($cal['detalle'], true)];
    return $r;
}

function actividad_a_salida(array $ac, string $modo, ?array $curso = null): array
{
    $alumno = $modo === 'alumno';
    $rubrica = rubrica_de($ac['rubrica_id'] === null ? null : (int) $ac['rubrica_id']);
    $s = [
        'id' => (int) $ac['id'], 'asignacion_id' => (int) $ac['asignacion_id'], 'tipo' => $ac['tipo'], 'titulo' => $ac['titulo'], 'instrucciones' => $ac['instrucciones'],
        'categoria_id' => $ac['categoria_id'] === null ? null : (int) $ac['categoria_id'], 'puntos' => (float) $ac['puntos'], 'fecha_limite' => $ac['fecha_limite'], 'acepta_tarde' => (int) $ac['acepta_tarde'] === 1,
        'rubrica' => $rubrica === null ? null : ['id' => $rubrica['id'], 'nombre' => $rubrica['nombre'], 'criterios' => $rubrica['criterios'], 'maximo' => $rubrica['maximo']],
        'disponible_desde' => $ac['disponible_desde'], 'disponible_hasta' => $ac['disponible_hasta'], 'tiempo_limite_min' => $ac['tiempo_limite_min'] === null ? null : (int) $ac['tiempo_limite_min'],
        'intentos_permitidos' => (int) $ac['intentos_permitidos'], 'calificable' => (int) $ac['calificable'] === 1, 'publicada' => (int) $ac['publicada'] === 1,
        'calificaciones_publicadas' => (int) $ac['calificaciones_publicadas'] === 1, 'servidor_ahora' => ahora(),
    ];
    if ($ac['tipo'] === 'examen') {
        $s['total_preguntas'] = count(preguntas_de((int) $ac['id'], false));
    }
    return $s;
}

function ruta_actividades(array $a): never
{
    $u = exigir_permiso('actividad', 'ver');
    [$curso, $modo] = curso_o_denegar($u, (int) $a['id']);
    $alumno = $modo === 'alumno';
    $donde = ['asignacion_id = ?', 'archivada = 0'];
    $p = [(int) $curso['id']];
    if ($alumno) {
        $donde[] = 'publicada = 1';
    }
    if (isset($_GET['tipo']) && in_array($_GET['tipo'], TIPOS_ACTIVIDAD, true)) {
        $donde[] = 'tipo = ?';
        $p[] = $_GET['tipo'];
    }
    $filas = filas('SELECT * FROM actividad WHERE ' . implode(' AND ', $donde) . ' ORDER BY COALESCE(fecha_limite, disponible_hasta, creado_en), id', $p);
    $salida = [];
    foreach ($filas as $ac) {
        $s = actividad_a_salida($ac, $modo);
        if ($alumno) {
            $s['mio'] = estado_del_alumno($ac, (int) $u['alumno_id']);
        } elseif ($ac['tipo'] === 'tarea') {
            $s['entregas'] = (int) fila('SELECT COUNT(DISTINCT alumno_id) AS n FROM entrega_tarea WHERE actividad_id = ?', [$ac['id']])['n'];
        } elseif ($ac['tipo'] === 'examen') {
            $s['intentos'] = (int) fila('SELECT COUNT(*) AS n FROM intento_examen WHERE actividad_id = ?', [$ac['id']])['n'];
        }
        $salida[] = $s;
    }
    responder(200, ['curso' => curso_resumen($curso, $modo), 'actividades' => $salida, 'categorias' => categorias_de((int) $curso['id'])]);
}

function ruta_actividad(array $a): never
{
    $u = exigir_permiso('actividad', 'ver');
    [$ac, $curso, $modo] = actividad_visible($u, (int) $a['id']);
    $s = actividad_a_salida($ac, $modo);
    $s['curso'] = curso_resumen($curso, $modo);
    if ($modo === 'alumno') {
        $s['mio'] = estado_del_alumno($ac, (int) $u['alumno_id']);
    } elseif ($ac['tipo'] === 'examen') {
        $s['preguntas'] = preguntas_de((int) $ac['id'], true);
    }
    responder(200, $s);
}

/** Campos comunes de una actividad, validados; `$d` puede traer solo algunos cuando se edita. */
function campos_de_actividad(array $d, string $tipo, array $curso, ?array $actual): array
{
    $c = [];
    $nuevo = $actual === null;
    if ($nuevo || isset($d['titulo'])) {
        $c['titulo'] = texto($d, 'titulo', 160, 'El título');
    }
    if ($nuevo || array_key_exists('instrucciones', $d)) {
        $c['instrucciones'] = texto($d, 'instrucciones', 20000, 'Las instrucciones', false) ?: null;
    }
    if ($nuevo || array_key_exists('categoria_id', $d)) {
        $cat = $d['categoria_id'] ?? null;
        if ($cat !== null && $cat !== '') {
            $ok = fila('SELECT id FROM categoria WHERE id = ? AND asignacion_id = ? AND archivada = 0', [(int) $cat, $curso['id']]);
            if ($ok === null) {
                error_http(422, 'La categoría no es de este curso.', ['categoria_id' => 'Elige una categoría del curso.']);
            }
        }
        $c['categoria_id'] = $cat === null || $cat === '' ? null : (int) $cat;
    }
    if ($tipo === 'tarea') {
        if ($nuevo || array_key_exists('fecha_limite', $d)) {
            $c['fecha_limite'] = fecha_hora($d, 'fecha_limite', 'La fecha de entrega');
        }
        if ($nuevo || array_key_exists('acepta_tarde', $d)) {
            $c['acepta_tarde'] = bool_de($d, 'acepta_tarde', 0);
        }
        if ($nuevo || array_key_exists('rubrica_id', $d)) {
            $rid = $d['rubrica_id'] ?? null;
            $r = $rid === null || $rid === '' ? null : rubrica_de((int) $rid);
            if (($rid !== null && $rid !== '') && ($r === null || $r['asignacion_id'] !== (int) $curso['id'])) {
                error_http(422, 'La rúbrica no es de este curso.', ['rubrica_id' => 'Elige una rúbrica del curso.']);
            }
            $c['rubrica_id'] = $r === null ? null : $r['id'];
            if ($r !== null) {
                $c['puntos'] = $r['maximo'];
            }
        }
        if (!isset($c['puntos']) && ($nuevo || isset($d['puntos']))) {
            $c['puntos'] = num($d, 'puntos', 'Los puntos', 0.01, 1000);
        }
    } elseif ($tipo === 'examen') {
        foreach (['disponible_desde' => 'La fecha de apertura', 'disponible_hasta' => 'La fecha de cierre'] as $campo => $etiqueta) {
            if ($nuevo || array_key_exists($campo, $d)) {
                $c[$campo] = fecha_hora($d, $campo, $etiqueta);
            }
        }
        $desde = $c['disponible_desde'] ?? $actual['disponible_desde'] ?? null;
        $hasta = $c['disponible_hasta'] ?? $actual['disponible_hasta'] ?? null;
        if ($desde !== null && $hasta !== null && $desde >= $hasta) {
            error_http(422, 'El examen debe cerrar después de abrir.', ['disponible_hasta' => 'Elige una fecha posterior a la apertura.']);
        }
        if ($nuevo || array_key_exists('tiempo_limite_min', $d)) {
            $t = $d['tiempo_limite_min'] ?? null;
            $c['tiempo_limite_min'] = $t === null || $t === '' ? null : (int) num($d, 'tiempo_limite_min', 'El tiempo límite', 1, 600);
        }
        if ($nuevo || isset($d['intentos_permitidos'])) {
            $c['intentos_permitidos'] = (int) num($d, 'intentos_permitidos', 'Los intentos', 1, 10);
        }
    } else {
        if ($nuevo || array_key_exists('calificable', $d)) {
            $c['calificable'] = bool_de($d, 'calificable', 0);
        }
        $califica = ($c['calificable'] ?? $actual['calificable'] ?? 0) === 1 || (int) ($c['calificable'] ?? $actual['calificable'] ?? 0) === 1;
        if ($califica && ($nuevo || isset($d['puntos']))) {
            $c['puntos'] = num($d, 'puntos', 'Los puntos', 0.01, 1000);
        }
    }
    return $c;
}

function avisar_publicacion(array $ac, array $curso): void
{
    if ($ac['tipo'] === 'foro') {
        return;
    }
    $palabra = $ac['tipo'] === 'tarea' ? 'tarea' : 'examen';
    foreach (filas(
        'SELECT us.id FROM inscripcion_grupo i JOIN usuario us ON us.alumno_id = i.alumno_id AND us.estado = \'activo\' WHERE i.grupo_id = ? AND i.estado = \'activa\'',
        [$curso['grupo_id']]
    ) as $c) {
        avisar((int) $c['id'], 'aula_publicada', "Nueva $palabra en {$curso['materia']}: {$ac['titulo']}.", "/cursos/{$curso['id']}/" . ($ac['tipo'] === 'tarea' ? 'tareas' : 'examenes'), "pub:{$ac['id']}");
    }
}

function ruta_crear_actividad(array $a): never
{
    [$u, $curso] = curso_para_escribir('actividad', 'crear', (int) $a['id']);
    $d = cuerpo_json();
    $tipo = una_de($d, 'tipo', TIPOS_ACTIVIDAD, 'El tipo de actividad');
    $c = campos_de_actividad($d, $tipo, $curso, null);
    $preguntas = $tipo === 'examen' ? preguntas_validas($d['preguntas'] ?? null) : [];
    if ($tipo === 'examen') {
        $c['puntos'] = round(array_sum(array_column($preguntas, 'puntos')), 2);
    }
    $c['puntos'] ??= 10;
    $publicada = bool_de($d, 'publicada', 0);
    $id = transaccion(function () use ($curso, $tipo, $c, $preguntas, $publicada, $u): int {
        $id = insertar('actividad', ['asignacion_id' => $curso['id'], 'tipo' => $tipo, 'publicada' => $publicada, 'creado_por' => $u['id']] + $c);
        foreach ($preguntas as $p) {
            insertar('pregunta', ['actividad_id' => $id] + $p);
        }
        return $id;
    });
    registrar_bitacora('actividad', $id, 'crear', null, ['tipo' => $tipo, 'titulo' => $c['titulo'], 'publicada' => (bool) $publicada]);
    if ($publicada === 1) {
        avisar_publicacion(['id' => $id, 'tipo' => $tipo, 'titulo' => $c['titulo']], $curso);
    }
    responder(200, ['id' => $id]);
}

function ruta_editar_actividad(array $a): never
{
    exigir_sesion();
    $ac = actividad_o_404((int) $a['id']);
    [, $curso] = curso_para_escribir('actividad', 'modificar', (int) $ac['asignacion_id']);
    $d = cuerpo_json();
    $c = campos_de_actividad($d, $ac['tipo'], $curso, $ac);
    $preguntas = null;
    if ($ac['tipo'] === 'examen' && isset($d['preguntas'])) {
        if ((int) fila('SELECT COUNT(*) AS n FROM intento_examen WHERE actividad_id = ?', [$ac['id']])['n'] > 0) {
            error_http(409, 'El examen ya tiene intentos: no se pueden cambiar sus preguntas.');
        }
        $preguntas = preguntas_validas($d['preguntas']);
        $c['puntos'] = round(array_sum(array_column($preguntas, 'puntos')), 2);
    }
    foreach (['publicada' => 'publicada', 'archivada' => 'archivada'] as $campo => $_) {
        $v = bool_de($d, $campo);
        if ($v !== null) {
            $c[$campo] = $v;
        }
    }
    if ($c === [] && $preguntas === null) {
        responder(200, ['id' => (int) $ac['id']]);
    }
    transaccion(function () use ($ac, $c, $preguntas): void {
        if ($c !== []) {
            $sets = implode(', ', array_map(static fn (string $k): string => "$k = ?", array_keys($c)));
            ejecutar("UPDATE actividad SET $sets WHERE id = ?", [...array_values($c), $ac['id']]);
        }
        if ($preguntas !== null) {
            ejecutar('UPDATE pregunta SET archivada = 1 WHERE actividad_id = ?', [$ac['id']]);
            foreach ($preguntas as $p) {
                insertar('pregunta', ['actividad_id' => $ac['id']] + $p);
            }
        }
    });
    $antes = array_intersect_key($ac, $c);
    registrar_bitacora('actividad', (int) $ac['id'], 'editar', $antes, $c + ($preguntas !== null ? ['preguntas' => count($preguntas)] : []));
    if (($c['publicada'] ?? 0) === 1 && (int) $ac['publicada'] !== 1) {
        avisar_publicacion($ac, $curso);
    }
    responder(200, ['id' => (int) $ac['id']]);
}

function ruta_publicar_calificaciones(array $a): never
{
    exigir_sesion();
    $ac = actividad_o_404((int) $a['id']);
    [, $curso] = curso_para_escribir('calificacion_actividad', 'modificar', (int) $ac['asignacion_id']);
    if ((int) $ac['calificaciones_publicadas'] === 1) {
        error_http(409, 'Las calificaciones de esta actividad ya están publicadas.');
    }
    ejecutar('UPDATE actividad SET calificaciones_publicadas = 1 WHERE id = ?', [$ac['id']]);
    $n = (int) fila('SELECT COUNT(DISTINCT alumno_id) AS n FROM calificacion_actividad WHERE actividad_id = ?', [$ac['id']])['n'];
    registrar_bitacora('actividad', (int) $ac['id'], 'publicar_calificaciones', null, ['calificados' => $n, 'titulo' => $ac['titulo']]);
    foreach (filas(
        'SELECT DISTINCT us.id FROM calificacion_actividad c JOIN usuario us ON us.alumno_id = c.alumno_id AND us.estado = \'activo\' WHERE c.actividad_id = ?',
        [$ac['id']]
    ) as $c) {
        avisar((int) $c['id'], 'aula_calificaciones', "Se publicaron tus calificaciones de {$ac['titulo']} ({$curso['materia']}).", "/cursos/{$curso['id']}/calificaciones");
    }
    responder(200, ['id' => (int) $ac['id'], 'calificados' => $n]);
}

// --- Entregas de tareas y calificación (12.4, 12.5) --------------------------------------------------

function ruta_entregar_tarea(array $a): never
{
    $u = exigir_permiso('entrega_tarea', 'crear');
    [$ac, $curso, $modo] = actividad_visible($u, (int) $a['id']);
    if ($modo !== 'alumno' || $ac['tipo'] !== 'tarea') {
        denegar('entrega de la actividad ' . (int) $ac['id']);
    }
    exigir_periodo_abierto($curso);
    if ((int) $ac['calificaciones_publicadas'] === 1) {
        error_http(409, 'El docente ya publicó las calificaciones de esta tarea: no admite más entregas.');
    }
    $d = cuerpo_json();
    $texto = texto($d, 'texto', 20000, 'El texto', false);
    $archivo = isset($d['archivo_id']) && $d['archivo_id'] !== null ? entero($d, 'archivo_id', 'El archivo') : null;
    if ($texto === '' && $archivo === null) {
        error_http(422, 'Escribe tu respuesta, adjunta un archivo o las dos cosas.', ['texto' => 'Escribe algo o adjunta un archivo.']);
    }
    $tarde = $ac['fecha_limite'] !== null && ahora() > $ac['fecha_limite'];
    if ($tarde && (int) $ac['acepta_tarde'] !== 1) {
        error_http(409, 'La fecha de entrega ya venció y esta tarea no acepta entregas tarde.');
    }
    $alumno = (int) $u['alumno_id'];
    $id = transaccion(function () use ($ac, $alumno, $texto, $archivo, $tarde, $u): int {
        if ($archivo !== null) {
            vincular_archivo($archivo, $u);
        }
        $version = (int) fila('SELECT COALESCE(MAX(version), 0) + 1 AS n FROM entrega_tarea WHERE actividad_id = ? AND alumno_id = ?', [$ac['id'], $alumno])['n'];
        return insertar('entrega_tarea', ['actividad_id' => $ac['id'], 'alumno_id' => $alumno, 'version' => $version, 'texto' => $texto === '' ? null : $texto, 'archivo_id' => $archivo, 'tarde' => $tarde ? 1 : 0]);
    });
    $v = fila('SELECT version FROM entrega_tarea WHERE id = ?', [$id]);
    registrar_bitacora('entrega_tarea', $id, 'entregar', null, ['actividad_id' => (int) $ac['id'], 'version' => (int) $v['version'], 'tarde' => $tarde]);
    avisar((int) $curso['docente_id'], 'aula_entrega', "Entrega recibida en {$curso['materia']}: {$ac['titulo']} ({$u['nombre']}).", "/cursos/{$curso['id']}/tareas", "ent:$id");
    responder(200, ['id' => $id, 'version' => (int) $v['version'], 'tarde' => $tarde]);
}

function ruta_entregas_de_tarea(array $a): never
{
    $u = exigir_permiso('entrega_tarea', 'ver');
    [$ac, $curso, $modo] = actividad_visible($u, (int) $a['id']);
    if ($ac['tipo'] !== 'tarea') {
        error_http(422, 'Esta actividad no es una tarea.');
    }
    $base = ['actividad' => actividad_a_salida($ac, $modo)];
    if ($modo === 'alumno') {
        $alumno = (int) $u['alumno_id'];
        $versiones = filas('SELECT * FROM entrega_tarea WHERE actividad_id = ? AND alumno_id = ? ORDER BY version', [$ac['id'], $alumno]);
        responder(200, $base + ['versiones' => array_map('version_de_entrega', $versiones), 'mio' => estado_del_alumno($ac, $alumno)]);
    }
    $filas = [];
    foreach (lista_vigente((int) $curso['grupo_id']) as $al) {
        $versiones = filas('SELECT * FROM entrega_tarea WHERE actividad_id = ? AND alumno_id = ? ORDER BY version', [$ac['id'], $al['alumno_id']]);
        $cal = ultima_calificacion((int) $ac['id'], (int) $al['alumno_id']);
        $filas[] = [
            'alumno_id' => (int) $al['alumno_id'], 'identificador' => $al['identificador'], 'nombre' => $al['nombre'], 'versiones' => array_map('version_de_entrega', $versiones),
            'calificacion' => $cal === null ? null : ['puntos' => (float) $cal['puntos'], 'comentario' => $cal['comentario'], 'detalle' => $cal['detalle'] === null ? null : json_decode($cal['detalle'], true), 'entrega_id' => $cal['entrega_id'] === null ? null : (int) $cal['entrega_id']],
        ];
    }
    responder(200, $base + ['alumnos' => $filas]);
}

/** Una entrega por su id: solo su dueño, el docente del curso, Coordinación y Dirección. */
function ruta_entrega_tarea(array $a): never
{
    $u = exigir_permiso('entrega_tarea', 'ver');
    $e = fila('SELECT t.*, ac.asignacion_id FROM entrega_tarea t JOIN actividad ac ON ac.id = t.actividad_id WHERE t.id = ?', [(int) $a['id']]);
    if ($e === null) {
        denegar('entrega ' . (int) $a['id']);
    }
    [, $modo] = curso_o_denegar($u, (int) $e['asignacion_id']);
    if ($modo === 'alumno' && (int) $e['alumno_id'] !== (int) $u['alumno_id']) {
        denegar('entrega ' . (int) $a['id'] . ' de otro alumno');
    }
    responder(200, version_de_entrega($e) + ['actividad_id' => (int) $e['actividad_id'], 'alumno_id' => (int) $e['alumno_id']]);
}

function ruta_calificar_actividad(array $a): never
{
    exigir_sesion();
    $ac = actividad_o_404((int) $a['id']);
    $d = cuerpo_json();
    $alumno_id = entero($d, 'alumno_id', 'El alumno');
    $accion = ultima_calificacion((int) $ac['id'], $alumno_id) === null ? 'crear' : 'modificar';
    [$u, $curso] = curso_para_escribir('calificacion_actividad', $accion, (int) $ac['asignacion_id']);
    if ($ac['tipo'] === 'examen' || ($ac['tipo'] === 'foro' && (int) $ac['calificable'] !== 1)) {
        error_http(422, 'Esta actividad no se califica así.');
    }
    if (!in_array($alumno_id, array_map('intval', array_column(lista_vigente((int) $curso['grupo_id']), 'alumno_id')), true)) {
        error_http(422, 'Ese alumno no está en la lista vigente del grupo.', ['alumno_id' => 'Elige un alumno del grupo.']);
    }
    $detalle = null;
    $rubrica = rubrica_de($ac['rubrica_id'] === null ? null : (int) $ac['rubrica_id']);
    if ($rubrica !== null) {
        $sel = $d['detalle'] ?? null;
        if (!is_array($sel) || count($sel) !== count($rubrica['criterios'])) {
            error_http(422, 'Elige un nivel para cada criterio de la rúbrica.', ['detalle' => 'Falta elegir un nivel en algún criterio.']);
        }
        $puntos = 0.0;
        $detalle = [];
        foreach ($rubrica['criterios'] as $i => $criterio) {
            $nivel = $sel[$i]['nivel'] ?? null;
            if (!(is_int($nivel) || (is_string($nivel) && ctype_digit($nivel))) || !isset($criterio['niveles'][(int) $nivel])) {
                error_http(422, 'Elige un nivel válido en cada criterio.', ['detalle' => 'Nivel no válido.']);
            }
            $n = $criterio['niveles'][(int) $nivel];
            $puntos += (float) $n['puntos'];
            $detalle[] = ['criterio' => $criterio['descripcion'], 'nivel' => $n['nombre'], 'puntos' => (float) $n['puntos']];
        }
    } else {
        $puntos = num($d, 'puntos', 'Los puntos', 0, (float) $ac['puntos']);
    }
    $entrega = $ac['tipo'] === 'tarea' ? fila('SELECT id FROM entrega_tarea WHERE actividad_id = ? AND alumno_id = ? ORDER BY version DESC LIMIT 1', [$ac['id'], $alumno_id]) : null;
    $antes = ultima_calificacion((int) $ac['id'], $alumno_id);
    $id = insertar('calificacion_actividad', [
        'actividad_id' => $ac['id'], 'alumno_id' => $alumno_id, 'entrega_id' => $entrega['id'] ?? null, 'puntos' => $puntos,
        'comentario' => texto($d, 'comentario', 5000, 'El comentario', false) ?: null, 'detalle' => $detalle === null ? null : json_encode($detalle, JSON_UNESCAPED_UNICODE), 'calificado_por' => actor_real_id(),
    ]);
    registrar_bitacora('calificacion_actividad', $id, 'calificar', $antes === null ? null : ['puntos' => (float) $antes['puntos']], ['actividad_id' => (int) $ac['id'], 'alumno_id' => $alumno_id, 'puntos' => $puntos]);
    responder(200, ['id' => $id, 'puntos' => $puntos]);
}

// --- Exámenes (12.6) ---------------------------------------------------------------------------------

function intento_o_denegar(array $u, int $id): array
{
    $i = fila('SELECT i.*, ac.asignacion_id FROM intento_examen i JOIN actividad ac ON ac.id = i.actividad_id WHERE i.id = ?', [$id]);
    if ($i === null) {
        denegar("intento $id");
    }
    [$curso, $modo] = curso_o_denegar($u, (int) $i['asignacion_id']);
    if ($modo === 'alumno' && (int) $i['alumno_id'] !== (int) $u['alumno_id']) {
        denegar("intento $id de otro alumno");
    }
    return [$i, $curso, $modo];
}

function intento_vencido(array $i): bool
{
    return $i['estado'] === 'en_curso' && $i['limite'] !== null && ahora() > $i['limite'];
}

/** Califica lo cerrado y deja el intento enviado (o calificado si no hay preguntas abiertas). */
function cerrar_intento(array $i, ?string $envio = null): void
{
    $respuestas = json_decode($i['respuestas'], true) ?: [];
    $auto = 0.0;
    $abiertas = false;
    foreach (preguntas_de((int) $i['actividad_id'], true) as $p) {
        if ($p['tipo'] === 'abierta') {
            $abiertas = true;
            continue;
        }
        if (isset($respuestas[$p['id']]) && (string) $respuestas[$p['id']] === (string) $p['correcta']) {
            $auto += $p['puntos'];
        }
    }
    $envio ??= ahora();
    if ($i['limite'] !== null && $envio > $i['limite']) {
        $envio = $i['limite'];
    }
    ejecutar(
        'UPDATE intento_examen SET estado = ?, envio = ?, puntos_auto = ?, puntos_finales = ? WHERE id = ? AND estado = \'en_curso\'',
        [$abiertas ? 'enviado' : 'calificado', $envio, $auto, $abiertas ? null : $auto, $i['id']]
    );
    if (!$abiertas) {
        calificacion_de_examen((int) $i['actividad_id'], (int) $i['alumno_id'], null);
    }
}

/** La calificación de un examen es la del mejor intento calificado; cada cambio es una fila nueva. */
function calificacion_de_examen(int $actividad_id, int $alumno_id, ?int $calificador): void
{
    $mejor = fila('SELECT id, puntos_finales FROM intento_examen WHERE actividad_id = ? AND alumno_id = ? AND estado = \'calificado\' ORDER BY puntos_finales DESC, id DESC LIMIT 1', [$actividad_id, $alumno_id]);
    $actual = ultima_calificacion($actividad_id, $alumno_id);
    if ($mejor === null || ($actual !== null && abs((float) $actual['puntos'] - (float) $mejor['puntos_finales']) < 0.005)) {
        return;
    }
    $id = insertar('calificacion_actividad', ['actividad_id' => $actividad_id, 'alumno_id' => $alumno_id, 'intento_id' => $mejor['id'], 'puntos' => $mejor['puntos_finales'], 'calificado_por' => $calificador]);
    registrar_bitacora('calificacion_actividad', $id, 'calificar', $actual === null ? null : ['puntos' => (float) $actual['puntos']], ['actividad_id' => $actividad_id, 'alumno_id' => $alumno_id, 'puntos' => (float) $mejor['puntos_finales'], 'origen' => $calificador === null ? 'autocalificado' : 'docente'], null, $calificador);
}

/** Cierra los intentos vencidos de una actividad. Solo escribe fuera de "ver como". */
function cerrar_vencidos(int $actividad_id, array $u): void
{
    if ($u['solo_lectura'] ?? false) {
        return;
    }
    foreach (filas('SELECT * FROM intento_examen WHERE actividad_id = ? AND estado = \'en_curso\' AND limite IS NOT NULL AND limite < ?', [$actividad_id, ahora()]) as $i) {
        cerrar_intento($i, $i['limite']);
    }
}

function intento_a_salida(array $i, array $ac, string $modo): array
{
    $alumno = $modo === 'alumno';
    $vencido = intento_vencido($i);
    $estado = $vencido ? 'enviado' : $i['estado'];
    $s = [
        'id' => (int) $i['id'], 'actividad_id' => (int) $i['actividad_id'], 'numero' => (int) $i['numero'], 'inicio' => $i['inicio'], 'limite' => $i['limite'], 'envio' => $i['envio'],
        'estado' => $estado, 'respuestas' => json_decode($i['respuestas'], true) ?: new stdClass(), 'servidor_ahora' => ahora(),
        'preguntas' => preguntas_de((int) $i['actividad_id'], !$alumno),
    ];
    if (!$alumno) {
        $s['puntos_auto'] = (float) $i['puntos_auto'];
        $s['puntos_abiertas'] = $i['puntos_abiertas'] === null ? new stdClass() : json_decode($i['puntos_abiertas'], true);
        $s['puntos_finales'] = $i['puntos_finales'] === null ? null : (float) $i['puntos_finales'];
    } elseif ((int) $ac['calificaciones_publicadas'] === 1 && $i['puntos_finales'] !== null) {
        $s['puntos_finales'] = (float) $i['puntos_finales'];
    }
    return $s;
}

function ruta_iniciar_intento(array $a): never
{
    $u = exigir_permiso('intento_examen', 'crear');
    [$ac, $curso, $modo] = actividad_visible($u, (int) $a['id']);
    if ($modo !== 'alumno' || $ac['tipo'] !== 'examen') {
        denegar('intento de la actividad ' . (int) $ac['id']);
    }
    exigir_periodo_abierto($curso);
    $ahora = ahora();
    if (($ac['disponible_desde'] !== null && $ahora < $ac['disponible_desde']) || ($ac['disponible_hasta'] !== null && $ahora > $ac['disponible_hasta'])) {
        error_http(409, 'Este examen no está disponible en este momento.');
    }
    $alumno = (int) $u['alumno_id'];
    cerrar_vencidos((int) $ac['id'], $u);
    $abierto = fila('SELECT * FROM intento_examen WHERE actividad_id = ? AND alumno_id = ? AND estado = \'en_curso\'', [$ac['id'], $alumno]);
    if ($abierto !== null) {
        responder(200, intento_a_salida($abierto, $ac, 'alumno'));
    }
    $usados = (int) fila('SELECT COUNT(*) AS n FROM intento_examen WHERE actividad_id = ? AND alumno_id = ?', [$ac['id'], $alumno])['n'];
    if ($usados >= (int) $ac['intentos_permitidos']) {
        error_http(409, 'Ya usaste todos los intentos de este examen.');
    }
    if (preguntas_de((int) $ac['id'], false) === []) {
        error_http(409, 'Este examen todavía no tiene preguntas.');
    }
    $limite = $ac['tiempo_limite_min'] === null ? null : gmdate('Y-m-d H:i:s', time() + (int) $ac['tiempo_limite_min'] * 60);
    if ($ac['disponible_hasta'] !== null && ($limite === null || $ac['disponible_hasta'] < $limite)) {
        $limite = $ac['disponible_hasta'];
    }
    $id = insertar('intento_examen', ['actividad_id' => $ac['id'], 'alumno_id' => $alumno, 'numero' => $usados + 1, 'inicio' => $ahora, 'limite' => $limite, 'respuestas' => '{}']);
    registrar_bitacora('intento_examen', $id, 'iniciar', null, ['actividad_id' => (int) $ac['id'], 'numero' => $usados + 1]);
    responder(200, intento_a_salida(fila('SELECT * FROM intento_examen WHERE id = ?', [$id]), $ac, 'alumno'));
}

/** Respuestas válidas por pregunta: índice de opción, "v" o "f" y texto libre; lo demás se descarta. */
function respuestas_validas(array $nuevas, array $preguntas): array
{
    $salida = [];
    foreach ($preguntas as $p) {
        if (!array_key_exists((string) $p['id'], $nuevas)) {
            continue;
        }
        $v = $nuevas[(string) $p['id']];
        if ($p['tipo'] === 'abierta') {
            $salida[$p['id']] = mb_substr(is_string($v) ? $v : '', 0, 5000);
        } elseif ($p['tipo'] === 'vf') {
            $salida[$p['id']] = in_array($v, ['v', 'f'], true) ? $v : null;
        } else {
            $salida[$p['id']] = (is_int($v) || (is_string($v) && ctype_digit($v))) && (int) $v < count($p['opciones'] ?? []) ? (string) (int) $v : null;
        }
    }
    return array_filter($salida, static fn ($x): bool => $x !== null);
}

function ruta_guardar_respuestas(array $a): never
{
    $u = exigir_permiso('intento_examen', 'crear');
    [$i, , $modo] = intento_o_denegar($u, (int) $a['id']);
    if ($modo !== 'alumno') {
        denegar('respuestas de un intento');
    }
    $ac = actividad_o_404((int) $i['actividad_id']);
    if ($i['estado'] !== 'en_curso' || intento_vencido($i)) {
        if (intento_vencido($i)) {
            cerrar_intento($i, $i['limite']);
        }
        error_http(409, 'El tiempo del examen terminó: no se aceptan más respuestas. Se envió lo que tenías guardado.');
    }
    $nuevas = cuerpo_json()['respuestas'] ?? null;
    if (!is_array($nuevas)) {
        error_http(422, 'No llegaron respuestas.');
    }
    $merge = respuestas_validas($nuevas, preguntas_de((int) $i['actividad_id'], false)) + (json_decode($i['respuestas'], true) ?: []);
    ejecutar('UPDATE intento_examen SET respuestas = ? WHERE id = ? AND estado = \'en_curso\'', [json_encode((object) $merge, JSON_UNESCAPED_UNICODE), $i['id']]);
    responder(200, intento_a_salida(fila('SELECT * FROM intento_examen WHERE id = ?', [$i['id']]), $ac, 'alumno'));
}

function ruta_enviar_intento(array $a): never
{
    $u = exigir_permiso('intento_examen', 'crear');
    [$i, , $modo] = intento_o_denegar($u, (int) $a['id']);
    if ($modo !== 'alumno') {
        denegar('envío de un intento');
    }
    $ac = actividad_o_404((int) $i['actividad_id']);
    if ($i['estado'] === 'en_curso') {
        if (intento_vencido($i)) {
            // Lo que llegue después del límite no cuenta: se cierra con lo guardado.
            cerrar_intento($i, $i['limite']);
        } else {
            $nuevas = cuerpo_json()['respuestas'] ?? null;
            if (is_array($nuevas)) {
                $i['respuestas'] = json_encode((object) (respuestas_validas($nuevas, preguntas_de((int) $i['actividad_id'], false)) + (json_decode($i['respuestas'], true) ?: [])), JSON_UNESCAPED_UNICODE);
                ejecutar('UPDATE intento_examen SET respuestas = ? WHERE id = ?', [$i['respuestas'], $i['id']]);
            }
            cerrar_intento($i);
            $curso = cargar_asignacion((int) $ac['asignacion_id']);
            avisar((int) $curso['docente_id'], 'aula_entrega', "Examen enviado en {$curso['materia']}: {$ac['titulo']} ({$u['nombre']}).", "/cursos/{$curso['id']}/examenes", 'exa:' . $i['id']);
        }
    }
    registrar_bitacora('intento_examen', (int) $i['id'], 'enviar', null, ['actividad_id' => (int) $ac['id'], 'numero' => (int) $i['numero']]);
    responder(200, intento_a_salida(fila('SELECT * FROM intento_examen WHERE id = ?', [$i['id']]), $ac, 'alumno'));
}

function ruta_intento(array $a): never
{
    $u = exigir_permiso('intento_examen', 'ver');
    [$i, , $modo] = intento_o_denegar($u, (int) $a['id']);
    $ac = actividad_o_404((int) $i['actividad_id']);
    if (intento_vencido($i) && !($u['solo_lectura'] ?? false)) {
        cerrar_intento($i, $i['limite']);
        $i = fila('SELECT i.*, ac.asignacion_id FROM intento_examen i JOIN actividad ac ON ac.id = i.actividad_id WHERE i.id = ?', [$i['id']]);
    }
    responder(200, intento_a_salida($i, $ac, $modo));
}

function ruta_intentos_de_examen(array $a): never
{
    $u = exigir_permiso('intento_examen', 'ver');
    [$ac, , $modo] = actividad_visible($u, (int) $a['id']);
    if ($modo === 'alumno' || $ac['tipo'] !== 'examen') {
        denegar('intentos de la actividad ' . (int) $ac['id']);
    }
    cerrar_vencidos((int) $ac['id'], $u);
    $filas = filas(
        'SELECT i.id, i.numero, i.estado, i.inicio, i.envio, i.puntos_auto, i.puntos_finales, al.id AS alumno_id, al.identificador, al.nombre
         FROM intento_examen i JOIN alumno al ON al.id = i.alumno_id WHERE i.actividad_id = ? ORDER BY al.nombre, i.numero',
        [$ac['id']]
    );
    $con_abiertas = count(array_filter(preguntas_de((int) $ac['id'], false), static fn (array $p): bool => $p['tipo'] === 'abierta')) > 0;
    foreach ($filas as &$f) {
        $f['id'] = (int) $f['id'];
        $f['numero'] = (int) $f['numero'];
        $f['alumno_id'] = (int) $f['alumno_id'];
        $f['puntos_auto'] = (float) $f['puntos_auto'];
        $f['puntos_finales'] = $f['puntos_finales'] === null ? null : (float) $f['puntos_finales'];
        $f['por_calificar'] = $con_abiertas && $f['estado'] === 'enviado';
    }
    responder(200, ['actividad' => actividad_a_salida($ac, $modo), 'intentos' => $filas]);
}

function ruta_calificar_intento(array $a): never
{
    $u = exigir_permiso('intento_examen', 'modificar');
    [$i, $curso, $modo] = intento_o_denegar($u, (int) $a['id']);
    if ($modo !== 'docente') {
        denegar('calificar un intento');
    }
    exigir_periodo_abierto($curso);
    $ac = actividad_o_404((int) $i['actividad_id']);
    if (intento_vencido($i)) {
        cerrar_intento($i, $i['limite']);
        $i = fila('SELECT i.*, ac.asignacion_id FROM intento_examen i JOIN actividad ac ON ac.id = i.actividad_id WHERE i.id = ?', [$i['id']]);
    }
    if ($i['estado'] === 'en_curso') {
        error_http(409, 'El alumno todavía está contestando este intento.');
    }
    $d = cuerpo_json();
    $dadas = is_array($d['puntos_abiertas'] ?? null) ? $d['puntos_abiertas'] : [];
    $total = (float) $i['puntos_auto'];
    $guardadas = [];
    foreach (preguntas_de((int) $ac['id'], false) as $p) {
        if ($p['tipo'] !== 'abierta') {
            continue;
        }
        $v = $dadas[(string) $p['id']] ?? null;
        if ($v === null || $v === '') {
            error_http(422, 'Falta calificar una pregunta abierta.', ['puntos_abiertas' => 'Califica todas las preguntas abiertas.']);
        }
        $guardadas[$p['id']] = num([(string) $p['id'] => $v], (string) $p['id'], 'Los puntos', 0, $p['puntos']);
        $total += $guardadas[$p['id']];
    }
    $antes = $i['puntos_finales'] === null ? null : ['puntos' => (float) $i['puntos_finales']];
    ejecutar(
        'UPDATE intento_examen SET puntos_abiertas = ?, puntos_finales = ?, estado = \'calificado\', revisado_por = ? WHERE id = ?',
        [json_encode((object) $guardadas), round($total, 2), actor_real_id(), $i['id']]
    );
    calificacion_de_examen((int) $ac['id'], (int) $i['alumno_id'], actor_real_id());
    if (isset($d['comentario']) && is_string($d['comentario']) && trim($d['comentario']) !== '' && ($cal = ultima_calificacion((int) $ac['id'], (int) $i['alumno_id'])) !== null) {
        ejecutar('UPDATE calificacion_actividad SET comentario = ? WHERE id = ?', [mb_substr(trim($d['comentario']), 0, 5000), $cal['id']]);
    }
    registrar_bitacora('intento_examen', (int) $i['id'], 'calificar', $antes, ['puntos' => round($total, 2)]);
    responder(200, intento_a_salida(fila('SELECT * FROM intento_examen WHERE id = ?', [$i['id']]), $ac, 'docente'));
}

// --- Calificación por actividades (12.7) -------------------------------------------------------------

/** Actividades que cuentan para la calculada: publicadas, con categoría vigente y calificables. */
function actividades_que_cuentan(int $asignacion_id): array
{
    return filas(
        'SELECT ac.* FROM actividad ac JOIN categoria c ON c.id = ac.categoria_id AND c.archivada = 0
         WHERE ac.asignacion_id = ? AND ac.publicada = 1 AND ac.archivada = 0 AND (ac.tipo IN (\'tarea\', \'examen\') OR ac.calificable = 1)',
        [$asignacion_id]
    );
}

/**
 * Calificación calculada de 0 a 10 de un alumno: por categoría, puntos obtenidos entre puntos posibles de lo calificado
 * (una actividad vencida sin entrega cuenta cero; una entregada sin calificar no cuenta); luego promedio ponderado entre
 * las categorías que ya tienen algo. `solo_publicado` es la vista del alumno: solo lo que el docente ya publicó.
 */
function calculada_de(array $actividades, array $categorias, int $alumno_id, bool $solo_publicado): array
{
    $ahora = ahora();
    $por = [];
    foreach ($actividades as $ac) {
        $cal = ultima_calificacion((int) $ac['id'], $alumno_id);
        $limite = $ac['tipo'] === 'tarea' ? $ac['fecha_limite'] : ($ac['tipo'] === 'examen' ? $ac['disponible_hasta'] : null);
        if ($cal !== null && (!$solo_publicado || (int) $ac['calificaciones_publicadas'] === 1)) {
            $obtenidos = (float) $cal['puntos'];
        } elseif ($cal === null && $limite !== null && $ahora > $limite && !entregada($ac, $alumno_id)) {
            $obtenidos = 0.0;
        } else {
            continue;
        }
        $por[(int) $ac['categoria_id']][0] = ($por[(int) $ac['categoria_id']][0] ?? 0.0) + $obtenidos;
        $por[(int) $ac['categoria_id']][1] = ($por[(int) $ac['categoria_id']][1] ?? 0.0) + (float) $ac['puntos'];
    }
    $detalle = [];
    $suma = 0.0;
    $pesos = 0.0;
    foreach ($categorias as $c) {
        [$obt, $max] = $por[$c['id']] ?? [0.0, 0.0];
        $pct = $max > 0 ? $obt / $max : null;
        $detalle[] = ['id' => $c['id'], 'nombre' => $c['nombre'], 'peso' => $c['peso'], 'porcentaje' => $pct === null ? null : round($pct * 100, 1)];
        if ($pct !== null) {
            $suma += $c['peso'] * $pct;
            $pesos += $c['peso'];
        }
    }
    return ['valor' => $pesos > 0 ? round($suma / $pesos * 10, 1) : null, 'categorias' => $detalle];
}

function entregada(array $ac, int $alumno_id): bool
{
    $tabla = $ac['tipo'] === 'tarea' ? 'entrega_tarea' : 'intento_examen';
    return fila("SELECT id FROM $tabla WHERE actividad_id = ? AND alumno_id = ? LIMIT 1", [$ac['id'], $alumno_id]) !== null;
}

function ruta_calificaciones_curso(array $a): never
{
    $u = exigir_permiso('calificacion_actividad', 'ver');
    [$curso, $modo] = curso_o_denegar($u, (int) $a['id']);
    $cats = categorias_de((int) $curso['id']);
    $cuentan = actividades_que_cuentan((int) $curso['id']);
    $base = ['curso' => curso_resumen($curso, $modo), 'categorias' => $cats, 'leyenda' => 'Calculada con lo publicado, no es la calificación oficial. La oficial es la que acepta Coordinación.'];
    if ($modo === 'alumno') {
        $alumno = (int) $u['alumno_id'];
        $lista = [];
        foreach (filas('SELECT * FROM actividad WHERE asignacion_id = ? AND publicada = 1 AND archivada = 0 AND (tipo IN (\'tarea\', \'examen\') OR calificable = 1) ORDER BY COALESCE(fecha_limite, disponible_hasta, creado_en), id', [$curso['id']]) as $ac) {
            $mio = estado_del_alumno($ac, $alumno);
            $lista[] = ['id' => (int) $ac['id'], 'titulo' => $ac['titulo'], 'tipo' => $ac['tipo'], 'puntos_posibles' => (float) $ac['puntos'], 'estado' => $mio['estado'] ?? 'sin_entregar', 'calificacion' => $mio['calificacion']];
        }
        responder(200, $base + ['actividades' => $lista, 'calculada' => calculada_de($cuentan, $cats, $alumno, true)]);
    }
    $acts = filas('SELECT id, tipo, titulo, puntos, calificaciones_publicadas FROM actividad WHERE asignacion_id = ? AND publicada = 1 AND archivada = 0 AND (tipo IN (\'tarea\', \'examen\') OR calificable = 1) ORDER BY COALESCE(fecha_limite, disponible_hasta, creado_en), id', [$curso['id']]);
    $alumnos = [];
    foreach (lista_vigente((int) $curso['grupo_id']) as $al) {
        $celdas = [];
        foreach ($acts as $ac) {
            $cal = ultima_calificacion((int) $ac['id'], (int) $al['alumno_id']);
            $celdas[(string) $ac['id']] = $cal === null ? null : (float) $cal['puntos'];
        }
        $alumnos[] = ['alumno_id' => (int) $al['alumno_id'], 'identificador' => $al['identificador'], 'nombre' => $al['nombre'], 'celdas' => $celdas, 'calculada' => calculada_de($cuentan, $cats, (int) $al['alumno_id'], false)['valor']];
    }
    $acts = array_map(static fn (array $ac): array => ['id' => (int) $ac['id'], 'tipo' => $ac['tipo'], 'titulo' => $ac['titulo'], 'puntos' => (float) $ac['puntos'], 'publicadas' => (int) $ac['calificaciones_publicadas'] === 1], $acts);
    responder(200, $base + ['actividades' => $acts, 'alumnos' => $alumnos]);
}

/** Valores calculados de cada alumno del curso, para "Usar calificación calculada" (solo llena; no envía nada). */
function ruta_calculadas(array $a): never
{
    $u = exigir_permiso('calificacion_actividad', 'ver');
    [$curso, $modo] = curso_o_denegar($u, (int) $a['id']);
    if ($modo === 'alumno') {
        denegar('calculadas del curso');
    }
    $cats = categorias_de((int) $curso['id']);
    $cuentan = actividades_que_cuentan((int) $curso['id']);
    $filas = [];
    foreach (lista_vigente((int) $curso['grupo_id']) as $al) {
        $filas[] = ['alumno_id' => (int) $al['alumno_id'], 'valor' => calculada_de($cuentan, $cats, (int) $al['alumno_id'], false)['valor']];
    }
    responder(200, ['filas' => $filas, 'hay_actividades' => $cuentan !== []]);
}
