import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {createChromiumHarness,findChromiumExecutable} from "../../tools/browser/chromium-cdp.mjs";

// Separate browser proof for the unassisted actor, using the same exact
// standalone HTML as human play. We only inspect; there are no test teleports,
// injected ticks, or forced quest progress.
const root=resolve(import.meta.dirname,"../..");
const out=resolve(root,".build/coopege-c1");
mkdirSync(out,{recursive:true});
const html=readFileSync(resolve(out,"Coopege_C1_Expedition.html"),"utf8");
const server=createServer((_,res)=>{
  res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(html);
});
await new Promise((ok,fail)=>server.listen(0,"127.0.0.1",e=>e?fail(e):ok()));
const browser=await createChromiumHarness({executable:findChromiumExecutable()});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const inspect=page=>page.evaluate("CoopegeB1Evidence.inspect()");
try{
 await browser.withPage(async page=>{
  await page.navigate("http://127.0.0.1:"+server.address().port+"/e1");
  await pause(500);
  const first=await inspect(page);
  // This is an actual unpaused game: by the time Chromium renders the first
  // frame, the worker has already taken ordinary steps out of the warehouse.
  assert.ok(first.worker.x>=82.5&&first.worker.x<85.5,
    "worker did not originate at source warehouse: "+JSON.stringify(first.worker));
  assert.ok(Math.abs(first.worker.y-90.5)<.1);
  assert.equal(first.episode.merchantStock,0,"merchant began magically restocked");
  await pause(6200);
  const leaving=await inspect(page);
  assert.ok(leaving.worker.x>87.5&&leaving.worker.alive,
    "worker did not leave the warehouse in natural Chrome runtime: "+JSON.stringify(leaving.worker));
  await page.screenshot(resolve(out,"E1-worker-01-left-warehouse.png"));
  await pause(14500);
  const danger=await inspect(page);
  assert.ok(danger.worker.y>99.5,
    "worker never reached the actual southern hazard: "+JSON.stringify(danger.worker));
  assert.ok(danger.worker.phase==="sheltering"||danger.worker.hp<36||!danger.worker.alive,
    "nearby rats had no causal effect on an exposed worker: "+JSON.stringify(danger.worker));
  assert.equal(danger.episode.merchantStock,0,"shop restocked despite blocked delivery");
  await page.screenshot(resolve(out,"E1-worker-02-threatened-at-gate.png"));
  await pause(8400);
  const final=await inspect(page);
  assert.ok(final.worker.hp<36||!final.worker.alive,
    "rats never harmed unattended exposed worker: "+JSON.stringify(final.worker));
  assert.equal(final.episode.merchantStock,0,"cargo teleported to merchant during attack");
  assert.equal(final.episode.courierDelivered,false);
  assert.equal(final.episode.workerCarrying,false,"worker duplicated cargo while injured");
  assert.notEqual(final.episode.known.workerPhase,"fallen",
    "remote death was telepathically added to the player's knowledge");
  assert.equal(final.episode.known.delivered,false);
  assert.ok(!final.episode.notes.some(n=>n.includes("Tragarz upadł")),
    "unseen worker death leaked into the visible journal");
  await page.screenshot(resolve(out,"E1-worker-03-unassisted-consequence.png"));
  const evidence={first,leaving,danger,final};
  writeFileSync(resolve(out,"e1-live-worker-evidence.json"),JSON.stringify(evidence,null,2));
  console.info("COOPEGE_E1_UNASSISTED_ACTOR_CHROME_PASS",
    JSON.stringify({warehouse:[first.worker.x,first.worker.y],
      leftWarehouse:[leaving.worker.x,leaving.worker.y],
      danger:{at:[danger.worker.x,danger.worker.y],phase:danger.worker.phase,hp:danger.worker.hp},
      consequence:{phase:final.worker.phase,hp:final.worker.hp,merchantStock:final.episode.merchantStock},
      noCheatStateMutation:true}));
 });
}finally{
 await browser.forceClose();
 await new Promise(ok=>server.close(()=>ok()));
}
