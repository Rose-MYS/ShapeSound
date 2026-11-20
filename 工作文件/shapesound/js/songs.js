"use strict";
/* 形声 · 示例曲（记谱 + 画画用的谱子） */
// ---------------- 示例曲 ----------------
// 记谱：[行, 时值]，行号从最低音 0 往上数；null 是休止。时值的单位由每首曲子自己定（拍 / 步）。
// 一页 = 16 拍；每个音画成一小段横线，尾巴留一步空，同音连弹也能分开。
function songStrokes(notes,ink,o={}){
  const spb=o.spb||2, mul=o.mul||spb, P=16*spb, top=o.top||14, out=[];
  let st=(o.offset||0)*mul; const loop=(o.loop||0)*mul;
  for(const [r,d0] of notes){ const d=d0*mul;
    if(r!==null){ let s0=loop?((st%loop)+loop)%loop:st;
      const pg=Math.floor(s0/P), ls=s0-pg*P, y=+(1-r/top).toFixed(4);
      const x0=+((ls+.15)/P).toFixed(4), x1=+((ls+d-1-.15)/P).toFixed(4);
      out.push({pg,s:{ink,pts:d>=2?[[x0,y],[x1,y]]:[[x0,y]]}}); }
    st+=d;
  }
  return out;
}
const rep=(a,n)=>Array.from({length:n},()=>a).flat();
// 画画用的小工具
const P2=(x,y)=>[+clamp(x,0,.999).toFixed(4),+clamp(y,0,1).toFixed(4)];
function curve(f,n,a=0,b=1){ const pts=[]; for(let i=0;i<=n;i++) pts.push(P2(...f(a+(b-a)*i/n))); return pts; }
function ellipse(cx,cy,rx,ry,n=40,a0=0,a1=Math.PI*2){ return curve(t=>[cx+rx*Math.cos(t),cy+ry*Math.sin(t)],n,a0,a1); }
function heart(cx,cy,w,h,n=56){ return curve(t=>{ const X=16*Math.sin(t)**3, Y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t); return [cx+X/16*w, cy-Y/17*h]; },n,0,Math.PI*2); }
function rng(seed){ return ()=>{ seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const PENT={scale:'majPent',range:3,quant:'16'};   // 画画类：大调五声（怎么画都好听）、3 个八度（16 行）

const SONG_GROUPS=[
  {name:'简单儿歌', hint:'一听就会，第一次玩从这里开始', ids:['twinkle','tigers','birthday','jingle']},
  {name:'经典名曲 · 挑战', hint:'音更多、更密，看看画面能有多复杂', ids:['ode','canon','elise']},
  {name:'搞怪 · 好玩', hint:'不按常理出牌，居然也挺好听', ids:['rain','cat','chip','coaster']},
  {name:'像画一样的谱子', hint:'先是一幅画，按下播放才发现是音乐', ids:['smile','heart','waves','sunset']},
];
const SONGS=[
  // ---------- 简单儿歌（C 大调、2 个八度：行 0 = C4，7 = C5，14 = C6；贝斯颜色自动低一个八度） ----------
  { id:'twinkle', title:'小星星', icon:'★', ink:0, meta:'键盘 + 贝斯 · 3 页',
    tip:'<b>试试：</b>用橡皮擦掉几个音，换个颜色自己画回去。', settings:{bpm:100},
    parts:()=>{ const L1=[[7,1],[7,1],[11,1],[11,1],[12,1],[12,1],[11,2]], L2=[[10,1],[10,1],[9,1],[9,1],[8,1],[8,1],[7,2]],
                      L3=[[11,1],[11,1],[10,1],[10,1],[9,1],[9,1],[8,2]];
      const B1=[[0,2],[0,2],[3,2],[0,2]], B2=[[3,2],[0,2],[4,2],[0,2]], B3=[[0,2],[3,2],[0,2],[4,2]];
      return [...songStrokes([...L1,...L2,...L3,...L3,...L1,...L2],0), ...songStrokes([...B1,...B2,...B3,...B3,...B1,...B2],7)]; } },
  { id:'tigers', title:'两只老虎（轮唱）', icon:'🐯', ink:1, meta:'拨弦 + 马林巴 + 贝斯 · 2 页',
    tip:'两种颜色是同一段旋律，晚两小节进来就成了轮唱。<b>试试：</b>换个颜色画第三遍。', settings:{bpm:130},
    parts:()=>{ const mel=[...rep([[7,1],[8,1],[9,1],[7,1]],2), ...rep([[9,1],[10,1],[11,2]],2),
                         ...rep([[11,.5],[12,.5],[11,.5],[10,.5],[9,1],[7,1]],2), ...rep([[7,1],[4,1],[7,2]],2)];
      return [...songStrokes(mel,1), ...songStrokes(mel,3,{offset:8,loop:32}), ...songStrokes(rep([[0,2],[4,2]],8),7)]; } },
  { id:'birthday', title:'生日快乐', icon:'🎂', ink:6, meta:'风铃 + 贝斯 · 2 页 · 三拍子',
    tip:'三拍子的歌。<b>试试：</b>把速度拖慢一点，再打开 <b>•••</b> 琶音。', settings:{quant:'8t',bpm:150},
    // 时值单位 = 步（1/8 三连音量化，一拍 3 步）；四分音符 = 4 步，一小节 12 步，一页 4 小节
    parts:()=>{ const o={spb:3,mul:1};
      const mel=[[5,4],[4,4],[7,4], [6,8],[4,3],[4,1], [5,4],[4,4],[8,4], [7,8],[4,3],[4,1],
                 [11,4],[9,4],[7,4], [6,4],[5,4],[10,3],[10,1], [9,4],[7,4],[8,4], [7,8],[4,3],[4,1]];
      const bass=[0,4,4,0,0,3,4,0].map(r=>[r,12]);
      return [...songStrokes(mel,6,o), ...songStrokes(bass,7,o)]; } },
  { id:'jingle', title:'铃儿响叮当', icon:'🔔', ink:2, meta:'钟 + 贝斯 + 鼓伴奏 · 4 页',
    tip:'已经打开了 <b>••</b> 鼓。<b>试试：</b>再点开 <b>•</b> 贝斯和 <b>•••</b> 琶音。', settings:{bpm:140,beats:2},
    parts:()=>{ const b12=rep([[9,1],[9,1],[9,2]],2), b34=[[9,1],[11,1],[7,1.5],[8,.5],[9,4]],
                      b56=[[10,1],[10,1],[10,1.5],[10,.5],[10,1],[9,1],[9,1],[9,.5],[9,.5]];
      const mel=[...b12,...b34,...b56,[9,1],[8,1],[8,1],[9,1],[8,2],[11,2], ...b12,...b34,...b56,[11,1],[11,1],[10,1],[8,1],[7,4]];
      const C=[[0,2],[4,2]], F=[[3,2],[0,2]], D=[[1,2],[5,2]], G=[[4,2],[1,2]];
      const bass=[...C,...C,...C,...C,...F,...C,...D,...G, ...C,...C,...C,...C,...F,...C,...G,[0,4]];
      return [...songStrokes(mel,2), ...songStrokes(bass,7)]; } },

  // ---------- 经典名曲 · 挑战 ----------
  { id:'ode', title:'欢乐颂', icon:'♫', ink:4, meta:'贝多芬 · 长笛 + 贝斯 · 2 页',
    tip:'旋律一步一步走，线条像爬楼梯。<b>试试：</b>选风铃，在上面画一条波浪当装饰。', settings:{bpm:110},
    parts:()=>{ const A=[[9,1],[9,1],[10,1],[11,1],[11,1],[10,1],[9,1],[8,1],[7,1],[7,1],[8,1],[9,1]];
      const mel=[...A,[9,1.5],[8,.5],[8,2],...A,[8,1.5],[7,.5],[7,2]];
      const bass=[0,0,4,4,0,0,0,4, 0,0,4,4,0,0,4,0].map(r=>[r,2]);
      return [...songStrokes(mel,4), ...songStrokes(bass,7)]; } },
  { id:'canon', title:'卡农', icon:'🎻', ink:5, meta:'帕赫贝尔 · 三个声部依次进来 · 3 页',
    tip:'同一段旋律，三种颜色一页晚一页地叠上去。<b>试试：</b>打开 Pages，看三页怎么越来越满。',
    settings:{key:2,range:3,bpm:84},
    // D 大调、3 个八度：行 0 = D3，7 = D4，14 = D5，21 = D6
    parts:()=>{ const o=x=>({top:21,offset:x});
      const bass=[7,4,5,2,3,0,3,4].map(r=>[r,2]);
      const v1=[16,15,14,13,12,11,12,13].map(r=>[r,2]), v2=[14,13,12,11,10,9,10,8].map(r=>[r,2]);
      const v3=[7,9,11,10,9,7,9,8,7,5,7,11,10,12,11,10].map(r=>[r,1]);
      return [...[0,16,32].flatMap(x=>songStrokes(bass,7,o(x))),
              ...songStrokes(v1,5,o(0)), ...songStrokes(v2,5,o(16)), ...songStrokes(v3,5,o(32)),
              ...songStrokes(v1,4,o(16)), ...songStrokes(v2,4,o(32)), ...songStrokes(v1,0,o(32))]; } },
  { id:'elise', title:'致爱丽丝', icon:'🎹', ink:0, meta:'贝多芬 · 半音阶 · 十六分音符 · 1 页',
    tip:'开头那串 E–D♯ 来回跳，要用到「半音阶」。<b>试试：</b>打开网格，找找哪两行是 E 和 D♯。',
    settings:{key:4,scale:'chromatic',range:3,octave:-1,quant:'8t',bpm:140},
    // 半音阶、3 个八度、低一个八度：行 0 = E2 … 36 = E5。时值单位 = 十六分音符（1 步），一小节（3/8）6 步，一页 8 小节
    parts:()=>{ const o={spb:3,mul:1,top:36};
      const b1=[[36,1],[35,1],[36,1],[31,1],[34,1],[32,1]], b2=[[29,2],[null,1],[20,1],[24,1],[29,1]],
            b3=[[31,2],[null,1],[24,1],[28,1],[31,1]], b4=[[32,2],[null,1],[24,1],[36,1],[35,1]],
            b7=[[31,2],[null,1],[24,1],[32,1],[31,1]], b8=[[29,2],[null,2],[36,1],[35,1]];
      const LA=[[5,1],[12,1],[17,1],[null,3]], LE=[[0,1],[12,1],[16,1],[null,3]], R6=[[null,6]];
      return [...songStrokes([...b1,...b2,...b3,...b4,...b1,...b2,...b7,...b8],0,o),
              ...songStrokes([...R6,...LA,...LE,...LA,...R6,...LA,...LE,...LA],3,o)]; } },

  // ---------- 搞怪 · 好玩 ----------
  { id:'rain', title:'下雨啦（全是点）', icon:'☔', ink:6, meta:'一根线都没有 · 2 页',
    tip:'每个点都是一滴雨，五声音阶怎么落都好听。<b>试试：</b>闭着眼睛在空白处乱点。',
    settings:{...PENT,bpm:84},
    pages:()=>[7,23].map(seed=>{ const r=rng(seed), out=[];
      for(let i=0;i<64;i++){
        if(r()<.42){ const row=7+Math.floor(r()*9); out.push({ink:r()<.7?6:4,pts:[P2((i+.3)/64,1-row/15)]}); }
        if(i%8===0) out.push({ink:3,pts:[P2((i+.3)/64,1-Math.floor(r()*4)/15)]});   // 低音「滴答」
      }
      return out; }) },
  { id:'cat', title:'猫在键盘上散步', icon:'🐾', ink:0, meta:'随机乱走的点 · 2 页',
    tip:'小猫一步一步走，偶尔一跳，最后一屁股坐在键盘上。<b>试试：</b>把速度拉到最快。',
    settings:{...PENT,quant:'8',bpm:120},
    pages:()=>[3,9].map(seed=>{ const r=rng(seed), out=[]; let row=8;
      for(let i=0;i<31;i++){ const u=r(); if(u<.15) continue;            // 停下来舔爪子
        if(u<.25) row+=(r()<.5?-1:1)*(5+Math.floor(r()*3));               // 跳一下
        else row+=[-2,-1,1,2][Math.floor(r()*4)];                          // 走一步
        row=clamp(row,1,15); out.push({ink:i%2?8:0,pts:[P2((i+.3)/32,1-row/15)]}); }
      out.push({ink:7,pts:[P2(.982,1-12/15),P2(.982,1-3/15)]});             // 坐到键盘上：一个和弦
      return out; }) },
  { id:'chip', title:'8-bit 小冒险', icon:'👾', ink:8, meta:'原创 · 像老游戏机 · 鼓伴奏 · 2 页',
    tip:'快速上下跳的音就是老游戏机的味道。<b>试试：</b>点「随机换音色」，听听像不像别的游戏。',
    settings:{bpm:150,beats:2},
    parts:()=>{ const A=[[7,.5],[9,.5],[11,.5],[14,.5],[11,.5],[9,.5],[7,1]], B=[[8,.5],[10,.5],[12,.5],[10,.5],[8,1],[null,1]],
                      C=[[9,.5],[11,.5],[13,.5],[11,.5],[9,.5],[11,.5],[13,1]], D=[[14,.5],[13,.5],[12,.5],[11,.5],[12,1],[11,1]],
                      E=[[9,.5],[9,.5],[11,.5],[9,.5],[7,.5],[9,.5],[8,1]], F=[[7,.5],[11,.5],[14,1],[7,2]];
      const hop=(r,n=4)=>rep([[r,.5],[r+7,.5]],n);
      const bass=[...hop(0),...hop(1),...hop(2),...hop(4),...hop(0),...hop(1),...hop(0,2),...hop(4,2),...hop(0)];
      return [...songStrokes([...A,...B,...C,...D,...A,...B,...E,...F],8), ...songStrokes(bass,7)]; } },
  { id:'coaster', title:'过山车', icon:'🎢', ink:8, meta:'一条长长的斜线 · 1 页',
    tip:'慢慢爬坡是一级一级往上，俯冲就是一大把音一起滑下来。<b>试试：</b>自己画一个更疯狂的。',
    settings:{...PENT,bpm:96},
    pages:()=>{ const track=[P2(.01,.9),P2(.26,.1),P2(.33,.86),P2(.41,.42),P2(.47,.78),
        ...curve(t=>[.56+.06*Math.cos(t)+.05*(Math.PI/2-t)/(2*Math.PI), .52+.24*Math.sin(t)],28,Math.PI/2,Math.PI/2-2*Math.PI),
        ...curve(t=>[.68+.31*t, .76-.16*Math.abs(Math.sin(t*Math.PI*3))*(1-t*.6)],30)];
      return [[ {ink:8,pts:track},
        ...[.08,.18,.37,.75,.9].map(x=>({ink:7,pts:[P2(x,.97),P2(x,.86)]})),   // 支架
        {ink:1,pts:[P2(.26,.04)]},{ink:1,pts:[P2(.275,.04)]} ]]; } },          // 尖叫！

  // ---------- 像画一样的谱子 ----------
  { id:'smile', title:'笑脸和气球', icon:'☺', ink:3, meta:'圆圈会变成上下两条旋律 · 1 页',
    tip:'圆圈的上半圈和下半圈同时响，就成了两个声部。<b>试试：</b>给它画上头发。',
    settings:{...PENT,bpm:84},
    pages:()=>[[ {ink:3,pts:ellipse(.5,.48,.17,.4,48)},
      {ink:4,pts:ellipse(.44,.35,.018,.055,12)},{ink:4,pts:ellipse(.56,.35,.018,.055,12)},
      {ink:1,pts:ellipse(.5,.5,.1,.2,20,.15*Math.PI,.85*Math.PI)},
      {ink:5,pts:[P2(.39,.57)]},{ink:5,pts:[P2(.61,.57)]},
      {ink:1,pts:ellipse(.13,.26,.055,.15,24)},{ink:7,pts:curve(t=>[.13+.015*Math.sin(t*12),.41+.45*t],14)},
      {ink:4,pts:ellipse(.87,.3,.055,.15,24)},{ink:7,pts:curve(t=>[.87+.015*Math.sin(t*12),.45+.41*t],14)},
      {ink:2,pts:ellipse(.25,.2,.035,.09,18)},{ink:7,pts:[P2(.25,.29),P2(.24,.6)]} ]] },
  { id:'heart', title:'爱心', icon:'♥', ink:1, meta:'一大两小三颗心 · 1 页',
    tip:'心形的尖儿会响成一串滑音。<b>试试：</b>在中间再画一颗小心。',
    settings:{...PENT,bpm:80},
    pages:()=>[[ {ink:1,pts:heart(.5,.42,.17,.4)}, {ink:5,pts:heart(.5,.45,.09,.2,40)},
      {ink:5,pts:heart(.15,.4,.06,.15,32)}, {ink:5,pts:heart(.85,.4,.06,.15,32)},
      ...[[.06,.15],[.3,.1],[.7,.12],[.94,.18],[.24,.75],[.78,.78]].map(([x,y])=>({ink:6,pts:[P2(x,y)]})),
      {ink:2,pts:curve(t=>[.01+.98*t,.93-.03*Math.sin(t*Math.PI*6)],40)} ]] },
  { id:'waves', title:'海浪', icon:'🌊', ink:4, meta:'三条波浪 · 1 页',
    tip:'波浪一上一下，就是一段段起伏的旋律。<b>试试：</b>把其中一条换成贝斯颜色。',
    settings:{...PENT,bpm:76},
    pages:()=>[[ {ink:6,pts:curve(t=>[.01+.98*t,.38+.06*Math.sin(2*Math.PI*3*t+1)],48)},
      {ink:4,pts:curve(t=>[.01+.98*t,.56+.1*Math.sin(2*Math.PI*2*t)],48)},
      {ink:0,pts:curve(t=>[.01+.98*t,.8+.06*Math.sin(2*Math.PI*1.5*t+2)],40)},
      ...[.125,.625].map(x=>({ink:6,pts:[P2(x,.4)]})),
      ...[[.18,.12],[.24,.08],[.7,.14]].map(([x,y])=>({ink:7,pts:[P2(x-.015,y-.035),P2(x,y),P2(x+.015,y-.035)]})) ]] },
  { id:'sunset', title:'山和太阳', icon:'⛰', ink:2, meta:'山、太阳、飞鸟 · 1 页',
    tip:'山的轮廓就是旋律线，太阳是一个小圆圈和弦。<b>试试：</b>把山画得更高更尖。',
    settings:{...PENT,bpm:84},
    pages:()=>[[ {ink:2,pts:[[0,.8],[.08,.62],[.15,.74],[.25,.44],[.33,.62],[.4,.55],[.5,.78],[.6,.5],[.7,.66],[.78,.58],[.88,.75],[.999,.6]].map(p=>P2(...p))},
      {ink:5,pts:curve(t=>[.01+.98*t,.9+.04*Math.sin(2*Math.PI*1.5*t)],36)},
      {ink:1,pts:ellipse(.72,.25,.05,.12,24)},
      ...Array.from({length:6},(_,k)=>{ const a=k/6*Math.PI*2; return {ink:1,pts:[P2(.72+.07*Math.cos(a),.25+.17*Math.sin(a)),P2(.72+.09*Math.cos(a),.25+.22*Math.sin(a))]}; }),
      ...[[.18,.2],[.24,.14],[.3,.22],[.45,.12]].map(([x,y])=>({ink:7,pts:[P2(x-.015,y-.035),P2(x,y),P2(x+.015,y-.035)]})) ]] },
];
const songById=id=>SONGS.find(x=>x.id===id);
function songPages(song){
  if(song.pages) return song.pages();
  const parts=song.parts(), n=Math.max(...parts.map(p=>p.pg))+1, pages=Array.from({length:n},()=>[]);
  parts.forEach(p=>pages[p.pg].push(p.s)); return pages;
}
function songObject(song){
  const pages=songPages(song);
  return {app:'xingsheng',version:3,
    settings:{...S, key:0, scale:'major', range:2, octave:0, cents:0, quant:'8', swing:'off', beats:0, bpm:120,
              grid:false, mode:1, ink:song.ink, ...(song.settings||{})},
    tracks:[{pages:pages.map(l=>({strokes:l,bars:1})),pageIndex:0}], trackIndex:0, timelineOn:pages.length>1};
}
function playSong(song){
  const msg=stashCurrent();
  if(playing) pause();
  load(songObject(song)); setCurrent({sample:song.id});
  closeSamples(); play();
  const gridHint=updateGridPulse()?' · 点左边闪烁的网格按钮，能看到每个音的名字':'';
  toast(`▶ 正在播放《${song.title}》`+gridHint+(msg?'。'+msg:''), gridHint||msg?4200:1800);
}
function renderSongs(){
  const el=$('songList'); el.innerHTML='';
  SONG_GROUPS.forEach(g=>{
    const h=document.createElement('div'); h.className='sgroup'; h.innerHTML=`<b>${g.name}</b><span>${g.hint}</span>`; el.appendChild(h);
    const box=document.createElement('div'); box.className='songs';
    g.ids.map(songById).forEach(song=>{ const b=document.createElement('button'); b.className='song';
      b.innerHTML=`<span class="pic" style="background:${PALETTES[S.palette][song.ink]}">${song.icon}</span>
        <span><div class="t">${song.title}</div><div class="m">${song.meta}</div><div class="d">${song.tip}</div></span>`;
      b.onclick=()=>playSong(song); box.appendChild(b); });
    el.appendChild(box);
  });
}
function openSamples(first){
  $('samplesTitle').textContent=first?'欢迎来到「形声」！先听一首？':'示例曲';
  renderSongs(); $('samples').classList.add('show');
}
function closeSamples(){ $('samples').classList.remove('show'); try{ localStorage.setItem('xingsheng.welcomed','1'); }catch(e){} }
$('samplesBtn').onclick=()=>openSamples(false);
$('samplesClose').onclick=closeSamples;
$('samplesSkip').onclick=()=>{ closeSamples(); newWork(); };
$('samples').onclick=e=>{ if(e.target.id==='samples') closeSamples(); };

