"use strict";
/* 形声 · 导入谱子：简谱文字、MusicXML（.musicxml / .xml / .mxl）、MIDI（.mid）→ 画纸上的线条 */
// 三种格式先各自解析成同一种「乐谱」：
//   {title, bpm, key:{tonic:0–11, minor} 或 null, parts:[{name, program:GM 音色 0–127 或 -1, drum, notes:[{t 拍, d 拍, m MIDI 音高}]}], warn:[]}
// 一拍 = 一个四分音符（和示例曲一样），一页 = 16 拍。再统一换算成线条。

// ---------------- 乐器：GM 音色 / 声部名字 → 形声的颜色 ----------------
function progInk(p){
  if(p<0) return -1;
  if(p===4||p===5) return 12;                       // 电钢琴
  if(p<8) return 0;                                 // 钢琴
  if(p<=10) return 6;                               // 钢片琴、钟琴、八音盒 → 风铃
  if(p<=13) return 3;                               // 颤音琴、马林巴、木琴
  if(p===14) return 2;                              // 管钟
  if(p<16) return 1;
  if(p<24) return 10;                               // 风琴
  if(p<27) return 1;                                // 木吉他
  if(p<32) return 15;                               // 电吉他
  if(p<40) return 7;                                // 贝斯
  if(p===46) return 11;                             // 竖琴
  if(p>=52&&p<=54) return 13;                       // 合唱、人声
  if(p<56) return 5;                                // 弦乐
  if(p<64) return 9;                                // 铜管
  if(p<80) return 4;                                // 木管、笛子
  if(p<88) return 8;                                // 合成器主音
  if(p<96) return 5;                                // 合成器铺底
  if(p<104) return 6;
  if(p<112) return 1;                               // 民族乐器（多是拨弦）
  return 2;
}
const NAME_INK=[
  [/电吉他|electric guitar|distortion|overdrive|e\.?\s?gtr/i,15],[/吉他|guitar|gtr/i,1],
  [/电钢琴|e\.?\s?piano|rhodes|wurli/i,12],[/钢琴|piano|pno|keyboard|键盘/i,0],
  [/贝斯|bass|低音|bs\b/i,7],[/竖琴|harp/i,11],[/管风琴|风琴|organ/i,10],
  [/合唱|人声|唱|choir|voice|vocal|soprano|alto|tenor|baritone|chorus/i,13],
  [/小号|长号|圆号|大号|铜管|trumpet|trombone|horn|tuba|brass|cornet/i,9],
  [/长笛|短笛|笛|单簧管|双簧管|萨克斯|flute|piccolo|recorder|clarinet|oboe|bassoon|sax/i,4],
  [/小提琴|中提琴|大提琴|提琴|弦乐|violin|viola|cello|violoncello|strings?\b|contrabass/i,5],
  [/马林巴|木琴|颤音琴|marimba|xylophone|vibraphone/i,3],[/风铃|chime/i,6],[/钟|bell|glock/i,2],
  [/8-?bit|chip|square|方波/i,8],[/鼓|drum|perc|kit/i,DRUM_INK],
];
function nameInk(name){
  if(!name) return -1;
  const exact=INSTR.indexOf(name.trim()); if(exact>=0) return exact;
  for(const [re,ink] of NAME_INK) if(re.test(name)) return ink;
  return -1;
}
const INK_FALLBACK=[0,1,4,5,12,9,3,11,13,10,2,8,6,15,7];

