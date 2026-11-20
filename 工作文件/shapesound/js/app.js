"use strict";
/* 形声 · 工具栏、保存/自动保存、录音、导出 WAV/MIDI、悬停提示 */
// ---------------- 工具栏 ----------------
function renderSwatches(){
  const el=$('swatches'); el.innerHTML='';
  SWATCH_ORDER.forEach(i=>{ const c=PALETTES[S.palette][i]; const b=document.createElement('button'); b.className='sw'+(tool==='draw'&&S.ink===i?' on':'');
    b.style.background=c; b.dataset.tip=INSTR[i]+(i<9?`（快捷键 ${i+1}）`:'')+(i===DRUM_INK?'：越低越是底鼓，越高越是镲':''); b.onclick=()=>setInk(i); el.appendChild(b); });
  $('timbre').textContent=tool==='erase'?'橡皮：擦掉碰到的线':'音色：'+INSTR[S.ink];
  $('tPen').classList.toggle('on',tool==='draw'); $('tErase').classList.toggle('on',tool==='erase');
}
function setInk(i){ S.ink=i; setTool('draw'); autosave(); ensureAudio(); const R=rows(); voice(ctx,chain.input,i,freqOf(R[Math.floor(R.length/2)]),ctx.currentTime+.01,.3,.6); }  // 换乐器时试听一声
function setTool(t){ tool=t; cv.style.cursor=t==='erase'?'cell':'crosshair'; renderSwatches(); }
function toggleGrid(){ S.grid=!S.grid; $('tGrid').classList.toggle('on',S.grid); markTried('gridTried'); autosave();
  if(updateGridPulse()===false && $('tShuffle').classList.contains('pulse')) toast('再试试闪烁的「随机换音色」：每条线随机换一种乐器',3500); }
// 新手引导，一次只闪一个按钮：先是「音符网格」，点过之后轮到「随机换音色」（画纸上有线时才闪），各自点过一次就不再闪
const tried=k=>{ try{ return !!localStorage.getItem('xingsheng.'+k); }catch(e){ return true; } };
const markTried=k=>{ try{ localStorage.setItem('xingsheng.'+k,'1'); }catch(e){} };
function updateGridPulse(){
  const grid=!S.grid&&!tried('gridTried');
  const shuffle=!grid&&tried('gridTried')&&!tried('shuffleTried')&&strokes.length>0;
  $('tGrid').classList.toggle('pulse',grid); $('tShuffle').classList.toggle('pulse',shuffle);
  return grid; }
$('tPen').onclick=()=>setTool('draw'); $('tErase').onclick=()=>setTool(tool==='erase'?'draw':'erase');
$('tUndo').onclick=undo; $('tRedo').onclick=redo;
$('tClear').onclick=()=>{ if(!strokes.length) return; snapshot(); setStrokes([]); changed(); toast('已清空，可撤销'); };
const MELODIC=SWATCH_ORDER.filter(i=>i!==DRUM_INK);   // 随机换音色时不会换成鼓组
$('tShuffle').onclick=()=>{ if(!strokes.length) return toast('先画几笔再换'); markTried('shuffleTried'); snapshot();
  strokes.forEach(s=>{ if(s.ink!==DRUM_INK) s.ink=MELODIC[Math.floor(Math.random()*MELODIC.length)]; }); changed(); updateGridPulse();
  toast('每条线都换了一种乐器 · 不喜欢按 Ctrl+Z 换回来',2600); };
$('tPalette').onclick=()=>{ S.palette=(S.palette+1)%PALETTES.length; renderSwatches(); castMask=-1; if(S.mode===3) buildCast(); renderStrip(); autosave(); toast(['明亮','国色','霓虹'][S.palette]+'配色'); };
$('tGrid').onclick=toggleGrid;
$('tBg').onclick=()=>{ const next=PAPERS[(PAPERS.indexOf(S.paper)+1)%PAPERS.length]; if(next==='photo'){ $('photoFile').click(); return; } setPaper(next); toast('背景：'+PAPER_NAMES[next]); };
$('tBg').oncontextmenu=e=>{ e.preventDefault(); $('photoFile').click(); };
function setPaper(p){
  S.paper=p; document.body.dataset.paper=p==='photo'?'paper':p; $('stage').classList.toggle('photo',p==='photo');
  if(p!=='photo') $('stage').style.backgroundImage=''; readColors(); renderStrip(); autosave();
}
$('photoFile').onchange=e=>{ const f=e.target.files[0]; if(f){ $('stage').style.backgroundImage=`url(${URL.createObjectURL(f)})`; setPaper('photo'); toast('背景：照片'); } else setPaper('paper'); e.target.value=''; };
$('photoFile').addEventListener('cancel',()=>setPaper('paper'));

