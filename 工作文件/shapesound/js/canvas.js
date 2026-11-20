"use strict";
/* 形声 · 画布、画线/橡皮、实时演奏、速度、乐器面板、显示模式、Pages 时间线 */
// ---------------- 画布 ----------------
const cv=$('cv'), g2d=cv.getContext('2d');
let W=0,H=0,DPR=1;
const PAD={l:40,r:16,t:18,b:18};
function resize(){ const r=cv.getBoundingClientRect(); DPR=window.devicePixelRatio||1; W=r.width; H=r.height; cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR); }
new ResizeObserver(resize).observe(cv);
const gx=x=>PAD.l+x*(W-PAD.l-PAD.r), gy=y=>PAD.t+y*(H-PAD.t-PAD.b);
const nx=px=>clamp((px-PAD.l)/(W-PAD.l-PAD.r),0,1), ny=py=>clamp((py-PAD.t)/(H-PAD.t-PAD.b),0,1);
const inkColor=i=>PALETTES[S.palette][i];
let C={};
function readColors(){ const cs=getComputedStyle(document.body), v=k=>cs.getPropertyValue(k).trim();
  C={line:v('--line'),line2:v('--line2'),line3:v('--line3'),muted:v('--muted'),ink:v('--ink'),accent:v('--accent'),paper:v('--paper')}; }