// ---------------- 简谱文字 ----------------
// 1–7 是音，0 是休止；#4 升、b7 降；1' 高八度、1, 低八度（可以叠：1'' 1,,）；
// 5. 附点；1_ 八分音符、1__ 十六分；后面跟 - 每个多一拍；[135] 是和弦；
// 以 @ 开头的一行开始新的声部（@贝斯、@长笛…）；1=G、4/4、♩=90 这样的写法会被认出来。
const LETTER_SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function keyFromName(s){
  const m=/^([#b♯♭]?)([A-Ga-g])([#b♯♭]?)$/.exec(s.trim()); if(!m) return null;
  const acc=(m[1]+m[3]).replace(/♯/g,'#').replace(/♭/g,'b');
  return ((LETTER_SEMI[m[2].toUpperCase()]+(acc==='#'?1:acc==='b'?-1:0))%12+12)%12;
}
function parseJianpu(text){
  const song={title:'',bpm:0,key:{tonic:0,minor:false},parts:[],warn:[]};
  let part=null, keyOff=0;
  const newPart=name=>{ part={name,program:-1,drum:false,notes:[],t:0}; song.parts.push(part); };
  const DEG=[0,2,4,5,7,9,11];
  for(let raw of text.replace(/\r/g,'').split('\n')){
    let line=raw.trim(); if(!line) continue;
    if(/^[@＠]/.test(line)){ newPart(line.slice(1).trim()||`声部 ${song.parts.length+1}`); continue; }
    line=line.replace(/1\s*[=＝]\s*([#b♯♭]?[A-Ga-g][#b♯♭]?)/g,(_,k)=>{ const v=keyFromName(k); if(v!==null){ keyOff=v; if(!song.parts.some(p=>p.notes.length)) song.key.tonic=v; } return ' '; });
    line=line.replace(/(?:♩|J|bpm|BPM|速度|拍速)\s*[=＝:：]?\s*(\d{2,3})/g,(_,v)=>{ if(!song.bpm) song.bpm=+v; return ' '; });
    line=line.replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g,' ');            // 拍号：只用来认出来，不影响记谱
    if(!/[0-7]/.test(line)){ if(!song.title&&!song.parts.some(p=>p.notes.length)) song.title=line.slice(0,40); continue; }
    if(!part) newPart('旋律');
    const ev=[];   // {pitches:[] 或 null（休止）, d}
    let i=0;
    const readNote=()=>{   // 读一个音：升降 + 数字 + 八度记号，返回 MIDI 音高或 null（休止）或 undefined（不是音）
      let acc=0, j=i;
      while(j<line.length&&'#b♯♭'.includes(line[j])){ acc+=(line[j]==='#'||line[j]==='♯')?1:-1; j++; }
      const c=line[j]; if(!(c>='0'&&c<='7')) return undefined;
      j++; let oct=0;
      while(j<line.length&&`'’^,，`.includes(line[j])){ oct+=(line[j]===','||line[j]==='，')?-1:1; j++; }
      i=j; return c==='0'?null:60+keyOff+DEG[+c-1]+acc+12*oct;
    };
    const readDur=()=>{ let d=1;
      while(i<line.length&&(line[i]==='_'||line[i]==='＿')){ d/=2; i++; }
      let dot=d/2; while(i<line.length&&(line[i]==='.'||line[i]==='·')){ d+=dot; dot/=2; i++; }
      return d; };
    while(i<line.length){
      const c=line[i];
      if(c==='-'||c==='—'||c==='－'){ if(ev.length) ev[ev.length-1].d+=1; i++; continue; }
      if(c==='['||c==='［'){ i++; const ps=[];
        while(i<line.length&&line[i]!==']'&&line[i]!=='］'){ const p=readNote(); if(p===undefined) i++; else if(p!==null) ps.push(p); }
        i++; const d=readDur(); ev.push({pitches:ps.length?ps:null,d}); continue; }
      const p=readNote();
      if(p!==undefined){ ev.push({pitches:p===null?null:[p],d:readDur()}); continue; }
      i++;   // 小节线、括号、空格、歌词等其他字符都跳过
    }
    for(const e of ev){ if(e.pitches) e.pitches.forEach(m=>part.notes.push({t:part.t,d:e.d,m})); part.t+=e.d; }
  }
  song.parts=song.parts.filter(p=>p.notes.length);
  if(!song.parts.length) throw new Error('没有找到音符：简谱里要有 1–7 的数字');
  return song;
}

// ---------------- MusicXML ----------------
const STEP_SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function parseMusicXML(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('文件不是有效的 MusicXML');
  const root=doc.documentElement;
  if(root.nodeName==='score-timewise') throw new Error('暂不支持 timewise 格式的 MusicXML，请在 MuseScore 里重新导出');
  if(root.nodeName!=='score-partwise') throw new Error('文件不是 MusicXML 乐谱');
  const kid=(el,name)=>{ for(const c of el.children) if(c.nodeName===name) return c; return null; };
  const txt=(el,sel)=>{ const x=el&&el.querySelector(sel); return x?x.textContent.trim():''; };
  const song={title:txt(root,'work > work-title')||txt(root,'movement-title'),bpm:0,key:null,parts:[],warn:[]};
  const info={};
  root.querySelectorAll('part-list > score-part').forEach(sp=>{
    const mi=[...sp.querySelectorAll('midi-instrument')], unp={};
    mi.forEach(m=>{ const u=txt(m,'midi-unpitched'); if(u) unp[m.getAttribute('id')]=+u-1; });
    const prog=mi.map(m=>txt(m,'midi-program')).find(Boolean);
    info[sp.getAttribute('id')]={name:txt(sp,'part-name')||txt(sp,'part-abbreviation'),
      program:prog?+prog-1:-1, drum:mi.some(m=>txt(m,'midi-channel')==='10'), unp};
  });
  let grace=0, repeats=false;
  root.querySelectorAll(':scope > part').forEach(pe=>{
    const pi=info[pe.getAttribute('id')]||{name:'',program:-1,drum:false,unp:{}};
    const part={name:pi.name,program:pi.program,drum:pi.drum,notes:[]};
    let div=1, t=0, last=0, trans=0; const tieOpen=new Map();
    for(const meas of pe.children){ if(meas.nodeName!=='measure') continue;
      if(meas.querySelector('repeat')) repeats=true;
      for(const el of meas.children){
        const n=el.nodeName;
        if(n==='attributes'){
          const dv=txt(el,'divisions'); if(dv) div=+dv||1;
          const k=kid(el,'key'); if(k&&!song.key&&txt(k,'fifths')!==''){ const f=+txt(k,'fifths'), maj=((f*7)%12+12)%12, minor=txt(k,'mode')==='minor';
            song.key={tonic:minor?(maj+9)%12:maj,minor}; }
          const tr=kid(el,'transpose'); if(tr) trans=(+txt(tr,'chromatic')||0)+12*(+txt(tr,'octave-change')||0);
          if(el.querySelector('clef > sign')&&txt(el,'clef > sign')==='percussion') part.drum=true;
        } else if(n==='direction'||n==='sound'){
          const s=n==='sound'?el:el.querySelector('sound[tempo]');
          if(!song.bpm&&s&&s.getAttribute('tempo')) song.bpm=+s.getAttribute('tempo');
          if(!song.bpm){ const pm=txt(el,'metronome > per-minute'), bu=txt(el,'metronome > beat-unit');
            if(+pm) song.bpm=+pm*({half:2,eighth:.5,whole:4}[bu]||1)*(el.querySelector('metronome > beat-unit-dot')?1.5:1); }
        } else if(n==='backup'){ t-=(+txt(el,'duration')||0)/div; if(t<0) t=0; }
        else if(n==='forward'){ t+=(+txt(el,'duration')||0)/div; }
        else if(n==='note'){
          if(kid(el,'grace')){ grace++; continue; }
          const d=(+txt(el,'duration')||0)/div, chord=!!kid(el,'chord'), on=chord?last:t;
          if(!chord){ last=t; t+=d; }
          if(kid(el,'rest')||d<=0) continue;
          let m;
          const p=kid(el,'pitch'), u=kid(el,'unpitched');
          if(p) m=(+txt(p,'octave')+1)*12+STEP_SEMI[txt(p,'step')]+Math.round(+txt(p,'alter')||0)+trans;
          else if(u){ part.drum=true; const ins=kid(el,'instrument'), id=ins&&ins.getAttribute('id');
            m=id&&pi.unp[id]!=null?pi.unp[id]:38; }
          else continue;
          const ties=[...el.children].filter(c=>c.nodeName==='tie').map(c=>c.getAttribute('type'));
          const open=tieOpen.get(m);
          if(ties.includes('stop')&&open){ open.d=on+d-open.t; if(!ties.includes('start')) tieOpen.delete(m); continue; }
          const note={t:on,d,m}; part.notes.push(note);
          if(ties.includes('start')) tieOpen.set(m,note);
        }
      }
    }
    if(part.notes.length) song.parts.push(part);
  });
  if(grace) song.warn.push(`跳过了 ${grace} 个倚音`);
  if(repeats) song.warn.push('反复记号没有展开，按写的顺序排');
  if(!song.parts.length) throw new Error('这个 MusicXML 里没有找到音符');
  return song;
}
// .mxl 是 zip 压缩包：找到里面的乐谱文件解压出来（用浏览器自带的 DecompressionStream，不需要别的库）
async function unzipMxl(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf), dec=new TextDecoder();
  let eocd=-1; for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65557);i--) if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  if(eocd<0) throw new Error('.mxl 文件损坏（不是 zip 压缩包）');
  const count=dv.getUint16(eocd+10,true); let p=dv.getUint32(eocd+16,true); const files={};
  for(let k=0;k<count;k++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nlen=dv.getUint16(p+28,true),
          elen=dv.getUint16(p+30,true), clen=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    files[dec.decode(u8.subarray(p+46,p+46+nlen))]={method,csize,off}; p+=46+nlen+elen+clen;
  }
  const read=async name=>{ const f=files[name]; if(!f) return null;
    const lo=f.off, start=lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true), data=u8.slice(start,start+f.csize);
    if(f.method===0) return dec.decode(data);
    if(f.method!==8) throw new Error('.mxl 用了不支持的压缩方式');
    if(!window.DecompressionStream) throw new Error('浏览器太旧，打不开 .mxl，请换新版 Chrome / Edge，或导出成未压缩的 .musicxml');
    return dec.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); };
  let rootName=null; const cont=await read('META-INF/container.xml');
  if(cont){ const m=/full-path\s*=\s*"([^"]+)"/.exec(cont); if(m) rootName=m[1]; }
  if(!rootName||!files[rootName]) rootName=Object.keys(files).find(n=>!n.startsWith('META-INF')&&/\.(musicxml|xml)$/i.test(n));
  if(!rootName) throw new Error('.mxl 里没有找到乐谱');
  return read(rootName);
}

