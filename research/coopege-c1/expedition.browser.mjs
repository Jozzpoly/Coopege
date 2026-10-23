import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {createChromiumHarness,findChromiumExecutable} from "../../tools/browser/chromium-cdp.mjs";

const root=resolve(import.meta.dirname,"../.."),out=resolve(root,".build/coopege-c1");
mkdirSync(out,{recursive:true});
const html=readFileSync(resolve(root,".build/coopege-c1/Coopege_C1_Expedition.html"),"utf8");
const server=createServer((req,res)=>{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(html);});
await new Promise((res,rej)=>server.listen(0,"127.0.0.1",e=>e?rej(e):res()));
const browser=await createChromiumHarness({executable:findChromiumExecutable()});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const trace=[];
const inspect=page=>page.evaluate("CoopegeB1Evidence.inspect()");
async function hold(page,code,key,keyCode,ms){
 await page.keyDown(code,key,keyCode);await sleep(ms);await page.keyUp(code,key,keyCode);await sleep(180);
}
try{
 await browser.withPage(async page=>{
  await page.navigate("http://127.0.0.1:"+server.address().port+"/b5");
  await sleep(650);
  const start=await inspect(page);
  trace.push({phase:"start",...start});
  assert.equal(start.authoredNpcCount,2);
  assert.equal(start.rats,13,"B5 did not recover city-adjacent authored groups");
  assert.equal(start.episode.courierDelivered,false);
  await page.screenshot(resolve(out,"C1-01-silver-gate.png"));

  // Normal keyboard, no state mutation or teleport.
  await hold(page,"KeyS","s",83,5200);
  const trail=await inspect(page);
  trace.push({phase:"trail",...trail});
  assert.ok(trail.y>99.5,"could not reach trail with normal movement "+JSON.stringify(trail));
  assert.ok(trail.cart.y>99.55,"body-cart contact failed on route");
  await page.screenshot(resolve(out,"C1-02-trail.png"));

  await hold(page,"KeyD","d",68,520);
  const near=await inspect(page);trace.push({phase:"near-satchel",...near});
  await page.pressKey("KeyE","e",69,75);
  await sleep(120);
  const claimed=await inspect(page);
  trace.push({phase:"claimed",...claimed});
  assert.equal(claimed.episode.hasCourierBag,true,"normal E did not pick up parcel "+JSON.stringify({near,claimed}));
  await page.screenshot(resolve(out,"C1-03-courier-satchel.png"));

  await page.pressKey("KeyP","p",80,70);
  const saved=await inspect(page);
  await hold(page,"KeyW","w",87,570);
  await page.pressKey("KeyL","l",76,70);await sleep(170);
  const restored=await inspect(page);
  trace.push({phase:"save-load",...restored});
  assert.equal(restored.episode.hasCourierBag,true,"save/load lost expedition object");
  assert.ok(Math.abs(restored.y-saved.y)<.03,"save/load lost player location");

  await hold(page,"KeyW","w",87,4850);
  await hold(page,"KeyA","a",65,1470);
  const town=await inspect(page);
  trace.push({phase:"merchant-approach",...town});
  await page.screenshot(resolve(out,"C1-04-return-to-town.png"));
  await page.pressKey("KeyE","e",69,70);
  await sleep(180);
  const delivered=await inspect(page);
  trace.push({phase:"delivered",...delivered});
  assert.equal(delivered.episode.courierDelivered,true,"actual return and reward failed "+JSON.stringify({town,delivered}));
  assert.ok(delivered.coins>=24,"merchant return was not rewarded");
  await page.screenshot(resolve(out,"C1-05-delivered.png"));
  await page.pressKey("KeyE","e",69,70);await sleep(100);
  const repeat=await inspect(page);
  assert.equal(repeat.coins,delivered.coins-3,"merchant must sell a bandage, not repay the delivery");
  writeFileSync(resolve(out,"expedition-trace.json"),JSON.stringify(trace,null,2));
  console.info("COOPEGE_C1_EXPEDITION_BROWSER_PASS",JSON.stringify({start:{x:start.x,y:start.y},
   trail:{x:trail.x,y:trail.y,cart:trail.cart},claim:claimed.episode.hasCourierBag,
   returned:{x:town.x,y:town.y},delivered:delivered.episode.courierDelivered,reward:delivered.coins,
   playerInput:"actual Chromium keyDown/keyUp, no test teleport"}));
 });
}finally{
 await browser.forceClose();
 await new Promise(res=>server.close(()=>res()));
}