let playheadX=-1, lastPhase=-1;
function strokeYsAt(s,x){ // 这条线在横坐标 x 处的所有纵坐标（用于在播放头上画交点）
  const P=s.pts, ys=[];
  if(P.length===1){ if(Math.abs(P[0][0]-x)<.006) ys.push(P[0][1]); return ys; }
  for(let k=1;k<P.length;k++){ const [x0,y0]=P[k-1],[x1,y1]=P[k];
    if((x0<=x&&x<=x1)||(x1<=x&&x<=x0)){ ys.push(x1===x0?y0:y0+(y1-y0)*(x-x0)/(x1-x0)); } }
  return ys;
}
function draw(){
  requestAnimationFrame(draw);
  if(!W) return;
  const g=g2d; g.setTransform(DPR,0,0,DPR,0,0); g.clearRect(0,0,W,H);
  const R=rows(), n=R.length, N=stepsPerLoop(), spb=stepsPerBar(), beat=stepsPerBeat(), now=ctx?ctx.currentTime:0, tNow=performance.now();

  playheadX=-1;
  if(playing && stepQueue.length){
    while(stepQueue.length>1 && stepQueue[1].time<=now) stepQueue.shift();
    const cur=stepQueue[0];
    if(cur.time<=now){
      playheadX=(cur.step+clamp((now-cur.time)/stepDur(),0,1))/N; lastPhase=playheadX;
      const b=Math.floor(cur.step/beat)%4; document.querySelectorAll('.beat').forEach((el,k)=>el.classList.toggle('on',k===b));
    }
  }
  while(pendingRipples.length && pendingRipples[0].time<=now){ const p=pendingRipples.shift(); ripples.push({...p,born:tNow}); rowFlash.set(p.row,tNow); }

  if(S.mode===3){ updateCast(); return; }
  if(S.mode===2){ drawPixels(g,tNow); return; }

  // 网格（默认隐藏，像一张白纸）
  if(S.grid){
    for(let i=0;i<=N;i++){ const x=gx(i/N); g.strokeStyle=i%spb===0?C.line3:(i%beat===0?C.line2:C.line); g.lineWidth=i%spb===0?1.3:1;
      g.beginPath(); g.moveTo(x,PAD.t-6); g.lineTo(x,H-PAD.b+6); g.stroke(); }
    const gap=(H-PAD.t-PAD.b)/(n-1);
    g.textBaseline='middle'; g.textAlign='right';
    for(let i=0;i<n;i++){
      const y=gy(1-i/(n-1)), tonic=(R[i]-S.key)%12===0, fl=rowFlash.get(i), hot=fl&&tNow-fl<220;
      g.strokeStyle=tonic?C.line3:C.line2; g.lineWidth=tonic?1.3:1; g.beginPath(); g.moveTo(PAD.l,y); g.lineTo(W-PAD.r,y); g.stroke();
      if(gap>=12||tonic||hot||i%2===0){ g.fillStyle=hot?C.accent:(tonic?C.ink:C.muted);
        g.font=(tonic||hot?'600 ':'')+'10px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif'; g.fillText(noteName(R[i]),PAD.l-8,y); }
    }
  } else {
    // 不显示网格时，只在小节处画一条很淡的分隔
    for(let b=1;b<BARS;b++){ const x=gx(b/BARS); g.strokeStyle=C.line; g.lineWidth=1; g.setLineDash([2,5]); g.beginPath(); g.moveTo(x,PAD.t); g.lineTo(x,H-PAD.b); g.stroke(); g.setLineDash([]); }
  }

  // 线条（时间线打开时，其他时间线正在播的页淡淡地显示在下面）
  g.lineCap='round'; g.lineJoin='round';
  const inkLists=[[strokes,1]]; if(tracks.length>1) tracks.forEach((t,k)=>{ if(k!==trackIndex) inkLists.unshift([t.pages[t.pageIndex].strokes,.28]); });
  for(const [list,fade] of inkLists) for(const s of list){
    g.globalAlpha=fade;
    const col=inkColor(s.ink); g.strokeStyle=col; g.fillStyle=col; g.lineWidth=3.5;
    if(S.paper==='photo'){ g.shadowColor='rgba(255,255,255,.9)'; g.shadowBlur=4; }
    const P=s.pts;
    if(P.length===1){ g.beginPath(); g.arc(gx(P[0][0]),gy(P[0][1]),4,0,Math.PI*2); g.fill(); }
    else{ g.beginPath(); g.moveTo(gx(P[0][0]),gy(P[0][1]));
      for(let k=1;k<P.length-1;k++){ const mx=(gx(P[k][0])+gx(P[k+1][0]))/2, my=(gy(P[k][1])+gy(P[k+1][1]))/2; g.quadraticCurveTo(gx(P[k][0]),gy(P[k][1]),mx,my); }
      const L=P[P.length-1]; g.lineTo(gx(L[0]),gy(L[1])); g.stroke(); }
    g.shadowBlur=0; g.globalAlpha=1;
  }

  // 涟漪
  for(let i=ripples.length-1;i>=0;i--){ const r=ripples[i], age=(tNow-r.born)/600; if(age>=1){ ripples.splice(i,1); continue; }
    g.strokeStyle=inkColor(r.ink); g.globalAlpha=(1-age)*.8; g.lineWidth=1.6; g.beginPath(); g.arc(gx(r.x),gy(r.y),4+age*20,0,Math.PI*2); g.stroke(); g.globalAlpha=1; }

  // 播放头 + 交点
  if(playheadX>=0){
    const x=gx(playheadX); g.strokeStyle=C.ink; g.globalAlpha=.75; g.lineWidth=1.2;
    g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); g.globalAlpha=1;
    g.fillStyle=C.ink;
    for(const s of playingLists().flat()) for(const y of strokeYsAt(s,playheadX)){ g.beginPath(); g.arc(x,gy(y),4,0,Math.PI*2); g.fill(); }
  }
  if(tool==='erase' && pointer.inside){ g.strokeStyle=C.muted; g.setLineDash([3,3]); g.lineWidth=1; g.beginPath(); g.arc(pointer.x,pointer.y,ERASE_R,0,Math.PI*2); g.stroke(); g.setLineDash([]); }
}
function frame(){ requestAnimationFrame(frame); if(timelineOn){ moveHeads(); if(drawing && tNowMs()-thumbAt>120){ thumbAt=tNowMs(); refreshThumb(); } } }
const tNowMs=()=>performance.now();

