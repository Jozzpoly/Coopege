import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createChromiumHarness, findChromiumExecutable } from "../browser/chromium-cdp.mjs";

const root = resolve(import.meta.dirname, "../..");
const browser = findChromiumExecutable();
if (!browser) {
  const message = "SKIP testy przeglądarkowe: nie znaleziono Chromium/Chrome/Edge.";
  if (process.env.COOPEGE_REQUIRE_BROWSER === "1") throw new Error(message);
  console.log(message);
  process.exit(0);
}

const outputDir = resolve(root, ".build/browser-smoke");
mkdirSync(outputDir, { recursive: true });

async function withFreshChromium(callback, timeoutMs = 70000) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let harness = null;
    let timer;
    try {
      const work = (async () => {
        harness = await createChromiumHarness({ executable: browser });
        return callback(harness);
      })();
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout scenariusza Chromium po ${timeoutMs} ms.`)), timeoutMs);
      });
      return await Promise.race([work, timeout]);
    } catch (error) {
      lastError = error;
      if (attempt < 2) console.warn(`RETRY Chromium scenario after attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
      if (harness) await harness.forceClose();
    }
  }
  throw lastError;
}

async function inspect(name, file, expression) {
  const html = readFileSync(resolve(root, file), "utf8");
  const result = await withFreshChromium((chromium) => chromium.withPage(async (page) => {
    await page.setContent(html);
    const value = await page.evaluate(`(async()=>{
      const deadline=Date.now()+20000;
      while(Date.now()<deadline){
        const value=await (${expression});
        if(value?.ready)return value;
        await new Promise(resolve=>setTimeout(resolve,35));
      }
      throw new Error('Timeout smoke testu: ${name}');
    })()`);
    await page.screenshot(resolve(outputDir, `${name}.png`));
    return value;
  }));
  if (!result?.ok) throw new Error(`${name}: ${JSON.stringify(result)}`);
  console.log(`PASS browser ${name}: ${result.summary}`);
}

await inspect(
  "m2-runtime",
  "dist/Coopege_M2_Runtime.html",
  `(async()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;const save=window.__COOPEGE_GAME_DEBUG__?.save();return{ready:d?.ready===true&&d?.gameplayTick>=2,ok:d?.gameplayReady===true&&d.runtimeRevision===1&&d.mode==='standalone'&&d.livingMonsters===1&&save?.format==='coopege-save'&&save?.schemaVersion===3&&save?.actors?.length===2&&save?.spawnStates?.length===1,summary:(document.querySelector('#status')?.textContent||'')+' · tick='+d?.gameplayTick+' · '+d?.gameplayChecksum};})()`,
);

await inspect(
  "m7-authored-spawns",
  "dist/Coopege_v0.01.html",
  `(async()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;return{ready:d?.ready===true&&d?.gameplayTick>=2,ok:d?.gameplayReady===true&&window.__COOPEGE_PROJECT__?.world?.floors?.length===5&&window.__COOPEGE_PROJECT__?.content?.spawns?.length===338&&d.authoredSpawnDefinitions===338&&d.authoredSpawnInstances===338&&d.activeSpawnInstances===1&&d.sleepingSpawnInstances===337&&d.activeMonsterLimit===48&&d.authoredTransitionCount===24&&d.textureLayoutAssets===45&&d.livingMonsters===1&&window.__COOPEGE_GAME_DEBUG__?.save()?.schemaVersion===3&&window.__COOPEGE_GAME_DEBUG__?.save()?.spawnStates?.length===338,summary:d?.projectName+' · authored='+d?.authoredSpawnInstances+' · active='+d?.activeSpawnInstances+' · gameplay='+d?.gameplayChecksum};})()`,
);

