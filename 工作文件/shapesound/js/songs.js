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
// 鼓组：在 top 行高的画纸上，每件鼓该画在哪一行（和 drumKindAt 的分段对应）
const DR=top=>({K:Math.round(.08*top),T:Math.round(.28*top),S:Math.round(.45*top),H:Math.round(.65*top),O:Math.round(.82*top),C:Math.round(.96*top)});
// 一小节里在第几拍敲一下（拍可以是 0.5），变成记谱
function hitsAt(row,pos,len=4){ const out=[]; let cur=0;
  [...pos].sort((a,b)=>a-b).forEach(p=>{ if(p>cur) out.push([null,p-cur]); out.push([row,.5]); cur=p+.5; });
  if(cur<len) out.push([null,len-cur]); return out; }
const bars=(fn,n)=>Array.from({length:n},(_,i)=>fn(i)).flat();

const SONG_GROUPS=[
  {name:'简单儿歌', hint:'一听就会，第一次玩从这里开始', ids:['twinkle','tigers','birthday','jingle']},
  {name:'复杂编曲 · 挑战', hint:'好几种乐器分声部，一页一页叠上去', ids:['canon','ode','minuet','elise','night','harbor']},
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

  // ---------- 复杂编曲 · 挑战（多乐器、多声部；3 个八度：行 0 = 主音低八度，7 = 中音区主音，14 = 高八度，21 = 最高） ----------
  { id:'canon', title:'卡农（大编制）', icon:'🎻', ink:5, meta:'帕赫贝尔 · 贝斯 竖琴 弦乐 长笛 电钢琴 合唱 · 4 页',
    tip:'贝斯和竖琴一直在底下转，旋律一页一个声部地叠上来，最后一页六种乐器一起响。<b>试试：</b>打开 Pages，点每一页看看谁是新进来的。',
    settings:{key:2,range:3,bpm:76},
    // D 大调：行 0 = D3，7 = D4，14 = D5
    parts:()=>{ const o=x=>({top:21,offset:x}), roots=[7,11,12,9,10,7,10,11];   // D A Bm F#m G D G A
      const bass=[7,4,5,2,3,0,3,4].map(r=>[r,2]);
      const harp=roots.flatMap(r=>[[r-7,.5],[r-5,.5],[r-3,.5],[r,.5]]);
      const v1=[16,15,14,13,12,11,12,13].map(r=>[r,2]), v2=[14,13,12,11,10,9,10,8].map(r=>[r,2]);
      const v3=[7,9,11,10,9,7,9,8,7,5,7,11,10,12,11,10].map(r=>[r+7,1]);
      return [ ...[0,16,32,48].flatMap(x=>[...songStrokes(bass,7,o(x)),...songStrokes(harp,11,o(x))]),
        ...songStrokes(v1,5,o(16)),
        ...songStrokes(v2,5,o(32)), ...songStrokes(v1,4,o(32)),
        ...songStrokes(v3,5,o(48)), ...songStrokes(v2,4,o(48)), ...songStrokes(v1,12,o(48)),
        ...songStrokes(roots.map(r=>[r+2,2]),13,o(48)), ...songStrokes(roots.map(r=>[r+4,2]),13,o(48))]; } },
  { id:'ode', title:'欢乐颂（交响版）', icon:'🎺', ink:9, meta:'贝多芬 · 长笛 竖琴 → 铜管 弦乐 鼓 · 4 页',
    tip:'前两页是长笛独奏，后两页铜管接过旋律，长笛在上面配三度和声，弦乐、鼓一起进来。<b>试试：</b>把鼓那几排点换成别的位置，听节奏怎么变。',
    settings:{range:3,bpm:112},
    // C 大调：行 0 = C3，7 = C4，14 = C5
    parts:()=>{ const o=x=>({top:21,offset:x}), D=DR(21);
      const A=[[16,1],[16,1],[17,1],[18,1],[18,1],[17,1],[16,1],[15,1],[14,1],[14,1],[15,1],[16,1]];
      const mel=[...A,[16,1.5],[15,.5],[15,2],...A,[15,1.5],[14,.5],[14,2]];
      const ch=[...'CCGGCCCGCCGGCCGC'];                                   // 每 2 拍一个和弦
      const bass=ch.map(c=>[c==='C'?7:4,2]);
      const harp=ch.flatMap(c=>(c==='C'?[7,9,11,14]:[4,6,8,11]).map(r=>[r,.5]));
      const drums=[[D.K,[0,2]],[D.S,[1,3]],[D.H,[0,.5,1,1.5,2,2.5,3,3.5]]].map(([r,p])=>bars(()=>hitsAt(r,p),8));
      return [ ...songStrokes(mel,4,o(0)), ...songStrokes(bass,7,o(0)), ...songStrokes(harp,11,o(0)),
        ...songStrokes(mel,9,o(32)), ...songStrokes(mel.map(([r,d])=>[r+2,d]),4,o(32)),
        ...songStrokes(bass,7,o(32)), ...songStrokes(harp,11,o(32)),
        ...songStrokes(ch.map(c=>[c==='C'?9:6,2]),5,o(32)), ...songStrokes(ch.map(c=>[c==='C'?11:8,2]),5,o(32)),
        ...drums.flatMap(d=>songStrokes(d,DRUM_INK,o(32))), ...songStrokes([[D.C,.5]],DRUM_INK,o(32))]; } },
  { id:'minuet', title:'小步舞曲', icon:'💃', ink:1, meta:'巴赫 · 三拍子 · 拨弦 竖琴 贝斯 → 长笛 管风琴 · 4 页',
    tip:'右手旋律、左手分解和弦、低音三层叠在一起；后两页长笛领奏，拨弦在下面配三度。<b>试试：</b>把管风琴那条长线删掉，对比一下。',
    settings:{key:7,range:3,quant:'8t',bpm:150},
    // G 大调：行 0 = G3，7 = G4，14 = G5。时值单位 = 步（一拍 3 步），四分音符 4 步，一小节 12 步，一页 4 小节
    parts:()=>{ const o=x=>({spb:3,mul:1,top:21,offset:x});
      const b=[[[11,4],[7,2],[8,2],[9,2],[10,2]], [[11,4],[7,4],[7,4]], [[12,4],[10,2],[11,2],[12,2],[13,2]], [[14,4],[7,4],[7,4]],
               [[10,4],[11,2],[10,2],[9,2],[8,2]], [[9,4],[10,2],[9,2],[8,2],[7,2]], [[6,4],[7,2],[8,2],[9,2],[7,2]], [[8,12]]];
      const melA=b.flat(), melB=[...b.slice(0,6).flat(),[8,4],[9,2],[8,2],[7,2],[6,2],[7,12]];
      const R={G:0,C:3,A:1,D:4}, chA='GGCGAGDD', chB='GGCGAGDG';
      const bassOf=s=>[...s].map(c=>[R[c],12]), harpOf=s=>[...s].flatMap(c=>[0,2,4].map(k=>[R[c]+k,4]));
      return [ ...songStrokes(melA,1,o(0)), ...songStrokes(bassOf(chA),7,o(0)), ...songStrokes(harpOf(chA),11,o(0)),
        ...songStrokes(melB,4,o(96)), ...songStrokes(melB.map(([r,d])=>[r-2,d]),1,o(96)),
        ...songStrokes(bassOf(chB),7,o(96)), ...songStrokes(harpOf(chB),11,o(96)), ...songStrokes([...chB].map(c=>[R[c]+7,12]),10,o(96))]; } },
  { id:'elise', title:'致爱丽丝', icon:'🎹', ink:0, meta:'贝多芬 · 半音阶 · 十六分音符 · 双手 · 1 页',
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
  { id:'night', title:'夜跑（原创电子）', icon:'🌃', ink:8, meta:'原创 · 鼓组 贝斯 电钢琴 8-bit 合唱 · 4 页',
    tip:'一页加一层：鼓和贝斯 → 电钢琴和弦 → 主旋律 → 合唱铺底和变奏。<b>试试：</b>鼓组颜色画的点，越低越是底鼓、越高越是镲，自己加几下。',
    settings:{range:3,bpm:118},
    parts:()=>{ const o=x=>({top:21,offset:x}), D=DR(21), P=[...'AFCG'];        // Am F C G
      const root={A:5,F:3,C:7,G:4}, EP={A:[12,14,16],F:[10,12,14],C:[11,14,16],G:[11,13,15]}, CH={A:[9,12],F:[10,12],C:[9,11],G:[8,11]};
      const bass=P.flatMap(c=>{ const r=root[c]; return [...rep([[r,.5]],6),[r+7,.5],[r+7,.5]]; });
      const drums=[[D.K,[0,1,2,3]],[D.S,[1,3]],[D.H,[.5,1.5,2.5,3.5]]].map(([r,p])=>bars(()=>hitsAt(r,p),4));
      const ep=k=>P.flatMap(c=>[[EP[c][k],1.5],[null,1],[EP[c][k],1],[null,.5]]);
      const leadA=[[16,.5],[16,.5],[19,1],[16,.5],[14,.5],[12,1], [14,.5],[15,.5],[17,1],[15,1],[14,1],
                   [14,.5],[16,.5],[18,1],[16,.5],[14,.5],[16,1], [15,1.5],[13,.5],[11,1],[null,1]];
      const leadB=[[19,.5],[18,.5],[16,1],[19,.5],[21,.5],[19,1], [17,.5],[16,.5],[14,1],[17,1],[19,1],
                   [18,.5],[16,.5],[14,.5],[16,.5],[18,1],[21,1], [20,1],[18,1],[15,1],[13,1]];
      return [ ...[0,16,32,48].flatMap(x=>[...songStrokes(bass,7,o(x)), ...drums.flatMap(d=>songStrokes(d,DRUM_INK,o(x)))]),
        ...[16,32,48].flatMap(x=>[0,1,2].flatMap(k=>songStrokes(ep(k),12,o(x)))),
        ...songStrokes([[D.C,.5]],DRUM_INK,o(32)), ...songStrokes(leadA,8,o(32)),
        ...songStrokes(leadB,8,o(48)), ...[0,1].flatMap(k=>songStrokes(P.map(c=>[CH[c][k],4]),13,o(48)))]; } },
  { id:'harbor', title:'海边的风（原创 · 港乐摇滚抒情）', icon:'🌊', ink:4, meta:'原创 · 吉他 贝斯 鼓组 长笛 → 铜管 管风琴 · 4 页',
    tip:'80 年代港乐摇滚抒情的编法：前奏木吉他分解和弦，主歌长笛，副歌铜管领奏、风琴铺底。<b>试试：</b>把副歌的铜管换成合唱颜色。',
    settings:{range:3,bpm:78},
    parts:()=>{ const o=x=>({top:21,offset:x}), D=DR(21), root={C:7,G:4,A:5,F:3,E:2};   // A = Am，E = Em
      const pages=['CGAF','CGAF','FGEA','FGCC'];
      const gtr=s=>[...s].flatMap(c=>{ const r=root[c]; return [r,r+4,r+7,r+9,r+7,r+4,r,r+4].map(x=>[x,.5]); });
      const bass=s=>[...s].flatMap(c=>[[root[c],1.5],[root[c],.5],[root[c],2]]);
      const rock=[[D.K,[0,2.5]],[D.S,[1,3]],[D.H,[0,.5,1,1.5,2,2.5,3,3.5]]].map(([r,p])=>bars(()=>hitsAt(r,p),4));
      const intro=[[D.K,[0]],[D.H,[0,1,2,3]]].map(([r,p])=>bars(()=>hitsAt(r,p),4));
      const verse=[[null,1],[16,.5],[16,.5],[16,1],[15,.5],[14,.5], [15,1.5],[13,.5],[11,2],
                   [null,1],[14,.5],[14,.5],[14,1],[13,.5],[12,.5], [13,1.5],[12,.5],[10,1],[12,1]];
      const chorus1=[[17,1.5],[16,.5],[17,1],[19,1], [18,2],[15,1],[16,1], [16,1.5],[15,.5],[16,1],[18,1], [19,3],[null,1]];
      const chorus2=[[17,1.5],[16,.5],[17,1],[19,1], [20,1.5],[19,.5],[18,1],[15,1], [16,1.5],[15,.5],[14,2], [14,3],[null,1]];
      const PAD={F:[10,12],G:[11,13],E:[9,11],A:[9,12],C:[9,11]}, pad=(s,k)=>[...s].map(c=>[PAD[c][k],4]);
      return [ ...pages.flatMap((s,i)=>[...songStrokes(gtr(s),1,o(i*16)), ...songStrokes(bass(s),7,o(i*16)),
                 ...(i?rock:intro).flatMap(d=>songStrokes(d,DRUM_INK,o(i*16)))]),
        ...songStrokes(verse,4,o(16)),
        ...songStrokes([[D.C,.5]],DRUM_INK,o(32)), ...songStrokes(chorus1,9,o(32)), ...songStrokes(chorus2,9,o(48)),
        ...[2,3].flatMap(i=>[0,1].flatMap(k=>songStrokes(pad(pages[i],k),10,o(i*16))))]; } },

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

