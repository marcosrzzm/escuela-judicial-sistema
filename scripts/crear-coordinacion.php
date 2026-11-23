<?php
// Crea la primera cuenta de Coordinación en una base sin semilla (especificación, sección 10.5).
// Uso: php scripts/crear-coordinacion.php [--nombre="..."] [--correo="..."]
// Sin parámetros pregunta cada dato. La contraseña temporal sale solo en esta terminal: no se guarda en claro.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit(1);
}
require __DIR__ . '/../api/nucleo.php';
set_exception_handler(function (Throwable $e): void {
    fwrite(STDERR, 'No se pudo crear la cuenta: ' . $e->getMessage() . "\n");
    exit(1);
});

$args = getopt('', ['nombre::', 'correo::']);
$preguntar = function (string $etiqueta, ?string $dado): string {
    if (is_string($dado) && trim($dado) !== '') {
        return trim($dado);
    }
    echo "$etiqueta: ";
    return trim((string) fgets(STDIN));
};
$nombre = $preguntar('Nombre completo', $args['nombre'] ?? null);
$correo = mb_strtolower($preguntar('Correo', $args['correo'] ?? null));
if ($nombre === '' || mb_strlen($nombre) > 120 || filter_var($correo, FILTER_VALIDATE_EMAIL) === false || strlen($correo) > 160) {
    fwrite(STDERR, "Nombre o correo no válidos.\n");
    exit(1);
}
if (fila('SELECT id FROM usuario WHERE correo = ?', [$correo]) !== null) {
    fwrite(STDERR, "Ya existe una cuenta con ese correo.\n");
    exit(1);
}
$clave = clave_temporal();
$id = insertar('usuario', [
    'nombre' => $nombre, 'correo' => $correo, 'contrasena_hash' => password_hash($clave, PASSWORD_DEFAULT),
    'rol' => 'coordinacion', 'debe_cambiar_clave' => 1,
]);
registrar_bitacora('usuario', $id, 'alta', null, ['nombre' => $nombre, 'correo' => $correo, 'rol' => 'coordinacion', 'estado' => 'activo', 'debe_cambiar_clave' => true], 'Primera cuenta de Coordinación (scripts/crear-coordinacion.php)');
echo "Cuenta creada: $nombre ($correo), rol Coordinación.\n";
echo "Contraseña temporal (se pide cambiarla al entrar): $clave\n";
