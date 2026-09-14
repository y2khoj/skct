/**
 * SKCT Speed Calculation Drill Engine
 * Standalone calculation practice tool for data interpretation and math speed.
 */
(function () {
  'use strict';

  // --- STATE ---
  let selectedMode = 'all'; // 'all', 'fraction', 'growth', 'ratio', 'multiply'
  let targetCount = 10;     // 10, 20, 30, 50, 999
  let timeLimitPerQ = 0;   // 0 (none), 10, 7, 5
  
  let questions = [];
  let currentIdx = 0;
  let currentQ = null;
  let isAnswered = false;
  
  let currentStreak = 0;
  let maxStreak = 0;
  let sessionHistory = [];
  
  let totalStartTime = 0;
  let qStartTime = 0;
  let lapTimerInterval = null;
  let totalTimerInterval = null;
  let timeLimitTimeout = null;

  // --- DOM ELEMENTS ---
  const $ = id => document.getElementById(id);
  const setupView = $('setup-view');
  const drillView = $('drill-view');
  const resultView = $('result-view');

  // --- PROBLEM GENERATORS ---
  function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function round1(val) {
    return Math.round(val * 10) / 10;
  }

  // 1. Fraction Comparison (A vs B)
  function genFractionProblem() {
    let a_num, a_den, b_num, b_den, diffRatio;
    let attempts = 0;
    
    do {
      attempts++;
      // Pick numbers in realistic 자료해석 range
      if (Math.random() > 0.5) {
        a_num = rnd(24, 95);
        a_den = rnd(a_num + 15, a_num + 120);
        b_num = rnd(24, 95);
        b_den = rnd(b_num + 15, b_num + 120);
      } else {
        a_num = rnd(110, 380);
        a_den = rnd(a_num + 50, a_num + 450);
        b_num = rnd(110, 380);
        b_den = rnd(b_num + 50, b_num + 450);
      }

      const valA = a_num / a_den;
      const valB = b_num / b_den;
      diffRatio = Math.abs(valA - valB) / Math.min(valA, valB);
      // Ensure difference is between 2% and 25% (challenging yet clearly distinct)
    } while ((diffRatio < 0.02 || diffRatio > 0.35 || a_num === b_num || a_den === b_den) && attempts < 50);

    const valA = a_num / a_den;
    const valB = b_num / b_den;
    const correctCard = valA > valB ? 'A' : 'B';

    const pctA = (valA * 100).toFixed(1) + '%';
    const pctB = (valB * 100).toFixed(1) + '%';
    const larger = correctCard === 'A' ? 'A가 더 큽니다.' : 'B가 더 큽니다.';

    // Explain with growth rates between fractions if helpful
    const numGrowth = Math.abs(b_num - a_num) / Math.min(a_num, b_num);
    const denGrowth = Math.abs(b_den - a_den) / Math.min(a_den, b_den);
    let tip = `A: ${a_num}/${a_den} (${pctA}) vs B: ${b_num}/${b_den} (${pctB}) → <strong>${larger}</strong>`;
    if (a_num < b_num && a_den < b_den) {
      tip += `<br><span style="color:#94a3b8; font-size:0.85em;">💡 분모 변화율 대비 분자 변화율: 분자 ${(numGrowth*100).toFixed(0)}% vs 분모 ${(denGrowth*100).toFixed(0)}%</span>`;
    }

    return {
      type: 'fraction',
      typeName: '⚖️ 분수 크기 비교',
      prompt: '두 분수 중 더 큰 분수를 선택하세요.',
      cardA: { num: a_num, den: a_den, val: valA },
      cardB: { num: b_num, den: b_den, val: valB },
      correct: correctCard,
      solutionTip: tip
    };
  }

  // 2. Growth Rate Problem
  function genGrowthProblem() {
    const baseMult = rnd(12, 120);
    const base = baseMult * 20; // e.g. 240, 380, 1400, ...
    const rate = rnd(6, 45) * (Math.random() > 0.25 ? 1 : -1); // mostly positive growth
    const diff = Math.round(base * (rate / 100));
    const target = base + diff;

    const isInc = rate > 0;
    const absRate = Math.abs(rate);
    const directionWord = isInc ? '증가' : '감소';

    return {
      type: 'growth',
      typeName: '📈 증가율 어림셈',
      prompt: `${base.toLocaleString()}에서 ${target.toLocaleString()}로 ${directionWord}했습니다.<br><span style="color:#38bdf8">${directionWord}율은 약 몇 %</span>일까요?`,
      expression: `${base.toLocaleString()} → ${target.toLocaleString()}`,
      correct: absRate,
      unit: '%',
      tolerance: 1.5, // accept within +/- 1.5%p
      solutionTip: `변화량 |${diff.toLocaleString()}| ÷ 기준값 ${base.toLocaleString()} × 100 = <strong>약 ${absRate}% ${directionWord}</strong> (±1.5%p 이내 근사 성공)`
    };
  }

  // 3. Share / Ratio Problem
  function genRatioProblem() {
    const total = rnd(15, 120) * 100; // e.g. 1,500 ~ 12,000
    const pct = rnd(8, 48); // 8% ~ 48%
    const part = Math.round(total * (pct / 100));

    return {
      type: 'ratio',
      typeName: '📊 구성비 / 비중 계산',
      prompt: `전체 ${total.toLocaleString()} 중 <strong>${part.toLocaleString()}</strong>이 차지하는 비중은 약 몇 %일까요?`,
      expression: `${part.toLocaleString()} / ${total.toLocaleString()}`,
      correct: pct,
      unit: '%',
      tolerance: 1.5,
      solutionTip: `부분 ${part.toLocaleString()} ÷ 전체 ${total.toLocaleString()} × 100 = <strong>약 ${pct}%</strong> (기준 분수 10%=${(total*0.1).toLocaleString()} 활용)`
    };
  }

  // 4. Speed Arithmetic Problem (2-digit multiply or 3-digit add/sub)
  function genMultiplyProblem() {
    const subType = Math.random();
    if (subType < 0.6) {
      // 2-digit x 2-digit multiply
      const a = rnd(14, 89);
      const b = rnd(12, 69);
      const ans = a * b;
      return {
        type: 'multiply',
        typeName: '🔢 2자리 수 곱셈',
        prompt: `다음 곱셈의 결과 값을 계산하세요.`,
        expression: `${a} × ${b} = ?`,
        correct: ans,
        unit: '',
        tolerance: 0,
        solutionTip: `${a} × ${b} = <strong>${ans.toLocaleString()}</strong>`
      };
    } else if (subType < 0.8) {
      // 3-digit + 3-digit addition
      const a = rnd(230, 890);
      const b = rnd(180, 890);
      const ans = a + b;
      return {
        type: 'multiply',
        typeName: '🔢 3자리 수 덧셈',
        prompt: `다음 덧셈의 결과 값을 계산하세요.`,
        expression: `${a} + ${b} = ?`,
        correct: ans,
        unit: '',
        tolerance: 0,
        solutionTip: `${a} + ${b} = <strong>${ans.toLocaleString()}</strong>`
      };
    } else {
      // 3-digit - 3-digit subtraction
      const a = rnd(450, 990);
      const b = rnd(120, a - 50);
      const ans = a - b;
      return {
        type: 'multiply',
        typeName: '🔢 3자리 수 뺄셈',
        prompt: `다음 뺄셈의 결과 값을 계산하세요.`,
        expression: `${a} − ${b} = ?`,
        correct: ans,
        unit: '',
        tolerance: 0,
        solutionTip: `${a} − ${b} = <strong>${ans.toLocaleString()}</strong>`
      };
    }
  }

  function generateQuestion(mode) {
    let type = mode;
    if (mode === 'all') {
      const types = ['fraction', 'fraction', 'growth', 'ratio', 'multiply'];
      type = types[rnd(0, types.length - 1)];
    }

    switch (type) {
      case 'fraction': return genFractionProblem();
      case 'growth': return genGrowthProblem();
      case 'ratio': return genRatioProblem();
      case 'multiply': return genMultiplyProblem();
      default: return genFractionProblem();
    }
  }

  // --- DRILL LIFECYCLE ---
  function init() {
    bindEvents();
  }

  function bindEvents() {
    // Mode card clicks
    document.querySelectorAll('.calc-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.calc-mode-card').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-checked', 'true');
        selectedMode = card.getAttribute('data-mode');
      });
    });

    // Start Drill Button
    $('start-drill-btn').addEventListener('click', startDrill);

    // Next Question Button
    $('next-drill-btn').addEventListener('click', nextQuestion);

    // Abort Button
    $('abort-drill-btn').addEventListener('click', () => {
      if (confirm('현재 계산 훈련을 중단하고 설정 화면으로 돌아갈까요?')) {
        finishDrill(true);
      }
    });

    // Keypad clicks
    document.querySelectorAll('.kp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        handleKeypadAction(btn.getAttribute('data-key'));
      });
    });

    // Results Actions
    $('btn-restart-same').addEventListener('click', startDrill);
    $('btn-retry-wrong').addEventListener('click', startRetryWrong);
    $('btn-change-mode').addEventListener('click', () => {
      showView('setup');
    });

    // History filter pills
    document.querySelectorAll('.hist-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.hist-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderHistoryList(pill.getAttribute('data-filter'));
      });
    });

    // Global Keydown
    window.addEventListener('keydown', handleGlobalKeydown);
  }

  function showView(name) {
    setupView.style.display = (name === 'setup') ? 'block' : 'none';
    drillView.style.display = (name === 'drill') ? 'block' : 'none';
    resultView.style.display = (name === 'result') ? 'block' : 'none';
    $('nav-stats-bar').style.display = (name === 'drill') ? 'flex' : 'none';
  }

  function startDrill() {
    targetCount = parseInt($('q-count-select').value, 10);
    const tVal = $('time-mode-select').value;
    timeLimitPerQ = tVal === 'none' ? 0 : parseInt(tVal, 10);

    questions = [];
    sessionHistory = [];
    currentIdx = 0;
    currentStreak = 0;
    maxStreak = 0;

    // Generate questions up front or on demand
    const initialBatch = Math.min(targetCount, 100);
    for (let i = 0; i < initialBatch; i++) {
      questions.push(generateQuestion(selectedMode));
    }

    showView('drill');
    totalStartTime = performance.now();
    startTotalTimer();
    renderCurrentQuestion();
  }

  function startRetryWrong() {
    const wrongQs = sessionHistory.filter(h => !h.isCorrect).map(h => h.question);
    if (!wrongQs.length) return;

    questions = wrongQs;
    targetCount = questions.length;
    sessionHistory = [];
    currentIdx = 0;
    currentStreak = 0;
    maxStreak = 0;

    showView('drill');
    totalStartTime = performance.now();
    startTotalTimer();
    renderCurrentQuestion();
  }

  function startTotalTimer() {
    if (totalTimerInterval) clearInterval(totalTimerInterval);
    totalTimerInterval = setInterval(() => {
      const elapsed = Math.floor((performance.now() - totalStartTime) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      $('drill-total-timer').textContent = `${m}:${s}`;
    }, 1000);
  }

  function renderCurrentQuestion() {
    isAnswered = false;
    $('feedback-banner').style.display = 'none';

    // If infinite mode, add on demand
    if (currentIdx >= questions.length) {
      questions.push(generateQuestion(selectedMode));
    }

    currentQ = questions[currentIdx];

    // Meta Header
    $('current-type-pill').textContent = currentQ.typeName;
    const progressLabel = targetCount >= 999 ? `문제 ${currentIdx + 1}` : `문제 ${currentIdx + 1} / ${targetCount}`;
    $('current-seq-text').textContent = progressLabel;
    $('drill-progress-text').textContent = progressLabel;
    $('streak-count').textContent = currentStreak;

    // Build Question Container
    const container = $('drill-question-container');
    container.innerHTML = '';

    if (currentQ.type === 'fraction') {
      renderFractionUI(container, currentQ);
      $('drill-keypad').style.display = 'none';
      $('keyboard-guide-text').innerHTML = '⌨️ 키보드 <kbd>A</kbd> / <kbd>B</kbd> 또는 방향키 <kbd>←</kbd> / <kbd>→</kbd> 로 더 큰 분수를 고르세요.';
    } else {
      renderPromptUI(container, currentQ);
      $('drill-keypad').style.display = 'grid';
      $('keyboard-guide-text').innerHTML = '⌨️ 키보드로 숫자를 입력한 뒤 <kbd>Enter</kbd>키를 누르세요.';
    }

    // Start Question Lap Timer
    qStartTime = performance.now();
    startLapTimer();
  }

  function startLapTimer() {
    if (lapTimerInterval) clearInterval(lapTimerInterval);
    if (timeLimitTimeout) clearTimeout(timeLimitTimeout);

    const lapEl = $('lap-seconds');
    const timerBox = $('question-lap-timer');
    timerBox.classList.remove('late');

    lapTimerInterval = setInterval(() => {
      const elapsed = (performance.now() - qStartTime) / 1000;
      lapEl.textContent = elapsed.toFixed(1);

      if (timeLimitPerQ > 0) {
        const remaining = Math.max(0, timeLimitPerQ - elapsed);
        lapEl.textContent = remaining.toFixed(1);
        if (remaining <= 2.5) {
          timerBox.classList.add('late');
        }
        if (remaining <= 0) {
          clearInterval(lapTimerInterval);
          handleTimeout();
        }
      } else {
        if (elapsed >= 10) {
          timerBox.classList.add('late');
        }
      }
    }, 100);
  }

  function renderFractionUI(container, q) {
    const html = `
      <div class="fraction-compare-container">
        <button type="button" class="fraction-choice-card" id="card-choice-a" data-choice="A">
          <div class="card-tag"><span>[A]</span> 첫 번째 분수</div>
          <div class="fraction-display">
            <span class="frac-num">${q.cardA.num}</span>
            <div class="frac-line"></div>
            <span class="frac-den">${q.cardA.den}</span>
          </div>
          <div class="card-hotkey-badge">키 A 또는 ←</div>
        </button>

        <div class="vs-badge">VS</div>

        <button type="button" class="fraction-choice-card" id="card-choice-b" data-choice="B">
          <div class="card-tag"><span>[B]</span> 두 번째 분수</div>
          <div class="fraction-display">
            <span class="frac-num">${q.cardB.num}</span>
            <div class="frac-line"></div>
            <span class="frac-den">${q.cardB.den}</span>
          </div>
          <div class="card-hotkey-badge">키 B 또는 →</div>
        </button>
      </div>
    `;
    container.innerHTML = html;

    $('card-choice-a').addEventListener('click', () => chooseFraction('A'));
    $('card-choice-b').addEventListener('click', () => chooseFraction('B'));
  }

  function renderPromptUI(container, q) {
    const html = `
      <div class="prompt-calc-container">
        <div class="prompt-expression">${q.expression}</div>
        <div class="prompt-text">${q.prompt}</div>
        <div class="calc-input-wrapper">
          <input type="text" id="calc-input-field" class="calc-main-input" inputmode="decimal" autocomplete="off" autofocus placeholder="?">
          ${q.unit ? `<span class="input-unit">${q.unit}</span>` : ''}
        </div>
        <button type="button" id="btn-input-submit" class="btn-submit-answer">정답 확인 (Enter)</button>
      </div>
    `;
    container.innerHTML = html;

    const input = $('calc-input-field');
    if (input) {
      input.focus();
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitPromptAnswer();
        }
      });
    }

    $('btn-input-submit').addEventListener('click', submitPromptAnswer);
  }

  // --- ANSWER SUBMISSIONS ---
  function chooseFraction(choice) {
    if (isAnswered) return;
    isAnswered = true;
    clearInterval(lapTimerInterval);

    const elapsed = Math.round((performance.now() - qStartTime) / 100) / 10;
    const isCorrect = (choice === currentQ.correct);

    const cardA = $('card-choice-a');
    const cardB = $('card-choice-b');

    if (cardA && cardB) {
      if (currentQ.correct === 'A') cardA.classList.add('correct');
      else cardB.classList.add('correct');

      if (!isCorrect) {
        if (choice === 'A') cardA.classList.add('wrong');
        else cardB.classList.add('wrong');
      }
    }

    recordAnswer(choice, isCorrect, elapsed);
  }

  function submitPromptAnswer() {
    if (isAnswered) return;
    const input = $('calc-input-field');
    if (!input) return;

    const raw = input.value.trim().replace('%', '').replace(',', '');
    if (!raw) {
      input.focus();
      return;
    }

    isAnswered = true;
    clearInterval(lapTimerInterval);
    const val = parseFloat(raw);
    const elapsed = Math.round((performance.now() - qStartTime) / 100) / 10;

    let isCorrect = false;
    if (currentQ.tolerance > 0) {
      isCorrect = Math.abs(val - currentQ.correct) <= currentQ.tolerance;
    } else {
      isCorrect = (val === currentQ.correct);
    }

    recordAnswer(val, isCorrect, elapsed);
  }

  function handleTimeout() {
    if (isAnswered) return;
    isAnswered = true;
    const elapsed = timeLimitPerQ;
    recordAnswer('시간 초과', false, elapsed);
  }

  function recordAnswer(userAns, isCorrect, elapsedSec) {
    if (isCorrect) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
    $('streak-count').textContent = currentStreak;

    // Save to history
    sessionHistory.push({
      question: currentQ,
      userAnswer: userAns,
      isCorrect: isCorrect,
      time: elapsedSec
    });

    // Show Feedback Banner
    const banner = $('feedback-banner');
    banner.style.display = 'block';
    banner.className = `feedback-banner ${isCorrect ? 'correct' : 'wrong'}`;

    $('feedback-icon').textContent = isCorrect ? '✓' : '✕';
    $('feedback-title').textContent = isCorrect ? '정답입니다!' : '아쉽습니다. 오답입니다.';
    $('feedback-time-text').textContent = `풀이 시간: ${elapsedSec}초`;
    $('feedback-solution-text').innerHTML = currentQ.solutionTip;

    // Focus Next Button
    $('next-drill-btn').focus();
  }

  function nextQuestion() {
    currentIdx++;
    if (currentIdx >= targetCount && targetCount < 999) {
      finishDrill(false);
    } else {
      renderCurrentQuestion();
    }
  }

  function handleKeypadAction(key) {
    if (isAnswered) {
      if (key === 'enter') nextQuestion();
      return;
    }

    const input = $('calc-input-field');
    if (!input) return;

    if (key === 'clear') {
      input.value = '';
    } else if (key === 'backspace') {
      input.value = input.value.slice(0, -1);
    } else if (key === 'enter') {
      submitPromptAnswer();
    } else if (key === '-') {
      if (input.value.startsWith('-')) input.value = input.value.slice(1);
      else input.value = '-' + input.value;
    } else {
      input.value += key;
    }
    input.focus();
  }

  function handleGlobalKeydown(e) {
    // 1. Setup View Hotkeys
    if (setupView.style.display !== 'none') {
      if (e.key === 'Enter') {
        e.preventDefault();
        startDrill();
      }
      return;
    }

    // 2. Result View Hotkeys
    if (resultView.style.display !== 'none') {
      if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        startDrill();
      }
      return;
    }

    // 3. Drill View Hotkeys
    if (drillView.style.display !== 'none') {
      // If feedback banner is visible, Enter or Space advances
      if (isAnswered) {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          nextQuestion();
        }
        return;
      }

      // Fraction comparison shortcuts
      if (currentQ && currentQ.type === 'fraction') {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft' || e.key === '1') {
          e.preventDefault();
          chooseFraction('A');
        } else if (e.key === 'b' || e.key === 'B' || e.key === 'ArrowRight' || e.key === '2') {
          e.preventDefault();
          chooseFraction('B');
        }
      }
    }
  }

  // --- DRILL FINISH & REPORT ---
  function finishDrill(aborted = false) {
    clearInterval(lapTimerInterval);
    clearInterval(totalTimerInterval);
    if (timeLimitTimeout) clearTimeout(timeLimitTimeout);

    if (aborted && sessionHistory.length === 0) {
      showView('setup');
      return;
    }

    showView('result');
    renderResultStats(aborted);
  }

  function renderResultStats(aborted) {
    const totalQ = sessionHistory.length;
    const correctCount = sessionHistory.filter(h => h.isCorrect).length;
    const wrongCount = totalQ - correctCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

    const totalTimeSec = sessionHistory.reduce((acc, h) => acc + h.time, 0);
    const avgTime = totalQ > 0 ? (totalTimeSec / totalQ).toFixed(1) : '0.0';

    // Summary numbers
    $('res-accuracy-val').textContent = `${accuracy}%`;
    $('res-correct-ratio').textContent = `${correctCount} / ${totalQ} 문항 성공`;
    $('res-avg-time-val').textContent = `${avgTime}초`;
    $('res-max-streak-val').textContent = `🔥 ${maxStreak}연속`;

    const m = String(Math.floor(totalTimeSec / 60)).padStart(2, '0');
    const s = String(Math.floor(totalTimeSec % 60)).padStart(2, '0');
    $('res-total-time-val').textContent = `${m}:${s}`;

    // Speed rank badge
    const speedVal = parseFloat(avgTime);
    let speedRank = '⚡ 번개 페이스 (상위 5%)';
    if (speedVal > 7.0) speedRank = '🐢 꼼꼼한 페이스';
    else if (speedVal > 4.5) speedRank = '🏃 실전 평균 페이스';
    $('res-speed-rank').textContent = speedRank;

    // Retry wrong button visibility
    const retryWrongBtn = $('btn-retry-wrong');
    if (wrongCount > 0) {
      retryWrongBtn.style.display = 'inline-block';
      $('wrong-retry-count').textContent = wrongCount;
    } else {
      retryWrongBtn.style.display = 'none';
    }

    // Counts for filter pills
    $('count-all').textContent = totalQ;
    $('count-wrong').textContent = wrongCount;

    // Render list
    renderHistoryList('all');
  }

  function renderHistoryList(filter) {
    const list = $('drill-history-list');
    list.innerHTML = '';

    const filtered = sessionHistory.filter(h => {
      if (filter === 'wrong') return !h.isCorrect;
      return true;
    });

    if (!filtered.length) {
      list.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#64748b;">해당하는 문항이 없습니다.</div>';
      return;
    }

    filtered.forEach((h, idx) => {
      const row = document.createElement('div');
      row.className = `history-row ${h.isCorrect ? 'correct' : 'wrong'}`;
      
      let promptSummary = '';
      if (h.question.type === 'fraction') {
        promptSummary = `A: ${h.question.cardA.num}/${h.question.cardA.den} vs B: ${h.question.cardB.num}/${h.question.cardB.den} → 정답: [${h.question.correct}]`;
      } else {
        promptSummary = `${h.question.expression} → 정답: ${h.question.correct}${h.question.unit || ''}`;
      }

      row.innerHTML = `
        <div class="hist-left">
          <span class="hist-status-icon">${h.isCorrect ? '✓' : '✕'}</span>
          <span class="hist-q-prompt">${promptSummary}</span>
        </div>
        <div class="hist-right">
          <span>선택: ${h.userAnswer}${h.question.unit || ''}</span>
          <span>⏱️ ${h.time}초</span>
        </div>
      `;
      list.appendChild(row);
    });
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
