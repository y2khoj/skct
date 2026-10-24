/* New interactive teaching UI. Source-topic attribution is rendered with the content. */
window.createProcessLearning=function(ctx){
 'use strict';
 const {esc,icon,heading,sourceLink,lessonMap,treeMap}=ctx;
 const book=window.PACKAGINGBOOK,flows=window.PROCESS_FLOWS;
 const processLessons=[...(window.PROCESS_FOUNDATION_LESSONS||[]),...(window.PROCESS_ADVANCED_LESSONS||[])];
 const processCases=window.PROCESS_CASES||[];
 let flowId='flipchip',stepIndex=0;
 const chapterMap=new Map(book.chapters);
 const url=s=>`${book.url}chapters/${s}.html`;
 const num=(v,d=2)=>v.toLocaleString('ko-KR',{maximumFractionDigits:d});
 function credit(chapters,full=false){return `<section class="pb-credit"><h2>${full?'참고한 교재와 확장 범위':'교재 출처와 변경 사항'}</h2><p><a href="${book.url}" target="_blank" rel="noopener noreferrer">${esc(book.title)}</a> — ${esc(book.author)}. <a href="${book.license}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · 확인 ${book.reviewed}</p><div class="v2-links">${[...new Set(chapters)].map(s=>sourceLink({label:chapterMap.get(s)||s,url:url(s)})).join('')}</div><p>${esc(book.changes)} 계산기의 숫자는 가상이며 실제 제품 사양이나 합격 기준이 아닙니다.</p><small>Copyright © 2026 geniuskey and PackagingBook contributors. 자료는 현 상태로 제공되며 보증하지 않습니다. <a href="https://github.com/y2khoj/skct/blob/main/hynix-interview/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">출처·변경 내역</a></small></section>`;}
 const text=(x,y,s,fill='#34485d',size=15)=>`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}">${esc(s)}</text>`;
 function diagram(id,k){
  let body='';
  const board='<rect x="105" y="248" width="450" height="30" rx="4" fill="#b9c8b5" stroke="#66816a"/>'+text(115,268,'기판 · 외부 접속으로 배선','#34503b',13);
  const balls=Array.from({length:10},(_,i)=>`<circle cx="${125+i*45}" cy="296" r="9" fill="#c3b7af" stroke="#71665e"/>`).join('');
  if(id==='wirebond'){
   if(k<2){body=`<ellipse cx="260" cy="140" rx="165" ry="75" fill="#cbd7e4" stroke="#7289a3"/><path d="M150 100H370M125 140H395M150 180H370M200 75V205M260 65V215M320 75V205" stroke="#fff" stroke-width="3"/>${text(100,247,k===0?'선별 · 접촉과 결함을 구분':'박막화·절단 · 지지와 표면 손상')}${text(100,276,k===0?'통과 ≠ 모든 조건에서 양품':'얇은 판의 강성과 파괴 강도는 다름','#7d4050',14)}`;}
   else {body=board+(k>=4?'<path d="M115 245V145Q115 125 140 125H520Q545 125 545 145V245Z" fill="#ecded5" stroke="#b69c88"/>':'')+'<rect x="250" y="218" width="160" height="22" fill="#cf9fa9"/>'+text(415,233,'어태치층', '#7d4050',13)+'<rect x="250" y="178" width="160" height="40" fill="#93a9c3" stroke="#506a88"/>'+text(304,203,'다이','#fff',15);
    if(k>=3)body+='<path d="M260 178Q180 95 150 245M400 178Q470 95 510 245" fill="none" stroke="#b78b37" stroke-width="4"/>'+text(153,111,'와이어 루프','#896019',14);
    if(k>=4)body+=text(438,155,'봉지재','#8b6751',13);if(k===5)body+=balls;
   }
  }else if(id==='flipchip'){
   if(k<2){body=`<rect x="100" y="140" width="460" height="${k?35:65}" fill="#93a9c3" stroke="#506a88"/>${text(115,165,k?'박막화된 다이':'웨이퍼 · 패드·RDL', '#fff',15)}<path d="M130 136H205V120H280M330 136H400V120H530" stroke="#b68a38" stroke-width="5" fill="none"/>${Array.from({length:8},(_,i)=>`<circle cx="${130+i*58}" cy="108" r="8" fill="#baabb0"/>`).join('')}${text(105,235,'UBM·범프 · 접착·젖음·전류 경로')}${text(105,265,k?'지지 조건과 잔여 응력을 함께 확인':'형성·선별·박막화의 상세 순서는 제품별로 다름','#7d4050',13)}`;}
   else {body=board+(k>=4?'<rect x="130" y="135" width="400" height="105" rx="7" fill="#ecded5" stroke="#b69c88"/>':'')+(k>=3?'<rect x="185" y="211" width="290" height="34" fill="#d4c3dc"/>':'')+'<rect x="195" y="161" width="270" height="50" fill="#93a9c3" stroke="#506a88"/>'+text(300,190,'다이','#fff',16)+Array.from({length:8},(_,i)=>`<ellipse cx="${210+i*34}" cy="228" rx="9" ry="14" fill="#b8aaaf" stroke="#77656b"/>`).join('');
    body+=text(480,232,k>=3?'언더필':'범프', '#76527d',13);if(k>=4)body+=text(135,155,'봉지재', '#8b6751',13);if(k===5)body+=balls;
   }
  }else {
   if(k<2){body=`<rect x="135" y="110" width="390" height="${k?68:115}" fill="#c8d5e3" stroke="#7189a5"/>${Array.from({length:7},(_,i)=>`<rect x="${160+i*51}" y="105" width="10" height="${k?83:100}" fill="#b78948"/>`).join('')}${text(150,88,'TSV · 실리콘을 관통하는 전기 경로')}${text(140,264,k?'후면 노출 · 박막화·균일도·표면 상태':'라이너·배리어·시드·충전 상태 확인')}`;}
   else {if(k>=4)body=board+'<rect x="120" y="219" width="420" height="20" fill="#8e95bb"/>'+text(133,234,'인터포저 · 로직과 HBM 사이 배선','#fff',12)+'<rect x="365" y="161" width="130" height="47" fill="#a44256"/>'+text(405,189,'로직','#fff',15);
    const ybase=k>=4?201:239;
    body+=Array.from({length:4},(_,i)=>`<rect x="160" y="${ybase-i*28}" width="150" height="19" fill="#9db2c9" stroke="#516d8d"/><path d="M185 ${ybase-i*28}v19M222 ${ybase-i*28}v19M260 ${ybase-i*28}v19M290 ${ybase-i*28}v19" stroke="#bb8743" stroke-width="5"/>${i<3?`<path d="M185 ${ybase-i*28-9}v9M222 ${ybase-i*28-9}v9M260 ${ybase-i*28-9}v9M290 ${ybase-i*28-9}v9" stroke="#957682" stroke-width="3"/>`:''}`).join('');
    body+=text(155,ybase-99,'HBM 내부 적층', '#476380',15);if(k<4)body+=text(335,190,k===2?'층간 접합·충전':'검사 접근·잔여 불량', '#7d4050',14);
    if(k===5)body+='<rect x="130" y="63" width="390" height="20" rx="4" fill="#b7c4ce"/>'+text(275,56,'냉각 경계','#49606f',13)+'<path d="M235 110V88M430 148V88" stroke="#c46e45" stroke-width="3" stroke-dasharray="5 4"/>'+balls;
   }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 340" role="img" aria-label="${esc(flows.find(f=>f.id===id).title)} · ${esc(flows.find(f=>f.id===id).steps[k].title)} 개략도" font-family="sans-serif"><rect width="660" height="340" rx="12" fill="#fbf8f4"/>${body}${text(20,327,'단면 개념도 · 실제 공정 순서·치수·재료 사양을 재현한 그림이 아닙니다','#6b7580',12)}</svg>`;
 }
 Object.assign(window.LEARNING_DIAGRAMS,{P9:()=>diagram('wirebond',1),P10:()=>diagram('flipchip',0),P11:()=>diagram('wirebond',3),P12:()=>diagram('flipchip',4),P13:()=>diagram('hbm',4),P14:()=>diagram('hbm',2),P15:()=>diagram('hbm',3),P16:()=>diagram('hbm',5)});
 function flowPanel(){const f=flows.find(x=>x.id===flowId),s=f.steps[stepIndex];return `<div class="pb-recipes" aria-label="패키지 구조 선택">${flows.map(x=>`<button data-action="process-flow" data-flow="${x.id}" class="${flowId===x.id?'active':''}" aria-pressed="${flowId===x.id}">${esc(x.title)}</button>`).join('')}</div><p class="pb-scope">${esc(f.scope)}</p><div class="pb-steps" aria-label="공정 단계 선택">${f.steps.map((x,i)=>`<button data-action="process-step" data-step="${i}" class="${stepIndex===i?'active':''}" aria-pressed="${stepIndex===i}"><span>${i+1}</span>${esc(x.title)}</button>`).join('')}</div><div class="pb-flow-content"><div class="pb-scene">${diagram(f.id,stepIndex)}</div><section class="pb-stage" aria-live="polite"><span class="eyebrow">STEP ${stepIndex+1} / ${f.steps.length}</span><h3>${esc(s.title)}</h3><dl><dt>만드는 것</dt><dd>${esc(s.purpose)}</dd><dt>공정 창</dt><dd>${esc(s.window)}</dd><dt>실패를 구별할 것</dt><dd>${esc(s.failure)}</dd><dt>내 CAE 경험과 연결</dt><dd>${esc(s.cae)}</dd></dl><p class="pb-prompt">${esc(s.question)}</p><a class="btn btn-secondary btn-small" href="#/lesson/${s.lesson}">${s.lesson} 원리부터 학습 ${icon('arrow')}</a></section></div>`;}
 function slider(name,label,min,max,step,value,unit){return `<label class="pb-slider" for="pb-${name}"><span>${label}<output id="pb-${name}-value" for="pb-${name}">${value}${unit}</output></span><input id="pb-${name}" name="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}"></label>`;}
 function calculators(){return `<section class="v2-section"><span class="eyebrow">CHANGE A CONDITION</span><h2>숫자를 바꾸면 판단이 어떻게 달라질까?</h2><p class="v2-muted">단순화한 모델의 가정 안에서 비교합니다. 실제 공정의 합격·불합격을 판정하는 계산기가 아닙니다.</p><div class="pb-calculators">
 <form class="pb-calculator" data-calculator="thin"><h3>01 · 두께와 판 강성</h3><p>재료·면내 치수·지지가 같은 균일 판 · 선형 작은 처짐</p>${slider('thickness','두께 t',25,150,5,100,' μm')}<div class="pb-results" data-results aria-live="polite"></div><code>D ∝ t³ · 자중 처짐 ∝ 1/t²</code><p class="pb-limit">100μm 기준입니다. 자중 하중도 두께에 비례하므로 처짐은 t/t³에 비례합니다. 파괴 강도나 적층 구조의 열 휨과는 다릅니다.</p><a class="v2-chip" href="#/lesson/P9">박막화의 물리 ${icon('arrow')}</a><button type="button" data-action="process-reset">초기값</button></form>
 <form class="pb-calculator" data-calculator="pitch"><h3>02 · 피치와 전류 밀도</h3><p>정사각 면 배열 · 원형 도통 지름 d=p/2</p>${slider('pitch','피치 p',20,80,5,40,' μm')}${slider('current','접점당 전류 I',1,20,.5,10,' mA')}<div class="pb-results" data-results aria-live="polite"></div><code>접속 밀도 ≈ 1/p² · J=I/(πd²/4)</code><p class="pb-limit">가장자리·배선·전원/접지 비중·전류 집중을 생략했습니다. 실제 I/O 수·대역폭·수명과 구분합니다.</p><a class="v2-chip" href="#/case/C8">변경 조건 문제 풀기 ${icon('arrow')}</a><button type="button" data-action="process-reset">초기값</button></form>
 <form class="pb-calculator" data-calculator="yield"><h3>03 · 선별 후 적층 양품률</h3><p>독립 결함 · 양품 오탈락 0.5% · 전체 조립 성공 98%</p>${slider('yield','검사 전 실제 양품률 Y',80,99.9,.1,95,'%')}${slider('detection','실제 불량 검출 확률 c',90,99.99,.01,99,'%')}${slider('dies','선별한 다이 수 n',2,16,1,8,'개')}<div class="pb-results" data-results aria-live="polite"></div><code>q=P(양품|통과) · 조립 양품률=qⁿ×0.98</code><p class="pb-limit">c는 실제 불량에 대한 검출 확률로 정의했습니다. 패턴의 fault coverage와 동일하지 않습니다. 로트 상관·재작업·검사 원가는 포함하지 않습니다.</p><a class="v2-chip" href="#/case/C7">분모를 나눠 직접 풀기 ${icon('arrow')}</a><button type="button" data-action="process-reset">초기값</button></form>
 </div></section>`;}
 function updateCalculator(form){
  const value=n=>Number(form.elements.namedItem(n).value);
  form.querySelectorAll('input').forEach(input=>document.getElementById(`${input.id}-value`).textContent=`${num(Number(input.value),2)}${input.dataset.unit}`);
  let metrics;
  if(form.dataset.calculator==='thin'){const t=value('thickness');metrics=[['굽힘 강성 / 기준',num((t/100)**3,3)+'배'],['자중 처짐 / 기준',num((100/t)**2,2)+'배']];}
  else if(form.dataset.calculator==='pitch'){const p=value('pitch'),d=p/2,j=(value('current')/1000)/(Math.PI*(d*1e-4)**2/4);metrics=[['이상 접속 밀도',num((1000/p)**2,0)+'개/mm²'],['평균 전류 밀도',num(j,0)+' A/cm²']];}
  else {const y=value('yield')/100,c=value('detection')/100,n=value('dies'),pass=y*.995+(1-y)*(1-c),q=y*.995/pass;metrics=[['검사 통과율',num(pass*100,3)+'%'],['통과품 중 잔여 불량',num((1-q)*1e6,1)+' ppm'],['통과 다이 조립의 양품률',num(q**n*.98*100,3)+'%']];}
  form.querySelector('[data-results]').innerHTML=metrics.map(([label,result])=>`<div><span>${label}</span><strong>${result}</strong></div>`).join('');
 }
 function render(){return `${heading('공정에서 출발하는 패키징 지식','무엇을 만들고, 어떤 조건에서 실패하며, 무엇을 측정할지 연결합니다.','<span class="date-chip">교재 확인 2026.10.24</span>')}<section class="pb-intro"><div><span class="eyebrow">PACKAGINGBOOK → INTERVIEW LAB</span><h2>구조를 보고,<br>공정의 이유를 설명하기.</h2><p>선별·접속·봉지·통합·검사의 기초를 배운 뒤, 기존 CAE 경험으로 검증할 수 있는 질문으로 좁힙니다.</p><a class="btn btn-primary" href="#/path/process">공정 학습 경로 시작 ${icon('arrow')}</a></div><div class="pb-intro-facts"><strong>8개 공정 단원</strong><span>원리 → 공정 창 → 고장 모드 → 판단</span><strong>3개 조건 계산</strong><span>두께·피치·검사 조건을 직접 변경</span><strong>28개 추가 심층 질문</strong><span>가정·관측·반례·선택까지 답하기</span></div></section><section class="v2-section"><h2>패키지마다 만드는 순서가 다릅니다</h2><p class="v2-muted">구조와 단계를 선택하세요. 대표적인 기능 순서를 압축한 도식이며, 실제 세부 공정 순서는 제품·재료·장비에 따라 달라집니다.</p><div id="process-flow-panel">${flowPanel()}</div></section>${calculators()}<section class="v2-section"><h2>공정 원리에서 깊은 질문으로</h2><div class="pb-lesson-grid">${processLessons.map(l=>`<a class="v2-case-card" href="#/lesson/${l.id}"><span class="eyebrow">${l.id} · ${l.duration}분</span><h3>${esc(l.title)}</h3><p>${esc(l.summary)}</p><span class="v2-card-foot">개념·예제·반례 학습 ${icon('arrow')}</span></a>`).join('')}</div></section><section class="pb-source-map"><h2>원문과 연결해 더 읽기</h2><div class="v2-table-wrap" tabindex="0" aria-label="단원별 원문과 면접 연결 표. 좁은 화면에서는 좌우로 이동할 수 있습니다."><table class="v2-table"><thead><tr><th>확장 단원</th><th>참고한 원문</th><th>면접 연습</th></tr></thead><tbody>${processLessons.map(l=>`<tr><th scope="row"><a href="#/lesson/${l.id}">${l.id} · ${esc(l.title)}</a></th><td>${l.sourceChapters.map(s=>`<a href="${url(s)}" target="_blank" rel="noopener noreferrer">${esc(chapterMap.get(s))}</a>`).join(' · ')}</td><td>${l.related.filter(id=>treeMap.has(id)).map(id=>`<a href="#/interview/${id}/1">${id}</a>`).join(' · ')}</td></tr>`).join('')}</tbody></table></div></section>${credit(book.chapters.map(x=>x[0]),true)}`;}
 function promo(){return `<a class="pb-promo" href="#/process"><div><span class="eyebrow">PACKAGING DOMAIN · NEW</span><h2>제조 공정을 알면, CAE 질문이 더 구체적이 됩니다.</h2><p>PackagingBook을 바탕으로 보강한 8개 단원 · 공정 흐름 · 조건 계산</p></div>${icon('arrow')}</a>`;}
 function afterRender(parts){
  if(parts[0]==='process')document.querySelectorAll('[data-calculator]').forEach(updateCalculator);
  const item=parts[0]==='lesson'?lessonMap.get(parts[1]):parts[0]==='interview'?treeMap.get(parts[1]):parts[0]==='case'?processCases.find(c=>c.id===parts[1]):null;
  if(item?.sourceChapters?.length)document.querySelector('.page-footer')?.insertAdjacentHTML('beforebegin',credit(item.sourceChapters));
  if(parts[0]==='track'&&parts[1]==='packaging')document.querySelector('.track-banner')?.insertAdjacentHTML('afterend',promo());
 }
 document.getElementById('app').addEventListener('input',e=>{const form=e.target.closest('[data-calculator]');if(form)updateCalculator(form);});
 document.getElementById('app').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;
  if(b.dataset.action==='process-flow'&&flows.some(x=>x.id===b.dataset.flow)){flowId=b.dataset.flow;stepIndex=0;document.getElementById('process-flow-panel').innerHTML=flowPanel();document.querySelector(`[data-flow="${flowId}"]`)?.focus({preventScroll:true});}
  if(b.dataset.action==='process-step'){stepIndex=Number(b.dataset.step);document.getElementById('process-flow-panel').innerHTML=flowPanel();document.querySelector(`[data-action="process-step"][data-step="${stepIndex}"]`)?.focus({preventScroll:true});}
  if(b.dataset.action==='process-reset'){const form=b.closest('form');form.reset();updateCalculator(form);}
 });
 return {render,promo,afterRender};
};
