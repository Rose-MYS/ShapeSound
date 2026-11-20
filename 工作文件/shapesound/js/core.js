"use strict";
/* 形声 · 音乐数据、状态、音符计算、音频引擎、伴奏、调度器 */
/* =====================================================================
   形声 —— 画线即作曲的可视化乐器
   纯原生 JS + Web Audio API + Web MIDI API，无依赖、双击 index.html 即可离线运行
   ===================================================================== */

// ---------------- 音乐数据 ----------------
const KEY_NAMES  = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const NAMES_SHARP= ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const NAMES_FLAT = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const SCALES = {
  majPent:{name:'大调五声',iv:[0,2,4,7,9]},     minPent:{name:'小调五声',iv:[0,3,5,7,10]},
  major:{name:'大调',iv:[0,2,4,5,7,9,11]},       minor:{name:'自然小调',iv:[0,2,3,5,7,8,10]},
  harmMinor:{name:'和声小调',iv:[0,2,3,5,7,8,11]},dorian:{name:'Dorian 多利亚',iv:[0,2,3,5,7,9,10]},
  phrygian:{name:'Phrygian 弗里几亚',iv:[0,1,3,5,7,8,10]}, lydian:{name:'Lydian 利底亚',iv:[0,2,4,6,7,9,11]},
  mixolydian:{name:'Mixolydian 混合利底亚',iv:[0,2,4,5,7,9,10]}, blues:{name:'布鲁斯',iv:[0,3,5,6,7,10]},
  chromatic:{name:'半音阶（全部 12 个音）',iv:[0,1,2,3,4,5,6,7,8,9,10,11]},
};
const MINORISH = new Set(['minor','minPent','blues','phrygian','dorian','harmMinor']);
const QUANT = {'4':{label:'1/4',n:4},'8':{label:'1/8',n:8},'8t':{label:'1/8 三连音',n:12,trip:true},
  '16':{label:'1/16',n:16},'16t':{label:'1/16 三连音',n:24,trip:true},'32':{label:'1/32',n:32}};
const SWING = {off:{label:'关',v:0},light:{label:'轻',v:.10},medium:{label:'中',v:.20},hard:{label:'重',v:.33}};
const INSTR = ['键盘','拨弦','钟','马林巴','长笛','弦乐','风铃','贝斯','8-bit','铜管','管风琴','竖琴','电钢琴','合唱','鼓组'];
const NINK = INSTR.length, DRUM_INK = 14;   // 鼓组：线越低越是底鼓，越高越是镲
const PALETTES = [
  ['#2a9d8f','#e2553a','#7b6cf6','#f2a23a','#3a5bd9','#e06aa8','#79bfe9','#2b2b2b','#f0bf8a','#c9a227','#8e3b46','#8cc152','#1f6f8b','#c79be0','#8a8a8a'],   // 明亮
  ['#1e6fa8','#c8382b','#e5b23b','#2e7d5b','#9d2933','#3b3f52','#a0522d','#7fa9bd','#7e5aa8','#d9b611','#4c221b','#789262','#065279','#cca4e3','#75878a'],   // 国色：石青 朱砂 藤黄 松绿 胭脂 黛 赭石 月白 青莲 秋香 紫檀 竹青 靛蓝 丁香 苍
  ['#00b3a4','#ff5d73','#a78bfa','#ffb020','#4f7cff','#ff7ac6','#5ad1ff','#8a8f9c','#ffd08a','#ffe14d','#c2185b','#a3e635','#22d3ee','#e9a8ff','#9ca3af'],   // 霓虹
];
const PAPERS = ['paper','sky','night','photo'];
const PAPER_NAMES = {paper:'纸',sky:'天空',night:'夜',photo:'照片'};

// ---------------- 状态 ----------------
const S = { key:0, scale:'majPent', range:3, octave:0, cents:0, quant:'8t', swing:'off', beats:0,
            click:false, midi:false, paper:'paper', palette:0, grid:false, bpm:120, ink:0,
            mode:1 };
