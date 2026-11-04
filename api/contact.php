<?php
// POST /api/contact.php – zgłoszenie z formularza X-Race wysyłane mailem przez Resend (https://resend.com).
// Konfiguracja: skopiuj config.example.php jako config.php i uzupełnij klucz oraz adresy.
// Bezpieczniej: trzymaj config poza katalogiem publicznym jako ../../xrace-config.php (sprawdzany jako pierwszy).

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function out(int $code, array $data): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); out(405, ['ok' => false, 'error' => 'method_not_allowed']); }

$cfgFile = is_file(__DIR__ . '/../../xrace-config.php') ? __DIR__ . '/../../xrace-config.php' : __DIR__ . '/config.php';
$cfg = is_file($cfgFile) ? require $cfgFile : [];
$key = $cfg['RESEND_API_KEY'] ?? getenv('RESEND_API_KEY') ?: '';
$to = $cfg['CONTACT_TO'] ?? getenv('CONTACT_TO') ?: '';
$from = $cfg['CONTACT_FROM'] ?? getenv('CONTACT_FROM') ?: '';

$raw = file_get_contents('php://input', false, null, 0, 20000) ?: '';
$body = json_decode($raw, true);
if (!is_array($body)) $body = $_POST;

// pułapka na boty: ukryte pole
if (!empty($body['website'])) out(200, ['ok' => true]);

$TYPES = ['sklep' => 'Sklep', 'warsztat' => 'Warsztat', 'hurtownia' => 'Hurtownia'];
$LIMITS = ['firma' => 160, 'miasto' => 80, 'osoba' => 120, 'email' => 160, 'telefon' => 30, 'filia' => 120, 'strona' => 300];
$clean = static function ($v, int $max): string {
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string)($v ?? '')) ?? '';
  return mb_substr(trim($s), 0, $max);
};
$d = [];
foreach ($LIMITS as $k => $max) $d[$k] = $clean($body[$k] ?? '', $max);
$typ = isset($TYPES[$body['typ'] ?? '']) ? $body['typ'] : 'sklep';
$zgoda = in_array($body['zgoda'] ?? null, [true, 'on', '1', 1, 'true'], true);

$errors = [];
if ($d['firma'] === '') $errors[] = 'firma';
if ($d['miasto'] === '') $errors[] = 'miasto';
if ($d['osoba'] === '') $errors[] = 'osoba';
if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($d['telefon'] !== '' && !preg_match('/^[+0-9 ()\-]{9,30}$/', $d['telefon'])) $errors[] = 'telefon';
if (!$zgoda) $errors[] = 'zgoda';
if ($errors) out(400, ['ok' => false, 'error' => 'invalid', 'fields' => $errors]);

if ($key === '' || $to === '' || $from === '') { error_log('xrace contact: brak konfiguracji Resend'); out(500, ['ok' => false, 'error' => 'not_configured']); }

$rows = [
  ['Kim jest', $TYPES[$typ]],
  ['Firma', $d['firma']],
  ['Miejscowość', $d['miasto']],
  ['Najbliższa filia', $d['filia'] ?: '-'],
  ['Imię i nazwisko', $d['osoba']],
  ['E-mail', $d['email']],
  ['Telefon', $d['telefon'] ?: '-'],
  ['Zgoda na kontakt', 'tak'],
  ['Wysłano ze strony', $d['strona'] ?: '-'],
];
$e = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$text = implode("\n", array_map(static fn($r) => "{$r[0]}: {$r[1]}", $rows));
$html = '<h2 style="font-family:Arial,sans-serif">Nowe zgłoszenie X-Race</h2><table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">'
  . implode('', array_map(static fn($r) => '<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">' . $e($r[0]) . '</td><td style="padding:6px 0;white-space:pre-wrap">' . $e($r[1]) . '</td></tr>', $rows))
  . '</table>';

$payload = json_encode([
  'from' => $from,
  'to' => array_values(array_filter(array_map('trim', explode(',', $to)))),
  'reply_to' => $d['email'],
  'subject' => "X-Race: {$TYPES[$typ]} – {$d['firma']} ({$d['miasto']})",
  'text' => $text,
  'html' => $html,
], JSON_UNESCAPED_UNICODE);

