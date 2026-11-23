<?php

declare(strict_types=1);

/**
 * Respaldo diario de la base (especificación, 12.11). Se corre por cron con php CLI, nunca por web:
 *   php /ruta/al/sitio/public_html/api/respaldo-diario.php
 * Vuelca tablas, datos y disparadores con PDO (sin mysqldump), comprime con gzip a la carpeta de respaldos
 * (`ej-respaldos/` un nivel arriba de la carpeta pública; en local `seguridad/respaldos/`) y conserva 14 días.
 * Lee la configuración como la API (ajustes.php): variable EJ_CONFIG, .env de la raíz o ej-config.env.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// En el repositorio vive junto a api/; en el hosting, dentro de api/.
$api = is_file(__DIR__ . '/ajustes.php') ? __DIR__ : dirname(__DIR__) . '/api';
require $api . '/ajustes.php';
$config = cargar_config();

const DIAS_A_CONSERVAR = 14;

function fallar(string $mensaje): never
{
    fwrite(STDERR, "FALLO: $mensaje\n");
    exit(1);
}

$dir = (string) $config['respaldos_dir'];
if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
    fallar("no se pudo crear $dir");
}
$destino = $dir . '/respaldo-' . gmdate('Y-m-d-Hi') . '.sql.gz';
$parcial = $destino . '.parcial';

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_puerto'], $config['db_nombre']),
        $config['db_usuario'],
        $config['db_contrasena'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => false]
    );
} catch (Throwable $e) {
    fallar('no hay conexión con la base: ' . $e->getMessage());
}

$gz = gzopen($parcial, 'wb9');
if ($gz === false) {
    fallar("no se pudo escribir $parcial");
}
$q = static fn (string $n): string => '`' . str_replace('`', '``', $n) . '`';
$escribir = static function (string $t) use ($gz): void {
    if (gzwrite($gz, $t) === false) {
        fallar('se cortó la escritura del respaldo');
    }
};

try {
    // Una foto consistente: todas las tablas se leen como estaban al empezar.
    $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    $escribir('-- Respaldo de la base, ' . gmdate('Y-m-d H:i') . " UTC\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");
    $tablas = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_NUM);
    $conteos = '';
    foreach ($tablas as [$t]) {
        $escribir("DROP TABLE IF EXISTS {$q($t)};\n" . $pdo->query("SHOW CREATE TABLE {$q($t)}")->fetch(PDO::FETCH_NUM)[1] . ";\n\n");
        // Las columnas generadas se recalculan solas: no se pueden insertar.
        $cols = $pdo->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND extra NOT LIKE '%GENERATED%' ORDER BY ordinal_position");
        $cols->execute([$t]);
        $lista = $cols->fetchAll(PDO::FETCH_COLUMN);
        $n = 0;
        $lote = [];
        $vaciar = static function () use (&$lote, $escribir, $t, $q, $lista): void {
            if ($lote !== []) {
                $escribir("INSERT INTO {$q($t)} (" . implode(', ', array_map($q, $lista)) . ") VALUES\n" . implode(",\n", $lote) . ";\n");
                $lote = [];
            }
        };
        foreach ($pdo->query('SELECT ' . implode(', ', array_map($q, $lista)) . " FROM {$q($t)}", PDO::FETCH_ASSOC) as $fila) {
            $lote[] = '(' . implode(', ', array_map(static fn ($v) => $v === null ? 'NULL' : $pdo->quote((string) $v), $fila)) . ')';
            $n++;
            if (count($lote) >= 100) {
                $vaciar();
            }
        }
        $vaciar();
        $escribir("\n");
        $conteos .= "-- filas {$t}: {$n}\n";
    }
    // Los disparadores van al final, para que no frenen la carga de los datos.
    foreach ($pdo->query('SHOW TRIGGERS')->fetchAll(PDO::FETCH_ASSOC) as $d) {
        $def = $pdo->query('SHOW CREATE TRIGGER ' . $q($d['Trigger']))->fetch(PDO::FETCH_ASSOC)['SQL Original Statement'];
        $escribir("DELIMITER $$\n" . preg_replace('/DEFINER=`[^`]*`@`[^`]*`\s*/', '', $def) . "$$\nDELIMITER ;\n\n");
    }
    $escribir("SET FOREIGN_KEY_CHECKS=1;\n" . $conteos . "-- fin del respaldo\n");
    $pdo->exec('COMMIT');
} catch (Throwable $e) {
    gzclose($gz);
    @unlink($parcial);
    fallar('el volcado se interrumpió: ' . $e->getMessage());
}
gzclose($gz);

// Se verifica lo escrito antes de darlo por bueno: el archivo se lee completo y trae su marca final.
$leido = gzopen($parcial, 'rb');
$cola = '';
while ($leido !== false && !gzeof($leido)) {
    $cola = substr($cola . (string) gzread($leido, 65536), -200);
}
if ($leido !== false) {
    gzclose($leido);
}
if ($leido === false || !str_contains($cola, '-- fin del respaldo')) {
    @unlink($parcial);
    fallar('el respaldo no pasó la verificación y no se guardó');
}
rename($parcial, $destino);
@chmod($destino, 0640);

// Rotación: solo los respaldos propios con más de 14 días.
$borrados = 0;
foreach (glob($dir . '/respaldo-*.sql.gz') ?: [] as $f) {
    if (preg_match('/respaldo-\d{4}-\d{2}-\d{2}-\d{4}\.sql\.gz$/', $f) === 1 && filemtime($f) < time() - DIAS_A_CONSERVAR * 86400) {
        unlink($f);
        $borrados++;
    }
}
echo json_encode(['archivo' => basename($destino), 'bytes' => filesize($destino), 'tablas' => count($tablas), 'rotados' => $borrados]) . "\n";
