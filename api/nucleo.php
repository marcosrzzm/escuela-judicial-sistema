<?php

declare(strict_types=1);

/**
 * Núcleo: conexión, respuesta, sesión, permisos, bitácora y validación.
 * La interfaz esconde lo que un rol no puede hacer; lo que protege es esta capa.
 */

require_once __DIR__ . '/ajustes.php';
require_once __DIR__ . '/permisos.php';

$GLOBALS['CONFIG'] = cargar_config();

function config(string $clave): mixed
{
    return $GLOBALS['CONFIG'][$clave];
}

set_exception_handler(function (Throwable $e): void {
    error_log('Excepcion sin capturar: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    error_http(500, 'El servicio no está disponible en este momento. Vuelve a intentarlo en unos minutos.');
});

/** Único punto de salida JSON de la API. */
function responder(int $codigo, mixed $datos): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function error_http(int $codigo, string $mensaje, array $campos = []): never
{
    $cuerpo = ['error' => $mensaje];
    if ($campos !== []) {
        $cuerpo['campos'] = $campos;
    }
    responder($codigo, $cuerpo);
}

function responder_archivo(string $contenido, string $tipo, string $nombre): never
{
    http_response_code(200);
    header("Content-Type: $tipo");
    header('Content-Disposition: attachment; filename="' . $nombre . '"');
    echo $contenido;
    exit;
}

// --- Base de datos ----------------------------------------------------------

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', config('db_host'), config('db_puerto'), config('db_nombre'));
        try {
            $pdo = new PDO($dsn, config('db_usuario'), config('db_contrasena'), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $pdo->exec("SET time_zone = '+00:00'");
        } catch (Throwable $e) {
            error_log('Fallo de conexion: ' . $e->getMessage());
            error_http(500, 'El servicio no está disponible en este momento. Vuelve a intentarlo en unos minutos.');
        }
    }
    return $pdo;
}

function filas(string $sql, array $params = []): array
{
    $s = db()->prepare($sql);
    $s->execute($params);
    return $s->fetchAll();
}

function fila(string $sql, array $params = []): ?array
{
    $f = filas($sql, $params);
    return $f[0] ?? null;
}

function ejecutar(string $sql, array $params = []): int
{
    $s = db()->prepare($sql);
    $s->execute($params);
    return $s->rowCount();
}

function insertar(string $tabla, array $valores): int
{
    $columnas = implode(', ', array_keys($valores));
    $marcas = implode(', ', array_fill(0, count($valores), '?'));
    ejecutar("INSERT INTO $tabla ($columnas) VALUES ($marcas)", array_values($valores));
    return (int) db()->lastInsertId();
}

