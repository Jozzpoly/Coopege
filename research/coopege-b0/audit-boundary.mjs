import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createChromiumHarness, findChromiumExecutable } from "../../tools/browser/chromium-cdp.mjs";

/**
 * A boundary audit, NOT a new engine or a claim that old architecture is good.
 * Loads Tibia's *executing* source-of-truth in a real browser. Compares it with
 * the modern migrated content that M7 consumes, without attempting to restore
 * missing meaning by guesswork.
 *
 * The important invariant is preservation of authored semantics, not of source
 * code, original combat algorithms, class IDs, or legacy runtime behavior.
 */
const root=resolve(import.meta.dirname,"../..");
const html=readFileSync(resolve(root,"legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html"),"utf8");
const migration=JSON.parse(readFileSync(resolve(root,"project/migration/legacy-v14.1/coopege.project.v2.json"),"utf8"));
const executable=findChromiumExecutable();
if(!executable)throw Error("The semantic audit requires a real Chromium runtime; refusing static assumptions.");
const browser=await createChromiumHarness({executable});
let legacy;
try{
  await browser.withPage(async page=>{
    await page.setContent(html);
    legacy=await page.evaluate(`(async()=>{
      for(let i=0;i<350;i++){
        const m=window.TibiaMapAPI,c=window.TibiaContentAPI;
        if(m?.exportWorld && c?.exportPackage){
          const world=m.exportWorld(),content=c.exportPackage();
          return {world,content,capabilities:{
            map:m.getCapabilities?.(),
            content:c.getCapabilities?.(),
            project:window.TibiaProjectAPI?.getCapabilities?.(),
          }};
        }
        await new Promise(r=>setTimeout(r,40));
      }
      throw Error("Tibia live APIs not available; cannot infer the original from the legacy file text.");
    })()`);
  });
}finally{await browser.forceClose();}
assert.ok(legacy?.world?.floors && legacy?.content,"No live Tibia export");
const arr = x=>Array.isArray(x)?x:x&&typeof x==="object"?Object.values(x):[];
const defs = migration.world.tiles;
const tilesById=new Map(defs.map(d=>[d.id,d]));
const tileNum=id=>{
  if(typeof id==="number")return id;
  const m=String(id).match(/(?:tile[.]legacy[.])?(\d+)$/);
  return m?Number(m[1]):NaN;
};
function expandRle(tiles,label){
  assert.ok(Array.isArray(tiles),label+": tiles not RLE");
  const expanded=[];
  for(const entry of tiles){
    assert.ok(Array.isArray(entry)&&entry.length===2&&Number.isInteger(entry[1])&&entry[1]>0,
      label+": malformed RLE entry");
    const n=tileNum(entry[0]);
    assert.ok(Number.isInteger(n),label+": unfamiliar legacy tile identifier "+entry[0]);
    for(let i=0;i<entry[1];i++)expanded.push(n);
  }
  return expanded;
}
const floorReport=[];
for(const [z,floor] of Object.entries(legacy.world.floors)){
  const suffix=Number(z)<0?"minus_"+Math.abs(Number(z)):String(z);
  const migrated=migration.world.floors.find(f=>f.id==="floor.legacy.z_"+suffix);
  if(!migrated){floorReport.push({z,found:false});continue;}
  const before=expandRle(floor.tiles,"legacy "+z);
  const after=expandRle(migrated.tiles,"migration "+z);
  let differences=0;const firstDifferences=[];
  for(let i=0;i<Math.max(before.length,after.length);i++){
    if(before[i]!==after[i]){
      differences++;
      if(firstDifferences.length<4)firstDifferences.push({x:i%200,y:Math.floor(i/200),before:before[i]??null,after:after[i]??null});
    }
  }
  floorReport.push({z,found:true,before:before.length,after:after.length,differences,firstDifferences});
}
const monsters=legacy.content.monsters??{};
const sourceNpcs=arr(legacy.world.npcs).map(n=>({id:n.id,name:n.name,type:n.type,floor:n.z}));
const sourceQuests=arr(legacy.content.quests).map(q=>({name:q.name,kind:q.tk,need:q.need,reward:q.reward}));
const sourceEntrances=arr(legacy.world.entrances).map(x=>({name:x.name,z:x.z,x:x.x,y:x.y}));
const sourceLinks=arr(legacy.world.links);
const converted=migration.content;
const report={
  scope:"Live Tibia v14.1 export vs Coopege M7 project V2 migration (not feature or feel benchmark)",
  original:{floorCount:Object.keys(legacy.world.floors).length,
    monsterDefinitions:arr(monsters).length,quests:sourceQuests,
    npcs:sourceNpcs,entrances:sourceEntrances,
    links:sourceLinks.length,
    mapCapabilities:legacy.capabilities.map,contentCapabilities:legacy.capabilities.content},
  migrated:{floorCount:migration.world.floors.length,
    monsterDefinitions:converted.monsters.length,spawns:converted.spawns.length,
    transitions:migration.world.transitions.length,
    topLevelWorldKeys:Object.keys(migration.world).sort(),
    topLevelContentKeys:Object.keys(converted).sort(),
    topLevelGameplayKeys:Object.keys(migration.gameplay??{}).sort()},
  tiles:floorReport,
  semanticBoundary:{
    npcPositionsAndRolesRepresented:
      Object.prototype.hasOwnProperty.call(migration.world,"npcs")||Object.prototype.hasOwnProperty.call(converted,"npcs"),
    questDefinitionsRepresented:
      Object.prototype.hasOwnProperty.call(converted,"quests")||Object.prototype.hasOwnProperty.call(migration.gameplay??{},"quests"),
    authoredEntranceNamesRepresented:
      Object.prototype.hasOwnProperty.call(migration.world,"entrances"),
    note:"Absent as named authored data is not equivalent to deleted from all game behavior. These are distinct capability losses in this migrated project schema."},
  caveats:["Structural map equality is NOT proof of preserving authored difficulty, boss roles, atmosphere or meaning",
    "Original game has legacy hard-coded interactions not necessarily exposed by current APIs",
    "No new playable game, no architecture decision, no portability claim for original NPC code"]
};
const output=resolve(root,".build/coopege-b0");
mkdirSync(output,{recursive:true});
// A *source witness*, not a final schema, game balance or the old executable.
// Preserve the authored fields exactly; record holes and provenance explicitly.
const capsule={
  format:"coopege-authored-source-witness/v0",
  source:{repository:"Jozzpoly/Coopege",
    file:"legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html",
    mapApiFormat:legacy.world.format,mapApiVersion:legacy.world.formatVersion,
    contentApiFormat:legacy.content.format,contentApiVersion:legacy.content.formatVersion},
  authored:{
    world:legacy.world.world,
    floors:legacy.world.floors,
    start:legacy.world.start,
    entrances:legacy.world.entrances,
    npcs:legacy.world.npcs,
    links:legacy.world.links,
    spawnGroups:legacy.world.spawnGroups,
    spawns:legacy.world.spawns,
    tilePalette:legacy.world.tilePalette,
    quests:legacy.content.quests,
    monsters:legacy.content.monsters,
  },
  openGaps:[
    "Equipment definitions and shop behavior are not part of exported TibiaContentAPI",
    "NPC dialogue and healing/merchant behavior are not defined by exported NPC markers",
    "Terrain graphic provenance and all custom PNG bytes are not part of this witness",
    "Quest wording, rewards and monsters are historical evidence, not final game design",
    "Runtime movement, combat, AI, progression, save and networking are NOT imported"
  ],
  boundary:"Authored source facts only. No implied execution or adopted architecture."
};
assert.equal(arr(capsule.authored.npcs).length,sourceNpcs.length);
assert.equal(arr(capsule.authored.quests).length,sourceQuests.length);
assert.equal(Object.keys(capsule.authored.floors).length,5);
writeFileSync(resolve(output,"source-authored-witness.json"),JSON.stringify(capsule,null,2)+"\n");
writeFileSync(resolve(output,"semantic-boundary.json"),JSON.stringify(report,null,2)+"\n");
console.info("COOPEGE_B0_SEMANTIC_BOUNDARY",JSON.stringify({
  floorCount:report.original.floorCount,
  tileDifferences:floorReport.map(f=>({z:f.z,differences:f.differences})),
  sourceNpcs:sourceNpcs.length,
  migratedNpcs:report.semanticBoundary.npcPositionsAndRolesRepresented,
  quests:sourceQuests.length,
  migratedQuests:report.semanticBoundary.questDefinitionsRepresented,
  entrances:sourceEntrances.length,
  migratedEntrances:report.semanticBoundary.authoredEntranceNamesRepresented,
  sourceLinks:sourceLinks.length,
  targetTransitions:report.migrated.transitions
}));
assert.equal(floorReport.length,5,"This authoring donor is no longer the historic five-floor world");
assert.ok(sourceNpcs.length>0&&sourceQuests.length>0,"The historic game exported no playable social/RPG data");
assert.ok(floorReport.every(f=>f.found&&f.before===40000&&f.after===40000),"One authored floor was lost or invalid");
console.info("PASS provenance and audit integrity; semantic losses above are *negative research findings*, not successes.");
