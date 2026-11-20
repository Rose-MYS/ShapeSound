"use strict";
/* 形声 · 我的作品（浏览器里的作品库）+ 启动 */
// ---------------- 我的作品（保存在浏览器里，可随时切换） ----------------
// 规则：已保存的作品 → 之后的修改自动保存；示例曲本身不能改，一动就自动另存为一个新作品（「xx（我的改编）」）；
//       没保存的新作品 → 切换走时自动存成「草稿」。什么都不会丢。
const LIB_KEY='xingsheng.library', CUR_KEY='xingsheng.current', MAX_DRAFTS=10;
var currentWork=null;   // {id: 作品库里的 id 或 null, name, sample: 正在看的示例曲 id, saved: 上次保存时的内容}
function libLoad(){ try{ return JSON.parse(localStorage.getItem(LIB_KEY))||[]; }catch(e){ return []; } }
function libSave(list){ try{ localStorage.setItem(LIB_KEY,JSON.stringify(list)); return true; }
  catch(e){ toast('浏览器的存储空间满了：删掉几个作品，或先导出成文件',4000); return false; } }
const newId=()=>'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function fmtTime(t){ const d=new Date(t),p=n=>String(n).padStart(2,'0'); return `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
// 只比较「音乐内容」：线条 + 影响声音的设置（换颜色、换背景不算改动）
function contentJSON(){ return JSON.stringify({p:tracks.map(t=>t.pages.map(pg=>[pageBars(pg),pg.strokes])),
  s:[S.key,S.scale,S.range,S.octave,S.cents,S.quant,S.swing,S.beats,S.bpm]}); }
