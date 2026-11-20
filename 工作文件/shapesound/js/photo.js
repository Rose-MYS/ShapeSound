"use strict";
/* 形声 · 照片描线：把任意照片 / 图片的轮廓描成线条，变成一幅会响的画（不识别音符）
   思路参考 LingDong 的 linedraw（MIT）：灰度 → 高斯模糊 → Sobel 梯度 → 非极大值抑制 → 双阈值连接（Canny）
   → 把边缘像素串成折线 → Ramer–Douglas–Peucker 简化 → 只留最长的若干条。全部自己实现，不依赖任何库。 */
let photoImg=null, photoName='', photoLines=[];

function loadPhoto(file){
  const url=URL.createObjectURL(file), img=new Image();
  img.onload=()=>{ photoImg=img; photoName=file.name.replace(/\.[^.]+$/,''); $('phBox').hidden=false;
    openImport(); $('impErr').textContent=''; tracePhoto(); setTimeout(()=>$('phBox').scrollIntoView({block:'nearest'}),50); };
  img.onerror=()=>{ openImport(); $('impErr').textContent='这张图片打不开（HEIC 等格式请先转成 JPG / PNG）'; URL.revokeObjectURL(url); };
  img.src=url;
}

// ---------------- Canny 边缘 ----------------
function cannyEdges(gray,w,h,detail){
  // 高斯模糊：细节越多模糊越少
  const sigma=2.4-detail*.15, r=Math.ceil(sigma*2.5), k=[]; let ks=0;
  for(let i=-r;i<=r;i++){ const v=Math.exp(-i*i/(2*sigma*sigma)); k.push(v); ks+=v; } for(let i=0;i<k.length;i++) k[i]/=ks;
  const tmp=new Float32Array(w*h), bl=new Float32Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let s=0; for(let i=-r;i<=r;i++) s+=gray[y*w+clamp(x+i,0,w-1)]*k[i+r]; tmp[y*w+x]=s; }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let s=0; for(let i=-r;i<=r;i++) s+=tmp[clamp(y+i,0,h-1)*w+x]*k[i+r]; bl[y*w+x]=s; }
  // Sobel
  const mag=new Float32Array(w*h), dir=new Uint8Array(w*h);
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ const p=(yy,xx)=>bl[yy*w+xx];
    const gx=-p(y-1,x-1)-2*p(y,x-1)-p(y+1,x-1)+p(y-1,x+1)+2*p(y,x+1)+p(y+1,x+1);
    const gy=-p(y-1,x-1)-2*p(y-1,x)-p(y-1,x+1)+p(y+1,x-1)+2*p(y+1,x)+p(y+1,x+1);
    mag[y*w+x]=Math.hypot(gx,gy); let a=Math.atan2(gy,gx)*180/Math.PI; if(a<0) a+=180;
    dir[y*w+x]=a<22.5||a>=157.5?0:a<67.5?1:a<112.5?2:3; }
  // 非极大值抑制（离图片边框 3 像素以内的不要，免得把相框描进去）
  const nms=new Float32Array(w*h), vals=[];
  for(let y=3;y<h-3;y++) for(let x=3;x<w-3;x++){ const i=y*w+x, m=mag[i]; if(m<4) continue;
    const d=dir[i], [a,b]=d===0?[i-1,i+1]:d===1?[i-w-1,i+w+1]:d===2?[i-w,i+w]:[i-w+1,i+w-1];
    if(m>=mag[a]&&m>=mag[b]){ nms[i]=m; vals.push(m); } }
  if(!vals.length) return new Uint8Array(w*h);
  vals.sort((p,q)=>p-q);
  // 高阈值：按比例取，但不超过一个固定上限——干净的简笔画里粗黑边特别强，只按比例会把较弱的真边缘也滤掉
  const high=Math.min(vals[Math.floor(vals.length*(.9-detail*.045))],150-detail*10), low=high*.45;
  // 双阈值 + 连接：强边缘出发，沿着弱边缘长出去
  const E=new Uint8Array(w*h), st=[];
  for(let i=0;i<w*h;i++) if(nms[i]>=high){ E[i]=1; st.push(i); }
  const N8=[-w-1,-w,-w+1,-1,1,w-1,w,w+1];
  while(st.length){ const i=st.pop(); for(const o of N8){ const j=i+o; if(!E[j]&&nms[j]>=low){ E[j]=1; st.push(j); } } }
  return E;
}
// ---------------- 边缘像素 → 折线 ----------------
function linkEdges(E,w,h){
  const N4=[-w,1,w,-1], ND=[-w-1,-w+1,w+1,w-1], NB=[...N4,...ND], seen=new Uint8Array(w*h), lines=[];
  const deg=i=>{ let c=0; for(const o of NB) if(E[i+o]) c++; return c; };
  const walk=s=>{ const path=[s]; seen[s]=1; let cur=s;
    for(;;){ let nx=-1; for(const o of NB){ const j=cur+o; if(E[j]&&!seen[j]){ nx=j; break; } }   // 先走上下左右，再走斜的
      if(nx<0) break; seen[nx]=1; path.push(nx); cur=nx; }
    if(path.length>8&&NB.some(o=>cur+o===s)) path.push(s);   // 首尾相接：闭合成环
    return path.map(i=>[i%w,(i/w)|0]); };
  for(let i=0;i<w*h;i++) if(E[i]&&!seen[i]&&deg(i)===1) lines.push(walk(i));   // 先从线头开始走
  for(let i=0;i<w*h;i++) if(E[i]&&!seen[i]) lines.push(walk(i));                 // 剩下的是环
  return lines;
}
function rdp(pts,eps){
  if(pts.length<3) return pts.slice();
  const [fx,fy]=pts[0],[lx,ly]=pts[pts.length-1];
  if(Math.hypot(fx-lx,fy-ly)<.5){   // 闭合的环：起点就是终点，先从离起点最远的地方切成两半再分别简化
    let mi=1,md=-1; pts.forEach(([x,y],i)=>{ const d=Math.hypot(x-fx,y-fy); if(d>md){ md=d; mi=i; } });
    if(mi>0&&mi<pts.length-1) return [...rdp(pts.slice(0,mi+1),eps),...rdp(pts.slice(mi),eps).slice(1)];
  }
  const keep=new Uint8Array(pts.length); keep[0]=keep[pts.length-1]=1; const st=[[0,pts.length-1]];
  while(st.length){ const [a,b]=st.pop(); const [ax,ay]=pts[a],[bx,by]=pts[b], dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy)||1; let md=0,mi=-1;
    for(let i=a+1;i<b;i++){ const d=Math.abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/L; if(d>md){ md=d; mi=i; } }
    if(md>eps&&mi>0){ keep[mi]=1; st.push([a,mi],[mi,b]); } }
  return pts.filter((_,i)=>keep[i]);
}
const polyLen=p=>{ let s=0; for(let i=1;i<p.length;i++) s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); return s; };