function transaccion(callable $f): mixed
{
    $db = db();
    $db->beginTransaction();
    try {
        $r = $f();
        $db->commit();
        return $r;
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

function ahora(): string
{
    return gmdate('Y-m-d H:i:s');
}

// --- Entrada -------------------------------------------------------------------

function cuerpo_json(): array
{
    $crudo = file_get_contents('php://input') ?: '';
    $d = json_decode($crudo, true);
    return is_array($d) ? $d : [];
}

/** Correo tal como se guarda: sin espacios ni caracteres invisibles que se cuelan al copiar y pegar. */
function correo_limpio(array $d): string
{
    $v = is_string($d['correo'] ?? null) ? $d['correo'] : '';
    $v = preg_replace('/[\s\x{00A0}\x{00AD}\x{200B}-\x{200F}\x{2060}\x{FEFF}]/u', '', $v) ?? '';
    return mb_strtolower(texto(['correo' => $v], 'correo', 160, 'El correo'));
}

function texto(array $d, string $campo, int $max, string $etiqueta, bool $obligatorio = true): string
{
    $v = $d[$campo] ?? '';
    $v = is_string($v) ? trim($v) : '';
    if ($v === '' && $obligatorio) {
        error_http(422, "$etiqueta es obligatorio.", [$campo => "$etiqueta es obligatorio."]);
    }
    if (mb_strlen($v) > $max) {
        error_http(422, "$etiqueta admite $max caracteres o menos.", [$campo => "Máximo $max caracteres."]);
    }
    return $v;
}

function entero(array $d, string $campo, string $etiqueta): int
{
    $v = $d[$campo] ?? null;
    if (!is_int($v) && !(is_string($v) && ctype_digit($v))) {
        error_http(422, "$etiqueta no es válido.", [$campo => "$etiqueta no es válido."]);
    }
    return (int) $v;
}

function una_de(array $d, string $campo, array $permitidos, string $etiqueta): string
{
    $v = $d[$campo] ?? null;
    if (!is_string($v) || !in_array($v, $permitidos, true)) {
        error_http(422, "$etiqueta no es válido.", [$campo => "Elige una opción válida."]);
    }
    return $v;
}

// --- Sesión -------------------------------------------------------------------

function es_local(): bool
{
    $host = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
    return in_array($host, ['localhost', '127.0.0.1'], true);
}

function token_de_cookie(): ?string
{
    $t = (string) ($_COOKIE[config('cookie')] ?? '');
    return preg_match('/^[a-f0-9]{64}$/', $t) === 1 ? $t : null;
}

/** Cuenta activa con su rol cargado: base, permisos efectivos y si es rol del sistema. */
function cargar_usuario(int $id): ?array
{
    $u = fila(
        'SELECT u.id, u.nombre, u.correo, u.rol, u.debe_cambiar_clave, r.nombre AS rol_nombre, r.base, r.es_sistema, r.permisos
         FROM usuario u JOIN rol r ON r.clave = u.rol AND r.estado = \'activo\'
         WHERE u.id = ? AND u.estado = \'activo\'',
        [$id]
    );
    if ($u === null) {
        return null;
    }
    $u['es_sistema'] = (int) $u['es_sistema'] === 1;
    $u['debe_cambiar_clave'] = (int) $u['debe_cambiar_clave'] === 1;
    $u['permisos'] = permisos_de_rol($u['base'], $u['es_sistema'], $u['permisos']);
    return $u;
}

/**
 * El usuario efectivo de la petición. Si la sesión está en "ver como", es la cuenta vista (con sus
 * permisos, base y alcance), `solo_lectura` es true y `actor_real` trae a quien inició la vista.
 */
function usuario_actual(): ?array
{
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }
    $token = token_de_cookie();
    if ($token === null) {
        return $cache = null;
    }
    $s = fila(
        'SELECT id, usuario_id, viendo_como_id, ultimo_uso FROM sesion WHERE token_hash = ? AND expira_en > UTC_TIMESTAMP() LIMIT 1',
        [hash('sha256', $token)]
    );
    $u = $s === null ? null : cargar_usuario((int) $s['usuario_id']);
    if ($u === null) {
        return $cache = null;
    }
    if (strtotime($s['ultimo_uso'] . ' UTC') < time() - 300) {
        ejecutar('UPDATE sesion SET ultimo_uso = UTC_TIMESTAMP() WHERE id = ?', [$s['id']]);
    }
    $u['sesion_id'] = (int) $s['id'];
    $u['solo_lectura'] = false;
    $u['actor_real'] = null;
    if ($s['viendo_como_id'] !== null) {
        $visto = cargar_usuario((int) $s['viendo_como_id']);
        if ($visto === null) {
            // La cuenta vista ya no está activa: la vista termina sola.
            ejecutar('UPDATE sesion SET viendo_como_id = NULL WHERE id = ?', [$s['id']]);
            registrar_bitacora('usuario', (int) $s['viendo_como_id'], 'ver_como_fin', null, null, 'cuenta vista inactiva', (int) $u['id']);
        } else {
            $visto['sesion_id'] = $u['sesion_id'];
            $visto['solo_lectura'] = true;
            $visto['actor_real'] = ['id' => $u['id'], 'nombre' => $u['nombre'], 'rol' => $u['rol_nombre']];
            $visto['debe_cambiar_clave'] = $u['debe_cambiar_clave'];
            $u = $visto;
        }
    }
    return $cache = $u;
}

/** Quien hizo de verdad la petición: con "ver como", la cuenta de Coordinación y no la vista. */
function actor_real_id(): ?int
{
    $u = usuario_actual();
    return $u === null ? null : (int) ($u['actor_real']['id'] ?? $u['id']);
}

function clave_temporal(): string
{
    $alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    $clave = '';
    for ($i = 0; $i < 12; $i++) {
        $clave .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
    return $clave;
}

function crear_sesion(int $usuario_id): void
{
    ejecutar('DELETE FROM sesion WHERE expira_en < UTC_TIMESTAMP()');
    $token = bin2hex(random_bytes(32));
    $horas = (int) config('horas_sesion');
    insertar('sesion', [
        'usuario_id' => $usuario_id,
        'token_hash' => hash('sha256', $token),
        'expira_en' => gmdate('Y-m-d H:i:s', time() + $horas * 3600),
    ]);
    setcookie(config('cookie'), $token, [
        'expires' => time() + $horas * 3600,
        'path' => '/',
        'secure' => !es_local(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function cerrar_sesion(): void
{
    $token = token_de_cookie();
    if ($token !== null) {
        ejecutar('DELETE FROM sesion WHERE token_hash = ?', [hash('sha256', $token)]);
    }
    setcookie(config('cookie'), '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
}

function exigir_sesion(): array
{
    $u = usuario_actual();
    if ($u === null) {
        error_http(401, 'Tu sesión expiró. Vuelve a entrar.');
    }
    return $u;
}

// --- Permisos y bitácora ----------------------------------------------------------

/** 403 que no revela si el registro existe; el intento queda en la bitácora. */
function denegar(string $detalle = ''): never
{
    registrar_bitacora('acceso', null, 'acceso_denegado', null, null, trim(($_SERVER['REQUEST_METHOD'] ?? '') . ' ' . ($_SERVER['REQUEST_URI'] ?? '') . ' ' . $detalle));
    error_http(403, 'No tienes permiso para esta acción.');
}

function exigir_permiso(string $recurso, string $accion): array
{
    $u = exigir_sesion();
    if (!tiene_permiso($u, $recurso, $accion)) {
        denegar("($recurso:$accion)");
    }
    return $u;
}

/** Administración (usuarios, roles, ver como): además del permiso, solo el rol del sistema coordinacion. */
function exigir_admin(string $recurso, string $accion): array
{
    $u = exigir_permiso($recurso, $accion);
    if (!$u['es_sistema'] || $u['base'] !== 'coordinacion') {
        denegar("($recurso:$accion, solo el rol del sistema coordinacion)");
    }
    return $u;
}

/**
 * Guardia de toda petición con sesión, ya resuelta la ruta: con cambio de contraseña pendiente solo se
 * permite ver la sesión, cambiarla y salir; en "ver como" solo se lee (y se sale). Los latidos de
 * tiempo activo de una vista se descartan con éxito para no ensuciar la medición.
 */
function guardia_de_peticion(string $metodo, string $ruta): void
{
    // Con una cookie vieja, el inicio de sesión no puede quedar bloqueado ni cargar la cuenta anterior.
    // Las rutas públicas (entrar, enlaces de correo, olvidé mi contraseña) no dependen de la cookie que haya.
    $publica = in_array($ruta, ['/login', '/acceso/validar', '/acceso/clave', '/olvide-clave'], true);
    $u = $publica ? null : usuario_actual();
    if ($u === null) {
        return;
    }
    $permitida_con_clave_pendiente = ($metodo === 'GET' && $ruta === '/sesion') || ($metodo === 'PUT' && $ruta === '/mi-clave') || ($metodo === 'POST' && $ruta === '/logout');
    if ($u['debe_cambiar_clave'] && !$permitida_con_clave_pendiente) {
        error_http(403, 'Tu contraseña es temporal. Cámbiala en Mi contraseña antes de seguir.');
    }
    if ($u['solo_lectura'] && $metodo !== 'GET') {
        if ($metodo === 'POST' && $ruta === '/metricas/tiempo') {
            responder(200, ['segundos_aceptados' => 0]);
        }
        if (!($metodo === 'POST' && in_array($ruta, ['/ver-como/salir', '/logout'], true))) {
            registrar_bitacora('acceso', null, 'acceso_denegado', null, null, "$metodo $ruta (vista de solo lectura)");
            error_http(403, 'Estás en una vista de solo lectura: no se guarda nada. Sal de la vista para trabajar.');
        }
    }
}

function registrar_bitacora(string $entidad, ?int $registro_id, string $accion, ?array $antes, ?array $despues, ?string $motivo = null, ?int $usuario_id = null): void
{
    $uid = $usuario_id ?? actor_real_id();
    insertar('bitacora_cambio', [
        'entidad' => $entidad,
        'registro_id' => $registro_id,
        'accion' => $accion,
        'usuario_id' => $uid,
        'fecha' => ahora(),
        'motivo' => $motivo === null ? null : mb_substr($motivo, 0, 500),
        'antes' => $antes === null ? null : json_encode($antes, JSON_UNESCAPED_UNICODE),
        'despues' => $despues === null ? null : json_encode($despues, JSON_UNESCAPED_UNICODE),
    ]);
}

function paginar(int $total, int $por_pagina = 25): array
{
    $por_pagina = min(100, max(1, (int) ($_GET['por_pagina'] ?? $por_pagina)));
    $paginas = max(1, (int) ceil($total / $por_pagina));
    $pagina = min(max(1, (int) ($_GET['pagina'] ?? 1)), $paginas);
    return [$pagina, ($pagina - 1) * $por_pagina, $por_pagina, $paginas];
}
