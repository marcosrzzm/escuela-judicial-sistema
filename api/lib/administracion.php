<?php

declare(strict_types=1);

/**
 * Administración y uso real (especificación, sección 10): usuarios, roles y catálogos.
 * Usuarios y roles son solo del rol del sistema coordinacion (exigir_admin); los catálogos
 * piden el permiso de cada recurso. Nada se borra y todo cambio va a la bitácora sin contraseñas.
 */

// --- Utilidades -----------------------------------------------------------------

function cerrar_sesiones_de(int $usuario_id): void
{
    ejecutar('DELETE FROM sesion WHERE usuario_id = ?', [$usuario_id]);
}

function fecha_valida(array $d, string $campo, string $etiqueta): string
{
    $v = texto($d, $campo, 10, $etiqueta);
    $f = DateTime::createFromFormat('!Y-m-d', $v);
    if ($f === false || $f->format('Y-m-d') !== $v) {
        error_http(422, "$etiqueta no es una fecha válida.", [$campo => 'Usa una fecha válida.']);
    }
    return $v;
}

function violacion_unica(PDOException $e): bool
{
    return $e->getCode() === '23000';
}

// --- Usuarios -------------------------------------------------------------------

function usuario_para_bitacora(array $u): array
{
    return ['nombre' => $u['nombre'], 'correo' => $u['correo'], 'rol' => $u['rol'], 'estado' => $u['estado']];
}

function ruta_usuarios(): never
{
    exigir_admin('usuario', 'ver');
    $donde = ['1 = 1'];
    $p = [];
    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $donde[] = '(u.nombre LIKE ? OR u.correo LIKE ?)';
        array_push($p, "%$q%", "%$q%");
    }
    foreach (['rol' => 'u.rol', 'estado' => 'u.estado'] as $param => $col) {
        if (isset($_GET[$param]) && $_GET[$param] !== '' && $_GET[$param] !== 'todos') {
            $donde[] = "$col = ?";
            $p[] = (string) $_GET[$param];
        }
    }
    $filas = filas(
        'SELECT u.id, u.nombre, u.correo, u.rol, r.nombre AS rol_nombre, r.base, u.estado, u.debe_cambiar_clave
         FROM usuario u JOIN rol r ON r.clave = u.rol WHERE ' . implode(' AND ', $donde) . ' ORDER BY u.estado, u.nombre',
        $p
    );
    foreach ($filas as &$f) {
        $f['debe_cambiar_clave'] = (int) $f['debe_cambiar_clave'] === 1;
        $f['grupo_ids'] = $f['base'] === 'auxiliar'
            ? array_map('intval', array_column(filas('SELECT grupo_id FROM asignacion_auxiliar WHERE usuario_id = ? ORDER BY grupo_id', [$f['id']]), 'grupo_id'))
            : [];
    }
    responder(200, ['filas' => $filas]);
}

function rol_activo_o_422(string $clave): array
{
    $r = fila('SELECT clave, base FROM rol WHERE clave = ? AND estado = \'activo\'', [$clave]);
    if ($r === null) {
        error_http(422, 'Elige un rol activo de la lista.', ['rol' => 'Elige un rol activo.']);
    }
    return $r;
}

function correo_valido(array $d): string
{
    $correo = mb_strtolower(texto($d, 'correo', 160, 'El correo'));
    if (filter_var($correo, FILTER_VALIDATE_EMAIL) === false) {
        error_http(422, 'El correo no tiene un formato válido.', ['correo' => 'Escribe un correo válido.']);
    }
    return $correo;
}

function ruta_crear_usuario(): never
{
    $admin = exigir_admin('usuario', 'crear');
    $d = cuerpo_json();
    $nombre = texto($d, 'nombre', 120, 'El nombre');
    $correo = correo_valido($d);
    $rol = rol_activo_o_422(texto($d, 'rol', 20, 'El rol'));
    $invitar = ($d['invitar'] ?? false) === true;
    if (fila('SELECT id FROM usuario WHERE correo = ?', [$correo]) !== null) {
        error_http(422, 'Ya existe una cuenta con ese correo.', ['correo' => 'Ese correo ya tiene cuenta.']);
    }
    $clave = clave_temporal();
    $id = insertar('usuario', [
        'nombre' => $nombre, 'correo' => $correo, 'contrasena_hash' => password_hash($clave, PASSWORD_DEFAULT),
        'rol' => $rol['clave'], 'debe_cambiar_clave' => 1,
    ]);
    registrar_bitacora('usuario', $id, 'alta', null, ['nombre' => $nombre, 'correo' => $correo, 'rol' => $rol['clave'], 'estado' => 'activo', 'debe_cambiar_clave' => true]);
    if ($invitar) {
        // Con la invitación la persona crea su contraseña; la temporal solo sale si el correo no pudo salir.
        $enviado = mandar_enlace('invitacion', ['id' => $id, 'correo' => $correo], $admin, 'invitacion_enviada');
        responder(200, ['id' => $id, 'correo_enviado' => $enviado] + ($enviado ? [] : ['clave_temporal' => $clave]));
    }
    // La contraseña temporal sale solo en esta respuesta; en ningún lado queda en claro.
    responder(200, ['id' => $id, 'clave_temporal' => $clave]);
}