// ---------------- 画线 / 橡皮 / 撤销重做 ----------------
const ERASE_R=14, pointer={x:0,y:0,inside:false};
let drawing=null, lastPreviewRow=-1, lastPreviewT=0, erasedAny=false;
function snapshot(){ undoStack.push(JSON.stringify(strokes)); if(undoStack.length>80) undoStack.shift(); redoStack.length=0; renderUndo(); }
function setStrokes(arr){ strokes.length=0; strokes.push(...arr); }
function changed(){ computeEvents(); $('hint').style.opacity=strokes.length?0:1; renderUndo(); if(timelineOn) refreshThumb(); autosave(); updateGridPulse(); }
function renderUndo(){ $('tUndo').disabled=!undoStack.length; $('tRedo').disabled=!redoStack.length; }
function undo(){ if(!undoStack.length) return; redoStack.push(JSON.stringify(strokes)); setStrokes(JSON.parse(undoStack.pop())); changed(); }
function redo(){ if(!redoStack.length) return; undoStack.push(JSON.stringify(strokes)); setStrokes(JSON.parse(redoStack.pop())); changed(); }
function previewAt(y){
  if(!ctx) return; const R=rows(), r=yToRow(y,R.length), t=performance.now();
  if(r!==lastPreviewRow && t-lastPreviewT>35){ lastPreviewRow=r; lastPreviewT=t;
    voice(ctx,chain.input,S.ink,freqOf(R[r]),ctx.currentTime+.005,.16,playing?.45:.7); rowFlash.set(r,t); }
}
function eraseAt(px,py){
  const keep=strokes.filter(s=>!s.pts.some((p,k)=>{ const ax=gx(p[0]),ay=gy(p[1]);
    if(k===0) return Math.hypot(ax-px,ay-py)<ERASE_R;
    const b=s.pts[k-1],bx=gx(b[0]),by=gy(b[1]),dx=ax-bx,dy=ay-by,L=dx*dx+dy*dy; const u=clamp(L?((px-bx)*dx+(py-by)*dy)/L:0,0,1);
    return Math.hypot(bx+u*dx-px,by+u*dy-py)<ERASE_R; }));
  if(keep.length!==strokes.length){ erasedAny=true; setStrokes(keep); computeEvents(); }
}
const pos=e=>{ const r=cv.getBoundingClientRect(); return [e.clientX-r.left,e.clientY-r.top]; };
cv.addEventListener('pointerdown',e=>{
  ensureAudio(); cv.setPointerCapture(e.pointerId); const [px,py]=pos(e); snapshot();
  if(tool==='erase'){ erasedAny=false; drawing={erase:true}; eraseAt(px,py); return; }
  drawing={ink:S.ink,pts:[[nx(px),ny(py)]]}; strokes.push(drawing); lastPreviewRow=-1; previewAt(ny(py));
});
cv.addEventListener('pointermove',e=>{
  const [px,py]=pos(e); pointer.x=px; pointer.y=py; pointer.inside=true;
  if(!drawing) return;
  if(drawing.erase){ eraseAt(px,py); return; }
  const L=drawing.pts[drawing.pts.length-1]; if(Math.hypot(gx(L[0])-px,gy(L[1])-py)<3) return;
  drawing.pts.push([nx(px),ny(py)]); previewAt(ny(py)); computeEvents();
});
cv.addEventListener('pointerleave',()=>pointer.inside=false);
const endDraw=()=>{ if(!drawing) return; if(drawing.erase&&!erasedAny){ undoStack.pop(); renderUndo(); } drawing=null; changed(); };
cv.addEventListener('pointerup',endDraw); cv.addEventListener('pointercancel',endDraw);

// ---------------- 实时演奏：MIDI 键盘 / 电脑键盘 ----------------
const held=new Map();
function nearestRow(m){ const R=rows(); while(m<R[0]) m+=12; while(m>R[R.length-1]) m-=12;
  let best=0,bd=1e9; R.forEach((x,i)=>{ const d=Math.abs(x-m); if(d<bd){bd=d;best=i;} }); return best; }
function liveOn(id,row,midiNote,vel=.8){
  ensureAudio(); const m=midiNote??rows()[row]; if(held.has(id)) liveOff(id);
  held.set(id,{v:voice(ctx,chain.input,S.ink,freqOf(m),ctx.currentTime+.003,6,vel),row,start:playheadX});
  rowFlash.set(row,performance.now());
}
function liveOff(id){
  const h=held.get(id); if(!h) return; held.delete(id); h.v.release(ctx.currentTime);
  if(playing && h.start>=0 && playheadX>=0){   // 播放中弹的音，按量化画进循环
    const N=stepsPerLoop(), n=rows().length, a=clamp(Math.round(h.start*N),0,N-1);
    let b=playheadX<h.start ? N : Math.round(playheadX*N); b=clamp(Math.max(b,a+1),1,N);
    const y=1-h.row/(n-1); snapshot(); strokes.push({ink:S.ink,pts:[[(a+.1)/N,y],[(b-.1)/N,y]]}); changed();
  }
}
let midiAccess=null;
async function setMidi(on){
  if(!on){ if(midiAccess) for(const i of midiAccess.inputs.values()) i.onmidimessage=null; return; }
  if(!navigator.requestMIDIAccess){ toast('此浏览器不支持 Web MIDI，请用 Chrome 或 Edge'); S.midi=false; renderInst(); return; }
  try{ midiAccess=await navigator.requestMIDIAccess();
    const hook=()=>{ let c=0; for(const i of midiAccess.inputs.values()){ i.onmidimessage=onMidi; c++; } return c; };
    const c=hook(); midiAccess.onstatechange=hook; toast(c?`已连接 ${c} 个 MIDI 设备`:'MIDI 已开启，暂未检测到设备');
  }catch(err){ toast('无法打开 MIDI：'+err.message); S.midi=false; renderInst(); }
}
function onMidi(e){ const [st,d1,d2]=e.data, cmd=st&0xf0;
  if(cmd===0x90&&d2>0) liveOn('m'+d1,nearestRow(d1),d1,.4+d2/127*.6); else if(cmd===0x80||(cmd===0x90&&d2===0)) liveOff('m'+d1); }
