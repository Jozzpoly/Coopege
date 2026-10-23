/* B5 authored episode on top of B3 body/contact simulation. New courier episode
 * is an explicitly experimental playable hypothesis; old map/NPCs/quest/spawns
 * come unmodified from the B0 authored source witness. */
(function(root){
  'use strict';
  const base=root.CoopegeB1Core;
  const episodeTag='coopege-c1-first-journey-v2';
  const position=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
  function makeExtras(source,world){
    const authored=source.authored;
    const groups=['surface_city_north_vermin','surface_city_west_vermin'];
    const spawned=[];
    for(const id of groups){
      const g=authored.spawnGroups.find(v=>v.id===id&&v.z===0);
      if(!g)throw new Error('Original city encounter absent: '+id);
      for(const [i,xy] of (g.members.rat||[]).entries())spawned.push({
        id:g.id+':rat:'+i,groupId:g.id,name:'Szczur',x:xy[0]+.5,y:xy[1]+.5,
        homeX:xy[0]+.5,homeY:xy[1]+.5,hp:30,maxHp:30,
        alive:true,alert:0,cooldown:0,lastSeenX:null,lastSeenY:null
      });
    }
    world.rats.push(...spawned);
    const originalQuest=authored.quests.find(q=>q.name==='Plaga pod murami'&&q.tk==='rat');
    if(!originalQuest||originalQuest.need!==8)throw Error('Original authored rat quest changed');
    world.episode={
      id:episodeTag,hasCourierBag:false,courierDelivered:false,verminBountyPaid:false,
      courierBag:{x:90.5,y:103.5},courierRewardCoins:24,
      legacyBounty:{name:originalQuest.name,need:originalQuest.need,reward:originalQuest.reward},
      notes:['Srebrna Brama: Kupiec wspomina o zaginionej sakwie na południowym trakcie.']
    };
    return world;
  }
  function create(source){return makeExtras(source,base.create(source));}
  function addNote(w,txt){w.episode.notes.unshift(txt);w.episode.notes=w.episode.notes.slice(0,5);w.lastAction=txt;
    w.events.push({at:Math.round(w.clock*10)/10,kind:'story',description:txt});if(w.events.length>20)w.events.shift();}
  function step(w,input={},dt=1/60){
    const p=w.player,e=w.episode,merchant=w.authored.npcs.find(n=>n.role==='merchant');
    const atCourier= !e.hasCourierBag&&!e.courierDelivered&&position(p,e.courierBag)<1.3;
    const atMerchant=merchant&&position(p,merchant)<1.55;
    const doAction=!!input.interact,drop=!!input.drop;
    const wasAlive=w.rats.filter(r=>r.alive).length;
    // Returning quests are conversations; completed quests restore the merchant's
    // normal role (buy a bandage) instead of permanently hijacking commerce.
    const storyConversation=atMerchant&&(e.hasCourierBag||!e.courierDelivered||
      (w.kills>=e.legacyBounty.need&&!e.verminBountyPaid));
    const handled=doAction&&(atCourier||storyConversation);
    base.step(w,handled?{...input,interact:false}:input,dt);
    if(w.player.dead)return w;
    // Cargo is a physical place in the shared world, not an unrecoverable quest flag.
    // Q puts the carried parcel down near the actor; it persists and can be taken
    // again at any later time, with no virtual bag copy in the inventory.
    if(drop&&e.hasCourierBag&&!e.courierDelivered){
      const f=p.facing||{x:0,y:1};
      const tentative={x:p.x+f.x*.35,y:p.y+f.y*.35};
      const safe=base.canOccupy(w,tentative.x,tentative.y,.16,true,'player');
      e.courierBag=safe?tentative:{x:p.x,y:p.y};
      e.hasCourierBag=false;
      addNote(w,'Odkładasz sakwę w świecie. Pozostanie w tym miejscu, dopóki jej nie zabierzesz.');
    }
    if(doAction&&atCourier){
      e.hasCourierBag=true;
      addNote(w,'Podnosisz sakwę kupca. Wróć do Srebrnej Bramy albo zbadaj dalszy trakt.');
    }else if(doAction&&atMerchant){
      if(e.hasCourierBag&&!e.courierDelivered){
        e.hasCourierBag=false;e.courierDelivered=true;p.coins+=e.courierRewardCoins;p.bandages++;
        addNote(w,'Kupiec odbiera sakwę, płaci 24 monety i daje opatrunek. Możesz ruszyć ponownie.');
      }else if(w.kills>=e.legacyBounty.need&&!e.verminBountyPaid){
        e.verminBountyPaid=true;p.coins+=e.legacyBounty.reward.gold;p.bandages+=(e.legacyBounty.reward.hpot||0);
        addNote(w,'Plaga pod murami: odebrano autorską nagrodę za 8 szczurów — 60 monet i 2 opatrunki.');
      }else if(!e.courierDelivered){addNote(w,'Kupiec: zaginęła sakwa z dostawą. Ostatnio widziano ją za południową bramą.');}
    }
    if(w.rats.filter(r=>r.alive).length<wasAlive&&w.kills>0&&w.kills===e.legacyBounty.need)
      addNote(w,'Plaga pod murami: 8 szczurów. Wróć do Kupca po nagrodę z dawnego zadania.');
    return w;
  }
  function save(w){const rec=base.save(w);rec.version=4;rec.episode=JSON.parse(JSON.stringify(w.episode));return rec;}
  function restore(source,record){
    if(record?.version!==4||record?.episode?.id!==episodeTag)throw Error('Niezgodny zapis wyprawy C1');
    const snapshot={...record,version:2};
    const w=base.restore(source,snapshot);
    makeExtras(source,w);
    const recorded=new Map(record.rats.map(r=>[r.id,r]));
    for(const rat of w.rats){const found=recorded.get(rat.id);if(!found)throw Error('Brak spotkania '+rat.id);Object.assign(rat,found);}
    w.episode=JSON.parse(JSON.stringify(record.episode));
    return w;
  }
  root.CoopegeB1Core=Object.freeze({...base,create,step,save,restore});
})(globalThis);