function ruta_editar_usuario(array $a): never
{
    exigir_admin('usuario', 'modificar');
    $id = (int) $a['id'];
    $d = cuerpo_json();
    $nombre = texto($d, 'nombre', 120, 'El nombre');
    $correo = correo_valido($d);
    $rol = rol_activo_o_422(texto($d, 'rol', 20, 'El rol'));
    $estado = una_de($d, 'estado', ['activo', 'inactivo'], 'El estado');

    transaccion(function () use ($id, $nombre, $correo, $rol, $estado): void {
        $antes = fila('SELECT id, nombre, correo, rol, estado FROM usuario WHERE id = ? FOR UPDATE', [$id]);
        if ($antes === null) {
            error_http(404, 'Esa cuenta ya no existe.');
        }
        $otra = fila('SELECT id FROM usuario WHERE correo = ? AND id <> ?', [$correo, $id]);
        if ($otra !== null) {
            error_http(422, 'Ya existe otra cuenta con ese correo.', ['correo' => 'Ese correo ya tiene cuenta.']);
        }
        $deja_coordinacion = $antes['rol'] === 'coordinacion' && $antes['estado'] === 'activo' && ($estado !== 'activo' || $rol['clave'] !== 'coordinacion');
        if ($deja_coordinacion) {
            $otras = fila('SELECT COUNT(*) AS n FROM usuario WHERE rol = \'coordinacion\' AND estado = \'activo\' AND id <> ? FOR UPDATE', [$id]);
            if ((int) $otras['n'] === 0) {
                error_http(409, 'Es la última cuenta activa de Coordinación: no se puede inactivar ni cambiar de rol. Crea o activa otra primero.');
            }
        }
        ejecutar('UPDATE usuario SET nombre = ?, correo = ?, rol = ?, estado = ? WHERE id = ?', [$nombre, $correo, $rol['clave'], $estado, $id]);
        $despues = ['nombre' => $nombre, 'correo' => $correo, 'rol' => $rol['clave'], 'estado' => $estado];
        registrar_bitacora('usuario', $id, 'modificar', usuario_para_bitacora($antes), $despues);
        if ($antes['rol'] !== $rol['clave'] || $estado !== 'activo') {
            cerrar_sesiones_de($id);
        }
    });
    responder(200, ['id' => $id]);
}

function ruta_clave_temporal(array $a): never
{
    $admin = exigir_admin('usuario', 'modificar');
    $id = (int) $a['id'];
    $u = fila('SELECT id, nombre FROM usuario WHERE id = ?', [$id]);
    if ($u === null) {
        error_http(404, 'Esa cuenta ya no existe.');
    }
    if ($id === (int) $admin['id']) {
        error_http(409, 'Tu propia contraseña se cambia en Mi contraseña.');
    }
    $clave = clave_temporal();
    ejecutar('UPDATE usuario SET contrasena_hash = ?, debe_cambiar_clave = 1 WHERE id = ?', [password_hash($clave, PASSWORD_DEFAULT), $id]);
    cerrar_sesiones_de($id);
    registrar_bitacora('usuario', $id, 'restablecer_clave', null, ['debe_cambiar_clave' => true]);
    responder(200, ['id' => $id, 'clave_temporal' => $clave]);
}

