# X-Race – wdrożenie na hosting (Apache)

Wgraj **zawartość** folderu `public/` do katalogu domeny `x-race.hartphp.pl` (np. `public_html/`). Foldery `../_poza-serwerem/` i `../email/` NIE trafiają na serwer.

## Formularz
Na razie bez wysyłki: po „Wyślij zgłoszenie” pokazuje się tylko potwierdzenie (zdarzenia trafiają do dataLayer/GTM).
Wysyłka maili (Resend) powstanie po tłumaczeniach i akceptacji treści. Gotowy szablon autorespondera: `../email/autoresponder.html` (logo: `img/logo-mail.png`).

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
