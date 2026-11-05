# X-Race – wdrożenie na hosting (Apache)

Wgraj **zawartość** folderu `public/` do katalogu domeny `x-race.hartphp.pl` (np. `public_html/`). Foldery `../_poza-serwerem/` i `../email/` NIE trafiają na serwer.

## Formularz (wymaga PHP 7.4+)
- `api/zgloszenie.php` przyjmuje zgłoszenie, wysyła je do HART (i do filii dopasowanej po miejscowości z `js/filie.js`) oraz odsyła klientowi autoresponder w języku strony.
- **Przed startem ustaw `api/config.php`**: `notify_to` (dokąd mają trafiać zgłoszenia), `from_email` (adres w domenie, z której serwer może wysyłać), `reply_to`.
- Domyślnie wysyła funkcją `mail()` serwera. Jeśli maile lądują w spamie albo nie dochodzą: `transport => 'smtp'` i dane skrzynki w `smtp`. Dla domeny nadawcy ustaw SPF i DKIM.
- Autoresponder: szablon `api/mail/autoresponder.html`, teksty we wszystkich językach w `api/mail/texts.php` (logo: `img/logo-mail.png`).
- Ochrona: ukryte pole-pułapka, minimalny czas wypełnienia, limit zgłoszeń z jednego IP na godzinę, tylko żądania z własnej domeny. `api/.htaccess` blokuje dostęp do wszystkiego poza endpointem.
- Na Vercelu PHP nie działa – formularz wysyła maile tylko na zwykłym hostingu.

## Język przeglądarki
Strona główna PL (`/`) przy pierwszej wizycie przenosi na wersję w języku przeglądarki (języki spoza listy → EN). Wybór z menu języków jest zapamiętywany (`localStorage`, klucz `xr_lang`) i ma pierwszeństwo. Roboty wyszukiwarek nie są przekierowywane.

## Wersje językowe
- PL to `index.html` w katalogu głównym i jedyne źródło. Wersje `/en/ /de/ /cz/ /sk/ /hu/ /lt/ /nl/ /fr/ /es/` są **generowane**, nie edytuj ich ręcznie.
- Tłumaczenia: `../_poza-serwerem/i18n/<kod>.json`. Po każdej zmianie polskiego `index.html` uruchom:
  `powershell -ExecutionPolicy Bypass -File _poza-serwerem\i18n\build.ps1`
  Skrypt wypisze fragmenty, których nie znalazł („BRAK”), i polski tekst, który został bez tłumaczenia.
- Mapa: `<html data-map="…">`. PL = Polska i filie polskie, CZ = Czechy i filie czeskie, SK = Słowacja i filie słowackie, pozostałe = Europa (`js/europa.js`) ze wszystkimi filiami.
- Polityka prywatności i cookies też są generowane (`/<język>/polityka-prywatnosci.html`, `/<język>/pliki-cookies.html`); ich tłumaczenia są w `../_poza-serwerem/i18n/legal/<kod>.json`. Po każdej zmianie polskiej polityki uruchom skrypt ponownie i daj zmienione fragmenty do tłumaczenia.

## Konfiguracja serwera
- `.htaccess` – HTTPS, adres bez www, przekierowanie /index.html → /, nagłówki bezpieczeństwa, cache, kompresja.
- Jeśli hosting to nginx, te same reguły trzeba ustawić w konfiguracji serwera.

## Domena
Adres `https://x-race.hartphp.pl` jest wpisany w: `index.html`, `polityka-prywatnosci.html`, `pliki-cookies.html` (canonical, og:*, JSON-LD), `robots.txt`, `sitemap.xml`. Po wdrożeniu zgłoś sitemapę w Google Search Console.
Przy zmianach w CSS/JS podbij numer wersji w HTML (`style.css?v=…`, `main.js?v=…`).

## Do uzupełnienia przed premierą
- ID filmu YouTube (`VIDEO_ID`) – szukaj `DO UZUPEŁNIENIA` w `index.html`.
- Filie: `js/filie.js`.
- Prawnik: zgoda pod formularzem, hasło „No risk.”, sekcje „Strona X-Race” w polityce i „Cookies na stronie X-Race” (oznaczone w kodzie).

## Vercel
Repozytorium = zawartość `public/` (z ukrytymi plikami `vercel.json` i `.vercelignore`). W Vercel: Framework Preset **Other**, bez Build Command, Output Directory puste (katalog główny).
`vercel.json` ustawia nagłówki, cache i przekierowanie /index.html → /. Domenę `x-race.hartphp.pl` podepnij w Settings → Domains (CNAME na cname.vercel-dns.com); adres *.vercel.app ma canonical na docelową domenę, więc nie konkuruje w Google.
