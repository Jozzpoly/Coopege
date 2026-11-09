export function inspectRaw(raw, rect, z=0) {
 const inside=(o)=>o&&o.z===z&&o.x>=rect.x&&o.x<rect.x+rect.w&&o.y>=rect.y&&o.y<rect.y+rect.h;
 const overlaps=(bb)=>!!bb&&!(bb[2]<rect.x||bb[0]>=rect.x+rect.w||bb[3]<rect.y||bb[1]>=rect.y+rect.h);
 return {npcs:(raw.map.npcs||[]).filter(inside).map(x=>({id:x.id,name:x.name,x:x.x,y:x.y})),
  entrances:(raw.map.entrances||[]).filter(inside).map(x=>({name:x.name,x:x.x,y:x.y})),
  links:(raw.map.links||[]).filter(inside).map(x=>({name:x.label,x:x.x,y:x.y,destination:[x.toX,x.toY,x.toZ]})),
  gates:(raw.map.playability?.gates||[]).filter(x=>x.z===z&&overlaps(x.bbox)).map(x=>({name:x.name,bbox:x.bbox,partial:!(x.bbox[0]>=rect.x&&x.bbox[1]>=rect.y&&x.bbox[2]<rect.x+rect.w&&x.bbox[3]<rect.y+rect.h)})),
  groups:(raw.map.spawnGroups||[]).filter(x=>x.z===z&&inside({...x.anchor,z:x.z})).map(x=>({id:x.id,label:x.label,region:x.region}))}
}
