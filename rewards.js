// Presentation only: balances are credited immediately by the game loop.
export function animateReward(amount, origin) {
  const stage=document.querySelector('#app');
  const bounds=stage.getBoundingClientRect(),scale=bounds.width/1600;
  const local=point=>({x:(point.x-bounds.left)/scale,y:(point.y-bounds.top)/scale});
  const start=local(origin);
  let layer=document.querySelector('#reward-layer');
  if(!layer){layer=document.createElement('div');layer.id='reward-layer';layer.setAttribute('aria-hidden','true');stage.append(layer);}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const summary=document.createElement('div');summary.className='sale-reward';
  summary.textContent=`+$${amount}  ·  +${amount} ★`;
  summary.style.left=`${start.x}px`;summary.style.top=`${start.y}px`;layer.append(summary);
  const summaryAnimation=summary.animate(reduced?[{opacity:1},{opacity:0}]:[
    {opacity:0,transform:'translate(-50%, 0) scale(.8)'},
    {opacity:1,transform:'translate(-50%, -16px) scale(1.06)',offset:.15},
    {opacity:1,transform:'translate(-50%, -30px) scale(1)',offset:.65},
    {opacity:0,transform:'translate(-50%, -52px) scale(.96)'}
  ],{duration:reduced?700:1500,easing:'ease-out'});
  summaryAnimation.finished.catch(()=>{}).finally(()=>summary.remove());
  if(reduced)return;
  for(const [selector,symbol,type] of [['#money','$','coin'],['#score','★','star']]){
    const target=document.querySelector(selector),r=target.getBoundingClientRect();
    const end=local({x:r.left+r.width/2,y:r.top+r.height/2});
    for(let i=0;i<4;i++){
      const particle=document.createElement('span');particle.className=`reward-particle ${type}`;particle.textContent=symbol;
      layer.append(particle);
      const bend=(type==='coin'?-1:1)*(35+i*12);
      const animation=particle.animate([
        {opacity:0,transform:`translate(${start.x-15}px,${start.y-15}px) scale(.5)`},
        {opacity:1,transform:`translate(${start.x+bend-15}px,${start.y-55-i*8}px) scale(1.15)`,offset:.2},
        {opacity:1,transform:`translate(${end.x-15}px,${end.y-15}px) scale(.7)`,offset:.9},
        {opacity:0,transform:`translate(${end.x-15}px,${end.y-15}px) scale(.35)`}
      ],{duration:1050,delay:i*90,easing:'cubic-bezier(.25,.6,.4,1)',fill:'both'});
      animation.finished.then(()=>{
        if(i===3)target.animate([{transform:'scale(1)',color:'#233c37'},{transform:'scale(1.22)',color:type==='coin'?'#b88826':'#6d983d'},{transform:'scale(1)',color:'#233c37'}],{duration:450});
      }).catch(()=>{}).finally(()=>particle.remove());
    }
  }
}
