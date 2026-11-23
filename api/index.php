<?php

declare(strict_types=1);

/** Único punto de entrada de la API: aplica las cabeceras, revisa la petición y despacha a rutas.php. */

require __DIR__ . '/nucleo.php';
foreach (['alcance', 'sesion', 'listas', 'entregas', 'cierres', 'metricas', 'administracion', 'correo-resend', 'correo-catalogo', 'acceso', 'plataforma', 'aula', 'aula-actividades', 'aula-mensajes'] as $archivo) {
    require __DIR__ . "/lib/$archivo.php";
}

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$ruta = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$ruta = '/' . trim((string) preg_replace('#^/api(?=/|$)#', '', $ruta), '/');

// CSRF: la cookie ya es SameSite=Strict; además, toda escritura exige JSON y un Origin propio.
if ($metodo !== 'GET') {
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
        error_http(415, 'La petición debe enviarse como JSON.');
    }
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origen !== '' && parse_url($origen, PHP_URL_HOST) . (parse_url($origen, PHP_URL_PORT) ? ':' . parse_url($origen, PHP_URL_PORT) : '') !== ($_SERVER['HTTP_HOST'] ?? '')) {
        error_http(403, 'La petición viene de un sitio no permitido.');
    }
}

$existe_ruta = false;
foreach (require __DIR__ . '/rutas.php' as [$m, $patron, $funcion]) {
    $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>\d+)', $patron) . '$#';
    if (preg_match($regex, $ruta, $coincidencias) !== 1) {
        continue;
    }
    $existe_ruta = true;
    if ($m !== $metodo) {
        continue;
    }
    guardia_de_peticion($metodo, $ruta);
    $funcion(array_filter($coincidencias, 'is_string', ARRAY_FILTER_USE_KEY));
}

if ($existe_ruta) {
    error_http(405, 'Método no permitido.');
}
error_http(404, 'Esa dirección no existe en el sistema.');
