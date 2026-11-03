import * as THREE from 'three';
import { ingredients, menu, initialStock, canCook, consumeRecipe, migrateStock, recipeText } from './economy.js';
import { decorateWorld, waterMaterial } from './scenery.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=s=>document.querySelector(s);
function fitStage(){const scale=Math.min(window.innerWidth/1600,window.innerHeight/900);const app=$('#app');app.style.transform=`scale(${scale})`;app.style.left=`${(window.innerWidth-1600*scale)/2}px`;app.style.top=`${(window.innerHeight-900*scale)/2}px`;}
window.addEventListener('resize',fitStage);window.visualViewport?.addEventListener('resize',fitStage);fitStage();
$('.help').textContent='USE + / − TO ZOOM · FIXED LANDSCAPE VIEW';

const initial=()=>({money:180,score:0,served:0,stock:initialStock(),menuVersion:2,upgrades:{fryer:0,tables:0,sign:0,chef:0},time:0});
let state;try{state=JSON.parse(localStorage.getItem('salty-catch-v1'));if(!state?.stock||!state?.upgrades)state=initial();}catch{state=initial();}
state.upgrades.chef ??= 0;
if(state.menuVersion!==2){const migrated=migrateStock(state.stock);state.stock=migrated.stock;state.money+=migrated.refund;state.menuVersion=2;localStorage.setItem('salty-catch-v1',JSON.stringify(state));}
let paused=false,tab='orders',orders=[],nextId=1,spawnTimer=0,sound=false;
const upgrades=[{key:'chef',name:'Hire a chef',icon:'👨‍🍳',desc:'Automatically cooks & serves orders. Ingredients required.',cost:150,max:1},{key:'fryer',name:'Golden fryer',icon:'♨',desc:'Serve orders faster · +$4 per level',cost:100},{key:'tables',name:'Seaside seating',icon:'🪑',desc:'Room for one more waiting customer',cost:120},{key:'sign',name:'Harbour reputation',icon:'✦',desc:'Earn +25% reputation per level',cost:160}];
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function save(){localStorage.setItem('salty-catch-v1',JSON.stringify(state));}
function affordable(d){return canCook(state.stock,d);}
function render(){
 $('#money').textContent='$'+state.money.toLocaleString();$('#score').textContent='★ '+state.score;$('#day').textContent=`Day ${1+Math.floor(state.time/180)} · ${String(9+Math.floor(state.time%180/20)).padStart(2,'0')}:${String(Math.floor(state.time%20*3)).padStart(2,'0')}`;
 $('#served').textContent=state.served+' happy customers';$('#order-count').textContent=orders.length;let level=1+Math.floor(state.score/100);$('.level').textContent=level;$('#progress-label').textContent=`${state.score%100} / 100 reputation to next level`;$('#progress').style.width=state.score%100+'%';$('footer strong').textContent=level>3?'Harbour favourite':level>1?'Rising local star':'Seaside beginner';
 $('#chef-status').textContent=state.upgrades.chef?(paused?'Chef · on break':orders.some(o=>o.cooking)?'Chef · cooking':orders.some(o=>affordable(o.dish))?'Chef · ready':'Chef · waiting for orders or ingredients'):'Kitchen · manual service';
 renderPanel($('#panel'),tab);renderPanel($('#upgrades-panel'),'upgrades');
}
function renderPanel(panel,tab){
 if(tab==='orders'){panel.innerHTML=`<div class="section-title"><strong>At your counter</strong><small>${orders.length} / ${3+state.upgrades.tables} WAITING</small></div>`+(orders.length?orders.map(o=>`<article class="order"><div class="order-top"><span class="avatar">${o.avatar}</span><div><strong>${o.name}</strong><small>${o.cooking?'Cooking up something good…':'Ready for a seaside bite'}</small></div><span class="reward">+$${o.dish.price+state.upgrades.fryer*4}</span></div><div class="dish-row"><span class="dish-art dish-art-0" role="img" aria-label="${o.dish.name}"></span><span>${o.dish.name}<small class="recipe-needs">${recipeText(o.dish)}</small></span></div><button class="serve" data-serve="${o.id}" ${o.cooking||!affordable(o.dish)||paused?'disabled':''}>${o.cooking?'Cooking…':!affordable(o.dish)?'Restock ingredients':'Prepare & serve →'}</button><div class="patience"><i style="width:${o.patience/75*100}%"></i></div></article>`).join(''):'<p class="empty">The tide is bringing new faces.<br>Your next customer will arrive shortly.</p>');}
 panel.className=tab==='pantry'?'pantry-panel':tab==='recipes'?'recipes-panel':'';
 if(tab==='recipes')panel.innerHTML='<div class="section-title"><strong>Our menu</strong><small>10 RECIPES</small></div>'+menu.map(d=>`<article class="recipe-card"><div><strong>${d.name}</strong><small>${recipeText(d)}</small></div><span>$${d.price}</span></article>`).join('');
 if(tab==='pantry')panel.innerHTML='<div class="section-title"><strong>Fresh from the market</strong><small>BUY INGREDIENTS</small></div>'+ingredients.map(i=>`<article class="item"><span class="emoji">${i.icon}</span><div><strong>${i.name}</strong><small class="stock">${state.stock[i.key]} in stock</small><small>+${i.qty} for $${i.cost}</small></div><button class="buy" data-buy="${i.key}" ${state.money<i.cost||paused?'disabled':''}>Buy</button></article>`).join('')+'<p class="empty">Each recipe uses 1 unit of each listed ingredient. Explore all 10 dishes in Recipes.</p>';
 if(tab==='upgrades')panel.innerHTML='<div class="section-title"><strong>Grow your little empire</strong><small>MAKE IT YOURS</small></div>'+upgrades.map(u=>{let n=state.upgrades[u.key],max=u.max??3,cost=u.cost*(n+1);return `<article class="item"><span class="emoji">${u.icon}</span><div><strong>${u.name} · ${n}/${max}</strong><small>${u.desc}</small><small>${n===max?(u.key==='chef'?'Chef hired · automatic service':'Fully upgraded'):'$'+cost}</small></div><button class="buy" data-upgrade="${u.key}" ${n===max||state.money<cost||paused?'disabled':''}>${n===max?'✓':u.key==='chef'?'Hire':'↗'}</button></article>`;}).join('');
}
$('main').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.serve){let o=orders.find(o=>o.id===+b.dataset.serve);if(!startCooking(o))return;render();}if(b.dataset.buy){let i=ingredients.find(i=>i.key===b.dataset.buy);if(state.money<i.cost)return;state.money-=i.cost;state.stock[i.key]+=i.qty;toast(`Fresh delivery: +${i.qty} ${i.name.toLowerCase()}`);save();render();}if(b.dataset.upgrade){let u=upgrades.find(u=>u.key===b.dataset.upgrade),cost=u.cost*(state.upgrades[u.key]+1);if(paused||state.upgrades[u.key]>=(u.max??3)||state.money<cost)return;state.money-=cost;state.upgrades[u.key]++;toast(u.key==='chef'?'Chef hired! Your kitchen now runs automatically.':u.name+' upgraded!');decorateUpgrades();save();render();}});
function startCooking(o){
 if(paused||!o||o.cooking||!affordable(o.dish))return false;
 if(!consumeRecipe(state.stock,o.dish))return false;
 o.cooking=Math.max(1.2,4-state.upgrades.fryer*.8);save();return true;
}
function togglePopup(kind,force){const popup=$(`#${kind}-popup`),button=$(`#${kind}-toggle`);const open=force??popup.hidden;popup.hidden=!open;button.setAttribute('aria-expanded',String(open));button.classList.toggle('active',open);if(open)popup.querySelector('.close-popup').focus();else button.focus();}
$('#orders-toggle').onclick=()=>togglePopup('orders');$('#upgrades-toggle').onclick=()=>togglePopup('upgrades');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>togglePopup(b.dataset.close,false));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){for(const kind of ['orders','upgrades'])if(!$(`#${kind}-popup`).hidden)togglePopup(kind,false);}});
installPopupDismiss();
function installPopupDismiss(){ $('#scene').addEventListener('click',()=>{for(const kind of ['orders','upgrades'])if(!$(`#${kind}-popup`).hidden)togglePopup(kind,false);}); }
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));render();});
$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'▶':'Ⅱ';toast(paused?'Taking a little break.':'Welcome back, captain!');render();};$('#save').onclick=()=>{save();toast('Your seaside dream is saved.');};$('#reset').onclick=()=>{if(confirm('Start a new restaurant? Your saved progress will be reset.')){state=initial();orders.forEach(o=>scene.remove(o.person));orders=[];spawnTimer=0;decorateUpgrades();save();render();}};
$('#sound').onclick=()=>{sound=!sound;$('#sound').style.background=sound?'#e3ead2':'transparent';toast(sound?'Kitchen sounds on':'Kitchen sounds off');};
function ding(){if(!sound)return;const a=new AudioContext(),osc=a.createOscillator(),g=a.createGain();osc.connect(g);g.connect(a.destination);osc.frequency.setValueAtTime(660,a.currentTime);osc.frequency.setValueAtTime(880,a.currentTime+.1);g.gain.setValueAtTime(.08,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.4);osc.start();osc.stop(a.currentTime+.4);osc.onended=()=>a.close();}
const canvas=$('#scene'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.setClearColor('#8ed5de');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const scene=new THREE.Scene();scene.fog=new THREE.Fog('#9bdce1',38,80);const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(18,20,24);const controls=new OrbitControls(camera,canvas);controls.target.set(0,0,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2.5;controls.minDistance=14;controls.maxDistance=43;controls.enablePan=false;controls.enableRotate=false;controls.enableZoom=false;controls.update();
scene.add(new THREE.HemisphereLight('#fff5df','#6c9e88',1.85));const sun=new THREE.DirectionalLight('#fff0cd',2.8);sun.position.set(-8,20,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.radius=4;sun.shadow.blurSamples=8;scene.add(sun);
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.72});const mats={};function material(c){return mats[c]??(mats[c]=mat(c));}
const geometries=new Map();
function box(w,h,d,c,x,y,z,parent=scene){const key=`box:${w},${h},${d}`;if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,3,Math.min(.16,Math.min(w,h,d)*.28)));const m=new THREE.Mesh(geometries.get(key),material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(r,c,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),material(c));m.position.set(x,y,z);m.castShadow=r>=.14;parent.add(m);return m;}
function cylinder(r1,r2,h,c,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const sea=box(200,.2,200,'#7ccbd6',0,-.55,0);sea.material=waterMaterial();box(21,.7,17,'#ead5a1',0,-.25,0);box(19.8,.2,15.8,'#82b951',0,.18,0);box(20,.14,3,'#e9d9bb',0,.32,4.5);box(3,.13,15,'#e9d9bb',-6,.33,0);
// Waterfront boardwalk, pier and nautical railings.
box(21,.35,2,'#d4af7b',0,.15,8);for(let i=0;i<39;i++)box(.035,.03,2,'#b49569',-10+i*.54,.34,8);box(3,.3,6,'#c7a275',5,-.02,11);for(let i=0;i<16;i++)box(3,.025,.035,'#a9835c',5,.15,8.3+i*.35);for(let x=-10;x<=10;x+=2){cylinder(.08,.09,1.1,'#fff5dd',x,.7,8.8);if(x<10)box(1.9,.06,.06,'#fff5dd',x+1,1,8.8);}for(const x of [3.6,6.4])for(const z of [9,11,13.5])cylinder(.12,.12,1.1,'#836f56',x,.18,z);
// Main shop, pitched terracotta roof and striped awning.
box(6,3.1,4.7,'#fff0cf',.5,1.9,-2.5);box(6.3,.25,4.9,'#40736c',.5,.55,-2.5);for(let i=0;i<13;i++){let roof=box(.52,.18,3.1,i%2?'#cb6553':'#db7860',-2.6+i*.52,3.95,-3.65);roof.rotation.x=-.5;roof=box(.52,.18,3.1,i%2?'#cb6553':'#db7860',-2.6+i*.52,3.95,-1.1);roof.rotation.x=.5;}box(6.8,.16,.18,'#b65243',.5,4.68,-2.4);box(1,.9,.9,'#f4deb4',2.4,4.3,-3.6);box(1.15,.15,1.05,'#d27a61',2.4,4.8,-3.6);
box(4.7,1.35,.14,'#335a55',.5,2.05,-.08);box(4.4,1.05,.15,'#a1d4ca',.5,2.08,.01);for(let x=-1.6;x<3;x+=1.1)box(.06,1.2,.2,'#fff6d8',x,2.1,.08);box(5,.2,.75,'#bc885b',.5,1.35,.25);for(let i=0;i<10;i++){let a=box(.56,.12,1.45,i%2?'#fff3d7':'#de775d',-2.02+i*.56,3.05,.5);a.rotation.x=.16;box(.56,.19,.12,i%2?'#fff3d7':'#de775d',-2.02+i*.56,2.85,1.2);const scallop=sphere(.28,i%2?'#fff3d7':'#de775d',-2.02+i*.56,2.77,1.2);scallop.scale.set(1,.48,.24);}for(const x of [-2.2,3.2])cylinder(.055,.055,2.6,'#e8e0b9',x,1.65,1.1);
box(.95,1.9,.12,'#448c80',-2.48,1.6,-.05);sphere(.06,'#ffe3a0',-2.2,1.6,.07);box(.8,1,.1,'#8cc5b9',3.51,2.25,-2.4).rotation.y=Math.PI/2;
function sign(text,w,h,x,y,z){let c=document.createElement('canvas');c.width=1024;c.height=256;let ctx=c.getContext('2d');ctx.fillStyle='#285c54';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#f3dda3';ctx.lineWidth=8;ctx.strokeRect(15,15,994,226);ctx.fillStyle='#fff1c8';ctx.font='bold 76px Georgia';ctx.textAlign='center';ctx.fillText(text,512,155);let m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c),roughness:1}));m.position.set(x,y,z);scene.add(m);return m;}
// Framed restaurant fascia with a crisp, original maritime brand mark.
{
 const c=document.createElement('canvas');c.width=2048;c.height=512;
 const ctx=c.getContext('2d');
 ctx.fillStyle='#153e3b';ctx.fillRect(0,0,2048,512);
 ctx.strokeStyle='#d7b777';ctx.lineWidth=5;ctx.strokeRect(22,22,2004,468);
 ctx.strokeStyle='#6d8975';ctx.lineWidth=2;ctx.strokeRect(37,37,1974,438);
 // Circular fish emblem, drawn as vectors so it stays sharp on zoom.
 ctx.save();ctx.translate(240,256);ctx.strokeStyle='#e8cd93';ctx.lineWidth=6;
 ctx.beginPath();ctx.arc(0,0,137,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,122,0,Math.PI*2);ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#e8cd93';ctx.beginPath();ctx.ellipse(-12,-12,75,35,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.moveTo(48,-12);ctx.lineTo(94,-50);ctx.lineTo(94,26);ctx.closePath();ctx.fill();
 ctx.fillStyle='#153e3b';ctx.beginPath();ctx.arc(-57,-20,7,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#e8cd93';ctx.lineWidth=4;
 for(let row=0;row<2;row++){ctx.beginPath();for(let i=0;i<=120;i++){const x=-60+i,y=53+row*19+Math.sin(i/120*Math.PI*3)*5;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}ctx.restore();
 ctx.fillStyle='#f8edd2';ctx.textAlign='center';ctx.font='bold 116px Georgia';ctx.fillText('THE SALTY CATCH',1170,253,1550);
 ctx.fillStyle='#d7b777';ctx.font='500 40px Arial';ctx.fillText('F I S H   &   C H I P S',1170,337);
 ctx.strokeStyle='#b59b68';ctx.lineWidth=2;
 for(const x of [660,1440]){ctx.beginPath();ctx.moveTo(x,321);ctx.lineTo(x+230,321);ctx.stroke();}
 box(5.55,1.17,.18,'#9a7746',.5,3.65,.13);
 box(5.4,1.04,.06,'#153e3b',.5,3.65,.24);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const fascia=new THREE.Mesh(new THREE.PlaneGeometry(5.28,.98),new THREE.MeshBasicMaterial({map:texture}));
 fascia.position.set(.5,3.65,.28);scene.add(fascia);
 for(const x of [-2.15,3.15]){sphere(.035,'#e8cd93',x,4.14,.29);sphere(.035,'#e8cd93',x,3.16,.29);}
}
// Outdoor dining.
function table(x,z,color='#e8ae61'){cylinder(.78,.78,.12,'#f4e2b7',x,1.02,z);cylinder(.09,.14,.7,'#7d7861',x,.64,z);for(const dx of [-1.08,1.08]){box(.65,.12,.65,'#fff2cc',x+dx,.65,z);box(.65,.65,.12,'#74a7a0',x+dx,.98,z-.3);for(const a of [-.22,.22])box(.06,.5,.06,'#857a5e',x+dx+a,.37,z);}cylinder(.035,.035,2.9,'#e7ddbc',x,1.8,z);const canopy=cylinder(0,1.45,.6,color,x,3.05,z);const profile=[new THREE.Vector2(0,.65),new THREE.Vector2(.22,.63),new THREE.Vector2(.55,.54),new THREE.Vector2(.95,.35),new THREE.Vector2(1.26,.12),new THREE.Vector2(1.45,0)];
canopy.geometry=new THREE.LatheGeometry(profile.slice().reverse(),48);canopy.material=[material(color),material('#fff1cf')];
canopy.geometry.clearGroups();for(let k=0;k<48;k++)canopy.geometry.addGroup(k*30,30,Math.floor(k/6)%2);cylinder(.08,.08,.12,'#fff0c6',x,3.44,z);cylinder(.16,.19,.12,'#fff4db',x+.35,1.15,z);}
table(6,1.6,'#e9ad60');table(6,-3,'#e87563');table(-2.8,5,'#73b7ab');
// The same illustrated dishes are also served on the outdoor tables.
new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}images/food-plates.png`,foodTexture=>{
 foodTexture.colorSpace=THREE.SRGBColorSpace;
 [[6,1.6],[6,-3],[-2.8,5]].forEach(([x,z],index)=>{
  const texture=foodTexture.clone();texture.repeat.set(1/3,1);texture.offset.set(0,0);texture.needsUpdate=true;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.05),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  plate.rotation.x=-Math.PI/2;plate.position.set(x,1.095,z);scene.add(plate);
 });
});

const extra=new THREE.Group();scene.add(extra);function decorateUpgrades(){extra.clear();if(state.upgrades.chef){cylinder(.22,.25,.65,'#fff9e7',.7,1.85,.15,extra);sphere(.18,'#edc6a0',.7,2.32,.15,extra);cylinder(.21,.18,.2,'#fffef6',.7,2.55,.15,extra);sphere(.22,'#fffef6',.7,2.7,.15,extra);}for(let i=0;i<state.upgrades.tables;i++){const x=-2+i*2.4;box(1.4,.15,.7,'#f2d99c',x,.95,-6.3,extra);for(const dx of [-.5,.5])box(.08,.7,.08,'#826e4f',x+dx,.6,-6.3,extra);}for(let i=0;i<state.upgrades.fryer;i++)box(.5,.4,.55,'#e2bc59',-1+i*.7,1.64,.25,extra);for(let i=0;i<state.upgrades.sign;i++)sphere(.18,'#ffd16b',-1+i*1.4,3.65,.2,extra);}
function tree(x,z,s=1){
 cylinder(.14*s,.25*s,1.8*s,'#97704b',x,1.1*s,z);
 const branch=cylinder(.08*s,.12*s,.8*s,'#97704b',x+.18*s,1.65*s,z);branch.rotation.z=-.5;
 for(let i=0;i<9;i++){const a=i*2.4,r=i%3*.24*s;const crown=sphere((.62+i%3*.09)*s,['#539747','#6bac4c','#81bc57'][i%3],x+Math.cos(a)*r, (2.18+Math.sin(i*1.7)*.32)*s,z+Math.sin(a)*r);crown.scale.set(1,1.12,.93);}
 for(let i=0;i<9;i++){const a=i*2.4;sphere(.11*s,i%2?'#ecaa52':'#e38264',x+Math.cos(a)*.69*s,(2.1+Math.sin(i)*.35)*s,z+Math.sin(a)*.69*s);}
}

for(const p of [[-8,-5,1.1],[-8,0,.8],[-3,-6,1],[8,-6,1.1],[9,4,.8],[-9,6,.7]])tree(...p);
function planter(x,z,w=1.3){box(w,.4,.6,'#c08a61',x,.55,z);for(let i=0;i<6;i++){sphere(.2,'#5c985d',x-w/2+.15+i*w/6,.87,z);sphere(.09,i%2?'#fff0b2':'#ed8d88',x-w/2+.15+i*w/6,1.03,z);}}
for(const p of [[-3.4,1.6],[3.5,1.6],[8,5.8],[-8,2.5]])planter(...p);
// Crates, market produce, menu board and fences.
for(let i=0;i<3;i++){box(.8,.6,.8,'#b8905e',-4, .7+i*.15,-1.4-i*.8);for(let j=0;j<4;j++)sphere(.14,i%2?'#e5bc69':'#a4c864',-4+(j%2)*.3-.15,1.05+i*.15,-1.4-i*.8+Math.floor(j/2)*.25-.1);}
let board=box(.9,1.2,.12,'#375b4b',-3.5,1.15,2);board.rotation.z=-.08;sign('FISH & CHIPS',.82,.3,-3.5,1.43,2.08);for(let i=0;i<3;i++)box(.55,.035,.02,'#eadca6',-3.5,1.15-i*.13,2.08);for(const dx of [-.35,.35])box(.08,.6,.1,'#ad8a5c',-3.5+dx,.5,2);
for(let x=-9;x<9;x+=1.4){box(.12,.95,.12,'#fff2d2',x,.85,-7.3);box(1.35,.1,.08,'#fff2d2',x+.6,1.05,-7.3);box(1.35,.1,.08,'#fff2d2',x+.6,.65,-7.3);}
for(const [x,z] of [[-5,3],[8,3]]){cylinder(.055,.07,3,'#42645d',x,1.9,z);sphere(.23,'#fff0b3',x,3.5,z);box(.55,.08,.55,'#42645d',x,3.7,z);}
for(let i=0;i<45;i++){let x=Math.sin(i*8.3)*9,z=Math.cos(i*12.7)*6.8;if((x>-4&&x<4)||(z>2.7&&z<6))continue;for(let j=0;j<3;j++)sphere(.065,['#ffe7a6','#e99d9a','#f7f2cf'][j],x+j*.13,.43,z);}
// Animated water glints and a tiny fishing boat.
const glints=[];for(let i=0;i<65;i++){let x=Math.sin(i*33)*30,z=10+Math.cos(i*14)*18;if(Math.abs(x)<11&&z<14)continue;glints.push(box(.3+i%3*.2,.015,.055,'#b4e4e4',x,-.4,z));}const boat=new THREE.Group();scene.add(boat);boat.position.set(-8,0,13);box(2,.4,1,'#f6e5c6',0,0,0,boat);box(1.8,.15,.8,'#d78965',0,.25,0,boat);box(.6,.6,.75,'#fff1d2',-.3,.6,0,boat);cylinder(.035,.035,1.8,'#746c55',.5,1,0,boat);
const peopleColors=['#d4755d','#619d9a','#e3b65e','#7c8cac','#b38fbd'];function person(color){
 const g=new THREE.Group();
 const torso=sphere(.28,color,0,.83,0,g);torso.scale.set(.95,1.25,.72);
 cylinder(.09,.1,.15,'#edbd96',0,1.14,0,g);
 const head=sphere(.225,'#f0c49d',0,1.37,0,g);head.scale.set(.94,1.08,.95);
 const hair=sphere(.23,'#76533e',0,1.49,-.035,g);hair.scale.set(1,.65,1);
 sphere(.057,'#f0c49d',0,1.36,.205,g);
 for(const dx of [-.078,.078]){sphere(.025,'#394d43',dx,1.405,.196,g);sphere(.009,'#fff8e8',dx-.005,1.414,.216,g);sphere(.036,'#e8a891',dx*1.5,1.33,.18,g);}
 for(const dx of [-.13,.13]){const leg=cylinder(.075,.09,.43,'#4a6870',dx,.36,0,g);box(.17,.12,.28,'#695440',dx,.12,.055,g);const arm=cylinder(.065,.08,.4,color,dx*2.05,.85,0,g);arm.rotation.z=dx>0?-.15:.15;sphere(.075,'#f0c49d',dx*2.25,.64,.015,g);}
 scene.add(g);return g;
}

const walkers=[];for(let i=0;i<7;i++){let p=person(peopleColors[i%5]);p.position.set(-9+i*2.7,.4,4.5);walkers.push({p,speed:.3+i*.04,dir:i%2?1:-1});}
function addOrder(){if(orders.length>=3+state.upgrades.tables)return;const n=nextId++,dish=menu[Math.floor(Math.random()*menu.length)],names=['Oliver','Amelia','George','Isla','Harry','Sophie','Noah','Mia'];const p=person(peopleColors[n%5]);p.position.set(-6,.4,3.5);orders.push({id:n,name:names[n%8],avatar:['👨🏻','👩🏽','👨🏼‍🦱','👩🏻‍🦰'][n%4],dish,patience:75,cooking:0,person:p});render();}
const animateScenery=decorateWorld({scene,box,sphere,cylinder,material});
addOrder();addOrder();decorateUpgrades();render();
$('#zoom-in').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(.87).add(controls.target);};$('#zoom-out').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(1.15).add(controls.target);};$('#rotate').onclick=()=>{let p=camera.position.clone().sub(controls.target);p.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4);camera.position.copy(p.add(controls.target));};
const resize=()=>{let w=canvas.parentElement.clientWidth,h=canvas.parentElement.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(canvas.parentElement);resize();
let prev=performance.now(),ui=0,autosave=0;function animate(now){requestAnimationFrame(animate);let dt=Math.min((now-prev)/1000,.25);prev=now;if(!paused){state.time+=dt;animateScenery(state.time);spawnTimer+=dt;ui+=dt;autosave+=dt;if(spawnTimer>10){spawnTimer=0;addOrder();}if(state.upgrades.chef&&!orders.some(o=>o.cooking)){const next=orders.find(o=>!o.cooking&&affordable(o.dish));if(startCooking(next))render();}for(let i=orders.length-1;i>=0;i--){const o=orders[i],target=new THREE.Vector3(-1.4+i*.85,.4,1.8);o.person.position.lerp(target,dt*1.5);if(o.cooking){o.cooking-=dt;if(o.cooking<=0){let pay=o.dish.price+state.upgrades.fryer*4;state.money+=pay;state.score+=Math.round(o.dish.rep*(1+state.upgrades.sign*.25));state.served++;scene.remove(o.person);orders.splice(i,1);ding();toast(`Delicious! +$${pay} · One more happy customer`);save();render();}}else{o.patience-=dt;if(o.patience<=0){scene.remove(o.person);orders.splice(i,1);state.score=Math.max(0,state.score-5);toast('A customer left. Keep an eye on the counter!');render();}}}walkers.forEach(w=>{w.p.position.x+=w.speed*dt*w.dir;if(Math.abs(w.p.position.x)>10)w.dir*=-1;w.p.rotation.y=w.dir>0?Math.PI/2:-Math.PI/2;w.p.position.y=.4+Math.sin(now*.005+w.speed*30)*.025;});boat.position.y=Math.sin(now*.001)*.07;boat.rotation.z=Math.sin(now*.0008)*.025;if(ui>1){ui=0;render();}if(autosave>10){autosave=0;save();}}glints.forEach((g,i)=>g.scale.x=.7+Math.sin(now*.001+i)*.3);controls.update();renderer.render(scene,camera);}requestAnimationFrame(animate);window.addEventListener('beforeunload',save);
