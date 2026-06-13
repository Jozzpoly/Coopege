# AI_PROJECT_MEMORY — COOPEGE

> Krótkie źródło prawdy technicznej. Szczegóły historyczne są w ADR-ach i raportach; wizja w dokumentach product.

- Wersja pamięci: **6**
- Data: **2026-06-13**
- Workspace: **0.7.5-m7-owner-accepted**
- Status: **M7 TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / NOT SUCCESSOR_REVIEWED**
- Ukończone: M7 Finalization / Owner Validation
- Aktywne: **M8 LAN Foundation / Entry Review**
- M8 LAN: planowanie jest otwarte; pierwsza zmiana implementacyjna wymaga niezależnego L2 Inheritance Review

## Start głównego agenta

1. `START_HERE.md`
2. `PROJECT_STATE.json`
3. ten plik
4. `docs/process/CURRENT_MILESTONE.md`
5. `docs/process/LAST_HANDOFF.md`
6. `docs/process/OWNER_FEEDBACK.md`
7. najnowszy `PLAYTEST_LOG.md`
8. wskazane ADR-y
9. przy pierwszym przejęciu roli: `COOPEGE_SOUL.md`, `AGENT_SOUL.md`, `PANTHEON.md`, roadmapa

Następnie wykonaj `npm ci --ignore-scripts` i `npm run validate`. Kod, testy i aktualne ADR-y wygrywają ze starym opisem.

## Niezmienne kontrakty

- modularny TypeScript i generowane standalone HTML;
- project schema v2 ze wspólnym walidatorem;
- fixed tick 30 Hz, deterministyczny RNG, stable IDs i checksumy;
- kanoniczny `GameWorld` niezależny od DOM, kamery i renderera;
- save v3, serializowalne authored spawns i jawny ownership graczy;
- brak arbitrary JavaScript w contencie;
- Studio preview przez wersjonowany `postMessage`, nonce i sandbox;
- zmiana schema/save/protocol/asset IDs wymaga migracji.

## Stan M7

- 5 pięter 200×200, 18 kafli, 3 klasy, 15 umiejętności, 6 potworów;
- 338 authored spawnów rozwijanych do 338 kanonicznych stanów; cap aktywnych aktorów 48;
- party-aware aktywacja bez uprzywilejowania P1, sleep/respawn/HP/threat poza kamerą;
- save v3 z graczami, slotami, RNG, piętrem i pełnym lifecycle spawnów;
- atomowe odrzucanie uszkodzonego save’a;
- 24 walidowane transitions uruchamiane realnym wejściem P1 albo P2 na schody;
- deterministyczny tie-break i bezpieczne rozmieszczenie drużyny;
- `TextureFrameLayout`, atlasy graczy 80×80 z zachowaną skalą i stabilnym pivotem;
- teren używa deterministycznych wariantów; animowane pozostają woda i lawa;
- aim myszy przeliczany co tick względem aktualnej kamery;
- P2: strzałki + prawy Ctrl/Numpad0 albo gamepad; edge-triggered join bez natychmiastowego rejoinu;
- Asset Vault: 45 PNG, manifest, contact sheet, import/export ZIP, SHA/CRC/layout validation;
- Windows-safe build, publiczny npm registry, gotowy `dist`, launchery i diagnostyka;
- drugi launcher tej samej kopii bezpiecznie używa działającego serwera; inna kopia na porcie daje jasny błąd.

## Potwierdzony baseline

- Doctor: **18 PASS / 0 WARN / 0 FAIL**
- Handoff gate: **PASS**
- Portability: **21 PASS / 0 WARN / 0 FAIL**
- TypeScript: **PASS**
- Node: **94/94 PASS**
- Golden migration: **52/52 PASS**
- Chromium: **9/9 PASS**
- Ability Composer: **PASS**
- Legacy: **4/4 PASS**
- Dev-server reuse: **PASS**
- Gameplay Gate: **27 000 ticków solo + 27 000 C0, saves 6/6 — PASS_AUTOMATED**
- Clean-package install/build/check/portability/handoff/legacy: **PASS**
- Owner playtest: **ACCEPT_WITH_DEBT, 2026-06-13**

## Otwarte ograniczenia

- wczesny content, balans i feel;
- brak pełnych osobnych clipów attack/death;
- transitions nie mają pełnego CRUD w Studio;
- P2 keyboard zależy od key rollover klawiatury;
- lokalny C0 może po śmierci zmienić punkt respawnu używany później solo; `BACKLOG`, nie blokuje M8;
- brak LAN, reconnectu i interpolacji;
- brak docelowych systemów itemów, questów/dialogów, talentów i authoringu AI;
- headless Chromium/CDP w długiej serii kontenerowej bywa niestabilne infrastrukturalnie; scenariusze mają timeouty, izolację i pełny pass, ale ręczna walidacja Windows pozostaje nadrzędna.

## Źródła

- status maszynowy: `PROJECT_STATE.json`
- zakres: `docs/process/CURRENT_MILESTONE.md`
- handoff: `docs/process/LAST_HANDOFF.md`
- protokół: `docs/process/AGENT_HANDOFF_PROTOCOL_V2.md`
- raport: `docs/testing/M7_FINAL_VALIDATION_REPORT.md`
- instrukcja testu: `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`
- trwały feedback właściciela: `docs/process/OWNER_FEEDBACK.md`
