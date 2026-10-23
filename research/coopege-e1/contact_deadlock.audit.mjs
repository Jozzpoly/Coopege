/**
 * Reproduce a confirmed E1 player+cart+worker deadlock using real authored terrain.
 * Deliberately NOT a gameplay fix. Output is a failure witness.
 * node research/coopege-e1/contact_deadlock.audit.mjs
 * node research/coopege-e1/contact_deadlock.audit.mjs --gate
 * The --gate variant is expected to FAIL until recoverability is genuinely fixed.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>readFileSync(resolve(root,p),"utf8");
const realm=vm.createContext({});
for(const file of ["core.js","episode.js"])
  vm.runInContext(read("research/coopege-c1/src/"+file),realm,{filename:file});
const api=realm.CoopegeB1Core,source=JSON.parse(read("research/coopege-c1/src/witness.json"));
const round=n=>Number(n.toFixed(6));
function create(workerY=101.5){
  const w=api.create(source);
  // Isolate contact from rat aggro; do not alter the production game or map.
  for(const rat of w.rats)rat.alive=false;
  Object.assign(w.worker,{x:90.5,y:workerY,phase:"outbound",index:2});
  Object.assign(w.cart,{x:90.5,y:102.27,vx:0,vy:0});
  Object.assign(w.player,{x:100.5,y:95.5});
  assert.equal(api.mapWalk(w,w.cart.x,w.cart.y),true);
  assert.equal(api.mapWalk(w,w.worker.x,w.worker.y),true);
  return w;
}
function advance(w,input,n){for(let i=0;i<n;i++)api.step(w,input,1/60);}
const blocked=create(),initial=api.dist(blocked.worker,blocked.cart);
advance(blocked,{},120);
const afterLegalApproach=api.dist(blocked.worker,blocked.cart);
const workerAtContact={x:blocked.worker.x,y:blocked.worker.y};
Object.assign(blocked.player,{x:90.5,y:103.27});
const oldCart={x:blocked.cart.x,y:blocked.cart.y};
advance(blocked,{grab:{x:90.5,y:103}},100);
const attemptedOutwardDrag=api.dist(oldCart,blocked.cart);
advance(blocked,{dy:-1},120);
const attemptedPush=api.dist(oldCart,blocked.cart);
const workerDisplacement=api.dist(workerAtContact,blocked.worker);
// Baseline: same cart and player controls, but worker starts 0.5 farther away.
const control=create(101.0);
Object.assign(control.player,{x:90.5,y:103.27});
const before={x:control.cart.x,y:control.cart.y};
advance(control,{grab:{x:90.5,y:103}},100);
const controlDrag=api.dist(before,control.cart);
const report={
  status:"REPRODUCED_CONTACT_DEADLOCK_NOT_A_PASS",
  source:"Actual E1 core/episode + original authored world; controlled initial positions only",
  workerCartGapAtStart:round(initial),
  gapAfterLegalWorkerMotion:round(afterLegalApproach),
  workerToCartCollisionThreshold:.25+.47-.02,
  cartToWorkerCollisionThreshold:.47+.29-.01,
  outwardCartDrag:round(attemptedOutwardDrag),
  opposingCartPush:round(attemptedPush),
  blockedWorkerProgress:round(workerDisplacement),
  unobstructedOutwardDragControl:round(controlDrag),
  reproducible:initial>.75&&afterLegalApproach>.70&&afterLegalApproach<.75
    &&attemptedOutwardDrag<1e-7&&attemptedPush<1e-7
    &&workerDisplacement<1e-7&&controlDrag>.1
};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes("--gate")){
  assert.ok(attemptedOutwardDrag>.05,
    "BLOCKER: outward cart movement must not be vetoed by a stricter inverse contact threshold");
  assert.ok(attemptedPush>.1||workerDisplacement>.1,
    "BLOCKER: opposing player/cart/actor contact remains frozen without response");
}else if(!report.reproducible){
  console.error("Unexpected: witness no longer reproduces; inspect why before claiming recovery.");
  process.exitCode=2;
}
