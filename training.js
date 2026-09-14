(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = TrainingCore;
  const sections = SKCT_DATA.sections;
  const byId = Object.fromEntries(sections.flatMap(s => s.questions).map(q => [q.id,q]));
  const labels = {diagnose:'유형 진단', timed:'15분 집중', full:'5영역 연속', review:'약점 복습'};
  const statusLabels = {correct:'정답',wrong:'오답',unanswered:'미응답',manual:'직접 점검',done:'점검 완료',retry:'다시 연습'};
  const key = 'skct_training_v2';
  let db = {history:[], records:{}, active:null, globalMemo:''};
  let session = null, running = false, lastTick = 0, mode = 'diagnose', zoom = 1, memoTab = 'question', archive = false;
  let storageFailed = false;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored && Array.isArray(stored.history) && stored.records && typeof stored.records === 'object') db = stored;
  } catch (_) { storageFailed = true; }
  const el = (tag, cls, text) => { const n = document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n; };
  const on = (id, fn, event='click') => $(id).addEventListener(event,fn);
  const fmt = seconds => {const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
  function confirmAction(message) {
    return new Promise(resolve=>{
      const overlay=el('div','modal-overlay open');
      const card=el('div','modal-card drill-body');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','훈련 확인');
      card.append(el('h2','',message));
      const yes=el('button','action primary','확인'),no=el('button','action','취소');
      const done=result=>{overlay.remove();resolve(result);};
      yes.addEventListener('click',()=>done(true));no.addEventListener('click',()=>done(false));
      overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();done(false);}});
      card.append(yes,no);overlay.append(card);document.body.append(overlay);no.focus();
    });
  }
  const block = () => session.blocks[session.block];
  const questions = () => block().ids.map(id=>byId[id]);
  const question = () => byId[block().ids[session.index]];
  const attempt = (q=question()) => session.attempts[q.id] ||= {seconds:0,visits:0};
  const persist = () => {
    if(session&&!archive)db.active = session;
    try {localStorage.setItem(key,JSON.stringify(db));storageFailed=false;}
    catch (_) {storageFailed=true;}
    $('storage-status').textContent = storageFailed ? '저장 공간을 확인하세요 · 기록 백업 권장' : '이 브라우저에 자동 저장';
  };
  function buildUI() {
    const home = el('main','home'); home.id='training-home';
    home.innerHTML = `
      <nav class="home-nav"><div class="home-brand"><span class="logo-badge">SKCT</span> 나의 훈련실</div><span class="muted" id="storage-status">이 브라우저에 자동 저장</span></nav>
      <div class="home-hero"><div><div class="eyebrow">PRACTICE WITH A STRATEGY</div><h1>풀 수 있는 문제부터,<br>시간 안에 정확하게.</h1><p>유형을 익히고, 풀이 속도를 재고, 놓친 문제를 다시 회수하세요.<br>자료해석과 언어추리부터 시작하는 나만의 SKCT 훈련 루틴.</p></div><aside class="strategy-card"><div class="eyebrow">오늘 기억할 한 가지</div><strong>15초 판단 → 보류 → 회수</strong><p>풀이 방향이 안 보이면 잠시 넘기세요.<br>확실한 문제를 푼 뒤, 보류한 문제로 돌아옵니다.</p></aside></div>
      <div id="resume-banner" class="resume-banner" hidden><span id="resume-description"></span><button id="resume-session" class="action">이어하기</button></div>
      <div class="mode-grid" role="group" aria-label="훈련 단계">
       <button class="mode-card" data-mode="diagnose" aria-pressed="true"><small>STEP 01 · 이번 주</small><b>유형 진단</b><span>시간 제한 없이 풀고<br>약한 유형부터 찾기</span></button>
       <button class="mode-card" data-mode="timed" aria-pressed="false"><small>STEP 02 · 다음 단계</small><b>15분 집중</b><span>영역별 시간 제한으로<br>보류와 회수 연습하기</span></button>
       <button class="mode-card" data-mode="full" aria-pressed="false"><small>STEP 03 · 실전 적응</small><b>5영역 연속</b><span>영역마다 시간을 나누어<br>연속으로 집중하기</span></button>
       <button class="mode-card" data-mode="review" aria-pressed="false"><small>STEP 04 · 시험 직전</small><b>약점 복습</b><span>오답·미응답·시간 초과<br>다시 풀고 원인 기록하기</span></button>
      </div>
      <section class="setup" aria-label="훈련 설정"><div class="setup-fields">
       <label>집중할 영역<select id="train-section"></select></label>
       <label>문항 / 페이지 수<input id="train-count" type="number" min="1" max="48" value="10"></label>
       <label id="minutes-label" hidden>영역당 제한 (분)<input id="train-minutes" type="number" min="1" max="90" value="15"></label>
       <label class="check-label"><input id="allow-calc" type="checkbox"> 계산기 사용</label>
       <button id="start-training" class="action primary">유형 진단 시작 →</button>
      </div><p id="setup-description" class="setup-note"></p><p class="setup-note">훈련용 설정입니다. 실제 시험의 문항 수·제한 시간·계산기 허용 여부는 본인 응시 안내에 맞춰 조정하세요.</p><p id="start-message" role="status" class="notice"></p></section>
      <div class="home-bottom"><section class="home-panel"><h2>영역별 훈련 기록</h2><div id="area-stats"></div><p class="muted">객관식 정답률은 각 문항의 최근 시도 기준입니다.<br>45초 초과는 훈련 지표이며, 계산연습 페이지에는 적용하지 않습니다.</p></section><section class="home-panel"><h2>오늘의 계산 워밍업</h2><p>증가율 · 구성비 · 비율 비교 · 평균 · 역산<br>계산기 없이 근사하고, 계산식과 비교해 보세요.</p><button id="open-drill" class="action" style="margin-top:16px">5문제 워밍업 시작</button><h2 style="margin-top:26px">최근 훈련</h2><div id="recent-sessions"></div></section></div>
      <div class="home-links"><button id="export-records" class="action">기록 백업</button><button id="import-records" class="action">백업 가져오기</button><input id="import-file" type="file" accept="application/json" hidden></div><p class="muted" style="margin:16px 0 30px">기존 앱의 답안·메모는 보관되어 있습니다. 새 훈련은 회차별로 독립적으로 기록합니다.</p>`;
    document.body.prepend(home);
    sections.forEach(s=>{const o=el('option','',s.name);o.value=s.id;$('train-section').append(o);});
    $('train-section').value='data';
    $('section-select').hidden=true;
    $('timer-reset-btn').hidden=true;
    document.querySelector('.logo-title').textContent='전략 훈련';
    const homeBtn=el('button','action','훈련실');homeBtn.id='back-home';document.querySelector('.header-left').prepend(homeBtn);
    const coach=el('div','coach');coach.id='coach';
    coach.innerHTML='<span id="session-label"></span><strong id="question-clock">00:00</strong><span id="coach-message" class="coach-message"></span><button id="skip-question" class="action">보류하고 다음 (S)</button><button id="recover-questions" class="action">보류 회수</button>';
    $('main-header').after(coach);
    const cover=el('div','pause-cover');cover.id='pause-cover';cover.hidden=true;
    cover.innerHTML='<h2>훈련이 잠시 멈췄어요</h2><p>다시 시작하면 풀이 시간도 함께 기록됩니다.</p><button id="resume-timer" class="action primary">계속 풀기</button>';
    $('question-panel').append(cover);
    const form=el('div','review-form');form.id='review-form';form.hidden=true;
    form.innerHTML='<b>다음에는 어떻게 풀까요?</b><label>오답 / 지연 원인<select id="review-reason"><option value="">원인 선택</option><option>개념·유형 미숙</option><option>조건·지문 오독</option><option>계산 실수</option><option>접근에 오래 걸림</option><option>보류 판단 지연</option><option>시간 부족</option></select></label><label>다음 시도에서 바꿀 행동<textarea id="review-rule" placeholder="예: 비율은 분모를 먼저 맞추고 대소 비교하기"></textarea></label>';
    $('notepad-container').before(form);
    const manual=el('div','manual-answer');manual.id='manual-answer';manual.hidden=true;
    manual.innerHTML='<label>페이지 풀이 답안 <textarea id="manual-response" placeholder="1) … 2) …"></textarea></label><span id="manual-help">여러 문제를 담은 페이지 · 자동 채점 제외</span><button id="manual-done" class="action">해설 대조 완료</button><button id="manual-retry" class="action">다시 연습</button>';
    document.querySelector('.omr-options-bar').after(manual);
    const blocked=el('div','calc-blocked','계산기 없이 근사해 보세요. 증가율은 변화량 ÷ 기준값, 구성비는 부분 ÷ 전체로 접근합니다.');blocked.id='calc-blocked';$('calculator-container').after(blocked);
    const insight=el('div','report-insight');insight.id='report-insight';document.querySelector('.review-filter-bar').before(insight);
    const nextBlock=el('button','btn-primary','다음 영역 시작 →');nextBlock.id='next-block';$('btn-retry-exam').after(nextBlock);
    const reviewQueue=el('button','filter-btn','미응답');reviewQueue.dataset.filter='unanswered';document.querySelector('.review-filter-bar').append(reviewQueue);
    const slow=el('button','filter-btn','45초 초과');slow.dataset.filter='slow';document.querySelector('.review-filter-bar').append(slow);
    document.querySelector('#score-modal h2').textContent='훈련 결과 · 정확도와 시간 전략';
    document.querySelector('.main-score .score-label').textContent='객관식 완료율';
    document.querySelector('.main-score .score-sub').textContent='응답 / 객관식 문항';
    $('btn-retry-exam').textContent='훈련실로 돌아가기';
    $('btn-review-exam').textContent='해설 확인 · 원인 기록';
    $('app-container').hidden=true;
  }
  function setMode(next) {
    mode=next;
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
    $('train-section').disabled=mode==='full';
    $('minutes-label').hidden=!['timed','full'].includes(mode);
    $('train-count').value=['timed','full'].includes(mode)?20:10;
    $('start-training').textContent=labels[mode]+' 시작 →';
    setupDescription();
  }
  function setupDescription() {
    const s=sections.find(s=>s.id===$('train-section').value);
    $('setup-description').textContent=mode==='full' ? '언어이해 → 자료해석 → 계산연습 → 언어추리 → 수열추리. 수열은 최대 14문항, 계산연습은 페이지 단위 수동 점검입니다. 실제 시험과 같은 문항 구성은 아닙니다.' :
      mode==='review' ? '선택 영역에서 오답·미응답·45초 초과·검토 표시된 문항을 다시 풉니다. 이전 답과 해설은 제출 뒤에 보입니다.' :
      `${s.name}: ${s.questions.length}${s.id==='math'?'페이지 · 여러 계산 문제가 담겨 있어 직접 점검합니다.':'문항 · 덜 풀어본 문제부터 무작위로 선정합니다.'} ${mode==='diagnose'?'제한 없이 접근법을 찾되, 문항별 소요 시간은 기록합니다.':'15초 판단과 45초 평균 페이스를 연습합니다.'}`;
  }
  function renderHome(save=true) {
    $('training-home').hidden=false;$('app-container').hidden=true;
    $('resume-banner').hidden=!db.active;
    if(db.active) $('resume-description').textContent=`${labels[db.active.mode]} · ${db.active.blocks[db.active.block].name} ${db.active.review?'결과 이어보기':'진행 중'}`;
    $('area-stats').replaceChildren();
    sections.forEach(s=>{
      const entries=s.questions.map(q=>db.records[q.id]).filter(Boolean);
      const answered=entries.filter(r=>['correct','wrong'].includes(r.status));
      const weak=s.questions.filter(q=>C.needsReview(q,db.records[q.id])).length;
      const accuracy=answered.length?Math.round(answered.filter(r=>r.status==='correct').length/answered.length*100)+'%':'—';
      const row=el('div','stats-row');row.append(el('b','',s.name),el('span','',s.id==='math'?`${entries.length}페이지 점검 · 복습 ${weak}`:`${accuracy} · 복습 ${weak}문항`));$('area-stats').append(row);
    });
    $('recent-sessions').replaceChildren();
    if(!db.history.length)$('recent-sessions').append(el('p','muted','첫 훈련을 마치면 여기에 기록됩니다.'));
    db.history.slice(-4).reverse().forEach(h=>{
      const b=el('button','stats-row action',`${new Date(h.date).toLocaleDateString('ko-KR')} · ${h.name} · ${h.stats.accuracy==null?(h.stats.manual?'직접 점검':'미응답'):h.stats.accuracy+'%'} · ${fmt(h.stats.seconds)}`);
      b.addEventListener('click',()=>{archive=true;session=structuredClone(h.session);session.block=h.block;session.review=true;showWorkspace();showReport();});$('recent-sessions').append(b);
    });
    if(save)persist();
  }
  async function startTraining() {
    const count=Number($('train-count').value), minutes=Number($('train-minutes').value);
    if(!Number.isInteger(count)||count<1||count>48||!Number.isInteger(minutes)||minutes<1||minutes>90){$('start-message').textContent='문항 수는 1~48, 제한 시간은 1~90분의 정수로 입력하세요.';return;}
    if(db.active&&!db.active.review&&!await confirmAction('진행 중인 훈련을 새 훈련으로 바꿀까요? 완료한 훈련 기록은 보관됩니다.'))return;
    const chosen=mode==='full'?['lang','data','math','reason','seq'].map(id=>sections.find(s=>s.id===id)):[sections.find(s=>s.id===$('train-section').value)];
    const blocks=chosen.map(s=>{
      const pool=mode==='review'?s.questions.filter(q=>C.needsReview(q,db.records[q.id])):s.questions;
      return {name:s.name,section:s.id,ids:C.choose(pool,count,db.records),limit:['timed','full'].includes(mode)?minutes*60:0,elapsed:0};
    }).filter(b=>b.ids.length);
    if(!blocks.length){$('start-message').textContent='이 영역에는 아직 복습할 기록이 없습니다. 유형 진단부터 시작하세요.';return;}
    archive=false;
    session={id:Date.now().toString(36),mode,blocks,block:0,index:0,attempts:{},review:false,calc:$('allow-calc').checked,recorded:[]};
    $('start-message').textContent='';showWorkspace();startClock();
  }
  function showWorkspace() {
    running=false;lastTick=performance.now();
    $('training-home').hidden=true;$('app-container').hidden=false;
    document.querySelectorAll('.modal-overlay').forEach(n=>n.classList.remove('open'));
    $('omr-drawer').classList.remove('open');
    $('calculator-container').hidden=!session.calc;$('calc-blocked').hidden=session.calc;
    $('timer-toggle-btn').disabled=session.review;
    attempt().visits++;renderQuestion();persist();
  }
  function startClock() { if(session.review)return;running=true;lastTick=performance.now();$('pause-cover').hidden=true;$('timer-toggle-btn').textContent='⏸️'; }
  function tick() {
    if(!session||!running||session.review)return;
    const now=performance.now();const delta=(now-lastTick)/1000;lastTick=now;
    const b=block();const used=b.limit?Math.min(delta,Math.max(0,b.limit-b.elapsed)):delta;
    b.elapsed+=used;attempt().seconds+=used;
    updateClock();
    if(b.limit&&b.elapsed>=b.limit){running=false;submit();}
  }
  function pause() {tick();running=false;if(!session.review){$('pause-cover').hidden=false;$('timer-toggle-btn').textContent='▶️';}persist();}
  function updateClock() {
    const b=block(),a=attempt();
    $('timer-display').textContent=fmt(b.limit?b.limit-b.elapsed:b.elapsed);
    $('timer-display').classList.toggle('urgent',!!b.limit&&b.limit-b.elapsed<60);
    $('question-clock').textContent='이 문제 '+fmt(a.seconds);
    const late=!session.review&&!C.manual(question())&&a.seconds>=15&&a.answer==null;
    $('coach').classList.toggle('is-late',late);
    $('coach-message').textContent=session.review?'해설을 대조하고 다음 시도에서 바꿀 행동을 기록하세요.':C.manual(question())?'계산연습은 한 페이지에 여러 문제입니다. 페이지 시간을 기록합니다.':a.seconds>45?'45초를 넘겼어요. 계속 풀지, 보류할지 결정하세요.':late?'풀이 방향이 보이나요? 안 보이면 보류하고 다음 문제로.':'조건 확인 → 풀이 방향 판단 → 확실한 답 마킹';
  }
  function renderQuestion() {
    const q=question(),a=attempt(),isManual=C.manual(q);
    $('session-label').textContent=`${labels[session.mode]} · ${session.block+1}/${session.blocks.length}영역`;
    $('current-q-num').textContent=session.index+1;$('total-q-num').textContent=block().ids.length;$('memo-q-num').textContent=q.num;
    $('q-category-text').textContent=`${q.section} · 원본 ${q.num}${isManual?'페이지':'번'} · ${q.category}`;
    if($('question-image').getAttribute('src')!==q.image){$('question-image').src=q.image;$('q-viewport').scrollTop=0;}
    $('question-image').alt=q.title;
    document.querySelectorAll('.opt-btn').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.val)===a.answer);b.disabled=session.review;});
    document.querySelector('.omr-options-bar').hidden=isManual;$('manual-answer').hidden=!isManual;
    $('manual-response').value=a.response||'';$('manual-response').disabled=session.review;
    $('manual-done').hidden=$('manual-retry').hidden=!session.review;
    $('manual-help').textContent=a.manual==='done'?'해설 대조 완료':a.manual==='retry'?'다시 연습할 페이지':'여러 문제를 담은 페이지 · 자동 채점 제외';
    $('clear-ans-btn').disabled=session.review;
    $('prev-q-btn').disabled=session.index===0;$('next-q-btn').disabled=session.index===block().ids.length-1;
    $('flag-btn').classList.toggle('active',!!a.flagged);
    $('review-status-tag').style.display=session.review?'block':'none';
    $('review-status-badge').textContent=isManual?'페이지 직접 점검':`${statusLabels[C.status(q,a)]} · 선택 ${a.answer||'—'} / 정답 ${q.answer}`;
    $('view-sol-btn').style.display=session.review?'inline-flex':'none';
    $('review-form').hidden=!session.review;
    $('review-reason').value=a.reason||'';$('review-rule').value=a.rule||'';
    $('skip-question').disabled=session.review;
    $('timer-toggle-btn').disabled=session.review;
    $('pause-cover').hidden=session.review||running;
    $('recover-questions').textContent=`보류 회수 (${block().ids.filter(id=>session.attempts[id]?.deferred).length})`;
    $('omr-answered-count').textContent=questions().filter(q=>C.manual(q)?attempt(q).response:attempt(q).answer!=null).length;
    $('omr-total-count').textContent=block().ids.length;
    renderMemo();updateClock();
  }
  function move(index) {if(index<0||index>=block().ids.length)return;tick();if(session.review||running){session.index=index;attempt().visits++;renderQuestion();persist();}}
  function pick(value) {if(session.review||!running||C.manual(question()))return;tick();if(session.review)return;attempt().answer=value;attempt().deferred=false;renderQuestion();persist();}
  function skip() {if(session.review||!running)return;tick();if(session.review)return;attempt().deferred=true;attempt().skipped=true;persist();if(session.index<block().ids.length-1)move(session.index+1);else{renderQuestion();$('coach-message').textContent='마지막 문제입니다. 보류 회수로 돌아가거나 제출하세요.';}}
  function recover() {const ids=block().ids;const idx=ids.findIndex((id,i)=>i>session.index&&session.attempts[id]?.deferred);const first=ids.findIndex(id=>session.attempts[id]?.deferred);if(first>=0)move(idx>=0?idx:first);else $('coach-message').textContent='남은 보류 문제가 없습니다.';}
  function renderMemo() {
    const a=attempt();$('notepad-textarea').value=memoTab==='global'?db.globalMemo||'':a.memo||'';
    $('notepad-char-count').textContent=$('notepad-textarea').value.length+'자';
    $('tab-q-memo').classList.toggle('active',memoTab==='question');$('tab-global-memo').classList.toggle('active',memoTab==='global');
  }
  function saveMemo(){if(memoTab==='global')db.globalMemo=$('notepad-textarea').value;else attempt().memo=$('notepad-textarea').value;persist();$('notepad-char-count').textContent=$('notepad-textarea').value.length+'자';$('notepad-save-indicator').textContent=storageFailed?'저장 실패 · 백업 권장':'자동 저장됨';}
  function renderOMR() {
    $('omr-grid').replaceChildren();questions().forEach((q,i)=>{
      const a=attempt(q),b=el('button',`omr-item ${i===session.index?'current':''} ${a.answer!=null||a.response?'answered':''} ${a.deferred||a.flagged?'flagged':''}`,`${i+1} · ${a.answer|| (a.response?'작성':a.deferred?'보류':'—')}`);
      b.addEventListener('click',()=>{move(i);$('omr-drawer').classList.remove('open');});$('omr-grid').append(b);
    });
  }
  function submit() {
    if(!session)return;
    if(!session.review){
      tick();if(session.review)return;
      running=false;session.review=true;
      questions().forEach(q=>{
        const a=attempt(q),old=db.records[q.id]||{};
        a.reason ||= old.reason || '';a.rule ||= old.rule || '';
        db.records[q.id]={...old,sessionId:session.id,status:C.status(q,a),slow:!C.manual(q)&&a.seconds>45,flagged:!!a.flagged,count:(old.count||0)+1,seconds:a.seconds,reason:a.reason,rule:a.rule};
      });
      session.recorded.push(session.block);
      db.history.push({date:new Date().toISOString(),name:block().name,stats:C.summary(questions(),session.attempts),block:session.block,session:structuredClone(session)});
    }
    persist();renderQuestion();showReport();
  }
  function showReport() {
    const stats=C.summary(questions(),session.attempts);
    $('res-score-val').textContent=stats.graded?Math.round((stats.correct+stats.wrong)/stats.graded*100)+'%':'—';
    $('res-correct-count').textContent=stats.correct;$('res-wrong-count').textContent=stats.wrong;$('res-unanswered-count').textContent=stats.unanswered;
    $('res-accuracy-rate').textContent=stats.accuracy==null?'—':stats.accuracy+'%';$('res-time-spent').textContent=fmt(block().elapsed);
    const allIds=session.blocks.slice(0,session.block+1).flatMap(b=>b.ids);
    const aggregate=C.summary(allIds.map(id=>byId[id]),session.attempts);
    $('report-insight').textContent=stats.manual?`${stats.manual}페이지는 객관식 통계에서 제외했습니다. 해설을 대조한 뒤 ‘해설 대조 완료’ 또는 ‘다시 연습’을 표시하세요.`:
      `45초 초과 ${stats.slow}문항 · 보류 후 정답 회수 ${stats.recovered}문항 · 열어 본 문항당 평균 ${Math.round(stats.seconds/Math.max(1,questions().filter(q=>attempt(q).visits>0).length))}초. ${stats.wrong>stats.correct?'다음 훈련은 시간 제한 없는 진단으로 접근법을 정리하세요.':stats.slow>questions().length/3?'다음 훈련에서는 15초 판단과 보류를 먼저 연습하세요.':'오답과 미응답을 복습하고, 같은 시간 안에 회수량을 늘려 보세요.'}`;
    if(session.blocks.length>1)$('report-insight').textContent+=` 연속 훈련 누계: ${session.block+1}/${session.blocks.length}영역 · 객관식 정답 ${aggregate.correct}/${aggregate.graded} · 직접 점검 ${aggregate.manual}페이지.`;
    $('next-block').hidden=archive||session.block===session.blocks.length-1;
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));
    renderResults('all');$('score-modal').classList.add('open');
  }
  function renderResults(filter) {
    $('score-review-grid').replaceChildren();
    questions().forEach((q,i)=>{
      const a=attempt(q),status=C.status(q,a);
      if(filter==='wrong'&&status!=='wrong'||filter==='unanswered'&&status!=='unanswered'||filter==='flagged'&&!a.flagged||filter==='slow'&&(C.manual(q)||a.seconds<=45))return;
      const b=el('button',`res-q-card ${status}`);
      b.append(el('b','',`${i+1} · ${statusLabels[status]}`),el('small','',C.manual(q)?'원본 '+q.num+'페이지':`선택 ${a.answer||'—'} / 정답 ${q.answer}`),el('small','',`${fmt(a.seconds)}${a.skipped?' · 보류 이력':''}${a.reason?' · '+a.reason:''}`));
      b.addEventListener('click',()=>{$('score-modal').classList.remove('open');move(i);});$('score-review-grid').append(b);
    });
    if(!$('score-review-grid').children.length)$('score-review-grid').append(el('p','muted','해당하는 문항이 없습니다.'));
  }
  function updateReview() {
    const a=attempt(),q=question();a.reason=$('review-reason').value;a.rule=$('review-rule').value;
    if(db.records[q.id]&&(!archive||db.records[q.id].sessionId===session.id))Object.assign(db.records[q.id],{status:C.status(q,a),flagged:!!a.flagged,reason:a.reason,rule:a.rule});
    const h=db.history.find(h=>h.session.id===session.id&&h.block===session.block);if(h)h.session.attempts[q.id]=structuredClone(a);
    persist();
  }
  function solution() {
    if(!session.review)return;const q=question();$('sol-modal-title').textContent=q.title+' · 해설';$('sol-correct-num').textContent=C.manual(q)?'페이지별 해설 대조':q.answer+'번';$('sol-category-name').textContent=q.section;$('solution-image').src=q.solution_image;$('solution-modal').classList.add('open');
  }
  function home() {if(session&&!session.review)pause();else running=false;persist();session=null;document.querySelectorAll('.modal-overlay').forEach(n=>n.classList.remove('open'));renderHome();}
  function setZoom(n){zoom=Math.max(.5,Math.min(2.5,n));$('q-image-container').style.transform='none';$('q-image-container').style.width=zoom*100+'%';$('q-image-container').style.maxWidth=900*zoom+'px';$('zoom-level-text').textContent=Math.round(zoom*100)+'%';}
  function bind() {
    document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
    on('train-section',setupDescription,'change');on('start-training',startTraining);on('back-home',home);
    on('resume-session',()=>{archive=false;session=structuredClone(db.active);showWorkspace();if(session.review)showReport();else startClock();});
    on('timer-toggle-btn',()=>running?pause():startClock());on('resume-timer',startClock);
    on('prev-q-btn',()=>move(session.index-1));on('next-q-btn',()=>move(session.index+1));on('skip-question',skip);on('recover-questions',recover);
    document.querySelectorAll('.opt-btn').forEach(b=>b.addEventListener('click',()=>pick(Number(b.dataset.val))));
    on('clear-ans-btn',()=>{if(!session.review&&running){delete attempt().answer;renderQuestion();persist();}});
    on('flag-btn',()=>{attempt().flagged=!attempt().flagged;renderQuestion();if(session.review)updateReview();else persist();});
    on('manual-response',()=>{attempt().response=$('manual-response').value;persist();},'input');
    on('manual-done',()=>{attempt().manual='done';updateReview();renderQuestion();});on('manual-retry',()=>{attempt().manual='retry';updateReview();renderQuestion();});
    on('omr-drawer-toggle',()=>{renderOMR();$('omr-drawer').classList.toggle('open');});on('close-omr-btn',()=>$('omr-drawer').classList.remove('open'));
    const submitAction=async()=>{if(session.review){showReport();return;}if(await confirmAction('현재 영역을 제출하고 결과를 확인할까요?')){tick();submit();}};
    on('submit-exam-btn',submitAction);on('omr-submit-btn',()=>{$('omr-drawer').classList.remove('open');submitAction();});
    on('close-score-modal-btn',()=>$('score-modal').classList.remove('open'));on('btn-review-exam',()=>$('score-modal').classList.remove('open'));on('btn-retry-exam',home);
    on('next-block',()=>{session.block++;session.index=0;session.review=false;showWorkspace();startClock();});
    document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter-btn').forEach(x=>x.classList.toggle('active',x===b));renderResults(b.dataset.filter);}));
    on('review-reason',updateReview,'change');on('review-rule',updateReview,'input');on('view-sol-btn',solution);
    ['close-sol-modal-btn','close-sol-btn'].forEach(id=>on(id,()=>$('solution-modal').classList.remove('open')));
    on('tab-q-memo',()=>{memoTab='question';renderMemo();});on('tab-global-memo',()=>{memoTab='global';renderMemo();});on('notepad-textarea',saveMemo,'input');
    on('notepad-clear-btn',async()=>{if(await confirmAction('현재 메모를 지울까요?')){$('notepad-textarea').value='';saveMemo();}});
    on('notepad-copy-btn',async()=>{try{await navigator.clipboard.writeText($('notepad-textarea').value);$('notepad-save-indicator').textContent='복사 완료';}catch(_){$('notepad-save-indicator').textContent='메모를 선택해 직접 복사하세요.';}});
    let font=14;on('notepad-font-inc',()=>{$('notepad-textarea').style.fontSize=(font=Math.min(24,font+2))+'px';});on('notepad-font-dec',()=>{$('notepad-textarea').style.fontSize=(font=Math.max(10,font-2))+'px';});
    on('zoom-in-btn',()=>setZoom(zoom+.15));on('zoom-out-btn',()=>setZoom(zoom-.15));on('zoom-fit-width',()=>setZoom(1));on('zoom-fit-page',()=>setZoom(1));
    on('export-records',()=>{persist();const url=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='skct-training-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    on('import-records',()=>$('import-file').click());
    on('import-file',async()=>{
      try{const file=$('import-file').files[0];if(!file)return;const incoming=JSON.parse(await file.text());
        const validSession=s=>s&&labels[s.mode]&&Array.isArray(s.blocks)&&Number.isInteger(s.block)&&s.block>=0&&s.block<s.blocks.length&&s.blocks.every(b=>Array.isArray(b.ids)&&b.ids.length&&b.ids.every(id=>byId[id])&&Number.isFinite(b.elapsed)&&Number.isFinite(b.limit))&&Number.isInteger(s.index)&&s.index>=0&&s.index<s.blocks[s.block].ids.length&&s.attempts&&Array.isArray(s.recorded);
        if(!incoming.records||!Array.isArray(incoming.history)||incoming.history.some(h=>!validSession(h.session)||!h.stats)||incoming.active&&!validSession(incoming.active))throw new Error('invalid');
        if(await confirmAction('현재 훈련 기록을 백업 파일의 기록으로 바꿀까요?')){db=incoming;session=null;persist();renderHome();}
      }catch(_){$('start-message').textContent='유효한 훈련 백업 파일을 선택하세요.';}finally{$('import-file').value='';}
    },'change');
    window.addEventListener('keydown',e=>{
      if(!session||$('app-container').hidden||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
      const tag=document.activeElement?.tagName;
      if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.activeElement?.isContentEditable)return;
      if(document.querySelector('.modal-overlay.open')){if(e.key==='Escape')document.querySelectorAll('.modal-overlay').forEach(n=>n.classList.remove('open'));return;}
      if(e.key==='Escape'){if(running)pause();return;}
      if(!running&&!session.review)return;
      if(session.calc&&handleCalcKey(e))return;
      if(/^Digit[1-5]$/.test(e.code)){e.preventDefault();pick(Number(e.code.slice(-1)));}
      else if(e.key==='ArrowRight'){e.preventDefault();move(session.index+1);}else if(e.key==='ArrowLeft'){e.preventDefault();move(session.index-1);}else if(e.code==='KeyS'){e.preventDefault();skip();}
    });
    window.addEventListener('pagehide',()=>{if(session){tick();persist();}});
    // Another tab owns the latest record. Stop this clock before it can overwrite it.
    window.addEventListener('storage',e=>{
      if(e.key!==key||!e.newValue)return;
      try {
        const incoming=JSON.parse(e.newValue);
        if(!Array.isArray(incoming.history)||!incoming.records)return;
        running=false;session=null;archive=false;db=incoming;
        document.querySelectorAll('.modal-overlay').forEach(n=>n.classList.remove('open'));
        renderHome(false);
        $('start-message').textContent='다른 탭에서 훈련 기록이 변경되었습니다. 한 탭에서 이어서 진행하세요.';
      } catch (_) { /* Ignore unrelated or incomplete storage writes. */ }
    });
    setInterval(()=>{tick();if(session&&running)persist();},1000);
  }
  // A small calculator with explicit input routing: numpad or focused keypad only.
  let calcValue='0',calcPrev=null,calcOp=null,calcFresh=true,calcMemory=0,calcHistory=[];
  function calcRender(){ $('calc-screen').textContent=calcValue; }
  function calcAction(value,action) {
    if(!session?.calc)return;
    const num=()=>Number(calcValue);
    if(value!=null){if(value==='.') {if(calcFresh){calcValue='0';calcFresh=false;}if(!calcValue.includes('.'))calcValue+='.';}else{calcValue=calcFresh||calcValue==='0'?value:calcValue+value;calcFresh=false;}}
    else if(['add','sub','mult','div'].includes(action)){if(calcOp&&!calcFresh)calcAction(null,'equals');calcPrev=num();calcOp=action;calcFresh=true;$('calc-expression').textContent=calcValue+' '+({add:'+',sub:'−',mult:'×',div:'÷'}[action]);}
    else if(action==='equals'&&calcOp){const x=num(),op=calcOp,p=calcPrev;const res=op==='add'?p+x:op==='sub'?p-x:op==='mult'?p*x:p/x;calcValue=Number.isFinite(res)?String(Number(res.toPrecision(12))):'Error';calcHistory.unshift(`${p} ${{add:'+',sub:'−',mult:'×',div:'÷'}[op]} ${x} = ${calcValue}`);calcHistory=calcHistory.slice(0,30);$('calc-history-list').replaceChildren(...calcHistory.map(t=>el('div','history-item',t)));calcOp=null;calcFresh=true;}
    else if(action==='c'||action==='ce'){calcValue='0';calcFresh=true;if(action==='c'){calcOp=null;calcPrev=null;$('calc-expression').textContent='';}}
    else if(action==='backspace'){calcValue=calcValue.slice(0,-1)||'0';}
    else if(action==='mc')calcMemory=0;
    else if(action==='mr'){calcValue=String(calcMemory);calcFresh=true;}
    else if(action==='m-plus')calcMemory+=num();
    else if(action==='m-minus')calcMemory-=num();
    else if(['neg','pct','sqr','sqrt','recip'].includes(action)){const n=num();const result=action==='neg'?-n:action==='pct'?n/100:action==='sqr'?n*n:action==='sqrt'?Math.sqrt(n):1/n;calcValue=Number.isFinite(result)?String(Number(result.toPrecision(12))):'Error';calcFresh=true;}
    calcRender();
  }
  function handleCalcKey(e){const focused=$('calculator-container').contains(document.activeElement);if(!e.code.startsWith('Numpad')&&!focused)return false;const ops={'+':'add','-':'sub','*':'mult','/':'div','Enter':'equals','=':'equals','Backspace':'backspace'};if(/^\d$/.test(e.key)||e.key==='.'){e.preventDefault();calcAction(e.key);return true;}if(ops[e.key]){e.preventDefault();calcAction(null,ops[e.key]);return true;}return false;}
  function bindCalculator(){document.querySelectorAll('.c-key').forEach(b=>{if(['paren-open','paren-close'].includes(b.dataset.action)){b.hidden=true;return;}b.addEventListener('click',()=>calcAction(b.dataset.val??null,b.dataset.action));});on('calc-history-toggle',()=>$('calc-history-drawer').classList.toggle('open'));on('calc-clear-history',()=>{calcHistory=[];$('calc-history-list').replaceChildren();});}
  function bindDrill(){
    const modal=el('div','modal-overlay');modal.id='drill-modal';modal.innerHTML='<div class="modal-card"><div class="modal-header"><h2>계산 워밍업 · 근사로 빠르게</h2><button id="close-drill" class="close-btn" aria-label="워밍업 닫기">×</button></div><div class="drill-body"><span id="drill-progress" class="eyebrow"></span><h3 id="drill-question"></h3><label for="drill-answer">근사한 답</label><input id="drill-answer" type="text" inputmode="decimal" autocomplete="off"><button id="check-drill" class="action primary">답 확인</button><p id="drill-feedback" role="status"></p><button id="next-drill" class="action" hidden>다음 문제 →</button><p class="muted">증가율·구성비는 ±1%p, 평균·역산은 ±2%까지 근사 성공으로 표시합니다.</p></div></div>';
    document.body.append(modal);let exercises=[],index=0,started=0,correct=0;
    const show=()=>{$('drill-progress').textContent=`${index+1} / 5 · ${exercises[index].type}`;$('drill-question').textContent=exercises[index].prompt;$('drill-answer').value='';$('drill-answer').disabled=false;$('drill-feedback').textContent='';$('next-drill').hidden=true;$('check-drill').disabled=false;started=performance.now();$('drill-answer').focus();};
    on('open-drill',()=>{const base=(Math.floor(Math.random()*15)+10)*100,rate=Math.floor(Math.random()*16)+5,part=Math.floor(Math.random()*35)+15,average=Math.floor(Math.random()*80)+100;
      exercises=[{type:'증가율',prompt:`${base.toLocaleString()}에서 ${(base*(1+rate/100)).toLocaleString()}로 늘었습니다. 증가율은 약 몇 %일까요?`,answer:rate,tol:1,solution:`변화량 ÷ 기준값 × 100 = ${rate}%`},{type:'구성비',prompt:`전체 ${base}개 중 ${base*part/100}개가 A입니다. A의 구성비는 약 몇 %일까요?`,answer:part,tol:1,solution:`부분 ÷ 전체 × 100 = ${part}%`},{type:'비율 비교',prompt:'A: 31/79, B: 42/101. 더 큰 비율을 A 또는 B로 입력하세요.',answer:'B',solution:'31 × 101 = 3131, 42 × 79 = 3318. B가 큽니다. A는 약 39%, B는 약 42%입니다.'},{type:'평균',prompt:`${average-17}, ${average+11}, ${average+6}의 평균을 근사하세요.`,answer:average,tol:average*.02,solution:`기준값 ${average}에서 편차 합이 −17 + 11 + 6 = 0이므로 평균은 ${average}입니다.`},{type:'역산',prompt:`어떤 값이 ${rate}% 증가해 ${base*(1+rate/100)}가 되었습니다. 원래 값을 근사하세요.`,answer:base,tol:base*.02,solution:`현재 값 ÷ (1 + ${rate}/100) = ${base}`}];index=0;correct=0;modal.classList.add('open');show();});
    on('close-drill',()=>modal.classList.remove('open'));
    on('check-drill',()=>{const q=exercises[index],raw=$('drill-answer').value.trim();if(!raw){$('drill-feedback').textContent='답을 먼저 입력하세요.';return;}const ok=typeof q.answer==='string'?raw.toUpperCase()===q.answer:Math.abs(Number(raw.replaceAll(',','').replace('%',''))-q.answer)<=q.tol;if(ok)correct++;$('drill-feedback').textContent=`${ok?'근사 성공':'다시 확인'} · ${Math.round((performance.now()-started)/1000)}초. ${q.solution}`;$('drill-answer').disabled=true;$('check-drill').disabled=true;$('next-drill').hidden=false;$('next-drill').textContent=index===4?`완료 · ${correct}/5 성공`:'다음 문제 →';});
    on('next-drill',()=>{if(index===4){modal.classList.remove('open');return;}index++;show();});
  }
  buildUI();bind();bindCalculator();bindDrill();setupDescription();renderHome();
})();
