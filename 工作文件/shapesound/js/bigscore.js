"use strict";
/* 形声 · 大屏曲谱（issue #3）：画纸铺满整个屏幕，只留一排浮动的小工具条，手机上也能画 */
let bigOn=false;
function renderBigBar(){
  if(!bigOn) return;
  $('bbPlay').innerHTML=$('play').innerHTML;
  $('bbPen').classList.toggle('on',tool==='draw'); $('bbErase').classList.toggle('on',tool==='erase');
  $('bbUndo').disabled=$('tUndo').disabled;
  $('bbInk').style.background=PALETTES[S.palette][S.ink]; $('bbInk').title='换颜色（现在是'+INSTR[S.ink]+'）';
}
function buildBigInks(){
  const box=$('bbInks'); box.innerHTML='';
  SWATCH_ORDER.forEach(i=>{ const b=document.createElement('button'); b.className='bbsw'+(i===S.ink?' on':''); b.style.background=PALETTES[S.palette][i];
    b.title=INSTR[i]; b.innerHTML=`<span>${INSTR[i]}</span>`;
    b.onclick=()=>{ setInk(i); box.hidden=true; renderBigBar(); }; box.appendChild(b); });
}
function setBig(on){
  if(on===bigOn) return; bigOn=on;
  document.body.classList.toggle('big',on); $('bigbar').hidden=!on; $('bbInks').hidden=true;
  if(on){
    renderBigBar();
    const el=document.documentElement;   // 能全屏就顺便全屏（手机浏览器不支持也没关系，画纸照样铺满窗口）
    if(el.requestFullscreen&&!document.fullscreenElement) el.requestFullscreen().catch(()=>{});
    toast('大屏曲谱：按右上角「退出」或 Esc 回到普通界面',2600);
  } else if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  setTimeout(resize,60);
}
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement&&bigOn) setBig(false); });
$('bigBtn').onclick=()=>setBig(true);
$('bbExit').onclick=()=>setBig(false);
$('bbPlay').onclick=()=>{ playing?pause():play(); renderBigBar(); };
$('bbPen').onclick=()=>{ setTool('draw'); renderBigBar(); };
$('bbErase').onclick=()=>{ setTool('erase'); renderBigBar(); };
$('bbUndo').onclick=()=>{ undo(); renderBigBar(); };
$('bbInk').onclick=()=>{ const box=$('bbInks'); if(box.hidden) buildBigInks(); box.hidden=!box.hidden; };
// 播放状态、撤销按钮、工具在别处改了，小工具条也跟着变
setInterval(renderBigBar,300);
// 手机浏览器不能真全屏时，Esc 也能退出大屏
window.addEventListener('keydown',e=>{ if(bigOn&&e.key==='Escape'&&!document.fullscreenElement){ e.stopPropagation(); setBig(false); } },true);
