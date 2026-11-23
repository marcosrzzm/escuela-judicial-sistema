<?php

declare(strict_types=1);

/**
 * Aula (especificación, sección 12), parte 1: acceso al curso, archivos, módulos y contenido.
 * Un curso es una asignación. El permiso base sale de api/permisos.php; aquí se comprueba, en cada petición,
 * que la persona pertenece al curso. Auxiliar y Carga externa no tienen ningún permiso del aula: 403 desde el permiso.
 */

// --- Acceso al curso (12.1) --------------------------------------------------------------------------

/** Cómo participa la persona en el curso: coordinacion, direccion, docente (el suyo), alumno (inscrito) o null. */
function modo_de_curso(array $u, array $curso): ?string
{
    return match ($u['base']) {
        'coordinacion', 'direccion' => $u['base'],
        'docente' => (int) $curso['docente_id'] === (int) $u['id'] ? 'docente' : null,
        'alumno' => $u['alumno_id'] !== null
            && fila('SELECT id FROM inscripcion_grupo WHERE grupo_id = ? AND alumno_id = ? AND estado = \'activa\'', [$curso['grupo_id'], $u['alumno_id']]) !== null
            ? 'alumno' : null,
        default => null,
    };
}

/** [curso, modo]: 403 (sin revelar si existe) cuando la persona no pertenece al curso. */
function curso_o_denegar(array $u, int $asignacion_id): array
{
    $curso = cargar_asignacion($asignacion_id);
    $modo = $curso === null ? null : modo_de_curso($u, $curso);
    if ($curso === null || $modo === null) {
        denegar("curso $asignacion_id");
    }
    return [$curso, $modo];
}

/** Escribir en el curso: permiso del recurso, pertenecer al curso como docente o Coordinación y periodo abierto. */
function curso_para_escribir(string $recurso, string $accion, int $asignacion_id): array
{
    $u = exigir_permiso($recurso, $accion);
    [$curso, $modo] = curso_o_denegar($u, $asignacion_id);
    if (!in_array($modo, ['docente', 'coordinacion'], true)) {
        denegar("$recurso:$accion en el curso $asignacion_id");
    }
    exigir_periodo_abierto($curso);
    return [$u, $curso, $modo];
}

function exigir_periodo_abierto(array $curso): void
{
    if ($curso['periodo_estado'] !== 'abierto') {
        error_http(409, 'El periodo de este curso está cerrado: el aula ya no admite cambios.');
    }
}

function bool_de(array $d, string $campo, ?int $por_omision = null): ?int
{
    if (!array_key_exists($campo, $d)) {
        return $por_omision;
    }
    if (!is_bool($d[$campo])) {
        error_http(422, "$campo no es válido.", [$campo => 'Debe ser verdadero o falso.']);
    }
    return $d[$campo] ? 1 : 0;
}

/** Fecha y hora en UTC ("Y-m-d H:i:s") a partir de un texto ISO; null si viene vacía. */
function fecha_hora(array $d, string $campo, string $etiqueta, bool $obligatoria = false): ?string
{
    $v = $d[$campo] ?? null;
    if ($v === null || $v === '') {
        if ($obligatoria) {
            error_http(422, "$etiqueta es obligatoria.", [$campo => "$etiqueta es obligatoria."]);
        }
        return null;
    }
    $t = is_string($v) ? strtotime($v) : false;
    if ($t === false) {
        error_http(422, "$etiqueta no es válida.", [$campo => 'Usa una fecha y hora válidas.']);
    }
    return gmdate('Y-m-d H:i:s', $t);
}

function curso_resumen(array $curso, string $modo): array
{
    return [
        'id' => (int) $curso['id'], 'grupo_id' => (int) $curso['grupo_id'], 'materia' => $curso['materia'], 'grupo' => $curso['grupo'], 'programa' => $curso['programa'],
        'periodo' => $curso['periodo'], 'periodo_estado' => $curso['periodo_estado'], 'docente' => $curso['docente'], 'modo' => $modo,
    ];
}

