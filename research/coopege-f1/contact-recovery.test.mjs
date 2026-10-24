import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import vm from "node:vm";
const root=resolve(import.meta.dirname,"../..");
const realm=vm.createContext({});
for(const file of ["core.js","episode.js"]){
 vm.runInContext(readFileSync(resolve(root,"research/coopege-c1/src",file),"utf8"),realm,{filename:file});
}
const api=realm.CoopegeB1Core;
const source=JSON.parse(readFileSync(resolve(root,"research/coopege-c1/src/witness.json"),"utf8"));
const advance=(w,input,n)=>{for(let i=0;i<n;i++)api.step(w,input,1/60)};
function setup(){
 const w=api.create(source);
 for(const r of w.rats)r.alive=false;
 w.worker.phase="searching";
 return w;
}
test("Owner trap: a legal worker approach can no longer freeze outward cart movement",()=>{
 const w=setup();
 Object.assign(w.worker,{x:90.5,y:101.565});
 Object.assign(w.cart,{x:90.5,y:102.27,vx:0,vy:0});
 Object.assign(w.player,{x:90.5,y:103.27});
 const initial={...w.cart};
 advance(w,{grab:{x:90.5,y:103}},100);
 assert.ok(api.dist(w.cart,initial)>.12,"outward pointer guidance still freezes");
 assert.ok(api.dist(w.worker,w.cart)>api.dist(w.worker,initial),
   "pulling outward reduced body clearance");
});
for(const [label,vector] of Object.entries({
 north:[0,-1],south:[0,1],east:[1,0],west:[-1,0],
 northeast:[.707,-.707],southwest:[-.707,.707]
})){
 test("Free outward guidance "+label,()=>{
  const w=setup(),[dx,dy]=vector,cx=90.5,cy=102.27;
  Object.assign(w.cart,{x:cx,y:cy,vx:0,vy:0});
  Object.assign(w.worker,{x:cx+dx*.705,y:cy+dy*.705});
  Object.assign(w.player,{x:cx-dx,y:cy-dy});
  const before={...w.cart};
  advance(w,{grab:{x:cx-dx*.45,y:cy-dy*.45}},80);
  assert.ok(api.dist(w.cart,before)>.08,"outward action must recover at this angle");
  assert.ok(api.dist(w.cart,w.worker)>api.dist(before,w.worker));
 });
}
test("Cart cannot pass through the worker by dragging inward",()=>{
 const w=setup();
 Object.assign(w.cart,{x:90.5,y:102.27,vx:0,vy:0});
 Object.assign(w.worker,{x:90.5,y:101.565});
 Object.assign(w.player,{x:90.5,y:103.27});
 advance(w,{grab:{x:90.5,y:101.4}},90);
 assert.ok(w.cart.y>102.24,"unsafe overlap/ghost passage through worker");
});
test("Worker takes an authored, collision-tested sidestep around the cart and returns",()=>{
 const w=api.create(source);
 for(const r of w.rats)r.alive=false;
 Object.assign(w.worker,{x:90.5,y:101.565,phase:"outbound",index:2,detour:[]});
 Object.assign(w.cart,{x:90.5,y:102.27,vx:0,vy:0});
 Object.assign(w.player,{x:100.5,y:95.5});
 const old={...w.cart};
 let witnessedDetour=false;
 for(let i=0;i<700;i++){
  api.step(w,{},1/60);
  if(w.worker.detour?.length)witnessedDetour=true;
  assert.ok(api.mapWalk(w,w.worker.x,w.worker.y),"worker entered solid terrain");
  assert.ok(api.dist(w.worker,w.cart)>=w.cart.radius+.25-.025,"actor penetrated cart");
 }
 assert.ok(witnessedDetour,"worker kept pushing into cart indefinitely");
 assert.ok(w.worker.y<98,"worker did not take cargo through return detour");
 assert.equal(api.dist(w.cart,old),0,"worker moved cart without an impulse contract");
});
test("Save and replay halfway through detour reproduce actor and cart state",()=>{
 const w=api.create(source);
 for(const r of w.rats)r.alive=false;
 Object.assign(w.worker,{x:90.5,y:101.565,phase:"outbound",index:2,detour:[]});
 Object.assign(w.cart,{x:90.5,y:102.27,vx:0,vy:0});
 Object.assign(w.player,{x:100.5,y:95.5});
 advance(w,{},30);
 assert.ok(w.worker.detour?.length,"no detour state to serialize");
 const snap=JSON.parse(JSON.stringify(api.save(w)));
 const restored=api.restore(source,snap);
 assert.equal(JSON.stringify(api.save(restored)),JSON.stringify(snap));
 advance(w,{},180);advance(restored,{},180);
 assert.ok(api.dist(w.worker,restored.worker)<1e-6,"actor drift after reload");
 assert.ok(api.dist(w.cart,restored.cart)<1e-6);
});
test("A real rat can still stop/hurt unattended worker; contact change does not neutralize danger",()=>{
 const w=api.create(source);
 advance(w,{},1800);
 assert.ok(w.worker.hp<36,"worker became magically immune to rats");
 assert.equal(w.episode.merchantStock,0,"shop magically restocked");
});
test("Without rats, worker still independently collects cargo and physically delivers",()=>{
 const w=api.create(source);
 for(const r of w.rats)r.alive=false;
 advance(w,{},3700);
 assert.equal(w.episode.merchantStock,3);
 assert.equal(w.episode.courierDelivered,true);
});