const KEYMAP="asdfghjkl;qwertyuiop";
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
  if(e.key==='Escape'){ closeSamples(); closeLib(); $('help').classList.remove('show'); $('imp').classList.remove('show'); return; }
  if(document.querySelector('.overlay.show')) return;   // 弹窗开着时不响应快捷键
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){ e.preventDefault(); quickSave(); return; }
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if((e.ctrlKey||e.metaKey)&&k==='y'){ e.preventDefault(); redo(); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(e.code==='Space'){ e.preventDefault(); playing?pause():play(); return; }
  if(e.shiftKey&&k==='e'){ setTool(tool==='erase'?'draw':'erase'); return; }
  if(e.repeat||e.shiftKey) return;
  if(/^[1-9]$/.test(k)){ setInk(+k-1); return; }
  if(k==='g'){ toggleGrid(); return; }
  const idx=KEYMAP.indexOf(k); if(idx>=0 && idx<rows().length) liveOn('k'+k,idx);
});
window.addEventListener('keyup',e=>{ const k=e.key.toLowerCase(); if(KEYMAP.includes(k)) liveOff('k'+k); });

// ---------------- 速度 / Tap ----------------
function setBpm(v){ S.bpm=clamp(Math.round(v)||120,40,240); $('bpm').value=S.bpm; $('tempo').value=S.bpm; autosave(); }
$('tempo').oninput=e=>setBpm(+e.target.value);
$('bpm').onchange=e=>setBpm(+e.target.value);
const taps=[];
$('tap').addEventListener('pointerdown',()=>{
  ensureAudio(); const t=performance.now(); if(taps.length&&t-taps[taps.length-1]>2000) taps.length=0;
  taps.push(t); if(taps.length>6) taps.shift(); clickSound(ctx,chain.input,ctx.currentTime+.002,taps.length===1);
  if(taps.length>=2) setBpm(60000/((taps[taps.length-1]-taps[0])/(taps.length-1)));
  $('tap').classList.add('flash'); setTimeout(()=>$('tap').classList.remove('flash'),90);
});

