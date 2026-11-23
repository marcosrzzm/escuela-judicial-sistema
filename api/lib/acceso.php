<?php

declare(strict_types=1);

/**
 * Invitaciones y restablecimiento de contraseña por correo (especificación, 10.6).
 * Los enlaces guardan solo el hash del token. Nunca se imprime ni se registra el token ni la contraseña:
 * el enlace solo viaja en el correo (o, en local sin llave de Resend, en un archivo de seguridad/).
 */

const HORAS_INVITACION = 72;
const HORAS_RESTABLECER = 24;
const SOLICITUDES_POR_CORREO = 3;
const SOLICITUDES_POR_IP_POR_HORA = 10;

// --- Correo ---------------------------------------------------------------------

/** Dirección base de los enlaces: la configurada, o en local el servidor web de desarrollo. Nunca el Host de la petición. */
function url_base(): string
{
    if (config('sitio_url') !== '') {
        return (string) config('sitio_url');
    }
    return config('entorno') === 'local' ? 'http://localhost:' . config('web_puerto') : '';
}

function marca_correo(): array
{
    return [
        'nombre' => 'Sistema escolar',
        'color' => '#252627',
        'acento' => '#6a5528',
        'fondo' => '#faf8f4',
        'pie' => 'Escuela Judicial del Supremo Tribunal de Justicia del Estado de Jalisco' . (DATOS_FICTICIOS ? '. Prototipo con datos ficticios' : ''),
        'sitio' => config('sitio_url'),
    ];
}

/** Con datos ficticios, solo se manda de verdad a las direcciones o dominios de CORREO_PERMITIDOS. */
function destinatario_permitido(string $correo): bool
{
    if (!DATOS_FICTICIOS) {
        return true;
    }
    $correo = strtolower($correo);
    $dominio = substr($correo, (int) strrpos($correo, '@') + 1);
    foreach (config('correo_permitidos') as $p) {
        if ($p === $correo || $p === $dominio || $p === '@' . $dominio) {
            return true;
        }
    }
    return false;
}

/** Correos que salieron hoy (UTC), contados en la bitácora. */
function correos_enviados_hoy(): int
{
    return (int) fila(
        'SELECT COUNT(*) AS n FROM bitacora_cambio WHERE accion IN (\'invitacion_enviada\', \'invitacion_reenviada\', \'restablecer_enviado\') AND fecha >= ?',
        [gmdate('Y-m-d 00:00:00')]
    )['n'];
}

/**
 * Manda el correo de un enlace. Devuelve 'enviado', 'prueba' (modo de prueba: el destinatario no está permitido y
 * no salió nada; trae el enlace para que la demostración siga) o 'fallo'. Nunca lanza: quien llama ya guardó el
 * dato y la pantalla ofrece la contraseña temporal. Sin llave, solo en local se escribe en seguridad/correos-dev/.
 */
function enviar_correo_acceso(string $tipo, array $destino, string $token, array $admin): array
{
    $base = url_base();
    $remitente = (string) config('correo_remitente');
    if ($base === '') {
        return ['estado' => 'fallo'];
    }
    if (correos_enviados_hoy() >= (int) config('correo_tope_diario')) {
        error_log('Correo de acceso no enviado: tope diario');
        return ['estado' => 'fallo'];
    }
    $enlace = $base . ($tipo === 'invitacion' ? '/crear-clave' : '/restablecer') . '?t=' . $token;
    $marca = marca_correo();
    [$asunto, $campos] = correo_armar($tipo, $marca, (string) $admin['nombre'], $enlace);
    $llave = (string) config('resend_llave');
    $local = config('entorno') === 'local';
    try {
        $real = $llave !== '' && $remitente !== '';
        if ($real && destinatario_permitido((string) $destino['correo'])) {
            return ['estado' => correo_resend($llave, '"Sistema escolar · Escuela Judicial" <' . $remitente . '>', [(string) $destino['correo']], $asunto, $campos, (string) $admin['correo'], [], false, $marca) ? 'enviado' : 'fallo'];
        }
        if (!$local) {
            return $real ? ['estado' => 'prueba', 'enlace' => $enlace] : ['estado' => 'fallo'];
        }
        $carpeta = dirname(__DIR__, 2) . '/seguridad/correos-dev';
        if (!is_dir($carpeta) && !mkdir($carpeta, 0700, true)) {
            return ['estado' => 'fallo'];
        }
        $contenido = 'Para: ' . $destino['correo'] . "\nResponder a: " . $admin['correo'] . "\nAsunto: " . $asunto . "\n\n" . correo_texto($asunto, $campos, $marca) . "\n";
        $archivo = $carpeta . '/' . gmdate('Ymd-His') . sprintf('-%06d-', (int) (fmod(microtime(true), 1) * 1000000)) . bin2hex(random_bytes(2)) . '-' . $tipo . '.txt';
        if (file_put_contents($archivo, $contenido) === false || !chmod($archivo, 0600)) {
            return ['estado' => 'fallo'];
        }
        // Sin llave, el archivo hace de envío; con llave y destinatario no permitido, es modo de prueba.
        return $real ? ['estado' => 'prueba', 'enlace' => $enlace] : ['estado' => 'enviado'];
    } catch (Throwable $e) {
        error_log('Correo de acceso no enviado: ' . get_class($e));
        return ['estado' => 'fallo'];
    }
}

