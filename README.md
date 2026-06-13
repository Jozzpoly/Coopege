# Coopege — LAN-first coop action RPG

Aktualna wersja: **0.7.5-m7-owner-accepted**. Status: **M7 TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT**. Aktywny następny etap: **M8 LAN Foundation / Entry Review**.

## Najszybszy start

Na Windowsie rozpakuj paczkę i uruchom `PLAY_COOPEGE.bat`. Gotowe HTML są w `dist`; zwykły playtest nie wymaga instalacji ani builda. Studio uruchamia `START_STUDIO.bat`.

- Runtime: `dist/Coopege_v0.01.html`
- Studio: `dist/Coopege_Studio_v0.1.html`
- Asset Vault: `dist/Coopege_M7A_Asset_Vault.zip`
- Instrukcja: `START_HERE.md`
- Owner test: `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`

## Fundament M7

Deterministyczny GameWorld 30 Hz, project schema v2, save v3, 338 authored spawn states, party-aware aktywacja, 24 realne transitions, local C0 P1/P2, wspólna kamera/tether, bezpieczny gameplay language, Studio z tym samym projektem, Ability Composer oraz Asset Vault 45 PNG.

Finalizacja dodaje poprawne layouty atlasów, stabilny pivot, aim zależny od aktualnej kamery, edge-triggered P2 join, atomowe save/load, Windows-safe build, publiczny registry, gotowe launchery, server reuse i egzekwowany Handoff Protocol v2.

## Polecenia

```powershell
npm ci --ignore-scripts
npm run doctor
npm run check
npm run test:browser
npm run test:gameplay-gate
npm run validate
```

`npm run validate` jest pełną bramką wydania. `npm run play` używa gotowego builda; `npm run play:rebuild` jawnie przebudowuje źródła.

## Baseline

Doctor 18/0/0, handoff bez FAIL, portability 21/0/0, TypeScript PASS, Node 94/94, migration 52/52, legacy 4/4, Chromium 9/9 + Ability Composer, server reuse PASS, Gameplay Gate 54 000 ticków i saves 6/6.

## Ograniczenia

To nadal wczesny runtime: brak LAN/reconnectu, pełnych clipów attack/death, transition CRUD, docelowych itemów/questów/dialogów/talentów/AI authoringu oraz finalnego balansu i feelu. Znany dług lokalnego C0 może przestawiać punkt respawnu solo i jest zapisany w `OWNER_FEEDBACK.md` jako backlog.

## Przekazanie

Nowy główny agent zaczyna od `PROJECT_STATE.json`, `AI_PROJECT_MEMORY.md`, `CURRENT_MILESTONE.md`, `LAST_HANDOFF.md`, `OWNER_FEEDBACK.md` i `AGENT_HANDOFF_PROTOCOL_V2.md`. M7 ma `OWNER_ACCEPTED`; przed pierwszą implementacją M8 LAN wymagany jest niezależny L2 review.
