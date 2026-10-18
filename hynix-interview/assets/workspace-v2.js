/* Learning routes, worked cases and explicit self-review. */
window.createLearningWorkspace = function(ctx) {
  'use strict';
  const {esc,icon,heading,sourceLink,lessonMap,treeMap,getStore,persist} = ctx;
  const cases = [...(window.PACKAGING_CASES || []), ...(window.ANALYSIS_CASES || [])];
  const caseMap = new Map(cases.map(c => [c.id,c]));
  const paths = window.LEARNING_PATHS || [];
  const guidance = window.LESSON_GUIDANCE || {};
  const coaching = window.INTERVIEW_COACHING || {};
  const list = items => `<ul>${(items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  function href(s) {return `#/${s.kind==='practice'?'interview':s.kind}/${s.id}${s.kind==='practice'?`/${s.stage||1}`:''}`;}
  function link(kind,id,label,stage) {return `<a class="v2-chip" href="${href({kind,id,stage})}">${esc(label||id)} ${icon('arrow')}</a>`;}
  function table(data) {return data ? `<div class="v2-table-wrap" tabindex="0" aria-label="사례 데이터 표. 좁은 화면에서 좌우로 이동할 수 있습니다."><table class="v2-table"><thead><tr>${data.headers.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${data.rows.map(row=>`<tr>${row.map((x,i)=>`<${i?'td':'th scope="row"'}>${esc(x)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';}
  function caseCard(c) {return `<a class="v2-case-card" href="#/case/${c.id}"><span class="eyebrow">${esc(c.id)} · ${esc(c.tag)}</span><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p><span class="v2-card-foot">풀이 → 조건 변경 → 판단 ${icon('arrow')}</span></a>`;}
  function caseLinks(ids) {return `<div class="v2-links">${(ids||[]).filter(id=>caseMap.has(id)).map(id=>link('case',id,`${id} · ${caseMap.get(id).title}`)).join('')}</div>`;}
  function evidenceLinks(ids) {return `<div class="v2-links">${(ids||[]).map(id=>{const c=ctx.evidenceCards.find(x=>x.id===id);return c?link('evidence',id,`${id} · ${c.title}`):'';}).join('')}</div>`;}
  function progress() {
    const s=getStore();
    const read=Object.values(s.completed).filter(Boolean).length;
    const checked=ctx.lessons.filter(l=>s.quiz[l.id]===l.quiz.answer).length;
    const written=Object.values(s.notes).filter(x=>x.trim()).length;
    const reviewed=Object.values(s.assessed).filter(x=>x.length===5&&x.every(Boolean)).length;
    return `<div class="v2-progress" aria-label="서로 다른 학습 활동 기록"><div><strong>${read}<small> / 18</small></strong><span>단원 읽음</span></div><div><strong>${checked}<small> / 18</small></strong><span>개념 문항 정답</span></div><div><strong>${written}</strong><span>면접 답변 작성</span></div><div><strong>${reviewed}</strong><span>5항목 자가검토</span></div><p>각각의 활동 기록입니다. 면접 준비도를 인증하는 점수는 아닙니다.</p></div>`;
  }
  function dashboard() {
    return `${heading('깊이 이해하고, 근거로 답하기.','2.5D 패키징 · 메모리 · 나의 CAE 경험을 하나의 판단으로 연결합니다.')}
      <section class="v2-intro"><div><span class="eyebrow">YOUR NEXT SESSION</span><h2>어디에서 막히는지부터<br>선택하세요.</h2><p>개념이 낯설면 구조부터, 경험 설명이 막히면 실적부터.<br>한 번에 한 단계씩, 설명할 수 있는 결과물을 남깁니다.</p></div><div class="v2-flow" aria-label="학습의 반복 과정"><span>원리 이해</span><b>→</b><span>사례 판단</span><b>→</b><span>내 답변</span><b>↺</b><span>근거 검토</span></div></section>
      <div class="v2-path-grid">${paths.map((p,i)=>`<a class="v2-path-card" href="#/path/${p.id}"><span class="eyebrow">START ${String(i+1).padStart(2,'0')}</span><h2>${esc(p.title)} ${icon('arrow')}</h2><p>${esc(p.description)}</p><div class="v2-output"><span>이 경로의 결과물</span>${esc(p.output)}</div></a>`).join('')}</div>
      ${progress()}
      <section class="v2-section"><div class="section-heading"><h2>면접에서 증명할 네 가지</h2><span class="v2-muted">학습 순서보다 설명할 수 있는 결과에 집중</span></div><div class="v2-missions">${window.LEARNING_MISSIONS.map((m,i)=>`<article class="v2-mission"><span class="v2-number">0${i+1}</span><div><h3>${esc(m.title)}</h3><p>${esc(m.question)}</p><div class="v2-output"><span>남길 결과물</span>${esc(m.output)}</div><div class="v2-links">${link('lesson',m.lessonIds[0],'개념 살펴보기')}${link('practice',m.treeIds[0],'면접에서 확인')}</div></div></article>`).join('')}</div></section>
      <section class="v2-section"><div class="section-heading"><h2>여섯 개의 핵심 사례</h2><a class="text-link" href="#/cases">모든 사례 ${icon('arrow')}</a></div><p class="v2-muted">가상 데이터를 직접 판단한 뒤 풀이와 비교하세요. 조건이 바뀌면 결론도 다시 검토합니다.</p><div class="v2-case-grid">${cases.map(caseCard).join('')}</div></section>
      <div class="v2-final-row"><a href="#/lesson/H1"><span class="eyebrow">FINAL TRANSFER</span><h3>신규 HBM·2.5D 구조 검토 메모</h3><p>사례 두 개 이상의 논리를 모아, 설계 판단과 추가 시험의 우선순위를 작성합니다.</p></a><a href="#/industry"><span class="eyebrow">INDUSTRY · 2026.10.17 기준</span><h3>발표의 사실과 나의 전망 구분하기</h3><p>공식 발표 6건을 제품 상태·기술 과제·반대 시나리오로 읽습니다.</p></a></div>`;
  }
  function pathPage(id) {
    const p=paths.find(x=>x.id===id);if(!p)return missing();
    return `<a class="back-link" href="#/dashboard">${icon('back')}학습 로드맵</a>${heading(esc(p.title),esc(p.description))}<div class="v2-goal"><span class="eyebrow">THIS ROUTE'S OUTPUT</span><h2>${esc(p.output)}</h2><p>현재 설명할 수 있는 단계는 건너뛰어도 됩니다. 읽은 표시와 답변의 검증은 별개입니다.</p></div><ol class="v2-path-steps">${p.steps.map((s,i)=>`<li><span class="v2-number">${String(i+1).padStart(2,'0')}</span><div><span class="eyebrow">${esc(s.id)} · ${{lesson:'개념',case:'풀이 사례',practice:'면접 연습',evidence:'실제 근거',industry:'산업 자료'}[s.kind]}</span><h2>${esc(s.title)}</h2><p>${esc(s.why)}</p><a class="btn btn-secondary btn-small" href="${href(s)}">이 단계 열기 ${icon('arrow')}</a></div></li>`).join('')}</ol>`;
  }
  function caseIndex() {return `${heading('숫자와 조건으로 판단하는 연습','가상 문제의 풀이를 익힌 뒤, 달라진 조건에서 판단을 수정합니다.')}<div class="v2-goal"><strong>모든 사례는 학습용 가정입니다.</strong><p>지원서에 적힌 성과 수치의 정의는 실제 근거 카드에 직접 작성합니다. 아래 계산 결과를 본인의 실적으로 사용하지 마세요.</p></div><div class="v2-case-grid">${cases.map(caseCard).join('')}</div>`;}
  function textarea(field,key,label,hint) {return `<label class="v2-field" for="v2-${key}">${esc(label)}<span>브라우저 자동 저장</span></label><textarea id="v2-${key}" class="note-input v2-note" data-v2-save="${field}" data-key="${key}" maxlength="20000" placeholder="${esc(hint)}">${esc(getStore()[field][key]||'')}</textarea>`;}
  function challengeFeedback(c) {const n=getStore().caseAnswers[c.id];return Number.isInteger(n)?`<div class="v2-feedback ${n===c.challenge.answer?'is-correct':'is-revise'}"><strong>${n===c.challenge.answer?'이 조건에서는 타당한 판단입니다.':'조건과 결론을 다시 연결해 보세요.'}</strong><p>${esc(c.challenge.options[n].feedback)}</p></div>`:'';}
  function branchFeedback(c) {const b=c.branches.find(x=>x.id===getStore().caseBranches[c.id]);return b?`<div class="v2-branch-result"><h3>관측</h3><p>${esc(b.observation)}</p><h3>가능한 해석</h3><p>${esc(b.interpretation)}</p><h3>다음 확인</h3><p>${esc(b.nextAction)}</p></div>`:'';}
  function casePage(id) {
    const c=caseMap.get(id);if(!c)return missing();
    const s=getStore();
    return `<a class="back-link" href="#/cases">${icon('back')}핵심 사례 전체</a><div class="v2-case-layout"><article class="v2-workbook"><span class="eyebrow">${esc(c.id)} · ${esc(c.tag)} · 가상 데이터</span><h1>${esc(c.title)}</h1><p class="v2-lead">${esc(c.question)}</p><div class="v2-goal"><strong>풀고 나면 설명할 수 있는 것</strong>${list(c.objectives)}${link('lesson',c.lessonId,'연결 개념 먼저 보기')}</div>
      <section class="v2-section"><span class="eyebrow">01 · FRAME THE PROBLEM</span><h2>주어진 조건</h2>${table(c.given)}<details class="v2-details" open><summary>계산이 성립하는 가정</summary>${list(c.assumptions)}</details>${textarea('caseNotes',`${id}:initial`,'풀이 전, 나의 첫 판단','어떤 식과 조건을 사용할지, 어떤 결론까지 가능한지 적어 보세요.')}</section>
      <section class="v2-section"><span class="eyebrow">02 · FOLLOW THE REASONING</span><h2>풀이와 판단 과정</h2><p class="v2-muted">먼저 생각한 뒤 펼치세요. 계산값과 제품 판단 사이에 필요한 근거를 확인합니다.</p><details class="v2-details v2-solution"><summary>단계별 풀이 펼치기</summary><div class="v2-solution-body">${c.steps.map((step,i)=>`<section><h3><span>${i+1}</span>${esc(step.title)}</h3><p>${esc(step.body)}</p>${step.formula?`<div class="formula"><code>${esc(step.formula)}</code></div>`:''}${table(step.table)}</section>`).join('')}<div class="v2-conclusion"><strong>이 조건에서의 결론</strong><p>${esc(c.conclusion)}</p></div><p class="v2-caution">${esc(c.caveat)}</p></div></details></section>
      <section class="v2-section"><span class="eyebrow">03 · CHANGE THE CONDITIONS</span><h2>${esc(c.challenge.prompt)}</h2><p>${esc(c.challenge.scenario)}</p><div class="quiz-options">${c.challenge.options.map((o,i)=>`<button class="quiz-option ${s.caseAnswers[id]===i?'v2-selected':''}" data-action="v2-case-answer" data-id="${id}" data-option="${i}" aria-pressed="${s.caseAnswers[id]===i}"><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${esc(o.text)}</span></button>`).join('')}</div><div id="case-feedback" aria-live="polite">${challengeFeedback(c)}</div></section>
      <section class="v2-section"><span class="eyebrow">04 · INTERROGATE THE RESULT</span><h2>이런 관측이 추가된다면?</h2><p class="v2-muted">관측 하나를 선택하고, 확인해야 할 가설이 어떻게 달라지는지 비교하세요.</p><div class="v2-branch-buttons">${c.branches.map(b=>`<button class="v2-branch-button ${s.caseBranches[id]===b.id?'active':''}" data-action="v2-branch" data-id="${id}" data-branch="${b.id}" aria-pressed="${s.caseBranches[id]===b.id}">${esc(b.label)}</button>`).join('')}</div><div id="case-branch-feedback" aria-live="polite">${branchFeedback(c)}</div></section>
      <section class="v2-section"><span class="eyebrow">05 · TRANSFER TO YOUR ANSWER</span><h2>면접 답변으로 옮기기</h2><p>${esc(c.transferQuestion)}</p>${textarea('caseNotes',`${id}:transfer`,'조건을 밝힌 나의 답변','실제 경험 / 확인할 근거 / 새롭게 제안할 검증을 구분해 작성하세요.')}<details class="v2-details"><summary>내 답변 검토 기준</summary>${list(c.transferGuide)}</details><div class="v2-links">${link('practice',c.interview.treeId,'연결 꼬리질문으로 연습',c.interview.step)}</div>${evidenceLinks(c.evidenceIds)}</section><section class="v2-sources"><h2>원리와 방법의 출처</h2><p>아래 자료는 원리·방법의 근거입니다. 사례의 숫자와 결과는 학습용 가정입니다.</p>${c.sources.map(sourceLink).join('')}</section></article><aside class="v2-case-rail"><span class="eyebrow">CASE WORKBOOK</span><h3>생각 → 비교 → 수정</h3><p>정답 번호보다 가정과 판단의 범위를 설명하는 것이 목표입니다.</p><ol><li>조건을 읽고 먼저 답하기</li><li>풀이와 사고 과정 비교</li><li>달라진 조건으로 재계산</li><li>추가 관측에 따라 가설 수정</li><li>내 실제 경험의 근거 확인</li></ol>${link('lesson',c.lessonId,`${c.lessonId} 개념으로 돌아가기`)}</aside></div>`;
  }
  function integration() {
    const t=window.INTEGRATION_TASK;
    return `<section class="v2-section v2-integration"><span class="eyebrow">FINAL DESIGN REVIEW</span><h2>${esc(t.title)}</h2><p>${esc(t.brief)}</p><details class="v2-details" open><summary>검토 조건</summary>${list(t.assumptions)}</details>${caseLinks(t.caseIds)}${t.prompts.map(p=>textarea('integrationNotes',p.id,p.label,p.hint)).join('')}<details class="v2-details"><summary>최종 메모 자가검토 기준</summary>${list(t.reviewCriteria)}</details><div class="v2-links">${link('practice','T5','신규 구조 면접 답변으로 연결')}</div></section>`;
  }
  function enrichLesson(id) {
    const g=guidance[id],l=lessonMap.get(id);if(!g||!l)return;
    document.getElementById('main').classList.add('v2-lesson');
    const visual=document.querySelector('.lesson-visual');
    const diagram=window.LEARNING_DIAGRAMS?.[id]||(['F1','P1','H1'].includes(id)?window.LEARNING_DIAGRAMS?.M4:null);
    if(diagram)visual.innerHTML=diagram()+`<p class="visual-caption">구조와 역할을 구분하는 개략도 · 비율과 사양은 실제 제품과 다릅니다</p>`;
    visual.insertAdjacentHTML('beforebegin',`<div class="v2-lesson-brief"><span class="eyebrow">이 단원의 핵심 질문</span><h2>${esc(g.question)}</h2><div class="v2-output"><span>학습 후 남길 결과물</span>${esc(g.output)}</div>${g.prerequisites.length?`<div class="v2-prereqs"><strong>필요할 때 먼저 보기</strong>${g.prerequisites.map(x=>link('lesson',x,`${x} · ${lessonMap.get(x).title}`)).join('')}</div>`:''}<nav class="v2-toc" aria-label="이 단원 목차">${l.sections.map((s,i)=>`<button data-action="scroll-section" data-section="section-${i}">${i+1}. ${esc(s.title)}</button>`).join('')}<button data-action="scroll-section" data-section="quiz-section">개념 확인</button></nav></div>`);
    const quiz=document.getElementById('quiz-section');
    quiz.insertAdjacentHTML('beforebegin',`<section class="v2-misconception"><span class="eyebrow">흔한 오해를 바로잡기</span><h2>“${esc(g.misconception.claim)}”</h2><p>${esc(g.misconception.correction)}</p></section>${g.caseIds.length?`<section class="v2-section"><h2>${id==='H1'?'판단에 활용할 사례':'조건을 바꿔 직접 풀어보기'}</h2>${caseLinks(g.caseIds)}</section>`:''}${id==='H1'?integration():''}`);
    const aside=document.querySelector('.lesson-aside');
    if(aside)Array.from(aside.children).slice(0,2).forEach(x=>x.remove());
    document.querySelector('.completion-row a')?.remove();
    document.querySelector('.reading-status-note')?.remove();
    document.querySelector('.completion-row')?.insertAdjacentHTML('afterend',`<div class="v2-next"><div><span class="eyebrow">NEXT CONNECTION</span><p>${esc(g.next.title)}</p></div><a class="btn btn-secondary" href="${href(g.next)}">이어가기 ${icon('arrow')}</a></div><p class="v2-muted">읽음 표시는 읽기 기록입니다. 개념 확인, 사례 판단, 답변 검토는 별도로 진행하세요.</p>`);
  }
  function enrichPractice(id,rawStep) {
    const c=coaching[id];if(!c)return;
    const step=Math.max(1,Math.min(7,parseInt(rawStep,10)||1));
    const q=document.querySelector('.practice-question');
    if(step<=5)q.insertAdjacentHTML('beforeend',`<div class="v2-hint"><strong>이번 단계에서 구별할 것</strong><p>${esc(c.levelGuidance[step-1])}</p></div>`);
    else {
      const f=c.followups[step===6?'A':'B'];
      q.querySelector('.criteria').innerHTML=`<summary>이 반문에서 확인하는 논리</summary>${list(f.reasoning)}`;
      q.insertAdjacentHTML('afterbegin',`<div class="v2-trigger"><strong>이 반문이 나오는 답변</strong><p>${esc(f.trigger)}</p></div>`);
      q.insertAdjacentHTML('beforeend',`<div class="v2-hint"><strong>답변을 보완하는 방법</strong><p>${esc(f.repair)}</p><div class="v2-links">${f.backTo.map(x=>link('lesson',x,`${x} 개념 복습`)).join('')}</div></div>`);
    }
    q.insertAdjacentHTML('afterend',`<div class="v2-coaching"><p class="v2-purpose">${esc(c.purpose)}</p><details class="v2-details"><summary>답변의 논리 구조와 기술 예시 보기</summary><div class="v2-coaching-body">${c.answerOutline.map((x,i)=>`<h3>${i+1}. ${esc(x.title)}</h3><p>${esc(x.body)}</p>`).join('')}<div class="v2-example"><span class="eyebrow">${esc(c.example.label)} · 본인의 실제 실적과 구분</span><p>${esc(c.example.text)}</p></div><h3>그럴듯하지만 부족한 답변</h3>${c.pitfalls.map(p=>`<div class="v2-pitfall"><strong>“${esc(p.weak)}”</strong><p>${esc(p.why)}</p><p class="v2-repair">${esc(p.better)}</p></div>`).join('')}<p class="v2-caution">${esc(c.factBoundary)}</p></div></details>${c.caseIds.length?`<details class="v2-details"><summary>막혔다면, 풀이 사례로 확인하기</summary>${caseLinks(c.caseIds)}</details>`:''}</div>`);
    const evidencePanel=document.querySelector('.practice-layout > div > .side-panel');
    if(evidencePanel){evidencePanel.querySelector('a')?.remove();evidencePanel.insertAdjacentHTML('beforeend',evidenceLinks(c.evidenceIds));if(!c.evidenceIds.length)evidencePanel.insertAdjacentHTML('beforeend','<p class="v2-muted">이 주제는 기술 설명 연습입니다. 확인하지 않은 경력으로 바꾸어 답하지 마세요.</p>');}
    if(step===5){document.querySelector('.practice-controls')?.insertAdjacentHTML('afterend',`<section class="v2-section"><h3>내 답변에 해당하는 반문 선택</h3><div class="v2-followups">${['A','B'].map((k,i)=>`<a href="#/interview/${id}/${6+i}"><strong>분기 ${k}</strong><p>${esc(c.followups[k].trigger)}</p>${icon('arrow')}</a>`).join('')}</div></section>`);const next=document.querySelector('.practice-controls .btn-primary');if(next)next.remove();}
    document.querySelector('.score-grid')?.insertAdjacentHTML('beforebegin',`<p class="v2-muted">답변을 쓴 뒤 기준과 비교하세요. 선택하지 않은 항목은 미평가입니다.</p><details class="v2-details v2-rubric"><summary>0·1·2점의 관찰 가능한 기준</summary>${window.SCORE_RUBRIC.map(r=>`<h4>${esc(r.name)}</h4><ol start="0">${r.levels.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`).join('')}</details>`);
  }
  function enrichReview() {
    const s=getStore();const saved=cases.filter(c=>s.caseNotes[`${c.id}:initial`]?.trim()||s.caseNotes[`${c.id}:transfer`]?.trim()||Number.isInteger(s.caseAnswers[c.id]));
    const n=Object.values(s.integrationNotes).filter(x=>x.trim()).length;
    document.querySelector('.data-tools')?.insertAdjacentHTML('beforebegin',`<section class="v2-section"><h2>사례 풀이와 최종 메모</h2>${saved.length?`<div class="v2-case-grid">${saved.map(caseCard).join('')}</div>`:'<p class="v2-muted">사례에 첫 판단이나 답변을 기록하면 여기에서 이어갈 수 있습니다.</p>'}${n?`<div class="v2-next"><p>신규 구조 검토 메모 · ${n}개 항목 작성</p>${link('lesson','H1','최종 메모 이어 쓰기')}</div>`:''}</section>`);
  }
  function missing(){return `<h1>학습 내용을 찾을 수 없습니다.</h1><a class="btn btn-primary" href="#/dashboard">학습 로드맵으로</a>`;}
  function route(parts){return parts[0]==='case'?casePage(parts[1]):parts[0]==='cases'?caseIndex():parts[0]==='path'?pathPage(parts[1]):null;}
  function afterRender(parts){if(parts[0]==='lesson')enrichLesson(parts[1]);if(parts[0]==='interview'&&treeMap.has(parts[1]))enrichPractice(parts[1],parts[2]);if(parts[0]==='review')enrichReview();}
  document.getElementById('app').addEventListener('input',e=>{const t=e.target;if(!t.matches('[data-v2-save]'))return;const field=t.dataset.v2Save;if(!['caseNotes','integrationNotes'].includes(field))return;getStore()[field][t.dataset.key]=t.value.slice(0,20000);persist();});
  document.getElementById('app').addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const c=caseMap.get(b.dataset.id);
    if(b.dataset.action==='v2-case-answer'&&c){const n=Number(b.dataset.option);getStore().caseAnswers[c.id]=n;persist();document.querySelectorAll('[data-action="v2-case-answer"]').forEach(x=>{const active=Number(x.dataset.option)===n;x.setAttribute('aria-pressed',active);x.classList.toggle('v2-selected',active);});document.getElementById('case-feedback').innerHTML=challengeFeedback(c);}
    if(b.dataset.action==='v2-branch'&&c){getStore().caseBranches[c.id]=b.dataset.branch;persist();document.querySelectorAll('[data-action="v2-branch"]').forEach(x=>{const active=x.dataset.branch===b.dataset.branch;x.setAttribute('aria-pressed',active);x.classList.toggle('active',active);});document.getElementById('case-branch-feedback').innerHTML=branchFeedback(c);}
  });
  return {dashboard,route,afterRender};
};