function ruta_curso(array $a): never
{
    $u = exigir_permiso('modulo', 'ver');
    [$curso, $modo] = curso_o_denegar($u, (int) $a['id']);
    $id = (int) $curso['id'];
    $alumno = $modo === 'alumno';
    $pub = $alumno ? ' AND publicada = 1' : '';
    $cuenta = static fn (string $tipo): int => (int) fila("SELECT COUNT(*) AS n FROM actividad WHERE asignacion_id = ? AND tipo = ? AND archivada = 0$pub", [$id, $tipo])['n'];
    $r = ['curso' => curso_resumen($curso, $modo), 'conteos' => ['tarea' => $cuenta('tarea'), 'examen' => $cuenta('examen'), 'foro' => $cuenta('foro')]];
    if (!$alumno) {
        $r['conteos']['por_calificar'] = (int) fila(
            'SELECT COUNT(*) AS n FROM (
               SELECT t.actividad_id, t.alumno_id FROM entrega_tarea t JOIN actividad ac ON ac.id = t.actividad_id
               WHERE ac.asignacion_id = ? AND ac.archivada = 0
                 AND t.id = (SELECT MAX(x.id) FROM entrega_tarea x WHERE x.actividad_id = t.actividad_id AND x.alumno_id = t.alumno_id)
                 AND NOT EXISTS (SELECT 1 FROM calificacion_actividad c WHERE c.actividad_id = t.actividad_id AND c.alumno_id = t.alumno_id AND c.entrega_id = t.id)
             ) p',
            [$id]
        )['n'];
    }
    responder(200, $r);
}

// --- Archivos (12.3) ---------------------------------------------------------------------------------

const ARCHIVO_MAX_BYTES = 10 * 1024 * 1024;

/** Extensión permitida y los tipos de contenido que finfo puede devolver para ella. */
const ARCHIVO_TIPOS = [
    'pdf' => ['application/pdf'],
    'doc' => ['application/msword', 'application/vnd.ms-office', 'application/x-ole-storage', 'application/cdfv2', 'application/cdfv2-unknown'],
    'xls' => ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/x-ole-storage', 'application/cdfv2', 'application/cdfv2-unknown'],
    'ppt' => ['application/vnd.ms-powerpoint', 'application/vnd.ms-office', 'application/x-ole-storage', 'application/cdfv2', 'application/cdfv2-unknown'],
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
    'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
    'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'application/octet-stream'],
    'txt' => ['text/plain'],
    'jpg' => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'png' => ['image/png'],
];

/** Revisa extensión y contenido real (finfo y firma); devuelve el tipo detectado o responde 422. */
function tipo_de_archivo_o_422(string $nombre, string $bytes): string
{
    $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
    if (!isset(ARCHIVO_TIPOS[$ext])) {
        error_http(422, 'Ese tipo de archivo no se admite. Usa PDF, Word, Excel, PowerPoint, texto, JPG o PNG.', ['archivo' => 'Tipo de archivo no permitido.']);
    }
    $tipo = strtolower((string) (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes));
    $firma_ole = str_starts_with($bytes, "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1");
    $valido = in_array($tipo, ARCHIVO_TIPOS[$ext], true) && match ($ext) {
        'doc', 'xls', 'ppt' => $firma_ole,
        'docx', 'xlsx', 'pptx' => str_starts_with($bytes, 'PK') && str_contains($bytes, '[Content_Types].xml'),
        'pdf' => str_starts_with(ltrim($bytes), '%PDF'),
        'txt' => !str_contains($bytes, "\0"),
        default => true,
    };
    if (!$valido) {
        error_http(422, 'El contenido del archivo no corresponde a su tipo. Revísalo y vuelve a subirlo.', ['archivo' => 'El contenido no corresponde al tipo.']);
    }
    return $tipo;
}

