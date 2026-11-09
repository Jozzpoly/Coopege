# Coopege Studio Authoring Thread — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Wskazać spawna na rzeczywistej mapie → edytować jego potwora → obejrzeć asset → wrócić do lokalizacji w jednym istniejącym Studio.
**Architecture:** ProjectStore pozostaje jedynym źródłem danych. MapEditor, ContentBrowser i AssetBrowser emitują intencje oraz przyjmują precyzyjne focus/select; main.ts łączy je nawigacyjnie. Żadnego uniwersalnego frameworka wyboru.
**Tech Stack:** TypeScript 5.8, Canvas/DOM, istniejące ProjectStore/CommandBus, Node Test, Chromium.
**Spec:** docs/superpowers/specs/2026-11-10-coopege-authoring-thread-design.md

## Global Constraints
- Branch experiment/coopege-authoring-workbench-2026-11-10 od Coopege/main; bez zmian Jaskini, Commons, LAN i PR #11.
- Bez nowego schematu RPG, nowego iframe runtime czy fikcyjnego world demo.
- Testy RED → GREEN; jawnie oznaczać brak pełnego repo-native CI.
- Bez publikacji i merge; Owner UX musi być oceniony osobno.

## Review Focus
- Dwa spawny w jednej komórce: wybór jednoznaczny i jawny.
- Nieznany monsterId/spawnId/assetId: brak przypadkowego fallbacku na inny obiekt.
- Import/undo usunął spawn: inspector odświeża się z najnowszego snapshotu.
- Spawny na różnych piętrach: prawdziwe centrowanie mapy i zaznaczenie.
- Wąskie okno: inspector nadal dostępny, nie w ukrytym prawym panelu.

### Task 1 — Pure spawn lookup
**Create:** apps/studio/src/spawn-inspection.ts
**Test:** tests/spawn-inspection.test.ts
**Interfaces:** spawnsAtCell(spawns: readonly SpawnDefinition[], floorId: string, x: number, y: number): SpawnDefinition[]; spawnById(spawns: readonly SpawnDefinition[], id: string): SpawnDefinition | undefined.
- [ ] RED: test duplikatów w jednej komórce, pięter, pustych pól, niezmienionego wejścia.
- [ ] Run: npm run test:compile && node --test .build/node/tests/spawn-inspection.test.js — oczekiwany brak implementacji.
- [ ] GREEN: minimalne funkcje bez mutacji.
- [ ] Run focused test + npm run check. Zapisz exit i ograniczenia.
- [ ] Commit.

### Task 2 — Inspect tool and map location
**Modify:** apps/studio/src/map-editor.ts, apps/studio/template.html
**Test:** browser smoke for map click and local DOM inspection.
**Interfaces:** MapTool includes inspect; MapEditor receives onInspectMonster(monsterId); focusSpawn(spawnId): boolean.
- [ ] RED: browser click on real spawn should list all candidates without revising project, empty cell explicit.
- [ ] GREEN: left-panel inspector via DOM textContent; render current snapshot, no raw injected HTML.
- [ ] RED: navigating to location on another floor; undo removal of current spawn.
- [ ] GREEN: focusSpawn centers and highlights exact spawn; floor selection agrees.
- [ ] Build + Chromium smoke + commit.

### Task 3 — Map → Content → Asset → Map
**Modify:** apps/studio/src/main.ts, apps/studio/src/content-browser.ts, apps/studio/src/asset-browser.ts
**Tests:** browser integration path; existing browser smoke.
**Interfaces:** ContentBrowser.selectMonster(monsterId): boolean, AssetBrowser.selectAsset(assetId): boolean. Content displays locate spawn and open asset actions; main.ts activatePage(page) wires navigation.
- [ ] RED: on-map open actual monster, asset, and return to original spawn; navigation does not increase store revision.
- [ ] GREEN: minimal API, reset conflicting searches and use actual project identity.
- [ ] RED: form HP change updates same monster in ProjectStore and preview; undo restores.
- [ ] GREEN: reuse existing validated commands and preview, fix only wiring.
- [ ] npm run typecheck + npm run test + targeted Chromium, commit.

### Task 4 — Verification and honest handoff
**Create:** docs/research/2026-11-10-coopege-authoring-thread-report.md
- [ ] Fresh npm run check / npm run test:browser / npm run build, report PASS/FAIL/SKIP by command.
- [ ] Browser at 1440 and 1024 px; confirm inspector visibility and keyboard focus.
- [ ] Cold runtime/export test on modified copy, not Owner data.
- [ ] Draft PR with results, unresolved failures and exact commit.
- [ ] Notify Jaskinia issue #2 only if a fresh result materially changes Opus/Astra decision.

## Not included here
No full Quest/NPC authoring, configurable Jaskinia native windows, 2.5D schema, asset pipeline rewrite, universal editing contracts or recreation of the whole legacy v3.1 interface. These are separate later campaigns, not unspoken requirements of Task 1.
