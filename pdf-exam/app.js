(function () {
  'use strict';

  const SECTION_SECONDS = 15 * 60;
  const state = {
    sources: [],
    selectedSections: [],
    sectionIndex: 0,
    questionIndex: 0,
    answers: {},
    results: [],
    ready: new Map(),
    nextReady: null,
    deadline: 0,
    timerId: 0,
    transitioning: false,
    memo: new Map(),
    drawing: new Map(),
    answerKey: null,
    pendingFiles: [],
    manualSourceId: null,
    zoom: 1
  };

  const el = id => document.getElementById(id);
  const escapeHtml = text => String(text == null ? '' : text).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const qKey = q => q.examId || [q.sourceKey, q.sectionId, q.number, q.id].join('|');
  const currentSection = () => state.selectedSections[state.sectionIndex];
  const currentQuestion = () => currentSection() && currentSection().questions[state.questionIndex];
  function currentGroup() {
    const section = currentSection();
    const first = currentQuestion();
    if (!section || !first) return [];
    if (!first.groupId) return [first];
    const group = [];
    for (let index = state.questionIndex; index < section.questions.length; index++) {
      const question = section.questions[index];
      if (question.groupId !== first.groupId) break;
      group.push(question);
    }
    return group;
  }
  const allQuestions = () => state.sources.flatMap(source => source.sections.flatMap(section => section.questions || []));

  function setStatus(message, error = false) {
    const target = el('analysis-status');
    if (target) {
      target.textContent = message;
      target.classList.toggle('error', error);
    }
  }

  function setExamError(message) {
    const target = el('exam-error');
    if (target) {
      target.textContent = message || '';
      target.hidden = !message;
    }
  }

  function showView(viewId) {
    ['setup-view', 'exam-view', 'result-view'].forEach(id => {
      const node = el(id);
      if (node) node.hidden = id !== viewId;
    });
    window.scrollTo(0, 0);
  }

  function sourceIdentity(file) {
    return PdfExamStorage.sourceId(file);
  }

  function normalizeSource(file, analyzed, docId) {
    const key = sourceIdentity(file);
    const sections = (analyzed.sections || []).map((section, sectionIndex) => {
      // The PDF document ID changes on reopen. Keep question identities stable.
      const firstPage = section.questions?.[0]?.segments?.[0]?.pageIndex ?? sectionIndex;
      const sectionId = `round-${section.round || 1}-${section.name || '미분류'}-page-${firstPage + 1}`;
      return {
        ...section,
        id: sectionId,
        round: section.round || String(state.sources.length + 1),
        questions: (section.questions || []).map((question, questionIndex) => ({
          ...question,
          docId: docId || question.docId,
          fileName: file.name,
          sourceKey: key,
          sectionId,
          examId: `${key}|${sectionId}|${question.number}|${questionIndex}`,
          answer: Number(question.answer) || null,
          explanation: question.explanation || ''
        }))
      };
    });
    return { id: key, file, docId, sections, issues: analyzed.issues || [] };
  }

  function mergeSource(source) {
    const index = state.sources.findIndex(existing => existing.id === source.id);
    if (index < 0) state.sources.push(source);
    else state.sources[index] = source;
    renderSetup();
  }

  async function analyzePendingFiles() {
    const files = state.pendingFiles.length ? state.pendingFiles : Array.from(el('pdf-input').files || []);
    if (!files.length) return setStatus('문제 PDF를 선택해 주세요.', true);
    const button = el('analyze-btn');
    if (button) button.disabled = true;
    if (el('analysis-progress')) el('analysis-progress').hidden = false;
    const password = (el('pdf-password-input') && el('pdf-password-input').value) || '';
    let succeeded = 0;
    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        setStatus(`${file.name} 분석 중 (${fileIndex + 1}/${files.length})`);
        try {
          const analyzed = await PdfExamEngine.analyze(file, {
            password,
            onProgress: progress => {
              const percent = progress && (progress.percent ?? progress.progress ?? (progress.current && progress.total ? progress.current / progress.total : undefined));
              if (Number.isFinite(percent) && el('analysis-progress')) {
                el('analysis-progress').value = Math.max(0, Math.min(100, percent <= 1 ? percent * 100 : percent));
              }
              if (el('analysis-progress-text')) {
                el('analysis-progress-text').textContent = progress && (progress.message || (progress.current && progress.total ? `${progress.current}/${progress.total}페이지 분석` : progress.stage) || '') || '';
              }
            }
          });
          const source = normalizeSource(file, analyzed, analyzed.docId);
          mergeSource(source);
          if (!source.sections.some(section => section.questions.length)) {
            state.manualSourceId = source.id;
            if (el('manual-range-panel')) el('manual-range-panel').hidden = false;
            setStatus(`${file.name}: 문제 번호를 찾지 못했습니다. 회차·영역 페이지 범위를 지정해 주세요.`, true);
          } else if (source.sections.some(section => section.name === '미분류')) {
            state.manualSourceId = source.id;
            if (el('manual-range-panel')) el('manual-range-panel').hidden = false;
          }
          if (el('save-locally') && el('save-locally').checked) await PdfExamStorage.saveSource(source);
          succeeded++;
        } catch (error) {
          const passwordHint = error && (error.code === 'PASSWORD_REQUIRED' || /password|암호/i.test(error.message));
          setStatus(`${file.name}: ${passwordHint ? 'PDF 암호를 입력하고 다시 분석해 주세요.' : error.message}`, true);
        }
      }
      if (succeeded === files.length && !state.manualSourceId) setStatus(`${succeeded}개 PDF 분석을 마쳤습니다. 시험에 넣을 문제를 선택해 주세요.`);
      await renderSavedList();
    } finally {
      if (button) button.disabled = false;
      if (el('analysis-progress')) el('analysis-progress').hidden = true;
    }
  }

  async function analyzeManualRange() {
    const source = state.sources.find(item => item.id === (el('manual-range-source')?.value || state.manualSourceId));
    if (!source) return setStatus('다시 분석할 PDF를 선택해 주세요.', true);
    const rawName = el('manual-range-name')?.value.trim() || '';
    const roundMatch = rawName.match(/(\d{1,2})\s*(?:회차|회)/);
    const round = roundMatch ? Number(roundMatch[1]) : 1;
    const name = rawName.replace(/(?:제\s*)?\d{1,2}\s*(?:회차|회)/, '').trim() || '미분류';
    const startPage = Number(el('manual-range-start')?.value);
    const endPage = Number(el('manual-range-end')?.value);
    const docId = source.sections.flatMap(section => section.questions).find(q => q.docId)?.docId || source.docId;
    if (!docId) return setStatus('원본 PDF를 다시 분석한 뒤 페이지 범위를 지정해 주세요.', true);
    try {
      setStatus(`${startPage}~${endPage}페이지에서 ${name} 문제를 찾는 중입니다.`);
      const analyzed = await PdfExamEngine.analyzeRange(docId, { startPage, endPage, name, round });
      if (!analyzed.sections.some(section => section.questions.length)) throw new Error('해당 범위에서 문제 번호를 찾지 못했습니다.');
      const normalized = normalizeSource(source.file, analyzed, docId);
      source.sections = source.sections.map(section => section.name === '미분류'
        ? { ...section, questions: section.questions.filter(question => !question.segments.some(segment => segment.pageIndex + 1 >= startPage && segment.pageIndex + 1 <= endPage)) }
        : section).filter(section => section.questions.length).concat(normalized.sections);
      source.issues = (source.issues || []).filter(issue => {
        if (issue.code === 'NO_QUESTIONS' || issue.code === 'SECTION_UNRECOGNIZED') return false;
        return !issue.page || issue.page < startPage || issue.page > endPage;
      }).concat(analyzed.issues || []);
      const hasUnclassified = source.sections.some(section => section.name === '미분류');
      state.manualSourceId = hasUnclassified ? source.id : null;
      if (el('manual-range-panel')) el('manual-range-panel').hidden = !hasUnclassified;
      renderSetup();
      setStatus(`${startPage}~${endPage}페이지의 문제를 다시 분석했습니다.`);
      if (el('save-locally')?.checked) await PdfExamStorage.saveSource(source);
    } catch (error) {
      setStatus(`페이지 범위 분석 실패: ${error.message}`, true);
    }
  }

  async function restoreSource(record) {
    const password = (el('pdf-password-input') && el('pdf-password-input').value) || '';
    const opened = await PdfExamEngine.openDocument(record.file, { password });
    const source = normalizeSource(record.file, { sections: record.sections, issues: record.issues }, opened.docId);
    mergeSource(source);
    return source;
  }

  function renderSetup() {
    const files = el('file-list');
    if (files) files.innerHTML = state.sources.map(source => {
      const count = source.sections.reduce((sum, section) => sum + section.questions.length, 0);
      return `<div>${escapeHtml(source.file.name)} · ${source.sections.length}개 영역 · ${count}문제</div>`;
    }).join('');

    const sectionsNode = el('section-list');
    if (sectionsNode) {
      sectionsNode.innerHTML = state.sources.map(source => source.sections.map(section => {
        const sectionKey = `${source.id}|${section.id}`;
        const rows = section.questions.map(q => {
          const ready = Array.isArray(q.segments) && q.segments.length && Array.isArray(q.choices) && q.choices.length >= 5;
          return `<label class="question-select${ready ? '' : ' invalid-question'}"><input type="checkbox" class="question-checkbox" data-qkey="${escapeHtml(qKey(q))}" ${ready ? 'checked' : 'disabled'}><span>${escapeHtml(q.number)}번</span>${ready ? '' : '<small>보기 위치 확인 필요</small>'}</label>`;
        }).join('');
        return `<details class="section-select" open><summary><label><input type="checkbox" class="section-checkbox" data-section-key="${escapeHtml(sectionKey)}" checked> ${escapeHtml(source.file.name)} · ${escapeHtml(section.round)}회차 · ${escapeHtml(section.name)} (${section.questions.length}문제)</label></summary><div class="question-select-grid">${rows}</div></details>`;
      }).join('')).join('');
    }

    const manualCandidates = state.sources.filter(source => !source.sections.length || source.sections.some(section => section.name === '미분류'));
    if (!manualCandidates.some(source => source.id === state.manualSourceId)) state.manualSourceId = manualCandidates[0]?.id || null;
    const manualPanel = el('manual-range-panel');
    if (manualPanel) manualPanel.hidden = !manualCandidates.length;
    const manualSelect = el('manual-range-source');
    if (manualSelect) {
      manualSelect.innerHTML = manualCandidates.map(source => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.file.name)}</option>`).join('');
      if (state.manualSourceId) manualSelect.value = state.manualSourceId;
    }

    const issues = state.sources.flatMap(source => (source.issues || []).map(issue => `${source.file.name}: ${typeof issue === 'string' ? issue : issue.message || JSON.stringify(issue)}`));
    const invalid = allQuestions().filter(q => !(q.segments && q.segments.length && q.choices && q.choices.length >= 5));
    const issuesNode = el('issue-list');
    if (issuesNode) issuesNode.innerHTML = [...issues, ...invalid.map(q => `${q.fileName} ${q.section} ${q.number}번: 문제 또는 보기 위치를 확인할 수 없습니다.`)]
      .map(item => `<div>${escapeHtml(item)}</div>`).join('');

    const summary = el('setup-summary');
    if (summary) summary.textContent = `${state.sources.length}개 PDF · ${state.sources.reduce((sum, source) => sum + source.sections.length, 0)}개 영역 · ${allQuestions().length}문제 인식`;
    const answerTarget = el('answer-target-source');
    if (answerTarget) {
      const selected = answerTarget.value;
      answerTarget.innerHTML = state.sources.map(source => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.file.name)}</option>`).join('');
      if (state.sources.some(source => source.id === selected)) answerTarget.value = selected;
    }
    if (el('export-analysis-btn')) el('export-analysis-btn').disabled = state.sources.length === 0;
    if (el('save-corrections-btn')) el('save-corrections-btn').hidden = state.sources.length === 0;
    renderAnswerEditor();
    updateStartButton();
  }

  function renderAnswerEditor() {
    const node = el('answer-editor-list');
    if (!node) return;
    node.innerHTML = state.sources.map(source => source.sections.map(section => {
      const rows = section.questions.map(q => {
        const options = ['-', '①', '②', '③', '④', '⑤'].map((label, n) => `<option value="${n || ''}" ${q.answer === n ? 'selected' : ''}>${label}</option>`).join('');
        return `<div class="answer-editor-row" data-qkey="${escapeHtml(qKey(q))}"><span>${escapeHtml(q.number)}번</span><label>정답<select class="answer-correction" aria-label="${escapeHtml(q.number)}번 정답">${options}</select></label><label>해설<textarea class="explanation-correction" placeholder="해설 수정 또는 입력" aria-label="${escapeHtml(q.number)}번 해설">${escapeHtml(q.explanation || '')}</textarea></label></div>`;
      }).join('');
      return `<details><summary>${escapeHtml(source.file.name)} · ${escapeHtml(section.round)}회차 · ${escapeHtml(section.name)} 정답 수정</summary>${rows}</details>`;
    }).join('')).join('');
  }

  function chosenSections() {
    const chosen = new Set(Array.from(document.querySelectorAll('.question-checkbox:checked')).map(input => input.dataset.qkey));
    return state.sources.flatMap(source => source.sections.map(section => ({
      ...section,
      fileName: source.file.name,
      questions: section.questions.filter(q => chosen.has(qKey(q)))
    })).filter(section => section.questions.length));
  }

  function updateStartButton() {
    const button = el('start-exam-btn');
    if (!button) return;
    const chosen = chosenSections();
    button.disabled = !chosen.length || chosen.some(section => section.questions.some(q => !q.segments || !q.segments.length || !q.choices || q.choices.length < 5));
    button.textContent = chosen.length ? `시험 시작 · ${chosen.reduce((sum, section) => sum + section.questions.length, 0)}문제` : '문제를 선택해 주세요';
  }

  async function renderSavedList() {
    const node = el('saved-list');
    if (!node) return;
    try {
      const records = await PdfExamStorage.listSources();
      node.innerHTML = records.length ? records.map(record => `<li><span>${escapeHtml(record.fileName)} · ${record.questionCount}문제</span><button type="button" data-load-source="${escapeHtml(record.id)}">불러오기</button><button type="button" data-delete-source="${escapeHtml(record.id)}" aria-label="저장된 ${escapeHtml(record.fileName)} 삭제">삭제</button></li>`).join('') : '<li>저장된 PDF 분석 결과가 없습니다.</li>';
    } catch (error) {
      node.textContent = `PC 저장소를 열 수 없습니다: ${error.message}`;
    }
  }

  async function renderMistakeList() {
    const node = el('mistake-list');
    if (!node) return;
    try {
      const mistakes = await PdfExamStorage.getMistakes();
      node.innerHTML = mistakes.length
        ? mistakes.map(item => `<div>${escapeHtml(item.fileName)} · ${escapeHtml(item.round)}회차 · ${escapeHtml(item.section)} · ${escapeHtml(item.number)}번</div>`).join('')
        : '<div>저장된 오답이 없습니다.</div>';
      if (el('select-mistakes-btn')) el('select-mistakes-btn').hidden = !mistakes.length;
    } catch (error) {
      node.textContent = `오답 기록을 열 수 없습니다: ${error.message}`;
    }
  }

  async function selectMistakeQuestions() {
    const mistakes = await PdfExamStorage.getMistakes();
    const keys = new Set(mistakes.map(item => item.key));
    let count = 0;
    document.querySelectorAll('.question-checkbox:not(:disabled)').forEach(input => {
      input.checked = keys.has(input.dataset.qkey);
      if (input.checked) count++;
    });
    document.querySelectorAll('.section-select').forEach(detail => {
      const checkbox = detail.querySelector('.section-checkbox');
      const questions = Array.from(detail.querySelectorAll('.question-checkbox:not(:disabled)'));
      checkbox.checked = questions.length > 0 && questions.every(input => input.checked);
    });
    updateStartButton();
    setStatus(count ? `${count}개 오답 문제를 선택했습니다.` : '현재 불러온 PDF와 일치하는 저장된 오답이 없습니다.', !count);
  }

  async function importAnswerPdf() {
    const file = el('answer-pdf-input')?.files[0];
    if (!file) return setStatus('정답·해설 PDF를 선택해 주세요.', true);
    const target = state.sources.find(source => source.id === el('answer-target-source')?.value);
    if (!target) return setStatus('정답을 연결할 문제 PDF를 먼저 선택해 주세요.', true);
    try {
      setStatus(`${file.name}에서 정답을 찾는 중입니다.`);
      const result = await PdfAnswerEngine.extract(file, {
        password: (el('pdf-password-input') && el('pdf-password-input').value) || ''
      });
      state.answerKey = result;
      let applied = 0;
      for (const q of target.sections.flatMap(section => section.questions)) {
        const match = PdfAnswerEngine.match(result, q);
        if (match && Number(match.answer) >= 1 && Number(match.answer) <= 5) {
          q.answer = Number(match.answer);
          q.explanation = match.explanation || q.explanation || '';
          applied++;
        }
      }
      renderAnswerEditor();
      if (el('save-locally') && el('save-locally').checked) {
        await PdfExamStorage.saveSource(target);
      }
      const message = `${target.file.name}의 ${applied}문제에 정답을 연결했습니다. 연결되지 않은 정답은 직접 확인해 주세요.`;
      if (el('answer-extraction-status')) el('answer-extraction-status').textContent = message;
      setStatus(message);
    } catch (error) {
      if (el('answer-extraction-status')) el('answer-extraction-status').textContent = `정답 PDF 분석 실패: ${error.message}`;
      setStatus(`정답 PDF 분석 실패: ${error.message}`, true);
    }
  }

  async function prepareSection(section) {
    const ready = new Map();
    for (let index = 0; index < section.questions.length; index++) {
      const question = section.questions[index];
      const rendered = await PdfExamEngine.renderQuestion(question, { scale: 1.5 });
      if (!rendered || !rendered.segments || !rendered.segments.length || !rendered.choices || rendered.choices.length < 5) {
        throw new Error(`${section.name} ${question.number}번의 보기 위치를 표시할 수 없습니다.`);
      }
      ready.set(qKey(question), rendered);
      if (el('analysis-progress')) el('analysis-progress').value = Math.round((index + 1) * 100 / section.questions.length);
      if (el('analysis-progress-text')) el('analysis-progress-text').textContent = `${section.name} 시험 화면 준비 중 ${index + 1}/${section.questions.length}`;
    }
    return ready;
  }

  async function startExam() {
    const selected = chosenSections();
    if (!selected.length) return setStatus('시험에 넣을 문제를 선택해 주세요.', true);
    state.selectedSections = selected;
    state.sectionIndex = 0;
    state.questionIndex = 0;
    state.answers = {};
    state.results = [];
    state.transitioning = true;
    const button = el('start-exam-btn');
    if (button) button.disabled = true;
    try {
      if (el('save-locally') && el('save-locally').checked) {
        for (const source of state.sources) await PdfExamStorage.saveSource(source);
        await renderSavedList();
      }
      setStatus('첫 영역의 시험 화면을 준비하고 있습니다.');
      state.ready = await prepareSection(selected[0]);
      showView('exam-view');
      state.transitioning = false;
      beginSection();
      if (selected[1]) {
        state.nextReady = prepareSection(selected[1]).catch(error => ({ error }));
      }
    } catch (error) {
      setStatus(`시험 준비 실패: ${error.message}`, true);
      state.transitioning = false;
      showView('setup-view');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function beginSection() {
    state.questionIndex = 0;
    state.deadline = Date.now() + SECTION_SECONDS * 1000;
    window.clearInterval(state.timerId);
    state.timerId = window.setInterval(tickTimer, 250);
    setExamError('');
    renderQuestion();
    tickTimer();
  }

  function tickTimer() {
    const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    const timer = el('timer-display');
    if (timer) timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    if (!remaining && !state.transitioning) void completeSection();
  }

  function renderedQuestionMarkup(question, rendered, skipShared = false) {
    const sharedCount = skipShared ? (question.sharedSegments || []).length : 0;
    return rendered.segments.map((segment, segmentIndex) => {
      if (segmentIndex < sharedCount) return '';
      const buttons = rendered.choices.filter(choice => choice.segmentIndex === segmentIndex).map(choice => {
        const number = Number(choice.number);
        const key = qKey(question);
        const selected = state.answers[key] === number;
        return `<button type="button" class="choice-hotspot${selected ? ' selected' : ''}" data-qkey="${escapeHtml(key)}" data-choice="${number}" style="left:${choice.x * 100}%;top:${choice.y * 100}%;width:${choice.w * 100}%;height:${choice.h * 100}%" aria-label="${escapeHtml(question.number)}번 ${number}번 보기" title="${number}번 보기"><span>${number}</span></button>`;
      }).join('');
      return `<div class="question-segment"><img src="${escapeHtml(segment.url)}" alt="${escapeHtml(question.number)}번 문제 원본 ${segmentIndex + 1}" width="${segment.width}" height="${segment.height}">${buttons}</div>`;
    }).join('');
  }

  function renderQuestion() {
    const section = currentSection();
    const group = currentGroup();
    const question = group[0];
    if (!section || !question) return;
    if (group.some(q => !state.ready.get(qKey(q)))) return setExamError(`${question.number}번 문제 화면이 준비되지 않았습니다.`);
    if (el('exam-round')) el('exam-round').textContent = `${section.round}회차`;
    if (el('exam-section')) el('exam-section').textContent = section.name;
    if (el('exam-question-number')) el('exam-question-number').textContent = group.length > 1 ? `${question.number}~${group.at(-1).number}` : String(question.number);
    if (el('exam-question-total')) el('exam-question-total').textContent = String(section.questions.length);
    if (el('question-image-stack')) el('question-image-stack').innerHTML = group.map((q, index) =>
      `<div class="question-group-member"><h3>${escapeHtml(q.number)}번</h3>${renderedQuestionMarkup(q, state.ready.get(qKey(q)), index > 0)}</div>`).join('');
    if (el('next-question-btn')) el('next-question-btn').textContent = state.questionIndex + group.length >= section.questions.length ? '영역 마치고 다음' : '다음 문제';
    updateSelectedAnswer();
    loadMemoAndDrawing();
    window.scrollTo(0, 0);
  }

  function updateSelectedAnswer() {
    const group = currentGroup();
    if (el('selected-answer')) el('selected-answer').textContent = group.map(question => {
      const value = state.answers[qKey(question)];
      return `${question.number}번 ${value ? `${value}번 선택` : '미응답'}`;
    }).join(' · ');
    document.querySelectorAll('.choice-hotspot').forEach(button => button.classList.toggle('selected',
      Number(button.dataset.choice) === state.answers[button.dataset.qkey]));
  }

  function setZoom(value) {
    state.zoom = Math.max(1, Math.min(2.5, Math.round(value * 4) / 4));
    if (el('question-image-stack')) el('question-image-stack').style.setProperty('--question-zoom', String(state.zoom));
    if (el('zoom-level')) el('zoom-level').textContent = `${Math.round(state.zoom * 100)}%`;
    if (el('zoom-out-btn')) el('zoom-out-btn').disabled = state.zoom <= 1;
    if (el('zoom-in-btn')) el('zoom-in-btn').disabled = state.zoom >= 2.5;
  }

  function requestNextQuestion() {
    if (state.transitioning) return;
    const group = currentGroup();
    if (!group.length) return;
    const unanswered = group.filter(question => !state.answers[qKey(question)]);
    if (el('next-confirm-text')) {
      el('next-confirm-text').textContent = unanswered.length === 0
        ? '다음 문제로 넘어가면 현재 답을 바꿀 수 없습니다. 계속할까요?'
        : `${unanswered.map(question => `${question.number}번`).join(', ')} 답을 선택하지 않았습니다. 다음 문제로 넘어가면 돌아올 수 없습니다. 계속할까요?`;
    }
    const dialog = el('next-confirm-dialog');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    else if (window.confirm(el('next-confirm-text').textContent)) void advanceQuestion();
  }

  async function advanceQuestion() {
    el('next-confirm-dialog')?.close();
    saveMemoAndDrawing();
    const section = currentSection();
    const nextIndex = state.questionIndex + currentGroup().length;
    if (nextIndex < section.questions.length) {
      state.questionIndex = nextIndex;
      renderQuestion();
    } else {
      await completeSection();
    }
  }

  function scoreSection(section) {
    return section.questions.map(question => {
      const key = qKey(question);
      const selected = state.answers[key] || null;
      const correct = question.answer || null;
      return {
        key, fileName: question.fileName, round: section.round, section: section.name,
        number: question.number, selected, correct,
        status: !selected ? 'unanswered' : !correct ? 'unknown' : selected === correct ? 'correct' : 'wrong',
        explanation: question.explanation || ''
      };
    });
  }

  async function completeSection() {
    if (state.transitioning) return;
    state.transitioning = true;
    el('next-confirm-dialog')?.close();
    el('finish-section-dialog')?.close();
    window.clearInterval(state.timerId);
    saveMemoAndDrawing();
    state.results.push(...scoreSection(currentSection()));
    for (const rendered of state.ready.values()) PdfExamEngine.releaseRender(rendered);
    state.ready.clear();
    const nextIndex = state.sectionIndex + 1;
    if (nextIndex >= state.selectedSections.length) {
      await finishExam();
      return;
    }
    try {
      setExamError('다음 영역의 시험 화면을 준비하고 있습니다.');
      let prepared = state.nextReady && await state.nextReady;
      if (!prepared || prepared.error) prepared = await prepareSection(state.selectedSections[nextIndex]);
      state.ready = prepared;
      state.sectionIndex = nextIndex;
      state.nextReady = state.selectedSections[nextIndex + 1]
        ? prepareSection(state.selectedSections[nextIndex + 1]).catch(error => ({ error })) : null;
      state.transitioning = false;
      beginSection();
    } catch (error) {
      setExamError(`다음 영역을 준비하지 못했습니다: ${error.message}`);
      state.transitioning = false;
    }
  }

  function renderResults() {
    const known = state.results.filter(item => item.correct);
    const correct = known.filter(item => item.status === 'correct').length;
    const wrong = known.filter(item => item.status === 'wrong').length;
    const unanswered = state.results.filter(item => item.status === 'unanswered').length;
    const unknown = state.results.filter(item => !item.correct).length;
    if (el('result-summary')) {
      el('result-summary').textContent = `전체 ${state.results.length}문제 · 정답 ${correct} · 오답 ${wrong} · 미응답 ${unanswered} · 정답 미등록 ${unknown}`;
    }
    if (el('result-list')) {
      el('result-list').innerHTML = state.results.map(item => {
        const options = ['-', '①', '②', '③', '④', '⑤'].map((label, n) => `<option value="${n || ''}" ${item.correct === n ? 'selected' : ''}>${label}</option>`).join('');
        const status = item.status === 'correct' ? '정답' : item.status === 'wrong' ? '오답' : item.status === 'unanswered' ? '미응답' : '정답 미등록';
        return `<div class="result-row" data-qkey="${escapeHtml(item.key)}"><div class="result-row-header"><span>${escapeHtml(item.round)}회차 · ${escapeHtml(item.section)} · ${escapeHtml(item.number)}번</span><strong>${status}</strong><span>내 답 ${item.selected || '-'}</span></div><div class="result-correction"><label>정답 수정<select class="result-answer-correction">${options}</select></label><label>해설 수정<textarea class="result-explanation-correction">${escapeHtml(item.explanation)}</textarea></label></div></div>`;
      }).join('');
    }
  }

  async function saveMistakeRecords() {
    if (!el('save-locally')?.checked) return;
    const prior = await PdfExamStorage.getMistakes();
    const merged = new Map(prior.map(item => [item.key, item]));
    for (const item of state.results) {
      if (item.status === 'wrong' || item.status === 'unanswered') merged.set(item.key, {
        key: item.key, fileName: item.fileName, round: item.round,
        section: item.section, number: item.number, status: item.status,
        savedAt: Date.now()
      });
      else if (item.status === 'correct') merged.delete(item.key);
    }
    await PdfExamStorage.saveMistakes(Array.from(merged.values()));
    await renderMistakeList();
  }

  async function finishExam() {
    state.transitioning = false;
    window.clearInterval(state.timerId);
    renderResults();
    showView('result-view');
    try { await saveMistakeRecords(); }
    catch (error) { window.alert(`오답 기록을 PC에 저장하지 못했습니다: ${error.message}`); }
  }

  function saveMemoAndDrawing() {
    const question = currentQuestion();
    if (!question) return;
    const key = qKey(question);
    if (el('memo-input')) state.memo.set(key, el('memo-input').value);
    const canvas = el('draw-canvas');
    if (canvas && canvas.width && canvas.height) state.drawing.set(key, canvas.toDataURL('image/png'));
  }

  function loadMemoAndDrawing() {
    const question = currentQuestion();
    if (!question) return;
    const key = qKey(question);
    if (el('memo-input')) el('memo-input').value = state.memo.get(key) || '';
    const canvas = el('draw-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const data = state.drawing.get(key);
    if (data) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = data;
    }
  }

  function initializeDrawing() {
    const canvas = el('draw-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    let drawing = false;
    let color = '#111827';
    const resize = () => {
      const old = document.createElement('canvas');
      old.width = canvas.width;
      old.height = canvas.height;
      old.getContext('2d').drawImage(canvas, 0, 0);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(400, Math.floor(canvas.clientWidth * ratio));
      canvas.height = Math.max(240, Math.floor(canvas.clientHeight * ratio));
      context.drawImage(old, 0, 0, canvas.width, canvas.height);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 3 * ratio;
    };
    requestAnimationFrame(resize);
    window.addEventListener('resize', resize);
    function point(event) {
      const box = canvas.getBoundingClientRect();
      return { x: (event.clientX - box.left) * canvas.width / box.width, y: (event.clientY - box.top) * canvas.height / box.height };
    }
    canvas.addEventListener('pointerdown', event => {
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      const p = point(event);
      context.beginPath();
      context.moveTo(p.x, p.y);
      context.strokeStyle = color;
    });
    canvas.addEventListener('pointermove', event => {
      if (!drawing) return;
      const p = point(event);
      context.lineTo(p.x, p.y);
      context.stroke();
    });
    ['pointerup', 'pointercancel'].forEach(type => canvas.addEventListener(type, () => { drawing = false; }));
    el('draw-clear-btn')?.addEventListener('click', () => context.clearRect(0, 0, canvas.width, canvas.height));
    document.querySelectorAll('.draw-color').forEach(button => button.addEventListener('click', () => {
      color = button.dataset.color || color;
      document.querySelectorAll('.draw-color').forEach(other => other.classList.toggle('active', other === button));
    }));
  }

  function calculate(expression) {
    const tokens = expression.replace(/×/g, '*').replace(/÷/g, '/').match(/\d+(?:\.\d+)?|[()+*/-]/g) || [];
    if (!tokens.length || tokens.join('') !== expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s/g, '')) throw new Error('계산식을 확인해 주세요.');
    let position = 0;
    function parsePrimary() {
      const token = tokens[position++];
      if (token === '-') return -parsePrimary();
      if (token === '(') {
        const value = parseSum();
        if (tokens[position++] !== ')') throw new Error('괄호를 확인해 주세요.');
        return value;
      }
      if (!token || !/^\d/.test(token)) throw new Error('계산식을 확인해 주세요.');
      return Number(token);
    }
    function parseProduct() {
      let value = parsePrimary();
      while (tokens[position] === '*' || tokens[position] === '/') {
        const op = tokens[position++];
        const right = parsePrimary();
        value = op === '*' ? value * right : value / right;
      }
      return value;
    }
    function parseSum() {
      let value = parseProduct();
      while (tokens[position] === '+' || tokens[position] === '-') {
        const op = tokens[position++];
        const right = parseProduct();
        value = op === '+' ? value + right : value - right;
      }
      return value;
    }
    const value = parseSum();
    if (position !== tokens.length || !Number.isFinite(value)) throw new Error('계산식을 확인해 주세요.');
    return Math.round(value * 1e10) / 1e10;
  }

  function initializeCalculator() {
    const display = el('calculator-display');
    if (!display) return;
    document.querySelectorAll('.calc-key').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.calc;
      if (value === 'clear' || value === 'C') display.value = '';
      else if (value === 'backspace') display.value = display.value.slice(0, -1);
      else if (value === 'percent') {
        try { display.value = String(calculate(display.value) / 100); }
        catch (_) { display.value = '오류'; }
      }
      else if (value === '=' || value === 'equals') {
        try { display.value = String(calculate(display.value)); }
        catch (error) { display.value = '오류'; }
      } else display.value = display.value === '오류' ? value : display.value + value;
    }));
  }

  function initializeTools() {
    document.querySelectorAll('[data-tool-target]').forEach(button => button.addEventListener('click', () => {
      const target = button.dataset.toolTarget;
      ['memo-panel', 'draw-panel', 'calculator-panel'].forEach(id => { if (el(id)) el(id).hidden = id !== target; });
      document.querySelectorAll('[data-tool-target]').forEach(tab => tab.classList.toggle('active', tab === button));
      if (target === 'draw-panel') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }));
    initializeCalculator();
    initializeDrawing();
  }

  function download(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function exportAnalysis() {
    if (!state.sources.length) return setStatus('내보낼 PDF 분석 결과가 없습니다.', true);
    const button = el('export-analysis-btn');
    if (button) button.disabled = true;
    try {
      const blob = await PdfExamStorage.exportBundle(state.sources);
      download(blob, 'skct-pdf-exam.json');
      setStatus('원본 PDF와 분석 결과를 이 PC에 저장했습니다.');
    } catch (error) {
      setStatus(`저장 파일 생성 실패: ${error.message}`, true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function importAnalysis() {
    const file = el('import-analysis-input') && el('import-analysis-input').files[0];
    if (!file) return;
    try {
      const items = await PdfExamStorage.importBundle(file);
      for (const item of items) await restoreSource(item);
      setStatus(`${items.length}개 PDF의 분석 결과를 불러왔습니다.`);
    } catch (error) {
      setStatus(`저장 파일 불러오기 실패: ${error.message}`, true);
    }
  }

  function bindEvents() {
    el('pdf-input')?.addEventListener('change', event => {
      state.pendingFiles = Array.from(event.target.files || []);
      if (el('analyze-btn')) el('analyze-btn').disabled = !state.pendingFiles.length;
      if (state.pendingFiles.length) void analyzePendingFiles();
    });
    el('analyze-btn')?.addEventListener('click', () => { void analyzePendingFiles(); });
    el('manual-range-source')?.addEventListener('change', event => { state.manualSourceId = event.target.value; });
    el('add-manual-range-btn')?.addEventListener('click', () => { void analyzeManualRange(); });
    el('answer-pdf-input')?.addEventListener('change', event => {
      const files = Array.from(event.target.files || []);
      if (el('extract-answers-btn')) el('extract-answers-btn').disabled = !files.length;
      if (el('answer-file-list')) el('answer-file-list').textContent = files.map(file => file.name).join(', ');
    });
    el('extract-answers-btn')?.addEventListener('click', () => { void importAnswerPdf(); });
    el('save-locally')?.addEventListener('change', event => {
      try { localStorage.setItem('skct_pdf_exam_save_locally', event.target.checked ? 'yes' : 'no'); }
      catch (_) { /* Storage may be disabled; the current session still works. */ }
    });
    el('save-corrections-btn')?.addEventListener('click', async () => {
      if (el('save-locally')?.checked) {
        try {
          for (const source of state.sources) await PdfExamStorage.saveSource(source);
          setStatus('수정한 정답과 해설을 이 PC에 저장했습니다.');
        } catch (error) { setStatus(`정답 저장 실패: ${error.message}`, true); }
      } else {
        setStatus('수정 사항을 적용했습니다. 파일로 보관하려면 분석 파일 저장을 선택해 주세요.');
      }
    });
    el('start-exam-btn')?.addEventListener('click', () => { void startExam(); });
    el('export-analysis-btn')?.addEventListener('click', () => { void exportAnalysis(); });
    el('import-analysis-input')?.addEventListener('change', () => { void importAnalysis(); });
    el('section-list')?.addEventListener('change', event => {
      if (event.target.classList.contains('section-checkbox')) {
        event.target.closest('details').querySelectorAll('.question-checkbox:not(:disabled)').forEach(input => { input.checked = event.target.checked; });
      } else if (event.target.classList.contains('question-checkbox')) {
        const detail = event.target.closest('details');
        const enabled = Array.from(detail.querySelectorAll('.question-checkbox:not(:disabled)'));
        detail.querySelector('.section-checkbox').checked = enabled.length > 0 && enabled.every(input => input.checked);
      }
      updateStartButton();
    });
    el('answer-editor-list')?.addEventListener('input', event => {
      const row = event.target.closest('[data-qkey]');
      const question = row && allQuestions().find(q => qKey(q) === row.dataset.qkey);
      if (!question) return;
      if (event.target.classList.contains('answer-correction')) question.answer = Number(event.target.value) || null;
      if (event.target.classList.contains('explanation-correction')) question.explanation = event.target.value;
    });
    el('saved-list')?.addEventListener('click', async event => {
      const loadId = event.target.dataset.loadSource;
      const deleteId = event.target.dataset.deleteSource;
      try {
        if (loadId) {
          setStatus('PC에 저장된 PDF 분석 결과를 불러오는 중입니다.');
          const record = await PdfExamStorage.getSource(loadId);
          if (!record) throw new Error('저장된 자료를 찾을 수 없습니다.');
          await restoreSource(record);
          setStatus(`${record.fileName}을 불러왔습니다.`);
        } else if (deleteId) {
          await PdfExamStorage.deleteSource(deleteId);
          await renderSavedList();
        }
      } catch (error) { setStatus(`저장된 PDF 처리 실패: ${error.message}`, true); }
    });
    el('select-mistakes-btn')?.addEventListener('click', () => {
      void selectMistakeQuestions().catch(error => setStatus(`오답 선택 실패: ${error.message}`, true));
    });
    el('question-image-stack')?.addEventListener('click', event => {
      const button = event.target.closest('.choice-hotspot');
      if (!button || !currentQuestion() || state.transitioning) return;
      state.answers[button.dataset.qkey] = Number(button.dataset.choice);
      updateSelectedAnswer();
    });
    el('next-question-btn')?.addEventListener('click', requestNextQuestion);
    el('zoom-out-btn')?.addEventListener('click', () => setZoom(state.zoom - 0.25));
    el('zoom-in-btn')?.addEventListener('click', () => setZoom(state.zoom + 0.25));
    el('cancel-next-btn')?.addEventListener('click', () => el('next-confirm-dialog')?.close());
    el('confirm-next-btn')?.addEventListener('click', () => { void advanceQuestion(); });
    el('finish-section-btn')?.addEventListener('click', () => {
      const remaining = currentSection()?.questions.slice(state.questionIndex).filter(question => !state.answers[qKey(question)]).length || 0;
      if (el('finish-section-text')) el('finish-section-text').textContent = remaining
        ? `아직 답을 고르지 않은 문제가 ${remaining}개 있습니다. 이 영역을 마치면 돌아올 수 없고 남은 시간은 다음 영역으로 넘어가지 않습니다.`
        : '이 영역을 마치면 돌아올 수 없고 남은 시간은 다음 영역으로 넘어가지 않습니다.';
      el('finish-section-dialog')?.showModal();
    });
    el('cancel-finish-section-btn')?.addEventListener('click', () => el('finish-section-dialog')?.close());
    el('confirm-finish-section-btn')?.addEventListener('click', () => {
      el('finish-section-dialog')?.close();
      void completeSection();
    });
    el('restart-btn')?.addEventListener('click', () => {
      window.clearInterval(state.timerId);
      showView('setup-view');
      renderSetup();
    });
    el('export-results-btn')?.addEventListener('click', () => {
      download(new Blob([JSON.stringify({ format: 'skct-pdf-exam-results', version: 1, results: state.results }, null, 2)], { type: 'application/json' }), 'skct-pdf-exam-results.json');
    });
    el('result-list')?.addEventListener('change', async event => {
      const row = event.target.closest('[data-qkey]');
      if (!row) return;
      const question = allQuestions().find(item => qKey(item) === row.dataset.qkey);
      const result = state.results.find(item => item.key === row.dataset.qkey);
      if (!question || !result) return;
      if (event.target.classList.contains('result-answer-correction')) question.answer = Number(event.target.value) || null;
      if (event.target.classList.contains('result-explanation-correction')) question.explanation = event.target.value;
      result.correct = question.answer;
      result.explanation = question.explanation;
      result.status = !result.selected ? 'unanswered' : !result.correct ? 'unknown' : result.selected === result.correct ? 'correct' : 'wrong';
      if (el('save-locally')?.checked) {
        try {
          for (const source of state.sources) await PdfExamStorage.saveSource(source);
          await saveMistakeRecords();
        } catch (error) { window.alert(`수정한 정답을 저장하지 못했습니다: ${error.message}`); }
      }
      if (event.target.classList.contains('result-answer-correction')) renderResults();
    });
  }

  function init() {
    if (!window.PdfExamEngine || !window.PdfExamStorage) {
      setStatus('PDF 처리 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.', true);
      return;
    }
    try { if (el('save-locally')) el('save-locally').checked = localStorage.getItem('skct_pdf_exam_save_locally') === 'yes'; }
    catch (_) { /* Storage may be disabled. */ }
    bindEvents();
    initializeTools();
    setZoom(1);
    renderSavedList();
    renderMistakeList();
    renderSetup();
    showView('setup-view');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