// ---------------- 保存 / 打开 / 自动保存 ----------------
function serialize(){
  return {app:'xingsheng',version:3,settings:{...S,paper:S.paper==='photo'?'paper':S.paper},
    tracks:tracks.map(t=>({pages:t.pages.map(pg=>({bars:pageBars(pg),strokes:pg.strokes})),pageIndex:t.pageIndex,collapsed:!!t.collapsed})),trackIndex,timelineOn};
}
let suppressLib=false;   // 正在载入别的作品时为 true：这期间不往「当前作品」里自动保存，否则会把新内容写进上一个作品
function load(obj){ suppressLib=true; try{ loadInner(obj); } finally{ suppressLib=false; } }
function loadInner(obj){
  if(!obj) throw new Error('文件是空的');
  let tr = obj.tracks;
  if(!tr){ // 兼容旧版文件：v2 的两张纸 → 两页；v1 的一张纸 → 一页
    const old = obj.slots || (Array.isArray(obj.strokes) ? [obj.strokes] : null);
    if(!old) throw new Error('不是形声作品文件');
    tr=[{pages:old.filter((l,i)=>i===0||(l&&l.length)).map(l=>({strokes:l||[],bars:1})),pageIndex:0}];
  }
  Object.assign(S,obj.settings||{});
  if(obj.settings && obj.settings.tune && !('cents' in obj.settings)) S.cents=clamp(Math.round(1200*Math.log2(obj.settings.tune/440)),-50,50);
  if(!SCALES[S.scale]) S.scale='majPent'; if(!QUANT[S.quant]) S.quant='8t'; if(!SWING[S.swing]) S.swing='off';
  S.ink=clamp(S.ink|0,0,NINK-1); S.beats=(S.beats|0)&7; S.palette=clamp(S.palette|0,0,PALETTES.length-1); S.mode=[1,2,3].includes(S.mode)?S.mode:1;
  delete S.slot; delete S.slots; delete S.bars;
  tracks=tr.map(t=>({pages:(t.pages&&t.pages.length?t.pages:[{strokes:[]}]).map(pg=>({strokes:Array.isArray(pg.strokes)?pg.strokes:[],bars:pageBars(pg)})),
    pageIndex:t.pageIndex|0,played:0,collapsed:!!t.collapsed}));
  trackIndex=clamp(obj.trackIndex|0,0,tracks.length-1); syncStrokes(); undoStack=[]; redoStack=[];
  setTimeline(!!obj.timelineOn); setMode(S.mode);
  setPaper(S.paper||'paper'); setBpm(S.bpm); $('tGrid').classList.toggle('on',S.grid); updateGridPulse();
  renderInst(); renderSwatches(); changed(); if(S.midi) setMidi(true);
}
function autosave(){ try{ localStorage.setItem('xingsheng.v3',JSON.stringify(serialize())); }catch(e){} libAutosave(); }
// 从文件导入：放进「我的作品」并打开
$('openFile').onchange=e=>{ const f=e.target.files[0]; if(!f) return;
  f.text().then(t=>{ const obj=JSON.parse(t); const msg=stashCurrent(); if(playing) pause(); load(obj);
    setCurrent({}); saveCurrent(f.name.replace(/\.json$/i,''),true,true); closeLib(); toast(`已导入《${currentWork.name}》`+(msg?'。'+msg:''),msg?4000:1800); })
   .catch(err=>toast('导入失败：'+err.message)); e.target.value=''; };

// ---------------- 录音（实时） ----------------
let recorder=null, recChunks=[];
$('rec').onclick=()=>{
  ensureAudio();
  if(recorder&&recorder.state==='recording'){ recorder.stop(); return; }
  if(!recDest||!window.MediaRecorder) return toast('此浏览器不支持录音，可用「导出 WAV」');
  const mime=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'].find(m=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m))||'';
  recorder=new MediaRecorder(recDest.stream,mime?{mimeType:mime}:undefined); recChunks=[];
  recorder.ondataavailable=e=>e.data.size&&recChunks.push(e.data);
  recorder.onstop=()=>{ $('rec').classList.remove('on'); $('rec').textContent='录音';
    const type=recorder.mimeType||'audio/webm', ext=type.includes('ogg')?'ogg':type.includes('mp4')?'m4a':'webm';
    download(new Blob(recChunks,{type}),`形声-录音-${stamp()}.${ext}`); toast('录音已下载'); };
  recorder.start(); $('rec').classList.add('on'); $('rec').textContent='停止录音'; if(!playing) play();
};

