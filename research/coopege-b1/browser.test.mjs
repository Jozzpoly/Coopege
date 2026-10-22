import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdirSync,readFileSync} from "node:fs";
import {resolve} from "node:path";
import {createChromiumHarness,findChromiumExecutable} from "../../tools/browser/chromium-cdp.mjs";
const root=resolve(import.meta.dirname,"../..");
const html=readFileSync(resolve(root,".build/coopege-b1/Coopege_B1_Za_Brama.html"),"utf8");
const out=resolve(root,".build/coopege-b1");
mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});res.end(html);});
await new Promise((resolve,reject)=>server.listen(0,"127.0.0.1",err=>err?reject(err):resolve()));
const addr=server.address();const url="http://127.0.0.1:"+addr.port+"/b1";
const exec=findChromiumExecutable();if(!exec)throw Error("Real Chromium required");
const browser=await createChromiumHarness({executable:exec});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const inspect=page=>page.evaluate("CoopegeB1Evidence.inspect()");
try{
 await browser.withPage(async page=>{
  await page.navigate(url);
  await sleep(550);
  const initial=await inspect(page);
  assert.ok(initial.tick>0&&initial.authoredNpcCount===2,JSON.stringify(initial));
  assert.ok(initial.authoredEncounter.includes("Szczury"));
  await page.screenshot(resolve(out,"B1-01-city.png"));
  await page.keyDown("KeyS","s",83);
  await sleep(3900);
  await page.keyUp("KeyS","s",83);
  const beforePush=await inspect(page);
  assert.ok(beforePush.y>97.4&&beforePush.y<99.5,
    "Did not physically reach authored gate/cart: "+JSON.stringify(beforePush));
  assert.equal(beforePush.cart.y,99.5,"cart moved without player interaction");
  await page.screenshot(resolve(out,"B1-02-south-gate.png"));
  await page.pressKey("KeyE","e",69,85);
  await sleep(180);
  const moved=await inspect(page);
  assert.equal(moved.cart.y,100.5,
    "Natural player E near cart did not push a physical obstacle: "+JSON.stringify(moved));
  await page.screenshot(resolve(out,"B1-03-material-moved.png"));
  await page.pressKey("KeyP","p",80,80);
  const saved=await inspect(page);
  await page.keyDown("KeyW","w",87);await sleep(650);await page.keyUp("KeyW","w",87);
  const away=await inspect(page);
  assert.ok(away.y<saved.y-.35,"could not retreat physically after moving the object");
  await page.pressKey("KeyL","l",76,80);
  await sleep(110);
  const loaded=await inspect(page);
  assert.ok(Math.abs(loaded.y-saved.y)<.001,"UI load did not restore player position");
  assert.equal(loaded.cart.y,100.5,"UI save/load discarded the material change");
  await page.screenshot(resolve(out,"B1-04-world-restored.png"));
  console.info("COOPEGE_B1_BROWSER_PASS",JSON.stringify({
   start:{x:initial.x,y:initial.y},arrived:{x:beforePush.x,y:beforePush.y},
   movedCart:{x:moved.cart.x,y:moved.cart.y},retreated:{y:away.y},reloaded:{y:loaded.y,cart:loaded.cart},
   running:loaded.tick>initial.tick,authorNpc:initial.authoredNpcCount,encounter:initial.authoredEncounter
  }));
 });
}finally{await browser.forceClose();await new Promise(res=>server.close(()=>res()));}
