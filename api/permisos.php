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
        'periodo' => ['ver'],
        'grupo' => ['ver'],
        'alumno' => ['ver', 'crear'],
        'inscripcion_grupo' => ['ver', 'crear', 'modificar'],
        'usuario' => ['ver'],
        'materia' => ['ver'],
        'asignacion_docente' => ['ver'],
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
    ],
    'direccion' => [
        'periodo' => ['ver'],
        'grupo' => ['ver'],
        'alumno' => ['ver'],
        'inscripcion_grupo' => ['ver'],
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
];

function tiene_permiso(string $rol, string $recurso, string $accion): bool
{
    return in_array($accion, MATRIZ_PERMISOS[$rol][$recurso] ?? [], true);
}

/** Lista "recurso:accion" que se manda al navegador solo para decidir qué mostrar. */
function permisos_del_rol(string $rol): array
{
    $lista = [];
    foreach (MATRIZ_PERMISOS[$rol] ?? [] as $recurso => $acciones) {
        foreach ($acciones as $accion) {
            $lista[] = "$recurso:$accion";
        }
    }
    return $lista;
}
