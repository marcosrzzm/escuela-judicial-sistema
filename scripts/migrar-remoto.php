<?php
// Migrador de un solo uso para el temporal ya publicado: aplica SOLO las migraciones pendientes (03 y 04), sin borrar nada.
// Se sube con un nombre aleatorio junto a una carpeta _sql/ con esas migraciones, se llama por POST con el token y se borra.
// accion=respaldo devuelve un volcado SQL de toda la base (tablas, datos y disparadores), sin tocar nada.
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
$pdo = new PDO("mysql:host=127.0.0.1;port=" . ($c['MYSQL_PUERTO'] ?? 3306) . ";dbname={$c['DB_NOMBRE']};charset=utf8mb4", $c['DB_USUARIO'], $c['DB_CONTRASENA'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true]);
$cuentas = fn () => ['usuarios' => (int) $pdo->query('SELECT COUNT(*) FROM usuario')->fetchColumn(), 'alumnos' => (int) $pdo->query('SELECT COUNT(*) FROM alumno')->fetchColumn(), 'bitacora' => (int) $pdo->query('SELECT COUNT(*) FROM bitacora_cambio')->fetchColumn()];
$existe = fn (string $tabla) => (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '$tabla'")->fetchColumn() === 1;
// Una migración está pendiente mientras no exista la tabla que crea.
$migraciones = ['03_administracion.sql' => 'rol', '04_acceso_por_correo.sql' => 'token_acceso'];
if ($accion === 'respaldo') {
    header('Content-Type: text/plain; charset=utf-8');
    $q = static fn (string $n): string => '`' . str_replace('`', '``', $n) . '`';
    $sal = "-- Respaldo de la base, " . gmdate('Y-m-d H:i') . " UTC\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n";
    $conteos = '';
    foreach ($pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_NUM) as [$t]) {
        $sal .= "DROP TABLE IF EXISTS {$q($t)};\n" . $pdo->query("SHOW CREATE TABLE {$q($t)}")->fetch(PDO::FETCH_NUM)[1] . ";\n\n";
        $n = 0;
        $lote = [];
        $cols = '';
        $vaciar = function () use (&$sal, &$lote, &$cols, $t, $q): void {
            if ($lote !== []) {
                $sal .= "INSERT INTO {$q($t)} ($cols) VALUES\n" . implode(",\n", $lote) . ";\n";
                $lote = [];
            }
        };
        // Las columnas generadas se recalculan solas: no se pueden insertar.
        $propias = $pdo->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND extra NOT LIKE '%GENERATED%' ORDER BY ordinal_position");
        $propias->execute([$t]);
        $lista = implode(', ', array_map($q, $propias->fetchAll(PDO::FETCH_COLUMN)));
        foreach ($pdo->query("SELECT {$lista} FROM {$q($t)}", PDO::FETCH_ASSOC) as $fila) {
            $cols = $cols !== '' ? $cols : implode(', ', array_map($q, array_keys($fila)));
            $lote[] = '(' . implode(', ', array_map(fn ($v) => $v === null ? 'NULL' : $pdo->quote((string) $v), $fila)) . ')';
            $n++;
            if (count($lote) >= 100) {
                $vaciar();
            }
        }
        $vaciar();
        $sal .= "\n";
        $conteos .= "-- filas {$t}: {$n}\n";
    }
    // Los disparadores van al final, para que no frenen la carga de los datos.
    foreach ($pdo->query('SHOW TRIGGERS')->fetchAll(PDO::FETCH_ASSOC) as $d) {
        $def = $pdo->query('SHOW CREATE TRIGGER ' . $q($d['Trigger']))->fetch(PDO::FETCH_ASSOC)['SQL Original Statement'];
        $sal .= "DELIMITER $$\n" . preg_replace('/DEFINER=`[^`]*`@`[^`]*`\s*/', '', $def) . "$$\nDELIMITER ;\n\n";
    }
    echo $sal . "SET FOREIGN_KEY_CHECKS=1;\n" . $conteos;
    exit;
}
if ($accion === 'estado') {
    echo json_encode([
        'rol' => $existe('rol'), 'token_acceso' => $existe('token_acceso'),
        'tablas' => (int) $pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn(),
        'triggers' => (int) $pdo->query('SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = DATABASE()')->fetchColumn(),
    ] + $cuentas());
    exit;
}
if ($accion !== 'aplicar') {
    http_response_code(400);
    exit;
}
$antes = $cuentas();
$n = 0;
$aplicadas = [];
foreach ($migraciones as $archivo => $tabla) {
    if ($existe($tabla) || !is_file("$sqlDir/$archivo")) {
        continue;
    }
    $sql = preg_replace('/^--.*$/m', '', (string) file_get_contents("$sqlDir/$archivo"));
    foreach (preg_split('/;\s*\n/', $sql) ?: [] as $st) {
        if (trim($st) === '') continue;
        $pdo->query($st)->closeCursor();
        $n++;
    }
    $aplicadas[] = $archivo;
}
echo json_encode(['aplicadas' => $aplicadas, 'sentencias' => $n, 'antes' => $antes, 'despues' => $cuentas(), 'roles' => (int) $pdo->query('SELECT COUNT(*) FROM rol')->fetchColumn()]);