// ---------------- 乐器面板 ----------------
function fillSelect(id,entries){ $(id).innerHTML=entries.map(([v,l])=>`<option value="${v}">${l}</option>`).join(''); }
fillSelect('selKey',KEY_NAMES.map((l,i)=>[i,l]));
fillSelect('selScale',Object.entries(SCALES).map(([k,o])=>[k,o.name]));
fillSelect('selQuant',Object.entries(QUANT).map(([k,o])=>[k,o.label]));
fillSelect('selSwing',Object.entries(SWING).map(([k,o])=>[k,o.label]));
function setSetting(k,v){
  const oldN=stepsPerLoop(); S[k]=v;
  if(playing&&stepsPerLoop()!==oldN){ curStep=Math.floor(curStep/oldN*stepsPerLoop())%stepsPerLoop(); stepQueue.length=0; }
  computeEvents(); renderInst(); autosave();
}
$('selKey').onchange=e=>setSetting('key',+e.target.value);
$('selScale').onchange=e=>setSetting('scale',e.target.value);
$('selRange').onchange=e=>setSetting('range',+e.target.value);
$('selQuant').onchange=e=>setSetting('quant',e.target.value);
$('selSwing').onchange=e=>setSetting('swing',e.target.value);
$('octDn').onclick=()=>setSetting('octave',clamp(S.octave-1,-2,2));
$('octUp').onclick=()=>setSetting('octave',clamp(S.octave+1,-2,2));
$('tune').onchange=e=>{ S.cents=clamp(Math.round(+e.target.value)||0,-50,50); e.target.value=S.cents; autosave(); };
$('click').onclick=()=>{ S.click=!S.click; renderInst(); autosave(); };
$('midi').onclick=()=>{ S.midi=!S.midi; renderInst(); setMidi(S.midi); };
// 迷你钢琴：显示当前音阶，点击换调
const WHITE=[0,2,4,5,7,9,11], BLACK=[[1,1],[3,2],[6,4],[8,5],[10,6]];
function buildPiano(){
  const p=$('piano'); p.innerHTML=''; const w=100/7;
  WHITE.forEach((pc,i)=>{ const el=document.createElement('i'); el.dataset.pc=pc; el.style.left=i*w+'%'; el.style.width=w+'%'; p.appendChild(el); });
  BLACK.forEach(([pc,after])=>{ const el=document.createElement('i'); el.className='b'; el.dataset.pc=pc; el.style.left=(after*w-w*.3)+'%'; el.style.width=w*.6+'%'; p.appendChild(el); });
  p.onclick=e=>{ const pc=e.target.dataset.pc; if(pc!==undefined) setSetting('key',+pc); };
}
function renderInst(){
  $('selKey').value=S.key; $('selScale').value=S.scale; $('selRange').value=S.range; $('selQuant').value=S.quant; $('selSwing').value=S.swing;
  $('octVal').textContent=(S.octave>0?'+':'')+S.octave; $('tune').value=S.cents;
  $('click').textContent=S.click?'开':'关'; $('click').classList.toggle('on',S.click);
  $('midi').textContent=S.midi?'开':'关'; $('midi').classList.toggle('on',S.midi);
  const inScale=new Set(SCALES[S.scale].iv.map(i=>(i+S.key)%12));
  $('piano').querySelectorAll('i').forEach(el=>{ const pc=+el.dataset.pc; el.classList.toggle('in',inScale.has(pc)); el.classList.toggle('root',pc===S.key); });
  $('selSwing').disabled=!!QUANT[S.quant].trip; $('selSwing').title=QUANT[S.quant].trip?'三连音量化时摇摆不起作用':'';
  [1,2,4].forEach(bit=>$('beat'+bit).classList.toggle('on',!!(S.beats&bit)));
  [1,2,3].forEach(k=>$('prog'+k).classList.toggle('on',S.mode===k));
}
$('instSw').onclick=()=>{ const on=document.body.classList.toggle('noinst'); $('instSw').classList.toggle('on',!on); };
// 三个圆点：贝斯 / 鼓 / 琶音，各自开关，可以叠加
[1,2,4].forEach(bit=>$('beat'+bit).onclick=()=>{ S.beats^=bit; renderInst(); autosave(); });

// ---------------- 显示模式：1 画线 / 2 像素 / 3 舞台 ----------------
function setMode(m){
  if(m===3 && window.innerWidth>=760) m=1;              // 舞台是手机上的玩法，宽屏回到画线
  S.mode=m; [1,2,3].forEach(k=>$('prog'+k).classList.toggle('on',k===m));
  document.body.classList.toggle('mode3',m===3); if(m===3) buildCast(); autosave();
}
[1,2,3].forEach(k=>$('prog'+k).onclick=()=>setMode(k));
window.addEventListener('resize',()=>{ if(S.mode===3 && window.innerWidth>=760) setMode(1); });

// 像素模式：列 = 步，行数让格子保持正方形；线碰到的每个音阶行点亮一格，播放头经过时格子发亮再慢慢暗下去
function latticeRows(){ const w=W-PAD.l-PAD.r, h=H-PAD.t-PAD.b; return Math.max(1,Math.round(stepsPerLoop()*h/Math.max(w,1))); }
function forEachCell(s,fn){
  const sets=cellSets.get(s); if(!sets) return;
  const N=stepsPerLoop(), n=rows().length, rowsL=latticeRows(), w=W-PAD.l-PAD.r, h=H-PAD.t-PAD.b, cw=w/N, ch=h/rowsL;
  for(let st=0;st<N;st++){ const set=sets[st]; if(!set||!set.size) continue; const seen=new Set();
    for(const r of set){ const lr=clamp(Math.floor((n-1-r+.5)/n*rowsL),0,rowsL-1); if(seen.has(lr)) continue; seen.add(lr);
      fn(PAD.l+st*cw, PAD.t+lr*ch, cw, ch, st); } }
}
const litCache={};
function litColor(hex){ if(litCache[hex]) return litCache[hex];
  const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).map(v=>Math.round(v+(255-v)*.55)); return litCache[hex]=`rgba(${c[0]},${c[1]},${c[2]},`; }
