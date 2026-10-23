import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import "./world.js";
const core=globalThis.CoopegeB1Core;
const root=resolve(import.meta.dirname,"../..");
const source=JSON.parse(readFileSync(resolve(root,".build/coopege-b0/source-authored-witness.json"),"utf8"));
const make=()=>core.create(source);
test("B1 inherits actual authored place, group, NPCs rather than fixed legacy scripts",()=>{
 const w=make();
 assert.equal(w.player.x,88.5);assert.equal(w.player.y,84.5);
 assert.equal(w.authored.group.label,"Szczury przy południowym trakcie");
 assert.equal(w.rats.length,5);assert.equal(w.authored.npcs.length,2);
 assert.ok(w.authored.npcs.some(n=>n.role==="healer"));
 assert.ok(w.authored.entrances.some(n=>n.name.includes("Południowa")));
 assert.equal(w.grid.tiles.length,40000);
});
test("B3 moving through cart contact creates continuous motion and persistent shared cover",()=>{
 const w=make();
 assert.equal(core.canOccupy(w,88.5,99.5,.28),false);
 const initial=core.sight(w,{x:88.5,y:98.1},{x:88.5,y:99.6});
 assert.equal(initial,false,"original cart must block sight");
 w.player.x=88.5;w.player.y=98.75;w.player.facing={x:0,y:1};
 for(let i=0;i<58;i++)core.step(w,{dy:1},1/60);
 assert.ok(w.cart.y>100.4,JSON.stringify(w.cart));
 assert.ok(Math.abs(w.cart.y-Math.round(w.cart.y))>.015,
  "cart snapped to an integral grid cell");
 assert.equal(core.sight(w,{x:88.5,y:98.1},{x:88.5,y:99.6}),true,
  "material displacement did not change the same visibility query");
 const saved=core.save(w),loaded=core.restore(source,saved);
 assert.deepEqual(core.save(loaded),saved,"smooth cart state lost on reload");
});
test("B1 basic contact uses same cover as perception and combat; no wall-hits",()=>{
 const w=make(),rat=w.rats[0];rat.x=88.5;rat.y=100.5;
 w.player.x=88.5;w.player.y=98.5;w.player.facing={x:0,y:1};
 const hp=rat.hp;
 core.step(w,{hit:true},1/60);
 assert.equal(rat.hp,hp,"atak przeleciał przez wózek");
 // Clear the material barrier via a same-world change. No scripted combat rule.
 w.cart.x=91.5;
 rat.x=88.5;rat.y=99.5;
 w.player.attackCd=0;
 core.step(w,{hit:true},1/60);
 assert.ok(rat.hp<hp,"atak na otwartej przestrzeni nie zadał obrażeń");
});
test("B1 purposeful interactions persist across authored return and reload",()=>{
 const w=make();
 assert.ok(core.mapWalk(w,84.5,83.5),"kupiec z dawnej mapy nie ma przechodniego otoczenia");
 w.player.x=84.5;w.player.y=83.5;w.player.coins=3;
 core.step(w,{interact:true},1/60);
 assert.equal(w.player.coins,0);assert.equal(w.player.bandages,2);
 const saved=core.save(w);
 const another=core.restore(source,saved);
 assert.equal(another.player.bandages,2);
 assert.equal(another.player.coins,0);
 assert.equal(another.authored.npcs.find(n=>n.role==="merchant").name,"Kupiec");
});
test("B3 pressed cart stops at solid authored terrain without tunneling",()=>{
 const w=make(),c=w.cart;
 let blocker=null;
 for(let y=80;y<112&&!blocker;y++)for(let x=78;x<102;x++){
  if(!core.mapWalk(w,x+.5,y+.5)&&core.mapWalk(w,x+.5,y+1.5)){
   blocker={x,y};break;
  }
 }
 assert.ok(blocker,"no wall witness beside Srebrna Brama");
 c.x=blocker.x+.5;c.y=blocker.y+1.5;c.vx=c.vy=0;
 w.player.x=c.x;w.player.y=c.y+.75;w.player.facing={x:0,y:-1};
 const startY=c.y;
 for(let i=0;i<90;i++)core.step(w,{dy:-1},1/60);
 assert.ok(c.y>=startY-.06,"object passed through solid wall: "+JSON.stringify({startY,y:c.y}));
});
test("B1 saved state cannot be silently attached to a different authored map",()=>{
 const world=make(),snapshot=core.save(world);
 const unchanged=structuredClone(source);
 // The live Tibia exporter contains date metadata; it is not game-world identity.
 unchanged.authored.world.exportedAt="2088-01-01T00:00:00.000Z";
 assert.deepEqual(core.save(core.restore(unchanged,snapshot)),snapshot,
  "nonsemantic export timestamp wrongly invalidated the save");
 const changed=structuredClone(source);
 changed.authored.npcs[0].x++;
 assert.throws(()=>core.restore(changed,snapshot),/authored world changed/,
  "save imported into a different authored world without warning");
});

