<?php

declare(strict_types=1);

/** Alcance "propios" de la matriz: qué grupos y asignaciones toca cada rol. Falla cerrado. */

/** Coordinación y Dirección ven todo; Dirección en modo consulta (especificación, 10.7). */
function ve_todo(array $u): bool
{
    return in_array($u['base'], ['coordinacion', 'direccion'], true);
}

/** Puede ver la lista de un grupo (inscripcion_grupo "de sus grupos"). */
function grupo_en_alcance(array $u, int $grupo_id): bool
{
    $existe = fila('SELECT id FROM grupo WHERE id = ?', [$grupo_id]) !== null;
    if (!$existe) {
        return false;
    }
    return match ($u['base']) {
        'coordinacion', 'direccion' => true,
        'docente' => fila('SELECT id FROM asignacion_docente WHERE grupo_id = ? AND docente_id = ? LIMIT 1', [$grupo_id, $u['id']]) !== null,
        'auxiliar' => fila('SELECT id FROM asignacion_auxiliar WHERE grupo_id = ? AND usuario_id = ?', [$grupo_id, $u['id']]) !== null,
        'alumno' => $u['alumno_id'] !== null && fila('SELECT id FROM inscripcion_grupo WHERE grupo_id = ? AND alumno_id = ? AND estado = \'activa\'', [$grupo_id, $u['alumno_id']]) !== null,
        default => false,
    };
}

function cargar_asignacion(int $id): ?array
{
    return fila(
        'SELECT a.id, a.grupo_id, a.materia_id, a.docente_id, m.clave AS materia_clave, m.nombre AS materia,
                g.clave AS grupo, g.programa, g.periodo_id, p.nombre AS periodo, p.estado AS periodo_estado,
                d.nombre AS docente
         FROM asignacion_docente a
         JOIN materia m ON m.id = a.materia_id
         JOIN grupo g ON g.id = a.grupo_id
         JOIN periodo p ON p.id = g.periodo_id
         JOIN usuario d ON d.id = a.docente_id
         WHERE a.id = ?',
        [$id]
    );
}

/** Devuelve la asignación si el rol puede verla; si no existe o no es suya, null (el caller niega igual). */
function asignacion_en_alcance(array $u, int $id): ?array
{
    $a = cargar_asignacion($id);
    if ($a === null) {
        return null;
    }
    if (ve_todo($u)) {
        return $a;
    }
    return $u['base'] === 'docente' && (int) $a['docente_id'] === (int) $u['id'] ? $a : null;
}

function lista_vigente(int $grupo_id): array
{
    return filas(
        'SELECT al.id AS alumno_id, al.identificador, al.nombre
         FROM inscripcion_grupo i JOIN alumno al ON al.id = i.alumno_id
         WHERE i.grupo_id = ? AND i.estado = \'activa\' ORDER BY al.nombre',
        [$grupo_id]
    );
}

function entrega_vigente(int $asignacion_id): ?array
{
    return fila(
        'SELECT e.*, r.nombre AS responsable
         FROM entrega_calificaciones e JOIN usuario r ON r.id = e.responsable_id
         WHERE e.asignacion_id = ? ORDER BY e.version DESC LIMIT 1',
        [$asignacion_id]
    );
}

function entrega_aceptada_vigente(int $asignacion_id): ?array
{
    return fila(
        'SELECT * FROM entrega_calificaciones WHERE asignacion_id = ? AND estado = \'aceptada\' ORDER BY version DESC LIMIT 1',
        [$asignacion_id]
    );
}