// Pages：时间线 → 页 → 线条。一页 = 一圈循环的画；bars = 这一页占几个小节（与原作一致，网页版一小节即一圈）
const newTrack = () => ({ pages:[{strokes:[], bars:1}], pageIndex:0, played:0, collapsed:false });
let tracks = [newTrack()], trackIndex = 0, timelineOn = false;
let strokes = tracks[0].pages[0].strokes;
function syncStrokes(){ const t=tracks[trackIndex]; t.pageIndex=clamp(t.pageIndex,0,t.pages.length-1); strokes=t.pages[t.pageIndex].strokes; }
// 正在发声的线：时间线打开时是每条时间线当前那一页叠在一起；关闭时只有眼前这一页
const playingLists = () => timelineOn ? tracks.map(t=>t.pages[t.pageIndex].strokes) : [strokes];
let tool = 'draw';
let undoStack = [], redoStack = [];

// ---------------- 小工具 ----------------
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
function toast(m,ms=1800){ const t=$('toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),ms); }
function download(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000); }
function stamp(){ const d=new Date(),p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }

// ---------------- 音高网格 ----------------
function rows(){
  const iv = SCALES[S.scale].iv, base = 60 + S.key + 12*S.octave - (S.range===3 ? 12 : 0), out = [];
  for(let o=0;o<S.range;o++) for(const i of iv) out.push(base + 12*o + i);
  out.push(base + 12*S.range);
  return out;
}
function noteName(m){
  const flat = [1,3,5,8,10].includes(S.key) || (MINORISH.has(S.scale) && [0,2,5,7].includes(S.key));
  return (flat ? NAMES_FLAT : NAMES_SHARP)[((m%12)+12)%12] + (Math.floor(m/12)-1);
}
const freqOf = m => 440 * Math.pow(2, (m-69)/12 + S.cents/1200);
// 时间结构：一小节 = 8 拍（拍长 60/BPM 秒）；宽屏一张纸放 2 小节（16 拍），手机放 1 小节。120 BPM 时一圈 8 秒。
const PULSES = 8, BARS = window.innerWidth >= 700 ? 2 : 1;
const stepsPerBeat = () => QUANT[S.quant].n / 4;            // 1/4→1, 1/8→2, 1/8 三连→3, 1/16→4, 1/16 三连→6, 1/32→8
const stepsPerBar  = () => stepsPerBeat() * PULSES;
const stepsPerLoop = () => stepsPerBar() * BARS;
const stepDur = () => (60/S.bpm) / stepsPerBeat();
const swingOffset = step => QUANT[S.quant].trip ? 0 : (step%2===1 ? SWING[S.swing].v * stepDur() : 0);

// ---------------- 线条 → 音符事件 ----------------
// 把一圈循环分成 N 步；每条线在每一步覆盖的音阶行组成集合；同一音高在相邻步中连续出现就合并成一个长音。
let events = [];
const yToRow = (y,n) => clamp(Math.round((1-y)*(n-1)), 0, n-1);
let cellSets = new WeakMap();      // 每条线在每一步覆盖的音阶行（像素模式用）
let soundMask = [];                // 每一步哪些乐器在响（舞台模式用）
function computeEvents(){
  const N = stepsPerLoop(), n = rows().length;
  events = Array.from({length:N}, () => []); soundMask = new Array(N).fill(0); cellSets = new WeakMap();
  for(const s of playingLists().flat()){
    const sets = Array.from({length:N}, () => new Set());
    cellSets.set(s, sets);
    const addSeg = (x0,y0,x1,y1) => {
      if(x1 < x0){ [x0,x1]=[x1,x0]; [y0,y1]=[y1,y0]; }
      const i0 = clamp(Math.floor(x0*N),0,N-1), i1 = clamp(Math.floor(x1*N),0,N-1), dx = x1-x0;
      for(let i=i0;i<=i1;i++){
        const a = Math.max(x0,i/N), b = Math.min(x1,(i+1)/N);
        const ya = dx>1e-9 ? y0+(y1-y0)*(a-x0)/dx : y0, yb = dx>1e-9 ? y0+(y1-y0)*(b-x0)/dx : y1;
        const ra = yToRow(ya,n), rb = yToRow(yb,n);
        for(let r=Math.min(ra,rb); r<=Math.max(ra,rb); r++) sets[i].add(r);
      }
    };
    const P = s.pts;
    if(P.length===1) addSeg(P[0][0],P[0][1],P[0][0],P[0][1]);
    for(let k=1;k<P.length;k++) addSeg(P[k-1][0],P[k-1][1],P[k][0],P[k][1]);
    for(let i=0;i<N;i++) for(const r of sets[i]){
      if(sets[(i-1+N)%N].has(r)){ if(i!==0 || !sets.every(st=>st.has(r))) continue; }
      let len = 1; while(len<N && sets[(i+len)%N].has(r)) len++;
      events[i].push({row:r, len, ink:s.ink});
      for(let j=0;j<len;j++) soundMask[(i+j)%N] |= 1<<s.ink;
    }
  }
}

// ---------------- 音频引擎 ----------------
let ctx=null, chain=null, recDest=null;
function makeImpulse(ac, secs=1.8){
  const len=Math.floor(ac.sampleRate*secs), buf=ac.createBuffer(2,len,ac.sampleRate);
  for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
  return buf;
}
function buildChain(ac, dest){
  const input=ac.createGain(); input.gain.value=.9;
  const comp=ac.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=4; comp.attack.value=.005; comp.release.value=.2;
  const verb=ac.createConvolver(); verb.buffer=makeImpulse(ac);
  const wet=ac.createGain(); wet.gain.value=.22;
  input.connect(comp); input.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(dest);
  return {input, comp};
}
function ensureAudio(){
  if(!ctx){
    ctx = new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
    chain = buildChain(ctx, ctx.destination);
    if(ctx.createMediaStreamDestination){ recDest = ctx.createMediaStreamDestination(); chain.comp.connect(recDest); }
  }
  if(ctx.state==='suspended') ctx.resume();
  return ctx;
}

/* 十五种乐器，全部实时合成。返回 {release(t)} 供实时演奏松键用。 */
// 鼓组：看这个音在当前音阶里的相对高度，决定敲哪一件鼓（0 底鼓 1 通鼓 2 军鼓 3 闭镲 4 开镲 5 吊镲）
function drumKind(f){
  const m=69+12*Math.log2(f/440)-S.cents/100, R=rows(); let best=0;
  R.forEach((x,i)=>{ if(Math.abs(x-m)<Math.abs(R[best]-m)) best=i; });
  return drumKindAt(best/Math.max(1,R.length-1));
}
const drumKindAt=p=>p<.2?0:p<.35?1:p<.55?2:p<.75?3:p<.9?4:5;
function drumHit(ac,out,k,t,vel){
  const P=[{sines:[[160,1,[46,.035]],[320,.12,[90,.02]]],peak:1.3,tau:.14,len:.6},   // 底鼓
           {sines:[[200,1,[110,.08]]],noise:{amp:.08},peak:.9,tau:.18,len:.6},       // 通鼓
           {sines:[[200,.3,[160,.05]]],noise:{amp:.55,hp:1200},peak:1,tau:.07,len:.35}, // 军鼓
           {noise:{amp:.5,hp:7000},peak:.4,tau:.02,len:.1},                        // 闭镲
           {noise:{amp:.5,hp:6500},peak:.35,tau:.16,len:.6},                       // 开镲
           {noise:{amp:.6,hp:4500},peak:.42,tau:.55,len:2.2}][k];                  // 吊镲
  hit(ac,out,t,{...P,peak:P.peak*vel*.75});
}
function voice(ac, out, ink, f, t, dur, vel=.8){
  if(ink===DRUM_INK){ drumHit(ac,out,drumKind(f),t,vel); return {release(){}}; }
  const g=ac.createGain(); g.gain.value=0; g.connect(out);
  const nodes=[], G=g.gain;
  const osc=(type,freq)=>{ const o=ac.createOscillator(); o.type=type; o.frequency.value=freq; nodes.push(o); return o; };
  const amp=v=>{ const x=ac.createGain(); x.gain.value=v; return x; };
  const D=Math.max(dur,.1); let end;
  const vibrato=(target,rate,depth,delay)=>{ const l=osc('sine',rate), lg=amp(0); l.connect(lg); lg.connect(target); lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(depth,t+delay); };
  switch(ink){
    case 0:{ // 键盘：三角波 + 八度泛音，打击后衰减到持续音
      const o1=osc('triangle',f), o2=osc('sine',f*2), a=amp(.22); o1.connect(g); o2.connect(a); a.connect(g);
      const pk=.32*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.004); G.setTargetAtTime(pk*.35,t+.004,.12);
      G.setTargetAtTime(0,t+D,.12); end=t+D+.9; break; }
    case 1:{ // 拨弦：锯齿波 + 快速收拢的低通滤波
      const o=osc('sawtooth',f), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=2;
      lp.frequency.setValueAtTime(Math.min(f*10,12000),t); lp.frequency.setTargetAtTime(f*1.2,t,.09);
      o.connect(lp); lp.connect(g);
      const pk=.26*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.002); G.setTargetAtTime(0,t+.002,.32);
      G.setTargetAtTime(0,t+D,.08); end=t+Math.min(D,1.6)+.6; break; }
    case 2:{ // 钟：FM 合成
      const car=osc('sine',f), mod=osc('sine',f*3.5), mg=amp(0); mod.connect(mg); mg.connect(car.frequency); car.connect(g);
      mg.gain.setValueAtTime(f*2.2,t); mg.gain.setTargetAtTime(f*.2,t,.25);
      const pk=.24*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.003); G.setTargetAtTime(0,t+.003,.7);
      G.setTargetAtTime(0,t+Math.max(D,.2),.35); end=t+Math.max(D,.2)+1.8; break; }
    case 3:{ // 马林巴：基音 + 4 倍泛音快速衰减
      const o1=osc('sine',f), o2=osc('sine',f*3.98), a=amp(0); o1.connect(g); o2.connect(a); a.connect(g);
      a.gain.setValueAtTime(.35,t); a.gain.setTargetAtTime(0,t,.018);
      const pk=.42*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.003); G.setTargetAtTime(0,t+.003,.16);
      G.setTargetAtTime(0,t+D,.05); end=t+Math.min(D+.4,1.6); break; }
    case 4:{ // 长笛：正弦 + 少量三角波 + 渐入的颤音 + 气声
      const o1=osc('sine',f), o2=osc('triangle',f*2), a=amp(.08); o1.connect(g); o2.connect(a); a.connect(g);
      vibrato(o1.frequency,5.2,f*.008,.25);
      const nb=ac.createBuffer(1,ac.sampleRate*.3,ac.sampleRate), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
      const ns=ac.createBufferSource(); ns.buffer=nb; const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f*2; bp.Q.value=1.5;
      const na=amp(0); ns.connect(bp); bp.connect(na); na.connect(g); na.gain.setValueAtTime(.5,t); na.gain.setTargetAtTime(0,t,.05); nodes.push(ns);
      const pk=.26*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.06); G.setValueAtTime(pk,t+D); G.setTargetAtTime(0,t+D,.08); end=t+D+.6; break; }
    case 5:{ // 弦乐：失谐锯齿波 + 低通 + 慢起音 + 颤音
      const o1=osc('sawtooth',f*.996), o2=osc('sawtooth',f*1.004), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=Math.min(f*4,9000); lp.Q.value=.6;
      o1.connect(lp); o2.connect(lp); lp.connect(g); vibrato(o1.frequency,5,f*.006,.3); vibrato(o2.frequency,5.4,f*.006,.3);
      const pk=.11*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.12); G.setValueAtTime(pk,t+D); G.setTargetAtTime(0,t+D,.22); end=t+D+1.3; break; }
    case 6:{ // 风铃：非谐和泛音，长余音
      [[1,.5],[2.76,.25],[5.4,.13],[8.93,.06]].forEach(([r,v])=>{ if(f*r>16000) return; const o=osc('sine',f*r), a=amp(v); o.connect(a); a.connect(g);
        a.gain.setValueAtTime(v,t); a.gain.setTargetAtTime(0,t,1.1/r); });
      const pk=.3*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.002); G.setTargetAtTime(0,t+.002,1.0); end=t+3.2; break; }
    case 7:{ // 贝斯：低八度方波 + 低通
      const o=osc('square',f/2), s=osc('sine',f/2), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=4;
      lp.frequency.setValueAtTime(Math.min(f*3,3000),t); lp.frequency.setTargetAtTime(Math.min(f*1.2,900),t,.12);
      const a=amp(.6); o.connect(lp); lp.connect(g); s.connect(a); a.connect(g);
      const pk=.22*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.006); G.setTargetAtTime(pk*.6,t+.006,.15);
      G.setValueAtTime(pk*.6,t+D); G.setTargetAtTime(0,t+D,.06); end=t+D+.5; break; }
    case 9:{ // 铜管：两个略失谐的锯齿波 + 随起音打开的低通，像“吹”出来的
      const o1=osc('sawtooth',f), o2=osc('sawtooth',f*1.003), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=1.2;
      lp.frequency.setValueAtTime(f*1.2,t); lp.frequency.linearRampToValueAtTime(Math.min(f*7,9000),t+.08); lp.frequency.setTargetAtTime(Math.min(f*4,7000),t+.08,.2);
      o1.connect(lp); o2.connect(lp); lp.connect(g); vibrato(o1.frequency,5.5,f*.004,.35);
      const pk=.13*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.05); G.setTargetAtTime(pk*.8,t+.05,.2);
      G.setValueAtTime(pk*.8,t+D); G.setTargetAtTime(0,t+D,.07); end=t+D+.5; break; }
    case 10:{ // 管风琴：几根“音栓”叠在一起，按下就响、松开就停
      [[.5,.25],[1,.5],[2,.3],[3,.15],[4,.12]].forEach(([r,v])=>{ if(f*r>15000) return; const o=osc('sine',f*r), a=amp(v); o.connect(a); a.connect(g); });
      const pk=.18*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.012); G.setValueAtTime(pk,t+D); G.setTargetAtTime(0,t+D,.05); end=t+D+.4; break; }
    case 11:{ // 竖琴：明亮的拨弦，余音很长
      const o1=osc('triangle',f), o2=osc('sine',f*2), a=amp(.3); o1.connect(g); o2.connect(a); a.connect(g);
      a.gain.setValueAtTime(.3,t); a.gain.setTargetAtTime(0,t,.15);
      const pk=.34*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.003); G.setTargetAtTime(0,t+.003,.55); end=t+2.6; break; }
    case 12:{ // 电钢琴：FM 合成 + 一点“叮”的金属音
      const car=osc('sine',f), mod=osc('sine',f), mg=amp(0); mod.connect(mg); mg.connect(car.frequency); car.connect(g);
      mg.gain.setValueAtTime(f*1.4,t); mg.gain.setTargetAtTime(f*.15,t,.18);
      const tine=osc('sine',Math.min(f*7,14000)), ta=amp(0); tine.connect(ta); ta.connect(g); ta.gain.setValueAtTime(.06,t); ta.gain.setTargetAtTime(0,t,.03);
      const pk=.3*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.003); G.setTargetAtTime(pk*.4,t+.003,.4);
      G.setTargetAtTime(0,t+Math.max(D,.15),.15); end=t+Math.max(D,.15)+1; break; }
    case 13:{ // 合唱：三个失谐锯齿波 + “啊”的共振峰，慢慢起来
      const mix=amp(1); [.995,1,1.006].forEach(k=>{ const o=osc('sawtooth',f*k); o.connect(mix); vibrato(o.frequency,4.8,f*.005,.4); });
      const bp1=ac.createBiquadFilter(), bp2=ac.createBiquadFilter(); bp1.type='bandpass'; bp2.type='bandpass';
      bp1.frequency.value=750; bp2.frequency.value=1150; bp1.Q.value=4; bp2.Q.value=4;
      const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=Math.min(f*3,5000);
      const fa=amp(1.6), la=amp(.25); mix.connect(bp1); mix.connect(bp2); mix.connect(lp); bp1.connect(fa); bp2.connect(fa); lp.connect(la); fa.connect(g); la.connect(g);
      const pk=.12*vel; G.setValueAtTime(0,t); G.linearRampToValueAtTime(pk,t+.25); G.setValueAtTime(pk,t+D); G.setTargetAtTime(0,t+D,.3); end=t+D+1.6; break; }
    default:{ // 8-bit：方波，几乎没有包络
      const o=osc('square',f); o.connect(g);
      const pk=.09*vel; G.setValueAtTime(pk,t); G.setValueAtTime(pk*.8,t+.05); G.setValueAtTime(0,t+D*.92); end=t+D+.05; }
  }
  nodes.forEach(o=>{ o.start(t); o.stop(end); });
  nodes[0].onended=()=>{ try{ g.disconnect(); }catch(e){} };
  return { release(at){
    at=Math.max(at,ac.currentTime);
    if(G.cancelAndHoldAtTime) G.cancelAndHoldAtTime(at); else { G.cancelScheduledValues(at); G.setValueAtTime(G.value,at); }
    G.setTargetAtTime(0,at,.1); nodes.forEach(o=>{ try{ o.stop(at+1); }catch(e){} });
  }};
}
function clickSound(ac,out,t,accent){
  const o=ac.createOscillator(), g=ac.createGain(); o.type='square'; o.frequency.value=accent?1760:1180;
  g.gain.setValueAtTime(accent?.12:.07,t); g.gain.exponentialRampToValueAtTime(.0001,t+.04);
  o.connect(g); g.connect(out); o.start(t); o.stop(t+.05);
}

