# X-Race – wdrożenie na hosting z PHP (Apache)

Wgraj **zawartość** folderu `public/` do katalogu domeny (np. `public_html/`). Folder `../_poza-serwerem/` NIE trafia na serwer (oryginały grafik, stare pliki Vercel).

## Formularz (Resend)
1. Na https://resend.com zweryfikuj domenę nadawcy (np. hartphp.com.pl – rekordy DNS poda Resend) i utwórz klucz API.
2. Skopiuj `api/config.example.php` jako **`xrace-config.php` katalog WYŻEJ niż public_html** (bezpieczniej) albo jako `api/config.php`, i uzupełnij klucz oraz adresy.
3. Wymagane PHP 7.4+ z rozszerzeniem cURL. Test: wyślij formularz – przy błędzie strona pokaże e-mail i telefon HART.

## Konfiguracja serwera
- `.htaccess` – HTTPS, adres bez www, przekierowanie /index.html → /, nagłówki bezpieczeństwa, cache, kompresja.
- Jeśli hosting to nginx (nie Apache), `.htaccess` nie działa – te same reguły trzeba ustawić w panelu/konfiguracji serwera.
- Jeśli docelowy adres ma mieć www, odwróć regułę nr 2 w `.htaccess`.

## Domena
Docelowy adres `https://x-race.hartphp.pl` jest już wpisany w: `index.html` (canonical, og:*, twitter:image, JSON-LD), `robots.txt`, `sitemap.xml`.
Starą wersję na vercel.app usuń albo przekieruj 301 na nową domenę. Potem zgłoś sitemapę w Google Search Console.

## Do uzupełnienia przed premierą
- ID filmu YouTube (`VIDEO_ID`) – szukaj `DO UZUPEŁNIENIA` w `index.html`.
- Filie: `js/filie.js`.
- Prawnik: treść zgody pod formularzem oraz hasło „No risk.”.

## Autoresponder i polityka prywatności
- Po wysłaniu formularza klient dostaje potwierdzenie. Treść i wygląd: `api/autoresponder.html` (zmienne w `{{...}}` wypełnia `api/contact.php`). Odpowiedź klienta trafia na `REPLY_TO` z configu.
- `polityka-prywatnosci.html` – treść przeniesiona z hartphp.com.pl + sekcja „Strona X-Race” (oznaczona w kodzie DO ZATWIERDZENIA PRZEZ PRAWNIKA).
