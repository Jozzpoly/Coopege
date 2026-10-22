/* Coopege B1. Visual language is deliberately provisional.
   Neither authored map nor simulation depends on the canvas projection. */
(function(root){
"use strict";
function attach(source){
  const core=root.CoopegeB1Core,canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
  const hud=document.getElementById("hud"),message=document.getElementById("message"),meter=document.getElementById("meter");
  if(!ctx)throw Error("Canvas 2D unavailable");
  let world=core.create(source),pressed=new Set(),pending={push:false,hit:false,bandage:false},last=0,acc=0,animation=0;
  let camera={x:world.player.x,y:world.player.y},stopped=false;
  const saveKey="coopege-b1-material-return-v1";
  const colors=[
    ["#547f40","#688e4c"],["#707774","#868981"],["#3d4a4d","#576164"],
    ["#1b5574","#23647d"],["#806e52","#968363"],["#806849","#a08961"],
    ["#a99356","#bba265"],["#52774a","#648351"],["#4c5150","#636960"],
    ["#345d4d","#426b57"],["#524c59","#6b6374"],["#6b5644","#836c53"],
    ["#3e4f58","#536771"],["#846343","#9e7951"],["#6f704f","#85865e"],
    ["#686862","#7e8074"],["#4c6e4f","#6b835e"],["#5d685f","#778176"]
  ];
  function hash(x,y){let n=(x*374761393+y*668265263)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
  const size=()=>{const box=canvas.parentElement,dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.max(300,Math.floor(box.clientWidth*dpr)),h=Math.max(260,Math.floor(box.clientHeight*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    return {w,h,scale:Math.min(60*dpr,Math.max(34*dpr,Math.min(w/19,h/12)))};
  };
  function colorTile(id,x,y){const i=+id||0,shade=colors[i]??["#566757","#687762"];return shade[hash(x,y)>.46?1:0];}
  function draw(now){
    const {w,h,scale}=size();
    camera.x+=(world.player.x-camera.x)*.12;camera.y+=(world.player.y-camera.y)*.12;
    ctx.clearRect(0,0,w,h);ctx.fillStyle="#111915";ctx.fillRect(0,0,w,h);
    const loc=(x,y)=>({x:(x-camera.x)*scale+w/2,y:(y-camera.y)*scale+h/2});
    const x0=Math.max(0,Math.floor(camera.x-w/scale/2)-2),x1=Math.min(world.grid.width,Math.ceil(camera.x+w/scale/2)+2);
    const y0=Math.max(0,Math.floor(camera.y-h/scale/2)-2),y1=Math.min(world.grid.height,Math.ceil(camera.y+h/scale/2)+2);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const id=world.grid.tiles[y*world.grid.width+x],pos=loc(x,y),n=hash(x,y);
      ctx.fillStyle=colorTile(id,x,y);ctx.fillRect(Math.floor(pos.x),Math.floor(pos.y),Math.ceil(scale)+1,Math.ceil(scale)+1);
      if(id==="2"||world.grid.defs[id]?.shotBlocking===true){
        ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(pos.x+scale*.78,pos.y+scale*.13,scale*.23,scale*.9);
        ctx.fillStyle="rgba(223,222,197,.16)";ctx.fillRect(pos.x+1,pos.y+1,scale-4,Math.max(2,scale*.08));
        ctx.strokeStyle="#242d2b";ctx.lineWidth=Math.max(1,scale*.035);ctx.strokeRect(pos.x+1,pos.y+1,scale-2,scale-2);
      }else if(id==="3"){
        ctx.strokeStyle="rgba(191,220,239,.20)";ctx.lineWidth=Math.max(1,scale*.028);
        ctx.beginPath();const yy=pos.y+(n*.7+.16)*scale;ctx.moveTo(pos.x+scale*.16,yy);ctx.lineTo(pos.x+scale*.65,yy);ctx.stroke();
      }else if(n>.84){
        ctx.strokeStyle="rgba(17,32,17,.22)";ctx.lineWidth=Math.max(1,scale*.03);
        ctx.beginPath();ctx.moveTo(pos.x+scale*.28,pos.y+scale*.7);ctx.lineTo(pos.x+scale*.40,pos.y+scale*.48);ctx.stroke();
      }
    }
    // Author-authored destinations are visible to the player, not discarded as
    // anonymous tile coordinates; role labels are not forced quest scripts.
    for(const entry of world.authored.entrances){
      const pos=loc(entry.x+.5,entry.y+.5);
      if(pos.x<20||pos.y<20||pos.x>w-20||pos.y>h-20)continue;
      ctx.fillStyle="#efcc87";ctx.beginPath();ctx.arc(pos.x,pos.y,scale*.09,0,Math.PI*2);ctx.fill();
      if(scale>34&&Math.abs(entry.x-world.player.x)+Math.abs(entry.y-world.player.y)<8){
        label(entry.name,pos.x,pos.y-scale*.47,"#e1c68c",Math.round(scale*.23));
      }
    }
    for(const n of world.authored.npcs){
      const p=loc(n.x,n.y),r=scale*.30;
      ctx.fillStyle=n.role==="healer"?"#79d7ac":"#e3b969";
      ctx.beginPath();ctx.ellipse(p.x,p.y,r*.66,r,0,0,2*Math.PI);ctx.fill();
      ctx.fillStyle="#2b3130";ctx.beginPath();ctx.arc(p.x,p.y-r*.45,r*.41,0,2*Math.PI);ctx.fill();
      label(n.name,p.x,p.y-r*1.9,n.role==="healer"?"#b6ffe0":"#ffe3a5",Math.round(scale*.24));
    }
    const c=world.cart,cp=loc(c.x,c.y),cs=scale*.75;
    ctx.save();ctx.translate(cp.x,cp.y);ctx.fillStyle="#251912";ctx.fillRect(-cs*.50,-cs*.42,cs,cs);
    ctx.fillStyle="#9b7145";ctx.fillRect(-cs*.48,-cs*.49,cs*.96,cs*.80);
    ctx.strokeStyle="#d6b177";ctx.lineWidth=Math.max(2,scale*.04);
    for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(-cs*.42,cs*.14*k);ctx.lineTo(cs*.42,cs*.14*k);ctx.stroke();}
    ctx.fillStyle="#272525";ctx.fillRect(-cs*.59,-cs*.30,cs*.18,cs*.2);ctx.fillRect(cs*.41,cs*.17,cs*.18,cs*.2);
    ctx.restore();
    if(core.dist(world.player,c)<2)label("E · pchnij",cp.x,cp.y-scale*.75,"#ffe4aa",Math.round(scale*.25));
    for(const r of world.rats){
      if(!r.alive)continue;
      const p=loc(r.x,r.y),rad=scale*.26;
      ctx.fillStyle="rgba(0,0,0,.32)";ctx.beginPath();ctx.ellipse(p.x,p.y+rad*.7,rad*1.1,rad*.45,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#926e67";ctx.beginPath();ctx.ellipse(p.x,p.y,rad,rad*.75,0,0,2*Math.PI);ctx.fill();
      ctx.fillStyle="#d8b89b";ctx.fillRect(p.x-rad*.25,p.y-rad*.17,rad*.18,rad*.18);
      ctx.fillStyle="#342824";ctx.fillRect(p.x+rad*.4,p.y-rad*.2,rad*.2,rad*.19);
      if(r.hp<r.maxHp||r.alert>0){
        ctx.fillStyle="#201c1d";ctx.fillRect(p.x-rad,p.y-rad*1.4,rad*2,scale*.06);
        ctx.fillStyle=r.alert>0?"#de936a":"#a4c191";ctx.fillRect(p.x-rad,p.y-rad*1.4,rad*2*r.hp/r.maxHp,scale*.06);
      }
    }
    const pp=loc(world.player.x,world.player.y),pr=scale*.28;
    ctx.fillStyle="rgba(0,0,0,.4)";ctx.beginPath();ctx.ellipse(pp.x,pp.y+pr*.72,pr*.9,pr*.37,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=world.player.dead?"#565454":"#c9d4a2";
    ctx.beginPath();ctx.ellipse(pp.x,pp.y,pr*.83,pr,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#695742";ctx.beginPath();ctx.arc(pp.x,pp.y-pr*.5,pr*.54,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle="#eed39b";ctx.lineWidth=Math.max(2,scale*.075);
    ctx.beginPath();ctx.moveTo(pp.x,pp.y);ctx.lineTo(pp.x+world.player.facing.x*pr*1.65,pp.y+world.player.facing.y*pr*1.65);ctx.stroke();
    // Player-centered compass subtly shows that authorship belongs to a place.
    ctx.fillStyle="rgba(7,19,14,.54)";ctx.fillRect(10,10,scale*3.1,scale*.55);
    ctx.font=`${Math.max(11,Math.round(scale*.2))}px system-ui`;ctx.fillStyle="#d2deb9";
    ctx.fillText("SREBRNA BRAMA",16,10+scale*.35);
    const grad=ctx.createRadialGradient(w/2,h/2,h*.3,w/2,h/2,h*.75);
    grad.addColorStop(0,"rgba(0,0,0,0)");grad.addColorStop(1,"rgba(2,8,7,.58)");
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    hud.textContent=`HP ${Math.round(world.player.hp)}/100   |   MONETY ${world.player.coins}   |   OPATRUNKI ${world.player.bandages}   |   SZCZURY ${world.kills}`;
    meter.style.width=`${Math.max(0,world.player.energy)}%`;
    message.textContent=world.lastAction;
  }
  function label(text,x,y,color,font){ctx.font=`600 ${Math.max(10,font)}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineWidth=3;ctx.strokeStyle="rgba(2,9,8,.88)";ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
  function store(){try{localStorage.setItem(saveKey,JSON.stringify(core.save(world)));world.lastAction="Zapisano ten stan świata i pozycję wózka.";}catch(e){world.lastAction="Zapis niedostępny w tej przeglądarce."}}
  function load(){try{const raw=localStorage.getItem(saveKey);if(!raw){world.lastAction="Brak zapisu w tym oknie.";return;}world=core.restore(source,JSON.parse(raw));camera={x:world.player.x,y:world.player.y};world.lastAction="Przywrócono świat wraz z przesuniętymi przedmiotami.";}catch(e){world.lastAction="Zapis jest niezgodny: "+e.message;}}
  function reset(){world=core.create(source);camera={x:world.player.x,y:world.player.y};}
  function key(e,down){
   const k=e.code;
   if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(k))e.preventDefault();
   if(down&&e.repeat)return;
   if(down&&k==="KeyE")pending.push=true;
   if(down&&k==="Space")pending.hit=true;
   if(down&&k==="KeyR")pending.bandage=true;
   if(down&&k==="KeyP")store();
   if(down&&k==="KeyL")load();
   if(down&&k==="KeyN")reset();
   if(down)pressed.add(k);else pressed.delete(k);
  }
  document.addEventListener("keydown",e=>key(e,true));
  document.addEventListener("keyup",e=>key(e,false));
  window.addEventListener("blur",()=>pressed.clear());
  function frame(now){
    if(stopped)return;
    const delta=last?Math.min(.08,(now-last)/1000):0;last=now;acc+=delta;
    const dx=(pressed.has("KeyD")||pressed.has("ArrowRight")?1:0)-(pressed.has("KeyA")||pressed.has("ArrowLeft")?1:0);
    const dy=(pressed.has("KeyS")||pressed.has("ArrowDown")?1:0)-(pressed.has("KeyW")||pressed.has("ArrowUp")?1:0);
    let once=true;
    while(acc>=1/60){core.step(world,{dx,dy,hit:once&&pending.hit,push:once&&pending.push,bandage:once&&pending.bandage},1/60);acc-=1/60;once=false;}
    pending={push:false,hit:false,bandage:false};
    draw(now);animation=requestAnimationFrame(frame);
  }
  animation=requestAnimationFrame(frame);
  // Inspection is read-only and not an alternate method of moving the player.
  root.CoopegeB1Evidence=Object.freeze({
    inspect:()=>({tick:world.tick,x:world.player.x,y:world.player.y,hp:world.player.hp,coins:world.player.coins,
      kills:world.kills,cart:{x:world.cart.x,y:world.cart.y},rats:world.rats.filter(r=>r.alive).length,
      authoredNpcCount:world.authored.npcs.length,authoredEncounter:world.authored.group.label,
      message:world.lastAction}),
    save:store,load,reset
  });
  return ()=>{stopped=true;cancelAnimationFrame(animation);};
}
root.CoopegeB1View=Object.freeze({attach});
})(globalThis);