// ---------------- MIDI ----------------
function parseMidi(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf), dec=new TextDecoder('latin1');
  const str=(o,n)=>String.fromCharCode(...u8.subarray(o,o+n));
  if(buf.byteLength<14||str(0,4)!=='MThd') throw new Error('文件不是 MIDI');
  const ntrk=dv.getUint16(10), division=dv.getUint16(12);
  if(division&0x8000) throw new Error('不支持 SMPTE 时间格式的 MIDI');
  const song={title:'',bpm:0,key:null,parts:[],warn:[]}, groups=new Map(), chProg=new Array(16).fill(-1), tempos=new Set();
  let p=8+dv.getUint32(4);
  for(let tr=0;tr<ntrk&&p+8<=buf.byteLength;tr++){
    if(str(p,4)!=='MTrk'){ break; }
    const len=dv.getUint32(p+4), end=Math.min(p+8+len,buf.byteLength); let q=p+8, tick=0, run=0, tname='';
    const open=new Map();
    const vlq=()=>{ let v=0,b; do{ b=u8[q++]; v=(v<<7)|(b&0x7f); }while(b&0x80&&q<end); return v; };
    while(q<end){
      tick+=vlq(); let st=u8[q];
      if(st&0x80) q++; else st=run;
      if(st===0xFF){ const type=u8[q++], l=vlq(), d=q; q+=l;
        if(type===0x51&&l===3){ const us=(u8[d]<<16)|(u8[d+1]<<8)|u8[d+2]; const bpm=Math.round(60e6/us); tempos.add(bpm); if(!song.bpm) song.bpm=bpm; }
        else if(type===0x59&&l===2&&!song.key){ const sf=(u8[d]<<24)>>24, minor=u8[d+1]===1, maj=((sf*7)%12+12)%12; song.key={tonic:minor?(maj+9)%12:maj,minor}; }
        else if(type===0x03){ tname=dec.decode(u8.subarray(d,d+l)).trim(); if(!song.title&&tr===0&&ntrk>1) song.title=tname; }
        else if(type===0x2F) break;
        continue; }
      if(st===0xF0||st===0xF7){ const l=vlq(); q+=l; continue; }
      run=st; const cmd=st&0xF0, ch=st&0x0F;
      if(cmd===0xC0){ if(chProg[ch]<0) chProg[ch]=u8[q]; q+=1; continue; }
      if(cmd===0xD0){ q+=1; continue; }
      const a=u8[q], b=u8[q+1]; q+=2;
      if(cmd===0x90&&b>0){ const k=ch*128+a; if(!open.has(k)) open.set(k,[]); open.get(k).push(tick); }
      else if(cmd===0x80||(cmd===0x90&&b===0)){ const k=ch*128+a, s=open.get(k); if(s&&s.length){ const t0=s.shift();
        const gk=tr+'|'+ch; if(!groups.has(gk)) groups.set(gk,{tr,ch,tname:'',notes:[]});
        groups.get(gk).notes.push({t:t0/division,d:Math.max(tick-t0,1)/division,m:a}); } }
    }
    groups.forEach(g=>{ if(g.tr===tr) g.tname=tname; });
    p=end;
  }
  groups.forEach(g=>{ song.parts.push({name:g.tname,program:g.ch===9?-1:chProg[g.ch],drum:g.ch===9,notes:g.notes}); });
  if(tempos.size>1) song.warn.push('中途变速没有保留，整首用开头的速度');
  if(!song.parts.length) throw new Error('这个 MIDI 里没有音符');
  return song;
}