function ruta_grupos_auxiliar(array $a): never
{
    exigir_admin('usuario', 'modificar');
    $id = (int) $a['id'];
    $u = fila('SELECT u.id, u.nombre, r.base FROM usuario u JOIN rol r ON r.clave = u.rol WHERE u.id = ?', [$id]);
    if ($u === null) {
        error_http(404, 'Esa cuenta ya no existe.');
    }
    if ($u['base'] !== 'auxiliar') {
        error_http(422, 'Solo las cuentas con rol base Auxiliar tienen grupos asignados.');
    }
    $d = cuerpo_json();
    $nuevos = is_array($d['grupo_ids'] ?? null) ? array_values(array_unique(array_map('intval', $d['grupo_ids']))) : null;
    if ($nuevos === null) {
        error_http(422, 'Elige los grupos de la lista.', ['grupo_ids' => 'Elige los grupos.']);
    }
    foreach ($nuevos as $g) {
        if (fila('SELECT id FROM grupo WHERE id = ?', [$g]) === null) {
            error_http(422, 'Uno de los grupos ya no existe.', ['grupo_ids' => 'Un grupo no existe.']);
        }
    }
    transaccion(function () use ($id, $nuevos): void {
        $antes = array_map('intval', array_column(filas('SELECT grupo_id FROM asignacion_auxiliar WHERE usuario_id = ? ORDER BY grupo_id', [$id]), 'grupo_id'));
        ejecutar('DELETE FROM asignacion_auxiliar WHERE usuario_id = ?', [$id]);
        foreach ($nuevos as $g) {
            insertar('asignacion_auxiliar', ['usuario_id' => $id, 'grupo_id' => $g]);
        }
        sort($nuevos);
        registrar_bitacora('usuario', $id, 'grupos_auxiliar', ['grupos' => $antes], ['grupos' => $nuevos]);
    });
    responder(200, ['id' => $id]);
}

// --- Roles ----------------------------------------------------------------------