function cellRect(g,x,y,w,h){ const r=Math.min(w,h)*.12; g.beginPath(); if(g.roundRect) g.roundRect(x+1,y+1,w-2,h-2,r); else g.rect(x+1,y+1,w-2,h-2); g.fill(); }
function drawPixels(g){
  const N=stepsPerLoop(), rowsL=latticeRows(), w=W-PAD.l-PAD.r, h=H-PAD.t-PAD.b, cw=w/N, ch=h/rowsL;
  g.lineWidth=1; g.strokeStyle=C.line2; g.beginPath();
  for(let st=0;st<=N;st++){ const x=Math.round(PAD.l+st*cw)+.5; g.moveTo(x,PAD.t); g.lineTo(x,PAD.t+h); }
  for(let r=0;r<=rowsL;r++){ const y=Math.round(PAD.t+r*ch)+.5; g.moveTo(PAD.l,y); g.lineTo(PAD.l+w,y); }
  g.stroke();
  for(const s of strokes){ g.fillStyle=inkColor(s.ink); forEachCell(s,(x,y,cw2,ch2)=>cellRect(g,x,y,cw2,ch2)); }
  if(playheadX>=0){
    const playCol=playheadX*N;
    for(const s of strokes){ const lit=litColor(inkColor(s.ink));
      forEachCell(s,(x,y,cw2,ch2,st)=>{ let d=playCol-st; if(d<0) d+=N; let k; if(d<=1) k=1; else if(d<2.5) k=1-(d-1)/1.5; else return;
        g.fillStyle=lit+k+')'; cellRect(g,x,y,cw2,ch2); }); }
    const x=gx(playheadX); g.strokeStyle=C.ink; g.globalAlpha=.75; g.lineWidth=1.2; g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); g.globalAlpha=1;
  }
  if(tool==='erase' && pointer.inside){ g.strokeStyle=C.muted; g.setLineDash([3,3]); g.lineWidth=1; g.beginPath(); g.arc(pointer.x,pointer.y,ERASE_R,0,Math.PI*2); g.stroke(); g.setLineDash([]); }
}

// 舞台模式：一格一种颜色（乐器）。暂停时全部显示；播放时某种乐器在响，它的格子才亮起 / 露出照片
const castPhotos=new Array(NINK).fill(null); let castTarget=-1;
function buildCast(){
  const el=$('cast'); el.innerHTML=''; castMask=-1;
  for(let i=0;i<NINK;i++){
    const c=document.createElement('div'); c.className='cell'+(castPhotos[i]?'':' nophoto'); c.style.background=inkColor(i);
    if(castPhotos[i]){ const img=document.createElement('img'); img.src=castPhotos[i]; img.alt=''; c.appendChild(img); }
    c.insertAdjacentHTML('beforeend',`<div class="glow"></div><span class="lbl">${INSTR[i]}</span>`);
    if(i===4 && !castPhotos.some(Boolean)) c.insertAdjacentHTML('beforeend','<div class="tip">点一个格子，放你的照片</div>');
    c.onclick=()=>{ if(playing) return; castTarget=i; $('castFile').value=''; $('castFile').click(); };
    el.appendChild(c);
  }
}
$('castFile').onchange=e=>{ const f=e.target.files[0]; if(!f||castTarget<0) return; if(castPhotos[castTarget]) URL.revokeObjectURL(castPhotos[castTarget]);
  castPhotos[castTarget]=URL.createObjectURL(f); buildCast(); };
let castMask=-1;
function updateCast(){
  let m=(1<<NINK)-1;
  if(playing){ m=0; if(stepQueue.length && stepQueue[0].time<=(ctx?ctx.currentTime:0)) m=soundMask[stepQueue[0].step]||0; }
  if(m===castMask) return; castMask=m;
  [...$('cast').children].forEach((c,i)=>{ c.style.background=inkColor(i); c.classList.toggle('show',!!((m>>i)&1)); });
}

