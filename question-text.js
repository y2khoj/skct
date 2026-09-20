(function() {
  'use strict';
  const bank = SKCT_QUESTION_BANK;
  QuestionBankCore.bind(SKCT_DATA, bank);
  const node = (tag,cls,text) => {const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
  // Reflow extracted line wraps while preserving explicit paragraph/list boundaries.
  function prose(text, cls='') {
    const wrap=node('div',`text-prose ${cls}`.trim());
    SKCTTextLayout.paragraphs(text).forEach(part=>wrap.append(node('p','text-paragraph',part)));
    return wrap;
  }
  function svg(markup, label) {
    const wrap=node('div','text-figure');
    const parsed=new DOMParser().parseFromString(markup,'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('도형 텍스트를 읽을 수 없습니다.');
    // The bank is a local artifact, but strip active content from future edits.
    parsed.querySelectorAll('script,foreignObject').forEach(n=>n.remove());
    parsed.querySelectorAll('*').forEach(n=>Array.from(n.attributes).forEach(a=>{
      if (/^on/i.test(a.name) || (/href$/i.test(a.name) && !/^(#|data:image\/)/.test(a.value))) n.removeAttribute(a.name);
    }));
    const graphic=document.importNode(parsed.documentElement,true);
    graphic.setAttribute('aria-label',label);graphic.setAttribute('role','img');
    wrap.append(graphic);return wrap;
  }
  function table(data) {
    const wrap=node('div','text-table-wrap'),t=node('table','text-data-table');
    t.append(node('caption','',data.caption));
    const head=node('thead'),hr=node('tr');
    data.headers.forEach(v=>{const th=node('th','',v);th.scope='col';hr.append(th);});head.append(hr);t.append(head);
    const body=node('tbody');data.rows.forEach(row=>{const tr=node('tr');row.forEach(v=>tr.append(node('td','',v)));body.append(tr);});t.append(body);wrap.append(t);
    if(data.notes)wrap.append(node('p','text-source-note',data.notes));return wrap;
  }
  function clock(diagram) {
    const line=(hour,open)=>{const a=hour*Math.PI/6,x=60+Math.sin(a)*(open?44:32),y=60-Math.cos(a)*(open?44:32);
      return `<line x1="60" y1="60" x2="${x}" y2="${y}" stroke="${open?'#64748b':'#111827'}" stroke-width="${open?2:5}"/><circle cx="${x}" cy="${y}" r="4" fill="${open?'white':'#111827'}" stroke="#111827"/>`;};
    return svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="51" fill="white" stroke="#64748b"/>${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<line x1="${60+46*Math.sin(a)}" y1="${60-46*Math.cos(a)}" x2="${60+51*Math.sin(a)}" y2="${60-51*Math.cos(a)}" stroke="#64748b"/>`;}).join('')}${line(diagram.black,false)}${line(diagram.hollow,true)}<circle cx="60" cy="60" r="3" fill="#111827"/></svg>`,'화살표 방향 보기');
  }
  function content(q,includeOptions,config={}) {
    const card=node('article','text-question-card');card.dataset.questionId=q.id;
    const header=node('div','text-question-meta');header.append(node('span','text-number',q.title),node('span','text-source',`원본 ${q.source.question_page}p`));card.append(header);
    if(q.passage_id){const passage=bank.passages[q.passage_id],section=node('section','text-passage');section.append(node('h3','','공통 지문'),prose(passage.text,'text-flow'));card.append(section);}
    card.append(node('h3','text-stem',SKCTTextLayout.inline(q.stem)));
    if(q.tables) q.tables.forEach(t=>card.append(table(t)));
    if(q.figure_description) card.append(node('p','text-source-note',q.figure_description));
    if(q.layout_mode==='spatial_text'&&q.context_svg)card.append(svg(q.context_svg,`${q.title} 자료·조건`));
    else if(q.context)card.append(prose(q.context,'text-context'+(q.section_id==='lang'?' text-flow':'')));
    if(includeOptions){
      const choices=node('div','text-options');choices.setAttribute('role','group');choices.setAttribute('aria-label',`${q.title} 답 선택`);
      q.options.forEach(o=>{
        const b=node('button','text-option');b.type='button';b.dataset.optionId=o.id;b.dataset.questionId=q.id;
        b.setAttribute('aria-pressed',String(config.selected?.[q.id]===o.number));
        b.disabled=!!config.locked;
        b.append(node('span','text-option-number',['①','②','③','④','⑤'][o.number-1]),node('span','text-option-copy',SKCTTextLayout.inline(o.text)));
        if(o.diagram)b.append(clock(o.diagram));
        if(config.review&&o.id===q.answer_option_id){b.classList.add('is-correct');b.append(node('span','text-answer-label','정답'));}
        if(config.review&&config.selected?.[q.id]===o.number&&o.id!==q.answer_option_id)b.classList.add('is-wrong');
        b.addEventListener('click',()=>config.onChoose?.(q.id,o.number));choices.append(b);
      });card.append(choices);
      const selected=config.selected?.[q.id];
      if(selected&&!config.locked&&config.onClear){
        const row=node('div','text-selection-status');
        row.append(node('span','',`${selected}번 선택됨`));
        const clear=node('button','text-clear-answer','선택 취소');clear.type='button';clear.setAttribute('aria-label',`${q.title} 선택 취소`);
        clear.addEventListener('click',()=>{config.onClear(q.id);document.querySelector(`[data-question-id="${CSS.escape(q.id)}"] .text-option`)?.focus({preventScroll:true});});
        row.append(clear);card.append(row);
      }
    }
    return card;
  }
  function mount(id,legacyId) {
    document.getElementById(legacyId).hidden=true;
    let root=document.getElementById(id);
    if(!root){root=node('div','text-question-list');root.id=id;document.getElementById(legacyId).after(root);}
    root.replaceChildren();return root;
  }
  function renderQuestion(page,config) {
    const viewport=document.getElementById('q-viewport'),oldRoot=document.getElementById('question-text');
    const scroll=oldRoot?.dataset.pageId===page.id?viewport.scrollTop:0;
    const focused=document.activeElement?.dataset.optionId;
    const root=mount('question-text','question-image');
    root.dataset.pageId=page.id;
    if(page.is_passage){const passage=bank.passages[page.id];const card=node('article','text-question-card');card.append(prose(passage.text,'text-flow'));root.append(card);return;}
    page.subQuestions.forEach(sub=>root.append(content(bank.questions[sub.id],true,config)));
    viewport.scrollTop=scroll;
    if(focused)root.querySelector(`[data-option-id="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  }
  function renderSolution(page) {
    const root=mount('solution-text','solution-image');
    page.subQuestions.forEach(sub=>{
      const q=bank.questions[sub.id],answer=QuestionBankCore.answer(q),card=node('article','text-question-card');
      card.dataset.questionId=q.id;card.append(node('h3','text-stem',q.title),node('p','bound-answer',`정답 ${answer.number}번 · ${SKCTTextLayout.inline(answer.text)}`));
      if(q.explanation?.text)card.append(prose(q.explanation.text));
      card.append(node('p','text-source-note',`원본 정답표 ${q.source.answer_key_page}p · 해설 ${q.source.solution_pages.join(', ')}p`));root.append(card);
    });
  }
  function setZoom(value) {
    const scale=Math.max(.85,Math.min(1.75,value));
    const container=document.getElementById('q-image-container');
    container.style.transform='none';container.style.width='100%';container.style.maxWidth='900px';
    document.documentElement.style.setProperty('--reading-scale',scale);
    document.getElementById('zoom-level-text').textContent=Math.round(scale*100)+'%';
    document.getElementById('zoom-out-btn').disabled=scale<=.85;
    document.getElementById('zoom-in-btn').disabled=scale>=1.75;
    return scale;
  }
  window.SKCTText={renderQuestion,renderSolution,setZoom};
})();
