<?php
// Skopiuj jako api/config.php (albo lepiej poza katalog publiczny jako ../xrace-config.php obok public_html) i uzupełnij.
return [
  'RESEND_API_KEY' => 're_XXXXXXXXXXXXXXXX',                 // klucz API z resend.com
  'CONTACT_TO'     => 'hart@hartphp.com.pl',                  // odbiorcy, kilka po przecinku
  'CONTACT_FROM'   => 'X-Race <formularz@hartphp.com.pl>',    // nadawca ze zweryfikowanej w Resend domeny
  'REPLY_TO'       => 'hart@hartphp.com.pl',                  // gdzie trafi odpowiedź klienta na autoresponder (domyślnie pierwszy z CONTACT_TO)
];