function carpeta_de_archivos(): string
{
    $dir = (string) config('archivos_dir');
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        error_log("No se pudo crear la carpeta de archivos $dir");
        error_http(500, 'El servicio no está disponible en este momento. Vuelve a intentarlo en unos minutos.');
    }
    return $dir;
}

function ruta_subir_archivo(): never
{
    $u = exigir_permiso('archivo', 'crear');
    // El cuerpo viaja en JSON con el archivo en base64 (la guardia de la API exige JSON): 10 MB pesan unos 14 MB así.
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 14 * 1024 * 1024 + 8192) {
        error_http(422, 'El archivo pesa más de 10 MB.', ['archivo' => 'Máximo 10 MB.']);
    }
    $d = cuerpo_json();
    $asignacion = isset($d['asignacion_id']) ? entero($d, 'asignacion_id', 'El curso') : null;
    if ($asignacion !== null) {
        [$curso, $modo] = curso_o_denegar($u, $asignacion);
        exigir_periodo_abierto($curso);
        if ($modo === 'direccion') {
            denegar('archivo:crear');
        }
    }
    $nombre = preg_replace('/[\x00-\x1F\x7F"\\\\\/]/u', '', basename(str_replace('\\', '/', texto($d, 'nombre', 200, 'El nombre del archivo')))) ?? '';
    $nombre = mb_substr(trim($nombre), 0, 200);
    $b64 = is_string($d['contenido'] ?? null) ? $d['contenido'] : '';
    $bytes = $b64 === '' ? false : base64_decode($b64, true);
    if ($bytes === false || $bytes === '') {
        error_http(422, 'No llegó el contenido del archivo.', ['archivo' => 'Elige un archivo.']);
    }
    if (strlen($bytes) > ARCHIVO_MAX_BYTES) {
        error_http(422, 'El archivo pesa más de 10 MB.', ['archivo' => 'Máximo 10 MB.']);
    }
    $tipo = tipo_de_archivo_o_422($nombre, $bytes);
    $interno = bin2hex(random_bytes(20));
    $ruta = carpeta_de_archivos() . "/$interno";
    if (file_put_contents($ruta, $bytes, LOCK_EX) === false) {
        error_log("No se pudo escribir $ruta");
        error_http(500, 'El servicio no está disponible en este momento. Vuelve a intentarlo en unos minutos.');
    }
    @chmod($ruta, 0640);
    $id = insertar('archivo', [
        'nombre_original' => $nombre, 'nombre_interno' => $interno, 'tipo' => $tipo, 'tamano' => strlen($bytes),
        'huella' => hash('sha256', $bytes), 'subido_por' => $u['id'], 'asignacion_id' => $asignacion,
    ]);
    registrar_bitacora('archivo', $id, 'subir', null, ['nombre' => $nombre, 'tamano' => strlen($bytes)]);
    responder(200, ['id' => $id, 'nombre' => $nombre, 'tamano' => strlen($bytes), 'tipo' => $tipo]);
}