const realControlsResult = await withFreshChromium((chromium) => chromium.withPage(async (page) => {
  const html = readFileSync(resolve(root, "dist/Coopege_v0.01.html"), "utf8");
  await page.setContent(html);
  await waitForPage(page, `(()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;return d?.ready&&d.gameplayTick>=2?d:null;})()`, "m7-real-controls-bootstrap");

  // Native ArrowRight is a real user path: it must auto-join P2 as keyboard player.
  // Holding the key while using the explicit leave button must not immediately
  // rejoin P2; a new key press after release is required.
  await page.keyDown("ArrowRight", "ArrowRight", 39);
  await waitForPage(page, `(()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;return d?.playerCount===2&&d.secondaryInputDevice==='keyboard'?d:null;})()`, "p2-keyboard-auto-join");
  await page.evaluate(`document.querySelector('#joinButton').click()`);
  await waitForPage(page, `(()=>window.__COOPEGE_RUNTIME_DIAGNOSTICS__?.playerCount===1?true:null)()`, "p2-explicit-leave");
  await new Promise((resolve) => setTimeout(resolve, 260));
  const stayedDisconnected = await page.evaluate(`window.__COOPEGE_RUNTIME_DIAGNOSTICS__?.playerCount===1`);
  if (!stayedDisconnected) throw new Error("P2 dołączył ponownie mimo trzymanego klawisza po ręcznym odłączeniu.");
  await page.keyUp("ArrowRight", "ArrowRight", 39);
  // Let at least one fixed input poll observe the released state before the next edge.
  await new Promise((resolve) => setTimeout(resolve, 100));
  await page.keyDown("ArrowRight", "ArrowRight", 39);
  await waitForPage(page, `(()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;return d?.playerCount===2&&d.secondaryInputDevice==='keyboard'?d:null;})()`, "p2-keyboard-rejoin-after-release");
  await page.keyUp("ArrowRight", "ArrowRight", 39);

  const setup = await page.evaluate(`(()=>{
    const debug=window.__COOPEGE_GAME_DEBUG__;
    const snapshot=debug.save();
    const diagnostics=debug.diagnostics();
    const transition=window.__COOPEGE_PROJECT__.world.transitions.find(entry=>entry.source.floorId===diagnostics.activeFloorId);
    if(!transition)throw new Error('Brak authored transition na aktywnym piętrze');
    const players=snapshot.actors.filter(actor=>actor.kind==='player').sort((a,b)=>a.playerId.localeCompare(b.playerId));
    if(players.length!==2)throw new Error('P2 nie dołączył przez klawiaturę');
    const centerX=transition.source.x+0.5;
    const centerY=transition.source.y+0.5;
    players[0].x=centerX-0.52;players[0].y=centerY;players[0].previousX=players[0].x;players[0].previousY=players[0].y;players[0].facingX=1;players[0].facingY=0;
    players[1].x=centerX-1.05;players[1].y=centerY+0.55;players[1].previousX=players[1].x;players[1].previousY=players[1].y;
    debug.load(snapshot);
    return{sourceFloorId:transition.source.floorId,destinationFloorId:transition.destination.floorId,transitionId:transition.id};
  })()`);

  // Native KeyD moves P1 across the source cell; no debug transition call is used.
  await page.pressKey("KeyD", "d", 68, 420);
  const transitioned = await waitForPage(page, `(()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;return d?.activeFloorId===${JSON.stringify(setup.destinationFloorId)}&&d.lastTransitionId===${JSON.stringify(setup.transitionId)}?{diagnostics:{...d},snapshot:window.__COOPEGE_GAME_DEBUG__.save()}:null;})()`, "real-stair-entry", 12000);
  const players = transitioned.snapshot.actors.filter((actor) => actor.kind === "player");
  const destination = windowSafeTransitionDestination(setup, transitioned.snapshot);
  await page.screenshot(resolve(outputDir, "m7-real-controls-stairs.png"));
  return { setup, transitioned, players, destination };
}));

function windowSafeTransitionDestination(setup, snapshot) {
  return {
    floorId: setup.destinationFloorId,
    playerSeparation: (() => { const players = snapshot.actors.filter((actor) => actor.kind === "player"); return players.length >= 2 ? Math.hypot(players[0].x - players[1].x, players[0].y - players[1].y) : 0; })(),
  };
}

