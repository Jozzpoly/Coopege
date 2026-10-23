import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import vm from "node:vm";

const root=resolve(import.meta.dirname,"../..");
const html=readFileSync(resolve(root,".build/coopege-c1/Coopege_C1_Expedition.html"),"utf8");
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const fixture=JSON.parse(readFileSync(resolve(root,".build/coopege-b0/source-authored-witness.json"),"utf8"));
assert.ok(scripts.length>=4&&scripts.length<=5,'Expected core, episode, view, bootstrap and optional atlas');
const context={console,Math,JSON,Number,Date};context.globalThis=context;vm.createContext(context);
vm.runInContext(scripts[0],context);vm.runInContext(scripts[1],context);
const core=context.CoopegeB1Core;

test("B5 recovers the source-authored quests and north/west/south surface threats",()=>{
 const w=core.create(fixture);
 assert.equal(w.rats.length,13);
 assert.equal(w.episode.legacyBounty.name,"Plaga pod murami");
 assert.equal(w.episode.legacyBounty.need,8);
 assert.equal(w.episode.legacyBounty.reward.gold,60);
 assert.equal(w.episode.legacyBounty.reward.hpot,2);
 assert.ok(core.mapWalk(w,w.episode.courierBag.x,w.episode.courierBag.y));
});
test("B5 cart still moves with ordinary contact, not E",()=>{
 const w=core.create(fixture);
 const y=w.cart.y;
 for(let i=0;i<290;i++)core.step(w,{dy:1},1/60);
 assert.ok(w.cart.y>y+.15,"continuous cart contact was lost");
 const after=w.cart.y;core.step(w,{interact:true},1/60);
 assert.ok(Math.abs(w.cart.y-after)<.1,"E teleported cart");
});
test("B5 collectible delivery, one-time payment, bounty and save/restore",()=>{
 const w=core.create(fixture);
 for(const r of w.rats)r.alive=false;
 w.player.x=90.5;w.player.y=102.5;core.step(w,{interact:true},1/60);
 assert.equal(w.episode.hasCourierBag,true);
 const snap=JSON.parse(JSON.stringify(core.save(w)));
 assert.equal(snap.version,5);
 const t=core.restore(fixture,snap);
 assert.equal(t.rats.length,13);assert.deepEqual(JSON.stringify(core.save(t)),JSON.stringify(snap));
 t.player.x=84.5;t.player.y=83.5;
 const gold=t.player.coins;
 core.step(t,{interact:true},1/60);
 assert.equal(t.episode.courierDelivered,true);
 assert.equal(t.player.coins,gold+24);
 core.step(t,{interact:true},1/60);
 assert.equal(t.player.coins,gold+21,"merchant should return to ordinary 3-coin bandage trade after delivery");
 t.kills=8;core.step(t,{interact:true},1/60);
 assert.equal(t.player.coins,gold+81);
 assert.equal(t.episode.verminBountyPaid,true);
 core.step(t,{interact:true},1/60);
 assert.equal(t.player.coins,gold+78,"bounty must not repay; merchant sells a bandage instead");
});

test("C1 parcel can be placed in the world, left behind, recovered, saved and delivered once",()=>{
 const w=core.create(fixture),p=w.player,e=w.episode;
 p.x=e.courierBag.x;p.y=e.courierBag.y-1;p.facing={x:0,y:1};
 core.step(w,{interact:true},1/60);
 assert.equal(e.hasCourierBag,true);
 const origin={...e.courierBag};
 p.x-=1.5;p.y-=1.5;
 core.step(w,{drop:true},1/60);
 assert.equal(e.hasCourierBag,false);
 assert.ok(core.dist(e.courierBag,origin)>1,"parcel returned to scripted pickup spot");
 const dropped={...e.courierBag};
 const rec=JSON.parse(JSON.stringify(core.save(w)));
 assert.equal(rec.version,5);
 const loaded=core.restore(fixture,rec);
 assert.deepEqual(JSON.stringify(core.save(loaded)),JSON.stringify(rec));
 loaded.player.x=82.5;loaded.player.y=82.5;
 core.step(loaded,{interact:true},1/60);
 assert.equal(loaded.episode.hasCourierBag,false,"remote pickup");
 loaded.player.x=dropped.x;loaded.player.y=dropped.y-.65;
 core.step(loaded,{interact:true},1/60);
 assert.equal(loaded.episode.hasCourierBag,true,"local pickup after loading");
 loaded.player.x=84.5;loaded.player.y=83.5;
 core.step(loaded,{interact:true},1/60);
 assert.equal(loaded.episode.courierDelivered,true);
 assert.equal(loaded.player.coins,24);
 core.step(loaded,{interact:true},1/60);
 assert.equal(loaded.player.coins,21,"merchant sale after story reward");
 assert.ok(!loaded.lastAction.includes("Trakt znowu"),"merchant claimed rat danger is gone while rats survive");
});


