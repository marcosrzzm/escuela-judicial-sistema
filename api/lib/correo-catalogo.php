<?php

declare(strict_types=1);

/**
 * Correos de acceso de este sistema. Salen del catálogo estándar de Elevalia (marca-elevalia, tipos
 * `invitacion` y `enlace_acceso`/`codigo` de recuperación) con la vigencia de la especificación, 10.6:
 * 72 horas la invitación y 24 horas el restablecimiento, un solo enlace y un solo uso.
 * {marca} se sustituye por marca[nombre].
 */
function correo_catalogo(): array
{
    return [
        'invitacion' => [
            'asunto' => 'Crea tu contraseña del {marca}',
            'campos' => [
                'Te invitó' => '{quien}',
                'Enlace' => '{enlace}',
                'Vigencia' => '72 horas y un solo uso',
                'Aviso' => 'Con este enlace eliges tu contraseña. Si no esperabas esta invitación, ignora el correo.',
            ],
        ],
        'restablecer' => [
            'asunto' => 'Elige una contraseña nueva para el {marca}',
            'campos' => [
                'Te lo mandó' => '{quien}',
                'Enlace' => '{enlace}',
                'Vigencia' => '24 horas y un solo uso',
                'Aviso' => 'Si no lo esperabas, ignora el correo: tu contraseña sigue igual.',
            ],
        ],
    ];
}

/** Asunto y campos del tipo pedido con {marca}, {quien} y {enlace} resueltos. */
function correo_armar(string $tipo, array $marca, string $quien, string $enlace): array
{
    $c = correo_catalogo()[$tipo];
    $sustituir = static fn (string $t): string => str_replace(['{marca}', '{quien}', '{enlace}'], [(string) $marca['nombre'], $quien, $enlace], $t);
    return [$sustituir($c['asunto']), array_map($sustituir, $c['campos'])];
}
