import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import vm from "node:vm";

const root=resolve(import.meta.dirname,"../..");
const html=readFileSync(resolve(root,"research/coopege-b5/Coopege_B5_Pierwsza_Wyprawa.html"),"utf8");
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
 assert.equal(snap.version,3);
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
