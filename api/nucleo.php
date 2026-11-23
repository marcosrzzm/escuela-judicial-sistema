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
    $u = fila(
        'SELECT u.id, u.nombre, u.correo, u.rol, s.id AS sesion_id, s.ultimo_uso
         FROM sesion s JOIN usuario u ON u.id = s.usuario_id AND u.estado = \'activo\'
         WHERE s.token_hash = ? AND s.expira_en > UTC_TIMESTAMP() LIMIT 1',
        [hash('sha256', $token)]
    );
    if ($u !== null && strtotime($u['ultimo_uso'] . ' UTC') < time() - 300) {
        ejecutar('UPDATE sesion SET ultimo_uso = UTC_TIMESTAMP() WHERE id = ?', [$u['sesion_id']]);
    }
    return $cache = $u;
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
    $u = usuario_actual();
    registrar_bitacora('acceso', null, 'acceso_denegado', null, null, trim(($_SERVER['REQUEST_METHOD'] ?? '') . ' ' . ($_SERVER['REQUEST_URI'] ?? '') . ' ' . $detalle), $u['id'] ?? null);
    error_http(403, 'No tienes permiso para esta acción.');
}

function exigir_permiso(string $recurso, string $accion): array
{
    $u = exigir_sesion();
    if (!tiene_permiso($u['rol'], $recurso, $accion)) {
        denegar("($recurso:$accion)");
    }
    return $u;
}

function registrar_bitacora(string $entidad, ?int $registro_id, string $accion, ?array $antes, ?array $despues, ?string $motivo = null, ?int $usuario_id = null): void
{
    $uid = $usuario_id ?? (usuario_actual()['id'] ?? null);
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
