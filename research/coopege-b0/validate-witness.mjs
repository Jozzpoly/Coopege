import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import assert from "node:assert/strict";

/**
 * Exercises the authored witness without launching/using a single function
 * from the old Tibia runtime. This is a proof of an extraction boundary, not
 * of a completed new game or a finalized content schema.
 */
const root=resolve(import.meta.dirname,"../..");
const out=resolve(root,".build/coopege-b0");
const w=JSON.parse(readFileSync(resolve(out,"source-authored-witness.json"),"utf8"));
assert.equal(w.format,"coopege-authored-source-witness/v0");
const a=w.authored,start=a.start;
const f=a.floors[String(start.z)];
const palette=a.tilePalette;
assert.ok(f&&f.tiles&&palette,"Authoring witness has no playable terrain definition");
const [width,height]=[a.world.width,a.world.height];
const cells=[];
for(const [id,count] of f.tiles){
  assert.ok(Number.isInteger(count)&&count>0);
  for(let i=0;i<count;i++)cells.push(id);
}
assert.equal(cells.length,width*height);
const walkable=(x,y)=>{
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=width||y>=height)return false;
  return palette[String(cells[y*width+x])]?.walkable===true;
};
assert.ok(walkable(start.x,start.y),"Legacy author placed the player into solid terrain");
const sourceAt=(x,y)=>y*width+x;
const distances=new Int32Array(cells.length).fill(-1);
const previous=new Int32Array(cells.length).fill(-1);
const queue=[sourceAt(start.x,start.y)];
distances[queue[0]]=0;
for(let i=0;i<queue.length;i++){
  const v=queue[i],x=v%width,y=Math.floor(v/width);
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
    const nx=x+dx,ny=y+dy,idx=sourceAt(nx,ny);
    if(walkable(nx,ny)&&distances[idx]===-1){
      distances[idx]=distances[v]+1;
      previous[idx]=v;
      queue.push(idx);
    }
  }
}
const pathTo=(x,y)=>{
  if(!walkable(x,y))return {reachable:false,reason:"solid destination"};
  const index=sourceAt(x,y),steps=distances[index];
  if(steps<0)return {reachable:false,reason:"disconnected traversable component"};
  const reverse=[],seen=new Set();let at=index;
  while(at>=0&&!seen.has(at)){
    seen.add(at);reverse.push([at%width,Math.floor(at/width)]);
    if(at===queue[0])break;
    at=previous[at];
  }
  assert.deepEqual(reverse.at(-1),[start.x,start.y]);
  return {reachable:true,steps,route:reverse.reverse()};
};
const sources=[
  ...a.npcs.filter(n=>n.z===start.z).map(n=>({kind:"npc",id:n.id,name:n.name,role:n.type,x:n.x,y:n.y})),
  ...a.entrances.filter(n=>n.z===start.z).map(n=>({kind:"entrance",id:null,name:n.name,role:null,x:n.x,y:n.y}))
];
const anchors=sources.map(n=>({...n,...pathTo(n.x,n.y)}));
const inaccessible=anchors.filter(n=>!n.reachable).map(n=>({kind:n.kind,name:n.name,reason:n.reason}));
const report={
  origin:"Independently consumed generated authored-source witness; no original executable used",
  start,reachableCells:queue.length,totalCells:cells.length,
  namedPlaces:anchors.map(({route,...rest})=>rest),
  sampleRoutes:anchors.filter(n=>n.reachable&&(n.kind==="npc"||n.name.includes("Południowa"))).map(n=>({
    name:n.name,steps:n.steps,first:n.route.slice(0,10),last:n.route.slice(-10)})),
  inaccessible,
  limitations:[
    "Grid accessibility is not equivalent to collision-aware body traversability",
    "Actor occupancy and dynamic world changes are not modeled",
    "Destination roles are original source meaning, not a commitment to preserve NPC behavior",
    "The UI, combat, narrative, sound and game-feel have not been implemented"
  ]
};
writeFileSync(resolve(out,"place-network.json"),JSON.stringify(report,null,2)+"\n");
const healer=anchors.find(n=>n.role==="healer"),merchant=anchors.find(n=>n.role==="merchant");
assert.ok(healer&&merchant,"Historic starting town has lost its NPC roles");
assert.ok(healer.reachable&&merchant.reachable,"NPC exists as marker but player cannot reach them from authored start");
console.info("COOPEGE_B0_PLACES",JSON.stringify({
  start,reachableCells:queue.length,
  healer:{name:healer.name,steps:healer.steps},
  merchant:{name:merchant.name,steps:merchant.steps},
  entrances:anchors.filter(n=>n.kind==="entrance").length,inaccessible
}));
console.info("PASS independent authoring witness consumer; zero Tibia runtime calls");