// ---------------- Pages：几页串成时间线，几条时间线叠在一起播 ----------------
const SV={
  plus:'<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>',
  dup:'<svg viewBox="0 0 16 16"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"/></svg>',
  x:'<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  fold:'<svg viewBox="0 0 16 16"><path d="M4 6.5l4 4 4-4"/></svg>',
  unfold:'<svg viewBox="0 0 16 16"><path d="M4 9.5l4-4 4 4"/></svg>',
  stack:'<svg viewBox="0 0 16 16"><rect x="2" y="9" width="12" height="4.5" rx="1.3"/><path d="M8 1.5v5M5.5 4h5"/></svg>',
};
const UNIT=96;   // 一个小节在时间线上的宽度
const pageBars=pg=>Math.max(1,(pg.bars|0)||1);
function sbtn(tip,svg,fn){ const b=document.createElement('button'); b.className='sbtn'; b.dataset.tip=tip; b.innerHTML=svg; b.onclick=e=>{ e.stopPropagation(); fn(); }; return b; }
function thumb(cvs,list,reps){
  const c=cvs.getContext('2d'), tw=cvs.width/reps, th=cvs.height; c.fillStyle=C.paper||'#fffdf8'; c.fillRect(0,0,cvs.width,th);
  c.lineCap='round'; c.lineJoin='round';
  for(let r=0;r<reps;r++){ const x0=r*tw;
    if(r){ c.strokeStyle=C.line2; c.lineWidth=1; c.beginPath(); c.moveTo(x0+.5,0); c.lineTo(x0+.5,th); c.stroke(); }
    c.lineWidth=2.2;
    for(const s of list){ const P=s.pts; c.strokeStyle=inkColor(s.ink); c.fillStyle=inkColor(s.ink);
      if(P.length===1){ c.beginPath(); c.arc(x0+P[0][0]*tw,P[0][1]*th,2,0,7); c.fill(); continue; }
      c.beginPath(); P.forEach((p,i)=>{ const x=x0+p[0]*tw, y=p[1]*th; i?c.lineTo(x,y):c.moveTo(x,y); }); c.stroke(); } }
}
let headEls=[];
function showPage(k,i){
  const sameView = k===trackIndex && i===tracks[k].pageIndex;
  trackIndex=k; const t=tracks[k];
  if(i!==undefined && i!==t.pageIndex){ t.pageIndex=clamp(i,0,t.pages.length-1); t.played=0; }
  if(!sameView){ drawing=null; undoStack=[]; redoStack=[]; }
  syncStrokes(); renderUndo(); computeEvents(); renderStrip(); $('hint').style.opacity=strokes.length?0:1; autosave();
}
function renderStrip(){
  const el=$('strip'); if(!timelineOn){ el.innerHTML=''; headEls=[]; return; }
  el.innerHTML=''; headEls=[];
  const longest=Math.max(1,...tracks.map(t=>t.pages.reduce((n,pg)=>n+pageBars(pg),0)));
  const ruler=document.createElement('div'); ruler.className='trk ruler'; ruler.innerHTML='<div class="thead"></div>';
  for(let b=0;b<longest;b++){ const n=document.createElement('span'); n.className='rnum'; n.textContent=b+1; n.style.width=UNIT+'px'; ruler.appendChild(n); }
  el.appendChild(ruler);
  tracks.forEach((t,k)=>{
    const row=document.createElement('div'); row.className='trk'+(k===trackIndex?' on':'');
    const head=document.createElement('div'); head.className='thead';
    const num=document.createElement('span'); num.className='n'; num.textContent=k+1; num.title=`时间线 ${k+1}：点击切换过去画`; num.onclick=()=>showPage(k);
    const len=document.createElement('span'); len.textContent=t.pages.reduce((n,pg)=>n+pageBars(pg),0)+' 小节';
    head.append(num,len);
    head.appendChild(sbtn(t.collapsed?'展开这条时间线':'把这条时间线折小',t.collapsed?SV.unfold:SV.fold,()=>{ t.collapsed=!t.collapsed; renderStrip(); }));
    if(tracks.length>1) head.appendChild(sbtn('删掉这条时间线',SV.x,()=>removeTrack(k)));
    row.appendChild(head);
    const th=t.collapsed?22:Math.round(UNIT*.5);   // 缩略图高度固定，避免和画布互相挤压
    t.pages.forEach((pg,i)=>{
      const nb=pageBars(pg), cw=UNIT*nb;
      const b=document.createElement('div'); b.className='pg'+(k===trackIndex&&i===t.pageIndex?' on':''); b.style.width=cw+'px'; b.title=`第 ${i+1} 页，${nb} 小节`;
      const clip=document.createElement('span'); clip.className='clip';
      const cvs=document.createElement('canvas'); cvs.width=(cw-4)*2; cvs.height=th*2; cvs.style.height=th+'px'; thumb(cvs,pg.strokes,nb);
      const hd=document.createElement('span'); hd.className='head'; clip.append(cvs,hd); b.appendChild(clip);
      if(i===t.pageIndex) headEls[k]=hd;
      if(!t.collapsed){
        const under=document.createElement('span'); under.className='under';
        const bars=document.createElement('span'); bars.className='bars'; bars.textContent=nb+' 小节'; bars.title='这一页放几个小节：点击切换';
        bars.onclick=e=>{ e.stopPropagation(); pg.bars=nb>=8?1:nb*2; t.played=0; renderStrip(); autosave(); };
        under.innerHTML=`<span>${i+1}</span>`; under.appendChild(bars); b.appendChild(under);
      }
      clip.onclick=()=>showPage(k,i);
      row.appendChild(b);
    });
    if(!t.collapsed){
      const ctl=document.createElement('div'); ctl.className='pctl';
      const cur=()=>{ if(k!==trackIndex) showPage(k); return tracks[trackIndex]; };
      ctl.appendChild(sbtn('在这页后面加一张新页',SV.plus,()=>{ const tr=cur(); tr.pages.splice(tr.pageIndex+1,0,{strokes:[],bars:1}); showPage(trackIndex,tr.pageIndex+1); }));
      ctl.appendChild(sbtn('复制这一页，放在它后面',SV.dup,()=>{ const tr=cur(); const pg=tr.pages[tr.pageIndex];
        tr.pages.splice(tr.pageIndex+1,0,{strokes:JSON.parse(JSON.stringify(pg.strokes)),bars:pageBars(pg)}); showPage(trackIndex,tr.pageIndex+1); }));
      const del=sbtn('删掉这一页',SV.x,()=>{ const tr=cur(); if(tr.pages.length<2) return; tr.pages.splice(tr.pageIndex,1); tr.pageIndex=Math.min(tr.pageIndex,tr.pages.length-1); tr.played=0; showPage(trackIndex,tr.pageIndex); });
      del.disabled=t.pages.length<2; ctl.appendChild(del); row.appendChild(ctl);
    }
    el.appendChild(row);
  });
  const more=sbtn('新建一条时间线，和其他时间线一起播',SV.stack,addTrack); more.classList.add('trackadd'); el.appendChild(more);
}
function addTrack(){ tracks.push(newTrack()); showPage(tracks.length-1,0); }
function removeTrack(k){ if(tracks.length<2) return; tracks.splice(k,1); if(trackIndex>=tracks.length) trackIndex=tracks.length-1; else if(k<trackIndex) trackIndex--; showPage(trackIndex); }
function moveHeads(){
  headEls.forEach((hd,k)=>{ if(!hd) return; const t=tracks[k]; if(!t||!playing||playheadX<0){ hd.style.display='none'; return; }
    const nb=pageBars(t.pages[t.pageIndex]); hd.style.display='block'; hd.style.left=(100*Math.min(1,(t.played+playheadX)/nb)).toFixed(2)+'%'; });
}
let thumbAt=0;
function refreshThumb(){ const c=$('strip').querySelector('.trk.on .pg.on canvas'); if(c) thumb(c,strokes,pageBars(tracks[trackIndex].pages[tracks[trackIndex].pageIndex])); }
function setTimeline(on){ timelineOn=on; document.body.classList.toggle('pages-open',on); $('pagesBtn').classList.toggle('on',on); computeEvents(); renderStrip(); }
$('pagesBtn').onclick=()=>setTimeline(!timelineOn);
// 单页循环按钮：全局设置，换到哪首谱都保持
function setLoopOne(on,quiet){ loopOne=on; setPref('loopOne',on); $('loopBtn').classList.toggle('on',on);
  if(!quiet){ const many=tracks.some(t=>t.pages.length>1);
    toast(on?'单页循环：只循环眼前这一页':(many?'顺序播放：一页放完接着放下一页':'顺序播放：现在只有一页，加了新页就会一页一页往下播'),2400); } }
$('loopBtn').onclick=()=>setLoopOne(!loopOne);

