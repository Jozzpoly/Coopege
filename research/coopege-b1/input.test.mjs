import test from "node:test";
import assert from "node:assert/strict";
import "./view.js";

// Headless deterministic render schedule: a short press between two 144 Hz
// frames must survive until the next 60 Hz simulation step.
test("one-shot keyboard actions survive render-only frames and fire exactly once",()=>{
 const previous={document:globalThis.document,window:globalThis.window,
  requestAnimationFrame:globalThis.requestAnimationFrame,
  cancelAnimationFrame:globalThis.cancelAnimationFrame,
  devicePixelRatio:globalThis.devicePixelRatio,
  core:globalThis.CoopegeB1Core};
 const frames=[],listeners={},inputs=[];
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{
  get:(obj,key)=>key in obj?obj[key]:()=>{},
  set:(obj,key,value)=>{obj[key]=value;return true;}
 });
 const canvas={parentElement:{clientWidth:800,clientHeight:600},width:0,height:0,getContext:()=>ctx,addEventListener:()=>{},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})};
 const hud={textContent:""},message={textContent:""},meter={style:{width:""}};
 const world={player:{x:.5,y:.5,hp:100,maxHp:100,coins:0,bandages:1,energy:100,dead:false,facing:{x:0,y:1}},
  grid:{width:1,height:1,tiles:["1"],defs:{"1":{walkable:true}}},
  authored:{entrances:[],npcs:[]},cart:{x:4,y:4},rats:[],kills:0,lastAction:""};
 let dispose;
 try{
  globalThis.document={getElementById:id=>({game:canvas,hud,message,meter})[id],
   addEventListener:(kind,fn)=>{listeners[kind]=fn;}};
  globalThis.window={addEventListener:()=>{}};
  globalThis.devicePixelRatio=1;
  globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  globalThis.cancelAnimationFrame=()=>{};
  globalThis.CoopegeB1Core={create:()=>world,step:(_w,input)=>inputs.push({...input}),
   dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)};
  dispose=globalThis.CoopegeB1View.attach({});
  const render=at=>{const fn=frames.shift();assert.ok(fn,"RAF callback absent");fn(at);};
  const press=code=>listeners.keydown({code,repeat:false,preventDefault(){}});
  const release=code=>listeners.keyup({code,repeat:false,preventDefault(){}});
  render(1000); // initial RAF: no simulation dt
  press("KeyE");release("KeyE");
  press("Space");release("Space");
  press("KeyR");release("KeyR");
  render(1007);render(1014); // neither render frame crosses the fixed tick
  assert.equal(inputs.length,0,"action consumed before a fixed tick");
  render(1021);
  assert.equal(inputs.length,1);
  assert.deepEqual([inputs[0].interact,inputs[0].hit,inputs[0].bandage],[true,true,true]);
  render(1042);
  assert.ok(inputs.length>=2);
  assert.ok(inputs.slice(1).every(x=>!x.interact&&!x.hit&&!x.bandage),
   "one-shot action was replayed on later ticks");
 }finally{
  dispose?.();
  for(const [key,val] of Object.entries(previous)){
   const actual=key==="core"?"CoopegeB1Core":key;
   if(val===undefined)delete globalThis[actual];
   else globalThis[actual]=val;
  }
 }
});
