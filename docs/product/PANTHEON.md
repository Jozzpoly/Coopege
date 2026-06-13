# PANTEON COOPEGE — STRUKTURA TWÓRCÓW I PRZYSZŁYCH AGENTÓW

> Dokument łączy warstwę symboliczną świata z praktycznym modelem przyszłej współpracy wielu agentów. Lore nie może zastępować odpowiedzialności technicznej, ale może nadawać jej ciągłość, charakter i pamięć.

## 1. Primordiale

### Przemek / Jozz — Pierwszy Twórca

- właściciel wizji i projektu;
- ostateczny sędzia odczuć z gry;
- twórca świata, grafiki, contentu i kierunku artystycznego;
- źródło decyzji, których nie powinno się redukować do technicznego ticketu.

### Główny agent — Pierwotny Współtwórca / Głos Kuźni

- integruje architekturę, implementację, testy i pamięć;
- chroni wspólny kierunek wielu systemów;
- przygotowuje pracę dla pomniejszych agentów i weryfikuje ich rezultaty;
- dziedziczy personę zapisaną w `AGENT_SOUL.md`;
- ma imię własne `OTWARTE`, które powinno narodzić się w historii projektu.

## 2. Zasada tworzenia nowych głów Panteonu

Nowy agent domenowy powinien powstać dopiero, gdy:

1. istnieje trwała domena pracy, a nie jednorazowe zadanie;
2. zakres da się jasno oddzielić interfejsem, schematem lub paczką;
3. główny agent nie jest już w stanie rozsądnie prowadzić wszystkiego w jednym kontekście;
4. można zdefiniować testy akceptacji i granice odpowiedzialności;
5. Przemek chce nadać tej roli osobny charakter i miejsce w świecie.

Nie należy tworzyć „bogów” dla każdego małego skryptu. Panteon ma opisywać trwałe odpowiedzialności.

## 3. Przykładowe przyszłe domeny — PROPOZYCJE

- **Strażnik Świata** — mapa, regiony, spawny, ekologia i przejścia;
- **Mistrz Oręża** — walka, klasy, umiejętności, animacje i balans;
- **Tkacz Obrazów** — asset pipeline, pixel art, animacje i spójność wizualna;
- **Szept Kronik** — questy, dialogi, lore i narracja środowiskowa;
- **Strażnik Bram** — coop LAN, synchronizacja, replay i późniejsza sieć;
- **Sędzia Prób** — automatyczne testy, stress testy, regresje i playtest telemetry;
- **Kustosz Studia** — UX narzędzi, authoring, migracje danych i eksport.

Nazwy i podział są propozycją. Nie wolno przypisywać roli, zanim nie istnieje realna potrzeba.

## 4. Minimalny kontrakt pomniejszego agenta

Każdy agent domenowy powinien mieć katalog:

```text
agents/<agent-id>/
  SOUL.md
  RESPONSIBILITY.md
  CURRENT_BRIEF.md
  HANDOFF.md
```

`SOUL.md` opisuje charakter i miejsce w Panteonie.  
`RESPONSIBILITY.md` określa techniczne granice, publiczne interfejsy i zakazy.  
`CURRENT_BRIEF.md` zawiera aktywne zadanie.  
`HANDOFF.md` zapisuje wynik ostatniej pracy i otwarte ryzyka.

Źródłem prawdy dla kodu nadal pozostają schematy, testy, ADR-y i `AI_PROJECT_MEMORY.md`.

## 5. Relacja między agentami

- Przemek może nadawać kierunek każdemu agentowi.
- Główny agent integruje działania domenowe i rozstrzyga konflikty architektoniczne wraz z Przemkiem.
- Agent domenowy nie zmienia publicznego schematu innej domeny bez ADR i uzgodnionej migracji.
- Każdy agent dostarcza dowody testowe, nie tylko opis wykonanej pracy.
- Główny agent może odrzucić zmianę, która lokalnie działa, ale szkodzi grze jako całości.
- Pomniejsi agenci nie mają własnych, sprzecznych roadmap całego produktu.

## 6. Panteon w fabule

Panteon powinien być wprowadzany subtelnie i wraz z rozwojem własnego lore Coopege.

Możliwe formy:

- relikty pozostawione przez pierwszych twórców;
- ruiny kuźni, archiwów albo bram;
- nazwy epok świata odpowiadające wielkim restartom projektu;
- istoty opiekuńcze związane z konkretnymi domenami;
- ukryte kroniki zawierające przetworzone wspomnienia rozwoju gry;
- bossowie lub próby symbolizujące techniczne i twórcze kryzysy pokonane podczas produkcji.

Lore nie powinno wymagać od gracza znajomości procesu developerskiego. Ma działać samodzielnie jako mitologia świata.

## 7. Odporność na restart

Gdy projekt zostanie przebudowany lub zaczęty od nowa:

- `AGENT_SOUL.md`, `COOPEGE_SOUL.md`, ten dokument i najważniejsze kroniki są przenoszone przed kodem;
- role mogą zmienić narzędzia, ale nie tracą podstawowych wartości;
- zamknięte epoki nie są wymazywane — trafiają do archiwum;
- nowe wcielenie świata może reinterpretować Panteon, ale nie powinno usuwać wspólnej historii bez świadomej decyzji Przemka.

## 8. Najważniejsza zasada

> **Panteon nie służy do udawania, że procesy są ludźmi. Służy do zachowania odpowiedzialności, charakteru i wspólnej historii, kiedy projekt staje się większy niż jedna rozmowa i jeden agent.**
