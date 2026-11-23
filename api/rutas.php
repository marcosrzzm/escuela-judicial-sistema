<?php

declare(strict_types=1);

/**
 * Todas las rutas de la API. Cada una dice su método, su patrón y la función que la atiende;
 * el permiso por recurso y acción se exige dentro de la función (nucleo.php, permisos.php).
 * No existe ninguna ruta que firme documentos ni que escriba en la plataforma oficial (RN-12).
 */
return [
    ['POST', '/login', 'ruta_login'],
    ['POST', '/logout', 'ruta_logout'],
    ['GET', '/sesion', 'ruta_sesion'],
    ['GET', '/ajustes-publicos', 'ruta_ajustes_publicos'],
    ['PUT', '/mi-clave', 'ruta_mi_clave'],
    ['POST', '/ver-como/{id}', 'ruta_ver_como'],
    ['POST', '/ver-como/salir', 'ruta_ver_como_salir'],

    ['GET', '/usuarios', 'ruta_usuarios'],
    ['POST', '/usuarios', 'ruta_crear_usuario'],
    ['PUT', '/usuarios/{id}', 'ruta_editar_usuario'],
    ['PUT', '/usuarios/{id}/clave-temporal', 'ruta_clave_temporal'],
    ['PUT', '/usuarios/{id}/grupos-auxiliar', 'ruta_grupos_auxiliar'],
    ['GET', '/roles', 'ruta_roles'],
    ['POST', '/roles', 'ruta_crear_rol'],
    ['PUT', '/roles/{id}', 'ruta_editar_rol'],

    ['GET', '/materias', 'ruta_materias'],
    ['POST', '/materias', 'ruta_crear_materia'],
    ['PUT', '/materias/{id}', 'ruta_editar_materia'],
    ['POST', '/periodos', 'ruta_crear_periodo'],
    ['PUT', '/periodos/{id}', 'ruta_editar_periodo'],
    ['POST', '/grupos', 'ruta_crear_grupo'],
    ['PUT', '/grupos/{id}', 'ruta_editar_grupo'],
    ['GET', '/docentes', 'ruta_docentes'],
    ['POST', '/asignaciones', 'ruta_crear_asignacion'],
    ['PUT', '/asignaciones/{id}', 'ruta_cambiar_docente'],
    ['PUT', '/alumnos/{id}', 'ruta_editar_alumno'],
    ['POST', '/grupos/{id}/importar', 'ruta_importar_lista'],

    ['GET', '/inicio', 'ruta_inicio'],
    ['GET', '/periodos', 'ruta_periodos'],
    ['GET', '/grupos', 'ruta_grupos'],
    ['GET', '/grupos/{id}/lista', 'ruta_lista_grupo'],
    ['POST', '/grupos/{id}/inscripciones', 'ruta_alta_inscripcion'],
    ['PUT', '/inscripciones/{id}/baja', 'ruta_baja_inscripcion'],

    ['GET', '/alumnos', 'ruta_alumnos'],
    ['GET', '/alumnos/{id}/historial', 'ruta_historial'],
    ['POST', '/alumnos/{id}/pendientes', 'ruta_crear_pendiente'],
    ['PUT', '/pendientes/{id}/resolver', 'ruta_resolver_pendiente'],

    ['GET', '/asignaciones', 'ruta_asignaciones'],
    ['GET', '/asignaciones/{id}', 'ruta_asignacion'],
    ['POST', '/asignaciones/{id}/decisiones', 'ruta_crear_decision'],
    ['POST', '/asignaciones/{id}/entrega', 'ruta_crear_entrega'],
    ['POST', '/asignaciones/{id}/captura-excepcional', 'ruta_captura_excepcional'],
    ['GET', '/autorizaciones', 'ruta_autorizaciones'],
    ['PUT', '/decisiones/{id}/resolver', 'ruta_resolver_decision'],

    ['GET', '/entregas/{id}', 'ruta_entrega'],
    ['PUT', '/entregas/{id}/calificaciones', 'ruta_guardar_calificaciones'],
    ['POST', '/entregas/{id}/enviar', 'ruta_enviar_entrega'],
    ['PUT', '/entregas/{id}/aceptar', 'ruta_aceptar'],
    ['PUT', '/entregas/{id}/devolver', 'ruta_devolver'],
    ['PUT', '/entregas/{id}/reabrir', 'ruta_reabrir'],

    ['GET', '/grupos/{id}/cierre', 'ruta_cierre_grupo'],
    ['POST', '/grupos/{id}/cierres', 'ruta_preparar_cierre'],
    ['PUT', '/cierres/{id}/aprobar', 'ruta_aprobar_cierre'],
    ['PUT', '/cierres/{id}/enviar-autorizacion', 'ruta_enviar_autorizacion'],
    ['PUT', '/cierres/{id}/resolver', 'ruta_resolver_cierre'],
    ['POST', '/cierres/{id}/lote', 'ruta_generar_lote'],
    ['GET', '/cierres/{id}/boletas', 'ruta_boletas'],

    ['GET', '/lotes', 'ruta_lotes'],
    ['GET', '/lotes/{id}/csv', 'ruta_csv_lote'],
    ['PUT', '/lotes/{id}/recepcion', 'ruta_recepcion_lote'],
    ['PUT', '/lotes/{id}/carga', 'ruta_carga_lote'],

    ['GET', '/metricas', 'ruta_metricas'],
    ['POST', '/metricas/linea-base', 'ruta_linea_base'],
    ['POST', '/metricas/tiempo', 'ruta_tiempo'],
    ['GET', '/bitacora', 'ruta_bitacora'],
];
