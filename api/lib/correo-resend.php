<?php
/**
 * Correo por Resend, sin librerías ni dependencias de ninguna marca. Fuente única de Elevalia
 * (plugin marca-elevalia, assets/correo). Se copia tal cual a la carpeta api/ del sitio.
 *
 * Regla: todo correo de un sitio o sistema sale por Resend, con la cuenta del cliente.
 * La llave vive en correo.php FUERA de public_html, nunca en git ni en el navegador.
 *
 * correo.php devuelve: ['llave' => 're_...', 'de' => 'Marca <avisos@dominio>', 'para' => 'a@x.com,b@x.com',
 *   'marca' => ['nombre' => 'Marca', 'color' => '#072A5B', 'acento' => '#22A98E', 'fondo' => '#F5F6F1',
 *               'pie' => 'Texto del pie', 'direccion' => 'Ciudad, Estado', 'sitio' => 'https://dominio',
 *               'logo' => 'https://dominio/logo.png', 'logo_ancho' => 170, 'logo_alto' => 33, 'tipografia' => 'Poppins']]
 *   (logo opcional: PNG en https, al doble de ancho que logo_ancho; con logo_ancho el logotipo va solo, sin repetir el nombre;
 *   sin él, el nombre en texto. tipografia: familia de marca, con el sistema de respaldo)
 *
 * Sin llave, remitente o destino devuelve false sin hacer nada: quien llama ya guardó el dato.
 * Si Resend rechaza el envío registra solo el código (sin llave ni direcciones) y devuelve false;
 * nunca lanza, para no tumbar el formulario.
 *
 * $campos: ['Nombre' => 'Ana'] se pinta como tabla. Una etiqueta 'Código' sale grande para copiar;
 *   un valor que empieza con https:// sale como enlace simple (nunca botón ni imagen).
 * $adjuntos: [['filename' => 'plano.pdf', 'content' => base64]].
 * $soloTexto: solo si se pide texto plano. Por defecto todo correo, también los avisos internos, lleva HTML de marca;
 * Principal en Gmail se asegura con el filtro del destinatario (references/entregabilidad.md).
 * $marca: arreglo de marca; si va vacío el correo sale con una marca neutra.
 */

function correo_resend(
    string $llave,
    string $de,
    array $para,
    string $asunto,
    array $campos,
    string $responderA = '',
    array $adjuntos = [],
    bool $soloTexto = false,
    array $marca = []
): bool {
    $para = array_values(array_filter(array_map('trim', $para), static fn ($c) => filter_var($c, FILTER_VALIDATE_EMAIL)));
    if ($llave === '' || $de === '' || !$para || !function_exists('curl_init')) {
        return false;
    }

    // Sin saltos de línea: el asunto llega de datos del visitante.
    $asunto = trim(preg_replace('/[\r\n]+/', ' ', $asunto) ?? '');
    $cuerpo = [
        'from'    => $de,
        'to'      => $para,
        'subject' => $asunto,
        'text'    => correo_texto($asunto, $campos, $marca),
    ];
    if (!$soloTexto) {
        $cuerpo['html'] = correo_html($asunto, $campos, $marca);
    }
    if (filter_var($responderA, FILTER_VALIDATE_EMAIL)) {
        $cuerpo['reply_to'] = $responderA;
    }
    if ($adjuntos) {
        $cuerpo['attachments'] = $adjuntos;
    }

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $llave, 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($cuerpo, JSON_UNESCAPED_UNICODE),
    ]);
    curl_exec($ch);
    $codigo = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($codigo < 200 || $codigo >= 300) {
        error_log('[correo-resend] Resend respondió ' . $codigo);
        return false;
    }
    return true;
}

/** Lee correo.php (fuera de public_html). null si falta el archivo, la llave o el remitente. */
function correo_config(string $ruta): ?array
{
    $c = is_file($ruta) ? include $ruta : null;
    return is_array($c) && (string) ($c['llave'] ?? '') !== '' && (string) ($c['de'] ?? '') !== '' ? $c : null;
}

/** Atajo: envía con la llave, el remitente y la marca de la configuración. $para vacío = 'para' de la config. */
function correo_enviar(array $c, array $para, string $asunto, array $campos, string $responderA = '', bool $soloTexto = false): bool
{
    $para = $para ?: explode(',', (string) ($c['para'] ?? ''));
    return correo_resend((string) $c['llave'], (string) $c['de'], $para, $asunto, $campos, $responderA, [], $soloTexto, (array) ($c['marca'] ?? []));
}

/** Valida #RRGGBB; si no, usa el valor por defecto. */
function correo_color($v, string $def): string
{
    return preg_match('/^#[0-9A-Fa-f]{6}$/', (string) $v) === 1 ? (string) $v : $def;
}

/**
 * HTML con la marca. Todo el estilo va en línea (Gmail y Outlook), tipografías de sistema (sin Google Fonts),
 * una sola imagen (el logotipo, si la marca trae 'logo' en https y PNG; si no, el nombre en texto) y modo oscuro por color-scheme, prefers-color-scheme
 * y [data-ogsc] (Outlook). Clases m-*: solo para las reglas oscuras.
 */
