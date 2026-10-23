import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {createChromiumHarness,findChromiumExecutable} from "../../tools/browser/chromium-cdp.mjs";

const root=resolve(import.meta.dirname,"../.."),out=resolve(root,".build/coopege-c1");
mkdirSync(out,{recursive:true});
const html=readFileSync(resolve(out,"A1_pinned.html"),"utf8");
const srv=createServer((_,res)=>{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(html);});
await new Promise((done,fail)=>srv.listen(0,"127.0.0.1",e=>e?fail(e):done()));
const browser=await createChromiumHarness({executable:findChromiumExecutable()});
try{
 await browser.withPage(async page=>{
  await page.navigate("http://127.0.0.1:"+srv.address().port);
  await page.keyDown("Digit1","1",49);await page.keyUp("Digit1","1",49);
  const analysis=await page.evaluate(`(()=>{
   const cloned=x=>JSON.parse(JSON.stringify(x));
   const pure=x=>{const y=cloned(x);delete y?.world?.exportedAt;delete y.exportedAt;return y;};
   const api={map:TibiaMapAPI,content:TibiaContentAPI,project:TibiaProjectAPI};
   const originalMap=api.map.exportWorld(), originalContent=api.content.exportPackage();
   const gate=originalMap.entrances.find(x=>x.name==='Południowa brama twierdzy');
   if(!gate)throw Error("Authentic Silver Gate south gate missing");
   const edited=cloned(originalMap);
   edited.entrances.find(x=>x.name===gate.name).name="PRÓBA C1 — podpis autorskiej bramy";
   const validation=api.map.validatePackage(edited);
   const unknownRole=cloned(originalMap);
   unknownRole.npcs.push({id:"c1_probe_courier",name:"Przewoźnik testowy",type:"courier",x:84,y:85,z:0});
   const roleValidation=api.map.validatePackage(unknownRole);
   const courierQuest=cloned(originalContent);
   courierQuest.quests.push({name:"Odzyskaj ładunek",tk:"courier_parcel",need:1,reward:{gold:10}});
   const questValidation=api.content.validatePackage(courierQuest);
   const talentProbe=cloned(originalContent);
   talentProbe.classes.warrior.talents.push({id:"carry_strength",name:"Uchwyt",max:3});
   const talentValidation=api.content.validatePackage(talentProbe);
   if(!validation.ok)throw Error("A1 cannot validate harmless south-gate label change: "+JSON.stringify(validation));
   const imported=api.map.importWorld(edited);
   const changed=api.map.exportWorld();
   const observed=changed.entrances.find(x=>x.x===gate.x&&x.y===gate.y)?.name;
   const restored=api.map.importWorld(originalMap);
   const after=api.map.exportWorld();
   return {map:{floorCount:api.map.floors.length,dimensions:[api.map.width,api.map.height],
     entrances:originalMap.entrances.length,npcs:originalMap.npcs.length,
     spawnGroups:originalMap.spawnGroups.length,links:originalMap.links.length,
     editAccepted:validation.ok,importWorldOk:imported.ok,editObserved:observed===
       "PRÓBA C1 — podpis autorskiej bramy",restoreOk:restored.ok,
     restoredExact:JSON.stringify(pure(after))===JSON.stringify(pure(originalMap))},
    content:{quests:originalContent.quests.map(q=>({name:q.name,kind:q.tk})),
      classes:Object.keys(originalContent.classes),monsters:Object.keys(originalContent.monsters),
      proposedCourierQuestAccepted:questValidation.ok,courierQuestErrors:questValidation.errors,
      proposedNewTalentAccepted:talentValidation.ok,talentWarnings:talentValidation.warnings},
    actorRole:{courierSchemaAccepted:roleValidation.ok,
      warnings:roleValidation.issues||[]},capabilities:api.project.getCapabilities()};
  })()`);
  assert.deepEqual(analysis.map.dimensions,[200,200]);
  assert.equal(analysis.map.floorCount,5);
  assert.equal(analysis.map.editAccepted,true);
  assert.equal(analysis.map.importWorldOk,true,"authoring edit import failed");
  assert.equal(analysis.map.editObserved,true,"authored label not visible in exported state");
  assert.equal(analysis.map.restoreOk,true);
  assert.equal(analysis.map.restoredExact,true,"authoring trial changed the historical control");
  assert.equal(analysis.content.proposedCourierQuestAccepted,false,
   "A1 unexpectedly gained a non-kill quest executor; inspect API");
  assert.ok(analysis.content.courierQuestErrors.some(e=>e.includes("potwora")),
   "quest rejection no longer about creature-only target");
  assert.equal(analysis.content.proposedNewTalentAccepted,true);
  assert.ok(analysis.content.talentWarnings.some(e=>e.includes("nie nadaje nowym ID")),
   "new talent may have executable behavior now; inspect contract");
  writeFileSync(resolve(out,"a1-authoring-feasibility.json"),JSON.stringify(analysis,null,2)+"\n");
  console.info("COOPEGE_C1_A1_AUTHORING_BOUNDARY_PASS",JSON.stringify(analysis));
 });
}finally{await browser.forceClose();await new Promise(done=>srv.close(()=>done()));}
