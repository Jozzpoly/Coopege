import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {createChromiumHarness,findChromiumExecutable} from "../../tools/browser/chromium-cdp.mjs";

// Both files are exact standalone game artifacts, no mocked world or test teleport.
// A1 is pinned separately by the workflow; B3 is built from this commit.
const root=resolve(import.meta.dirname,"../..");
const output=resolve(root,".build/coopege-b2");
mkdirSync(output,{recursive:true});
const a1=readFileSync(resolve(output,"A1_pinned.html"),"utf8");
const b2=readFileSync(resolve(root,".build/coopege-b1/Coopege_B3_Zywy_Kontakt.html"),"utf8");
const server=createServer((req,res)=>{
 const html=req.url==="/a1"?a1:req.url==="/b3"?b2:null;
 res.writeHead(html?200:404,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});
 res.end(html??"Not found");
});
await new Promise((resolve,reject)=>server.listen(0,"127.0.0.1",e=>e?reject(e):resolve()));
const origin="http://127.0.0.1:"+server.address().port;
const executable=findChromiumExecutable();
if(!executable)throw Error("Real Chromium is required for same-place comparison");
const browser=await createChromiumHarness({executable});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const observations={test:"Same authored southern approach, natural keyboard input",units:"tiles",a1:null,b3:null,
 disclaimer:"Technical/visual comparison only; neither enjoyment nor player-choice value is automatically demonstrated"};
try{
 await browser.withPage(async page=>{
  await page.navigate(origin+"/a1");
  await sleep(350);
  await page.keyDown("Digit1","1",49);
  await page.keyUp("Digit1","1",49);
  await sleep(450);
  const start=await page.evaluate("window.CoopegeCandidateA1.inspect()");
  assert.equal(start.state,"play","A1 failed normal class selection");
  assert.ok(start.monsters>0,"A1 lost its authored threats");
  await page.screenshot(resolve(output,"A1-01-city.png"));
  await page.keyDown("KeyS","s",83);await sleep(3700);await page.keyUp("KeyS","s",83);
  const south=await page.evaluate("window.CoopegeCandidateA1.inspect()");
  assert.ok(south.y>start.y+64,"A1 did not travel south with normal keyboard");
  await page.screenshot(resolve(output,"A1-02-south.png"));
  observations.a1={source:"A1 Tibia-derived",classKey:start.classKey,threats:start.monsters,
   start:{x:+(start.x/32).toFixed(2),y:+(start.y/32).toFixed(2)},
   south:{x:+(south.x/32).toFixed(2),y:+(south.y/32).toFixed(2)},
   sourceScale:"A1 world coordinates / 32"};
 });
 await browser.withPage(async page=>{
  await page.navigate(origin+"/b3");
  await sleep(500);
  const start=await page.evaluate("window.CoopegeB1Evidence.inspect()");
  assert.ok(start.authoredNpcCount===2&&start.rats>0,"B2 lost authored characters or threats");
  await page.screenshot(resolve(output,"B3-01-city.png"));
  await page.keyDown("KeyS","s",83);await sleep(3700);await page.keyUp("KeyS","s",83);
  const south=await page.evaluate("window.CoopegeB1Evidence.inspect()");
  assert.ok(south.y>start.y+5,"B2 did not travel south with normal keyboard");
  await page.screenshot(resolve(output,"B3-02-south.png"));
  observations.b3={source:"B3 independent authored contact runtime",threats:start.rats,
   authoredNpcCount:start.authoredNpcCount,authoredEncounter:start.authoredEncounter,
   start:{x:+start.x.toFixed(2),y:+start.y.toFixed(2)},
   south:{x:+south.x.toFixed(2),y:+south.y.toFixed(2)},cart:south.cart};
 });
 writeFileSync(resolve(output,"same-place-observations.json"),JSON.stringify(observations,null,2)+"\n");
 console.info("COOPEGE_B2_SAME_PLACE_PASS",JSON.stringify(observations));
}finally{
 await browser.forceClose();
 await new Promise(resolve=>server.close(()=>resolve()));
}
