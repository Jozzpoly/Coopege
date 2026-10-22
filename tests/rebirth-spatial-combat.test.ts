import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GameWorld, createInputFrame } from "../packages/gameplay/src/index.js";
import { prepareRuntimeProject } from "../packages/runtime-core/src/index.js";

function worldWithWall(wall:boolean,range=1.4) {
  const p=JSON.parse(readFileSync("project/project.json","utf8")) as any;
  p.content.abilities[0].rangeTiles=range;
  const floor=p.world.floors[0];
  const cells:string[]=[];
  for(const [id,count] of floor.tiles as [string,number][]) for(let i=0;i<count;i++)cells.push(id);
  if(wall)cells[3*floor.width+5]="tile.wall";
  const rle:Array<[string,number]>=[];
  for(const cell of cells){ const last=rle.at(-1); if(last&&last[0]===cell)last[1]++;else rle.push([cell,1]);}
  floor.tiles=rle;
  const prep=prepareRuntimeProject(p);
  if(!prep.ok)throw Error(JSON.stringify(prep.issues));
  const world=new GameWorld(prep.prepared);
  world.player.position={x:4.55,y:3.5};
  const enemy=world.monsters[0]!;
  enemy.position={x:6.45,y:3.5};
  // Enemy must not attack or move first; test the real player's ability alone.
  enemy.aggroRangeTiles=.1;
  return {world,enemy};
}

test("R0: ściana naprawdę osłania przed uderzeniem — nie tylko przed chodzeniem",()=>{
  const a=worldWithWall(true),b=worldWithWall(false);
  const fire=(w:GameWorld)=>w.step(createInputFrame(1,w.playerId,{moveX:0,moveY:0,aimX:1,aimY:0,usePrimary:true}));
  const withWall=a.enemy.hp,withoutWall=b.enemy.hp;
  fire(a.world);fire(b.world);
  console.info("COOPEGE_R0_WALL",JSON.stringify({blocked:{before:withWall,after:a.enemy.hp},open:{before:withoutWall,after:b.enemy.hp}}));
  assert.equal(a.enemy.hp,withWall,"kafelek ściany przepuścił atak");
  assert.ok(b.enemy.hp<withoutWall,"otwarte pole musi nadal umożliwiać trafienie");
});

test("R0: potwór w trakcie cooldownu nie przepycha się przez pozycję bohatera",()=>{
  const input=JSON.parse(readFileSync("project/project.json","utf8")) as unknown;
  const prep=prepareRuntimeProject(input);
  if(!prep.ok)throw Error(JSON.stringify(prep.issues));
  const w=new GameWorld(prep.prepared);
  const monster=w.monsters[0]!;
  w.player.position={x:6.5,y:4.5};
  let firstAttackTick:number|null=null;
  const events:ReturnType<typeof w.events.drain>=[];
  w.events.subscribeAll(e=>events.push(e));
  const separation=()=>Math.hypot(w.player.position.x-monster.position.x,w.player.position.y-monster.position.y);
  let atAttack=0;
  for(let tick=1;tick<=60;tick++){
    w.step(createInputFrame(tick,w.playerId,{moveX:0,moveY:0,aimX:1,aimY:0,usePrimary:false}));
    if(firstAttackTick===null && events.some(e=>e.type==="damage.applied"&&e.context.sourceEntityId===monster.entityId)){
      firstAttackTick=tick;atAttack=separation();
    }
    if(firstAttackTick!==null&&tick===firstAttackTick+10)break;
  }
  assert.ok(firstAttackTick!==null,"wroga nie udało się sprowokować do ataku");
  const after=separation();
  console.info("COOPEGE_R0_SPACING",JSON.stringify({firstAttackTick,atAttack,after,cooldownUntil:monster.cooldownUntilTick}));
  assert.ok(after>=atAttack-0.12,"wróg zbliża się przez cooldown tak, jakby miał wejść w ciało gracza");
  assert.ok(w.player.alive,"gracz przetrwał pierwszy kontakt");
});

test("R0: przekątna nie przenika przez zablokowany narożnik kafli",()=>{
  // Diagonal ray 4.5,3.5 -> 6.5,5.5 passes exactly by the corner
  // separating cells (5,3) and (4,4). Supercover must consider both.
  const blocked=worldWithWall(true,3),open=worldWithWall(false,3);
  for(const w of [blocked,open]){
    w.world.player.position={x:4.5,y:3.5};
    w.enemy.position={x:6.5,y:5.5};
    w.world.step(createInputFrame(1,w.world.playerId,
      {moveX:0,moveY:0,aimX:1,aimY:1,usePrimary:true}));
  }
  const outcome={blockedHp:blocked.enemy.hp,openHp:open.enemy.hp};
  console.info("COOPEGE_R0_CORNER",JSON.stringify(outcome));
  assert.equal(outcome.blockedHp,35,"promień minął blokujący narożnik");
  assert.ok(outcome.openHp<35,"brak ściany nie może blokować ukośnego ataku");
});