/** Quien puede ver el elemento, la entrega o el mensaje que trae el archivo; quien lo subió, mientras no esté colgado. */
function puede_ver_archivo(array $u, array $archivo): bool
{
    $id = (int) $archivo['id'];
    if ((int) $archivo['subido_por'] === (int) $u['id']) {
        return true;
    }
    foreach (filas(
        'SELECT m.asignacion_id, e.publicado AS ep, e.archivado AS ea, m.publicado AS mp, m.archivado AS ma
         FROM elemento_modulo e JOIN modulo m ON m.id = e.modulo_id WHERE e.archivo_id = ?',
        [$id]
    ) as $e) {
        $curso = cargar_asignacion((int) $e['asignacion_id']);
        $modo = $curso === null ? null : modo_de_curso($u, $curso);
        if ($modo !== null && ($modo !== 'alumno' || ((int) $e['ep'] === 1 && (int) $e['mp'] === 1 && (int) $e['ea'] === 0 && (int) $e['ma'] === 0))) {
            return true;
        }
    }
    foreach (filas('SELECT t.alumno_id, ac.asignacion_id FROM entrega_tarea t JOIN actividad ac ON ac.id = t.actividad_id WHERE t.archivo_id = ?', [$id]) as $t) {
        $curso = cargar_asignacion((int) $t['asignacion_id']);
        $modo = $curso === null ? null : modo_de_curso($u, $curso);
        if ($modo !== null && ($modo !== 'alumno' || (int) $u['alumno_id'] === (int) $t['alumno_id'])) {
            return true;
        }
    }
    foreach (filas('SELECT conversacion_id FROM mensaje WHERE archivo_id = ?', [$id]) as $m) {
        if (puede_leer_conversacion($u, (int) $m['conversacion_id']) !== null) {
            return true;
        }
    }
    return false;
}

function ruta_descargar_archivo(array $a): never
{
    $u = exigir_permiso('archivo', 'ver');
    $archivo = fila('SELECT * FROM archivo WHERE id = ?', [(int) $a['id']]);
    if ($archivo === null || !puede_ver_archivo($u, $archivo)) {
        denegar('archivo ' . (int) $a['id']);
    }
    $ruta = carpeta_de_archivos() . '/' . $archivo['nombre_interno'];
    if (!is_file($ruta)) {
        error_log("Falta el archivo {$archivo['id']} en disco");
        error_http(404, 'El archivo ya no está disponible. Avisa a quien lo subió.');
    }
    $nombre = preg_replace('/[\x00-\x1F\x7F"\\\\\/;]/u', '_', $archivo['nombre_original']) ?? 'archivo';
    $ascii = preg_replace('/[^A-Za-z0-9._-]/', '_', $nombre) ?? 'archivo';
    http_response_code(200);
    header('Content-Type: ' . $archivo['tipo']);
    header("Content-Disposition: attachment; filename=\"$ascii\"; filename*=UTF-8''" . rawurlencode($nombre));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    header('Content-Length: ' . filesize($ruta));
    readfile($ruta);
    exit;
}

/** Cuelga un archivo recién subido por la misma persona de un elemento, una entrega o un mensaje. */
function vincular_archivo(int $archivo_id, array $u): void
{
    $archivo = fila('SELECT id, subido_por, vinculado FROM archivo WHERE id = ?', [$archivo_id]);
    if ($archivo === null || (int) $archivo['subido_por'] !== (int) $u['id'] || (int) $archivo['vinculado'] === 1) {
        error_http(422, 'El archivo no está disponible para adjuntarlo. Súbelo otra vez.', ['archivo_id' => 'Sube el archivo otra vez.']);
    }
    ejecutar('UPDATE archivo SET vinculado = 1 WHERE id = ?', [$archivo_id]);
}

function datos_de_archivo(?int $id): ?array
{
    return $id === null ? null : fila('SELECT id, nombre_original AS nombre, tamano FROM archivo WHERE id = ?', [$id]);
}

// --- Módulos y elementos (12.2) ----------------------------------------------------------------------

const TIPOS_ELEMENTO = ['pagina', 'archivo', 'enlace', 'tarea', 'examen', 'foro'];

function elemento_a_salida(array $e, bool $alumno): array
{
    $salida = [
        'id' => (int) $e['id'], 'modulo_id' => (int) $e['modulo_id'], 'tipo' => $e['tipo'], 'titulo' => $e['titulo'], 'texto' => $e['texto'], 'url' => $e['url'],
        'orden' => (int) $e['orden'], 'publicado' => (int) $e['publicado'] === 1,
        'archivo' => datos_de_archivo($e['archivo_id'] === null ? null : (int) $e['archivo_id']),
        'actividad_id' => $e['actividad_id'] === null ? null : (int) $e['actividad_id'],
    ];
    if ($e['actividad_id'] !== null) {
        $ac = fila('SELECT publicada FROM actividad WHERE id = ?', [$e['actividad_id']]);
        $salida['actividad_publicada'] = $ac !== null && (int) $ac['publicada'] === 1;
    }
    return $salida;
}

