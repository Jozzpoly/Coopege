import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdirSync,readFileSync} from "node:fs";
import {resolve} from "node:path";
import {createChromiumHarness,findChromiumExecutable} from "../../tools/browser/chromium-cdp.mjs";
const root=resolve(import.meta.dirname,"../..");
const html=readFileSync(resolve(root,".build/coopege-b1/Coopege_B4_Trakt_Srebrnej_Bramy.html"),"utf8");
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
  await sleep(3600);
  await page.keyUp("KeyS","s",83);
  const atRoad=await inspect(page);
  assert.ok(atRoad.y>96.4&&atRoad.y<99.2,"Did not walk to cart: "+JSON.stringify(atRoad));
  assert.equal(atRoad.cart.y,99.5,"cart shifted without body contact");
  await page.screenshot(resolve(out,"B4-02-before-contact.png"));
  // E is only an NPC interaction key: it must not teleport or displace the cart.
  await page.pressKey("KeyE","e",69,85);
  const afterE=await inspect(page);
  assert.equal(afterE.cart.y,99.5,"old E one-cell push is still active");
  await page.keyDown("KeyS","s",83);
  await sleep(1650);
  await page.keyUp("KeyS","s",83);
  await sleep(350); // let short rolling inertia settle
  const moved=await inspect(page);
  assert.ok(moved.cart.y>99.78 && moved.cart.y<104.8,
    "ordinary walking contact failed to move cart: "+JSON.stringify(moved));
  assert.ok(Math.abs(moved.cart.y-Math.round(moved.cart.y))>.012,
    "cart position snapped to one grid cell: "+JSON.stringify(moved));
  assert.ok(moved.y>atRoad.y+.35,
    "player did not advance with the material object: "+JSON.stringify({atRoad,moved}));
  await page.screenshot(resolve(out,"B4-03-continuous-body-push.png"));
  // Exercise the actual canvas pointer handlers inside Chromium. These are
  // labelled synthetic DOM pointer events, not a human mouse-feel playtest.
  await page.evaluate(`(()=>{
   const canvas=document.getElementById("game"),rect=canvas.getBoundingClientRect();
   const current=CoopegeB1Evidence.inspect();
   const pxRatio=canvas.width/rect.width,pyRatio=canvas.height/rect.height;
   const scale=Math.min(60,Math.max(34,Math.min(canvas.width/19,canvas.height/12)));
   const cx=rect.left+rect.width/2+(current.cart.x-current.x)*scale/pxRatio;
   const cy=rect.top+rect.height/2+(current.cart.y-current.y)*scale/pyRatio;
   const props=(y)=>({bubbles:true,cancelable:true,clientX:cx,clientY:y,pointerId:417,button:0});
   canvas.dispatchEvent(new PointerEvent("pointerdown",props(cy)));
   canvas.dispatchEvent(new PointerEvent("pointermove",props(cy+35)));
  })()`);
  await sleep(430);
  const gripped=await inspect(page);
  assert.ok(gripped.cart.y>moved.cart.y+.08,
    "close-range pointer grip failed to move the real world state: "+JSON.stringify({moved,gripped}));
  await page.evaluate(`document.getElementById("game").dispatchEvent(
   new PointerEvent("pointerup",{bubbles:true,clientX:0,clientY:0,pointerId:417,button:0}))`);
  await sleep(220);
  await page.screenshot(resolve(out,"B4-03b-close-range-pointer-grip.png"));
  await page.pressKey("KeyP","p",80,80);
  const saved=await inspect(page);
  await page.keyDown("KeyW","w",87);await sleep(650);await page.keyUp("KeyW","w",87);
  const away=await inspect(page);
  assert.ok(away.y<saved.y-.35,"could not retreat after contact push");
  await page.pressKey("KeyL","l",76,80);
  await sleep(100);
  const loaded=await inspect(page);
  assert.ok(Math.abs(loaded.y-saved.y)<.001,"UI load lost player position");
  assert.ok(Math.abs(loaded.cart.y-saved.cart.y)<.03,
    "UI save/load lost continuous cart location: "+JSON.stringify({saved,loaded}));
  await page.screenshot(resolve(out,"B4-04-contact-restored.png"));
  console.info("COOPEGE_B4_BROWSER_PASS",JSON.stringify({
   start:{x:initial.x,y:initial.y},arrived:{x:atRoad.x,y:atRoad.y},
   movedCart:{x:moved.cart.x,y:moved.cart.y},retreated:{y:away.y},reloaded:{y:loaded.y,cart:loaded.cart},
   running:loaded.tick>initial.tick,authorNpc:initial.authoredNpcCount,encounter:initial.authoredEncounter
  }));
 });
}finally{await browser.forceClose();await new Promise(res=>server.close(()=>res()));}
