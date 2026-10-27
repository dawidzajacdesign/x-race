# X-Race – co się zmieniło i jak to uruchomić

## Nowe i zmienione pliki
- `index.html` – nowe sekcje: Współpraca (dla firm i dla kierowców), Filie HART (mapa), formularz, stopka z danymi firmy; poprawione meta, tytuł, OG, nagłówki.
- `css/style.css` – style nowych sekcji (na końcu pliku).
- `js/main.js` – mapa z kropek, obsługa formularza, zdarzenia analityczne (`dataLayer`), przygaszanie ognia nad formularzem.
- `js/filie.js` – **wszystkie 26 punktów HART** (Polska, Czechy, Słowacja) z hartphp.com.pl/kontakt. Zmiany adresów i nowe filie wpisujesz tutaj (instrukcja w pliku).
- `api/contact.js` – funkcja Vercel, która wysyła zgłoszenia z formularza mailem przez Resend.
- `robots.txt`

## Uruchomienie formularza (jednorazowo)
1. Załóż konto na https://resend.com i zweryfikuj domenę nadawcy (np. hartphp.com.pl – Resend poda rekordy DNS do dodania).
2. Utwórz klucz API w Resend.
3. W Vercel → projekt **x-race** → Settings → Environment Variables dodaj:
   - `RESEND_API_KEY` – klucz z Resend
   - `CONTACT_TO` – adres(y), na które mają trafiać zgłoszenia, np. `hart@hartphp.com.pl` (kilka po przecinku)
   - `CONTACT_FROM` – nadawca ze zweryfikowanej domeny, np. `X-Race <formularz@hartphp.com.pl>`
4. Wdróż stronę ponownie (Redeploy), żeby zmienne zaczęły działać.

Dopóki zmienne nie są ustawione, formularz pokaże komunikat o błędzie z gotowym linkiem „wyślij e-mailem” i numerem telefonu, więc żadne zapytanie nie przepadnie bez śladu.

## Do uzupełnienia przed premierą
- **Filie:** współrzędne w `js/filie.js` są z dokładnością do dzielnicy; jeśli chcesz kropki co do adresu, popraw lat/lon (Mapy Google → prawy klik na pinezce).
- **Homologacja R90 i PDF z zastosowaniami:** w `index.html` szukaj `DO UZUPEŁNIENIA`.
- **Domena:** po podpięciu docelowej domeny zamień `https://x-race.vercel.app` w `index.html` (canonical, og:url, og:image, JSON-LD).
- **Analityka:** kod GTM jest w komentarzu w `<head>`. Przed włączeniem potrzebny jest baner zgód na cookies.
- **Prawnik:** treść zgody pod formularzem oraz hasło „No risk.” w sekcji z hasłami z opakowania.
