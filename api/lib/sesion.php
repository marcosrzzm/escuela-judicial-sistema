<?php

declare(strict_types=1);

function datos_de_sesion(array $u): array
{
    return [
        'id' => (int) $u['id'],
        'nombre' => $u['nombre'],
        'correo' => $u['correo'],
        'rol' => $u['rol'],
        'permisos' => permisos_del_rol($u['rol']),
    ];
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

    $u = fila('SELECT id, nombre, correo, rol, contrasena_hash FROM usuario WHERE correo = ? AND estado = \'activo\'', [$correo]);
    // Mismo mensaje y misma espera con correo inexistente que con contraseña mala.
    $hash = $u['contrasena_hash'] ?? '$2y$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz01234';
    $ok = password_verify($clave, $hash) && $u !== null;
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
    responder(200, datos_de_sesion($u));
}

function ruta_logout(): never
{
    cerrar_sesion();
    responder(200, ['ok' => true]);
}