if (!(realControlsResult.transitioned.diagnostics.playerCount === 2
  && realControlsResult.transitioned.diagnostics.secondaryInputDevice === "keyboard"
  && realControlsResult.transitioned.diagnostics.authoredTransitionCount === 24
  && realControlsResult.transitioned.diagnostics.textureLayoutAssets === 45
  && realControlsResult.players.length === 2
  && realControlsResult.players.every((actor) => actor.floorId === realControlsResult.setup.destinationFloorId)
  && realControlsResult.destination.playerSeparation > 0.05)) {
  throw new Error(`m7-real-controls-stairs: ${JSON.stringify(realControlsResult)}`);
}
console.log(`PASS browser m7-real-controls-stairs: P2 keyboard edge join/leave/rejoin=PASS · native P1 stair entry=${realControlsResult.setup.transitionId} · party placement=PASS`);

await inspect(
  "m2-studio-bridge",
  "dist/Coopege_Studio_v0.1.html",
  `(async()=>{
    const wait=async predicate=>{const end=Date.now()+12000;while(Date.now()<end){const value=predicate();if(value)return value;await new Promise(resolve=>setTimeout(resolve,30));}throw new Error('Timeout interakcji M2 Studio');};
    const initial=window.__COOPEGE_STUDIO_DIAGNOSTICS__;
    if(!initial?.bridgeReady||initial.previewRevision<1)return{ready:false};
    const frame=document.querySelector('#previewFrame');
    const sandbox=frame?.getAttribute('sandbox')||'';
    const originalName=initial.projectName;
    const name=document.querySelector('#projectNameInput');
    name.value='Coopege Browser Bridge Test';
    name.dispatchEvent(new Event('change',{bubbles:true}));
    await wait(()=>window.__COOPEGE_STUDIO_DIAGNOSTICS__?.previewStudioRevision===1);
    const edited={...window.__COOPEGE_STUDIO_DIAGNOSTICS__};
    const x=document.querySelector('#startXInput');
    x.value='99999';
    x.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,100));
    const afterRejected={...window.__COOPEGE_STUDIO_DIAGNOSTICS__};
    document.querySelector('#undoButton').click();
    await wait(()=>window.__COOPEGE_STUDIO_DIAGNOSTICS__?.projectName===originalName&&window.__COOPEGE_STUDIO_DIAGNOSTICS__?.previewStudioRevision===2);
    const final={...window.__COOPEGE_STUDIO_DIAGNOSTICS__};
    return{
      ready:true,
      ok:sandbox==='allow-scripts'&&!sandbox.includes('allow-same-origin')&&initial.runtimeCapabilities?.includes('gameworld.fixed-step')&&initial.runtimeCapabilities?.includes('gameworld.save.v3')&&initial.runtimeCapabilities?.includes('world.authored-spawns.v1')&&initial.runtimeCapabilities?.includes('gameworld.local-coop.2p')&&edited.storeRevision===1&&edited.previewStudioRevision===1&&afterRejected.storeRevision===1&&final.storeRevision===2&&final.previewStudioRevision===2&&final.undoDepth===0&&final.redoDepth===1,
      summary:'M2 gameplay preview=PASS · atomic reject=PASS · undo preview=PASS · sandbox='+sandbox,
    };
  })()`,
);

await inspect(
  "m3-runtime-assets",
  "dist/Coopege_v0.01.html",
  `(async()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;return{ready:d?.ready===true&&d?.gameplayTick>=2&&d?.assetReady===d?.assetTotal,ok:d?.gameplayReady===true&&d.assetTotal===45&&d.assetReady===45&&d.assetFailed===0,summary:'M3 assets='+d?.assetReady+'/'+d?.assetTotal+' · failed='+d?.assetFailed+' · '+d?.gameplayChecksum};})()`,
);

