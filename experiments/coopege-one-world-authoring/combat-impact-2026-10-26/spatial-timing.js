// Coopege · reversible research variant: a real contact swing, NOT a product combat decision.
// The original targeted combat stays intact. [B] switches only the warrior's Space attack.
let spatialSwingMode = false;
const spatialSwingEvidence = {swings:0,misses:0,contacts:0,damagingHits:0};
const priorSpatialAtkNearest = atkNearest;
const priorSpatialGetAutoAttackTarget = getAutoAttackTarget;
getAutoAttackTarget = function(){
  if(spatialSwingMode && PL.classKey === 'warrior')return null;
  return priorSpatialGetAutoAttackTarget();
};
// Deliberate attack direction is committed on keydown. Damage is resolved when the
// visible sword actually reaches its striking phase, using current world topology.
// This prevents "hits before the weapon swings" and lets actors move out or in.
let spatialPending = null;
const SPATIAL_IMPACT_TIME = .135; // second, within 0.34 s warrior_attack animation
let spatialCanceled = 0;
function resolveSpatialSwing(swing){
  if(gameState!=='play'||PL.hp<=0||PL.z!==swing.z){spatialCanceled++;return;}
  const facing=swing.angle,radius=swing.radius,halfAngle=Math.PI*.36;
  const hit=MON.filter(m=>m.alive&&m.z===PL.z).map(m=>{
    const dx=m.x-PL.x,dy=m.y-PL.y,dist=Math.hypot(dx,dy);
    const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-facing),Math.cos(Math.atan2(dy,dx)-facing));
    return {m,dist,delta};
  }).filter(h=>h.dist<=radius+h.m.sz*.3&&Math.abs(h.delta)<=halfAngle&&hasLineOfSight(PL.x,PL.y,h.m.x,h.m.y,PL.z))
    .sort((a,b)=>a.dist-b.dist);
  SLASH={x:PL.x,y:PL.y,angle:facing,life:.22,ml:.22,range:radius,full:false};
  pushCombatFX('melee_release',PL.x,PL.y,.36,{angle:facing,range:radius});
  if(!hit.length){spatialSwingEvidence.misses++;return;}
  spatialSwingEvidence.contacts++;
  const base=effAtk();let damage=rnd(Math.floor(base*.85),Math.floor(base*1.15));
  const crit=Math.random()<effCrit();if(crit)damage=Math.floor(damage*2);
  let first=true;
  for(const h of hit){
    const dealt=first?damage:Math.max(1,Math.floor(damage*.6));
    h.m.hit(dealt);spatialSwingEvidence.damagingHits++;
    if(first){if(crit){h.m.addSt('bleed',2,2.5);spFT(h.m.x,h.m.y-h.m.sz-10,'KRIT!','#ffff00');}
      healFromDamage(dealt,1);first=false;}
  }
  screenShake=Math.max(screenShake,2.2);
}
atkNearest = function(){
  if(!spatialSwingMode || PL.classKey !== 'warrior')return priorSpatialAtkNearest();
  if(gameState !== 'play'||paused||StudioLite.open||charOpen||npcOpen||mapOpen||settingsOpen||PL.atkCd>0)return;
  const facing=dirAngle(PL.dir);
  PL.atkCd=effAtkDelay();spatialSwingEvidence.swings++;
  spatialPending={angle:facing,radius:PL.atkRange,z:PL.z,elapsed:0};
  beginPlayerAction('warrior_attack',facing);
};
// Soft *contact* is part of the B hypothesis: solid-ish bodies should not occupy
// the same centre while we ask players to reason about facing. No dash, knockback
// animation lock, invulnerability or a new AI system. Legacy mode is untouched.
let spatialContactCorrections=0;
const priorSpatialUpdate=update;
update=function(dt){
  priorSpatialUpdate(dt);
  if(gameState!=='play'||paused)return;
  if(spatialPending){
    if(!spatialSwingMode||PL.classKey!=='warrior'||PL.hp<=0||PL.z!==spatialPending.z){spatialPending=null;spatialCanceled++;}
    else {spatialPending.elapsed+=Math.min(Math.max(dt,0),.2);
      if(spatialPending.elapsed>=SPATIAL_IMPACT_TIME){const impact=spatialPending;spatialPending=null;resolveSpatialSwing(impact);}
    }
  }
  if(!spatialSwingMode||PL.classKey!=='warrior'||PL.hp<=0)return;
  for(const m of MON){
    if(!m.alive||m.z!==PL.z)continue;
    const rad=PL.w*.48+m.sz*.70;
    let dx=m.x-PL.x,dy=m.y-PL.y,dist=Math.hypot(dx,dy);
    if(dist>=rad)continue;
    if(dist<.001){const a=dirAngle(PL.dir);dx=Math.cos(a);dy=Math.sin(a);dist=1;}
    const force=Math.min(rad-dist,240*Math.min(Math.max(dt,0),.2));
    const nx=m.x+dx/dist*force,ny=m.y+dy/dist*force;
    const rr=m.sz*.46;
    if([[nx-rr,ny-rr],[nx+rr,ny-rr],[nx-rr,ny+rr],[nx+rr,ny+rr]].every(([x,y])=>{
       const t=w2t(x,y);return walkable(t.x,t.y,PL.z);
    })){
      m.x=nx;m.y=ny;spatialContactCorrections++;
    }
  }
};
const priorSpatialStartGame=startGame;
startGame=function(...args){spatialPending=null;spatialCanceled=0;spatialSwingMode=false;spatialSwingEvidence.swings=0;spatialSwingEvidence.misses=0;spatialSwingEvidence.contacts=0;spatialSwingEvidence.damagingHits=0;spatialContactCorrections=0;return priorSpatialStartGame(...args);};
addEventListener('keydown',ev=>{
  if(ev.key.toLowerCase()!=='b'||ev.repeat||ev.ctrlKey||ev.altKey||ev.metaKey||gameState!=='play'||paused||StudioLite.open||charOpen||npcOpen||mapOpen||settingsOpen)return;
  if(PL.classKey!=='warrior')return;
  ev.preventDefault();spatialSwingMode=!spatialSwingMode;PL.tgt=null;
  if(!spatialSwingMode&&spatialPending){spatialPending=null;spatialCanceled++;}
  msg(spatialSwingMode?'⚔ Zamach: kierunek WASD, trafienie w fazie kontaktu':'⚔ Powrót do historycznej walki celowanej',spatialSwingMode?'#ffe8a0':'#a0c2ff');
});
const priorSpatialRender=render;
render=function(){
  priorSpatialRender();
  if(gameState!=='play'||PL.classKey!=='warrior'||StudioLite.open||mapOpen||charOpen||npcOpen||settingsOpen)return;
  ctx.save();ctx.textAlign='right';ctx.font='bold 10px "Courier New"';
  const caption=spatialSwingMode?'[B] ZAMACH · WASD kierunek + SPACJA':'[B] Walka celowana · wybierz zamach';
  const width=Math.ceil(ctx.measureText(caption).width)+15;
  ctx.fillStyle='rgba(12,17,21,.80)';ctx.fillRect(GW-width-8,UIT+4,width+5,17);
  ctx.fillStyle=spatialSwingMode?'#ffe09b':'#d7d0b7';ctx.fillText(caption,GW-12,UIT+16);
  ctx.restore();
};
window.CoopegeSpatialCombat=Object.freeze({
  get manual(){return spatialSwingMode&&PL.classKey==='warrior';},
  inspect:()=>({mode:spatialSwingMode?'spatial':'legacy',classKey:PL.classKey,
    facing:PL.dir,atkCd:PL.atkCd,player:{x:PL.x,y:PL.y,z:PL.z,hp:PL.hp,kills:PL.kills},
    swings:spatialSwingEvidence.swings,misses:spatialSwingEvidence.misses,
    contacts:spatialSwingEvidence.contacts,damagingHits:spatialSwingEvidence.damagingHits,contactCorrections:spatialContactCorrections,
    pending:spatialPending?{elapsed:spatialPending.elapsed,angle:spatialPending.angle}:null,canceled:spatialCanceled,impactTime:SPATIAL_IMPACT_TIME,
    target:PL.tgt?.name??null})
});
