<?php
// Migrador de un solo uso para el temporal ya publicado: aplica SOLO sql/03_administracion.sql, sin borrar nada.
// Se sube con un nombre aleatorio junto a una carpeta _sql/ con esa migración, se llama por POST con el token y se borra.
// Se niega a correr sin la huella (sha256) de un respaldo de la base; la huella la manda scripts/migrar-base.mjs --aplicar.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$tokenHash = '__TOKEN_HASH__';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !hash_equals($tokenHash, hash('sha256', (string) ($_POST['token'] ?? '')))) {
    http_response_code(404);
    exit;
}
$publica = __DIR__;
$sqlDir = $publica . '/_sql';
$accion = (string) ($_POST['accion'] ?? '');
if ($accion === 'borrar') {
    foreach (glob($sqlDir . '/*') ?: [] as $f) unlink($f);
    @rmdir($sqlDir);
    @unlink(__FILE__);
    echo json_encode(['borrado' => true]);
    exit;
}
if ($accion === 'aplicar' && preg_match('/^[a-f0-9]{64}$/', (string) ($_POST['respaldo_sha256'] ?? '')) !== 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Sin la huella de un respaldo no se aplica nada.']);
    exit;
}
$c = [];
foreach (file(dirname($publica) . '/ej-config.env', FILE_IGNORE_NEW_LINES) ?: [] as $l) if (str_contains($l, '=')) { [$k, $v] = explode('=', $l, 2); $c[$k] = $v; }
$pdo = new PDO("mysql:host=127.0.0.1;dbname={$c['DB_NOMBRE']};charset=utf8mb4", $c['DB_USUARIO'], $c['DB_CONTRASENA'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true]);
$cuentas = fn () => ['usuarios' => (int) $pdo->query('SELECT COUNT(*) FROM usuario')->fetchColumn(), 'alumnos' => (int) $pdo->query('SELECT COUNT(*) FROM alumno')->fetchColumn(), 'bitacora' => (int) $pdo->query('SELECT COUNT(*) FROM bitacora_cambio')->fetchColumn()];
if ($accion === 'estado') {
    $roles = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rol'")->fetchColumn();
    echo json_encode(['rol' => $roles === 1] + $cuentas());
    exit;
}
if ($accion !== 'aplicar') {
    http_response_code(400);
    exit;
}
$antes = $cuentas();
$n = 0;
$sql = preg_replace('/^--.*$/m', '', (string) file_get_contents("$sqlDir/03_administracion.sql"));
foreach (preg_split('/;\s*\n/', $sql) ?: [] as $st) {
    if (trim($st) === '') continue;
    $pdo->query($st)->closeCursor();
    $n++;
}
echo json_encode(['sentencias' => $n, 'antes' => $antes, 'despues' => $cuentas(), 'roles' => (int) $pdo->query('SELECT COUNT(*) FROM rol')->fetchColumn()]);
