"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"authoring-document.js"),"utf8");
const copy=x=>JSON.parse(JSON.stringify(x));
function rig(){
 let world={format:"p",formatVersion:1,content:{monsters:{rat:{hp:25}},classes:{},skills:{},quests:[],exportedAt:"now"},map:{world:{id:"w",exportedAt:"now"},floors:{"0":{}},spawnGroups:[{id:"g"}],start:{},links:[],npcs:[],entrances:[{name:"North"}]},assets:{assets:{},createdAt:"now"}};
 let imports=0,alive=337,downloads=0;
 const host={
  TibiaProjectAPI:{format:"p",formatVersion:1,engineVersion:"e",validateProject:p=>({ok:p.content.monsters.rat.hp<=100000,errors:p.content.monsters.rat.hp>100000?["HP rejected"]:[],warnings:[]}),async importProject(p){imports++;world=copy(p);world.content.exportedAt="at"+imports;world.map.world.exportedAt="at"+imports;world.assets.createdAt="at"+imports;world.map.spawnGroups.forEach(g=>g.eliteCount??=0);alive=338;return{applied:true,ok:true,warnings:[]}}},
  TibiaContentAPI:{exportPackage:()=>copy(world.content)},
  TibiaMapAPI:{exportWorld:()=>copy(world.map)},
  TibiaAssetAPI:{exportPackage:async()=>copy(world.assets)},
  Image:class{set src(_){this.onload?.()}}
 };
 const document={body:{appendChild(){}},createElement(){return{click(){downloads++},remove(){}}}};
 const URL={createObjectURL:()=>"blob:test",revokeObjectURL(){}};
 vm.runInNewContext(source,{window:host,document,URL,Blob,setTimeout:()=>{}},{filename:"authoring-document.js",timeout:2000});
 return {api:host.CoopegeAuthoringDocument,get imports(){return imports},get alive(){return alive},get downloads(){return downloads},read:()=>copy(world),set:x=>world=x};
}
test("no-op does not reconstruct defeated actors",async()=>{
 const h=rig(),c=await h.api.capture(),r=await h.api.apply(c);
 assert.equal(r.unchanged,true);assert.equal(r.applied,false);assert.equal(h.imports,0);assert.equal(h.alive,337);
});
test("cold rebuild explicit; full comparator catches overlooked fields",async()=>{
 const h=rig(),c=await h.api.capture();c.project.content.monsters.rat.hp=5;
 await assert.rejects(h.api.apply(c),/cold-rebuild/);assert.equal(h.imports,0);
 const plan=await h.api.preview(c);const r=await h.api.apply(c,{mode:"cold-rebuild",proposalId:plan.proposalId});
 assert.equal(r.verified,true);assert.equal(h.read().content.monsters.rat.hp,5);
 const changed=h.read();changed.map.entrances[0].name="South";
 assert.deepEqual(Array.from(h.api.compareAuthoring(h.read(),changed).errors),["Authored map differs"]);
});
test("concurrent imports reject second request without destroying first",async()=>{
 const h=rig(),base=await h.api.capture(),x=copy(base),y=copy(base);
 x.project.content.monsters.rat.hp=5;y.project.content.monsters.rat.hp=10;
 const p1=await h.api.preview(x),p2=await h.api.preview(y);const first=h.api.apply(x,{mode:"cold-rebuild",proposalId:p1.proposalId}),second=h.api.apply(y,{mode:"cold-rebuild",proposalId:p2.proposalId});
 await assert.rejects(second,/mutation already in progress/);
 await assert.rejects(h.api.capture(),/mutation in progress/);
 await first;
 assert.equal(h.read().content.monsters.rat.hp,5);assert.equal(h.imports,1);
 assert.equal((await h.api.capture()).project.content.monsters.rat.hp,5);
});
test("stale preview cannot overwrite a second instrument's newer content",async()=>{
 const h=rig(),base=await h.api.capture(),proposal=copy(base);
 proposal.project.content.monsters.rat.hp=5;
 const first=await h.api.preview(proposal);
 const outside=h.read();outside.content.monsters.rat.hp=10;h.set(outside);
 await assert.rejects(h.api.apply(proposal,{mode:"cold-rebuild",proposalId:first.proposalId}),/changed since preview/);
 assert.equal(h.imports,0);assert.equal(h.read().content.monsters.rat.hp,10);
 const fresh=await h.api.preview(proposal);
 const accepted=await h.api.apply(proposal,{mode:"cold-rebuild",proposalId:fresh.proposalId});
 assert.equal(accepted.verified,true);assert.equal(h.imports,1);
 assert.equal(h.read().content.monsters.rat.hp,5);
 await assert.rejects(h.api.apply(proposal,{mode:"cold-rebuild",proposalId:fresh.proposalId}),/Missing or mismatched preview/);
});
test("undo refuses to overwrite later edits",async()=>{
 const h=rig(),c=await h.api.capture();c.project.content.monsters.rat.hp=5;
 const plan=await h.api.preview(c);await h.api.apply(c,{mode:"cold-rebuild",proposalId:plan.proposalId});
 const edited=h.read();edited.map.entrances[0].name="New";h.set(edited);
 const undo1=await h.api.undoLastApply();assert.equal(undo1.conflict,true);assert.equal(h.imports,1);
 edited.map.entrances[0].name="North";h.set(edited);
 const undo2=await h.api.undoLastApply();assert.equal(undo2.restored,true);
 assert.equal(h.read().content.monsters.rat.hp,25);
});
test("save rejected runtime values as creative draft",async()=>{
 const h=rig(),draft=await h.api.capture();draft.project.content.monsters.rat.hp=5555555;
 assert.equal(h.api.validate(draft).ok,false);
 const result=await h.api.download(draft,"Rat-Draft.json");
 assert.equal(result.liveImportValid,false);assert.equal(h.downloads,1);
 await assert.rejects(h.api.apply(draft,{mode:"cold-rebuild"}),/preflight rejected/);
 assert.equal(h.imports,0);
});
