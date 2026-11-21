"use strict";
/* 形声 · 新手引导（issue #2）：一步一步圈出常用和好玩的按钮，说一句它是干什么的 */
const TOUR_STEPS=[
  ['#swatches','颜色就是乐器','每种颜色是一种乐器。先选一种颜色，再到纸上画。'],
  ['#stage','在纸上画线','线越高音越高，从左到右是时间。横线是长音，竖着叠几条就是和弦。'],
  ['#play','播放','按这里或空格键开始播放，播放头扫到哪条线，哪条线就响。'],
  ['#tShuffle','随机换音色','一键把所有线换成随机的乐器，不喜欢就按 Ctrl+Z 换回来。'],
  ['#tGrid','音符网格','打开后能看到每一行是什么音。'],
  ['#samplesBtn','示例曲','不知道画什么？先听一首，再照着改一改。'],
  ['#impBtn','导入谱子','粘贴简谱、导入 MusicXML / MIDI，或者把一张照片描成会响的线条。'],
  ['#beat2','自动伴奏','贝斯、鼓、琶音，点一下就有伴奏，可以同时开好几个。'],
  ['#pagesBtn','Pages 时间线','把好几页串成一首完整的曲子。'],
  ['#loopBtn','单页循环','开着时只循环眼前这一页；关掉就一页接一页往下播。'],
  ['#bigBtn','大屏曲谱','画纸铺满整个屏幕，手机上画起来更方便。'],
  ['#libBtn','我的作品','保存过的作品都在这里，随时切换。'],
  ['#helpBtn','随时看帮助','忘了怎么用就点这里，也可以在里面重新看一遍引导。'],
];
let tourIdx=-1, tourList=[];
const tourVisible=sel=>{ const el=document.querySelector(sel); if(!el) return false; const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
function startTour(){
  closeSamples(); $('help').classList.remove('show');
  tourList=TOUR_STEPS.filter(s=>tourVisible(s[0]));   // 屏幕上看不到的按钮（比如手机上被收起的）就跳过
  if(!tourList.length) return;
  tourIdx=0; $('tour').hidden=false; showTourStep();
}
function endTour(){ tourIdx=-1; $('tour').hidden=true; try{ localStorage.setItem('xingsheng.tourDone','1'); }catch(e){} }
function showTourStep(){
  const [sel,title,text]=tourList[tourIdx], el=document.querySelector(sel);
  el.scrollIntoView({block:'nearest',inline:'nearest'});
  const r=el.getBoundingClientRect(), pad=6, spot=$('tourSpot'), bub=$('tourBubble');
  Object.assign(spot.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'});
  $('tourTitle').textContent=title; $('tourText').textContent=text;
  $('tourCount').textContent=`${tourIdx+1} / ${tourList.length}`;
  $('tourPrev').disabled=tourIdx===0; $('tourNext').textContent=tourIdx===tourList.length-1?'完成':'下一步';
  // 气泡放在目标下面，放不下就放上面；左右不出屏幕。目标太大（比如画纸）就放在它中间
  const bw=Math.min(300,innerWidth-24); bub.style.width=bw+'px';
  const bh=bub.offsetHeight, big=r.height>innerHeight*.5;
  let top=big?r.top+r.height/2-bh/2:(r.bottom+pad+12+bh<innerHeight?r.bottom+pad+12:r.top-pad-12-bh);
  top=clamp(top,12,innerHeight-bh-12);
  const left=clamp(r.left+r.width/2-bw/2,12,innerWidth-bw-12);
  bub.style.top=top+'px'; bub.style.left=left+'px';
}
$('tourNext').onclick=()=>{ if(tourIdx>=tourList.length-1) endTour(); else { tourIdx++; showTourStep(); } };
$('tourPrev').onclick=()=>{ if(tourIdx>0){ tourIdx--; showTourStep(); } };
$('tourSkip').onclick=endTour;
$('tourAgain').onclick=startTour;
window.addEventListener('resize',()=>{ if(tourIdx>=0) showTourStep(); });
// 引导打开时，键盘只管引导：←/→ 翻步，Esc 跳过；不触发播放等快捷键
window.addEventListener('keydown',e=>{ if(tourIdx<0) return; e.stopPropagation(); e.preventDefault();
  if(e.key==='Escape') endTour(); else if(e.key==='ArrowRight'||e.key==='Enter') $('tourNext').click(); else if(e.key==='ArrowLeft') $('tourPrev').click(); },true);
// 第一次来：关掉欢迎弹窗（示例曲）之后自动开始引导
const _closeSamplesBase=closeSamples;
closeSamples=function(){ const wasOpen=$('samples').classList.contains('show'); _closeSamplesBase();
  let done=true; try{ done=!!localStorage.getItem('xingsheng.tourDone'); }catch(e){}
  if(wasOpen&&!done&&tourIdx<0) setTimeout(()=>{ if(tourIdx<0&&!document.querySelector('.overlay.show')) startTour(); },500); };
$('samplesClose').onclick=()=>closeSamples();
$('samples').onclick=e=>{ if(e.target.id==='samples') closeSamples(); };
