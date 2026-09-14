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
  let activeSubQIndex = 0; // Active sub-question index on current page

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
    examQuestionTime: document.getElementById('exam-question-time'),

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
    omrOptionsBar: document.getElementById('omr-options-bar') || document.querySelector('.omr-options-bar'),
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
      appData = SKCT_DATA;
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
      const parseObj = (key) => {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          return (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
        } catch (_) { return {}; }
      };
      userAnswers = parseObj('skct_answers');
      userFlags = parseObj('skct_flags');
      questionMemos = parseObj('skct_q_memos');
      globalMemo = typeof localStorage.getItem('skct_global_memo') === 'string' ? localStorage.getItem('skct_global_memo') : '';
      try {
        const arr = JSON.parse(localStorage.getItem('skct_calc_history') || '[]');
        calcHistory = Array.isArray(arr) ? arr : [];
      } catch (_) { calcHistory = []; }
      questionTimes = parseObj('skct_question_times');
    } catch (e) {
      console.warn('Storage read error:', e);
      userAnswers = {};
      userFlags = {};
      questionMemos = {};
      globalMemo = '';
      calcHistory = [];
      questionTimes = {};
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
    els.qCategoryText.textContent = `${q.section} · ${q.part ? q.part + ' · ' : ''}${q.q_label ? q.q_label : (q.category || '')}`;

    // Question Image
    els.questionImage.src = q.image;

    // Dynamic OMR Options rendering for all subQuestions on this page
    renderOMROptions(q);

    // Flag status
    const isFlagged = !!(userFlags[q.id] || userFlags[q.page_id]);
    els.flagBtn.classList.toggle('active', isFlagged);

    // Nav buttons disabled state
    els.prevQBtn.disabled = currentQIndex === 0;
    els.nextQBtn.disabled = currentQIndex === activeSection.questions.length - 1;

    // Notepad content
    try {
      updateNotepadView();
    } catch (memoErr) {
      console.warn('updateNotepadView error:', memoErr);
    }

    // Drawing canvas update
    try {
      if (window.SKCTPaint && typeof window.SKCTPaint.onQuestionChange === 'function') {
        window.SKCTPaint.onQuestionChange(q.id, currentQIndex + 1);
      }
    } catch (paintErr) {
      console.warn('SKCTPaint onQuestionChange error:', paintErr);
    }

    // Review Mode status
    if (isReviewMode) {
      if (q.is_passage) {
        if (els.reviewStatusTag) els.reviewStatusTag.style.display = 'none';
        if (els.viewSolBtn) els.viewSolBtn.style.display = 'none';
      } else {
        if (els.reviewStatusTag) els.reviewStatusTag.style.display = 'block';
        const subQuestions = q.subQuestions && q.subQuestions.length ? q.subQuestions : [
          { id: q.id, num: q.num, title: `${q.num}번`, answer: q.answer }
        ];
        const allCorrect = subQuestions.every(sq => userAnswers[sq.id] === sq.answer);
        if (els.reviewStatusBadge) {
          els.reviewStatusBadge.className = `badge-result ${allCorrect ? 'correct' : 'wrong'}`;
          if (subQuestions.length === 1) {
            const isCorrect = userAnswers[subQuestions[0].id] === subQuestions[0].answer;
            els.reviewStatusBadge.textContent = isCorrect
              ? `✓ 정답 (${subQuestions[0].answer}번)`
              : `✕ 오답 (정답: ${subQuestions[0].answer}번, 선택: ${userAnswers[subQuestions[0].id] ? userAnswers[subQuestions[0].id] + '번' : '미응답'})`;
          } else {
            els.reviewStatusBadge.textContent = allCorrect
              ? '✓ 전체 정답'
              : '✕ 오답 포함 (하단 확인)';
          }
        }
        if (els.viewSolBtn) els.viewSolBtn.style.display = 'inline-flex';
      }
    } else {
      if (els.reviewStatusTag) els.reviewStatusTag.style.display = 'none';
      if (els.viewSolBtn) els.viewSolBtn.style.display = 'none';
    }

    try {
      updateOMRCount();
    } catch (omrErr) {
      console.warn('updateOMRCount error:', omrErr);
    }
    try {
      updateQuestionClock();
    } catch (clockErr) {
      console.warn('updateQuestionClock error:', clockErr);
    }
  }

  function renderOMROptions(q) {
    if (!els.omrOptionsBar) return;
    els.omrOptionsBar.innerHTML = '';

    if (q.is_passage) {
      els.omrOptionsBar.innerHTML = `
        <div class="passage-info-bar">
          <span class="passage-icon">📖</span>
          <span class="passage-text"><strong>${q.title}</strong> · 본문 지문 페이지입니다. 본문을 정독하신 후 <strong>[다음 문제 ▶]</strong>로 이동하여 문제를 풀고 답안을 마킹하세요.</span>
        </div>
      `;
      return;
    }

    const subQuestions = q.subQuestions && q.subQuestions.length ? q.subQuestions : [
      { id: q.id, num: q.num, title: `${q.num}번`, answer: q.answer }
    ];

    if (activeSubQIndex >= subQuestions.length) {
      activeSubQIndex = 0;
    }

    const isMulti = subQuestions.length > 1;

    subQuestions.forEach((subQ, idx) => {
      const chosen = userAnswers[subQ.id];
      const isSubActive = (idx === activeSubQIndex);
      const isAnswered = chosen !== undefined;

      const group = document.createElement('div');
      group.className = `omr-q-group ${isSubActive ? 'active' : ''}`;
      group.dataset.subIdx = idx;
      group.dataset.qid = subQ.id;

      let reviewBadgeHtml = '';
      if (isReviewMode) {
        const isCorrect = chosen === subQ.answer;
        reviewBadgeHtml = `
          <span class="sub-review-badge ${isCorrect ? 'correct' : 'wrong'}">
            ${isCorrect ? `✓ 정답 (${chosen}번)` : `✕ 정답 ${subQ.answer}번 (선택: ${chosen ? chosen + '번' : '미응답'})`}
          </span>
        `;
      }

      group.innerHTML = `
        <span class="omr-q-badge" title="${subQ.title} (클릭하여 선택)">${subQ.title}</span>
        <div class="options-group">
          ${[1, 2, 3, 4, 5].map(val => `
            <button type="button" class="opt-btn ${chosen === val ? 'selected' : ''}" data-qid="${subQ.id}" data-val="${val}" title="${val}번 마킹">
              <span class="opt-num">${['①', '②', '③', '④', '⑤'][val - 1]}</span>
              ${!isMulti ? `<span class="opt-key">키 ${val}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <button type="button" class="omr-sub-clear-btn" data-qid="${subQ.id}" title="${subQ.title} 선택 취소" ${!isAnswered ? 'disabled' : ''}>✕</button>
        ${reviewBadgeHtml}
      `;

      // Click group to set active
      group.addEventListener('click', (e) => {
        if (e.target.closest('.opt-btn') || e.target.closest('.omr-sub-clear-btn')) return;
        activeSubQIndex = idx;
        updateActiveSubQHighlight();
      });

      // Click option button
      group.querySelectorAll('.opt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isReviewMode) return;
          const val = parseInt(btn.getAttribute('data-val'), 10);
          activeSubQIndex = idx;
          pickAnswer(val, subQ.id);
        });
      });

      // Clear button
      const clearBtn = group.querySelector('.omr-sub-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isReviewMode) return;
          activeSubQIndex = idx;
          clearAnswer(subQ.id);
        });
      }

      els.omrOptionsBar.appendChild(group);
    });
  }

  function updateActiveSubQHighlight() {
    if (!els.omrOptionsBar) return;
    const groups = els.omrOptionsBar.querySelectorAll('.omr-q-group');
    groups.forEach((g, idx) => {
      g.classList.toggle('active', idx === activeSubQIndex);
    });
  }

  function pickAnswer(val, targetQId) {
    if (!activeSection || isReviewMode) return;
    const q = activeSection.questions[currentQIndex];
    if (!q || q.is_passage) return;

    const subQuestions = q.subQuestions && q.subQuestions.length ? q.subQuestions : [
      { id: q.id, num: q.num, title: `${q.num}번`, answer: q.answer }
    ];

    let qid = targetQId;
    if (!qid) {
      if (activeSubQIndex < 0 || activeSubQIndex >= subQuestions.length) {
        activeSubQIndex = 0;
      }
      qid = subQuestions[activeSubQIndex].id;
      // If multiple sub-questions on this page, advance to next
      if (activeSubQIndex < subQuestions.length - 1) {
        activeSubQIndex++;
      }
    }

    userAnswers[qid] = val;
    savePersistence();
    renderQuestion();
    updateOMRDrawer();
  }

  function clearAnswer(targetQId) {
    if (!activeSection || isReviewMode) return;
    const q = activeSection.questions[currentQIndex];
    if (!q || q.is_passage) return;

    const subQuestions = q.subQuestions && q.subQuestions.length ? q.subQuestions : [
      { id: q.id, num: q.num, title: `${q.num}번`, answer: q.answer }
    ];

    let qid = targetQId;
    if (!qid) {
      if (activeSubQIndex < 0 || activeSubQIndex >= subQuestions.length) {
        activeSubQIndex = 0;
      }
      qid = subQuestions[activeSubQIndex].id;
    }

    delete userAnswers[qid];
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
    try {
      accrueTime();
    } catch (e) {
      console.warn('accrueTime error:', e);
    }
    if (activeSection && activeSection.questions && currentQIndex < activeSection.questions.length - 1) {
      currentQIndex++;
      activeSubQIndex = 0;
      try {
        renderQuestion();
      } catch (err) {
        console.error('renderQuestion error in nextQuestion:', err);
      }
      if (els.qViewport) els.qViewport.scrollTop = 0;
    }
  }

  function prevQuestion() {
    try {
      accrueTime();
    } catch (e) {
      console.warn('accrueTime error:', e);
    }
    if (activeSection && activeSection.questions && currentQIndex > 0) {
      currentQIndex--;
      activeSubQIndex = 0;
      try {
        renderQuestion();
      } catch (err) {
        console.error('renderQuestion error in prevQuestion:', err);
      }
      if (els.qViewport) els.qViewport.scrollTop = 0;
    }
  }

  function jumpToQuestion(idx, subIdx = 0) {
    try {
      accrueTime();
    } catch (e) {
      console.warn('accrueTime error:', e);
    }
    if (activeSection && activeSection.questions && idx >= 0 && idx < activeSection.questions.length) {
      currentQIndex = idx;
      activeSubQIndex = subIdx || 0;
      try {
        renderQuestion();
      } catch (err) {
        console.error('renderQuestion error in jumpToQuestion:', err);
      }
      if (els.qViewport) els.qViewport.scrollTop = 0;
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
    try {
      if (!isTimerRunning || isReviewMode || !activeSection || !activeSection.questions) return;
      const now = performance.now();
      const delta = Math.min(Math.max(0, (now - lastClockTick) / 1000), timerSeconds);
      lastClockTick = now;
      const q = activeSection.questions[currentQIndex];
      if (q && q.id) {
        questionTimes[q.id] = (questionTimes[q.id] || 0) + delta;
      }
      elapsedTime += delta;
      timerSeconds = Math.max(0, timerSeconds - delta);
      updateQuestionClock();
    } catch (e) {
      console.warn('accrueTime error:', e);
    }
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
    let total = 0;

    activeSection.questions.forEach(pageQ => {
      if (pageQ.is_passage) return;
      const subQuestions = pageQ.subQuestions && pageQ.subQuestions.length ? pageQ.subQuestions : [
        { id: pageQ.id, num: pageQ.num, title: `${pageQ.num}번`, answer: pageQ.answer }
      ];
      total += subQuestions.length;
      subQuestions.forEach(sq => {
        if (userAnswers[sq.id] !== undefined) answered++;
      });
    });

    els.omrAnsweredCount.textContent = answered;
    els.omrTotalCount.textContent = total;
  }

  function updateOMRDrawer() {
    if (!activeSection) return;
    els.omrGrid.innerHTML = '';

    activeSection.questions.forEach((pageQ, pageIdx) => {
      if (pageQ.is_passage) {
        const item = document.createElement('div');
        item.className = 'omr-item passage-item';
        if (pageIdx === currentQIndex) item.classList.add('current');
        item.innerHTML = `
          <span class="omr-item-num">${pageQ.q_label || '지문'}</span>
          <span class="omr-item-ans">📖</span>
        `;
        item.addEventListener('click', () => {
          jumpToQuestion(pageIdx, 0);
          els.omrDrawer.classList.remove('open');
        });
        els.omrGrid.appendChild(item);
        return;
      }

      const subQuestions = pageQ.subQuestions && pageQ.subQuestions.length ? pageQ.subQuestions : [
        { id: pageQ.id, num: pageQ.num, title: `${pageQ.num}번`, answer: pageQ.answer }
      ];

      subQuestions.forEach((sq, sIdx) => {
        const item = document.createElement('div');
        item.className = 'omr-item';
        if (pageIdx === currentQIndex && sIdx === activeSubQIndex) item.classList.add('current');
        if (userFlags[pageQ.id] || userFlags[sq.id]) item.classList.add('flagged');

        const ans = userAnswers[sq.id];
        if (ans !== undefined) {
          item.classList.add('answered');
        }

        item.innerHTML = `
          <span class="omr-item-num">${sq.title}</span>
          <span class="omr-item-ans">${ans ? `[${ans}]` : '-'}</span>
        `;

        item.addEventListener('click', () => {
          jumpToQuestion(pageIdx, sIdx);
          els.omrDrawer.classList.remove('open');
        });

        els.omrGrid.appendChild(item);
      });
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

    let total = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    activeSection.questions.forEach(p => {
      if (p.is_passage) return;
      const subQuestions = p.subQuestions && p.subQuestions.length ? p.subQuestions : [
        { id: p.id, num: p.num, title: `${p.num}번`, answer: p.answer }
      ];
      total += subQuestions.length;
      subQuestions.forEach(sq => {
        const chosen = userAnswers[sq.id];
        if (chosen === undefined) {
          unanswered++;
        } else if (chosen === sq.answer) {
          correct++;
        } else {
          wrong++;
        }
      });
    });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
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

    activeSection.questions.forEach((p, pageIdx) => {
      if (p.is_passage) return;
      const subQuestions = p.subQuestions && p.subQuestions.length ? p.subQuestions : [
        { id: p.id, num: p.num, title: `${p.num}번`, answer: p.answer }
      ];

      subQuestions.forEach((sq, sIdx) => {
        const chosen = userAnswers[sq.id];
        const isFlagged = !!(userFlags[p.id] || userFlags[sq.id]);
        let status = 'unanswered';
        let icon = '－';

        if (chosen !== undefined) {
          if (chosen === sq.answer) {
            status = 'correct';
            icon = '✓';
          } else {
            status = 'wrong';
            icon = '✕';
          }
        }

        if (filter === 'wrong' && status !== 'wrong') return;
        if (filter === 'correct' && status !== 'correct') return;
        if (filter === 'unanswered' && status !== 'unanswered') return;
        if (filter === 'flagged' && !isFlagged) return;

        const card = document.createElement('div');
        card.className = `res-q-card ${status}`;
        card.innerHTML = `
          <div class="res-q-header">
            <span>${sq.title}</span>
            <span class="res-status-icon">${icon}</span>
          </div>
          <div class="res-q-answers">
            <span>선택: ${chosen ? chosen + '번' : '-'}</span>
            <span>정답: ${sq.answer}번</span>
          </div>
          <div class="res-q-time">${p.section} · ${p.page ? `P.${p.page}` : ''}</div>
        `;

        card.addEventListener('click', () => {
          els.scoreModal.classList.remove('open');
          jumpToQuestion(pageIdx, sIdx);
        });

        els.scoreReviewGrid.appendChild(card);
      });
    });
  }

  function showSolutionModal() {
    if (!activeSection) return;
    const q = activeSection.questions[currentQIndex];
    if (!q) return;

    const subQuestions = q.subQuestions && q.subQuestions.length ? q.subQuestions : [
      { id: q.id, num: q.num, title: `${q.num}번`, answer: q.answer }
    ];

    const ansSummary = subQuestions.map(sq => `${sq.title}: ${sq.answer}번`).join(' | ');

    els.solModalTitle.textContent = `📖 ${q.title} 상세 해설`;
    els.solCorrectNum.textContent = `정답 [${ansSummary}]`;
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
    if (els.sectionSelect) {
      els.sectionSelect.addEventListener('change', e => {
        switchSection(e.target.value);
      });
    }

    // OMR Choice Buttons
    if (els.optBtns) {
      els.optBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.getAttribute('data-val'), 10);
          pickAnswer(val);
        });
      });
    }

    if (els.clearAnsBtn) {
      els.clearAnsBtn.addEventListener('click', clearAnswer);
    }

    // Navigation
    if (els.prevQBtn) {
      els.prevQBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevQuestion();
      });
    }
    if (els.nextQBtn) {
      els.nextQBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextQuestion();
      });
    }
    if (els.flagBtn) els.flagBtn.addEventListener('click', toggleFlag);
    if (els.viewSolBtn) els.viewSolBtn.addEventListener('click', showSolutionModal);

    // Global click delegation as an unbreakable fallback for next/prev navigation
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      const nextBtn = e.target.closest('#next-q-btn, .next-btn');
      if (nextBtn) {
        e.preventDefault();
        if (!nextBtn.disabled) {
          nextQuestion();
        }
        return;
      }
      const prevBtn = e.target.closest('#prev-q-btn, .prev-btn');
      if (prevBtn) {
        e.preventDefault();
        if (!prevBtn.disabled) {
          prevQuestion();
        }
        return;
      }
    });

    // Zoom
    if (els.zoomInBtn) els.zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + 0.15));
    if (els.zoomOutBtn) els.zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - 0.15));
    if (els.zoomFitWidth) {
      els.zoomFitWidth.addEventListener('click', () => {
        const containerWidth = els.qViewport ? (els.qViewport.clientWidth - 48) : 900;
        setZoom(containerWidth / 900);
      });
    }
    if (els.zoomFitPage) els.zoomFitPage.addEventListener('click', () => setZoom(1.0));

    // Timer
    if (els.timerToggleBtn) {
      els.timerToggleBtn.addEventListener('click', () => {
        if (isTimerRunning) pauseTimer();
        else startTimer();
      });
    }
    if (els.timerResetBtn) {
      els.timerResetBtn.addEventListener('click', () => {
        if (confirm('타이머를 초기화하시겠습니까?')) {
          resetTimer((activeSection?.time_limit_minutes || 25) * 60);
        }
      });
    }

    // Submit
    if (els.submitExamBtn) {
      els.submitExamBtn.addEventListener('click', () => {
        let unansweredCount = 0;
        if (activeSection?.questions) {
          activeSection.questions.forEach(p => {
            if (p.is_passage) return;
            const subQuestions = p.subQuestions && p.subQuestions.length ? p.subQuestions : [
              { id: p.id, num: p.num, title: `${p.num}번`, answer: p.answer }
            ];
            subQuestions.forEach(sq => {
              if (userAnswers[sq.id] === undefined) unansweredCount++;
            });
          });
        }

        let msg = '시험을 제출하고 자동 채점을 진행하시겠습니까?';
        if (unansweredCount > 0) {
          msg = `아직 풀지 않은 문제가 ${unansweredCount}문항 있습니다.\n정말 제출하고 채점하시겠습니까?`;
        }
        if (confirm(msg)) {
          submitAndScore();
        }
      });
    }

    if (els.omrSubmitBtn) {
      els.omrSubmitBtn.addEventListener('click', () => {
        if (els.omrDrawer) els.omrDrawer.classList.remove('open');
        submitAndScore();
      });
    }

    // OMR Drawer Toggle
    if (els.omrDrawerToggle) {
      els.omrDrawerToggle.addEventListener('click', () => {
        updateOMRDrawer();
        if (els.omrDrawer) els.omrDrawer.classList.toggle('open');
      });
    }
    if (els.closeOmrBtn) {
      els.closeOmrBtn.addEventListener('click', () => {
        if (els.omrDrawer) els.omrDrawer.classList.remove('open');
      });
    }

    // Notepad Tabs
    if (els.tabQMemo) {
      els.tabQMemo.addEventListener('click', () => {
        activeMemoTab = 'question';
        els.tabQMemo.classList.add('active');
        if (els.tabGlobalMemo) els.tabGlobalMemo.classList.remove('active');
        updateNotepadView();
      });
    }

    if (els.tabGlobalMemo) {
      els.tabGlobalMemo.addEventListener('click', () => {
        activeMemoTab = 'global';
        els.tabGlobalMemo.classList.add('active');
        if (els.tabQMemo) els.tabQMemo.classList.remove('active');
        updateNotepadView();
      });
    }

    // Notepad Tools
    if (els.notepadTextarea) els.notepadTextarea.addEventListener('input', handleNotepadInput);

    if (els.notepadFontInc) {
      els.notepadFontInc.addEventListener('click', () => {
        if (memoFontSize < 24) {
          memoFontSize += 2;
          if (els.notepadTextarea) els.notepadTextarea.style.fontSize = `${memoFontSize}px`;
        }
      });
    }

    if (els.notepadFontDec) {
      els.notepadFontDec.addEventListener('click', () => {
        if (memoFontSize > 10) {
          memoFontSize -= 2;
          if (els.notepadTextarea) els.notepadTextarea.style.fontSize = `${memoFontSize}px`;
        }
      });
    }

    if (els.notepadCopyBtn) {
      els.notepadCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(els.notepadTextarea ? els.notepadTextarea.value : '').then(() => {
          alert('메모 내용이 클립보드에 복사되었습니다.');
        });
      });
    }

    if (els.notepadClearBtn) {
      els.notepadClearBtn.addEventListener('click', () => {
        if (confirm('현재 작성된 메모를 모두 지우시겠습니까?')) {
          if (els.notepadTextarea) els.notepadTextarea.value = '';
          handleNotepadInput();
        }
      });
    }

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
              calcClearEntry();
              break;
            case 'backspace':
              calcBackspace();
              break;
            case 'sign':
            case 'reciprocal':
            case 'sq':
            case 'sqrt':
            case 'pct':
              calcSpecial(action);
              break;
            case 'mc':
            case 'mr':
            case 'm-plus':
            case 'm-minus':
              calcMemAction(action);
              break;
          }
        }
      });
    });

    // Calculator History Drawer
    if (els.calcHistoryToggle) {
      els.calcHistoryToggle.addEventListener('click', () => {
        if (els.calcHistoryDrawer) els.calcHistoryDrawer.classList.toggle('open');
      });
    }

    if (els.calcClearHistory) {
      els.calcClearHistory.addEventListener('click', () => {
        calcHistory = [];
        savePersistence();
        renderCalcHistory();
      });
    }

    // Score Modal Filters & Actions
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderScoreReviewGrid(btn.getAttribute('data-filter'));
      });
    });

    if (els.closeScoreModalBtn) {
      els.closeScoreModalBtn.addEventListener('click', () => {
        if (els.scoreModal) els.scoreModal.classList.remove('open');
      });
    }

    if (els.btnReviewExam) {
      els.btnReviewExam.addEventListener('click', () => {
        if (els.scoreModal) els.scoreModal.classList.remove('open');
        isReviewMode = true;
        jumpToQuestion(0);
      });
    }

    if (els.btnRetryExam) {
      els.btnRetryExam.addEventListener('click', () => {
        if (confirm('기존 답안을 모두 초기화하고 처음부터 다시 응시하시겠습니까?')) {
          if (activeSection?.questions) {
            activeSection.questions.forEach(p => {
              delete userFlags[p.id];
              delete questionTimes[p.id];
              const subQuestions = p.subQuestions && p.subQuestions.length ? p.subQuestions : [
                { id: p.id }
              ];
              subQuestions.forEach(sq => {
                delete userAnswers[sq.id];
                delete userFlags[sq.id];
              });
            });
          }
          savePersistence();
          isReviewMode = false;
          if (els.scoreModal) els.scoreModal.classList.remove('open');
          resetTimer((activeSection?.time_limit_minutes || 25) * 60);
          renderQuestion();
        }
      });
    }

    // Solution Modal
    if (els.closeSolModalBtn) {
      els.closeSolModalBtn.addEventListener('click', () => {
        if (els.solutionModal) els.solutionModal.classList.remove('open');
      });
    }
    if (els.closeSolBtn) {
      els.closeSolBtn.addEventListener('click', () => {
        if (els.solutionModal) els.solutionModal.classList.remove('open');
      });
    }
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

      // 1. Numeric Keypad
      if (e.code && e.code.startsWith('Numpad')) {
        e.preventDefault();
        const k = e.code;
        if (k >= 'Numpad0' && k <= 'Numpad9') {
          const digit = k.replace('Numpad', '');
          calcInputDigit(digit);
          highlightCalcKey(`data-val="${digit}"`);
          return;
        }
        if (k === 'NumpadDecimal') {
          calcInputDecimal();
          highlightCalcKey('data-val="."');
          return;
        }
        if (k === 'NumpadAdd') {
          calcPerformOp('add');
          highlightCalcKey('data-action="add"');
          return;
        }
        if (k === 'NumpadSubtract') {
          calcPerformOp('sub');
          highlightCalcKey('data-action="sub"');
          return;
        }
        if (k === 'NumpadMultiply') {
          calcPerformOp('mult');
          highlightCalcKey('data-action="mult"');
          return;
        }
        if (k === 'NumpadDivide') {
          calcPerformOp('div');
          highlightCalcKey('data-action="div"');
          return;
        }
        if (k === 'NumpadEnter') {
          calcEvaluate();
          highlightCalcKey('data-action="equals"');
          return;
        }
      }

      // 2. Standard Keyboard operators
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
      // Tab or Shift+Tab: cycle sub-questions on the current page
      if (e.key === 'Tab') {
        const q = activeSection?.questions[currentQIndex];
        const subLen = q?.subQuestions?.length || 1;
        if (subLen > 1) {
          e.preventDefault();
          if (e.shiftKey) {
            activeSubQIndex = (activeSubQIndex - 1 + subLen) % subLen;
          } else {
            activeSubQIndex = (activeSubQIndex + 1) % subLen;
          }
          updateActiveSubQHighlight();
          return;
        }
      }

      // ArrowUp / ArrowDown: cycle sub-questions on the current page
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const q = activeSection?.questions[currentQIndex];
        const subLen = q?.subQuestions?.length || 1;
        if (subLen > 1) {
          e.preventDefault();
          if (e.key === 'ArrowUp') {
            activeSubQIndex = (activeSubQIndex - 1 + subLen) % subLen;
          } else {
            activeSubQIndex = (activeSubQIndex + 1) % subLen;
          }
          updateActiveSubQHighlight();
          return;
        }
      }

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

      // Arrow keys and hotkeys for question navigation
      if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.code === 'KeyP') {
        e.preventDefault();
        prevQuestion();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.code === 'KeyN') {
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