// ---------------- 颜色 → 乐器 ----------------
const PHOTO_INKS=SWATCH_ORDER.filter(i=>i!==DRUM_INK&&i!==7);   // 不用鼓组和贝斯（贝斯会低一个八度，太闷）
function hexRgb(h){ return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); }
function inkForColor([r,g,b]){
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  if(mx-mn<38) return 0;                                   // 黑白灰的线 → 键盘
  let best=PHOTO_INKS[0], bd=1e9;
  for(const i of PHOTO_INKS){ const [R,G,B]=hexRgb(PALETTES[S.palette][i]); const d=2*(r-R)**2+4*(g-G)**2+3*(b-B)**2; if(d<bd){ bd=d; best=i; } }
  return best;
}

// ---------------- 描线 + 预览 ----------------
function paperAspect(){ const w=W-PAD.l-PAD.r, h=H-PAD.t-PAD.b; return w>0&&h>0?w/h:2.4; }
function tracePhoto(){
  if(!photoImg) return;
  const detail=+$('phDetail').value, byColor=$('phColor').value==='photo', fill=$('phFit').value==='fill';
  const iw=photoImg.naturalWidth, ih=photoImg.naturalHeight, sc=Math.min(360/Math.max(iw,ih),Math.max(1,220/Math.max(iw,ih)));
  const w=Math.max(16,Math.round(iw*sc)), h=Math.max(16,Math.round(ih*sc));
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  g.fillStyle='#fff'; g.fillRect(0,0,w,h); g.drawImage(photoImg,0,0,w,h);
  const px=g.getImageData(0,0,w,h).data, gray=new Float32Array(w*h);
  for(let i=0;i<w*h;i++) gray[i]=.299*px[i*4]+.587*px[i*4+1]+.114*px[i*4+2];
  const E=cannyEdges(gray,w,h,detail);
  const minLen=Math.max(6,(13-detail)*2.2), maxLines=16+detail*14;
  let lines=linkEdges(E,w,h).filter(l=>polyLen(l)>=minLen).sort((a,b)=>polyLen(b)-polyLen(a)).slice(0,maxLines);
  // 照片放进画纸：保持比例时居中，留一点边
  const A=paperAspect(), a=w/h, M=.03; let sx=1-2*M, sy=1-2*M, ox=M, oy=M;
  if(!fill){ if(a>A){ sy=(1-2*M)*A/a; oy=(1-sy)/2; } else { sx=(1-2*M)*a/A; ox=(1-sx)/2; } }
  photoLines=lines.map(l=>{
    let col=[0,0,0], n=0;
    if(byColor){ for(let k=0;k<l.length;k+=2){ const [x,y]=l[k];   // 在线的两侧取颜色，挑颜色最鲜艳的那一侧
        let bestC=null,bs=-1; for(const [dx,dy] of [[0,-2],[0,2],[-2,0],[2,0]]){ const xx=clamp(x+dx,0,w-1), yy=clamp(y+dy,0,h-1), j=(yy*w+xx)*4;
          const cc=[px[j],px[j+1],px[j+2]], s=Math.max(...cc)-Math.min(...cc); if(s>bs){ bs=s; bestC=cc; } }
        col[0]+=bestC[0]; col[1]+=bestC[1]; col[2]+=bestC[2]; n++; }
      col=col.map(v=>v/Math.max(n,1)); }
    let pts=rdp(l,1.1), eps=1.1; while(pts.length>60){ eps*=1.5; pts=rdp(l,eps); }
    return {ink:byColor?inkForColor(col):S.ink,
      pts:pts.map(([x,y])=>[+clamp(ox+x/(w-1)*sx,0,.999).toFixed(4),+clamp(oy+y/(h-1)*sy,0,1).toFixed(4)])};
  });
  drawPhotoPreview();
}
function drawPhotoPreview(){
  const cvs=$('phPrev'), cw=cvs.clientWidth||600, ch=Math.round(cw/paperAspect()), dpr=window.devicePixelRatio||1;
  cvs.style.height=ch+'px'; cvs.width=Math.round(cw*dpr); cvs.height=Math.round(ch*dpr);
  const g=cvs.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.fillStyle=C.paper||'#fffdf8'; g.fillRect(0,0,cw,ch);
  g.lineWidth=1.6; g.lineCap='round'; g.lineJoin='round';
  for(const s of photoLines){ g.strokeStyle=g.fillStyle=PALETTES[S.palette][s.ink]; const P=s.pts;
    g.beginPath(); P.forEach(([x,y],i)=>i?g.lineTo(x*cw,y*ch):g.moveTo(x*cw,y*ch)); g.stroke(); }
  const inks=[...new Set(photoLines.map(s=>s.ink))];
  $('phInfo').textContent=photoLines.length?`${photoLines.length} 条线 · ${inks.length} 种乐器（${inks.slice(0,6).map(i=>INSTR[i]).join('、')}${inks.length>6?'…':''}）`:'没有找到清楚的轮廓，试试把「线条多少」往右拉';
}
function applyPhoto(){
  if(!photoLines.length){ $('impErr').textContent='还没有线条：先选一张照片'; return; }
  const msg=stashCurrent(); if(playing) pause();
  load({app:'xingsheng',version:3,
    settings:{...S,key:0,scale:'majPent',range:3,octave:0,cents:0,quant:'16',swing:'off',beats:0,bpm:84,mode:1,ink:photoLines[0].ink},
    tracks:[{pages:[{strokes:JSON.parse(JSON.stringify(photoLines)),bars:1}],pageIndex:0}],trackIndex:0,timelineOn:false});
  setCurrent({}); saveCurrent(('照片：'+photoName).slice(0,40),true,true); closeImport();
  toast(`已把照片描成 ${photoLines.length} 条线，存为《${currentWork.name}》。用的是大调五声音阶，怎么画都和谐；按 ▶ 听听看`+(msg?'。'+msg:''),msg?6000:4000);
}
$('phFile').onclick=()=>$('phInput').click();
$('phInput').onchange=e=>{ const f=e.target.files[0]; if(f) loadPhoto(f); e.target.value=''; };
['phDetail','phColor','phFit'].forEach(id=>$(id).addEventListener('input',tracePhoto));
$('phGo').onclick=applyPhoto;