// ---------------- 导出 WAV（离线渲染，可无缝循环） ----------------
async function exportWav(){
  if(!strokes.length && !S.beats) return toast('先画点什么吧');
  computeEvents(); toast('正在渲染…');
  const sr=44100, N=stepsPerLoop(), sd=stepDur(), loopDur=N*sd, R=rows();
  const oac=new OfflineAudioContext(2,Math.ceil(sr*loopDur*2),sr), ch=buildChain(oac,oac.destination);
  for(let pass=0;pass<2;pass++) for(let i=0;i<N;i++){
    const list=events[i], vel=.85/Math.sqrt(Math.max(1,list.length/3)), t=pass*loopDur+i*sd+swingOffset(i);
    for(const e of list) voice(oac,ch.input,e.ink,freqOf(R[e.row]),t,e.len*sd*.97,vel);
    scheduleBeats(oac,ch.input,i,t);
  }
  const buf=await oac.startRendering(), start=Math.round(loopDur*sr), len=Math.round(loopDur*sr);
  // 取第二遍：上一遍的余音自然接到开头，循环播放没有断口
  download(encodeWav([buf.getChannelData(0).subarray(start,start+len),buf.getChannelData(1).subarray(start,start+len)],sr),`形声-${S.bpm}bpm-${stamp()}.wav`);
  toast('WAV 已导出（一个可无缝循环的片段）');
}
function encodeWav(chs,sr){
  const n=chs[0].length, nc=chs.length, bytes=44+n*nc*2, dv=new DataView(new ArrayBuffer(bytes));
  const ws=(o,s)=>{ for(let i=0;i<s.length;i++) dv.setUint8(o+i,s.charCodeAt(i)); };
  ws(0,'RIFF'); dv.setUint32(4,bytes-8,true); ws(8,'WAVE'); ws(12,'fmt '); dv.setUint32(16,16,true); dv.setUint16(20,1,true);
  dv.setUint16(22,nc,true); dv.setUint32(24,sr,true); dv.setUint32(28,sr*nc*2,true); dv.setUint16(32,nc*2,true); dv.setUint16(34,16,true);
  ws(36,'data'); dv.setUint32(40,n*nc*2,true);
  let o=44; for(let i=0;i<n;i++) for(let c=0;c<nc;c++){ const s=clamp(chs[c][i],-1,1); dv.setInt16(o,s<0?s*0x8000:s*0x7fff,true); o+=2; }
  return new Blob([dv.buffer],{type:'audio/wav'});
}