// ---------------- 乐谱 → 画纸上的线条 ----------------
const QUANT_TRY=[['4',1],['8',2],['8t',3],['16',4],['16t',6],['32',8]];
const SCALE_TRY={major:['major','mixolydian','lydian'],minor:['minor','harmMinor','dorian']};
// GM 打击乐音符 → 鼓组画在画纸的哪个高度（和 drumKindAt 的分段对应：底鼓、通鼓、军鼓、闭镲、开镲、吊镲）
function gmDrumFrac(n){
  if(n===35||n===36) return .08;
  if([41,43,45,47,48,50].includes(n)) return .28;
  if([37,38,39,40].includes(n)) return .45;
  if([42,44].includes(n)) return .65;
  if(n===46) return .82;
  if([49,51,52,53,55,57,59].includes(n)) return .96;
  return .45;
}
function songToWork(song){
  const warn=[...song.warn];
  // 1. 每个声部选一种颜色，尽量不重复
  const used=new Set();
  song.parts.forEach((p,i)=>{
    // 声部名字（Violin、贝斯…）比打谱软件默认写进去的音色更可靠，先看名字
    const byName=nameInk(p.name); let ink=p.drum?DRUM_INK:byName>=0?byName:progInk(p.program);
    if(ink===DRUM_INK) p.drum=true;
    if(!p.drum){
      const avg=p.notes.reduce((s,n)=>s+n.m,0)/p.notes.length;
      if(ink<0) ink=(avg<50&&song.parts.length>1&&!used.has(7))?7:-1;
      if(ink<0||used.has(ink)) ink=INK_FALLBACK.find(k=>!used.has(k))??ink;
      if(ink<0) ink=0;
    }
    p.ink=ink; if(!p.drum) used.add(ink);
  });
  // 贝斯颜色播放时会自动低一个八度，所以画的时候往上挪一个八度
  const pitchOf=(p,n)=>n.m+(p.ink===7?12:0);
  const mel=song.parts.filter(p=>!p.drum).flatMap(p=>p.notes.map(n=>({m:pitchOf(p,n),d:n.d})));
  // 2. 调和音阶：文件里写了就用，没写就找最贴合的大调；不在音阶里的音太多就用半音阶
  let tonic=0, scale='major';
  if(mel.length){
    const pc=m=>((m%12)+12)%12, offOf=(sc,t)=>{ const set=SCALES[sc].iv.map(x=>(x+t)%12); return mel.filter(n=>!set.includes(pc(n.m))).length; };
    let minor=false;
    if(song.key){ tonic=song.key.tonic; minor=song.key.minor; }
    else { let best=-1; for(let t=0;t<12;t++){ const set=SCALES.major.iv.map(x=>(x+t)%12);
      const sc=mel.reduce((s,n)=>s+(set.includes(pc(n.m))?n.d:0),0); if(sc>best){ best=sc; tonic=t; } } }
    // 小调常有升高的导音（和声小调）；在几种相近的音阶里挑不在音阶里的音最少的那个
    let bestOff=1e9; for(const sc of SCALE_TRY[minor?'minor':'major']){ const o=offOf(sc,tonic); if(o<bestOff){ bestOff=o; scale=sc; } }
    if(bestOff>mel.length*.03) scale='chromatic';
  }
  const iv=SCALES[scale].iv;
  // 3. 音域和八度：用最小的音域把所有音装下；装不下（超过 3 个八度）就把出界的音按八度折回来
  let range=3, octave=0;
  if(mel.length){
    const lo=Math.min(...mel.map(n=>n.m)), hi=Math.max(...mel.map(n=>n.m)), mid=(lo+hi)/2;
    let found=false;
    for(let r=1;r<=3&&!found;r++){ let bestO=null,bestD=1e9;
      for(let o=-2;o<=2;o++){ const base=60+tonic+12*o-(r===3?12:0), top=base+12*r;
        if(base<=lo&&hi<=top){ const dd=Math.abs((base+top)/2-mid); if(dd<bestD){ bestD=dd; bestO=o; } } }
      if(bestO!==null){ range=r; octave=bestO; found=true; } }
    if(!found){ let bestC=-1; for(let o=-2;o<=2;o++){ const base=60+tonic+12*o-12, top=base+36;
        const c=mel.filter(n=>n.m>=base&&n.m<=top).length; if(c>bestC){ bestC=c; octave=o; } } range=3; }
  }
  const base=60+tonic+12*octave-(range===3?12:0), R=[];
  for(let o=0;o<range;o++) for(const x of iv) R.push(base+12*o+x); R.push(base+12*range);
  const lowM=R[0], highM=R[R.length-1], top=R.length-1;
  let folded=0, snapped=0;
  const rowOf=m=>{ if(m<lowM||m>highM){ folded++; while(m<lowM) m+=12; while(m>highM) m-=12; }
    let bi=0; for(let i=0;i<R.length;i++) if(Math.abs(R[i]-m)<Math.abs(R[bi]-m)) bi=i;
    if(R[bi]!==m) snapped++; return bi; };
  // 4. 量化：选能对上几乎所有音的最粗的格子
  const allN=song.parts.flatMap(p=>p.notes);
  const drumSet=new Set(song.parts.filter(p=>p.drum).flatMap(p=>p.notes));   // 鼓只是一个点：只看什么时候敲，不看多长
  const fit=spb=>{ let ok=0; for(const n of allN){ const a=n.t*spb, b=(n.t+n.d)*spb;
    if(Math.abs(a-Math.round(a))<.08&&(drumSet.has(n)||Math.abs(b-Math.round(b))<.08)) ok++; } return ok/allN.length; };
  let quant='16', spb=4, bestFit=-1;
  for(const [q,s] of QUANT_TRY){ const f=fit(s); if(f>=.98){ quant=q; spb=s; bestFit=f; break; } if(f>bestFit){ bestFit=f; quant=q; spb=s; } }
  if(bestFit<.98) warn.push(`有 ${Math.round((1-bestFit)*100)}% 的音节奏太细，对到了最近的 ${QUANT[quant].label} 格子上`);
  // 5. 画线：一页 16 拍；一个音画成一段横线，尾巴留一步空（同音连弹能分开）；跨页的音拆成两段
  const P=16*spb, MAX_PAGES=99, pages=[];
  const add=(pg,s)=>{ while(pages.length<=pg) pages.push([]); pages[pg].push(s); };
  let cut=false;
  for(const p of song.parts) for(const n of p.notes){
    let a=Math.round(n.t*spb), b=Math.round((n.t+n.d)*spb); if(b<=a) b=a+1;
    if(a>=P*MAX_PAGES){ cut=true; continue; } if(b>P*MAX_PAGES){ b=P*MAX_PAGES; cut=true; }
    const y=p.drum?+(1-Math.round(gmDrumFrac(n.m)*top)/top).toFixed(4):+(1-rowOf(pitchOf(p,n))/top).toFixed(4);
    if(p.drum){ add(Math.floor(a/P),{ink:p.ink,pts:[[+(((a%P)+.15)/P).toFixed(4),y]]}); continue; }
    while(a<b){ const pg=Math.floor(a/P), ls=a-pg*P, segEnd=Math.min(b,(pg+1)*P), len=segEnd-a, last=segEnd===b;
      const x0=+((ls+.15)/P).toFixed(4), x1=+((ls+len-(last?1.15:.15))/P).toFixed(4);
      add(pg,{ink:p.ink,pts:(last?len>=2:len>=1)&&x1>x0?[[x0,y],[x1,y]]:[[x0,y]]}); a=segEnd; }
  }
  if(!pages.length) pages.push([]);
  if(cut) warn.push(`太长了，只导入了前 ${MAX_PAGES} 页`);
  if(folded) warn.push(`有 ${folded} 个音超出 3 个八度，挪了八度放进来`);
  if(snapped&&scale!=='chromatic') warn.push(`有 ${snapped} 个临时升降的音对到了最近的音阶音`);
  const bpm=clamp(Math.round(song.bpm||100),40,240);
  if(song.bpm&&Math.round(song.bpm)!==bpm) warn.push(`速度 ${Math.round(song.bpm)} 超出范围，改成了 ${bpm}`);
  const firstInk=(song.parts.find(p=>!p.drum)||song.parts[0]).ink;
  return {obj:{app:'xingsheng',version:3,
      settings:{...S,key:tonic,scale,range,octave,cents:0,quant,swing:'off',beats:0,bpm,mode:1,ink:firstInk},
      tracks:[{pages:pages.map(l=>({strokes:l,bars:1})),pageIndex:0}],trackIndex:0,timelineOn:pages.length>1},
    info:{parts:song.parts.map(p=>({name:p.name,ink:p.ink})),pages:pages.length,bpm,scale,tonic,warn}};
}

