/*
  Punkty HART na mapie i na liście w sekcji "HART blisko Ciebie".
  Dane z hartphp.com.pl/kontakt (stan na 14.10.2026).

  Pola:
    miasto  – nazwa na liście i w dymku na mapie
    kraj    – "PL", "CZ" albo "SK" (grupuje listę i liczniki)
    typ     – "centrala" albo "filia"
    nazwa   – opcjonalny dopisek pod miastem, np. "Magazyn HUB"
    adres   – pełny adres; z niego budowany jest link "Wyznacz trasę"
    tel     – numer wyświetlany jako pierwszy (opcjonalnie)
    email   – adres filii (opcjonalnie)
    lat/lon – współrzędne (Mapy Google → prawy klik na pinezce → pierwsza linijka).
              Wpisane z dokładnością do dzielnicy; na mapę z kropek to wystarcza.
*/
window.XRACE_FILIE = [
  { miasto: "Opole", kraj: "PL", typ: "centrala", nazwa: "Centrala HART", adres: "ul. Morcinka 43, 45-531 Opole", tel: "77 453 96 26", email: "hart@hartphp.com.pl", lat: 50.657, lon: 17.926 },
  { miasto: "Białystok", kraj: "PL", typ: "filia", adres: "ul. Produkcyjna 114B, 15-680 Białystok", tel: "85 653 88 91", email: "bialystok@hartphp.com.pl", lat: 53.150, lon: 23.205 },
  { miasto: "Bielsko-Biała", kraj: "PL", typ: "filia", adres: "ul. Czechowicka 24, 43-300 Bielsko-Biała", tel: "33 810 19 73", email: "bielskobiala@hartphp.com.pl", lat: 49.840, lon: 19.025 },
  { miasto: "Bydgoszcz", kraj: "PL", typ: "filia", adres: "ul. Nowotoruńska 6, 85-840 Bydgoszcz", tel: "52 555 99 00", email: "bydgoszcz@hartphp.com.pl", lat: 53.112, lon: 18.065 },
  { miasto: "Bytom", kraj: "PL", typ: "filia", adres: "ul. Arki Bożka 3K, 41-902 Bytom", tel: "32 282 27 01", email: "bytom@hartphp.com.pl", lat: 50.355, lon: 18.905 },
  { miasto: "Częstochowa", kraj: "PL", typ: "filia", adres: "ul. Kawia 4/16, 42-200 Częstochowa", tel: "34 367 11 63", email: "czestochowa@hartphp.com.pl", lat: 50.800, lon: 19.150 },
  { miasto: "Gdańsk", kraj: "PL", typ: "filia", adres: "ul. Jabłoniowa 64, 80-175 Gdańsk", tel: "58 582 65 52", email: "gdansk@hartphp.com.pl", lat: 54.330, lon: 18.570 },
  { miasto: "Katowice", kraj: "PL", typ: "filia", adres: "ul. Krakowska 179A, 40-393 Katowice", tel: "32 255 41 33", email: "katowice@hartphp.com.pl", lat: 50.245, lon: 19.070 },
  { miasto: "Lublin", kraj: "PL", typ: "filia", adres: "ul. Zawieprzycka 8D, 20-228 Lublin", tel: "81 756 09 58", email: "lublin@hartphp.com.pl", lat: 51.268, lon: 22.630 },
  { miasto: "Łódź", kraj: "PL", typ: "filia", adres: "ul. Szczecińska 62, 91-222 Łódź", tel: "42 674 13 88", email: "lodz@hartphp.com.pl", lat: 51.790, lon: 19.400 },
  { miasto: "Poznań", kraj: "PL", typ: "filia", adres: "ul. Fabianowska 135, 62-052 Komorniki", tel: "61 840 30 40", email: "poznan@hartphp.com.pl", lat: 52.345, lon: 16.810 },
  { miasto: "Radom", kraj: "PL", typ: "filia", adres: "ul. Lubelska 141, 26-603 Radom", tel: "48 383 38 01", email: "radom@hartphp.com.pl", lat: 51.390, lon: 21.185 },
  { miasto: "Rzeszów", kraj: "PL", typ: "filia", adres: "ul. Ciasna 6, 35-232 Rzeszów", tel: "17 864 00 06", email: "rzeszow@hartphp.com.pl", lat: 50.030, lon: 22.010 },
  { miasto: "Szczecin", kraj: "PL", typ: "filia", adres: "ul. Południowa 27, 71-001 Szczecin", tel: "91 469 69 80", email: "szczecin@hartphp.com.pl", lat: 53.395, lon: 14.525 },
  { miasto: "Warszawa Targówek", kraj: "PL", typ: "filia", adres: "ul. Przecławska 9, 03-879 Warszawa", tel: "22 356 18 55", email: "warszawa@hartphp.com.pl", lat: 52.275, lon: 21.060 },
  { miasto: "Warszawa Michałowice", kraj: "PL", typ: "filia", adres: "Al. Jerozolimskie 264, 05-816 Michałowice (Opacz-Kolonia)", tel: "22 886 11 22", email: "warszawa2@hartphp.com.pl", lat: 52.190, lon: 20.930 },
  { miasto: "Wieliczka", kraj: "PL", typ: "filia", adres: "ul. Jedynaka 24, 32-020 Wieliczka", tel: "12 278 37 89", email: "wieliczka@hartphp.com.pl", lat: 49.990, lon: 20.050 },
  { miasto: "Wrocław", kraj: "PL", typ: "filia", adres: "ul. Piękna 60A, 50-506 Wrocław", tel: "71 783 78 10", email: "wroclaw@hartphp.com.pl", lat: 51.090, lon: 17.010 },
  { miasto: "Wrocław Psary", kraj: "PL", typ: "filia", adres: "ul. Parkowa 11, 51-180 Psary", tel: "71 387 90 04", email: "wroclaw2@hartphp.com.pl", lat: 51.190, lon: 16.990 },
  { miasto: "Zielona Góra", kraj: "PL", typ: "filia", adres: "ul. Browarna 5, 65-849 Zielona Góra", tel: "68 453 72 53", email: "zielonagora@hartphp.com.pl", lat: 51.940, lon: 15.505 },

  { miasto: "Brno", kraj: "CZ", typ: "filia", adres: "Kaštanova 489/34, 620 00 Brno – Brněnské Ivanovice", tel: "+420 534 001 114", email: "brno@hartphp.cz", lat: 49.165, lon: 16.650 },
  { miasto: "Ostrava", kraj: "CZ", typ: "filia", adres: "Lihovarská 679/40, 718 00 Ostrava – Kunčičky", tel: "+420 595 532 437", email: "ostrava@hartphp.cz", lat: 49.810, lon: 18.310 },

  { miasto: "Nitra", kraj: "SK", typ: "filia", adres: "Vinárska 1, 951 41 Nitra – Lužianky", tel: "+421 37 2865 050", email: "nitra@hartphp.sk", lat: 48.355, lon: 18.050 },
  { miasto: "Prešov", kraj: "SK", typ: "filia", adres: "Družstevná 38, 080 06 Prešov", tel: "+421 51 324 0100", email: "presov@hartphp.sk", lat: 48.990, lon: 21.250 }
];
