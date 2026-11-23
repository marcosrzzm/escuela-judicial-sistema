<?php

declare(strict_types=1);

function datos_de_sesion(array $u): array
{
    return [
        'id' => (int) $u['id'],
        'nombre' => $u['nombre'],
        'correo' => $u['correo'],
        'rol' => $u['rol'],
        'rol_nombre' => $u['rol_nombre'],
        'base' => $u['base'],
        'es_sistema' => $u['es_sistema'],
        'permisos' => $u['permisos'],
        'debe_cambiar_clave' => $u['debe_cambiar_clave'],
        'solo_lectura' => $u['solo_lectura'] ?? false,
        'actor_real' => $u['actor_real'] ?? null,
        'datos_ficticios' => DATOS_FICTICIOS,
    ];
}

/** Lo único que la pantalla de entrada necesita saber antes de que alguien inicie sesión. */
function ruta_ajustes_publicos(): never
{
    responder(200, ['datos_ficticios' => DATOS_FICTICIOS]);
}

function ruta_sesion(): never
{
    responder(200, datos_de_sesion(exigir_sesion()));
}

function ruta_login(): never
{
    $d = cuerpo_json();
    $correo = mb_strtolower(texto($d, 'correo', 160, 'El correo'));
    $clave = is_string($d['clave'] ?? null) ? $d['clave'] : '';
    if ($clave === '' || strlen($clave) > 200) {
        error_http(422, 'La contraseña es obligatoria.', ['clave' => 'La contraseña es obligatoria.']);
    }

    $intentos = fila('SELECT COUNT(*) AS n FROM intento_login WHERE correo = ? AND creado_en > (UTC_TIMESTAMP() - INTERVAL 15 MINUTE)', [$correo]);
    if ((int) $intentos['n'] >= 5) {
        error_http(429, 'Demasiados intentos con ese correo. Espera 15 minutos y vuelve a intentar.');
    }

    $u = fila('SELECT id, contrasena_hash FROM usuario WHERE correo = ? AND estado = \'activo\'', [$correo]);
    // Mismo mensaje y misma espera con correo inexistente que con contraseña mala.
    $hash = $u['contrasena_hash'] ?? '$2y$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz01234';
    $ok = password_verify($clave, $hash) && $u !== null && cargar_usuario((int) $u['id']) !== null;
    if (!$ok) {
        usleep(random_int(100000, 300000));
        insertar('intento_login', ['correo' => $correo]);
        error_http(401, 'Correo o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.');
    }
    if (password_needs_rehash($u['contrasena_hash'], PASSWORD_DEFAULT)) {
        ejecutar('UPDATE usuario SET contrasena_hash = ? WHERE id = ?', [password_hash($clave, PASSWORD_DEFAULT), $u['id']]);
    }
    ejecutar('DELETE FROM intento_login WHERE correo = ?', [$correo]);
    crear_sesion((int) $u['id']);
    registrar_bitacora('sesion', (int) $u['id'], 'inicio_sesion', null, null, null, (int) $u['id']);
    $u = cargar_usuario((int) $u['id']);
    $u['solo_lectura'] = false;
    $u['actor_real'] = null;
    responder(200, datos_de_sesion($u));
}

function ruta_logout(): never
{
    $u = exigir_sesion();
    if ($u['actor_real'] !== null) {
        registrar_bitacora('usuario', (int) $u['id'], 'ver_como_fin', null, ['cuenta' => $u['nombre'], 'rol' => $u['rol']], 'cierre de sesión');
    }
    cerrar_sesion();
    responder(200, ['ok' => true]);
}

/** Reglas de toda contraseña nueva: mínimo 10 caracteres y distinta del correo. */
function exigir_clave_valida(string $nueva, string $correo): void
{
    if (mb_strlen($nueva) < 10 || strlen($nueva) > 200) {
        error_http(422, 'La contraseña nueva necesita al menos 10 caracteres.', ['nueva' => 'Mínimo 10 caracteres.']);
    }
    if (mb_strtolower($nueva) === mb_strtolower($correo)) {
        error_http(422, 'La contraseña no puede ser igual a tu correo.', ['nueva' => 'No puede ser tu correo.']);
    }
}

/** Cambio de contraseña propio: actual, nueva y confirmación. Quita la marca de contraseña temporal. */
function ruta_mi_clave(): never
{
    $u = exigir_sesion();
    $d = cuerpo_json();
    $actual = is_string($d['actual'] ?? null) ? $d['actual'] : '';
    $nueva = is_string($d['nueva'] ?? null) ? $d['nueva'] : '';
    $confirmacion = is_string($d['confirmacion'] ?? null) ? $d['confirmacion'] : '';
    $guardado = fila('SELECT contrasena_hash FROM usuario WHERE id = ?', [$u['id']]);
    if ($actual === '' || !password_verify($actual, $guardado['contrasena_hash'])) {
        error_http(422, 'La contraseña actual no es correcta.', ['actual' => 'No es la contraseña actual.']);
    }
    exigir_clave_valida($nueva, $u['correo']);
    if ($nueva === $actual) {
        error_http(422, 'La contraseña nueva debe ser distinta de la actual.', ['nueva' => 'Debe ser distinta de la actual.']);
    }
    if ($nueva !== $confirmacion) {
        error_http(422, 'La confirmación no coincide con la contraseña nueva.', ['confirmacion' => 'No coincide.']);
    }
    ejecutar('UPDATE usuario SET contrasena_hash = ?, debe_cambiar_clave = 0 WHERE id = ?', [password_hash($nueva, PASSWORD_DEFAULT), $u['id']]);
    ejecutar('DELETE FROM sesion WHERE usuario_id = ? AND id <> ?', [$u['id'], $u['sesion_id']]);
    registrar_bitacora('usuario', (int) $u['id'], 'cambio_clave', null, null);
    $u['debe_cambiar_clave'] = false;
    responder(200, datos_de_sesion($u));
}

/** Coordinación (rol del sistema) mira el sistema como otra cuenta, solo lectura. */
function ruta_ver_como(array $a): never
{
    $u = exigir_admin('ver_como', 'ver');
    $id = (int) $a['id'];
    $visto = $id === (int) $u['id'] ? null : cargar_usuario($id);
    if ($visto === null) {
        error_http(409, 'Solo se puede ver como otra cuenta activa.');
    }
    ejecutar('UPDATE sesion SET viendo_como_id = ? WHERE id = ?', [$id, $u['sesion_id']]);
    registrar_bitacora('usuario', $id, 'ver_como_inicio', null, ['cuenta' => $visto['nombre'], 'rol' => $visto['rol']]);
    responder(200, ['ok' => true]);
}

function ruta_ver_como_salir(): never
{
    $u = exigir_sesion();
    if ($u['actor_real'] === null) {
        error_http(409, 'No estás viendo el sistema como otra cuenta.');
    }
    ejecutar('UPDATE sesion SET viendo_como_id = NULL WHERE id = ?', [$u['sesion_id']]);
    registrar_bitacora('usuario', (int) $u['id'], 'ver_como_fin', null, ['cuenta' => $u['nombre'], 'rol' => $u['rol']]);
    responder(200, ['ok' => true]);
}