// ---------------- 界面 ----------------
const JIANPU_DEMO=`欢乐颂（贝多芬）
1=C 4/4 ♩=110
3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3. 2_ 2 - |
3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2. 1_ 1 - |
@贝斯
1, - 1, - | 5,, - 5,, - | 1, - 1, - | 5,, - 5,, - |
1, - 1, - | 5,, - 5,, - | 1, - 1, - | 5,, - 1, - |`;
function openImport(){ $('imp').classList.add('show'); $('impErr').textContent=''; }
function closeImport(){ $('imp').classList.remove('show'); }
function applyImport(song,fallbackName){
  const {obj,info}=songToWork(song);
  const msg=stashCurrent(); if(playing) pause();
  load(obj); setCurrent({});
  const name=(song.title||fallbackName||'导入的谱子').slice(0,40);
  saveCurrent(name,true,true); closeImport();
  const parts=info.parts.map(p=>`${p.name?p.name+'→':''}${INSTR[p.ink]}`).join('、');
  const head=`已导入《${currentWork.name}》：${info.parts.length} 个声部（${parts}），${info.pages} 页，${KEY_NAMES[info.tonic]} ${SCALES[info.scale].name}，速度 ${info.bpm}。已存进「我的作品」`;
  toast(head+(info.warn.length?'。注意：'+info.warn.join('；'):'')+(msg?'。'+msg:''),info.warn.length||msg?8000:5000);
}
async function importFile(f){
  const ext=(f.name.split('.').pop()||'').toLowerCase(), base=f.name.replace(/\.[^.]+$/,'');
  try{
    if(/^(png|jpe?g|gif|webp|bmp|heic|pdf)$/.test(ext)) throw new Error('照片和 PDF 不能直接识别：请先用 MuseScore 或 Audiveris 把它转成 MusicXML，再导入');
    let song;
    if(ext==='mid'||ext==='midi') song=parseMidi(await f.arrayBuffer());
    else if(ext==='mxl') song=parseMusicXML(await unzipMxl(await f.arrayBuffer()));
    else if(ext==='musicxml'||ext==='xml') song=parseMusicXML(await f.text());
    else if(ext==='txt') song=parseJianpu(await f.text());
    else throw new Error('不认识这种文件：支持 .musicxml / .xml / .mxl / .mid / .midi / .txt（简谱）');
    applyImport(song,base);
  }catch(e){ $('imp').classList.add('show'); $('impErr').textContent='导入失败：'+e.message; }
}
$('impBtn').onclick=openImport;
$('impClose').onclick=closeImport;
$('imp').onclick=e=>{ if(e.target.id==='imp') closeImport(); };
$('impFile').onclick=()=>$('impInput').click();
$('impInput').onchange=e=>{ const f=e.target.files[0]; if(f) importFile(f); e.target.value=''; };
$('impDemo').onclick=()=>{ $('impText').value=JIANPU_DEMO; $('impErr').textContent=''; };
$('impGo').onclick=()=>{ const t=$('impText').value; if(!t.trim()){ $('impErr').textContent='先输入简谱，或点「填入示例」'; return; }
  try{ applyImport(parseJianpu(t),''); }catch(e){ $('impErr').textContent='导入失败：'+e.message; } };
$('impText').onkeydown=e=>{ e.stopPropagation(); if(e.key==='Escape') closeImport(); if((e.ctrlKey||e.metaKey)&&e.key==='Enter') $('impGo').click(); };
// 把文件直接拖到网页上也能导入
window.addEventListener('dragover',e=>{ if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
window.addEventListener('drop',e=>{ const f=e.dataTransfer&&e.dataTransfer.files[0]; if(!f) return; e.preventDefault(); importFile(f); });