function correo_html(string $asunto, array $campos, array $marca = []): string
{
    $e = static fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $color  = correo_color($marca['color'] ?? '', '#1F2A44');
    $acento = correo_color($marca['acento'] ?? '', '#2F6FED');
    $fondo  = correo_color($marca['fondo'] ?? '', '#F4F5F7');
    $nombre = $e($marca['nombre'] ?? '');
    $pie    = $e($marca['pie'] ?? ($marca['nombre'] ?? ''));
    $dir    = $e($marca['direccion'] ?? '');
    $sitio  = (string) ($marca['sitio'] ?? '');
    $logo   = (string) ($marca['logo'] ?? '');
    $logo   = preg_match('#^https://\S+\.png$#i', $logo) === 1 ? $logo : '';
    // Tipografía de marca primero y el sistema de respaldo: sin webfont (Gmail la ignora) se ve igual de ordenado.
    $tipo   = preg_replace('/[^A-Za-z0-9 ,\'-]/', '', (string) ($marca['tipografia'] ?? '')) ?? '';
    $fuente = ($tipo !== '' ? $tipo . ',' : '') . "'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
    // logo_ancho y logo_alto (px, el PNG va al doble de ancho): logotipo completo que ya dice el nombre, sin repetirlo en texto.
    // Sin logo_ancho queda el comportamiento anterior: icono de 40 px junto al nombre.
    $lAncho = max(0, min(280, (int) ($marca['logo_ancho'] ?? 0)));
    $lAlto  = max(0, min(120, (int) ($marca['logo_alto'] ?? 0)));
    $cabecera = $logo !== '' && $lAncho > 0
        ? '<img src="' . $e($logo) . '" width="' . $lAncho . '"' . ($lAlto > 0 ? ' height="' . $lAlto . '"' : '') . ' alt="' . $nombre . '" style="display:block;border:0;height:auto;max-width:100%">'
        : ($logo !== '' ? '<img src="' . $e($logo) . '" width="40" height="40" alt="' . $nombre . '" style="display:inline-block;vertical-align:middle;margin-right:12px;border:0">' : '')
            . '<span style="display:inline-block;vertical-align:middle;font-size:22px;font-weight:700;letter-spacing:3px;color:#FFFFFF">' . $nombre . '</span>';

    $filas = '';
    foreach ($campos as $etiqueta => $valor) {
        if ($valor === '' || $valor === null) {
            continue;
        }
        $v = (string) $valor;
        if (preg_match('#^https://\S+$#', $v) === 1) {
            $txt = '<a href="' . $e($v) . '" style="color:' . $acento . ';word-break:break-all">' . $e($v) . '</a>';
        } elseif ($etiqueta === 'Código') {
            $txt = '<div class="m-tit" style="font-size:30px;font-weight:700;letter-spacing:6px;color:' . $color . '">' . $e($v) . '</div>';
        } else {
            $txt = nl2br($e($v));
        }
        $filas .= '<tr><td class="m-lin" style="padding:10px 0;border-bottom:1px solid #E6E8EC">'
            . '<div class="m-etq" style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:' . $acento . ';font-weight:600;margin-bottom:4px">' . $e($etiqueta) . '</div>'
            . '<div class="m-txt" style="font-size:15px;color:#1B1F27;line-height:1.5">' . $txt . '</div></td></tr>';
    }

    $pieHtml = $pie . ($dir !== '' ? '<br>' . $dir : '')
        . ($sitio !== '' ? '<br><a href="' . $e($sitio) . '" style="color:#C9CED6">' . $e(preg_replace('#^https?://#', '', $sitio)) . '</a>' : '');

    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">'
        . '<style>:root{color-scheme:light dark}@media (prefers-color-scheme:dark){.m-fondo{background:#101418!important}.m-card{background:#1A1F26!important}'
        . '.m-tit{color:#F2F4F7!important}.m-txt{color:#E3E6EB!important}.m-sec{color:#9AA3AF!important}.m-lin{border-bottom-color:#2A313B!important}}'
        . '[data-ogsc] .m-fondo{background:#101418!important}[data-ogsc] .m-card{background:#1A1F26!important}[data-ogsc] .m-tit{color:#F2F4F7!important}[data-ogsc] .m-txt{color:#E3E6EB!important}</style></head>'
        . '<body class="m-fondo" style="margin:0;padding:0;background:' . $fondo . '">'
        . '<table class="m-fondo" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' . $fondo . ';font-family:' . $fuente . '"><tr><td align="center" style="padding:24px 12px">'
        . '<table class="m-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:10px;overflow:hidden">'
        . '<tr><td style="background:' . $color . ';padding:22px 28px">' . $cabecera . '</td></tr>'
        . '<tr><td style="padding:28px 28px 8px"><div class="m-tit" style="font-size:20px;font-weight:700;color:' . $color . ';line-height:1.3">' . $e($asunto) . '</div>'
        . '<div style="width:40px;height:3px;background:' . $acento . ';margin-top:12px"></div></td></tr>'
        . '<tr><td style="padding:8px 28px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $filas . '</table></td></tr>'
        . '<tr><td style="background:' . $color . ';padding:18px 28px;font-size:12px;color:#C9CED6;line-height:1.6">' . $pieHtml . '</td></tr>'
        . '</table></td></tr></table></body></html>';
}

/** Versión de texto plano del mismo correo: una línea por campo. Siempre se manda. */
function correo_texto(string $asunto, array $campos, array $marca = []): string
{
    $lineas = [$asunto, ''];
    foreach ($campos as $etiqueta => $valor) {
        if ($valor !== '' && $valor !== null) {
            $lineas[] = $etiqueta . ': ' . $valor;
        }
    }
    $lineas[] = '';
    $pie = trim(implode('. ', array_filter([(string) ($marca['pie'] ?? $marca['nombre'] ?? ''), (string) ($marca['direccion'] ?? ''), (string) ($marca['sitio'] ?? '')])));
    if ($pie !== '') {
        $lineas[] = $pie;
    }
    return implode("\n", $lineas);
}