test("B1 the same movable cover changes a creature's perception, not only rendering",()=>{
 const w=make(),rat=w.rats[0];
 w.player.x=88.5;w.player.y=97.8;
 rat.x=88.5;rat.y=101.5;rat.alert=0;rat.homeX=rat.x;rat.homeY=rat.y;
 // Controlled preconditions; decisions below use the untouched in-game sim.
 assert.equal(core.sight(w,rat,w.player),false);
 core.step(w,{},1/60);
 assert.equal(rat.alert,0,"creature detected hero through a solid movable object");
 w.cart.x=89.5;
 assert.equal(core.sight(w,rat,w.player),true);
 core.step(w,{},1/60);
 assert.ok(rat.alert>2,"after clearing the view the same creature ignores its new perception");
 console.info("COOPEGE_B1_PERCEPTION",JSON.stringify({coverCleared:true,awareness:rat.alert}));
});


test("B2 occluded pursuer follows last witnessed place, not invisible live player",()=>{
 const w=make(),rat=w.rats[0],p=w.player;
 for(const other of w.rats)if(other!==rat)other.alive=false;
 p.x=88.5;p.y=97.8;
 rat.x=88.5;rat.y=101.5;rat.homeX=rat.x;rat.homeY=rat.y;rat.alert=0;
 w.cart.x=89.5; // controlled exposure
 assert.equal(core.sight(w,rat,p),true);
 core.step(w,{},1/60);
 assert.equal(rat.lastSeenX,88.5);
 assert.equal(rat.lastSeenY,97.8);
 w.cart.x=88.5; // move cover back between player and creature
 p.x=88.0;
 assert.equal(core.sight(w,rat,p),false);
 const observedX=rat.x;
 core.step(w,{},1/60);
 assert.equal(rat.lastSeenX,88.5,"AI learned unseen live player position");
 assert.ok(Math.abs(rat.x-observedX)<1e-7,
  "AI steered toward a player position learned through cover");
 const saved=core.save(w),loaded=core.restore(source,saved);
 assert.equal(loaded.rats[0].lastSeenX,88.5,"last witnessed place was lost on reload");
 assert.deepEqual(core.save(loaded),saved);
});

test("B2 current obstruction prevents melee while an enemy remains alerted",()=>{
 const w=make(),rat=w.rats[0],p=w.player;
 for(const other of w.rats)if(other!==rat)other.alive=false;
 // Synthetic instant placement only to isolate the rule that perception
 // and physical hit adjudication use the same current occlusion.
 p.x=88.5;p.y=99.15;
 rat.x=88.5;rat.y=99.82;rat.alert=2;rat.cooldown=0;
 rat.lastSeenX=p.x;rat.lastSeenY=p.y;
 w.cart.x=88.5;w.cart.y=99.5;
 assert.ok(core.dist(p,rat)<.8);
 assert.equal(core.sight(w,rat,p),false);
 const hp=p.hp;
 core.step(w,{},1/60);
 assert.equal(p.hp,hp,"alerted creature hit through an inserted solid obstacle");
});

test("B3 near-hand pointer drag moves continuously, not remotely, and persists",()=>{
 const w=make(),c=w.cart;
 const y=c.y;
 // The player starts in the city, out of reach. Remote cursor control must fail.
 for(let i=0;i<40;i++)core.step(w,{grab:{x:88.5,y:105}},1/60);
 assert.equal(c.y,y,"cursor teleported an unattended cart");
 w.player.x=88.5;w.player.y=98.75;
 for(let i=0;i<60;i++)core.step(w,{grab:{x:88.5,y:101.25}},1/60);
 assert.ok(c.y>y+.12,"reachable cursor did not move the cart");
 assert.ok(c.y<100.5,"pointer moved cart beyond physical reach");
 assert.ok(Math.abs(c.y-Math.round(c.y))>.01,"pointer motion snapped to a tile");
 const saved=core.save(w);
 assert.deepEqual(core.save(core.restore(source,saved)),saved);
});
