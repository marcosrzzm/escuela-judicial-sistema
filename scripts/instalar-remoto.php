<?php
// Instalador de un solo uso para el temporal de validación. Se sube con un nombre aleatorio,
// se llama por POST con el token y las contraseñas (nunca viven en el archivo) y se borra al terminar.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$tokenHash = '__TOKEN_HASH__';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !hash_equals($tokenHash, hash('sha256', (string) ($_POST['token'] ?? '')))) {
    http_response_code(404);
    exit;
}
$publica = __DIR__;
$sqlDir = $publica . '/_sql';
if (($_POST['accion'] ?? '') === 'borrar') {
    foreach (glob($sqlDir . '/*') ?: [] as $f) unlink($f);
    @rmdir($sqlDir);
    @unlink(__FILE__);
    echo json_encode(['borrado' => true]);
    exit;
}
if (($_POST['accion'] ?? '') === 'estado') {
    $c = [];
    foreach (file(dirname($publica) . '/ej-config.env', FILE_IGNORE_NEW_LINES) ?: [] as $l) if (str_contains($l, '=')) { [$k, $v] = explode('=', $l, 2); $c[$k] = $v; }
    $p = new PDO("mysql:host=127.0.0.1;dbname={$c['DB_NOMBRE']};charset=utf8mb4", $c['DB_USUARIO'], $c['DB_CONTRASENA']);
    echo json_encode(['tablas' => (int) $p->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn(), 'triggers' => (int) $p->query('SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = DATABASE()')->fetchColumn()]);
    exit;
}
$db = ['DB_NOMBRE' => $_POST['db_nombre'] ?? '', 'DB_USUARIO' => $_POST['db_usuario'] ?? '', 'DB_CONTRASENA' => $_POST['db_contrasena'] ?? ''];
$cfg = dirname($publica) . '/ej-config.env';
file_put_contents($cfg, "ENTORNO=produccion\nDB_HOST=127.0.0.1\nDB_NOMBRE={$db['DB_NOMBRE']}\nDB_USUARIO={$db['DB_USUARIO']}\nDB_CONTRASENA={$db['DB_CONTRASENA']}\n");
chmod($cfg, 0600);
$pdo = new PDO("mysql:host=127.0.0.1;dbname={$db['DB_NOMBRE']};charset=utf8mb4", $db['DB_USUARIO'], $db['DB_CONTRASENA'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) $pdo->exec("DROP TABLE IF EXISTS `$t`");
$pdo->exec('SET FOREIGN_KEY_CHECKS=1');
$n = 0;
foreach (['01_esquema.sql', '02_bitacora_inmutable.sql', '03_administracion.sql', '04_acceso_por_correo.sql', '90_semilla.sql'] as $archivo) {
    $sql = (string) file_get_contents("$sqlDir/$archivo");
    $sql = preg_replace('/^--.*$/m', '', $sql);
    foreach (preg_split('/;\s*\n/', $sql) ?: [] as $st) {
        if (trim($st) === '') continue;
        $pdo->exec($st);
        $n++;
    }
}
$claves = json_decode((string) ($_POST['claves'] ?? '{}'), true) ?: [];
$u = $pdo->prepare('UPDATE usuario SET contrasena_hash = ? WHERE correo = ?');
foreach ($claves as $correo => $clave) $u->execute([password_hash($clave, PASSWORD_BCRYPT), $correo]);
echo json_encode(['sentencias' => $n, 'cuentas' => count($claves), 'usuarios' => (int) $pdo->query('SELECT COUNT(*) FROM usuario')->fetchColumn(), 'triggers' => (int) $pdo->query('SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = DATABASE()')->fetchColumn()]);