// ---------------- 导出 MIDI（标准 MIDI 文件，格式 0） ----------------
function exportMidi(){
  if(!strokes.length && !S.beats) return toast('先画点什么吧');
  computeEvents();
  const PPQ=480, N=stepsPerLoop(), tps=PPQ/stepsPerBeat(), R=rows();
  const swingT=i=>QUANT[S.quant].trip||i%2===0?0:Math.round(SWING[S.swing].v*tps);
  // GM 音色：钢琴 钢弦吉他 管钟 马林巴 长笛 弦乐 钟琴 贝斯 方波 | 铜管 管风琴 竖琴 电钢琴 合唱 |（鼓组）| 失真吉他
  const PROG=[0,25,14,12,73,48,9,33,80,61,19,46,4,52,0,30];
  // 通道：乐器 0–8 → 0–8；铜管…合唱 → 10、12–15；电吉他 → 11；第 10 通道（编号 9）留给打击乐（鼓组 + 鼓伴奏）
  // 16 个通道正好用满，所以伴奏贝斯和贝斯颜色共用编号 7，伴奏琶音和风铃共用编号 6
  const chOf=ink=>ink===DRUM_INK?9:ink<=8?ink:ink===15?11:[10,12,13,14,15][ink-9];
  const GM_DRUM=[36,45,38,42,46,49];   // 底鼓 通鼓 军鼓 闭镲 开镲 吊镲
  const used=new Set(), ev=[];
  for(let i=0;i<N;i++) for(const e of events[i]){
    used.add(e.ink); const ch=chOf(e.ink), on=Math.round(i*tps)+swingT(i);
    if(e.ink===DRUM_INK){ const m=GM_DRUM[drumKindAt(e.row/Math.max(1,R.length-1))]; ev.push({t:on,o:2,d:[0x99,m,100]},{t:on+30,o:1,d:[0x89,m,0]}); continue; }
    const off=Math.round((i+e.len)*tps)-1, m=clamp(R[e.row]-(e.ink===7?12:0),0,127);
    ev.push({t:on,o:2,d:[0x90|ch,m,96]},{t:Math.max(off,on+1),o:1,d:[0x80|ch,m,0]});
  }
  for(const c of used) if(c!==DRUM_INK) ev.push({t:0,o:0,d:[0xC0|chOf(c),PROG[c]]});
  // 伴奏：贝斯与贝斯颜色共用编号 7，琶音与风铃共用编号 6，鼓用打击乐通道（编号 9；GM 打击乐：36 底鼓、38 军鼓、42 闭镲）
  const note=(ch,m,on,len,v=90)=>ev.push({t:on,o:2,d:[0x90|ch,m,v]},{t:on+Math.max(1,len),o:1,d:[0x80|ch,m,0]});
  if(S.beats&1 && !used.has(7)) ev.push({t:0,o:0,d:[0xC0|7,38]});   // Synth Bass 1
  if(S.beats&4 && !used.has(6)) ev.push({t:0,o:0,d:[0xC0|6,11]});   // Vibraphone
  for(let i=0;i<N;i++){ const b=beatHits(i), on=Math.round(i*tps)+swingT(i);
    if(b.bass) note(7,48+beatKey(),on,Math.round(tps*stepsPerBeat()*.5));
    if(b.kick) note(9,36,on,60,100); if(b.snare) note(9,38,on,60,90); if(b.hat) note(9,42,on,30,64);
    if(b.arp!==null) note(6,b.arp+beatKey(),on,Math.round(tps*.9),80);
  }
  ev.sort((a,b)=>a.t-b.t||a.o-b.o);
  const vlq=n=>{ const b=[n&0x7f]; while(n>>=7) b.unshift((n&0x7f)|0x80); return b; };
  const us=Math.round(60e6/S.bpm), trk=[0,0xFF,0x51,3,(us>>16)&255,(us>>8)&255,us&255, 0,0xFF,0x58,4,4,2,24,8];
  let last=0; for(const e of ev){ trk.push(...vlq(e.t-last),...e.d); last=e.t; }
  trk.push(...vlq(Math.max(0,N*tps-last)),0xFF,0x2F,0);
  const hdr=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(PPQ>>8)&255,PPQ&255], tl=trk.length;
  download(new Blob([new Uint8Array([...hdr,0x4D,0x54,0x72,0x6B,(tl>>>24)&255,(tl>>16)&255,(tl>>8)&255,tl&255,...trk])],{type:'audio/midi'}),`形声-${S.bpm}bpm-${stamp()}.mid`);
  toast('MIDI 已导出');
}
$('expWav').onclick=exportWav; $('expMidi').onclick=exportMidi;

// ---------------- 其余 ----------------
$('play').onclick=()=>playing?pause():play();
$('toStart').onclick=toStart;
$('helpBtn').onclick=()=>$('help').classList.add('show');
$('helpClose').onclick=()=>$('help').classList.remove('show');
$('help').onclick=e=>{ if(e.target.id==='help') $('help').classList.remove('show'); };


// ---------------- 悬停提示（浮层） ----------------
(function(){
  const box=$('tipbox'); let cur=null;
  function place(){ if(!cur||!cur.isConnected){ hide(); return; }
    const r=cur.getBoundingClientRect(), b=box.getBoundingClientRect(), m=7;
    let top=r.bottom+m; if(top+b.height>innerHeight-6) top=r.top-m-b.height;          // 下面放不下就放上面
    const left=clamp(r.left+r.width/2-b.width/2,6,innerWidth-b.width-6);              // 不出窗口左右边
    box.style.left=left+'px'; box.style.top=Math.max(6,top)+'px'; }
  function hide(){ cur=null; box.classList.remove('show'); }
  document.addEventListener('mouseover',e=>{ const el=e.target.closest&&e.target.closest('[data-tip]');
    if(el===cur) return; if(!el) return hide(); cur=el; box.textContent=el.dataset.tip; box.classList.add('show'); place(); });
  document.addEventListener('mouseleave',hide); document.addEventListener('pointerdown',hide,true); window.addEventListener('blur',hide);
  document.addEventListener('scroll',hide,true);
})();