function modulos_de(int $asignacion_id, bool $alumno): array
{
    $mods = filas('SELECT * FROM modulo WHERE asignacion_id = ? AND archivado = 0' . ($alumno ? ' AND publicado = 1' : '') . ' ORDER BY orden, id', [$asignacion_id]);
    $salida = [];
    foreach ($mods as $m) {
        $els = filas('SELECT * FROM elemento_modulo WHERE modulo_id = ? AND archivado = 0' . ($alumno ? ' AND publicado = 1' : '') . ' ORDER BY orden, id', [$m['id']]);
        $items = [];
        foreach ($els as $e) {
            $x = elemento_a_salida($e, $alumno);
            // Para el alumno, una tarea, examen o foro sin publicar no existe.
            if ($alumno && isset($x['actividad_publicada']) && !$x['actividad_publicada']) {
                continue;
            }
            $items[] = $x;
        }
        $salida[] = ['id' => (int) $m['id'], 'titulo' => $m['titulo'], 'orden' => (int) $m['orden'], 'publicado' => (int) $m['publicado'] === 1, 'elementos' => $items];
    }
    return $salida;
}

function ruta_modulos(array $a): never
{
    $u = exigir_permiso('modulo', 'ver');
    [$curso, $modo] = curso_o_denegar($u, (int) $a['id']);
    responder(200, ['curso' => curso_resumen($curso, $modo), 'modulos' => modulos_de((int) $curso['id'], $modo === 'alumno')]);
}

function ruta_crear_modulo(array $a): never
{
    [$u, $curso] = curso_para_escribir('modulo', 'crear', (int) $a['id']);
    $d = cuerpo_json();
    $titulo = texto($d, 'titulo', 160, 'El título');
    $publicado = bool_de($d, 'publicado', 0);
    $orden = (int) fila('SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM modulo WHERE asignacion_id = ?', [$curso['id']])['n'];
    $id = insertar('modulo', ['asignacion_id' => $curso['id'], 'titulo' => $titulo, 'orden' => $orden, 'publicado' => $publicado, 'creado_por' => $u['id']]);
    registrar_bitacora('modulo', $id, 'crear', null, ['titulo' => $titulo, 'publicado' => (bool) $publicado]);
    responder(200, ['id' => $id]);
}

function modulo_para_escribir(int $id): array
{
    exigir_sesion();
    $m = fila('SELECT * FROM modulo WHERE id = ?', [$id]);
    if ($m === null) {
        exigir_permiso('modulo', 'modificar');
        denegar("módulo $id");
    }
    [, $curso] = curso_para_escribir('modulo', 'modificar', (int) $m['asignacion_id']);
    return [$m, $curso];
}

/** Aplica publicado, archivado y orden con su bitácora; devuelve los campos que cambiaron. */
function cambiar_estado_de(string $tabla, string $entidad, array $fila, array $d): void
{
    $cambios = [];
    foreach (['publicado', 'archivado'] as $campo) {
        $v = bool_de($d, $campo);
        if ($v !== null && $v !== (int) $fila[$campo]) {
            $cambios[$campo] = $v;
        }
    }
    if (isset($d['orden'])) {
        $cambios['orden'] = entero($d, 'orden', 'El orden');
    }
    if ($cambios === []) {
        return;
    }
    $sets = implode(', ', array_map(static fn (string $c): string => "$c = ?", array_keys($cambios)));
    ejecutar("UPDATE $tabla SET $sets WHERE id = ?", [...array_values($cambios), $fila['id']]);
    foreach ($cambios as $campo => $v) {
        $accion = match (true) {
            $campo === 'publicado' => $v === 1 ? 'publicar' : 'ocultar',
            $campo === 'archivado' => $v === 1 ? 'archivar' : 'restaurar',
            default => 'ordenar',
        };
        registrar_bitacora($entidad, (int) $fila['id'], $accion, [$campo => (int) $fila[$campo]], [$campo => $v]);
    }
}

