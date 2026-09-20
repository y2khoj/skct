/* Shared interaction/accessibility layer; practice and scoring remain page-owned. */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const focusable=root=>[...root.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length);
  let toolsPanel=null, toolsButton=null, toolsBackdrop=null;
  const narrow=matchMedia('(max-width:800px)');
  function showTools(open, focus=true) {
    if(!toolsPanel)return;
    toolsPanel.hidden=!open;
    toolsButton.setAttribute('aria-expanded',String(open));
    toolsBackdrop.hidden=!open||!narrow.matches;
    toolsPanel.toggleAttribute('aria-modal',open&&narrow.matches);
    toolsPanel.setAttribute('role',narrow.matches?'dialog':'complementary');
    if(open&&narrow.matches)toolsPanel.setAttribute('aria-modal','true');
    if(focus)(open?$('close-tools'):toolsButton).focus();
    // The drawing surface measures its visible parent when resized.
    window.dispatchEvent(new Event('resize'));
  }
  if($('side-panel')) {
    toolsPanel=$('side-panel');toolsPanel.setAttribute('aria-label','풀이 도구');
    toolsButton=document.createElement('button');toolsButton.id='toggle-tools';toolsButton.className='tools-toggle';toolsButton.type='button';toolsButton.textContent='풀이 도구';toolsButton.setAttribute('aria-controls','side-panel');
    document.querySelector('.q-top-bar').append(toolsButton);
    const heading=document.createElement('div');heading.className='tools-heading';heading.innerHTML='<h2>메모 · 그림판 · 계산기</h2><button id="close-tools" class="tools-close" type="button" aria-label="풀이 도구 닫기">닫기</button>';toolsPanel.prepend(heading);
    const archive=document.createElement('a');archive.href='sources.html';archive.target='_blank';archive.rel='noopener';archive.className='tools-source-link';archive.textContent='원본 자료실 열기 ↗';archive.setAttribute('aria-label','원본 자료실 (새 탭)');heading.after(archive);
    toolsBackdrop=document.createElement('div');toolsBackdrop.className='tools-backdrop';toolsBackdrop.hidden=true;document.body.append(toolsBackdrop);
    toolsButton.addEventListener('click',()=>showTools(toolsPanel.hidden));
    $('close-tools').addEventListener('click',()=>showTools(false));toolsBackdrop.addEventListener('click',()=>showTools(false));
    narrow.addEventListener('change',()=>showTools(!narrow.matches,false));showTools(!narrow.matches,false);
  }
  // Give icon-only controls their existing descriptive title as an accessible name.
  document.querySelectorAll('.close-btn').forEach(b=>{if(!b.hasAttribute('aria-label'))b.setAttribute('aria-label','닫기');});
  document.querySelectorAll('button[title]').forEach(b=>{if(!b.hasAttribute('aria-label'))b.setAttribute('aria-label',b.title);});
  let activeDialog=null, returnFocus=null, lastTrigger=null;
  document.addEventListener('click',e=>{const target=e.target.closest('button,a,summary');if(target)lastTrigger=target;},true);
  function syncDialog() {
    const open=[...document.querySelectorAll('.modal-overlay.open')].filter(el=>el.getClientRects().length).at(-1);
    const next=open?.querySelector('.modal-card')||document.querySelector('.omr-flyout.open')||null;
    if(next===activeDialog)return;
    if(next){
      if(!activeDialog)returnFocus=next.contains(document.activeElement)?lastTrigger:document.activeElement;
      activeDialog=next;next.setAttribute('role','dialog');next.setAttribute('aria-modal','true');
      if(!next.hasAttribute('aria-label')&&!next.hasAttribute('aria-labelledby'))next.setAttribute('aria-label',next.querySelector('h2')?.textContent||'안내');
      if(!next.contains(document.activeElement))(focusable(next)[0]||next).focus();
    }else{
      activeDialog=null;
      if(returnFocus?.isConnected&&returnFocus.getClientRects().length)returnFocus.focus({preventScroll:true});
      returnFocus=null;
    }
  }
  new MutationObserver(syncDialog).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
  document.addEventListener('keydown',e=>{
    const drawerOpen=toolsPanel&&!toolsPanel.hidden&&narrow.matches;
    if(e.key==='Escape'&&activeDialog){const close=activeDialog.querySelector('.close-btn');if(close){e.preventDefault();e.stopPropagation();close.click();return;}}
    if(e.key==='Escape'&&drawerOpen&&!activeDialog){e.preventDefault();e.stopPropagation();showTools(false);return;}
    const root=activeDialog||(drawerOpen?toolsPanel:null);if(e.key!=='Tab'||!root)return;
    e.stopPropagation();
    const items=focusable(root);if(!items.length){e.preventDefault();return;}
    const first=items[0],last=items.at(-1);
    if(!root.contains(document.activeElement)||(e.shiftKey&&document.activeElement===first)){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  },true);
  syncDialog();
})();
