/**
 * SKCT Online Exam Application Engine
 * Layout: 75% Question Screen, 25% Side Panel (Top: Notepad, Bottom: Calculator)
 */

(function () {
  'use strict';

  // --- STATE ---
  let appData = null;
  let activeSection = null;
  let currentQIndex = 0;
  let isReviewMode = false;

  // Persistence State
  let userAnswers = {};      // { [qId]: number (1-5) }
  let userFlags = {};        // { [qId]: boolean }
  let questionMemos = {};    // { [qId]: string }
  let globalMemo = '';
  let activeMemoTab = 'question'; // 'question' | 'global'
  let memoFontSize = 14;

  // Timer State
  let timerSeconds = 25 * 60;
  let timerInterval = null;
  let isTimerRunning = false;
  let initialTimerSeconds = 25 * 60;
  let elapsedTime = 0;
  let questionTimes = {};
  let lastClockTick = 0;

  // Zoom State
  let zoomLevel = 1.0;

  // Calculator State
  let calcExpr = '';
  let calcCurr = '0';
  let calcPrev = null;
  let calcOp = null;
  let calcMemory = 0;
  let calcNewInput = true;
  let calcHistory = [];

  // DOM Elements
  const els = {
    sectionSelect: document.getElementById('section-select'),
    currentQNum: document.getElementById('current-q-num'),
    totalQNum: document.getElementById('total-q-num'),
    timerDisplay: document.getElementById('timer-display'),
    timerToggleBtn: document.getElementById('timer-toggle-btn'),
    timerResetBtn: document.getElementById('timer-reset-btn'),
    flagBtn: document.getElementById('flag-btn'),
    omrDrawerToggle: document.getElementById('omr-drawer-toggle'),
    omrAnsweredCount: document.getElementById('omr-answered-count'),
    omrTotalCount: document.getElementById('omr-total-count'),
    submitExamBtn: document.getElementById('submit-exam-btn'),

    // Question
    qCategoryText: document.getElementById('q-category-text'),
    zoomOutBtn: document.getElementById('zoom-out-btn'),
    zoomInBtn: document.getElementById('zoom-in-btn'),
    zoomFitWidth: document.getElementById('zoom-fit-width'),
    zoomFitPage: document.getElementById('zoom-fit-page'),
    zoomLevelText: document.getElementById('zoom-level-text'),
    reviewStatusTag: document.getElementById('review-status-tag'),
    reviewStatusBadge: document.getElementById('review-status-badge'),
    qViewport: document.getElementById('q-viewport'),
    qImageContainer: document.getElementById('q-image-container'),
    questionImage: document.getElementById('question-image'),

    // OMR & Nav
    optBtns: document.querySelectorAll('.opt-btn'),
    clearAnsBtn: document.getElementById('clear-ans-btn'),
    prevQBtn: document.getElementById('prev-q-btn'),
    nextQBtn: document.getElementById('next-q-btn'),
    viewSolBtn: document.getElementById('view-sol-btn'),

    // Notepad
    tabQMemo: document.getElementById('tab-q-memo'),
    tabGlobalMemo: document.getElementById('tab-global-memo'),
    memoQNum: document.getElementById('memo-q-num'),
    notepadTextarea: document.getElementById('notepad-textarea'),
    notepadFontDec: document.getElementById('notepad-font-dec'),
    notepadFontInc: document.getElementById('notepad-font-inc'),
    notepadCopyBtn: document.getElementById('notepad-copy-btn'),
    notepadClearBtn: document.getElementById('notepad-clear-btn'),
    notepadCharCount: document.getElementById('notepad-char-count'),
    notepadSaveIndicator: document.getElementById('notepad-save-indicator'),

    // Calculator
    calcExprEl: document.getElementById('calc-expression'),
    calcScreenEl: document.getElementById('calc-screen'),
    calcHistoryToggle: document.getElementById('calc-history-toggle'),
    calcClearHistory: document.getElementById('calc-clear-history'),
    calcHistoryDrawer: document.getElementById('calc-history-drawer'),
    calcHistoryList: document.getElementById('calc-history-list'),

    // Modals
    omrDrawer: document.getElementById('omr-drawer'),
    closeOmrBtn: document.getElementById('close-omr-btn'),
    omrGrid: document.getElementById('omr-grid'),
    omrSubmitBtn: document.getElementById('omr-submit-btn'),

    scoreModal: document.getElementById('score-modal'),
    closeScoreModalBtn: document.getElementById('close-score-modal-btn'),
    resScoreVal: document.getElementById('res-score-val'),
    resCorrectCount: document.getElementById('res-correct-count'),
    resWrongCount: document.getElementById('res-wrong-count'),
    resUnansweredCount: document.getElementById('res-unanswered-count'),
    resAccuracyRate: document.getElementById('res-accuracy-rate'),
    resTimeSpent: document.getElementById('res-time-spent'),
    scoreReviewGrid: document.getElementById('score-review-grid'),
    btnReviewExam: document.getElementById('btn-review-exam'),
    btnRetryExam: document.getElementById('btn-retry-exam'),

    solutionModal: document.getElementById('solution-modal'),
    closeSolModalBtn: document.getElementById('close-sol-modal-btn'),
    closeSolBtn: document.getElementById('close-sol-btn'),
    solModalTitle: document.getElementById('sol-modal-title'),
    solCorrectNum: document.getElementById('sol-correct-num'),
    solCategoryName: document.getElementById('sol-category-name'),
    solutionImage: document.getElementById('solution-image')
  };

  // --- INITIALIZATION ---
  function init() {
    loadPersistence();

    if (typeof SKCT_DATA !== 'undefined') {
      // Worksheets contain several exercises per page and cannot be scored as MCQs.
      const objectiveSections = SKCT_DATA.sections.filter(s => s.id !== 'math');
      appData = { ...SKCT_DATA, sections: objectiveSections,
        total_questions: objectiveSections.reduce((n, s) => n + s.questions.length, 0) };
    } else {
      console.error('SKCT_DATA not loaded!');
      return;
    }

    populateSections();
    bindEvents();
    bindKeyboardHotkeys();
    initCalculator();

    // Select default section (언어이해 or saved)
    const savedSecId = localStorage.getItem('skct_current_section') || 'lang';
    switchSection(savedSecId);
  }

  // --- PERSISTENCE ---
  function loadPersistence() {
    try {
      userAnswers = JSON.parse(localStorage.getItem('skct_answers') || '{}');
      userFlags = JSON.parse(localStorage.getItem('skct_flags') || '{}');
      questionMemos = JSON.parse(localStorage.getItem('skct_q_memos') || '{}');
      globalMemo = localStorage.getItem('skct_global_memo') || '';
      calcHistory = JSON.parse(localStorage.getItem('skct_calc_history') || '[]');
      questionTimes = JSON.parse(localStorage.getItem('skct_question_times') || '{}');
    } catch (e) {
      console.warn('Storage read error:', e);
    }
  }

  function savePersistence() {
    try {
      localStorage.setItem('skct_answers', JSON.stringify(userAnswers));
      localStorage.setItem('skct_flags', JSON.stringify(userFlags));
      localStorage.setItem('skct_q_memos', JSON.stringify(questionMemos));
      localStorage.setItem('skct_global_memo', globalMemo);
      localStorage.setItem('skct_calc_history', JSON.stringify(calcHistory));
      localStorage.setItem('skct_question_times', JSON.stringify(questionTimes));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  // --- SECTIONS ---
  function populateSections() {
    els.sectionSelect.innerHTML = '';

    // Add individual sections
    appData.sections.forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec.id;
      opt.textContent = `${sec.name} (${sec.question_count}문항 / ${sec.time_limit_minutes}분)`;
      els.sectionSelect.appendChild(opt);
    });

    // Add full exam option
    const fullOpt = document.createElement('option');
    fullOpt.value = 'all';
    fullOpt.textContent = `🏆 전체 통합 실전 모의고사 (${appData.total_questions}문항)`;
    els.sectionSelect.appendChild(fullOpt);
  }

  function switchSection(secId) {
    pauseTimer();
    if (secId === 'all') {
      // Flatten all questions
      let allQuestions = [];
      appData.sections.forEach(sec => {
        allQuestions = allQuestions.concat(sec.questions);
      });
      activeSection = {
        id: 'all',
        name: '전체 통합 실전 모의고사',
        description: '전과목 통합 실전 모의고사',
        question_count: allQuestions.length,
        time_limit_minutes: 90,
        questions: allQuestions
      };
    } else {
      activeSection = appData.sections.find(s => s.id === secId) || appData.sections[0];
    }

    localStorage.setItem('skct_current_section', activeSection.id);
    els.sectionSelect.value = activeSection.id;

    currentQIndex = 0;
    isReviewMode = false;

    // Reset timer for section
    resetTimer(activeSection.time_limit_minutes * 60);

    renderQuestion();
    updateOMRDrawer();
  }

  // --- QUESTION RENDERING ---
  function renderQuestion() {
    if (!activeSection || !activeSection.questions.length) return;

    const q = activeSection.questions[currentQIndex];
    if (!q) return;

    // Numbers & Category
    els.currentQNum.textContent = String(currentQIndex + 1).padStart(2, '0');
    els.totalQNum.textContent = activeSection.questions.length;
    els.memoQNum.textContent = currentQIndex + 1;
    els.qCategoryText.textContent = `${q.section} · ${q.category || ''}`;

    // Question Image
    els.questionImage.src = q.image;

    // Update Answer selection
    const chosen = userAnswers[q.id];
    els.optBtns.forEach(btn => {
      const val = parseInt(btn.getAttribute('data-val'), 10);
      btn.classList.toggle('selected', chosen === val);
    });

    // Flag status
    const isFlagged = !!userFlags[q.id];
    els.flagBtn.classList.toggle('active', isFlagged);

    // Nav buttons disabled state
    els.prevQBtn.disabled = currentQIndex === 0;
    els.nextQBtn.disabled = currentQIndex === activeSection.questions.length - 1;

    // Notepad content
    updateNotepadView();

    // Review Mode status
    if (isReviewMode) {
      els.reviewStatusTag.style.display = 'block';
      const isCorrect = chosen === q.answer;
      els.reviewStatusBadge.className = `badge-result ${isCorrect ? 'correct' : 'wrong'}`;
      els.reviewStatusBadge.textContent = isCorrect
        ? `✓ 정답 (선택: ${chosen}번)`
        : `✕ 오답 (선택: ${chosen ? chosen + '번' : '미응답'} / 정답: ${q.answer}번)`;
      els.viewSolBtn.style.display = 'inline-flex';
    } else {
      els.reviewStatusTag.style.display = 'none';
      els.viewSolBtn.style.display = 'none';
    }

    updateOMRCount();
    updateQuestionClock();
  }

  function pickAnswer(val) {
    if (!activeSection || isReviewMode) return;
    const q = activeSection.questions[currentQIndex];
    if (!q) return;

    userAnswers[q.id] = val;
    savePersistence();
    renderQuestion();
    updateOMRDrawer();
  }

  function clearAnswer() {
    if (!activeSection || isReviewMode) return;
    const q = activeSection.questions[currentQIndex];
    if (!q) return;

    delete userAnswers[q.id];
    savePersistence();
    renderQuestion();
    updateOMRDrawer();
  }

  function toggleFlag() {
    if (!activeSection) return;
    const q = activeSection.questions[currentQIndex];
    if (!q) return;

    userFlags[q.id] = !userFlags[q.id];
    savePersistence();
    renderQuestion();
    updateOMRDrawer();
  }

  function nextQuestion() {
    accrueTime();
    if (currentQIndex < activeSection.questions.length - 1) {
      currentQIndex++;
      renderQuestion();
      els.qViewport.scrollTop = 0;
    }
  }

  function prevQuestion() {
    accrueTime();
    if (currentQIndex > 0) {
      currentQIndex--;
      renderQuestion();
      els.qViewport.scrollTop = 0;
    }
  }

  function jumpToQuestion(idx) {
    accrueTime();
    if (idx >= 0 && idx < activeSection.questions.length) {
      currentQIndex = idx;
      renderQuestion();
      els.qViewport.scrollTop = 0;
    }
  }

  // --- ZOOM CONTROLS ---
  function setZoom(level) {
    zoomLevel = Math.max(0.5, Math.min(2.5, level));
    els.qImageContainer.style.transform = `scale(${zoomLevel})`;
    els.zoomLevelText.textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  // --- TIMER ---
  function formatQuestionTime(seconds) {
    const n = Math.floor(seconds || 0);
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  }

  function updateQuestionClock() {
    const q = activeSection?.questions[currentQIndex];
    const clock = document.getElementById('exam-question-time');
    if (clock && q) clock.textContent = `이 문제 누적 ${formatQuestionTime(questionTimes[q.id])}`;
  }

  function accrueTime() {
    if (!isTimerRunning || isReviewMode || !activeSection) return;
    const now = performance.now();
    const delta = Math.min(Math.max(0, (now - lastClockTick) / 1000), timerSeconds);
    lastClockTick = now;
    const q = activeSection.questions[currentQIndex];
    questionTimes[q.id] = (questionTimes[q.id] || 0) + delta;
    elapsedTime += delta;
    timerSeconds = Math.max(0, timerSeconds - delta);
    updateQuestionClock();
  }

  function startTimer() {
    if (isReviewMode || timerSeconds <= 0) return;
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = true;
    lastClockTick = performance.now();
    els.timerToggleBtn.textContent = '⏸️';

    timerInterval = setInterval(() => {
      accrueTime();
      updateTimerDisplay();
      savePersistence();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        els.timerToggleBtn.textContent = '▶️';
        submitAndScore();
      }
    }, 1000);
  }

  function pauseTimer() {
    accrueTime();
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = false;
    els.timerToggleBtn.textContent = '▶️';
  }

  function resetTimer(seconds) {
    pauseTimer();
    initialTimerSeconds = seconds;
    timerSeconds = seconds;
    elapsedTime = 0;
    updateTimerDisplay();
    startTimer();
  }

  function updateTimerDisplay() {
    const remaining = Math.ceil(timerSeconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    els.timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timerSeconds < 300) { // under 5 min
      els.timerDisplay.classList.add('urgent');
    } else {
      els.timerDisplay.classList.remove('urgent');
    }
  }

  // --- NOTEPAD ---
  function updateNotepadView() {
    if (!activeSection) return;
    const q = activeSection.questions[currentQIndex];

    if (activeMemoTab === 'question' && q) {
      els.notepadTextarea.value = questionMemos[q.id] || '';
    } else {
      els.notepadTextarea.value = globalMemo;
    }

    updateNotepadCharCount();
  }

  function updateNotepadCharCount() {
    const len = els.notepadTextarea.value.length;
    els.notepadCharCount.textContent = `${len}자`;
  }

  function handleNotepadInput() {
    const text = els.notepadTextarea.value;
    const q = activeSection.questions[currentQIndex];

    if (activeMemoTab === 'question' && q) {
      questionMemos[q.id] = text;
    } else {
      globalMemo = text;
    }

    updateNotepadCharCount();
    savePersistence();

    els.notepadSaveIndicator.textContent = '💾 저장됨';
  }

  // --- OMR DRAWER & COUNT ---
  function updateOMRCount() {
    if (!activeSection) return;
    let answered = 0;
    activeSection.questions.forEach(q => {
      if (userAnswers[q.id] !== undefined) answered++;
    });

    els.omrAnsweredCount.textContent = answered;
    els.omrTotalCount.textContent = activeSection.questions.length;
  }

  function updateOMRDrawer() {
    if (!activeSection) return;
    els.omrGrid.innerHTML = '';

    activeSection.questions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'omr-item';
      if (idx === currentQIndex) item.classList.add('current');
      if (userFlags[q.id]) item.classList.add('flagged');

      const ans = userAnswers[q.id];
      if (ans !== undefined) {
        item.classList.add('answered');
      }

      item.innerHTML = `
        <span class="omr-item-num">${idx + 1}</span>
        <span class="omr-item-ans">${ans ? `[${ans}]` : '-'}</span>
      `;

      item.addEventListener('click', () => {
        jumpToQuestion(idx);
        els.omrDrawer.classList.remove('open');
      });

      els.omrGrid.appendChild(item);
    });
  }

  // --- CALCULATOR ENGINE ---
  function initCalculator() {
    renderCalcHistory();
  }

  function updateCalcScreen() {
    els.calcExprEl.textContent = calcExpr || '\u00A0';
    els.calcScreenEl.textContent = calcCurr;
  }

  function calcInputDigit(digit) {
    if (calcNewInput) {
      calcCurr = (digit === '00' || digit === '0') ? '0' : digit;
      calcNewInput = false;
    } else {
      if (digit === '00') {
        if (calcCurr !== '0') calcCurr += '00';
      } else {
        calcCurr = calcCurr === '0' ? digit : calcCurr + digit;
      }
    }
    updateCalcScreen();
  }

  function calcInputDecimal() {
    if (calcNewInput) {
      calcCurr = '0.';
      calcNewInput = false;
    } else if (!calcCurr.includes('.')) {
      calcCurr += '.';
    }
    updateCalcScreen();
  }

  function calcBackspace() {
    if (calcNewInput) return;
    calcCurr = calcCurr.slice(0, -1);
    if (calcCurr === '' || calcCurr === '-') calcCurr = '0';
    updateCalcScreen();
  }

  function calcPerformOp(nextOp) {
    const inputVal = parseFloat(calcCurr);

    if (calcOp && !calcNewInput) {
      calcEvaluate();
    } else {
      calcPrev = inputVal;
    }

    const opSymbols = { add: '+', sub: '-', mult: '×', div: '÷' };
    calcOp = nextOp;
    calcExpr = `${calcPrev} ${opSymbols[nextOp] || nextOp}`;
    calcNewInput = true;
    updateCalcScreen();
  }

  function calcEvaluate() {
    if (calcOp === null || calcPrev === null) return;
    const current = parseFloat(calcCurr);
    let res = 0;

    switch (calcOp) {
      case 'add': res = calcPrev + current; break;
      case 'sub': res = calcPrev - current; break;
      case 'mult': res = calcPrev * current; break;
      case 'div': res = current === 0 ? 'Error' : calcPrev / current; break;
      default: res = current;
    }

    if (typeof res === 'number') {
      // round to 8 decimals to avoid floating point anomalies
      res = Math.round(res * 100000000) / 100000000;
    }

    const opSymbols = { add: '+', sub: '-', mult: '×', div: '÷' };
    const fullExpr = `${calcPrev} ${opSymbols[calcOp]} ${current} =`;
    addCalcHistory(fullExpr, res);

    calcExpr = fullExpr;
    calcCurr = String(res);
    calcPrev = res;
    calcOp = null;
    calcNewInput = true;
    updateCalcScreen();
  }

  function calcSpecial(action) {
    let val = parseFloat(calcCurr);
    if (isNaN(val)) return;

    let res = val;
    let desc = '';

    switch (action) {
      case 'sqr':
        res = val * val;
        desc = `sqr(${val})`;
        break;
      case 'sqrt':
        if (val < 0) { res = 'Error'; } else { res = Math.sqrt(val); }
        desc = `√(${val})`;
        break;
      case 'recip':
        if (val === 0) { res = 'Error'; } else { res = 1 / val; }
        desc = `1/(${val})`;
        break;
      case 'neg':
        res = -val;
        break;
      case 'pct':
        res = val / 100;
        desc = `${val}%`;
        break;
    }

    if (typeof res === 'number') {
      res = Math.round(res * 100000000) / 100000000;
    }

    if (desc) addCalcHistory(desc + ' =', res);
    calcCurr = String(res);
    calcNewInput = true;
    updateCalcScreen();
  }

  function calcClear(all = true) {
    calcCurr = '0';
    calcNewInput = true;
    if (all) {
      calcPrev = null;
      calcOp = null;
      calcExpr = '';
    }
    updateCalcScreen();
  }

  function calcMemoryOp(op) {
    const val = parseFloat(calcCurr);
    switch (op) {
      case 'mc': calcMemory = 0; break;
      case 'mr':
        calcCurr = String(calcMemory);
        calcNewInput = true;
        break;
      case 'm-plus': calcMemory += isNaN(val) ? 0 : val; break;
      case 'm-minus': calcMemory -= isNaN(val) ? 0 : val; break;
    }
    updateCalcScreen();
  }

  function addCalcHistory(expr, result) {
    calcHistory.unshift({ expr, result, time: new Date().toLocaleTimeString() });
    if (calcHistory.length > 50) calcHistory.pop();
    savePersistence();
    renderCalcHistory();
  }

  function renderCalcHistory() {
    if (!calcHistory.length) {
      els.calcHistoryList.innerHTML = '<div class="empty-history">계산 기록이 없습니다.</div>';
      return;
    }

    els.calcHistoryList.innerHTML = '';
    calcHistory.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `
        <div class="hist-expr">${item.expr}</div>
        <div class="hist-res">${item.result}</div>
      `;
      row.addEventListener('click', () => {
        calcCurr = String(item.result);
        calcNewInput = true;
        updateCalcScreen();
        els.calcHistoryDrawer.classList.remove('open');
      });
      els.calcHistoryList.appendChild(row);
    });
  }

  // --- AUTO-GRADING & SCORING ---
  function submitAndScore() {
    if (!activeSection) return;
    pauseTimer();

    let total = activeSection.questions.length;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    activeSection.questions.forEach(q => {
      const chosen = userAnswers[q.id];
      if (chosen === undefined) {
        unanswered++;
      } else if (chosen === q.answer) {
        correct++;
      } else {
        wrong++;
      }
    });

    const score = Math.round((correct / total) * 100);
    const answeredCount = correct + wrong;
    const accuracy = answeredCount > 0 ? ((correct / answeredCount) * 100).toFixed(1) + '%' : '0.0%';

    const mins = Math.floor(elapsedTime / 60);
    const secs = Math.floor(elapsedTime % 60);
    const timeSpentStr = `${mins}분 ${secs}초`;

    // Populate Modal
    els.resScoreVal.textContent = score;
    els.resCorrectCount.textContent = correct;
    els.resWrongCount.textContent = wrong;
    els.resUnansweredCount.textContent = unanswered;
    els.resAccuracyRate.textContent = accuracy;
    els.resTimeSpent.textContent = timeSpentStr;

    renderScoreReviewGrid('all');
    els.scoreModal.classList.add('open');

    isReviewMode = true;
    pauseTimer();
    renderQuestion();
  }

  function renderScoreReviewGrid(filter = 'all') {
    els.scoreReviewGrid.innerHTML = '';

    activeSection.questions.forEach((q, idx) => {
      const chosen = userAnswers[q.id];
      const isFlagged = !!userFlags[q.id];
      let status = 'unanswered';
      let icon = '－';

      if (chosen !== undefined) {
        if (chosen === q.answer) {
          status = 'correct';
          icon = '✓';
        } else {
          status = 'wrong';
          icon = '✕';
        }
      }

      if (filter === 'wrong' && status !== 'wrong') return;
      if (filter === 'flagged' && !isFlagged) return;

      const card = document.createElement('div');
      card.className = `res-q-card ${status}`;
      card.innerHTML = `
        <div class="res-q-header">
          <span>문제 ${idx + 1}</span>
          <span class="res-status-icon">${icon}</span>
        </div>
        <div class="res-q-answers">
          <span>선택: ${chosen ? chosen + '번' : '-'}</span>
          <span>정답: ${q.answer}번</span>
        </div>
        <div class="res-q-time">누적 풀이 ${formatQuestionTime(questionTimes[q.id])}</div>
      `;

      card.addEventListener('click', () => {
        els.scoreModal.classList.remove('open');
        jumpToQuestion(idx);
      });

      els.scoreReviewGrid.appendChild(card);
    });
  }

  function showSolutionModal() {
    if (!activeSection) return;
    const q = activeSection.questions[currentQIndex];
    if (!q) return;

    els.solModalTitle.textContent = `📖 ${q.title} 상세 해설`;
    els.solCorrectNum.textContent = `정답 ${q.answer}번`;
    els.solCategoryName.textContent = `${q.section} (${q.category || ''})`;

    if (q.solution_image) {
      els.solutionImage.src = q.solution_image;
      els.solutionImage.style.display = 'block';
    } else {
      els.solutionImage.style.display = 'none';
    }

    els.solutionModal.classList.add('open');
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    // Section Select
    els.sectionSelect.addEventListener('change', e => {
      switchSection(e.target.value);
    });

    // OMR Choice Buttons
    els.optBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        pickAnswer(val);
      });
    });

    els.clearAnsBtn.addEventListener('click', clearAnswer);

    // Navigation
    els.prevQBtn.addEventListener('click', prevQuestion);
    els.nextQBtn.addEventListener('click', nextQuestion);
    els.flagBtn.addEventListener('click', toggleFlag);
    els.viewSolBtn.addEventListener('click', showSolutionModal);

    // Zoom
    els.zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + 0.15));
    els.zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - 0.15));
    els.zoomFitWidth.addEventListener('click', () => {
      const containerWidth = els.qViewport.clientWidth - 48;
      const targetWidth = 900;
      setZoom(containerWidth / targetWidth);
    });
    els.zoomFitPage.addEventListener('click', () => setZoom(1.0));

    // Timer
    els.timerToggleBtn.addEventListener('click', () => {
      if (isTimerRunning) pauseTimer();
      else startTimer();
    });
    els.timerResetBtn.addEventListener('click', () => {
      if (confirm('타이머를 초기화하시겠습니까?')) {
        resetTimer(activeSection.time_limit_minutes * 60);
      }
    });

    // Submit
    els.submitExamBtn.addEventListener('click', () => {
      let unansweredCount = 0;
      activeSection.questions.forEach(q => {
        if (userAnswers[q.id] === undefined) unansweredCount++;
      });

      let msg = '시험을 제출하고 자동 채점을 진행하시겠습니까?';
      if (unansweredCount > 0) {
        msg = `아직 풀지 않은 문제가 ${unansweredCount}문항 있습니다.\n정말 제출하고 채점하시겠습니까?`;
      }
      if (confirm(msg)) {
        submitAndScore();
      }
    });

    els.omrSubmitBtn.addEventListener('click', () => {
      els.omrDrawer.classList.remove('open');
      submitAndScore();
    });

    // OMR Drawer Toggle
    els.omrDrawerToggle.addEventListener('click', () => {
      updateOMRDrawer();
      els.omrDrawer.classList.toggle('open');
    });
    els.closeOmrBtn.addEventListener('click', () => {
      els.omrDrawer.classList.remove('open');
    });

    // Notepad Tabs
    els.tabQMemo.addEventListener('click', () => {
      activeMemoTab = 'question';
      els.tabQMemo.classList.add('active');
      els.tabGlobalMemo.classList.remove('active');
      updateNotepadView();
    });

    els.tabGlobalMemo.addEventListener('click', () => {
      activeMemoTab = 'global';
      els.tabGlobalMemo.classList.add('active');
      els.tabQMemo.classList.remove('active');
      updateNotepadView();
    });

    // Notepad Tools
    els.notepadTextarea.addEventListener('input', handleNotepadInput);

    els.notepadFontInc.addEventListener('click', () => {
      if (memoFontSize < 24) {
        memoFontSize += 2;
        els.notepadTextarea.style.fontSize = `${memoFontSize}px`;
      }
    });

    els.notepadFontDec.addEventListener('click', () => {
      if (memoFontSize > 10) {
        memoFontSize -= 2;
        els.notepadTextarea.style.fontSize = `${memoFontSize}px`;
      }
    });

    els.notepadCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(els.notepadTextarea.value).then(() => {
        alert('메모 내용이 클립보드에 복사되었습니다.');
      });
    });

    els.notepadClearBtn.addEventListener('click', () => {
      if (confirm('현재 작성된 메모를 모두 지우시겠습니까?')) {
        els.notepadTextarea.value = '';
        handleNotepadInput();
      }
    });

    // Calculator Keypad
    document.querySelectorAll('.calc-keypad .c-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        const action = btn.getAttribute('data-action');

        if (val !== null) {
          if (val === '.') calcInputDecimal();
          else calcInputDigit(val);
        } else if (action) {
          switch (action) {
            case 'add':
            case 'sub':
            case 'mult':
            case 'div':
              calcPerformOp(action);
              break;
            case 'equals':
              calcEvaluate();
              break;
            case 'c':
              calcClear(true);
              break;
            case 'ce':
              calcClear(false);
              break;
            case 'backspace':
              calcBackspace();
              break;
            case 'mc':
            case 'mr':
            case 'm-plus':
            case 'm-minus':
              calcMemoryOp(action);
              break;
            case 'sqr':
            case 'sqrt':
            case 'recip':
            case 'neg':
            case 'pct':
              calcSpecial(action);
              break;
          }
        }
      });
    });

    els.calcHistoryToggle.addEventListener('click', () => {
      els.calcHistoryDrawer.classList.toggle('open');
    });

    els.calcClearHistory.addEventListener('click', () => {
      if (confirm('계산 기록을 모두 삭제하시겠습니까?')) {
        calcHistory = [];
        savePersistence();
        renderCalcHistory();
      }
    });

    // Score Modal Filters & Actions
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderScoreReviewGrid(btn.getAttribute('data-filter'));
      });
    });

    els.closeScoreModalBtn.addEventListener('click', () => {
      els.scoreModal.classList.remove('open');
    });

    els.btnReviewExam.addEventListener('click', () => {
      els.scoreModal.classList.remove('open');
      isReviewMode = true;
      jumpToQuestion(0);
    });

    els.btnRetryExam.addEventListener('click', () => {
      if (confirm('기존 답안을 모두 초기화하고 처음부터 다시 응시하시겠습니까?')) {
        activeSection.questions.forEach(q => {
          delete userAnswers[q.id];
          delete userFlags[q.id];
          delete questionTimes[q.id];
        });
        savePersistence();
        isReviewMode = false;
        els.scoreModal.classList.remove('open');
        resetTimer(activeSection.time_limit_minutes * 60);
        renderQuestion();
      }
    });

    // Solution Modal
    els.closeSolModalBtn.addEventListener('click', () => {
      els.solutionModal.classList.remove('open');
    });
    els.closeSolBtn.addEventListener('click', () => {
      els.solutionModal.classList.remove('open');
    });
  }

  // --- KEYBOARD SHORTCUTS & CALCULATOR INPUT ---
  function highlightCalcKey(selector) {
    const btn = document.querySelector(`.calc-keypad [${selector}]`);
    if (btn) {
      btn.classList.add('key-active');
      setTimeout(() => btn.classList.remove('key-active'), 120);
    }
  }

  function bindKeyboardHotkeys() {
    // Focus tracking for calculator container
    const calcContainer = document.getElementById('calculator-container');
    let isCalcFocused = false;

    if (calcContainer) {
      calcContainer.addEventListener('click', () => {
        isCalcFocused = true;
        calcContainer.classList.add('calc-active');
      });
    }

    document.addEventListener('click', e => {
      if (calcContainer && !calcContainer.contains(e.target)) {
        isCalcFocused = false;
        calcContainer.classList.remove('calc-active');
      }
    });

    window.addEventListener('keydown', e => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const inTextarea = (activeTag === 'textarea' || activeTag === 'input');

      // If user is actively typing in the notepad textarea, don't intercept normal typing
      if (inTextarea) {
        return;
      }

      // 1. Numeric Keypad (숫자패드: Numpad0~Numpad9, NumpadDecimal, NumpadAdd, NumpadSubtract, NumpadMultiply, NumpadDivide, NumpadEnter)
      if (e.code && e.code.startsWith('Numpad')) {
        e.preventDefault();

        // Numpad Digits (Numpad0 ~ Numpad9)
        if (/^Numpad[0-9]$/.test(e.code)) {
          const digit = e.code.replace('Numpad', '');
          calcInputDigit(digit);
          highlightCalcKey(`data-val="${digit}"`);
          return;
        }

        // Numpad Decimal
        if (e.code === 'NumpadDecimal') {
          calcInputDecimal();
          highlightCalcKey('data-val="."');
          return;
        }

        // Numpad Operators (+ - * /)
        if (e.code === 'NumpadAdd') {
          calcPerformOp('add');
          highlightCalcKey('data-action="add"');
          return;
        }
        if (e.code === 'NumpadSubtract') {
          calcPerformOp('sub');
          highlightCalcKey('data-action="sub"');
          return;
        }
        if (e.code === 'NumpadMultiply') {
          calcPerformOp('mult');
          highlightCalcKey('data-action="mult"');
          return;
        }
        if (e.code === 'NumpadDivide') {
          calcPerformOp('div');
          highlightCalcKey('data-action="div"');
          return;
        }

        // Numpad Enter -> Calculate & Show Result!
        if (e.code === 'NumpadEnter') {
          calcEvaluate();
          highlightCalcKey('data-action="equals"');
          return;
        }
      }

      // 2. Math operators (+, -, *, /, %) or Enter / Equal (from main keyboard or numpad)
      if (e.key === '+' || e.key === 'Add') {
        e.preventDefault();
        calcPerformOp('add');
        highlightCalcKey('data-action="add"');
        return;
      }
      if (e.key === '-' || e.key === 'Subtract') {
        e.preventDefault();
        calcPerformOp('sub');
        highlightCalcKey('data-action="sub"');
        return;
      }
      if (e.key === '*' || e.key === 'Multiply') {
        e.preventDefault();
        calcPerformOp('mult');
        highlightCalcKey('data-action="mult"');
        return;
      }
      if (e.key === '/' || e.key === 'Divide') {
        e.preventDefault();
        calcPerformOp('div');
        highlightCalcKey('data-action="div"');
        return;
      }
      if (e.key === '%') {
        e.preventDefault();
        calcSpecial('pct');
        highlightCalcKey('data-action="pct"');
        return;
      }
      // Enter or '=' evaluates and displays the result
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calcEvaluate();
        highlightCalcKey('data-action="equals"');
        return;
      }

      // 3. Calculator Clear (Escape) or Backspace
      if (e.key === 'Escape') {
        e.preventDefault();
        calcClear(true);
        highlightCalcKey('data-action="c"');
        return;
      }

      // If calculator container was clicked/active, top-row digits & backspace also go to calculator
      if (isCalcFocused) {
        if (e.code && e.code.startsWith('Digit')) {
          e.preventDefault();
          const digit = e.code.replace('Digit', '');
          calcInputDigit(digit);
          highlightCalcKey(`data-val="${digit}"`);
          return;
        }
        if (e.key === '.') {
          e.preventDefault();
          calcInputDecimal();
          highlightCalcKey('data-val="."');
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          calcBackspace();
          highlightCalcKey('data-action="backspace"');
          return;
        }
      }

      // 4. Question Screen Hotkeys (when calculator is NOT specifically focused)
      // Top-row numbers 1 ~ 5 for question answer marking
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        e.preventDefault();
        const num = parseInt(e.code.replace('Digit', ''), 10);
        pickAnswer(num);
        return;
      }

      // Space or Delete for clearing marked answer
      if (e.key === ' ' || e.key === 'Delete') {
        e.preventDefault();
        clearAnswer();
        return;
      }

      // Arrow keys for question navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevQuestion();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextQuestion();
        return;
      }

      // F for bookmark/flag
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFlag();
        return;
      }
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
