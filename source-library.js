/* Original documents live in one searchable collection, separate from practice. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SKCTSourceLibrary=api;api.mount(SKCT_DATA);}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const normalize=value=>String(value).toLocaleLowerCase().replace(/\s+/g,' ').trim();
  function entries(data){return data.sections.flatMap(section=>section.questions.map(page=>({
    id:page.id,sectionId:section.id,section:section.name,title:page.title,
    questionImage:page.image,solutionImage:page.is_passage?null:page.solution_image,
    questionPage:page.page,solutionPages:page.solution_pages||[],isPassage:!!page.is_passage,
    search:normalize([section.name,page.title,page.part,page.id,`문제 ${page.page}p`,...(page.subQuestions||[]).map(q=>q.title)].join(' '))
  })));}
  function filter(all,section,query){const terms=normalize(query).split(' ').filter(Boolean);return all.filter(item=>(section==='all'||item.sectionId===section)&&terms.every(term=>item.search.includes(term)));}
  function mount(data){
    const $=id=>document.getElementById(id),all=entries(data);let results=all,selected=all[0]?.id,kind='question';
    data.sections.forEach(section=>{const option=document.createElement('option');option.value=section.id;option.textContent=section.name;$('source-section').append(option);});
    function renderList(){
      const list=$('source-list');list.replaceChildren();
      results.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='source-list-item';button.dataset.sourceId=item.id;button.setAttribute('aria-pressed',String(item.id===selected));
        const title=document.createElement('strong');title.textContent=item.title;const meta=document.createElement('span');meta.textContent=`${item.section} · 문제 ${item.questionPage}p${item.isPassage?' · 공통 지문':''}`;button.append(title,meta);
        button.addEventListener('click',()=>{selected=item.id;kind='question';renderList();renderViewer();if(matchMedia('(max-width:800px)').matches)$('source-title').focus();});list.append(button);
      });
    }
    function renderViewer(){
      const index=results.findIndex(item=>item.id===selected),item=results[index];$('source-viewer').hidden=!item;$('source-empty').hidden=!!item;
      if(!item){$('source-preview').removeAttribute('src');return;}
      if(!item.solutionImage)kind='question';
      const solution=kind==='solution',src=solution?item.solutionImage:item.questionImage;
      $('source-title').textContent=item.title;
      $('source-meta').textContent=`${item.section} · ${index+1} / ${results.length}개`;
      $('show-source-question').setAttribute('aria-pressed',String(!solution));$('show-source-solution').setAttribute('aria-pressed',String(solution));$('show-source-solution').disabled=!item.solutionImage;
      $('source-prev').disabled=index<=0;$('source-next').disabled=index===results.length-1;
      $('source-caption').textContent=solution?`원본 해설 ${item.solutionPages.join(', ')}p · 손글씨와 도형 포함`:`원본 문제 ${item.questionPage}p${item.isPassage?' · 공통 지문':''}`;
      $('source-preview').alt=`${item.title} ${solution?'해설·손글씨':'문제'} 원본`;
      $('source-load-status').textContent='원본을 불러오는 중입니다.';$('source-preview').hidden=true;
      $('source-preview').src=src;$('source-open-image').href=src;
    }
    $('source-preview').addEventListener('load',()=>{$('source-load-status').textContent='';$('source-preview').hidden=false;});
    $('source-preview').addEventListener('error',()=>{$('source-load-status').textContent='이미지를 불러오지 못했습니다. 이미지 크게 열기를 이용하거나 다시 선택해 주세요.';});
    function search(){results=filter(all,$('source-section').value,$('source-search').value);if(!results.some(item=>item.id===selected))selected=results[0]?.id;kind='question';$('source-count').textContent=`원본 ${results.length}개 / 전체 ${all.length}개`;renderList();renderViewer();}
    $('source-section').addEventListener('change',search);$('source-search').addEventListener('input',search);
    $('clear-source-search').addEventListener('click',()=>{$('source-section').value='all';$('source-search').value='';search();$('source-search').focus();});
    $('show-source-question').addEventListener('click',()=>{kind='question';renderViewer();});$('show-source-solution').addEventListener('click',()=>{kind='solution';renderViewer();});
    function move(offset){const index=results.findIndex(item=>item.id===selected),item=results[index+offset];if(!item)return;selected=item.id;kind='question';renderList();renderViewer();$('source-list').querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest'});}
    $('source-prev').addEventListener('click',()=>move(-1));$('source-next').addEventListener('click',()=>move(1));search();
  }
  return {entries,filter,mount};
});
