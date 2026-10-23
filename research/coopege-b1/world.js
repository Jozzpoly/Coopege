/* Coopege B1: disposable gameplay hypothesis, not a canonical engine.
   Authored terrain, inhabitants, encounter composition come from B0 source witness.
   The old Tibia executable is NEVER loaded at runtime. */
(function(root){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const d=Math.hypot(x,y);return d>0?{x:x/d,y:y/d}:{x:0,y:0}};
const r2=x=>Math.round(x*100)/100;
function sourceIdentity(source){
  // Deterministic authored-world identity. Deliberately exclude exportedAt;
  // an unchanged game should not invalidate its saves every CI execution.
  const a=source.authored;
  const stable=JSON.stringify({worldId:a.world.id,size:[a.world.width,a.world.height],
    floors:a.floors,start:a.start,links:a.links,npcs:a.npcs,entrances:a.entrances,
    spawnGroups:a.spawnGroups,quests:a.quests,monsters:a.monsters,tilePalette:a.tilePalette});
  let hash=2166136261;
  for(let i=0;i<stable.length;i++)hash=Math.imul(hash^stable.charCodeAt(i),16777619);
  return (hash>>>0).toString(16).padStart(8,"0");
}
function expandFloor(authored,z){
  const f=authored.floors[String(z)];
  if(!f)throw Error("Missing authored floor "+z);
  const w=authored.world.width,h=authored.world.height,arr=new Array(w*h);
  let at=0;
  for(const [id,count] of f.tiles){for(let i=0;i<count;i++)arr[at++]=String(id);}
  if(at!==w*h)throw Error("Floor size differs from authored source "+at);
  return {width:w,height:h,tiles:arr,defs:authored.tilePalette};
}
function create(source){
  if(source.format!=="coopege-authored-source-witness/v0")throw Error("Wrong source evidence");
  const authored=source.authored,grid=expandFloor(authored,0),start=authored.start;
  const groups=authored.spawnGroups.filter(g=>g.z===0 && g.region);
  const nearby=groups.filter(g=>g.id==="surface_city_south_vermin" || String(g.id).includes("surface_city_south_vermin"));
  if(nearby.length!==1)throw Error("Not the original south gate encounter");
  const group=nearby[0];
  const rats=(group.members.rat||[]).map(([x,y],i)=>({
    id:group.id+":rat:"+i,groupId:group.id,name:"Szczur",
    x:x+.5,y:y+.5,homeX:x+.5,homeY:y+.5,
    hp:30,maxHp:30,alive:true,alert:0,cooldown:0,lastSeenX:null,lastSeenY:null,
  }));
  if(rats.length===0)throw Error("Authored southern pack is missing");
  const npcs=authored.npcs.filter(n=>n.z===0).map(n=>({
    id:n.id,name:n.name,role:n.type,x:n.x+.5,y:n.y+.5
  }));
  return {
    sourceFormat:source.format,sourceIdentity:sourceIdentity(source),authored:{start,group:{id:group.id,label:group.label,region:group.region,tier:group.tier,special:group.special},entrances:authored.entrances.filter(e=>e.z===0),npcs},
    grid,player:{id:"player:1",x:start.x+.5,y:start.y+.5,hp:100,maxHp:100,coins:0,bandages:1,facing:{x:0,y:1},attackCd:0,energy:100,dead:false},
    cart:{id:"crate:roadside",kind:"wooden-cart",x:88.5,y:99.5,radius:.47,mass:2.4,vx:0,vy:0,blocksSight:true},
    rats,clock:0,tick:0,events:[],lastAction:"Wyrusz na południe od Srebrnej Bramy.",kills:0
  };
}
function tile(world,x,y){
  const ix=Math.floor(x),iy=Math.floor(y),g=world.grid;
  if(ix<0||iy<0||ix>=g.width||iy>=g.height)return null;
  return g.defs[g.tiles[iy*g.width+ix]]??null;
}
function mapWalk(world,x,y){return tile(world,x,y)?.walkable===true;}
function circleHitsMap(world,x,y,r){
  for(let cy=Math.floor(y-r);cy<=Math.floor(y+r);cy++)
    for(let cx=Math.floor(x-r);cx<=Math.floor(x+r);cx++){
      if(mapWalk(world,cx+.5,cy+.5))continue;
      const dx=Math.max(cx-x,0,x-(cx+1)),dy=Math.max(cy-y,0,y-(cy+1));
      if(dx*dx+dy*dy<r*r-.000001)return true;
    }
  return false;
}
function canOccupy(world,x,y,r,ignoreCart=false,ignoreRatId=null){
  if(circleHitsMap(world,x,y,r))return false;
  if(!ignoreCart&&Math.hypot(x-world.cart.x,y-world.cart.y)<r+world.cart.radius-.02)return false;
  // Creature-to-creature physical contact is simplified: no interpenetration of player.
  if(ignoreRatId==="player"){
    for(const rat of world.rats)if(rat.alive&&Math.hypot(x-rat.x,y-rat.y)<r+.26-.015)return false;
  }
  return true;
}
function move(world,entity,dx,dy,r,ignoreCart=false,who=null){
  let did=false;
  if(dx!==0&&canOccupy(world,entity.x+dx,entity.y,r,ignoreCart,who)){entity.x+=dx;did=true;}
  if(dy!==0&&canOccupy(world,entity.x,entity.y+dy,r,ignoreCart,who)){entity.y+=dy;did=true;}
  return did;
}
function blocksSightAt(world,x,y){
  const cell=tile(world,x,y);
  if(!cell||cell.blocksShot===true||cell.shotBlocking===true||cell.walkable===false&&cell.shotBlocking!==false)return true;
  return Math.hypot(x-world.cart.x,y-world.cart.y)<world.cart.radius;
}
function sight(world,a,b){
  const d=dist(a,b);
  if(d<.01)return true;
  const steps=Math.max(1,Math.ceil(d/.07));
  for(let i=1;i<steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(blocksSightAt(world,x,y))return false;
  }
  return true;
}
function event(world,description,kind="info"){
  world.events.push({at:r2(world.clock),kind,description});
  if(world.events.length>15)world.events.shift();
  world.lastAction=description;
}
// Contact-driven material motion. A collision with the player's *moving body*
// transfers a bounded displacement; no object teleports, snaps to a tile or
// responds to an "advance one grid cell" command.
function canCartOccupy(world,x,y){
 const c=world.cart;
 if(circleHitsMap(world,x,y,c.radius))return false;
 if(dist({x,y},world.player)<c.radius+.28-.015)return false;
 for(const r of world.rats)
  if(r.alive&&dist({x,y},r)<c.radius+.26-.015)return false;
 for(const n of world.authored.npcs)
  if(dist({x,y},n)<c.radius+.29-.01)return false;
 return true;
}
function translateCart(world,dx,dy){
 const c=world.cart,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.035));
 const sx=dx/steps,sy=dy/steps,fromX=c.x,fromY=c.y;
 for(let i=0;i<steps;i++){
  if(sx!==0&&canCartOccupy(world,c.x+sx,c.y))c.x+=sx;
  else if(sx!==0)c.vx=0;
  if(sy!==0&&canCartOccupy(world,c.x,c.y+sy))c.y+=sy;
  else if(sy!==0)c.vy=0;
 }
 return {x:c.x-fromX,y:c.y-fromY};
}
function movePlayerWithContact(world,dx,dy,dt){
 const p=world.player,c=world.cart;
 let pushed=false;
 const v=norm(dx,dy),distance=3.75*dt;
 // Split-axis movement retains legacy wall sliding while maintaining circles.
 for(const [axis,delta] of [["x",v.x*distance],["y",v.y*distance]]){
  if(!delta)continue;
  const candidate={x:p.x,y:p.y};candidate[axis]+=delta;
  if(canOccupy(world,candidate.x,candidate.y,.28,false,"player")){
   p[axis]+=delta;continue;
  }
  // Distinguish actual body/cart contact from a wall or creature collision.
  if(!canOccupy(world,candidate.x,candidate.y,.28,true,"player"))continue;
  if((c[axis]-p[axis])*delta<=0)continue;
  if(dist(p,c)>c.radius+.28+.12)continue;
  const transfer=delta/(1+c.mass*.17);
  const moved=translateCart(world,axis==="x"?transfer:0,axis==="y"?transfer:0);
  const shift=moved[axis];
  // If the cart is blocked by terrain or another creature, body motion stops.
  if(Math.abs(shift)<1e-6)continue;
  const next={x:p.x,y:p.y};next[axis]+=shift;
  if(canOccupy(world,next.x,next.y,.28,false,"player")){
   p[axis]+=shift;c["v"+axis]=shift/dt;pushed=true;
  }
 }
 return pushed;
}
function coastCart(world,dt){
 const c=world.cart;
 if(Math.hypot(c.vx,c.vy)<.035){c.vx=0;c.vy=0;return;}
 const wantedX=c.vx*dt,wantedY=c.vy*dt;
 const actual=translateCart(world,wantedX,wantedY);
 if(Math.abs(actual.x-wantedX)>.004)c.vx=0;
 if(Math.abs(actual.y-wantedY)>.004)c.vy=0;
 // High rolling resistance: it coasts a short distance, then stops.
 const damping=Math.exp(-20*dt);
 c.vx*=damping;c.vy*=damping;
}
function interactNpc(world){
 const p=world.player;
 const npc=world.authored.npcs.find(n=>dist(n,p)<1.55);
 if(!npc)return false;
 if(npc.role==="healer"){
   if(p.hp===p.maxHp){event(world,"Uzdrowiciel: nie potrzebujesz pomocy.");return true;}
   if(p.coins<2){event(world,"Uzdrowiciel potrzebuje 2 monet za opatrunek.");return true;}
   p.coins-=2;p.hp=Math.min(p.maxHp,p.hp+42);event(world,"Uzdrowiciel opatruje rany za 2 monety.","social");return true;
 }
 if(npc.role==="merchant"){
   if(p.coins<3){event(world,"Kupiec: opatrunek kosztuje 3 monety.");return true;}
   p.coins-=3;p.bandages++;event(world,"Kupiono opatrunek. Możesz użyć go klawiszem R.","social");return true;
 }
 event(world,npc.name+" obserwuje Cię.");return true;
}
function attack(world){
 const p=world.player;
 if(p.dead||p.attackCd>0)return false;
 p.attackCd=.63;
 const targets=world.rats.filter(r=>r.alive&&dist(r,p)<1.35 &&
  (r.x-p.x)*p.facing.x+(r.y-p.y)*p.facing.y>-.08&&sight(world,p,r));
 targets.sort((a,b)=>dist(a,p)-dist(b,p));
 const rat=targets[0];
 if(!rat){event(world,"Cios minął przeciwnika.");return false;}
 rat.hp-=17;
 if(rat.hp<=0){
   rat.alive=false;p.coins+=2;world.kills++;
   event(world,"Pokonano szczura. 2 monety pozostają przy Tobie.","combat");
 }else event(world,"Szczur został trafiony i cofa się.","combat");
 return true;
}
function ratThink(world,dt){
 const p=world.player;
 for(const rat of world.rats){
  if(!rat.alive)continue;
  rat.cooldown=Math.max(0,rat.cooldown-dt);
  const distance=dist(rat,p);
  // Perception is not telepathy. Occlusion freezes the last witnessed location;
  // the creature must reacquire the player rather than chasing live coordinates.
  const seesPlayer=!p.dead&&distance<5.8&&sight(world,rat,p);
  if(seesPlayer){
    rat.alert=2.7;rat.lastSeenX=p.x;rat.lastSeenY=p.y;
  }else rat.alert=Math.max(0,rat.alert-dt);
  let target=null;
  if(seesPlayer)target=p;
  else if(rat.alert>0&&Number.isFinite(rat.lastSeenX)&&Number.isFinite(rat.lastSeenY))
    target={x:rat.lastSeenX,y:rat.lastSeenY};
  else if(Math.hypot(rat.x-rat.homeX,rat.y-rat.homeY)>.2)target={x:rat.homeX,y:rat.homeY};
  if(!target)continue;
  if(target===p&&distance<.8){
    if(rat.cooldown===0){
      p.hp=Math.max(0,p.hp-12);rat.cooldown=1.35;
      event(world,"Szczur uderza. Cofnij się albo zmień pozycję.","combat");
      if(p.hp===0){p.dead=true;event(world,"Poległeś. Wczytaj zapis lub rozpocznij ponownie.","danger");}
    }
    continue;
  }
  const v=norm(target.x-rat.x,target.y-rat.y);
  const pace=(target===p?1.55:1.1)*dt;
  const next={x:rat.x,y:rat.y};
  if(move(world,next,v.x*pace,v.y*pace,.25,false,null)&&dist(next,p)>.49){
    rat.x=next.x;rat.y=next.y;
  }
 }
}
function step(world,input={},dt=1/60){
 dt=clamp(dt,0,1/20);world.clock+=dt;world.tick++;
 const p=world.player;
 if(p.dead)return world;
 p.attackCd=Math.max(0,p.attackCd-dt);
 p.energy=clamp(p.energy+dt*9,0,100);
 const dx=Number(input.dx)||0,dy=Number(input.dy)||0,v=norm(dx,dy);
 if(v.x||v.y){
   p.facing={x:v.x,y:v.y};
   const pressedCart=movePlayerWithContact(world,v.x,v.y,dt);
   if(!pressedCart)coastCart(world,dt);
 }else coastCart(world,dt);
 if(input.push)interactNpc(world);
 if(input.hit)attack(world);
 if(input.bandage&&p.bandages>0&&p.hp<p.maxHp){
   p.bandages--;p.hp=Math.min(p.maxHp,p.hp+35);event(world,"Użyto opatrunku.","recovery");
 }
 ratThink(world,dt);
 return world;
}
function save(world){
 return {
  version:2,source:world.sourceFormat,identity:world.sourceIdentity,clock:world.clock,tick:world.tick,
  player:JSON.parse(JSON.stringify(world.player)),
  cart:{x:world.cart.x,y:world.cart.y,vx:world.cart.vx,vy:world.cart.vy},
  rats:world.rats.map(r=>({id:r.id,x:r.x,y:r.y,hp:r.hp,alive:r.alive,alert:r.alert,cooldown:r.cooldown,lastSeenX:r.lastSeenX,lastSeenY:r.lastSeenY})),
  kills:world.kills,events:world.events.slice(),lastAction:world.lastAction
 };
}
function restore(source,record){
 if(record?.version!==2||record?.source!==source.format||record?.identity!==sourceIdentity(source))throw Error("Incompatible B1 save: authored world changed");
 const w=create(source);
 Object.assign(w.player,record.player);
 w.cart.x=record.cart.x;w.cart.y=record.cart.y;
 w.cart.vx=record.cart.vx;w.cart.vy=record.cart.vy;
 for(const rat of w.rats){
  const found=record.rats.find(r=>r.id===rat.id);
  if(!found)throw Error("Encounter identity missing in save: "+rat.id);
  Object.assign(rat,found);
 }
 w.clock=record.clock;w.tick=record.tick;w.kills=record.kills;
 w.events=record.events??[];w.lastAction=record.lastAction??"";
 return w;
}
root.CoopegeB1Core=Object.freeze({create,step,save,restore,tile,mapWalk,canOccupy,sight,translateCart,attack,dist});
})(globalThis);