// --- Tokens ---------------------------------------------------------------------

/** Crea un enlace nuevo; los anteriores del mismo tipo para esa cuenta dejan de servir. Devuelve el token en claro, una sola vez. */
function emitir_token(int $usuario_id, string $tipo, int $horas, int $creado_por): string
{
    $token = bin2hex(random_bytes(32));
    transaccion(function () use ($usuario_id, $tipo, $horas, $creado_por, $token): void {
        ejecutar('UPDATE token_acceso SET vence_en = UTC_TIMESTAMP() WHERE usuario_id = ? AND tipo = ? AND usado_en IS NULL AND vence_en > UTC_TIMESTAMP()', [$usuario_id, $tipo]);
        insertar('token_acceso', [
            'usuario_id' => $usuario_id, 'tipo' => $tipo, 'token_hash' => hash('sha256', $token),
            'vence_en' => gmdate('Y-m-d H:i:s', time() + $horas * 3600), 'creado_por' => $creado_por,
        ]);
    });
    return $token;
}

/** El enlace si sirve: sin usar, sin vencer, no superado por otro y con la cuenta activa. */
function token_vigente(string $token): ?array
{
    if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
        return null;
    }
    return fila(
        'SELECT t.id, t.tipo, u.id AS usuario_id, u.correo, u.nombre
         FROM token_acceso t JOIN usuario u ON u.id = t.usuario_id
         WHERE t.token_hash = ? AND t.usado_en IS NULL AND t.vence_en > UTC_TIMESTAMP() AND u.estado = \'activo\'',
        [hash('sha256', $token)]
    );
}

function error_enlace(): never
{
    error_http(410, 'Este enlace ya se usó o venció. Pide a Coordinación que te mande uno nuevo.');
}

/**
 * Manda un enlace, lo registra y devuelve lo que la respuesta debe decir: correo_enviado y, en modo de prueba,
 * modo_prueba y el enlace (solo para Coordinación). El token no pasa por la bitácora.
 */
function mandar_enlace(string $tipo, array $cuenta, array $admin, string $evento): array
{
    $token = emitir_token((int) $cuenta['id'], $tipo, $tipo === 'invitacion' ? HORAS_INVITACION : HORAS_RESTABLECER, (int) $admin['id']);
    $r = enviar_correo_acceso($tipo, $cuenta, $token, $admin);
    $enviado = $r['estado'] === 'enviado';
    registrar_bitacora('usuario', (int) $cuenta['id'], $enviado ? $evento : 'correo_no_enviado', null, ['tipo' => $tipo, 'correo' => $cuenta['correo']] + ($r['estado'] === 'prueba' ? ['motivo' => 'modo de prueba'] : []));
    return ['correo_enviado' => $enviado] + ($r['estado'] === 'prueba' ? ['modo_prueba' => true, 'enlace' => $r['enlace']] : []);
}

// --- Rutas públicas --------------------------------------------------------------

