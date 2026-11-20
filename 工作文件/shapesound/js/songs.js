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
// 一小节里在第几拍敲一下（拍可以是 0.5、0.25），变成记谱；dur = 每一下占多长
function hitsAt(row,pos,len=4,dur=.5){ const out=[]; let cur=0;
  [...pos].sort((a,b)=>a-b).forEach(p=>{ if(p>cur) out.push([null,p-cur]); out.push([row,dur]); cur=p+dur; });
  if(cur<len) out.push([null,len-cur]); return out; }
const bars=(fn,n)=>Array.from({length:n},(_,i)=>fn(i)).flat();

const SONG_GROUPS=[
  {name:'简单儿歌', hint:'一听就会，第一次玩从这里开始', ids:['twinkle','tigers','birthday','jingle']},
  {name:'复杂编曲 · 挑战', hint:'好几种乐器分声部，一页一页叠上去', ids:['epic','canon','ode','minuet','elise','night']},
  {name:'好玩 · 画出来的谱子', hint:'像老游戏机，也像一幅画：按下播放听听看', ids:['chip','kitty']},
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

  { id:'epic', title:'星海远征（原创 · 交响电子）', icon:'🚀', ink:9, meta:'原创 · 15 种乐器全部上场 · 8 页 · 约 1 分钟',
    tip:'前奏 → 铺垫 → 主题 → 变奏 → 间奏 → 推进 → 高潮 → 尾声，一页一段；高潮那页同时有十几个声部。<b>试试：</b>打开网格和 Pages，一页一页看乐器怎么叠上去。',
    settings:{key:9,scale:'minor',range:3,quant:'16',bpm:132},
    // A 自然小调、3 个八度：行 0 = A3，7 = A4，14 = A5，21 = A6。量化 1/16（一拍 4 步），一页 4 小节（16 拍）
    parts:()=>{
      const T=21, D=DR(T), S_=(notes,ink,pg)=>songStrokes(notes,ink,{spb:4,top:T,offset:pg*16});
      const PROG=[...'AFCG'];                                                    // Am F C G
      const CH={A:[7,9,11],F:[5,7,9],C:[9,11,13],G:[6,8,10]}, BASS={A:7,F:5,C:2,G:6};
      const perBar=(fn,prog=PROG)=>prog.flatMap(fn);
      const pad=(k,sh=0,prog=PROG)=>perBar(c=>[[CH[c][k]+sh,4]],prog);
      const ostin=perBar(c=>{ const [a,,e]=CH[c]; return rep([[a,.25],[e,.25],[a+7,.25],[e,.25]],4); });
      const harp=perBar(c=>{ const [a,b,e]=CH[c]; return [a,b,e,a+7,b+7,e+7,a+7,e].map(r=>[r,.5]); });
      const marim=perBar(c=>{ const [a,b,e]=CH[c]; return rep([[e+7,.25],[a+7,.25],[b+7,.25],[a+7,.25]],4); });
      const chip=perBar(c=>{ const [a,b,e]=CH[c]; return rep([[a+7,.25],[b+7,.25],[e+7,.25],[b+7,.25]],4); });
      const bass8=perBar(c=>{ const r=BASS[c]; return [...rep([[r,.5]],6),[r+7,.5],[r+7,.5]]; });
      const bassHalf=perBar(c=>[[BASS[c],2],[BASS[c],2]]);
      const stab=k=>perBar(c=>{ const r=CH[c][k]; return [[r,1],[null,.5],[r,1],[null,.5],[r,1]]; });
      const bells=perBar(c=>[[CH[c][2]+7,4]]);
      // 主题（原创）：A 段、A' 段、长笛对位
      const theme=[[11,1.5],[10,.5],[9,1],[11,1], [12,1.5],[11,.5],[10,1],[9,1], [9,1],[11,1],[14,1.5],[13,.5], [13,2],[11,1],[8,1]];
      const themeB=[[14,1.5],[13,.5],[11,1],[14,1], [16,1.5],[14,.5],[12,1],[10,1], [9,.5],[11,.5],[14,.5],[16,.5],[18,1],[16,1], [17,2],[15,1],[13,.5],[11,.5]];
      const counter=[[16,2],[14,2], [17,2],[16,2], [16,2],[18,2], [17,4]];
      const up=(n,k)=>n.map(([r,d])=>[r===null?null:r+k,d]);
      // 鼓：每小节的位置可以是固定的，也可以按小节号给
      const dr=(row,pos,dur=.5)=>bars(i=>hitsAt(row,typeof pos==='function'?pos(i):pos,4,dur),4);
      const X16=Array.from({length:16},(_,i)=>i/4), X8=Array.from({length:8},(_,i)=>i/2);
      const crash=bars(()=>hitsAt(D.C,[0]),4);
      // 风铃：A 小调五声里的高音，随机落点
      const sparkle=(seed,n)=>{ const r=rng(seed), hi=[14,16,17,18,20], pos=new Set();
        while(pos.size<n) pos.add(Math.floor(r()*64)/4);
        return [...pos].sort((a,b)=>a-b).flatMap((p,i,arr)=>{ const prev=i?arr[i-1]+.25:0; return [...(p>prev?[[null,p-prev]]:[]),[hi[Math.floor(r()*hi.length)],.25]]; }); };
      // 竖琴刮奏 / 8-bit 爬升：一步一个点，斜着往上走
      const run=(from,to,beats,start=0)=>{ const n=beats*4; return [[null,start],...Array.from({length:n},(_,i)=>[Math.round(from+(to-from)*i/(n-1)),.25])].filter(x=>x[0]!==null||x[1]>0); };
      const out=[];
      const put=(pg,...list)=>list.forEach(([notes,ink])=>out.push(...S_(notes,ink,pg)));

      // 第 1 页 · 前奏：钟声动机、合唱铺底、管风琴持续低音、风铃、通鼓渐强
      put(0,[[[11,2],[10,2],[9,2],[7,2],[11,2],[12,2],[13,2],[11,2]],2],
            [pad(0),13],[pad(2),13],[[[0,16]],10],[sparkle(11,10),6],
            [dr(D.T,i=>[[0],[0,2],[0,1,2,3],[0,.5,1,1.5,2,2.5,3,3.25,3.5,3.75]][i],.25),DRUM_INK]);
      // 第 2 页 · 铺垫：拨弦十六分音符、弦乐和声、竖琴分解和弦、贝斯进来
      put(1,[ostin,1],[pad(0),5],[pad(1),5],[pad(2),5],[harp,11],[bassHalf,7],
            [dr(D.K,[0,2]),DRUM_INK],[dr(D.H,X8),DRUM_INK],[dr(D.S,i=>i===3?[3,3.25,3.5,3.75]:[],.25),DRUM_INK]);
      // 第 3 页 · 主题：铜管主旋律、长笛对位、电钢琴切分和弦、8-bit 琶音、整套鼓
      put(2,[theme,9],[counter,4],[stab(0),12],[stab(1),12],[stab(2),12],[bass8,7],[ostin,1],[chip,8],[bells,2],
            [crash,DRUM_INK],[dr(D.K,[0,.75,2,2.75]),DRUM_INK],[dr(D.S,[1,3]),DRUM_INK],[dr(D.H,X16,.25),DRUM_INK]);
      // 第 4 页 · 变奏：弦乐接旋律（更高），铜管在下面配三度，管风琴、马林巴、竖琴、合唱一起
      put(3,[themeB,5],[up(themeB,-2),9],[pad(0),10],[pad(1),10],[pad(2),10],[marim,3],[harp,11],[bass8,7],[pad(1),13],[pad(2),13],
            [crash,DRUM_INK],[dr(D.K,[0,.75,2,2.75]),DRUM_INK],[dr(D.S,[1,3]),DRUM_INK],[dr(D.H,X16,.25),DRUM_INK],[dr(D.O,[.5,1.5,2.5,3.5]),DRUM_INK]);
      // 第 5 页 · 间奏：钢琴独奏分解和弦，合唱和风铃，只留轻轻的镲
      put(4,[perBar(c=>{ const [a,b,e]=CH[c]; return [a,e,a+7,b+7,e+7,b+7,a+7,e].map(r=>[r,.5]); }),0],
            [perBar(c=>{ const r=CH[c][0]>=7?CH[c][0]-7:CH[c][0]; return [[r,2],[r+4,2]]; }),0],
            [pad(0),13],[pad(2),13],[sparkle(29,8),6],[dr(D.H,X8),DRUM_INK],[dr(D.K,[0]),DRUM_INK]);
      // 第 6 页 · 推进：军鼓从四分 → 八分 → 十六分越来越密，8-bit 一路爬升，合唱一级级往上
      put(5,[run(0,21,16),8],[pad(0),5],[pad(1),5],[pad(2),5],[rep([[7,.5]],32),7],[[[0,16]],10],
            [[[9,4],[11,4],[13,4],[14,4]],13],
            [dr(D.K,[0,1,2,3]),DRUM_INK],[dr(D.S,i=>[[0,1,2,3],X8,X16,X16][i],.25),DRUM_INK],[dr(D.T,i=>i===3?X16:[],.25),DRUM_INK]);
      // 第 7 页 · 高潮：铜管、弦乐、长笛三个八度齐奏主题，合唱三度和声，所有伴奏全开，竖琴最后一小节刮奏
      put(6,[theme,9],[up(theme,7),5],[up(theme,7),4],[up(theme,2),13],
            [pad(0),10],[pad(1),10],[pad(2),10],[stab(0),12],[stab(1),12],[stab(2),12],
            [ostin,1],[marim,3],[chip,8],[bass8,7],[bells,2],
            [[...harp.slice(0,24),...run(0,21,4)],11],
            [crash,DRUM_INK],[dr(D.K,[0,.75,1.5,2,2.75,3.5]),DRUM_INK],[dr(D.S,[1,3]),DRUM_INK],[dr(D.H,X16,.25),DRUM_INK],
            [dr(D.T,i=>i===3?[3,3.25,3.5,3.75]:[],.25),DRUM_INK]);
      // 第 8 页 · 尾声：F → G → 结束在一个很大的 A 小调和弦上，最后一小节只剩余音
      put(7,[[[12,3],[11,1],[10,2],[8,2],[7,7]],9],
            [[[5,4],[6,4],[7,7]],5],[[[9,4],[10,4],[11,7]],5],[[[14,8],[14,7]],4],
            [[[5,4],[6,4],[0,7]],10],[[[9,4],[10,4],[7,7]],10],[[[null,8],[14,7]],10],
            [[[null,8],[9,7]],13],[[[null,8],[11,7]],13],
            [[[5,4],[6,4],[0,7]],7],
            [run(0,14,2,6),11],[[[null,8],...[0,2,4,7,9,11,14].map(r=>[r,.5])],0],
            [[[null,8],[14,4]],2],[[[null,8],[null,1],[18,.25],[null,.75],[16,.25],[null,.75],[20,.25]],6],
            [[[D.K,.5],[null,3.5],...rep([[D.T,.25]],16),[D.C,.5],[null,7.5]],DRUM_INK],[[[null,8],[D.K,.5]],DRUM_INK]);
      return out; } },
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

  // ---------- 好玩 · 画出来的谱子 ----------
  { id:'chip', title:'8-bit 小冒险', icon:'👾', ink:8, meta:'原创 · 像老游戏机 · 鼓伴奏 · 2 页',
    tip:'快速上下跳的音就是老游戏机的味道。<b>试试：</b>点「随机换音色」，听听像不像别的游戏。',
    settings:{bpm:150,beats:2},
    parts:()=>{ const A=[[7,.5],[9,.5],[11,.5],[14,.5],[11,.5],[9,.5],[7,1]], B=[[8,.5],[10,.5],[12,.5],[10,.5],[8,1],[null,1]],
                      C=[[9,.5],[11,.5],[13,.5],[11,.5],[9,.5],[11,.5],[13,1]], D=[[14,.5],[13,.5],[12,.5],[11,.5],[12,1],[11,1]],
                      E=[[9,.5],[9,.5],[11,.5],[9,.5],[7,.5],[9,.5],[8,1]], F=[[7,.5],[11,.5],[14,1],[7,2]];
      const hop=(r,n=4)=>rep([[r,.5],[r+7,.5]],n);
      const bass=[...hop(0),...hop(1),...hop(2),...hop(4),...hop(0),...hop(1),...hop(0,2),...hop(4,2),...hop(0)];
      return [...songStrokes([...A,...B,...C,...D,...A,...B,...E,...F],8), ...songStrokes(bass,7)]; } },
  { id:'kitty', title:'画一只小猫', icon:'🐱', ink:1, meta:'原创 · 一张猫脸就是一首曲子 · 1 页',
    tip:'脸是一个大圆圈，胡子是长长的弦乐和弦，眼睛和鼻子是小小的点缀。<b>试试：</b>给它画个蝴蝶结，或者再画一只小猫。',
    settings:{...PENT,bpm:84},
    pages:()=>{ const L=[], R=[];
      // 胡子：左右各三根，稍微斜一点，响起来是缓缓滑动的和弦
      [[.6,-.04],[.66,0],[.72,.04]].forEach(([y,k])=>{ L.push({ink:5,pts:[P2(.17,y+k),P2(.37,y)]}); R.push({ink:5,pts:[P2(.63,y),P2(.83,y+k)]}); });
      return [[
        {ink:1,pts:ellipse(.5,.56,.2,.36,48)},                                    // 圆圆的脸
        {ink:12,pts:[P2(.34,.34),P2(.37,.08),P2(.45,.22)]},                       // 左耳
        {ink:12,pts:[P2(.55,.22),P2(.63,.08),P2(.66,.34)]},                       // 右耳
        {ink:4,pts:ellipse(.43,.47,.022,.06,14)}, {ink:4,pts:ellipse(.57,.47,.022,.06,14)},   // 眼睛
        {ink:6,pts:[P2(.43,.45)]}, {ink:6,pts:[P2(.57,.45)]},                    // 眼睛里的高光
        {ink:2,pts:[P2(.485,.58),P2(.5,.62),P2(.515,.58)]},                       // 小鼻子
        {ink:3,pts:curve(t=>[.44+.12*t,.68+.035*Math.abs(Math.sin(t*Math.PI*2))],16)}, // ω 形的嘴
        ...L, ...R,
        ...[[.08,.15],[.2,.08],[.82,.1],[.93,.2],[.1,.85],[.9,.82]].map(([x,y])=>({ink:6,pts:[P2(x,y)]})),  // 星星
        {ink:7,pts:curve(t=>[.01+.98*t,.97-.02*Math.sin(t*Math.PI*4)],30)}       // 地板（贝斯）
      ]]; } },
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

