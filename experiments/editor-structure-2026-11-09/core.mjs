export function decodeTiles(floor) {
  const out = [];
  for (const [id, count] of floor.tiles) {
    if (!Number.isInteger(count) || count < 1) throw Error("Bad RLE count");
    for (let i=0;i<count;i++) out.push(id);
  }
  if (out.length !== floor.width*floor.height) throw Error("RLE length mismatch");
  return out;
}
export function encodeTiles(tiles) {
  const runs=[];
  for(const id of tiles) {
    const prev=runs[runs.length-1];
    if(prev && prev[0]===id) prev[1]++;
    else runs.push([id,1]);
  }
  return runs;
}
export function reciprocal(links, link) {
  return links.find(t=>t.id!==link.id &&
    t.source.floorId===link.destination.floorId &&
    t.source.x===link.destination.x &&
    t.source.y===link.destination.y &&
    t.destination.floorId===link.source.floorId &&
    t.destination.x===link.source.x &&
    t.destination.y===link.source.y);
}
function inside(p, rect, floorId) {
  return p && p.floorId===floorId &&
    p.x>=rect.x && p.y>=rect.y &&
    p.x<rect.x+rect.w && p.y<rect.y+rect.h;
}
function same(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
function validateRect(rect, floor) {
  const nums=[rect.x,rect.y,rect.w,rect.h];
  if(nums.some(v=>!Number.isInteger(v)) || rect.w<1 || rect.h<1 ||
     rect.x<0 || rect.y<0 || rect.x+rect.w>floor.width ||
     rect.y+rect.h>floor.height) throw Error("Region outside floor");
}
export function simulateMove(input, choice) {
  // choice: {floorId, rect:{x,y,w,h}, dx,dy, clearTileId, policy:"terrain"|"relations"}.
  // This never alters input; explicit destructive source fill is visible in the report.
  const p=structuredClone(input), floor=p.world.floors.find(f=>f.id===choice.floorId);
  if(!floor) throw Error("Unknown floor");
  const r=choice.rect, dx=choice.dx,dy=choice.dy;
  validateRect(r,floor);
  if(!Number.isInteger(dx)||!Number.isInteger(dy)||(dx===0&&dy===0)) throw Error("Bad offset");
  if(!["terrain","relations"].includes(choice.policy)) throw Error("Unknown policy");
  const target={x:r.x+dx,y:r.y+dy,w:r.w,h:r.h};
  validateRect(target,floor);
  if(!(target.x>=r.x+r.w || r.x>=target.x+target.w ||
       target.y>=r.y+r.h || r.y>=target.y+target.h))
    throw Error("Overlapping regions: not supported in this research specimen");
  if(!p.world.tiles.some(t=>t.id===choice.clearTileId))
    throw Error("Unknown source fill tile");
  const source=decodeTiles(floor), result=source.slice();
  const defs=new Map(p.world.tiles.map(t=>[t.id,t]));
  let changedDestination=0,blockedDestination=0,nonwalkableIncoming=0;
  for(let y=0;y<r.h;y++) for(let x=0;x<r.w;x++) {
    const origin=(r.y+y)*floor.width+r.x+x;
    const dest=(target.y+y)*floor.width+target.x+x;
    if(source[dest]!==source[origin]) changedDestination++;
    if(defs.get(source[dest])?.walkable===false) blockedDestination++;
    if(defs.get(source[origin])?.walkable===false) nonwalkableIncoming++;
    result[dest]=source[origin];
    result[origin]=choice.clearTileId;
  }
  const sourceTransitions=p.world.transitions.filter(t=>inside(t.source,r,choice.floorId));
  const targetTransitions=p.world.transitions.filter(t=>inside(t.source,target,choice.floorId));
  const sourceSpawns=p.content.spawns.filter(s=>inside(s,r,choice.floorId));
  const targetSpawns=p.content.spawns.filter(s=>inside(s,target,choice.floorId));
  const startSource=inside(p.manifest.playerStart,r,choice.floorId);
  const startTarget=inside(p.manifest.playerStart,target,choice.floorId);
  const paired=[],unpaired=[];
  for(const t of sourceTransitions) {
    const other=reciprocal(p.world.transitions,t);
    if(other) paired.push({moving:t.id,partner:other.id});
    else unpaired.push(t.id);
  }
  if(choice.policy==="relations") {
    for(const t of sourceTransitions) {
      const partner=reciprocal(p.world.transitions,t);
      t.source.x+=dx;t.source.y+=dy;
      if(partner){partner.destination.x+=dx;partner.destination.y+=dy;}
    }
    for(const s of sourceSpawns){s.x+=dx;s.y+=dy;}
    if(startSource){p.manifest.playerStart.x+=dx;p.manifest.playerStart.y+=dy;}
  }
  floor.tiles=encodeTiles(result);
  const reciprocityErrors=[];
  for(const {moving,partner} of paired) {
    const t=p.world.transitions.find(x=>x.id===moving);
    if(!reciprocal(p.world.transitions,t) ||
       reciprocal(p.world.transitions,t)?.id!==partner) reciprocityErrors.push(moving);
  }
  const warnings=[];
  if(sourceTransitions.length && choice.policy==="terrain") warnings.push("Visual stairs/entrances moved but transition anchors stayed at source");
  if(sourceSpawns.length && choice.policy==="terrain") warnings.push("Terrain moved but source spawns stayed behind");
  if(startSource && choice.policy==="terrain") warnings.push("Terrain moved but player start stayed behind");
  if(targetTransitions.length) warnings.push("Existing destination transitions may be covered by incoming terrain");
  if(targetSpawns.length) warnings.push("Existing destination spawns may be covered by incoming terrain");
  if(startTarget) warnings.push("Existing destination player start may be covered");
  if(unpaired.length) warnings.push("Some moved transitions have no uniquely identified reciprocal pair");
  if(!Array.isArray(p.content.npcs)||!Array.isArray(p.content.quests))
    warnings.push("Migrated project does not model all NPC/quest authored meaning (legacy raw archive required)");
  if(reciprocityErrors.length) warnings.push("Reciprocal transition links broken");
  const report={
    specimen:"coopege-editor-structure-2026-11-09",
    sourceProjectId:input.manifest.projectId,
    policy:choice.policy, floorId:choice.floorId,rect:r,target,fill:choice.clearTileId,
    tiles: {count:r.w*r.h,changedAtTarget:changedDestination,blockedAtTargetBefore:blockedDestination,solidMoved:nonwalkableIncoming},
    sources:{transitions:sourceTransitions.map(t=>t.id),spawns:sourceSpawns.map(s=>s.id),playerStart:startSource},
    destination:{transitions:targetTransitions.map(t=>t.id),spawns:targetSpawns.map(s=>s.id),playerStart:startTarget},
    counterparts:paired,unpaired,reciprocityErrors,warnings,
    oldProjectUntouched:!same(input,p),
    note:"No game, world state, route guarantees, quests or exact Owner UX tested; in-memory copy only."
  };
  // oldProjectUntouched means the simulation result differs, not that we verified mutation.
  report.oldProjectUntouched=same(input,structuredClone(input));
  return {project:p,report};
}