function ruta_roles(): never
{
    exigir_admin('rol', 'ver');
    $filas = filas(
        'SELECT r.id, r.clave, r.nombre, r.base, r.permisos, r.es_sistema, r.estado,
                (SELECT COUNT(*) FROM usuario u WHERE u.rol = r.clave AND u.estado = \'activo\') AS usuarios_activos
         FROM rol r ORDER BY r.es_sistema DESC, r.nombre'
    );
    foreach ($filas as &$f) {
        $f['es_sistema'] = (int) $f['es_sistema'] === 1;
        $f['usuarios_activos'] = (int) $f['usuarios_activos'];
        $f['permisos'] = permisos_de_rol($f['base'], $f['es_sistema'], $f['permisos']);
    }
    $techos = [];
    foreach (array_keys(MATRIZ_PERMISOS) as $base) {
        $techos[$base] = techo_de_base($base);
    }
    responder(200, ['filas' => $filas, 'techos' => $techos]);
}

/** Cada permiso debe existir en el rol base y no estar prohibido para roles personalizados. */
function permisos_validos(string $base, mixed $lista): array
{
    if (!is_array($lista)) {
        error_http(422, 'Marca los permisos del rol.', ['permisos' => 'Marca los permisos.']);
    }
    $techo = techo_de_base($base);
    foreach ($lista as $permiso) {
        if (!is_string($permiso) || !in_array($permiso, $techo, true)) {
            error_http(422, 'Hay un permiso que el rol base no tiene o que un rol personalizado no puede tener.', ['permisos' => 'Un permiso no es válido para este rol base.']);
        }
    }
    $lista = array_values(array_unique($lista));
    sort($lista);
    return $lista;
}

function ruta_crear_rol(): never
{
    $admin = exigir_admin('rol', 'crear');
    $d = cuerpo_json();
    $nombre = texto($d, 'nombre', 80, 'El nombre');
    $base = una_de($d, 'base', array_keys(MATRIZ_PERMISOS), 'El rol base');
    $permisos = permisos_validos($base, $d['permisos'] ?? null);
    if (fila('SELECT id FROM rol WHERE LOWER(nombre) = ?', [mb_strtolower($nombre)]) !== null) {
        error_http(422, 'Ya existe un rol con ese nombre.', ['nombre' => 'Ese nombre ya existe.']);
    }
    $clave = 'rol_' . bin2hex(random_bytes(4));
    $id = insertar('rol', [
        'clave' => $clave, 'nombre' => $nombre, 'base' => $base, 'permisos' => json_encode($permisos),
        'es_sistema' => 0, 'creado_por' => $admin['id'],
    ]);
    registrar_bitacora('rol', $id, 'alta', null, ['nombre' => $nombre, 'base' => $base, 'permisos' => $permisos, 'estado' => 'activo']);
    responder(200, ['id' => $id, 'clave' => $clave]);
}

function ruta_editar_rol(array $a): never
{
    exigir_admin('rol', 'modificar');
    $id = (int) $a['id'];
    $d = cuerpo_json();
    $nombre = texto($d, 'nombre', 80, 'El nombre');
    $estado = una_de($d, 'estado', ['activo', 'inactivo'], 'El estado');
    $rol = fila('SELECT id, clave, nombre, base, permisos, es_sistema, estado FROM rol WHERE id = ?', [$id]);
    if ($rol === null) {
        error_http(404, 'Ese rol ya no existe.');
    }
    if ((int) $rol['es_sistema'] === 1) {
        error_http(409, 'Los roles del sistema no se editan: su definición vive en el código.');
    }
    $permisos = permisos_validos($rol['base'], $d['permisos'] ?? null);
    if (fila('SELECT id FROM rol WHERE LOWER(nombre) = ? AND id <> ?', [mb_strtolower($nombre), $id]) !== null) {
        error_http(422, 'Ya existe otro rol con ese nombre.', ['nombre' => 'Ese nombre ya existe.']);
    }
    if ($estado === 'inactivo' && (int) fila('SELECT COUNT(*) AS n FROM usuario WHERE rol = ? AND estado = \'activo\'', [$rol['clave']])['n'] > 0) {
        error_http(409, 'Ese rol todavía tiene cuentas activas. Cámbiales el rol antes de inactivarlo.');
    }
    $antes = permisos_de_rol($rol['base'], false, $rol['permisos']);
    transaccion(function () use ($id, $rol, $nombre, $estado, $permisos, $antes): void {
        ejecutar('UPDATE rol SET nombre = ?, permisos = ?, estado = ? WHERE id = ?', [$nombre, json_encode($permisos), $estado, $id]);
        registrar_bitacora('rol', $id, 'modificar', ['nombre' => $rol['nombre'], 'permisos' => $antes, 'estado' => $rol['estado']], ['nombre' => $nombre, 'permisos' => $permisos, 'estado' => $estado]);
        if ($antes !== $permisos) {
            ejecutar('DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE rol = ?)', [$rol['clave']]);
        }
    });
    responder(200, ['id' => $id]);
}

// --- Catálogos ------------------------------------------------------------------

function ruta_materias(): never
{
    exigir_permiso('materia', 'ver');
    responder(200, ['filas' => filas('SELECT id, clave, nombre FROM materia ORDER BY nombre')]);
}

function materia_de_cuerpo(array $d): array
{
    $clave = texto($d, 'clave', 20, 'La clave');
    if (preg_match('/^[A-Za-z0-9-]{1,20}$/', $clave) !== 1) {
        error_http(422, 'La clave solo admite letras, números y guiones.', ['clave' => 'Solo letras, números y guiones.']);
    }
    return [$clave, texto($d, 'nombre', 120, 'El nombre')];
}

function ruta_crear_materia(): never
{
    exigir_permiso('materia', 'crear');
    [$clave, $nombre] = materia_de_cuerpo(cuerpo_json());
    if (fila('SELECT id FROM materia WHERE clave = ?', [$clave]) !== null) {
        error_http(422, "Ya existe una materia con la clave $clave.", ['clave' => 'Esa clave ya existe.']);
    }
    $id = insertar('materia', ['clave' => $clave, 'nombre' => $nombre]);
    registrar_bitacora('materia', $id, 'alta', null, ['clave' => $clave, 'nombre' => $nombre]);
    responder(200, ['id' => $id]);
}

function ruta_editar_materia(array $a): never
{
    exigir_permiso('materia', 'modificar');
    $id = (int) $a['id'];
    $antes = fila('SELECT clave, nombre FROM materia WHERE id = ?', [$id]);
    if ($antes === null) {
        error_http(404, 'Esa materia ya no existe.');
    }
    [$clave, $nombre] = materia_de_cuerpo(cuerpo_json());
    if (fila('SELECT id FROM materia WHERE clave = ? AND id <> ?', [$clave, $id]) !== null) {
        error_http(422, "Ya existe otra materia con la clave $clave.", ['clave' => 'Esa clave ya existe.']);
    }
    ejecutar('UPDATE materia SET clave = ?, nombre = ? WHERE id = ?', [$clave, $nombre, $id]);
    registrar_bitacora('materia', $id, 'modificar', $antes, ['clave' => $clave, 'nombre' => $nombre]);
    responder(200, ['id' => $id]);
}

function ruta_crear_periodo(): never
{
    exigir_permiso('periodo', 'crear');
    $d = cuerpo_json();
    $nombre = texto($d, 'nombre', 20, 'El nombre');
    $ini = fecha_valida($d, 'fecha_inicio', 'La fecha de inicio');
    $fin = fecha_valida($d, 'fecha_fin', 'La fecha de fin');
    if ($fin < $ini) {
        error_http(422, 'La fecha de fin no puede ser anterior a la de inicio.', ['fecha_fin' => 'Debe ser posterior al inicio.']);
    }
    if (fila('SELECT id FROM periodo WHERE nombre = ?', [$nombre]) !== null) {
        error_http(422, "Ya existe el periodo $nombre.", ['nombre' => 'Ese periodo ya existe.']);
    }
    $id = insertar('periodo', ['nombre' => $nombre, 'fecha_inicio' => $ini, 'fecha_fin' => $fin, 'estado' => 'abierto']);
    registrar_bitacora('periodo', $id, 'alta', null, ['nombre' => $nombre, 'fecha_inicio' => $ini, 'fecha_fin' => $fin, 'estado' => 'abierto']);
    responder(200, ['id' => $id]);
}

function ruta_editar_periodo(array $a): never
{
    exigir_permiso('periodo', 'modificar');
    $id = (int) $a['id'];
    $antes = fila('SELECT nombre, estado FROM periodo WHERE id = ?', [$id]);
    if ($antes === null) {
        error_http(404, 'Ese periodo ya no existe.');
    }
    $estado = una_de(cuerpo_json(), 'estado', ['abierto', 'cerrado'], 'El estado');
    ejecutar('UPDATE periodo SET estado = ? WHERE id = ?', [$estado, $id]);
    registrar_bitacora('periodo', $id, 'cambiar_estado', ['nombre' => $antes['nombre'], 'estado' => $antes['estado']], ['nombre' => $antes['nombre'], 'estado' => $estado]);
    responder(200, ['id' => $id]);
}

function grupo_de_cuerpo(array $d): array
{
    $periodo = fila('SELECT id, nombre FROM periodo WHERE id = ?', [entero($d, 'periodo_id', 'El periodo')]);
    if ($periodo === null) {
        error_http(422, 'Elige un periodo de la lista.', ['periodo_id' => 'Elige un periodo.']);
    }
    return [$periodo, texto($d, 'clave', 20, 'La clave'), texto($d, 'programa', 120, 'El programa'), texto($d, 'turno', 20, 'El turno')];
}

function ruta_crear_grupo(): never
{
    exigir_permiso('grupo', 'crear');
    [$periodo, $clave, $programa, $turno] = grupo_de_cuerpo(cuerpo_json());
    if (fila('SELECT id FROM grupo WHERE periodo_id = ? AND clave = ?', [$periodo['id'], $clave]) !== null) {
        error_http(422, "Ya existe el grupo $clave en el periodo {$periodo['nombre']}.", ['clave' => 'Esa clave ya existe en el periodo.']);
    }
    $id = insertar('grupo', ['periodo_id' => $periodo['id'], 'clave' => $clave, 'programa' => $programa, 'turno' => $turno, 'estado' => 'activo']);
    registrar_bitacora('grupo', $id, 'alta', null, ['periodo' => $periodo['nombre'], 'clave' => $clave, 'programa' => $programa, 'turno' => $turno, 'estado' => 'activo']);
    responder(200, ['id' => $id]);
}

function ruta_editar_grupo(array $a): never
{
    exigir_permiso('grupo', 'modificar');
    $id = (int) $a['id'];
    $antes = fila('SELECT g.periodo_id, p.nombre AS periodo, g.clave, g.programa, g.turno, g.estado FROM grupo g JOIN periodo p ON p.id = g.periodo_id WHERE g.id = ?', [$id]);
    if ($antes === null) {
        error_http(404, 'Ese grupo ya no existe.');
    }
    $d = cuerpo_json();
    [$periodo, $clave, $programa, $turno] = grupo_de_cuerpo($d);
    $estado = una_de($d, 'estado', ['activo', 'cerrado'], 'El estado');
    if (fila('SELECT id FROM grupo WHERE periodo_id = ? AND clave = ? AND id <> ?', [$periodo['id'], $clave, $id]) !== null) {
        error_http(422, "Ya existe el grupo $clave en el periodo {$periodo['nombre']}.", ['clave' => 'Esa clave ya existe en el periodo.']);
    }
    if ((int) $periodo['id'] !== (int) $antes['periodo_id']) {
        $usado = fila('SELECT (SELECT COUNT(*) FROM inscripcion_grupo WHERE grupo_id = ?) + (SELECT COUNT(*) FROM asignacion_docente WHERE grupo_id = ?) AS n', [$id, $id]);
        if ((int) $usado['n'] > 0) {
            error_http(409, 'El grupo ya tiene lista o asignaciones: no se le cambia el periodo. Crea un grupo nuevo en el otro periodo.');
        }
    }
    ejecutar('UPDATE grupo SET periodo_id = ?, clave = ?, programa = ?, turno = ?, estado = ? WHERE id = ?', [$periodo['id'], $clave, $programa, $turno, $estado, $id]);
    registrar_bitacora(
        'grupo', $id, 'modificar',
        ['periodo' => $antes['periodo'], 'clave' => $antes['clave'], 'programa' => $antes['programa'], 'turno' => $antes['turno'], 'estado' => $antes['estado']],
        ['periodo' => $periodo['nombre'], 'clave' => $clave, 'programa' => $programa, 'turno' => $turno, 'estado' => $estado]
    );
    responder(200, ['id' => $id]);
}

function ruta_docentes(): never
{
    $u = exigir_sesion();
    if (!tiene_permiso($u, 'asignacion_docente', 'crear') && !tiene_permiso($u, 'asignacion_docente', 'modificar')) {
        denegar('(asignacion_docente:crear o modificar)');
    }
    responder(200, ['filas' => filas(
        'SELECT u.id, u.nombre FROM usuario u JOIN rol r ON r.clave = u.rol AND r.base = \'docente\' AND r.estado = \'activo\'
         WHERE u.estado = \'activo\' ORDER BY u.nombre'
    )]);
}

function docente_valido(array $d): array
{
    $doc = fila(
        'SELECT u.id, u.nombre FROM usuario u JOIN rol r ON r.clave = u.rol AND r.base = \'docente\' AND r.estado = \'activo\'
         WHERE u.id = ? AND u.estado = \'activo\'',
        [entero($d, 'docente_id', 'El docente')]
    );
    if ($doc === null) {
        error_http(422, 'El docente debe ser una cuenta activa con rol base Docente.', ['docente_id' => 'Elige un docente activo.']);
    }
    return $doc;
}

/** Las asignaciones solo se crean o se cambian en un grupo activo de un periodo abierto. */
function exigir_grupo_abierto(int $grupo_id): void
{
    $g = fila('SELECT g.clave, g.estado, p.nombre AS periodo, p.estado AS periodo_estado FROM grupo g JOIN periodo p ON p.id = g.periodo_id WHERE g.id = ?', [$grupo_id]);
    if ($g !== null && ($g['periodo_estado'] === 'cerrado' || $g['estado'] !== 'activo')) {
        error_http(409, "El grupo {$g['clave']} del periodo {$g['periodo']} está cerrado: sus asignaciones ya no se modifican.");
    }
}

function ruta_crear_asignacion(): never
{
    exigir_permiso('asignacion_docente', 'crear');
    $d = cuerpo_json();
    $g = fila('SELECT g.id, g.clave, p.nombre AS periodo FROM grupo g JOIN periodo p ON p.id = g.periodo_id WHERE g.id = ?', [entero($d, 'grupo_id', 'El grupo')]);
    $m = fila('SELECT id, nombre FROM materia WHERE id = ?', [entero($d, 'materia_id', 'La materia')]);
    if ($g === null || $m === null) {
        error_http(422, 'Elige un grupo y una materia de la lista.');
    }
    $doc = docente_valido($d);
    exigir_grupo_abierto((int) $g['id']);
    try {
        $id = insertar('asignacion_docente', ['grupo_id' => $g['id'], 'materia_id' => $m['id'], 'docente_id' => $doc['id']]);
    } catch (PDOException $e) {
        if (violacion_unica($e)) {
            error_http(409, "El grupo {$g['clave']} ya tiene asignada la materia {$m['nombre']}. Cambia su docente en lugar de crear otra.");
        }
        throw $e;
    }
    registrar_bitacora('asignacion_docente', $id, 'alta', null, ['grupo' => $g['clave'], 'periodo' => $g['periodo'], 'materia' => $m['nombre'], 'docente' => $doc['nombre']]);
    responder(200, ['id' => $id]);
}

function ruta_cambiar_docente(array $a): never
{
    exigir_permiso('asignacion_docente', 'modificar');
    $asig = cargar_asignacion((int) $a['id']);
    if ($asig === null) {
        error_http(404, 'Esa asignación ya no existe.');
    }
    $d = cuerpo_json();
    $doc = docente_valido($d);
    exigir_grupo_abierto((int) $asig['grupo_id']);
    $motivo = texto($d, 'motivo', 500, 'El motivo');
    if ((int) $doc['id'] === (int) $asig['docente_id']) {
        error_http(422, "{$doc['nombre']} ya es el docente de esta asignación.", ['docente_id' => 'Elige a otro docente.']);
    }
    ejecutar('UPDATE asignacion_docente SET docente_id = ? WHERE id = ?', [$doc['id'], $asig['id']]);
    registrar_bitacora('asignacion_docente', (int) $asig['id'], 'cambiar_docente', ['docente' => $asig['docente']], ['docente' => $doc['nombre']], $motivo);
    responder(200, ['id' => (int) $asig['id']]);
}

function ruta_editar_alumno(array $a): never
{
    exigir_permiso('alumno', 'modificar');
    $id = (int) $a['id'];
    $antes = fila('SELECT identificador, nombre, estatus FROM alumno WHERE id = ?', [$id]);
    if ($antes === null) {
        error_http(404, 'Ese alumno ya no existe.');
    }
    $d = cuerpo_json();
    $ident = texto($d, 'identificador', 30, 'La matrícula');
    if (preg_match('/^[A-Za-z0-9-]{3,30}$/', $ident) !== 1) {
        error_http(422, 'La matrícula solo admite letras, números y guiones.', ['identificador' => 'Solo letras, números y guiones.']);
    }
    $nombre = texto($d, 'nombre', 120, 'El nombre');
    $estatus = una_de($d, 'estatus', ['activo', 'baja', 'egresado'], 'El estatus');
    $motivo = texto($d, 'motivo', 500, 'El motivo');
    if (fila('SELECT id FROM alumno WHERE identificador = ? AND id <> ?', [$ident, $id]) !== null) {
        error_http(422, "Ya existe otro alumno con la matrícula $ident.", ['identificador' => 'Esa matrícula ya existe.']);
    }
    $despues = ['identificador' => $ident, 'nombre' => $nombre, 'estatus' => $estatus];
    if ($despues === $antes) {
        error_http(422, 'No cambiaste ningún dato del alumno.');
    }
    ejecutar('UPDATE alumno SET identificador = ?, nombre = ?, estatus = ? WHERE id = ?', [$ident, $nombre, $estatus, $id]);
    registrar_bitacora('alumno', $id, 'modificar', $antes, $despues, $motivo);
    responder(200, ['id' => $id]);
}

// --- Importar lista (CSV) -------------------------------------------------------

const MAX_FILAS_IMPORTAR = 500;

/** Filas [linea, matricula, nombre] del texto del CSV; falla entero si el archivo no se puede leer. */
function leer_csv_alumnos(string $texto): array
{
    $texto = (string) preg_replace('/^\xEF\xBB\xBF/', '', $texto);
    if ($texto === '' || !mb_check_encoding($texto, 'UTF-8') || str_contains($texto, "\0") || str_contains($texto, "\u{FFFD}")) {
        error_http(422, 'No pude leer el archivo. Guárdalo como CSV en UTF-8 con las columnas matrícula y nombre.', ['texto' => 'Archivo no legible.']);
    }
    $filas = [];
    $sep = null;
    foreach (preg_split('/\r\n|\n|\r/', $texto) ?: [] as $i => $linea) {
        if (trim($linea) === '') {
            continue;
        }
        // El separador se decide una sola vez, con la primera línea.
        $sep ??= substr_count($linea, ';') > substr_count($linea, ',') ? ';' : ',';
        $c = str_getcsv($linea, $sep, '"', '');
        $filas[] = ['linea' => $i + 1, 'matricula' => trim((string) ($c[0] ?? '')), 'nombre' => trim((string) ($c[1] ?? ''))];
    }
    $primera = mb_strtolower(strtr($filas[0]['matricula'] ?? '', ['í' => 'i', 'Í' => 'i']));
    if (in_array($primera, ['matricula', 'identificador'], true)) {
        array_shift($filas);
    }
    if ($filas === []) {
        error_http(422, 'El archivo no trae ninguna fila con alumnos.', ['texto' => 'Archivo vacío.']);
    }
    if (count($filas) > MAX_FILAS_IMPORTAR) {
        error_http(422, 'El archivo trae más de ' . MAX_FILAS_IMPORTAR . ' filas. Divídelo en partes más chicas.', ['texto' => 'Máximo ' . MAX_FILAS_IMPORTAR . ' filas.']);
    }
    return $filas;
}

function ruta_importar_lista(array $a): never
{
    exigir_permiso('inscripcion_grupo', 'crear');
    exigir_permiso('alumno', 'crear');
    $g = grupo_editable((int) $a['id']);
    $d = cuerpo_json();
    $texto = is_string($d['texto'] ?? null) ? $d['texto'] : '';
    if (strlen($texto) > 1_000_000) {
        error_http(422, 'El archivo pesa más de 1 MB. Divídelo en partes más chicas.', ['texto' => 'Archivo demasiado grande.']);
    }
    $filas = leer_csv_alumnos($texto);

    $resumen = transaccion(function () use ($filas, $g): array {
        $creadas = 0;
        $inscritas = 0;
        $rechazadas = [];
        $vistas = [];
        $rechazar = function (array $f, string $razon) use (&$rechazadas): void {
            $rechazadas[] = ['fila' => $f['linea'], 'matricula' => $f['matricula'], 'razon' => $razon];
        };
        foreach ($filas as $f) {
            $m = $f['matricula'];
            if ($m === '') {
                $rechazar($f, 'La matrícula está vacía.');
            } elseif (preg_match('/^[A-Za-z0-9-]{3,30}$/', $m) !== 1) {
                $rechazar($f, 'La matrícula debe tener de 3 a 30 letras, números o guiones.');
            } elseif ($f['nombre'] === '' || mb_strlen($f['nombre']) > 120) {
                $rechazar($f, 'El nombre está vacío o pasa de 120 caracteres.');
            } elseif (isset($vistas[mb_strtolower($m)])) {
                $rechazar($f, 'Repetida en el archivo: un alumno no puede estar dos veces en el mismo grupo (RN-01).');
            } else {
                $vistas[mb_strtolower($m)] = true;
                $alumno = fila('SELECT id, identificador, nombre, estatus FROM alumno WHERE identificador = ?', [$m]);
                if ($alumno !== null && mb_strtolower(trim($alumno['nombre'])) !== mb_strtolower($f['nombre'])) {
                    $rechazar($f, "La matrícula $m ya es de {$alumno['nombre']}. Corrígela en Historial del alumno o usa otra matrícula.");
                    continue;
                }
                if ($alumno !== null && $alumno['estatus'] !== 'activo') {
                    $rechazar($f, 'El alumno está de baja o egresado: no se inscribe desde una importación.');
                    continue;
                }
                if ($alumno === null) {
                    $alumno = ['id' => insertar('alumno', ['identificador' => $m, 'nombre' => $f['nombre']]), 'identificador' => $m, 'nombre' => $f['nombre']];
                    registrar_bitacora('alumno', (int) $alumno['id'], 'alta', null, $alumno, 'Importación de lista');
                    $creadas++;
                } elseif (fila('SELECT id FROM inscripcion_grupo WHERE alumno_id = ? AND grupo_id = ? AND estado = \'activa\'', [$alumno['id'], $g['id']]) !== null) {
                    $rechazar($f, 'Ya tiene una inscripción activa en este grupo (RN-01).');
                    continue;
                }
                $iid = insertar('inscripcion_grupo', ['alumno_id' => $alumno['id'], 'grupo_id' => $g['id'], 'estado' => 'activa', 'fecha_alta' => gmdate('Y-m-d'), 'observacion' => 'Importación de lista']);
                registrar_bitacora('inscripcion_grupo', $iid, 'alta', null, ['alumno' => $alumno['identificador'], 'grupo' => $g['clave'], 'periodo' => $g['periodo'], 'estado' => 'activa'], 'Importación de lista');
                $inscritas++;
            }
        }
        registrar_bitacora('grupo', (int) $g['id'], 'importar_lista', null, ['filas' => count($filas), 'creadas' => $creadas, 'inscritas' => $inscritas, 'rechazadas' => count($rechazadas)]);
        return ['creadas' => $creadas, 'inscritas' => $inscritas, 'rechazadas' => $rechazadas];
    });
    responder(200, $resumen);
}