function ruta_editar_modulo(array $a): never
{
    [$m] = modulo_para_escribir((int) $a['id']);
    $d = cuerpo_json();
    if (isset($d['titulo'])) {
        $titulo = texto($d, 'titulo', 160, 'El título');
        ejecutar('UPDATE modulo SET titulo = ? WHERE id = ?', [$titulo, $m['id']]);
        registrar_bitacora('modulo', (int) $m['id'], 'renombrar', ['titulo' => $m['titulo']], ['titulo' => $titulo]);
    }
    cambiar_estado_de('modulo', 'modulo', $m, $d);
    responder(200, ['id' => (int) $m['id']]);
}

/** Valida los campos de un elemento según su tipo y devuelve las columnas a guardar. */
function campos_de_elemento(array $d, string $tipo, array $curso, array $u): array
{
    $c = ['titulo' => texto($d, 'titulo', 160, 'El título'), 'texto' => null, 'url' => null, 'archivo_id' => null, 'actividad_id' => null];
    if ($tipo === 'pagina') {
        $c['texto'] = texto($d, 'texto', 20000, 'El texto de la página');
    } elseif ($tipo === 'enlace') {
        $c['url'] = texto($d, 'url', 300, 'El enlace');
        if (preg_match('#^https?://[^\s]+$#i', $c['url']) !== 1) {
            error_http(422, 'El enlace debe empezar con http:// o https://.', ['url' => 'Escribe una dirección completa.']);
        }
        $c['texto'] = texto($d, 'texto', 2000, 'La descripción', false) ?: null;
    } elseif ($tipo === 'archivo') {
        $c['archivo_id'] = entero($d, 'archivo_id', 'El archivo');
        $c['texto'] = texto($d, 'texto', 2000, 'La descripción', false) ?: null;
    } else {
        $c['actividad_id'] = entero($d, 'actividad_id', 'La actividad');
        $ac = fila('SELECT id, tipo, asignacion_id FROM actividad WHERE id = ?', [$c['actividad_id']]);
        if ($ac === null || (int) $ac['asignacion_id'] !== (int) $curso['id'] || $ac['tipo'] !== $tipo) {
            error_http(422, 'La actividad no es de este curso.', ['actividad_id' => 'Elige una actividad de este curso.']);
        }
    }
    return $c;
}

function ruta_crear_elemento(array $a): never
{
    [$m, $curso] = modulo_para_escribir((int) $a['id']);
    $u = exigir_sesion();
    $d = cuerpo_json();
    $tipo = una_de($d, 'tipo', TIPOS_ELEMENTO, 'El tipo');
    $c = campos_de_elemento($d, $tipo, $curso, $u);
    $id = transaccion(function () use ($m, $tipo, $c, $d, $u): int {
        if ($c['archivo_id'] !== null) {
            vincular_archivo($c['archivo_id'], $u);
        }
        $orden = (int) fila('SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM elemento_modulo WHERE modulo_id = ?', [$m['id']])['n'];
        return insertar('elemento_modulo', ['modulo_id' => $m['id'], 'tipo' => $tipo, 'orden' => $orden, 'publicado' => bool_de($d, 'publicado', 0)] + $c);
    });
    registrar_bitacora('elemento_modulo', $id, 'crear', null, ['tipo' => $tipo, 'titulo' => $c['titulo'], 'publicado' => (bool) bool_de($d, 'publicado', 0)]);
    responder(200, ['id' => $id]);
}

