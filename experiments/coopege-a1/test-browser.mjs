import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createChromiumHarness, findChromiumExecutable } from "../../tools/browser/chromium-cdp.mjs";

// Tests the actual standalone donor-derived game as a browser artifact, not a
// mocked combat component. Deliberate diagnostic stimuli are labeled separately.
const root = resolve(import.meta.dirname,"../..");
const html = readFileSync(resolve(root,"experiments/coopege-a1/Coopege_A1_Tibia_Donor.html"),"utf8");
const out = resolve(root,".build/a1-browser");
mkdirSync(out,{recursive:true});
const executable=findChromiumExecutable();
if(!executable)throw Error("A1 requires real Chromium: refusing unproven playability");
const browser=await createChromiumHarness({executable});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function inspect(page){return page.evaluate("window.CoopegeCandidateA1.inspect()");}
try{
 for(const [key,cls] of [["Digit1","warrior"],["Digit2","archer"],["Digit3","mage"]]){
  await browser.withPage(async page=>{
   await page.setContent(html);
   await sleep(300);
   await page.keyDown(key,key==="Digit1"?"1":key==="Digit2"?"2":"3",key==="Digit1"?49:key==="Digit2"?50:51);
   await page.keyUp(key,key==="Digit1"?"1":key==="Digit2"?"2":"3",key==="Digit1"?49:key==="Digit2"?50:51);
   await sleep(400);
   const state=await inspect(page);
   if(state?.state!=="play"||state?.classKey!==cls||state.monsters<1)throw Error("A1 class boot failed "+JSON.stringify({cls,state}));
   const apis=await page.evaluate("({world:!!window.TibiaMapAPI,content:!!window.TibiaContentAPI,visual:!!window.TibiaAssetAPI})");
   if(Object.values(apis).some(x=>!x))throw Error("Lost richer donor capability "+JSON.stringify(apis));
   if(cls==="warrior"){
     await page.screenshot(resolve(out,"a1-warrior-world.png"));
     await page.keyDown("KeyD","d",68);await sleep(360);await page.keyUp("KeyD","d",68);
     const normal=await inspect(page);
     await page.keyDown("ShiftLeft","Shift",16);await page.keyDown("KeyD","d",68);await sleep(360);await page.keyUp("KeyD","d",68);
     const guarded=await inspect(page);
     const frontend=await page.evaluate("CoopegeCandidateA1.getGuardContract(CoopegeCandidateA1.inspect().x+32,CoopegeCandidateA1.inspect().y)");
     const backend=await page.evaluate("CoopegeCandidateA1.getGuardContract(CoopegeCandidateA1.inspect().x-32,CoopegeCandidateA1.inspect().y)");
     if(!(normal.x>state.x+12&&guarded.x>normal.x+5&&(guarded.x-normal.x)<(normal.x-state.x)*.80&&frontend.active&&frontend.front&&!backend.front))throw Error("Stance/contact contract broken "+JSON.stringify({state,normal,guarded,frontend,backend}));
     await page.screenshot(resolve(out,"a1-shield-guard.png"));
     await page.keyUp("ShiftLeft","Shift",16);
     const geo=await page.evaluate("({blocked:!CoopegeCandidateA1.getVisibility(24.93*32,21.5*32,26.07*32,21.5*32),open:CoopegeCandidateA1.getVisibility(24.5*32,21.5*32,24.85*32,21.5*32)})");
     if(!geo.blocked||!geo.open)throw Error("Original authored-map occlusion probe failed "+JSON.stringify(geo));
     console.info("COOPEGE_A1_PASS",JSON.stringify({cls,normalDx:+(normal.x-state.x).toFixed(1),guardDx:+(guarded.x-normal.x).toFixed(1),geo,guardEnergy:guarded.guardEnergy}));
   }else console.info("COOPEGE_A1_PASS",JSON.stringify({cls,hp:state.hp,monsters:state.monsters,apis}));
  });
 }
}finally{await browser.forceClose();}