function hasWork(){ return tracks.some(t=>t.pages.some(pg=>pg.strokes.length)); }
function setCurrent(o){ currentWork={id:null,name:'',sample:null,...o,saved:contentJSON()}; persistCurrent(); updateWorkLabel(); }
function persistCurrent(){ try{ localStorage.setItem(CUR_KEY,JSON.stringify(currentWork)); }catch(e){} }
function isDirty(){ return !!currentWork && hasWork() && contentJSON()!==currentWork.saved; }
function libAutosave(){
  if(!currentWork || suppressLib) return;
  if(!currentWork.id && currentWork.sample && isDirty()){ forkSample(); return; }
  if(currentWork.id && isDirty()){ const list=libLoad(), w=list.find(x=>x.id===currentWork.id);
    if(w){ w.data=serialize(); w.savedAt=Date.now(); if(libSave(list)){ currentWork.saved=contentJSON(); persistCurrent(); } }
    else { currentWork.id=null; persistCurrent(); } }
  updateWorkLabel();
}
// 改了示例曲：示例曲保持原样，改动另存为一个新作品，之后的修改都存进这个新作品
function forkSample(){
  const sample=songById(currentWork.sample); if(!sample) return;
  const list=libLoad(), base=`${sample.title}（我的改编）`;
  let name=base, n=2; while(list.some(w=>w.name===name)) name=`${base} ${n++}`;
  const w={id:newId(),name,savedAt:Date.now(),data:serialize()}; list.unshift(w);
  if(!libSave(list)) return;
  setCurrent({id:w.id,name:w.name});
  toast(`示例曲不会被改动，你的修改已另存为《${name}》，在「我的作品」里`,4000);
}
// 切换到别的作品 / 示例曲 / 新建之前调用：没保存的东西存成草稿，返回给用户看的提示
function stashCurrent(){
  if(!currentWork || currentWork.id || !isDirty()) return '';
  const sample=currentWork.sample&&songById(currentWork.sample);
  const name=sample?`${sample.title}（改编）${fmtTime(Date.now())}`:`草稿 ${fmtTime(Date.now())}`;
  let list=libLoad(); list.unshift({id:newId(),name,draft:true,savedAt:Date.now(),data:serialize()});
  let n=0; list=list.filter(w=>!w.draft||++n<=MAX_DRAFTS);   // 草稿最多留 10 个，太旧的自动删
  return libSave(list)?`刚才没保存的已存为草稿「${name}」，在「我的作品」里`:'';
}
function defaultName(){
  const sample=currentWork&&currentWork.sample&&songById(currentWork.sample);
  return sample?`我的《${sample.title}》`:`我的作品 ${libLoad().filter(w=>!w.draft).length+1}`;
}
function saveCurrent(name,asNew,quiet){
  name=(name||'').trim()||defaultName(); const list=libLoad();
  let w=!asNew&&currentWork.id&&list.find(x=>x.id===currentWork.id);
  if(w){ w.name=name; w.data=serialize(); w.savedAt=Date.now(); delete w.draft; }
  else { w={id:newId(),name,savedAt:Date.now(),data:serialize()}; list.unshift(w); }
  if(!libSave(list)) return false;
  setCurrent({id:w.id,name:w.name}); if(!quiet) toast(`已保存《${w.name}》，之后的修改会自动保存`,2600);
  if($('lib').classList.contains('show')) renderLib();
  return true;
}
function quickSave(){ if(currentWork&&currentWork.id&&libLoad().some(w=>w.id===currentWork.id)) saveCurrent(currentWork.name); else openLib(true); }
function openWork(id){
  const w=libLoad().find(x=>x.id===id); if(!w) return;
  const msg=stashCurrent(); if(playing) pause();
  try{ load(w.data); }catch(e){ toast('打不开：'+e.message); return; }
  setCurrent({id:w.id,name:w.name}); closeLib();
  toast(`已打开《${w.name}》`+(msg?'。'+msg:''),msg?4000:1800);
}
function newWork(){
  const msg=stashCurrent(); if(playing) pause();
  load({settings:{...S},tracks:[{pages:[{strokes:[],bars:1}],pageIndex:0}],trackIndex:0,timelineOn:false});
  setCurrent({}); closeLib(); toast('新的空白画纸'+(msg?'。'+msg:''),msg?4000:1800);
}
function deleteWork(id){
  const list=libLoad().filter(w=>w.id!==id); libSave(list);
  if(currentWork.id===id){ currentWork.id=null; currentWork.saved=''; persistCurrent(); updateWorkLabel(); }
  renderLib();
}
function renameWork(id,name){
  name=(name||'').trim(); if(!name) return renderLib();
  const list=libLoad(), w=list.find(x=>x.id===id); if(!w) return;
  w.name=name; delete w.draft; libSave(list);
  if(currentWork.id===id){ currentWork.name=name; persistCurrent(); updateWorkLabel(); }
  renderLib();
}
function updateWorkLabel(){
  const el=$('workNow'); if(!el||!currentWork) return;
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const sample=currentWork.sample&&songById(currentWork.sample);
  let h;
  if(currentWork.id) h=`正在编辑<br><b>《${esc(currentWork.name)}》</b> · 自动保存`;
  else if(sample) h=`示例：<b>《${sample.title}》</b>`+(isDirty()?'<br>已改动 · 未保存':'');
  else h=hasWork()?'<b>新作品</b> · 未保存':'<b>空白画纸</b>';
  el.innerHTML=h;
}
function renderLib(){
  const list=libLoad(), el=$('workList'); el.innerHTML='';
  if(currentWork.id && !list.some(w=>w.id===currentWork.id)){ currentWork.id=null; persistCurrent(); }
  $('libSave').textContent=currentWork.id?`保存（覆盖《${currentWork.name}》）`:'保存当前作品';
  $('libSaveNew').hidden=!currentWork.id;
  $('libName').value=currentWork.id?currentWork.name:defaultName();
  if(!list.length){ el.innerHTML='<div class="empty">还没有保存过作品。<br>画几笔，在上面起个名字，点「保存当前作品」就行。</div>'; return; }
  list.forEach(w=>{
    const row=document.createElement('div'); row.className='work'+(w.id===currentWork.id?' cur':'');
    const cvs=document.createElement('canvas'); cvs.width=192; cvs.height=72;
    const tr=(w.data&&w.data.tracks)||[]; thumb(cvs,(tr[0]&&tr[0].pages&&tr[0].pages[0]&&tr[0].pages[0].strokes)||[],1);
    const pages=tr.reduce((n,t)=>n+((t.pages&&t.pages.length)||0),0)||1;
    const info=document.createElement('div'); info.className='winfo';
    const nm=document.createElement('div'); nm.className='wname'; nm.textContent=w.name; nm.title='点击改名';
    nm.onclick=()=>{ const inp=document.createElement('input'); inp.value=w.name; inp.maxLength=40; nm.textContent=''; nm.appendChild(inp); inp.focus(); inp.select();
      let done=false; const fin=ok=>{ if(done) return; done=true; ok?renameWork(w.id,inp.value):renderLib(); };
      inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') fin(true); if(e.key==='Escape') fin(false); }; inp.onblur=()=>fin(true); };
    const meta=document.createElement('div'); meta.className='wmeta';
    meta.innerHTML=(w.draft?'<span class="wtag">草稿</span>':'')+(w.id===currentWork.id?'<span class="wtag">正在编辑</span>':'')+`${fmtTime(w.savedAt)} · ${pages} 页`;
    info.append(nm,meta);
    const btns=document.createElement('div'); btns.className='wbtns';
    const mk=(t,fn,cls)=>{ const x=document.createElement('button'); x.className='pill sm'+(cls?' '+cls:''); x.textContent=t; x.onclick=fn; btns.appendChild(x); return x; };
    if(w.id!==currentWork.id) mk('打开',()=>openWork(w.id),'hot');
    mk('导出',()=>{ download(new Blob([JSON.stringify(w.data)],{type:'application/json'}),`形声-${w.name.replace(/[\\/:*?"<>|]/g,'_')}.json`); toast('已导出 .json 文件'); });
    const del=mk('删除',()=>{ if(del.dataset.armed) return deleteWork(w.id);
      del.dataset.armed='1'; del.textContent='确定删除？'; del.classList.add('danger');
      setTimeout(()=>{ if(del.isConnected){ delete del.dataset.armed; del.textContent='删除'; del.classList.remove('danger'); } },3000); });
    row.append(cvs,info,btns); el.appendChild(row);
  });
}
function openLib(focusName){ renderLib(); $('lib').classList.add('show'); if(focusName){ const i=$('libName'); i.focus(); i.select(); } }
function closeLib(){ $('lib').classList.remove('show'); }
function restoreCurrent(){
  try{ const c=JSON.parse(localStorage.getItem(CUR_KEY)); if(c&&typeof c==='object') currentWork=c; }catch(e){}
  if(!currentWork) currentWork={id:null,name:'',sample:null,saved:''};
  // 旧版本留下的「暂存作品」搬进作品库
  try{ const m=localStorage.getItem('xingsheng.mine'); if(m){ const list=libLoad();
    list.unshift({id:newId(),name:'之前的作品（自动备份）',draft:true,savedAt:Date.now(),data:JSON.parse(m)});
    if(libSave(list)) localStorage.removeItem('xingsheng.mine'); } }catch(e){}
}
$('libBtn').onclick=()=>openLib(false);
$('save').onclick=quickSave;
$('libClose').onclick=closeLib;
$('lib').onclick=e=>{ if(e.target.id==='lib') closeLib(); };
$('libSave').onclick=()=>{ if(saveCurrent($('libName').value,false)) closeLib(); };
$('libSaveNew').onclick=()=>{ if(saveCurrent($('libName').value===currentWork.name?$('libName').value+' 副本':$('libName').value,true)) closeLib(); };
$('libName').onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') $('libSave').click(); };
$('libNew').onclick=newWork;
$('newBtn').onclick=newWork;
$('libImport').onclick=()=>$('openFile').click();

// ---------------- 启动 ----------------
(function init(){
  buildPiano(); readColors(); renderPlay();
  let ok=false;
  try{ const s=localStorage.getItem('xingsheng.v3')||localStorage.getItem('xingsheng.v2'); if(s){ load(JSON.parse(s)); ok=true; } }catch(e){}
  restoreCurrent();                       // 恢复「正在编辑哪个作品」，并把旧版的备份搬进作品库
  if(!ok){                                // 第一次来：画纸上直接摆好《小星星》（不显示网格）
    load(songObject(SONGS.find(x=>x.id==='twinkle'))); setCurrent({sample:'twinkle'});
  }
  renderInst(); renderSwatches(); renderUndo(); $('tGrid').classList.toggle('on',S.grid);
  $('hint').style.opacity=strokes.length?0:1;
  resize(); draw(); frame(); updateGridPulse(); updateWorkLabel();
  let welcomed=false; try{ welcomed=!!localStorage.getItem('xingsheng.welcomed'); }catch(e){}
  if(!welcomed) openSamples(true);        // 第一次打开：弹出示例曲，点一首就能听
})();
