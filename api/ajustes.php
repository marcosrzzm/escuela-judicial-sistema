<?php

declare(strict_types=1);

/**
 * Mientras no exista autorización escrita de la Escuela para usar datos reales (especificación, secciones
 * 8 y 10.5) la franja "Prototipo · datos ficticios" sigue encendida. Se apaga cambiando a false.
 */
const DATOS_FICTICIOS = true;

/**
 * Lee la configuración de un archivo fuera de la carpeta pública.
 * Orden de búsqueda: variable EJ_CONFIG, el .env de la raíz del repo (local) y
 * ej-config.env un nivel arriba de la carpeta pública (hosting).
 * Nunca se versiona ni se copia a publicar/.
 */
function cargar_config(): array
{
    $candidatos = array_filter([
        getenv('EJ_CONFIG') ?: null,
        dirname(__DIR__) . '/.env',
        dirname(__DIR__, 2) . '/ej-config.env',
    ]);
    $valores = [];
    foreach ($candidatos as $ruta) {
        if (!is_file($ruta)) {
            continue;
        }
        foreach (file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $linea) {
            $linea = trim($linea);
            if ($linea === '' || $linea[0] === '#' || !str_contains($linea, '=')) {
                continue;
            }
            [$clave, $valor] = explode('=', $linea, 2);
            $valores[trim($clave)] = trim($valor);
        }
        break;
    }
    if ($valores === []) {
        error_log('Sin archivo de configuracion');
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'El servicio no está disponible en este momento.']);
        exit;
    }

    return [
        'db_host' => $valores['DB_HOST'] ?? '127.0.0.1',
        'db_puerto' => (int) ($valores['MYSQL_PUERTO'] ?? 3306),
        'db_nombre' => $valores['DB_NOMBRE'] ?? '',
        'db_usuario' => $valores['DB_USUARIO'] ?? '',
        'db_contrasena' => $valores['DB_CONTRASENA'] ?? '',
        'entorno' => $valores['ENTORNO'] ?? 'produccion',
        // Correo por Resend (especificación, 10.6). Sin llave no se envía; solo en local el correo se guarda en seguridad/.
        'resend_llave' => $valores['RESEND_API_KEY'] ?? '',
        'correo_remitente' => $valores['CORREO_REMITENTE'] ?? '',
        'sitio_url' => rtrim($valores['SITIO_URL'] ?? '', '/'),
        // Lista de destinatarios permitidos mientras DATOS_FICTICIOS esté encendido: dominios completos o correos exactos.
        'correo_permitidos' => array_values(array_filter(array_map(static fn ($v) => strtolower(trim($v)), explode(',', $valores['CORREO_PERMITIDOS'] ?? '')))),
        'correo_tope_diario' => max(0, (int) ($valores['CORREO_TOPE_DIARIO'] ?? 50)),
        'web_puerto' => (int) ($valores['WEB_PUERTO'] ?? 5173),
        'cookie' => 'ej_sesion',
        'horas_sesion' => 8,
        // Supuesto por confirmar con la Escuela (especificación, sección 8).
        'calificacion_minima' => 8.0,
    ];
}
