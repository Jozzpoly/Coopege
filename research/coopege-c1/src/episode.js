/* B5 authored episode on top of B3 body/contact simulation. New courier episode
 * is an explicitly experimental playable hypothesis; old map/NPCs/quest/spawns
 * come unmodified from the B0 authored source witness. */
(function(root){
  'use strict';
  const base=root.CoopegeB1Core;
  const episodeTag='coopege-f1-contact-recovery-v1';
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
      courierBag:{x:90.5,y:103.5},courierRewardCoins:24,workerCarrying:false,merchantStock:0,
      known:{workerPhase:'unknown',workerCarrying:false,delivered:false,merchantStock:null},
      legacyBounty:{name:originalQuest.name,need:originalQuest.need,reward:originalQuest.reward},
      notes:['Srebrna Brama: Kupiec wspomina o zaginionej sakwie na południowym trakcie.']
    };
    const gate=authored.entrances.find(n=>n.z===0&&n.name==='Południowa brama twierdzy');
    const warehouse=authored.entrances.find(n=>n.z===0&&n.name==='Magazyn');
    if(!gate||!warehouse)throw Error('Missing original gate or warehouse');
    world.worker={id:'worker:warehouse',name:'Tragarz',role:'worker',x:warehouse.x+.5,y:warehouse.y+.5,
      hp:36,maxHp:36,alive:true,phase:'outbound',index:0,carrying:false,seenThreat:null,attackCd:0};
    return world;
  }
  function create(source){return makeExtras(source,base.create(source));}

  // An embodied actor with a real, vulnerable location and a bounded task.
  // The original authored world supplies the gate and merchant. The worker
  // and its cargo-recovery mission are explicitly E1 experimental fiction.
  const outgoing=[{x:90.5,y:90.5},{x:90.5,y:100.5},{x:90.5,y:103.5}];
  const returning=[{x:90.5,y:98.5},{x:90.5,y:96.5},{x:90.5,y:83.5},{x:84.5,y:83.5}];
  function updateWorker(w,dt){
    const e=w.episode,k=w.worker,p=w.player;
    if(!k.alive||k.phase==='resting')return;
    k.attackCd=Math.max(0,k.attackCd-dt);
    // Only physically visible rats may acquire and attack the worker.
    for(const r of w.rats){
      if(!r.alive)continue;
      const d=position(r,k);
      if(d>5||!base.sight(w,r,k)||(position(p,r)<5.8&&base.sight(w,r,p)))continue;
      if(d<.8&&k.attackCd===0){
        k.hp=Math.max(0,k.hp-6);k.attackCd=1.2;
        if(k.hp===0){
          k.alive=false;k.phase='fallen';
          if(e.workerCarrying){e.workerCarrying=false;e.courierBag={x:k.x,y:k.y};}
          addNote(w,'Tragarz upadł. Pozostawiona sakwa nadal leży w świecie.',k);
          return;
        }
      }else if(d>=.8){
        const dx=(k.x-r.x)/d*1.85*dt,dy=(k.y-r.y)/d*1.85*dt;
        if(base.canOccupy(w,r.x+dx,r.y+dy,.25,false,r.id)){r.x+=dx;r.y+=dy;}
      }
    }
    const threat=w.rats.find(r=>r.alive&&position(k,r)<3.5&&base.sight(w,k,r));
    if(threat){k.phase='sheltering';k.seenThreat={id:threat.id,x:threat.x,y:threat.y};return;}
    if(k.phase==='sheltering')k.phase=e.workerCarrying?'returning':'outbound';
    if(k.phase==='searching')return;
    if(e.workerCarrying&&k.phase!=='returning'){k.phase='returning';k.index=0;}
    // The merchant can receive a bundle from arm's reach, not only by
    // occupying the merchant's exact solid collision center.
    const merchant=w.authored.npcs.find(n=>n.role==='merchant');
    if(e.workerCarrying&&position(k,merchant)<1.3){
      e.workerCarrying=false;k.carrying=false;e.courierDelivered=true;e.merchantStock+=3;
      e.courierBag={x:k.x,y:k.y};k.phase='resting';
      addNote(w,'Tragarz dotarł z dostawą. Kupiec otrzymał trzy opatrunki.',k);
      return;
    }
    const route=e.workerCarrying?returning:outgoing;
    const missionTarget=route[Math.min(k.index,route.length-1)];
    // Locally observed blockade, not a perfect global route solver. Persist
    // an attempted sidestep, but never cross walls or occupied contacts.
    if(!Array.isArray(k.detour))k.detour=[];
    const target=k.detour[0]||missionTarget,distance=position(k,target);
    if(distance<.23){
      if(k.detour.length){k.detour.shift();k.stalledFor=0;return;}
      if(k.index<route.length-1){k.index++;return;}
      if(e.workerCarrying){
        const merchant=w.authored.npcs.find(n=>n.role==='merchant');
        if(position(k,merchant)<1.5){
          e.workerCarrying=false;k.carrying=false;e.courierDelivered=true;e.merchantStock+=3;
          e.courierBag={x:k.x,y:k.y};k.phase='resting';
          addNote(w,'Tragarz dotarł z dostawą. Kupiec otrzymał trzy opatrunki.',k);
        }
      }else if(!e.hasCourierBag&&!e.courierDelivered&&position(k,e.courierBag)<.85){
        e.workerCarrying=true;k.carrying=true;k.phase='returning';k.index=0;
        addNote(w,'Tragarz znalazł sakwę i niesie ją do miasta.',k);
      }else k.phase='searching';
      return;
    }
    const pace=Math.min(distance,1.3*dt),nx=k.x+(target.x-k.x)/distance*pace,ny=k.y+(target.y-k.y)/distance*pace;
    const clear=base.canOccupy(w,nx,ny,.25,false,'worker')&&position({x:nx,y:ny},p)>.58
      &&w.authored.npcs.every(n=>position({x:nx,y:ny},n)>.50);
    if(clear){
      k.x=nx;k.y=ny;k.stalledFor=0;k.blockedNotice=false;
      if(e.workerCarrying)e.courierBag={x:k.x,y:k.y};
    }else{
      k.stalledFor=(k.stalledFor||0)+dt;
      if(k.stalledFor>.25&&!k.detour.length&&position(k,w.cart)<1.4){
        const d=position(k,missionTarget)||1;
        const ux=(missionTarget.x-k.x)/d,uy=(missionTarget.y-k.y)/d;
        const perp={x:-uy,y:ux};
        const clearance=w.cart.radius+.25+.30;
        for(const side of [1,-1]){
          const first={x:k.x+perp.x*clearance*side,y:k.y+perp.y*clearance*side};
          const beyond={x:first.x+ux*1.45,y:first.y+uy*1.45};
          const safe=q=>base.canOccupy(w,q.x,q.y,.25,false,'worker')&&position(q,p)>.58
            &&w.authored.npcs.every(n=>position(q,n)>.5);
          if(safe(first)&&safe(beyond)){
            k.detour=[first,beyond];k.stalledFor=0;
            addNote(w,'Tragarz próbuje obejść zablokowany wózkiem trakt.',k);
            break;
          }
        }
      }
      if(k.stalledFor>1.1&&!k.blockedNotice){
        k.blockedNotice=true;
        addNote(w,'Tragarz nie może przejść. Zatrzymuje się przed przeszkodą.',k);
      }
    }
  }
  function addNote(w,txt,location=null){
    // World truth is recorded separately from witnessed player-facing news.
    const seen=!location||(position(w.player,location)<6&&base.sight(w,w.player,location));
    w.events.push({at:Math.round(w.clock*10)/10,kind:'world',description:txt,witnessed:seen});
    if(w.events.length>20)w.events.shift();
    if(!seen)return;
    w.episode.notes.unshift(txt);w.episode.notes=w.episode.notes.slice(0,5);w.lastAction=txt;
  }
  function updateKnowledge(w){
    const p=w.player,e=w.episode,k=w.worker,merchant=w.authored.npcs.find(n=>n.role==='merchant');
    if(position(p,k)<6&&base.sight(w,p,k)){
      e.known.workerPhase=k.phase;e.known.workerCarrying=e.workerCarrying;
    }
    if(position(p,merchant)<5&&base.sight(w,p,merchant)){
      e.known.merchantStock=e.merchantStock;e.known.delivered=e.courierDelivered;
    }
  }
  function step(w,input={},dt=1/60){
    const p=w.player,e=w.episode,merchant=w.authored.npcs.find(n=>n.role==='merchant');
    const atCourier=!e.hasCourierBag&&!e.workerCarrying&&!e.courierDelivered&&position(p,e.courierBag)<1.3;
    const atWorker=w.worker.alive&&position(p,w.worker)<1.3;
    const atMerchant=merchant&&position(p,merchant)<1.55;
    const doAction=!!input.interact,drop=!!input.drop;
    const wasAlive=w.rats.filter(r=>r.alive).length;
    // Returning quests are conversations; completed quests restore the merchant's
    // normal role (buy a bandage) instead of permanently hijacking commerce.
    const storyConversation=atMerchant&&(e.hasCourierBag||!e.courierDelivered||
      (w.kills>=e.legacyBounty.need&&!e.verminBountyPaid));
    const handled=doAction&&(atCourier||atMerchant||atWorker);
    base.step(w,handled?{...input,interact:false}:input,dt);
    if(w.player.dead){
      if(e.hasCourierBag&&!e.courierDelivered){e.hasCourierBag=false;e.courierBag={x:p.x,y:p.y};addNote(w,'Upuszczona sakwa pozostaje przy miejscu upadku gracza.');}
      return w;
    }
    // Cargo is a physical place in the shared world, not an unrecoverable quest flag.
    // Q puts the carried parcel down near the actor; it persists and can be taken
    // again at any later time, with no virtual bag copy in the inventory.
    if(drop&&!doAction&&e.hasCourierBag&&!e.courierDelivered){
      const f=p.facing||{x:0,y:1};
      const tentative={x:p.x+f.x*.35,y:p.y+f.y*.35};
      const safe=base.canOccupy(w,tentative.x,tentative.y,.16,true,'player');
      e.courierBag=safe?tentative:{x:p.x,y:p.y};
      e.hasCourierBag=false;
      addNote(w,'Odkładasz sakwę w świecie. Pozostanie w tym miejscu, dopóki jej nie zabierzesz.');
    }
    // A visible, reachable ground parcel takes precedence over talking to
    // an actor who happens to be standing near the same object.
    if(doAction&&atCourier){
      e.hasCourierBag=true;
      addNote(w,'Podnosisz sakwę kupca. Możesz dostarczyć ją osobiście.');
    }else if(doAction&&atWorker&&e.workerCarrying){
      e.workerCarrying=false;w.worker.carrying=false;e.hasCourierBag=true;w.worker.phase='searching';
      addNote(w,'Tragarz przekazuje Ci sakwę, którą możesz sam dostarczyć.');
    }else if(doAction&&atWorker){
      addNote(w,w.worker.phase==='sheltering'?'Tragarz: widziałem szczury. Nie chcę ryzykować ładunku.':
        'Tragarz: szukam dostawy na południowym trakcie.');
    }else if(doAction&&atMerchant){
      if(e.hasCourierBag&&!e.courierDelivered){
        e.hasCourierBag=false;e.courierDelivered=true;e.merchantStock+=3;p.coins+=e.courierRewardCoins;p.bandages++;
        addNote(w,'Kupiec odbiera sakwę, płaci 24 monety i daje opatrunek. Możesz ruszyć ponownie.');
      }else if(w.kills>=e.legacyBounty.need&&!e.verminBountyPaid){
        e.verminBountyPaid=true;p.coins+=e.legacyBounty.reward.gold;p.bandages+=(e.legacyBounty.reward.hpot||0);
        addNote(w,'Plaga pod murami: odebrano autorską nagrodę za 8 szczurów — 60 monet i 2 opatrunki.');
      }else if(!e.courierDelivered){addNote(w,'Kupiec: tragarz szuka dostawy za południową bramą.');}
      else if(e.merchantStock<=0)addNote(w,'Kupiec: zabrakło opatrunków. Czekam na dostawę.');
      else if(p.coins<3)addNote(w,'Kupiec: opatrunek kosztuje 3 monety.');
      else{p.coins-=3;p.bandages++;e.merchantStock--;addNote(w,'Kupiec sprzedał opatrunek z dostarczonych zapasów.');}
    }
    if(w.rats.filter(r=>r.alive).length<wasAlive&&w.kills>0&&w.kills===e.legacyBounty.need)
      addNote(w,'Plaga pod murami: 8 szczurów. Wróć do Kupca po nagrodę z dawnego zadania.');
    updateWorker(w,dt);
    updateKnowledge(w);
    return w;
  }
  function save(w){const rec=base.save(w);rec.version=5;rec.episode=JSON.parse(JSON.stringify(w.episode));rec.worker=JSON.parse(JSON.stringify(w.worker));return rec;}
  function restore(source,record){
    if(record?.version!==5||record?.episode?.id!==episodeTag)throw Error('Niezgodny zapis wyprawy C1');
    const snapshot={...record,version:2};
    const w=base.restore(source,snapshot);
    makeExtras(source,w);
    const recorded=new Map(record.rats.map(r=>[r.id,r]));
    for(const rat of w.rats){const found=recorded.get(rat.id);if(!found)throw Error('Brak spotkania '+rat.id);Object.assign(rat,found);}
    w.episode=JSON.parse(JSON.stringify(record.episode));
    if(!record.worker||!Number.isFinite(record.worker.x)||!Number.isFinite(record.worker.y))throw Error('Brak stanu tragarza');
    w.worker=JSON.parse(JSON.stringify(record.worker));
    return w;
  }
  root.CoopegeB1Core=Object.freeze({...base,create,step,save,restore});
})(globalThis);