// ---------------- 伴奏：贝斯 / 鼓 / 琶音（三个圆点） ----------------
// 都长在“拍”的格子上：贝斯每拍一下；鼓是偶数拍底鼓、奇数拍军鼓，外加闭镲；
// 琶音在每个镲点上走一个 8 音的小乐句，跟着调走，小调家族的音阶换成小调乐句。
const ARP_MAJOR=[72,76,79,81,84,81,79,76], ARP_MINOR=[72,75,79,82,84,82,79,75];
const MINOR_FAMILY=new Set(['minPent','minor','harmMinor','dorian','phrygian','blues']);
const beatKey=()=>S.key>6?S.key-12:S.key;                  // 伴奏固定在 C3 附近，不随“八度”移动
const beatFreq=m=>440*Math.pow(2,(m+beatKey()-69)/12+S.cents/1200);
function beatHits(step){
  const N=stepsPerLoop(), ps=stepsPerBeat(), onBeat=step%ps===0, beatIdx=Math.floor(step/ps);
  const hatEvery=Math.max(1,Math.round(ps/4)), hatTick=(N<=32)||(step%hatEvery===0);
  const riff=MINOR_FAMILY.has(S.scale)?ARP_MINOR:ARP_MAJOR;
  return { bass:!!(S.beats&1)&&onBeat,
           kick:!!(S.beats&2)&&onBeat&&beatIdx%2===0, snare:!!(S.beats&2)&&onBeat&&beatIdx%2===1, hat:!!(S.beats&2)&&hatTick,
           arp:(S.beats&4)&&hatTick ? riff[Math.floor(step/hatEvery)%riff.length] : null };
}
const noiseCache=new WeakMap();
function noiseBuf(ac){ let b=noiseCache.get(ac); if(!b){ b=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; noiseCache.set(ac,b); } return b; }
const BEAT_GAIN=.5;
function hit(ac,out,t,{sines=[],noise=null,peak,tau,len}){
  const g=ac.createGain(); g.connect(out); g.gain.setValueAtTime(peak*BEAT_GAIN,t); g.gain.setTargetAtTime(0,t,tau);
  const srcs=[];
  for(const [f0,amp,sweep] of sines){ const o=ac.createOscillator(), a=ac.createGain(); a.gain.value=amp; o.frequency.setValueAtTime(f0,t);
    if(sweep) o.frequency.setTargetAtTime(sweep[0],t,sweep[1]); o.connect(a); a.connect(g); srcs.push(o); }
  if(noise){ const n=ac.createBufferSource(); n.buffer=noiseBuf(ac); n.loop=true; const a=ac.createGain(); a.gain.value=noise.amp; let node=n;
    if(noise.hp){ const f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=noise.hp; n.connect(f); node=f; }
    node.connect(a); a.connect(g); srcs.push(n); }
  srcs.forEach(s=>{ s.start(t); s.stop(t+len); });
}
function scheduleBeats(ac,out,step,t){
  if(!S.beats) return;
  const b=beatHits(step);
  if(b.bass){ const f=130.81*Math.pow(2,beatKey()/12+S.cents/1200); hit(ac,out,t,{sines:[[f,1],[2*f,.45]],peak:.62,tau:.24,len:1.4}); }
  if(b.kick) hit(ac,out,t,{sines:[[180,1,[48,.018]],[360,.15,[96,.018]]],peak:.62,tau:.09,len:.6});
  if(b.snare) hit(ac,out,t,{sines:[[190,.16]],noise:{amp:.2},peak:1,tau:.045,len:.3});
  if(b.hat) hit(ac,out,t,{noise:{amp:.5,hp:6500},peak:.26,tau:.012,len:.08});
  if(b.arp!==null){ const f=beatFreq(b.arp); hit(ac,out,t,{sines:[[f,1],[2*f,.5]],peak:.17,tau:.09,len:.6}); }
}

