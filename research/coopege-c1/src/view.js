/* Coopege B1. Visual language is deliberately provisional.
   Neither authored map nor simulation depends on the canvas projection. */
(function(root){
"use strict";
function attach(source){
  const core=root.CoopegeB1Core,canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
  const hud=document.getElementById("hud"),message=document.getElementById("message"),meter=document.getElementById("meter");
  if(!ctx)throw Error("Canvas 2D unavailable");
  let world=core.create(source),pressed=new Set(),pending={interact:false,hit:false,bandage:false,drop:false},last=0,acc=0,animation=0;
  let camera={x:world.player.x,y:world.player.y},stopped=false,dragPointerId=null,dragTarget=null,zoom=1.28;
  const saveKey="coopege-f1-contact-recovery-v1";
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
    return {w,h,scale:Math.min(105*dpr,Math.max(28*dpr,Math.min(60*dpr,Math.max(34*dpr,Math.min(w/19,h/12)))*zoom))};
  };
  function colorTile(id,x,y){const i=+id||0,shade=colors[i]??["#566757","#687762"];return shade[hash(x,y)>.46?1:0];}
  function drawMinimap(){
    const map=document.getElementById('minimap'),g=map.getContext('2d');
    if(!g)return;
    const w=map.width,h=map.height,cell=3.8,rad=22.7,p=world.player;
    g.clearRect(0,0,w,h);g.fillStyle='#12201c';g.fillRect(0,0,w,h);
    for(let y=Math.floor(p.y-rad);y<Math.ceil(p.y+rad);y++)for(let x=Math.floor(p.x-rad);x<Math.ceil(p.x+rad);x++){
      if(x<0||y<0||x>=world.grid.width||y>=world.grid.height)continue;
      const t=String(world.grid.tiles[y*world.grid.width+x]),px=(x-p.x+rad)*cell,py=(y-p.y+rad)*cell;
      g.fillStyle=['2','11','15','17','6'].includes(t)?'#52605b':['4','5','13'].includes(t)?'#a68e63':t==='3'?'#285c69':'#42694b';
      g.fillRect(Math.floor(px),Math.floor(py),Math.ceil(cell),Math.ceil(cell));
    }
    const dot=(at,col,r=2.9)=>{const x=(at.x-p.x+rad)*cell,y=(at.y-p.y+rad)*cell;g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
    for(const n of world.authored.npcs)dot(n,'#92d7c9',3.2);
    for(const r of world.rats)if(r.alive&&core.dist(r,p)<10)dot(r,'#e58d7b',2.2);
    if(!world.episode.courierDelivered&&!world.episode.hasCourierBag&&!world.episode.workerCarrying)dot(world.episode.courierBag,'#f3d28e',4);
    dot(world.cart,'#c3985a',3.2);dot(p,'#fff3bc',4);
    g.strokeStyle='#e4d6ab';g.globalAlpha=.65;g.lineWidth=1;g.strokeRect(1.5,1.5,w-3,h-3);g.globalAlpha=1;
  }
  // B4 VISUAL LANGUAGE TRIAL. Entirely presentational: the authored world, collision,
  // cart behavior and game state are not modified by drawing.
  function draw(now){
    const {w,h,scale}=size();
    camera.x+=(world.player.x-camera.x)*.15;
    camera.y+=(world.player.y-camera.y)*.15;
    const loc=(x,y)=>({x:(x-camera.x)*scale+w*.5,y:(y-camera.y)*scale+h*.5});
    const rnd=(x,y,k=0)=>hash(Math.floor(x)*17+k*31,Math.floor(y)*29+k*7);
    const fill=(c,x,y,ww,hh)=>{ctx.fillStyle=c;ctx.fillRect(x,y,ww,hh);};
    const line=(c,sz,x,y,x2,y2)=>{ctx.strokeStyle=c;ctx.lineWidth=sz;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
    const ellipse=(c,x,y,rx,ry)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,Math.max(.5,rx),Math.max(.5,ry),0,0,Math.PI*2);ctx.fill();};
    const text=(v,x,y,c,size,align='center')=>{
      ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`600 ${size}px system-ui`;
      ctx.strokeStyle='rgba(13,17,17,.92)';ctx.lineWidth=3.4;ctx.lineJoin='round';ctx.strokeText(v,x,y);
      ctx.fillStyle=c;ctx.fillText(v,x,y);
    };
    const matte=['#40543c','#455b41','#333f39','#284c57','#756b51','#6f543e','#b18b55','#4d6940','#697473','#2d594b','#4c4e52','#786044','#45545b','#996d47','#5a685c','#656359','#477258','#485a52'];
    function tileClass(id){if(['2','11','15','17','6'].includes(id))return 'wall';if(id==='3')return 'water';if(['4','5','13'].includes(id))return 'road';if(['8','12'].includes(id))return 'stone';return 'grass';}
    function paintTile(id,tx,ty){
      const p=loc(tx,ty),x=Math.floor(p.x),y=Math.floor(p.y),ss=scale+1;
      const kind=tileClass(id),seed=rnd(tx,ty),seed2=rnd(tx,ty,3);
      const legacyAtlas={0:"grass",1:"stone",2:"wall",4:"earth",5:"wood"}[id];
      const timg=legacyAtlas&&root.CoopegeB5Atlas?.[legacyAtlas];
      if(timg?.complete&&timg.naturalWidth){
        // Original 32x32 sheets are four visual variants; never animate static ground.
        const variant=Math.min(3,Math.floor(rnd(tx,ty,18)*4));
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(timg,variant*32,0,32,32,x,y,ss,ss);
        if(kind==="wall"){fill("rgba(14,18,21,.19)",x,y+ss*.84,ss,ss*.16);}
        return;
      }
      if(kind==='grass'){
        const c=matte[+id]||'#405e42';fill(c,x,y,ss,ss);
        fill(seed>.5?'rgba(128,160,87,.08)':'rgba(15,34,23,.12)',x,y,ss,ss);
        if(seed>.22){
          const gx=x+ss*(.15+seed*.60),gy=y+ss*(.15+seed2*.58),z=Math.max(1,scale*.028);
          line('rgba(127,170,101,.65)',z,gx,gy+scale*.11,gx-scale*.04,gy);
          line('rgba(91,140,82,.6)',z,gx,gy+scale*.11,gx+scale*.035,gy+scale*.025);
          line('rgba(23,57,42,.45)',z,gx,gy+scale*.10,gx+scale*.008,gy+scale*.065);
        }
        if(seed>.82){
          const fx=x+ss*.72,fy=y+ss*.27;
          ellipse('rgba(17,46,31,.38)',fx+3,fy+4,scale*.12,scale*.08);
          ellipse('#305f39',fx,fy,scale*.09,scale*.08);
          ellipse('#4d8650',fx-scale*.035,fy-scale*.04,scale*.07,scale*.052);
          if(seed2>.5){ellipse('#d9bd77',fx-scale*.03,fy-scale*.02,scale*.016,scale*.016);}
        }
      }else if(kind==='road'){
        fill(id==='4'?'#8a7555':id==='5'?'#7f6951':'#9b815d',x,y,ss,ss);
        fill(seed>.5?'rgba(227,197,132,.10)':'rgba(48,42,35,.10)',x,y,ss,ss);
        const z=scale*.035;
        for(let n=0;n<3;n++){
          let sx=x+ss*rnd(tx+n*17,ty,4),sy=y+ss*rnd(tx,ty+n*19,5);
          ellipse(n%2?'#685b49':'#b29a74',sx,sy,z*(1+n*.5),z*.48);
          line('rgba(36,30,23,.16)',Math.max(1,scale*.018),sx-z*1.8,sy+z*.8,sx+z*2.1,sy+z*.95);
        }
        if(seed>.65){
          line('rgba(219,183,122,.18)',Math.max(1,scale*.055),x+ss*.12,y+ss*.16,x+ss*.20,y+ss*.22);
        }
      }else if(kind==='water'){
        fill('#284a57',x,y,ss,ss);fill('rgba(26,78,104,.28)',x,y,ss,ss);
        const v=Math.sin(now*.0014+tx*4+ty*3);line('rgba(120,193,196,.25)',scale*.027,x+ss*.10,y+ss*(.45+v*.07),x+ss*.72,y+ss*(.45+v*.07));
      }else if(kind==='stone'){
        fill('#68716a',x,y,ss,ss);
        for(let n=0;n<2;n++){
          const xx=x+ss*(n*.53),yy=y+ss*(n*.16);
          line('rgba(28,39,35,.4)',Math.max(1,scale*.03),xx,y+ss*.52,xx+ss*.4,y+ss*.52);
        }
        fill('rgba(211,211,175,.07)',x+1,y+1,ss-2,Math.max(1,scale*.04));
      }else{
        // Stone wall: mortar, laid brick courses, consistent north/west lighting.
        fill('#292e2a',x,y,ss,ss);
        for(let row=0;row<3;row++){
          const bh=ss/3,off=row%2?ss*.29:-ss*.19;
          for(let col=-1;col<3;col++){
            const bx=x+col*ss*.55+off+1,by=y+row*bh+1;
            ctx.fillStyle=(col+row+tx+ty)%3===0?'#48504a':(col+row)%2===0?'#566059':'#3b4742';
            ctx.fillRect(bx,by,ss*.55-2,bh-2);
            fill('rgba(181,191,168,.22)',bx,by,ss*.55-2,Math.max(1,scale*.025));
          }
        }
        fill('rgba(8,16,16,.23)',x,y+ss*.82,ss,ss*.18);
        fill('rgba(183,184,159,.18)',x,y,ss,Math.max(2,scale*.05));
      }
      // A cliff-like contact shadow where a solid tile meets open ground.
      if(kind!=='wall'&&world.grid.defs[id]?.walkable!==false){
        const north=world.grid.tiles[(ty-1)*world.grid.width+tx],west=world.grid.tiles[ty*world.grid.width+tx-1];
        if(north&&tileClass(north)==='wall')fill('rgba(1,12,10,.28)',x,y,ss,scale*.14);
        if(west&&tileClass(west)==='wall')fill('rgba(1,12,10,.15)',x,y,scale*.11,ss);
      }
    }
    const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#141f20');bg.addColorStop(1,'#101a19');fill(bg,0,0,w,h);
    const x0=Math.max(0,Math.floor(camera.x-w/scale/2)-2),x1=Math.min(world.grid.width,Math.ceil(camera.x+w/scale/2)+2);
    const y0=Math.max(0,Math.floor(camera.y-h/scale/2)-2),y1=Math.min(world.grid.height,Math.ceil(camera.y+h/scale/2)+2);
    for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++)paintTile(String(world.grid.tiles[yy*world.grid.width+xx]),xx,yy);
    // B5 courier satchel: actual location in the authored map, not a HUD-only collect button.
    const story=world.episode;
    if(story&&!story.hasCourierBag&&!story.courierDelivered){
      const q=loc(story.courierBag.x,story.courierBag.y),pulse=.5+Math.sin(now*.004)*.5;
      ellipse('rgba(0,0,0,.35)',q.x,q.y+scale*.16,scale*.25,scale*.13);
      ctx.fillStyle='#775038';ctx.fillRect(q.x-scale*.19,q.y-scale*.22,scale*.38,scale*.38);
      ctx.fillStyle='#d4aa66';ctx.fillRect(q.x-scale*.13,q.y-scale*.26,scale*.25,scale*.08);
      ellipse('#edc77e',q.x,q.y-scale*.07,scale*.05,scale*.05);
      if(core.dist(world.player,story.courierBag)<3.2)
        text(core.dist(world.player,story.courierBag)<1.3?'E · zabierz sakwę':'ZAGINIONA SAKWA',q.x,q.y-scale*.52-pulse*2,'#f8dda2',Math.max(11,Math.round(scale*.2)));
    }
    // Genuine authored entrances. Show a named place, not marker spam.
    for(const entry of world.authored.entrances){
      const pos=loc(entry.x+.5,entry.y+.5);
      if(pos.x<-50||pos.x>w+50||pos.y<-50||pos.y>h+50)continue;
      ellipse('rgba(14,12,5,.52)',pos.x,pos.y+scale*.1,scale*.18,scale*.09);
      ellipse('#bb9f5d',pos.x,pos.y,scale*.08,scale*.06);
      if(core.dist(world.player,{x:entry.x+.5,y:entry.y+.5})<7)
        text(entry.name,pos.x,pos.y-scale*.53,'#eacb8b',Math.max(10,Math.round(scale*.21)));
    }
    function humanoid(p,role,name,isPlayer){
      const u=loc(p.x,p.y),z=scale*.25,shade='rgba(6,17,13,.46)';
      ellipse(shade,u.x,u.y+z*.91,z*.89,z*.37);
      if(isPlayer){
        const img=root.CoopegeB5Atlas?.warrior;
        if(img?.complete&&img.naturalWidth){
          const f=p.facing||{x:0,y:1};
          const direction=Math.abs(f.x)>Math.abs(f.y)?(f.x<0?1:2):(f.y<0?3:0);
          const frame=Math.floor(now/185)%4;
          ctx.imageSmoothingEnabled=false;
          ctx.drawImage(img,frame*80,direction*80,80,80,u.x-scale*.70,u.y-scale*.94,scale*1.40,scale*1.4);
          return;
        }
      }
      const tunic=isPlayer?'#c1af77':role==='healer'?'#69aca2':role==='worker'?'#d0aa64':'#ae8251';
      const coat=isPlayer?'#77634b':role==='healer'?'#37786d':role==='worker'?'#6e5444':'#7f573e';
      // Boots, cloak silhouette, tunic, distinct head and carried prop.
      fill('#443c35',u.x-z*.51,u.y+z*.49,z*.40,z*.48);fill('#443c35',u.x+z*.13,u.y+z*.49,z*.40,z*.48);
      ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(u.x-z*.87,u.y-z*.32);ctx.lineTo(u.x+z*.87,u.y-z*.32);ctx.lineTo(u.x+z*.67,u.y+z*.65);ctx.lineTo(u.x-z*.68,u.y+z*.65);ctx.fill();
      fill(tunic,u.x-z*.55,u.y-z*.47,z*1.10,z*.98);
      fill('rgba(255,228,165,.18)',u.x-z*.43,u.y-z*.37,z*.31,z*.63);
      fill('#4c382c',u.x-z*.55,u.y+z*.3,z*1.10,z*.14);
      ellipse('#c28c67',u.x,u.y-z*.82,z*.58,z*.56);
      ctx.fillStyle=isPlayer?'#53504b':'#513c31';ctx.beginPath();ctx.arc(u.x,u.y-z*.97,z*.59,Math.PI*.98,Math.PI*2.05);ctx.fill();
      fill('#302e2c',u.x-z*.34,u.y-z*.79,z*.16,z*.11);fill('#302e2c',u.x+z*.19,u.y-z*.79,z*.16,z*.11);
      if(isPlayer){
        const f=p.facing,tip={x:u.x+f.x*z*1.7,y:u.y+f.y*z*1.7};
        line('#f5d994',Math.max(3,scale*.065),u.x,u.y,tip.x,tip.y);
        ellipse('#ecd6a4',tip.x,tip.y,z*.11,z*.11);
        fill('#826749',u.x-z*.72,u.y-z*.1,z*.19,z*.68);
        if(p.attackCd>.42){
          ctx.strokeStyle='rgba(255,217,139,.64)';ctx.lineWidth=z*.36;
          ctx.beginPath();ctx.arc(u.x,u.y,z*1.65,-Math.PI*.32,Math.PI*.24);ctx.stroke();
        }
      }else{
        if(role==='worker')fill('#e8c27f',u.x-z*.4,u.y-z*.23,z*.8,z*.2);
        if(role==='healer'){fill('#e3e5cb',u.x-z*.08,u.y-z*.22,z*.17,z*.62);fill('#e3e5cb',u.x-z*.33,u.y+z*.03,z*.66,z*.17);}
        else ellipse('#e0be71',u.x+z*.64,u.y+z*.22,z*.23,z*.33);
        if(core.dist(world.player,p)<7)text(name,u.x,u.y-z*2.04,role==='healer'?'#a6e0d8':'#f1d297',Math.max(11,Math.round(scale*.21)));
      }
    }
    for(const n of world.authored.npcs)humanoid(n,n.role,n.name,false);
    const worker=world.worker;
    if(worker?.alive){
      humanoid(worker,'worker',worker.name,false);
      const q=loc(worker.x,worker.y);
      if(world.episode?.workerCarrying){
        fill('#a78249',q.x+scale*.11,q.y-scale*.32,scale*.32,scale*.24);
        line('#f2d395',Math.max(1,scale*.021),q.x+scale*.12,q.y-scale*.30,q.x+scale*.4,q.y-scale*.30);
      }
      if(worker.phase==='sheltering')
        label('Szczury — czekam!',q.x,q.y-scale*.85,'#f0ac90',Math.max(10,Math.round(scale*.17)));
      if(worker.hp<worker.maxHp){
        fill('#4a2620',q.x-scale*.35,q.y-scale*.70,scale*.70,scale*.07);
        fill('#e0a184',q.x-scale*.35,q.y-scale*.70,scale*.70*worker.hp/worker.maxHp,scale*.07);
      }
    }else if(worker){
      const q=loc(worker.x,worker.y);
      fill('#694c42',q.x-scale*.27,q.y-scale*.14,scale*.54,scale*.24);
      label('Tragarz upadł',q.x,q.y-scale*.5,'#e4b1a1',Math.max(10,Math.round(scale*.18)));
    }
    const c=world.cart,cp=loc(c.x,c.y),z=scale*.4;
    ellipse('rgba(5,12,9,.52)',cp.x,cp.y+z*.70,z*1.4,z*.55);
    fill('#3b3026',cp.x-z*1.07,cp.y-z*.70,z*2.14,z*1.68);
    fill('#906745',cp.x-z,cp.y-z*.88,z*2,z*1.65);
    fill('#b58a54',cp.x-z*.89,cp.y-z*.83,z*1.77,z*.19);
    for(let i=-1;i<=2;i++){fill(i%2===0?'#ad8050':'#8b643e',cp.x-z*.92,cp.y+z*i*.35,z*1.84,z*.12);}
    line('#d7af71',Math.max(2,scale*.045),cp.x-z*.84,cp.y-z*.82,cp.x-z*.84,cp.y+z*.65);
    line('#5b392a',Math.max(2,scale*.058),cp.x+z*.85,cp.y-z*.72,cp.x+z*.85,cp.y+z*.64);
    ellipse('#292828',cp.x-z*1.0,cp.y+z*.63,z*.28,z*.23);
    ellipse('#292828',cp.x+z*1.0,cp.y+z*.63,z*.28,z*.23);
    if(core.dist(world.player,c)<2)text('LPM: chwyć • WASD: pchaj',cp.x,cp.y-scale*.84,'#f4dba3',Math.max(10,Math.round(scale*.18)));
    if(dragTarget){const q=loc(dragTarget.x,dragTarget.y);line('rgba(242,200,120,.45)',Math.max(2,scale*.035),cp.x,cp.y,q.x,q.y);ellipse('#ecc988',q.x,q.y,scale*.06,scale*.06);}
    for(const r of world.rats){if(!r.alive)continue;
      const o=loc(r.x,r.y),z=scale*.24;
      const ratImg=root.CoopegeB5Atlas?.rat;
      if(ratImg?.complete&&ratImg.naturalWidth){
        const a=Math.floor(now/170+r.id.length)%4;
        ellipse('rgba(10,12,11,.35)',o.x,o.y+scale*.16,scale*.38,scale*.12);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(ratImg,a*64,0,64,64,o.x-scale*.56,o.y-scale*.62,scale*1.12,scale*1.12);
        if(r.hp<r.maxHp||r.alert>0){fill('rgba(18,15,17,.87)',o.x-z,o.y-z*1.55,z*2,z*.26);fill('#c67f5d',o.x-z,o.y-z*1.55,z*2*r.hp/r.maxHp,z*.26);}
        continue;
      }
      ellipse('rgba(10,12,11,.44)',o.x,o.y+z*.61,z*1.08,z*.41);
      line('#a07775',Math.max(2,scale*.035),o.x-z*.42,o.y+z*.1,o.x-z*1.55,o.y+z*.48);
      ellipse('#674b48',o.x,o.y,z*.84,z*.64);
      ellipse('#9d7773',o.x+z*.43,o.y-z*.10,z*.51,z*.46);
      ellipse('#ae8280',o.x-z*.36,o.y-z*.56,z*.25,z*.27);
      ellipse('#ae8280',o.x+z*.12,o.y-z*.54,z*.24,z*.25);
      ellipse('#ebd4bc',o.x+z*.62,o.y-z*.15,z*.11,z*.10);
      ellipse('#e5ad85',o.x+z*.84,o.y+z*.10,z*.12,z*.10);
      if(r.hp<r.maxHp||r.alert>0){fill('rgba(18,15,17,.87)',o.x-z,o.y-z*1.55,z*2,z*.26);fill('#c67f5d',o.x-z,o.y-z*1.55,z*2*r.hp/r.maxHp,z*.26);}
    }
    humanoid(world.player,null,null,true);
    if(story?.hasCourierBag&&!story.courierDelivered){
      const u=loc(world.player.x,world.player.y),z=scale*.19;
      fill('rgba(19,12,8,.8)',u.x+z*.32,u.y-z*.32,z*.95,z*.83);
      fill('#ad8052',u.x+z*.42,u.y-z*.29,z*.73,z*.64);
      line('#dfc28a',Math.max(2,scale*.032),u.x+z*.42,u.y-z*.28,u.x+z*1.16,u.y-z*.27);
    }
    // Vignette anchors world mood but never hides gameplay close to the player.
    const grad=ctx.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.20,w*.5,h*.5,Math.max(w,h)*.76);
    grad.addColorStop(0,'rgba(3,12,10,0)');grad.addColorStop(1,'rgba(4,10,11,.42)');fill(grad,0,0,w,h);
    // Small, consistent diegetic annotation instead of duplicated permanent title.
    if(world.player.y>92&&world.player.y<105){
      fill('rgba(16,27,23,.69)',16,18,220,30);
      text('TRAKT POD SREBRNĄ BRAMĄ',28,33,'#d9cba8',Math.max(10,Math.round(scale*.18)),'left');
    }
    hud.textContent=`ŻYCIE ${Math.round(world.player.hp)} / 100    ◆  ${world.player.coins} MONET    ◆  OPATRUNKI ${world.player.bandages}    ◆  OST. ZAPASY ${world.episode?.known?.merchantStock??'?'}    ◆  ZAGROŻENIE ${world.kills}/${world.episode?.legacyBounty.need??8}`;
    if(world.episode){
      const e=world.episode;
      const known=e.known||{},knownDelivered=known.delivered===true,knownCarrying=known.workerCarrying===true;
      document.getElementById('questTitle').textContent=knownDelivered?'Dostawa dotarła':e.hasCourierBag?'Powrót do Srebrnej Bramy':known.workerPhase==='fallen'?'Znaleziono rannego tragarza':knownCarrying?'Tragarz miał przy sobie ładunek':'Zagubiona dostawa';
      document.getElementById('questLine').textContent=knownDelivered?`Widziałeś kupca z dostawą. Ostatnio poznane zapasy: ${known.merchantStock}.`:e.hasCourierBag?'Niesiesz sakwę. Odłóż ją (Q) albo dostarcz osobiście.':known.workerPhase==='fallen'?'Znalazłeś tragarza, który upadł pod naporem szczurów. Ładunek trzeba odnaleźć.':knownCarrying?'Ostatnio widziałeś tragarza z sakwą. Nie znasz jego dalszych losów.':'Tragarz wyruszył z magazynu. Dalszy los dostawy poznasz, gdy sam sprawdzisz trakt lub wrócisz do kupca.';
      document.getElementById('bountyLine').textContent=e.verminBountyPaid?'Plaga pod murami — nagroda odebrana':`Plaga pod murami · ${world.kills}/${e.legacyBounty.need} szczurów · nagroda 60 monet / 2 opatrunki`;
      document.getElementById('questProgress').style.width=Math.min(100,100*world.kills/e.legacyBounty.need)+'%';
      document.getElementById('journalNote').textContent=e.notes[0]||'';
      drawMinimap();
    }
    meter.style.width=`${Math.max(0,world.player.energy)}%`;
    message.textContent=world.lastAction;
  }
  function label(text,x,y,color,font){ctx.font=`600 ${Math.max(10,font)}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineWidth=3;ctx.strokeStyle="rgba(2,9,8,.88)";ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
  function store(){try{localStorage.setItem(saveKey,JSON.stringify(core.save(world)));world.lastAction="Zapisano ten stan świata i pozycję wózka.";}catch(e){world.lastAction="Zapis niedostępny w tej przeglądarce."}}
  function load(){dragTarget=null;dragPointerId=null;try{const raw=localStorage.getItem(saveKey);if(!raw){world.lastAction="Brak zapisu w tym oknie.";return;}world=core.restore(source,JSON.parse(raw));camera={x:world.player.x,y:world.player.y};world.lastAction="Przywrócono świat wraz z przesuniętymi przedmiotami.";}catch(e){world.lastAction="Zapis jest niezgodny: "+e.message;}}
  function reset(){dragTarget=null;dragPointerId=null;world=core.create(source);camera={x:world.player.x,y:world.player.y};}
  function key(e,down){
   const k=e.code;
   if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(k))e.preventDefault();
   if(down&&e.repeat)return;
   if(down&&k==="KeyE")pending.interact=true;
   if(down&&k==="Space")pending.hit=true;
   if(down&&k==="KeyR")pending.bandage=true;
   if(down&&k==="KeyQ")pending.drop=true;
   if(down&&k==="KeyP")store();
   if(down&&k==="KeyL")load();
   if(down&&k==="KeyN")reset();
   if(down&&k==="Equal")zoom=Math.min(1.85,zoom*1.12);
   if(down&&k==="Minus")zoom=Math.max(.78,zoom/1.12);
   if(down)pressed.add(k);else pressed.delete(k);
  }
  function pointerWorld(e){
    const rect=canvas.getBoundingClientRect(),{w,h,scale}=size();
    const x=(e.clientX-rect.left)*w/rect.width;
    const y=(e.clientY-rect.top)*h/rect.height;
    return {x:camera.x+(x-w*.5)/scale,y:camera.y+(y-h*.5)/scale};
  }
  canvas.addEventListener("wheel",e=>{
    e.preventDefault();
    zoom=Math.max(.78,Math.min(1.85,zoom*(e.deltaY>0?.9:1.1)));
  },{passive:false});
  canvas.addEventListener("pointerdown",e=>{
    if(dragPointerId!==null||e.button!==0)return;
    const q=pointerWorld(e);
    if(core.dist(q,world.cart)>world.cart.radius+.18)return;
    if(core.dist(world.player,world.cart)>1.5)return;
    dragPointerId=e.pointerId;dragTarget=q;
    // Real pointer captures normally; synthetic automation or restricted hosts
    // may lack an active capture pointer. Keep interaction local in either case.
    try{canvas.setPointerCapture?.(e.pointerId);}catch{}
    e.preventDefault();
  });
  canvas.addEventListener("pointermove",e=>{
    if(dragPointerId===e.pointerId)dragTarget=pointerWorld(e);
  });
  function releaseDrag(e){
    if(dragPointerId!==e.pointerId)return;
    dragPointerId=null;dragTarget=null;
    if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener("pointerup",releaseDrag);
  canvas.addEventListener("pointercancel",releaseDrag);
  canvas.addEventListener("lostpointercapture",releaseDrag);
  document.addEventListener("keydown",e=>key(e,true));
  document.addEventListener("keyup",e=>key(e,false));
  window.addEventListener("blur",()=>{pressed.clear();dragTarget=null;dragPointerId=null;});
  function frame(now){
    if(stopped)return;
    const delta=last?Math.min(.08,(now-last)/1000):0;last=now;acc+=delta;
    const dx=(pressed.has("KeyD")||pressed.has("ArrowRight")?1:0)-(pressed.has("KeyA")||pressed.has("ArrowLeft")?1:0);
    const dy=(pressed.has("KeyS")||pressed.has("ArrowDown")?1:0)-(pressed.has("KeyW")||pressed.has("ArrowUp")?1:0);
    // Keep edge-triggered actions until a simulation tick actually consumes them.
    // Clearing on every render frame drops quick presses on high-refresh displays.
    while(acc>=1/60){
      core.step(world,{dx,dy,hit:pending.hit,interact:pending.interact,bandage:pending.bandage,drop:pending.drop,grab:dragTarget},1/60);
      acc-=1/60;
      pending={interact:false,hit:false,bandage:false,drop:false};
    }
    draw(now);animation=requestAnimationFrame(frame);
  }
  animation=requestAnimationFrame(frame);
  // Inspection is read-only and not an alternate method of moving the player.
  root.CoopegeB1Evidence=Object.freeze({
    inspect:()=>({tick:world.tick,x:world.player.x,y:world.player.y,hp:world.player.hp,coins:world.player.coins,
      kills:world.kills,cart:{x:world.cart.x,y:world.cart.y,vx:world.cart.vx,vy:world.cart.vy},rats:world.rats.filter(r=>r.alive).length,
      authoredNpcCount:world.authored.npcs.length,authoredEncounter:world.authored.group.label,
      episode:world.episode?{hasCourierBag:world.episode.hasCourierBag,workerCarrying:world.episode.workerCarrying,merchantStock:world.episode.merchantStock,known:{...world.episode.known},courierBag:{...world.episode.courierBag},courierDelivered:world.episode.courierDelivered,bountyPaid:world.episode.verminBountyPaid,notes:world.episode.notes.slice()}:null,
      worker:world.worker?{...world.worker}:null,
      message:world.lastAction}),
    save:store,load,reset
  });
  return ()=>{stopped=true;cancelAnimationFrame(animation);};
}
root.CoopegeB1View=Object.freeze({attach});
})(globalThis);