function resend(string $key, string $payload): bool {
  $ch = curl_init('https://api.resend.com/emails');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer $key", 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
  ]);
  $res = curl_exec($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false || $status < 200 || $status >= 300) { error_log("xrace contact: resend $status $err " . (string)$res); return false; }
  return true;
}

// 1) zgłoszenie do HART – jeśli to się nie uda, formularz pokazuje błąd z e-mailem i telefonem
if (!resend($key, $payload)) out(502, ['ok' => false, 'error' => 'send_failed']);

// 2) autoresponder do klienta (szablon: api/autoresponder.html) – jego błąd nie blokuje zgłoszenia
$tpl = @file_get_contents(__DIR__ . '/autoresponder.html');
if ($tpl !== false) {
  $DOP = ['sklep' => 'Twojego sklepu', 'warsztat' => 'Twojego warsztatu', 'hurtownia' => 'Twojej hurtowni'];
  $base = 'https://x-race.hartphp.pl/';
  $imie = trim(explode(' ', $d['osoba'])[0]);
  $summary = [
    ['Kim jesteś', $TYPES[$typ]], ['Firma', $d['firma']], ['Miejscowość', $d['miasto']],
    ['Imię i nazwisko', $d['osoba']], ['E-mail', $d['email']], ['Telefon', $d['telefon'] ?: '–'],
  ];
  $rowsHtml = implode('', array_map(static fn($r) =>
    '<tr><td width="42%" valign="top" style="padding:5px 12px 5px 0;color:#a6a7ae;">' . $e($r[0]) . '</td><td valign="top" style="padding:5px 0;color:#f5f5f3;word-break:break-word;">' . $e($r[1]) . '</td></tr>', $summary));
  $html2 = strtr($tpl, [
    '{{imie}}' => $e($imie),
    '{{firma}}' => $e($d['firma']),
    '{{typ_dop}}' => $e($DOP[$typ]),
    '{{filia_txt}}' => $d['filia'] !== '' ? 'do&nbsp;filii HART w&nbsp;' . $e($d['filia']) : 'do&nbsp;najbliższej filii HART',
    '{{wiersze}}' => $rowsHtml,
    '{{strona}}' => $base,
    '{{polityka}}' => $base . 'polityka-prywatnosci.html',
  ]);
  $html2 = preg_replace('/<!--.*?-->/s', '', $html2);
  $text2 = "Dziękujemy, $imie.\n\nTwoje zgłoszenie do programu partnerskiego X-Race dotarło do HART. "
    . ($d['filia'] !== '' ? "Przekazaliśmy je do filii HART w {$d['filia']}. " : 'Przekazaliśmy je do najbliższej filii HART. ')
    . "Handlowiec skontaktuje się z Tobą z ofertą dla {$DOP[$typ]} {$d['firma']}.\n\nCo dalej:\n1. Kontakt handlowca – zwykle w ciągu 1–2 dni roboczych.\n2. Oferta i katalog zastosowań.\n3. Start sprzedaży ze stanów magazynowych HART.\n\nTwoje zgłoszenie:\n"
    . implode("\n", array_map(static fn($r) => "{$r[0]}: {$r[1]}", $summary))
    . "\n\nCoś się nie zgadza? Odpowiedz na tę wiadomość.\nTelefon: +48 77 453 96 26\n\nHART Sp. z o.o., ul. Morcinka 43, 45-531 Opole\nPolityka prywatności: {$base}polityka-prywatnosci.html";
  $toList = array_values(array_filter(array_map('trim', explode(',', $to))));
  resend($key, json_encode([
    'from' => $from,
    'to' => [$d['email']],
    'reply_to' => $cfg['REPLY_TO'] ?? ($toList[0] ?? null),
    'subject' => 'Dziękujemy za zgłoszenie – HART X-Race',
    'text' => $text2,
    'html' => $html2,
  ], JSON_UNESCAPED_UNICODE));
}

out(200, ['ok' => true]);