await inspect(
  "m4-local-coop",
  "dist/Coopege_M4_Runtime.html",
  `(async()=>{
    const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;
    if(!d?.ready||d.gameplayTick<2)return{ready:false};
    if(!window.__COOPEGE_M4_BROWSER_TEST__){
      window.__COOPEGE_M4_BROWSER_TEST__=(async()=>{
        const debug=window.__COOPEGE_GAME_DEBUG__;
        const wait=async(label,predicate,timeout=10000)=>{const end=Date.now()+timeout;while(Date.now()<end){const value=predicate();if(value)return value;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Timeout M4 coop browser test: '+label+' '+JSON.stringify(debug.diagnostics()));};
        debug.joinPlayer2();
        await wait('join',()=>debug.diagnostics().playerCount===2);
        const setup=debug.save();
        const players=setup.actors.filter(actor=>actor.kind==='player').sort((a,b)=>a.playerId.localeCompare(b.playerId));
        const monster=setup.actors.find(actor=>actor.kind==='monster');
        if(players.length!==2||!monster)throw new Error('Brak aktorów scenariusza M4');
        players[0].x=monster.x+0.5;players[0].y=monster.y;players[0].previousX=players[0].x;players[0].previousY=players[0].y;players[0].facingX=-1;players[0].facingY=0;
        players[1].x=monster.x-0.5;players[1].y=monster.y;players[1].previousX=players[1].x;players[1].previousY=players[1].y;players[1].facingX=1;players[1].facingY=0;
        monster.hp=1;monster.alive=true;monster.respawnAtTick=0;
        const spawnState=setup.spawnStates.find(state=>state.instanceId===monster.spawnInstanceId);
        if(!spawnState)throw new Error('Brak kanonicznego stanu spawnu M4');
        spawnState.hp=1;spawnState.status='active';spawnState.activeEntityId=monster.entityId;spawnState.respawnAtTick=0;
        debug.load(setup);
        debug.setVirtualCommand('slot.gamepad.1',{moveX:0,moveY:0,aimX:1,aimY:0,usePrimary:true});
        await wait('reward',()=>debug.diagnostics().teamQuestKillCredits>=1,6000);
        debug.setVirtualCommand('slot.gamepad.1',null);
        const rewarded={...debug.diagnostics()};
        const saved=debug.save();
        debug.leavePlayer2();
        await wait('leave',()=>debug.diagnostics().playerCount===1);
        debug.load(saved);
        const restored=debug.save();
        const restoreEqual=JSON.stringify(restored)===JSON.stringify(saved);
        return{rewarded,saved,restoreEqual};
      })().then(result=>({
        ready:true,
        ok:result.rewarded.playerCount===2&&result.rewarded.player2Loot>=1&&(result.rewarded.player1Xp+result.rewarded.player2Xp)>0&&result.saved?.schemaVersion===3&&result.saved?.playerSlots?.filter(slot=>slot.joined).length===2&&result.restoreEqual,
        summary:'M4 players=2 · rewards='+result.rewarded.teamQuestKillCredits+' · P2 loot='+result.rewarded.player2Loot+' · save v3 + spawn state restore=PASS',
      }));
    }
    return await window.__COOPEGE_M4_BROWSER_TEST__;
  })()`,
);

await inspect(
  "m4-party-floor-transition",
  "dist/Coopege_v0.01.html",
  `(async()=>{
    const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;
    if(!d?.ready||d.gameplayTick<2)return{ready:false};
    if(!window.__COOPEGE_M4_FLOOR_TEST__){
      window.__COOPEGE_M4_FLOOR_TEST__=(async()=>{
        const debug=window.__COOPEGE_GAME_DEBUG__;
        debug.joinPlayer2();
        const floorIds=window.__COOPEGE_PROJECT__.world.floors.map(floor=>floor.id);
        const nextFloor=floorIds.find(id=>id!==debug.diagnostics().activeFloorId);
        debug.transitionParty(nextFloor);
        await new Promise(resolve=>setTimeout(resolve,120));
        const snapshot=debug.save();
        const players=snapshot.actors.filter(actor=>actor.kind==='player');
        return{
          ready:true,
          ok:snapshot.activeFloorId===nextFloor&&snapshot.schemaVersion===3&&snapshot.playerSlots.filter(slot=>slot.joined).length===2&&players.length===2&&players.every(player=>player.floorId===nextFloor),
          summary:'M4 team floor='+nextFloor+' · players='+players.length+' · save v'+snapshot.schemaVersion,
        };
      })();
    }
    return await window.__COOPEGE_M4_FLOOR_TEST__;
  })()`,
);


