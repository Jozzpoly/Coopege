import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GameWorld, createInputFrame, type PlayerCommand } from "../packages/gameplay/src/index.js";
import { prepareRuntimeProject } from "../packages/runtime-core/src/index.js";

/**
 * A first playable RPG failure hypothesis:
 * After a threat stops following the player it should not remain abandoned
 * where it was last chasing. A future expedition revisits the same world.
 *
 * Test starts with a real authored slime spawn and native GameWorld ticks.
 * The only diagnostic adjustment is its aggro radius (2.1) to fit the small
 * 12x8 baseline room. All player positions after t=0 come from real input.
 */
test("Coopege R0: wycofanie z walki pozwala przeciwnikowi fizycznie wrócić do swojego miejsca", () => {
  const input = JSON.parse(readFileSync(resolve("project/project.json"), "utf8")) as unknown;
  const prepared = prepareRuntimeProject(input);
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues));
  const world = new GameWorld(prepared.prepared);
  const monster = world.monsters[0]!;
  const home = { ...monster.homePosition };
  monster.aggroRangeTiles = 2.1;
  monster.leashRangeTiles = 9;
  const distance = () => Math.hypot(monster.position.x-home.x, monster.position.y-home.y);
  const log: Array<{tick:number;playerX:number;monsterX:number;distance:number;target:string|null}> = [];
  const inputFor=(moveX:number):PlayerCommand=>({ moveX, moveY:0, aimX:-1, aimY:0, usePrimary:false });
  const step = (moveX:number) => {
    world.step(createInputFrame(world.tick+1,world.playerId,inputFor(moveX)));
    if (world.tick%15===0) log.push({tick:world.tick,playerX:world.player.position.x,monsterX:monster.position.x,distance:distance(),target:monster.targetPlayerId});
  };

  // Approach; the enemy is not sent an imperative or moved by the test.
  for(let i=0;i<34;i++)step(1);
  assert.equal(monster.targetPlayerId,world.playerId,"potwór powinien zauważyć gracza");
  // The player runs away, not through the adversary or the wall.
  for(let i=0;i<100;i++)step(-1);
  assert.equal(monster.targetPlayerId,null,"gracz zerwał kontakt, gdy wyszedł poza zasięg");
  const separation=distance();
  assert.ok(separation>0.8, "przeciwnik faktycznie opuścił swoje miejsce w trakcie starcia");
  // Time now passes in the same world, with no player intervention.
  for(let i=0;i<115;i++)step(0);
  const returned=distance();
  console.info("COOPEGE_R0_RETREAT",JSON.stringify({
    home, separation:+separation.toFixed(3),returned:+returned.toFixed(3),
    player:world.player.position,monster:monster.position,
    target:monster.targetPlayerId,history:log
  }));
  assert.ok(returned<0.35, `przeciwnik nie wrócił do swojego miejsca: pozostał ${returned.toFixed(3)} pola od domu`);
  assert.equal(monster.targetPlayerId,null);
  assert.equal(world.player.alive,true);
});