// ---------------- 调度器（提前排程，时间精确） ----------------
let playing=false, curStep=0, nextTime=0, timer=null;
const stepQueue=[], pendingRipples=[], ripples=[], rowFlash=new Map();
function scheduleStep(step,time){
  const t=time+swingOffset(step), R=rows(), n=R.length, sd=stepDur(), N=stepsPerLoop();
  const list=events[step]||[], vel=.85/Math.sqrt(Math.max(1,list.length/3));
  for(const e of list){
    voice(ctx,chain.input,e.ink,freqOf(R[e.row]),t,e.len*sd*.97,vel);
    pendingRipples.push({time:t,x:(step+.5)/N,y:1-e.row/(n-1),ink:e.ink,row:e.row});
  }
  if(S.click && step%stepsPerBeat()===0) clickSound(ctx,chain.input,t,step===0);
  scheduleBeats(ctx,chain.input,step,t);
  stepQueue.push({step,time});
}
let loopStarted=false;
function tick(){ while(nextTime<ctx.currentTime+.12){
  if(curStep===0 && loopStarted && timelineOn) advanceTimeline();
  loopStarted=true; scheduleStep(curStep,nextTime); nextTime+=stepDur(); curStep=(curStep+1)%stepsPerLoop(); } }
// 一圈结束：每条时间线看当前页放够了几遍，够了就翻到下一页（最后一页之后回到第一页）
function advanceTimeline(){
  let flipped=false;
  tracks.forEach(t=>{ const pg=t.pages[t.pageIndex];
    if(t.pages.length>1 && t.played+1>=pg.bars){ t.pageIndex=(t.pageIndex+1)%t.pages.length; t.played=0; flipped=true; } else t.played++; });
  if(flipped){ if(drawing&&!drawing.erase) drawing=null; syncStrokes(); undoStack=[]; redoStack=[]; renderUndo(); computeEvents(); renderStrip(); $('hint').style.opacity=strokes.length?0:1; }
}
function play(){
  ensureAudio(); if(playing) return;
  computeEvents(); playing=true; loopStarted=false; curStep=0; stepQueue.length=0; nextTime=ctx.currentTime+.06;
  timer=setInterval(tick,25); tick(); renderPlay();
}
function pause(){ playing=false; clearInterval(timer); stepQueue.length=0; pendingRipples.length=0; renderPlay(); document.querySelectorAll('.beat').forEach(b=>b.classList.remove('on')); }
function toStart(){ curStep=0; loopStarted=false; if(playing){ stepQueue.length=0; pendingRipples.length=0; nextTime=ctx.currentTime+.04; } else lastPhase=0; }
function renderPlay(){ $('play').innerHTML = playing ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
                                                    : '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>'; }