function ruta_acceso_validar(): never
{
    $t = token_vigente((string) ($_GET['t'] ?? ''));
    if ($t === null) {
        error_enlace();
    }
    responder(200, ['correo' => $t['correo']]);
}

function ruta_acceso_clave(): never
{
    $d = cuerpo_json();
    $t = token_vigente(is_string($d['token'] ?? null) ? $d['token'] : '');
    if ($t === null) {
        error_enlace();
    }
    $nueva = is_string($d['nueva'] ?? null) ? $d['nueva'] : '';
    $confirmacion = is_string($d['confirmacion'] ?? null) ? $d['confirmacion'] : '';
    exigir_clave_valida($nueva, $t['correo']);
    if ($nueva !== $confirmacion) {
        error_http(422, 'La confirmación no coincide con la contraseña nueva.', ['confirmacion' => 'No coincide.']);
    }
    $uid = (int) $t['usuario_id'];
    transaccion(function () use ($t, $uid, $nueva): void {
        // Atómico: dos usos a la vez no pueden pasar los dos.
        if (ejecutar('UPDATE token_acceso SET usado_en = UTC_TIMESTAMP() WHERE id = ? AND usado_en IS NULL AND vence_en > UTC_TIMESTAMP()', [$t['id']]) !== 1) {
            error_enlace();
        }
        ejecutar('UPDATE usuario SET contrasena_hash = ?, debe_cambiar_clave = 0 WHERE id = ?', [password_hash($nueva, PASSWORD_DEFAULT), $uid]);
        cerrar_sesiones_de($uid);
        registrar_bitacora('usuario', $uid, $t['tipo'] === 'invitacion' ? 'invitacion_usada' : 'restablecimiento_usado', null, null, null, $uid);
    });
    $u = cargar_usuario($uid);
    if ($u === null) {
        error_enlace();
    }
    crear_sesion($uid);
    $u['solo_lectura'] = false;
    $u['actor_real'] = null;
    responder(200, datos_de_sesion($u));
}

/** Pide restablecer: la respuesta es siempre la misma, exista o no la cuenta, y no manda nada. */
function ruta_olvide_clave(): never
{
    $correo = correo_valido(cuerpo_json());
    $ip = substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
    $u = fila('SELECT id FROM usuario WHERE correo = ? AND estado = \'activo\'', [$correo]);
    $u = $u === null ? null : cargar_usuario((int) $u['id']);
    if ($u !== null) {
        $por_correo = (int) fila('SELECT COUNT(*) AS n FROM solicitud_restablecer WHERE correo = ? AND creado_en > (UTC_TIMESTAMP() - INTERVAL 24 HOUR)', [$correo])['n'];
        $por_ip = (int) fila('SELECT COUNT(*) AS n FROM solicitud_restablecer WHERE ip = ? AND creado_en > (UTC_TIMESTAMP() - INTERVAL 1 HOUR)', [$ip])['n'];
        $abierta = fila('SELECT id FROM solicitud_restablecer WHERE usuario_id = ? AND estado = \'pendiente\' LIMIT 1', [$u['id']]);
        if ($por_correo < SOLICITUDES_POR_CORREO && $por_ip < SOLICITUDES_POR_IP_POR_HORA && $abierta === null) {
            $id = insertar('solicitud_restablecer', ['correo' => $correo, 'usuario_id' => $u['id'], 'ip' => $ip, 'creado_en' => ahora()]);
            registrar_bitacora('solicitud_acceso', $id, 'solicitud_creada', null, ['correo' => $correo], null, (int) $u['id']);
            avisar_a_permiso('usuario', 'modificar', 'solicitud_acceso', 'Hay una solicitud de acceso por resolver.', '/usuarios', ['coordinacion']);
        }
    }
    usleep(random_int(100000, 300000));
    responder(200, ['ok' => true]);
}

// --- Rutas de Coordinación -----------------------------------------------------------