function elemento_con_curso(int $id): ?array
{
    return fila(
        'SELECT e.*, m.asignacion_id, m.publicado AS modulo_publicado, m.archivado AS modulo_archivado
         FROM elemento_modulo e JOIN modulo m ON m.id = e.modulo_id WHERE e.id = ?',
        [$id]
    );
}

function ruta_elemento(array $a): never
{
    $u = exigir_permiso('modulo', 'ver');
    $e = elemento_con_curso((int) $a['id']);
    if ($e === null) {
        denegar('elemento ' . (int) $a['id']);
    }
    [, $modo] = curso_o_denegar($u, (int) $e['asignacion_id']);
    $alumno = $modo === 'alumno';
    $oculto = (int) $e['publicado'] !== 1 || (int) $e['archivado'] === 1 || (int) $e['modulo_publicado'] !== 1 || (int) $e['modulo_archivado'] === 1;
    $salida = elemento_a_salida($e, $alumno);
    if ($oculto && $alumno || ($alumno && isset($salida['actividad_publicada']) && !$salida['actividad_publicada'])) {
        error_http(404, 'Ese contenido no existe o todavía no está publicado.');
    }
    responder(200, $salida);
}

function ruta_editar_elemento(array $a): never
{
    exigir_sesion();
    $e = elemento_con_curso((int) $a['id']);
    if ($e === null) {
        exigir_permiso('modulo', 'modificar');
        denegar('elemento ' . (int) $a['id']);
    }
    curso_para_escribir('modulo', 'modificar', (int) $e['asignacion_id']);
    $d = cuerpo_json();
    $cambios = [];
    foreach (['titulo' => 160, 'texto' => 20000] as $campo => $max) {
        if (isset($d[$campo]) && ($campo !== 'texto' || in_array($e['tipo'], ['pagina', 'enlace', 'archivo'], true))) {
            $cambios[$campo] = texto($d, $campo, $max, $campo === 'titulo' ? 'El título' : 'El texto');
        }
    }
    if (isset($d['url']) && $e['tipo'] === 'enlace') {
        $cambios['url'] = texto($d, 'url', 300, 'El enlace');
        if (preg_match('#^https?://[^\s]+$#i', $cambios['url']) !== 1) {
            error_http(422, 'El enlace debe empezar con http:// o https://.', ['url' => 'Escribe una dirección completa.']);
        }
    }
    if ($cambios !== []) {
        $sets = implode(', ', array_map(static fn (string $c): string => "$c = ?", array_keys($cambios)));
        ejecutar("UPDATE elemento_modulo SET $sets WHERE id = ?", [...array_values($cambios), $e['id']]);
        registrar_bitacora('elemento_modulo', (int) $e['id'], 'editar', array_intersect_key($e, $cambios), $cambios);
    }
    cambiar_estado_de('elemento_modulo', 'elemento_modulo', $e, $d);
    responder(200, ['id' => (int) $e['id']]);
}

// --- Respaldo diario (12.11) -------------------------------------------------------------------------

/** Fecha y tamaño del último respaldo, solo para Coordinación y sin descarga: el archivo vive fuera de la carpeta pública. */
function ruta_ultimo_respaldo(): never
{
    exigir_admin('usuario', 'crear');
    $ultimo = null;
    foreach (glob(rtrim((string) config('respaldos_dir'), '/') . '/respaldo-*.sql.gz') ?: [] as $f) {
        if (preg_match('/respaldo-\d{4}-\d{2}-\d{2}-\d{4}\.sql\.gz$/', $f) === 1 && ($ultimo === null || filemtime($f) > filemtime($ultimo))) {
            $ultimo = $f;
        }
    }
    responder(200, ['ultimo' => $ultimo === null ? null : ['fecha' => gmdate('Y-m-d H:i:s', (int) filemtime($ultimo)), 'bytes' => (int) filesize($ultimo)]]);
}
