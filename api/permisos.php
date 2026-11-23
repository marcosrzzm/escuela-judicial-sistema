<?php

declare(strict_types=1);

/**
 * Matriz de permisos: única fuente (especificación, sección 4). Se valida en el servidor en
 * cada petición. Donde la matriz dice "propios" o "solo captura excepcional", este archivo
 * da el permiso base y el endpoint comprueba el alcance con las funciones de alcance.php.
 * Acciones: ver, crear, modificar; la entrega agrega aceptar, devolver y reabrir (el
 * paréntesis de la celda de Coordinación).
 */
const MATRIZ_PERMISOS = [
    'coordinacion' => [
        'periodo' => ['ver', 'crear', 'modificar'],
        'grupo' => ['ver', 'crear', 'modificar'],
        'alumno' => ['ver', 'crear', 'modificar'],
        'inscripcion_grupo' => ['ver', 'crear', 'modificar'],
        'usuario' => ['ver', 'crear', 'modificar'],
        'rol' => ['ver', 'crear', 'modificar'],
        'ver_como' => ['ver'],
        'materia' => ['ver', 'crear', 'modificar'],
        'asignacion_docente' => ['ver', 'crear', 'modificar'],
        'decision_evaluacion' => ['ver', 'crear'],
        'entrega_calificaciones' => ['ver', 'crear', 'modificar', 'aceptar', 'devolver', 'reabrir'],
        'calificacion' => ['ver'],
        'pendiente_academico' => ['ver', 'crear', 'modificar'],
        'cierre' => ['ver', 'crear', 'modificar'],
        'documento_academico' => ['ver', 'crear'],
        'lote_entrega' => ['ver', 'crear'],
        'registro_carga_externa' => ['ver'],
        'bitacora_cambio' => ['ver'],
        'metrica_caso' => ['ver', 'crear'],
        // Aula (sección 12.12).
        'modulo' => ['ver', 'crear', 'modificar'],
        'archivo' => ['ver', 'crear'],
        'actividad' => ['ver', 'crear', 'modificar'],
        'entrega_tarea' => ['ver'],
        'calificacion_actividad' => ['ver', 'modificar'],
        'intento_examen' => ['ver'],
        'mensaje' => ['ver', 'crear'],
        'publicacion_foro' => ['ver', 'crear', 'modificar'],
    ],
    'docente' => [
        'periodo' => ['ver'],
        'grupo' => ['ver'],
        'alumno' => ['ver'],
        'inscripcion_grupo' => ['ver'],
        'materia' => ['ver'],
        'asignacion_docente' => ['ver'],
        'decision_evaluacion' => ['ver'],
        'entrega_calificaciones' => ['ver', 'crear', 'modificar'],
        'calificacion' => ['ver', 'crear', 'modificar'],
        // Aula (12.12): solo de sus cursos; el servidor comprueba el curso en cada petición.
        'modulo' => ['ver', 'crear', 'modificar'],
        'archivo' => ['ver', 'crear'],
        'actividad' => ['ver', 'crear', 'modificar'],
        'entrega_tarea' => ['ver'],
        'calificacion_actividad' => ['ver', 'crear', 'modificar'],
        'intento_examen' => ['ver', 'modificar'],
        'mensaje' => ['ver', 'crear'],
        'publicacion_foro' => ['ver', 'crear', 'modificar'],
    ],
    // Dirección ve todo lo que ve Coordinación, en modo consulta (especificación, 10.7); solo escribe para
    // autorizar los casos que se le envían. Usuarios y roles: solo ver.
    'direccion' => [
        'periodo' => ['ver'],
        'grupo' => ['ver'],
        'alumno' => ['ver'],
        'inscripcion_grupo' => ['ver'],
        'usuario' => ['ver'],
        'rol' => ['ver'],
        'materia' => ['ver'],
        'asignacion_docente' => ['ver'],
        'decision_evaluacion' => ['ver', 'modificar'],
        'entrega_calificaciones' => ['ver'],
        'calificacion' => ['ver'],
        'pendiente_academico' => ['ver'],
        'cierre' => ['ver', 'modificar'],
        'documento_academico' => ['ver'],
        'lote_entrega' => ['ver'],
        'registro_carga_externa' => ['ver'],
        'bitacora_cambio' => ['ver'],
        'metrica_caso' => ['ver'],
        // Aula (12.12): lectura de todo y mensajes propios; ninguna otra escritura.
        'modulo' => ['ver'],
        'archivo' => ['ver'],
        'actividad' => ['ver'],
        'entrega_tarea' => ['ver'],
        'calificacion_actividad' => ['ver'],
        'intento_examen' => ['ver'],
        'mensaje' => ['ver', 'crear'],
        'publicacion_foro' => ['ver'],
    ],
    'carga_externa' => [
        'periodo' => ['ver'],
        'grupo' => ['ver'],
        'materia' => ['ver'],
        'cierre' => ['ver'],
        'lote_entrega' => ['ver'],
        'registro_carga_externa' => ['ver', 'crear', 'modificar'],
    ],
    'auxiliar' => [
        'periodo' => ['ver'],
        'grupo' => ['ver'],
        'alumno' => ['ver'],
        'inscripcion_grupo' => ['ver'],
    ],
    // Alumno (sección 11.8): solo sus propios datos; cada endpoint comprueba su alumno_id además del permiso.
    'alumno' => [
        'periodo' => ['ver'],
        'grupo' => ['ver'],
        'decision_evaluacion' => ['ver'],
        'calificacion' => ['ver'],
        'pendiente_academico' => ['ver'],
        // Aula (12.12): solo lo publicado de sus cursos y lo propio; cada endpoint comprueba su alumno_id.
        'modulo' => ['ver'],
        'archivo' => ['ver', 'crear'],
        'actividad' => ['ver'],
        'entrega_tarea' => ['ver', 'crear'],
        'calificacion_actividad' => ['ver'],
        'intento_examen' => ['ver', 'crear'],
        'mensaje' => ['ver', 'crear'],
        'publicacion_foro' => ['ver', 'crear'],
    ],
];