function ruta_solicitudes_acceso(): never
{
    exigir_admin('usuario', 'ver');
    responder(200, ['filas' => filas(
        'SELECT s.id, s.correo, u.nombre, r.nombre AS rol_nombre, s.creado_en
         FROM solicitud_restablecer s JOIN usuario u ON u.id = s.usuario_id JOIN rol r ON r.clave = u.rol
         WHERE s.estado = \'pendiente\' ORDER BY s.id'
    )]);
}

/** Solicitud pendiente de una cuenta aún activa, o 409. */
function solicitud_pendiente(int $id): array
{
    $s = fila('SELECT id, correo, usuario_id, estado FROM solicitud_restablecer WHERE id = ? FOR UPDATE', [$id]);
    if ($s === null) {
        error_http(404, 'Esa solicitud ya no existe.');
    }
    if ($s['estado'] !== 'pendiente') {
        error_http(409, 'Esa solicitud ya se resolvió.');
    }
    return $s;
}

function ruta_autorizar_solicitud(array $a): never
{
    $admin = exigir_admin('usuario', 'modificar');
    $cuenta = transaccion(function () use ($a, $admin): array {
        $s = solicitud_pendiente((int) $a['id']);
        $cuenta = fila('SELECT id, nombre, correo FROM usuario WHERE id = ? AND estado = \'activo\'', [$s['usuario_id']]);
        if ($cuenta === null) {
            error_http(409, 'La cuenta de esta solicitud ya no está activa.');
        }
        ejecutar('UPDATE solicitud_restablecer SET estado = \'autorizada\', resuelto_por = ?, resuelto_en = UTC_TIMESTAMP() WHERE id = ?', [$admin['id'], $s['id']]);
        cerrar_sesiones_de((int) $cuenta['id']);
        registrar_bitacora('solicitud_acceso', (int) $s['id'], 'solicitud_autorizada', ['estado' => 'pendiente'], ['estado' => 'autorizada']);
        return $cuenta;
    });
    responder(200, mandar_enlace('restablecer', $cuenta, $admin, 'restablecer_enviado'));
}

function ruta_rechazar_solicitud(array $a): never
{
    $admin = exigir_admin('usuario', 'modificar');
    $motivo = texto(cuerpo_json(), 'motivo', 500, 'El motivo');
    transaccion(function () use ($a, $admin, $motivo): void {
        $s = solicitud_pendiente((int) $a['id']);
        ejecutar('UPDATE solicitud_restablecer SET estado = \'rechazada\', motivo = ?, resuelto_por = ?, resuelto_en = UTC_TIMESTAMP() WHERE id = ?', [$motivo, $admin['id'], $s['id']]);
        registrar_bitacora('solicitud_acceso', (int) $s['id'], 'solicitud_rechazada', ['estado' => 'pendiente'], ['estado' => 'rechazada'], $motivo);
    });
    responder(200, ['ok' => true]);
}

/** Cuenta activa distinta de quien pide, o 404 / 409. */
function cuenta_para_enlace(array $a, array $admin): array
{
    $c = fila('SELECT id, nombre, correo, estado, debe_cambiar_clave FROM usuario WHERE id = ?', [(int) $a['id']]);
    if ($c === null) {
        error_http(404, 'Esa cuenta ya no existe.');
    }
    if ((int) $c['id'] === (int) $admin['id']) {
        error_http(409, 'Tu propia contraseña se cambia en Mi contraseña.');
    }
    if ($c['estado'] !== 'activo') {
        error_http(409, 'La cuenta está inactiva. Actívala antes de mandarle un enlace.');
    }
    return $c;
}

function ruta_reenviar_invitacion(array $a): never
{
    $admin = exigir_admin('usuario', 'modificar');
    $c = cuenta_para_enlace($a, $admin);
    if ((int) $c['debe_cambiar_clave'] !== 1) {
        error_http(409, 'Esa persona ya creó su contraseña. Si la olvidó, mándale un enlace para restablecerla.');
    }
    responder(200, mandar_enlace('invitacion', $c, $admin, 'invitacion_reenviada'));
}

function ruta_enlace_restablecer(array $a): never
{
    $admin = exigir_admin('usuario', 'modificar');
    $c = cuenta_para_enlace($a, $admin);
    responder(200, mandar_enlace('restablecer', $c, $admin, 'restablecer_enviado'));
}