await inspect(
  "m5-gameplay-language-coop",
  "dist/Coopege_M5_Runtime.html",
  `(async()=>{
    const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;
    if(!d?.ready||d.gameplayTick<2)return{ready:false};
    if(!window.__COOPEGE_M5_LANGUAGE_TEST__){
      window.__COOPEGE_M5_LANGUAGE_TEST__=(async()=>{
        const debug=window.__COOPEGE_GAME_DEBUG__;
        debug.joinPlayer2();
        const wait=async(label,predicate,timeout=7000)=>{const end=Date.now()+timeout;while(Date.now()<end){const value=predicate();if(value)return value;await new Promise(resolve=>setTimeout(resolve,35));}throw new Error('Timeout M5 language test: '+label+' '+JSON.stringify(debug.diagnostics()));};
        await wait('join',()=>debug.diagnostics().playerCount===2);
        const setup=debug.save();
        const players=setup.actors.filter(actor=>actor.kind==='player').sort((a,b)=>a.playerId.localeCompare(b.playerId));
        const monster=setup.actors.find(actor=>actor.kind==='monster');
        if(players.length!==2||!monster)throw new Error('Brak aktorów scenariusza M5');
        players[0].x=monster.x+0.45;players[0].y=monster.y;players[0].previousX=players[0].x;players[0].previousY=players[0].y;players[0].facingX=-1;players[0].facingY=0;
        players[1].x=monster.x-0.45;players[1].y=monster.y;players[1].previousX=players[1].x;players[1].previousY=players[1].y;players[1].facingX=1;players[1].facingY=0;
        monster.hp=1;monster.alive=true;monster.respawnAtTick=0;
        const spawnState=setup.spawnStates.find(state=>state.instanceId===monster.spawnInstanceId);
        if(!spawnState)throw new Error('Brak kanonicznego stanu spawnu M5');
        spawnState.hp=1;spawnState.status='active';spawnState.activeEntityId=monster.entityId;spawnState.respawnAtTick=0;
        debug.load(setup);
        debug.setVirtualCommand('slot.gamepad.1',{moveX:0,moveY:0,aimX:1,aimY:0,usePrimary:true});
        await wait('data trigger reward',()=>debug.diagnostics().teamQuestKillCredits>=1);
        debug.setVirtualCommand('slot.gamepad.1',null);
        const result={...debug.diagnostics()};
        return result;
      })().then(result=>({
        ready:true,
        ok:result.projectSchemaVersion===2&&result.gameplayGraphCount===6&&result.gameplayBindingCount===6&&result.gameplayTriggerCount===1&&result.gameplayDomains.length===6&&result.gameplayDomains.includes('ability')&&result.gameplayDomains.includes('quest-reaction')&&result.playerCount===2&&result.teamQuestKillCredits>=1&&result.gameplayExecutionFailures===0,
        summary:'M5 schema v'+result.projectSchemaVersion+' · graphs='+result.gameplayGraphCount+' · domains='+result.gameplayDomains.length+' · coop trigger credit='+result.teamQuestKillCredits,
      }));
    }
    return await window.__COOPEGE_M5_LANGUAGE_TEST__;
  })()`,
);

async function waitForPage(page, expression, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await page.evaluate(expression);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  const diagnostics = await page.evaluate("window.__COOPEGE_STUDIO_DIAGNOSTICS__ ?? null");
  throw new Error(`Timeout interakcji M3 Studio [${label}]: ${JSON.stringify(diagnostics)}`);
}

const studioPackageCheck = JSON.parse(readFileSync(resolve(root, "dist/Coopege_M7A_Asset_Vault/manifest.json"), "utf8"));
if (!(studioPackageCheck.assetCount === 45
  && studioPackageCheck.assets.filter((asset) => asset.status === "legacy-placeholder").length === 45
  && readFileSync(resolve(root, "dist/Coopege_M7A_Asset_Vault/contact-sheet.html"), "utf8").includes("Coopege Asset Vault"))) {
  throw new Error(`m7a-asset-vault-package: ${JSON.stringify(studioPackageCheck)}`);
}
console.log("PASS browser-adjacent m7a-asset-vault-package: manifest=45 · contact sheet=PASS · heavy Studio import covered by Node Asset Vault tests");

