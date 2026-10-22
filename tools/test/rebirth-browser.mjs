import {mkdirSync,readFileSync} from "node:fs";
import {resolve} from "node:path";
import {createChromiumHarness,findChromiumExecutable} from "../browser/chromium-cdp.mjs";

const chromiumExecutable=findChromiumExecutable();
if(!chromiumExecutable)throw Error("R0 requires real Chromium: cannot claim a game-first UI PASS by inspecting HTML text.");
const root=resolve(import.meta.dirname,"../..");
const html=readFileSync(resolve(root,"dist/Coopege_v0.01.html"),"utf8");
const out=resolve(root,".build/rebirth-browser");
mkdirSync(out,{recursive:true});
const browser=await createChromiumHarness({executable:chromiumExecutable});
try{
 await browser.withPage(async page=>{
  await page.setContent(html);
  const ready=await page.evaluate(`(async()=>{
    for(let i=0;i<420;i++){
      if(window.__COOPEGE_RUNTIME_DIAGNOSTICS__?.ready && window.__COOPEGE_RUNTIME_DIAGNOSTICS__.gameplayTick>=2) return true;
      await new Promise(r=>setTimeout(r,40));
    }
    return false;
  })()`);
  if(!ready)throw Error("Coopege did not reach playable state");
  const before=await page.evaluate(`(()=>{
    const stage=document.querySelector('.stage'),canvas=document.getElementById('world'),panel=document.getElementById('diagnosticsPanel'),main=document.querySelector('main');
    return {viewport:[innerWidth,innerHeight],stage:[stage.clientWidth,stage.clientHeight],canvas:[canvas.width,canvas.height],opened:main.classList.contains('diag-open'),aria:document.getElementById('toggleDiagnostics').getAttribute('aria-expanded'),hidden:getComputedStyle(panel).visibility,actors:window.__COOPEGE_GAME_DEBUG__?.save()?.actors?.length};
  })()`);
  if(before.opened || before.aria!=="false"||before.hidden!=="hidden")throw Error("Diagnostics should be closed on entry: "+JSON.stringify(before));
  if(before.stage[0]<before.viewport[0]*.8||before.stage[1]<before.viewport[1]*.65)throw Error("Game does not dominate the window: "+JSON.stringify(before));
  if(before.canvas[0]<before.viewport[0]*.75)throw Error("Canvas still sized as small debug test: "+JSON.stringify(before));
  if(!(before.actors>=2))throw Error("Native playable world has not been hydrated");
  await page.screenshot(resolve(out,"coopege-r0-desktop.png"));
  const opened=await page.evaluate(`(()=>{document.getElementById('toggleDiagnostics').click();return {flag:document.querySelector('main').classList.contains('diag-open'),aria:document.getElementById('toggleDiagnostics').getAttribute('aria-expanded'),visibility:getComputedStyle(document.getElementById('diagnosticsPanel')).visibility};})()`);
  if(!opened.flag||opened.aria!=="true"||opened.visibility==="hidden")throw Error("Diagnostics toggle did not open "+JSON.stringify(opened));
  const closed=await page.evaluate(`(()=>{document.getElementById('toggleDiagnostics').click();return document.querySelector('main').classList.contains('diag-open');})()`);
  if(closed)throw Error("Diagnostics toggle did not close");
  await page.keyDown("KeyD","d",68);
  await new Promise(r=>setTimeout(r,350));
  await page.keyUp("KeyD","d",68);
  const after=await page.evaluate(`(()=>({tick:window.__COOPEGE_RUNTIME_DIAGNOSTICS__?.gameplayTick,errors:window.__COOPEGE_RUNTIME_DIAGNOSTICS__?.lastError,canvas:[document.getElementById('world').width,document.getElementById('world').height]}))()`);
  if(after.errors)throw Error("Runtime error after natural input: "+after.errors);
  if(after.tick<=2)throw Error("Gameplay stopped while testing the shell");
  await page.screenshot(resolve(out,"coopege-r0-after-input.png"));
  console.info("COOPEGE_R0_BROWSER_PASS",JSON.stringify({before,opened,after}));
 });
}finally{await browser.forceClose();}