test("C1 same authored delivery supports bypass or direct material push without menu gates",()=>{
 function walk(sequence){
   const w=core.create(fixture);
   for(const [input,frames] of sequence)for(let i=0;i<frames;i++)core.step(w,input,1/60);
   core.step(w,{interact:true},1/60);
   assert.equal(w.episode.hasCourierBag,true,"natural route did not reach parcel: "+JSON.stringify({player:w.player,worker:w.worker,cart:w.cart,bag:w.episode.courierBag,carriedByWorker:w.episode.workerCarrying,nearRats:w.rats.filter(r=>r.alive&&core.dist(r,w.player)<3).map(r=>({x:r.x,y:r.y}))}));
   assert.equal(w.player.dead,false);
   return w;
 }
 // Both paths obey the same collision geometry, actors and input contract.
 const direct=walk([[{dy:1},310],[{dx:1},31]]);
 const detour=walk([[{dy:1},175],[{dx:1},30],[{dy:1},140]]);
 assert.ok(direct.cart.y>103,"body push route did not change the physical scene");
 assert.equal(detour.cart.y,99.5,"walking around the cart inexplicably moved it");
 assert.equal(direct.kills,0);
 assert.equal(detour.kills,0);
 assert.ok(direct.player.hp>0&&detour.player.hp>0);
 assert.notEqual(core.save(direct).cart.y,core.save(detour).cart.y,
  "two distinct world histories collapsed onto the same snapshot");
});


test("C1 simultaneous drop + interact cannot silently discard merchant delivery",()=>{
 const w=core.create(fixture);
 w.player.x=w.episode.courierBag.x;
 w.player.y=w.episode.courierBag.y-1;
 core.step(w,{interact:true},1/60);
 assert.equal(w.episode.hasCourierBag,true);
 w.player.x=84.5;w.player.y=83.5;
 core.step(w,{interact:true,drop:true},1/60);
 assert.equal(w.episode.courierDelivered,true);
 assert.equal(w.player.coins,24);
 assert.equal(w.episode.hasCourierBag,false);
});

test("E1 worker starts at the original warehouse and walks toward the south gate",()=>{
 const w=core.create(fixture);
 assert.equal(w.worker.x,82.5);assert.equal(w.worker.y,90.5);
 assert.equal(w.worker.phase,"outbound");
 assert.equal(w.episode.merchantStock,0);
 for(let i=0;i<350;i++)core.step(w,{},1/60);
 assert.ok(w.worker.x>82.5,"worker did not leave the real warehouse");
 assert.equal(w.episode.merchantStock,0,"shop restocked without arriving cargo");
 const record=JSON.parse(JSON.stringify(core.save(w)));
 assert.deepEqual(JSON.stringify(core.save(core.restore(fixture,record))),JSON.stringify(record),
   "worker position/knowledge and quest cargo state do not survive save");
});
test("E1 autonomous worker retrieves real ground cargo and stocks the shop after walking it home",()=>{
 const w=core.create(fixture);for(const r of w.rats)r.alive=false;
 let took=false;
 for(let i=0;i<4200;i++){
   core.step(w,{},1/60);
   if(w.episode.workerCarrying)took=true;
   if(w.episode.courierDelivered)break;
 }
 assert.equal(took,true,"worker never physically retrieved the cargo");
 assert.equal(w.episode.courierDelivered,true,JSON.stringify(w.worker));
 assert.equal(w.episode.merchantStock,3);
 assert.equal(w.player.coins,0,"worker must not award an uninvolved player");
});
test("E1 player alternative delivers before worker, then purchases only delivered stock",()=>{
 const w=core.create(fixture);
 w.player.x=w.episode.courierBag.x;w.player.y=w.episode.courierBag.y-1;
 core.step(w,{interact:true},1/60);assert.equal(w.episode.hasCourierBag,true);
 assert.equal(w.episode.workerCarrying,false);
 w.player.x=84.5;w.player.y=83.5;
 core.step(w,{interact:true},1/60);
 assert.equal(w.episode.courierDelivered,true);
 assert.equal(w.episode.merchantStock,3);
 assert.equal(w.player.coins,24);
 core.step(w,{interact:true},1/60);
 assert.equal(w.episode.merchantStock,2);
 assert.equal(w.player.coins,21);
});