/**
 * Lo que ningún rol personalizado puede tener (sección 10.2): administración de usuarios y de roles,
 * y la vista como otro usuario. Solo el rol del sistema coordinacion los trae de la matriz.
 */
const PROHIBIDOS_EN_ROL_PERSONALIZADO = ['usuario:crear', 'usuario:modificar', 'rol:crear', 'rol:modificar', 'ver_como:ver'];

/** Lista "recurso:accion" de la matriz para un rol base. */
function permisos_del_rol(string $base): array
{
    $lista = [];
    foreach (MATRIZ_PERMISOS[$base] ?? [] as $recurso => $acciones) {
        foreach ($acciones as $accion) {
            $lista[] = "$recurso:$accion";
        }
    }
    return $lista;
}

/** Techo de un rol personalizado con esa base: lo de la matriz menos lo prohibido. */
function techo_de_base(string $base): array
{
    return array_values(array_diff(permisos_del_rol($base), PROHIBIDOS_EN_ROL_PERSONALIZADO));
}

/** Un rol del sistema usa la matriz; uno personalizado, su lista guardada recortada al techo de su base. */
function permisos_de_rol(string $base, bool $es_sistema, ?string $json): array
{
    if ($es_sistema) {
        return permisos_del_rol($base);
    }
    $guardados = json_decode((string) $json, true);
    return array_values(array_intersect(is_array($guardados) ? $guardados : [], techo_de_base($base)));
}

/** Permiso del usuario efectivo de la petición (con "ver como", el de la cuenta vista). */
function tiene_permiso(array $u, string $recurso, string $accion): bool
{
    return in_array("$recurso:$accion", $u['permisos'], true);
}
