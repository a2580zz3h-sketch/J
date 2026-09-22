const steps=[...document.querySelectorAll('.step')];
const dots=['d1','d2','d3','d4','d5'].map(id=>document.getElementById(id));
function goTo(n){
  steps.forEach(s=>s.classList.toggle('active', +s.dataset.step===n));
  dots.forEach((d,i)=>d.classList.toggle('on', i<n));
  if(n===4) launchFinal();
}
dots[0].classList.add('on');

/* step 1: candle clicks */
let clicks=0; const need=12;
const candle1=document.getElementById('candle1'), flame1=document.getElementById('flame1'), count=document.getElementById('count'), btn1=document.getElementById('btn1');
candle1.addEventListener('click',()=>{
  if(clicks>=need) return;
  clicks++;
  count.textContent=clicks+' / '+need;
  if(clicks===need){ flame1.classList.add('lit'); btn1.disabled=false; }
});
btn1.addEventListener('click',()=>goTo(2));

/* step 2: simon-style memory */
const tiles=[...document.querySelectorAll('.tile')];
const sequence=[1,3,0,2]; // indices into tiles
let userStep=0, playing=true;
function flashTile(i,cb){
  tiles[i].classList.add('flash');
  setTimeout(()=>{ tiles[i].classList.remove('flash'); cb&&cb(); },420);
}
function playSequence(){
  playing=true; userStep=0;
  document.getElementById('memHint').textContent='بصّ كويس...';
  let i=0;
  function step(){
    if(i>=sequence.length){ playing=false; document.getElementById('memHint').textContent='دلوقتي جربك، دوس بنفس الترتيب'; return; }
    flashTile(sequence[i],()=>{ i++; setTimeout(step,180); });
  }
  setTimeout(step,500);
}
tiles.forEach((t,i)=>t.addEventListener('click',()=>{
  if(playing) return;
  flashTile(i);
  if(sequence[userStep]===i){
    userStep++;
    document.getElementById('memErr').textContent='';
    if(userStep===sequence.length){ setTimeout(()=>goTo(3),400); }
  } else {
    document.getElementById('memErr').textContent='مش هو الترتيب، جرب تاني';
    setTimeout(playSequence,900);
  }
}));

/* step 3: word check */
document.getElementById('btn3').addEventListener('click',()=>{
  const v=document.getElementById('wordInput').value.trim();
  if(v.includes('عمر')){ goTo(4); }
  else{ document.getElementById('wordErr').textContent='لأ، فكر تاني :)'; }
});

/* step 4 -> step 5: video */
document.getElementById('btn4').addEventListener('click',()=>goTo(5));

/* observe step 2 activation to start sequence */
new MutationObserver(()=>{
  const s2=document.querySelector('.step[data-step="2"]');
  if(s2.classList.contains('active') && !s2.dataset.started){ s2.dataset.started='1'; playSequence(); }
}).observe(document.querySelector('.stage'),{subtree:true,attributes:true,attributeFilter:['class']});

/* final: light candles + confetti */
function launchFinal(){
  const fc=document.getElementById('fcandles');
  fc.innerHTML='';
  for(let i=0;i<5;i++){
    fc.innerHTML+='<div class="candle"><div class="body"></div><div class="flame lit" style="animation-delay:'+(i*0.13)+'s"></div></div>';
  }
  const conf=document.getElementById('confetti');
  conf.innerHTML='';
  const colors=['#f4b740','#ff6f59','#f6f1e7','#8fd3c7'];
  const shapes=['circle','square','triangle'];
  for(let i=0;i<40;i++){
    const s=document.createElement('span');
    const shape=shapes[Math.floor(Math.random()*shapes.length)];
    const c=colors[Math.floor(Math.random()*colors.length)];
    let style='left:'+(Math.random()*100)+'%; animation-delay:'+(Math.random()*0.8)+'s; animation-duration:'+(1.8+Math.random()*1.4)+'s;';
    if(shape==='circle') style+='width:8px;height:8px;border-radius:50%;background:'+c+';';
    else if(shape==='square') style+='width:8px;height:8px;background:'+c+';';
    else style+='width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid '+c+';';
    s.style.cssText=style;
    conf.appendChild(s);
  }
}
