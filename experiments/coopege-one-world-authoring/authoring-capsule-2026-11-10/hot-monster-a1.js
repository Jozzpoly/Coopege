/* Coopege Oct26: disposable domain-only experiment. NOT a production/host API. */
(function setupHotMonsterLab(root){
 'use strict';
 const content=root.TibiaContentAPI;
 if(!content)throw Error('Coopege Content API missing');
 const clone=x=>JSON.parse(JSON.stringify(x));
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?
   Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const authored=x=>{const p=clone(x);delete p.exportedAt;return p;};
 const same=(a,b)=>JSON.stringify(stable(authored(a)))===JSON.stringify(stable(authored(b)));
 let undoRecord=null;
 function prepare(monsterId,changes){
   if(!changes||typeof changes!=='object'||Array.isArray(changes)||
     Object.keys(changes).length===0)throw Error('Expected an explicit definition patch');
   const base=content.exportPackage();
   if(!Object.prototype.hasOwnProperty.call(base.monsters,monsterId))throw Error('No such monster: '+monsterId);
   // Only fields from an existing definition: no silent schema invention.
   for(const k of Object.keys(changes))if(!Object.prototype.hasOwnProperty.call(base.monsters[monsterId],k))
     throw Error('Unknown monster field: '+k);
   const next=clone(base);
   Object.assign(next.monsters[monsterId],clone(changes));
   const check=content.validatePackage(next);
   return Object.freeze({monsterId,base,next,check,
      preview:Object.freeze({fields:Object.keys(changes),
        definitionScope:'ALL authored occurrences of this monster kind',
        livingActors:'Existing identities preserved; only HP behavior empirically tested',
        futureActors:'New respawn reads updated HP; other fields unverified',
        persistent:false,undoScope:'Definition only; already spawned actors/combat history are NOT restored'})});
 }
 function apply(plan){
   if(!plan||!plan.monsterId||!plan.base||!plan.next)throw Error('Expected plan from prepare');
   const current=content.exportPackage();
   if(!same(current,plan.base))throw Error('Content changed since preparation; re-prepare, never overwrite');
   const valid=content.validatePackage(plan.next);
   if(!valid.ok)throw Error('Engine refuses live definition: '+valid.errors.slice(0,3).join('; '));
   if(same(current,plan.next))return{applied:false,unchanged:true};
   const result=content.importPackage(clone(plan.next),{respawn:false,syncPlayer:false});
   const after=content.exportPackage();
   if(!result.applied||!same(after,plan.next)){
     content.importPackage(current,{respawn:false,syncPlayer:false});
     throw Error('Definition edit failed verification; previous authored content restored');
   }
   undoRecord={before:current,after};
   return{applied:true,verified:true,monsterId:plan.monsterId,
     currentActorStatsChanged:false,futureSpawnDefinitionChanged:true,undoDefinitionOnly:true};
 }
 function undo(){
   if(!undoRecord)return{restored:false,reason:'No definition change to undo'};
   const current=content.exportPackage();
   if(!same(current,undoRecord.after))return{restored:false,conflict:true,
     reason:'Authored content changed since this edit; do not overwrite'};
   const result=content.importPackage(undoRecord.before,{respawn:false,syncPlayer:false});
   if(!result.applied||!same(content.exportPackage(),undoRecord.before))
     throw Error('Definition rollback failed verification');
   undoRecord=null;
   return{restored:true,verified:true,existingActorsUnchanged:true};
 }
 Object.defineProperty(root,'CoopegeHotMonsterLab',{configurable:false,writable:false,
   value:Object.freeze({prepare,apply,undo})});
})(window);
