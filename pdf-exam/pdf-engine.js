/* Browser-only PDF question extraction. No source PDF leaves this device. */
(function (global) {
  'use strict';

  const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';
  const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
  const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const SECTION_NAMES = [
    '언어이해', '자료해석', '언어추리', '수열추리', '응용수리',
    '창의수리', '수리추리', '공간지각', '도식추리', '인지역량', '실행역량',
  ];
  const CIRCLED = '①②③④⑤';
  const documents = new Map();
  const renderedUrls = new Set();
  let pdfjsPromise;
  let tesseractPromise;
  let ocrWorkerPromise;
  let serial = 0;

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const normalized = (value, extent) => clamp(value / extent, 0, 1);
  const clean = (text) => String(text || '').replace(/[\u00a0\u200b\u200e\u200f]/g, ' ').replace(/\s+/g, ' ').trim();
  const notify = (callback, detail) => { if (typeof callback === 'function') callback(detail); };

  function namedError(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  async function getPdfJs() {
    if (global.pdfjsLib && global.pdfjsLib.getDocument) return global.pdfjsLib;
    if (!pdfjsPromise) {
      pdfjsPromise = import(PDFJS_URL).then((library) => {
        library.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return library;
      }).catch((error) => {
        pdfjsPromise = null;
        throw namedError('PDF_LIBRARY_UNAVAILABLE', 'PDF 처리 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.', error);
      });
    }
    return pdfjsPromise;
  }

  async function getTesseract() {
    if (global.Tesseract && global.Tesseract.createWorker) return global.Tesseract;
    if (!tesseractPromise) {
      tesseractPromise = new Promise((resolve, reject) => {
        if (!global.document) {
          reject(namedError('OCR_UNAVAILABLE', 'OCR 라이브러리를 사용할 수 없습니다.'));
          return;
        }
        const script = global.document.createElement('script');
        script.src = TESSERACT_URL;
        script.async = true;
        script.onload = () => global.Tesseract ? resolve(global.Tesseract) : reject(namedError('OCR_UNAVAILABLE', 'OCR 라이브러리 초기화에 실패했습니다.'));
        script.onerror = () => reject(namedError('OCR_UNAVAILABLE', 'OCR 라이브러리를 내려받지 못했습니다. 인터넷 연결을 확인해 주세요.'));
        global.document.head.appendChild(script);
      }).catch((error) => {
        tesseractPromise = null;
        throw error;
      });
    }
    return tesseractPromise;
  }

  async function getOcrWorker() {
    if (!ocrWorkerPromise) {
      ocrWorkerPromise = getTesseract().then((library) => library.createWorker(['kor', 'eng'], 1, {
        cacheMethod: 'write',
      })).catch((error) => {
        ocrWorkerPromise = null;
        throw namedError('OCR_UNAVAILABLE', '한글 OCR을 준비하지 못했습니다. 인터넷 연결을 확인해 주세요.', error);
      });
    }
    return ocrWorkerPromise;
  }

  async function openDocument(file, options = {}) {
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw namedError('INVALID_FILE', 'PDF 파일을 선택해 주세요.');
    }
    const pdfjs = await getPdfJs();
    const bytes = new Uint8Array(await file.arrayBuffer());
    let loadingTask;
    try {
      const settings = { data: bytes, useSystemFonts: true };
      if (options.password) settings.password = options.password;
      loadingTask = pdfjs.getDocument(settings);
      const pdf = await loadingTask.promise;
      const docId = `pdf-${Date.now().toString(36)}-${++serial}`;
      documents.set(docId, { pdf, fileName: file.name || 'document.pdf', pageCount: pdf.numPages });
      return { docId, pageCount: pdf.numPages, fileName: file.name || 'document.pdf' };
    } catch (error) {
      if (loadingTask) try { await loadingTask.destroy(); } catch (_) { /* no document to retain */ }
      if (error && (error.name === 'PasswordException' || /password|암호/i.test(error.message || ''))) {
        throw namedError('PASSWORD_REQUIRED', '이 PDF를 열려면 올바른 암호가 필요합니다.', error);
      }
      throw namedError('PDF_OPEN_FAILED', 'PDF 파일을 열지 못했습니다.', error);
    }
  }

  function getPageCount(docId) {
    const entry = documents.get(docId);
    return entry ? entry.pageCount : 0;
  }

  function itemRectangle(item, viewport, util) {
    const transform = util.transform(viewport.transform, item.transform);
    const fontHeight = Math.max(1, Math.hypot(transform[2], transform[3]));
    const width = Math.max(1, (item.width || 0) * viewport.scale);
    return {
      text: clean(item.str),
      x: transform[4],
      y: transform[5] - fontHeight * 0.95,
      w: width,
      h: Math.max(fontHeight * 1.18, (item.height || 0) * viewport.scale),
    };
  }

  async function ocrPage(page) {
    const worker = await getOcrWorker();
    const viewport = page.getViewport({ scale: 2.4 });
    const canvas = global.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport }).promise;
    const result = await worker.recognize(canvas, {}, { text: true, tsv: true });
    const rows = (result.data.tsv || '').split(/\r?\n/).slice(1);
    const items = [];
    for (const row of rows) {
      const cells = row.split('\t');
      if (cells.length < 12 || cells[0] !== '5') continue;
      const text = clean(cells.slice(11).join('\t'));
      const confidence = Number(cells[10]);
      if (!text || (Number.isFinite(confidence) && confidence < 12)) continue;
      items.push({
        text,
        x: Number(cells[6]) / 2.4,
        y: Number(cells[7]) / 2.4,
        w: Number(cells[8]) / 2.4,
        h: Number(cells[9]) / 2.4,
      });
    }
    canvas.width = canvas.height = 0;
    return items;
  }

  async function extractPageItems(page, options = {}) {
    const pdfjs = await getPdfJs();
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ includeMarkedContent: false });
    let items = content.items
      .filter((item) => item.str && item.transform)
      .map((item) => itemRectangle(item, viewport, pdfjs.Util))
      .filter((item) => item.text && item.w > 0 && item.h > 0);
    let usedOcr = false;
    const bodyText = clean(items.filter((item) => item.y > viewport.height * 0.09 && item.y < viewport.height * 0.9)
      .map((item) => item.text).join(''));
    if (options.forceOcr || (options.ocr !== false && bodyText.length < 20 && !/[①②③④⑤]/.test(bodyText))) {
      items = await ocrPage(page);
      usedOcr = true;
    }
    return { items, width: viewport.width, height: viewport.height, usedOcr };
  }

  // Join nearby text runs into visual lines, but keep widely separated columns apart.
  function makeLines(items, width) {
    const sorted = items.slice().sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2) || a.x - b.x);
    const rows = [];
    for (const item of sorted) {
      const cy = item.y + item.h / 2;
      let row = rows.find((candidate) => Math.abs(candidate.cy - cy) <= Math.max(2.5, Math.min(candidate.h, item.h) * 0.45));
      if (!row) {
        row = { cy, h: item.h, items: [] };
        rows.push(row);
      }
      row.items.push(item);
      row.cy = (row.cy * (row.items.length - 1) + cy) / row.items.length;
      row.h = Math.max(row.h, item.h);
    }
    const lines = [];
    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      let part = [];
      const flush = () => {
        if (!part.length) return;
        const x = Math.min(...part.map((item) => item.x));
        const y = Math.min(...part.map((item) => item.y));
        const right = Math.max(...part.map((item) => item.x + item.w));
        const bottom = Math.max(...part.map((item) => item.y + item.h));
        const text = clean(part.map((item) => item.text).join(' '));
        if (text) lines.push({ text, x, y, w: right - x, h: bottom - y, items: part });
        part = [];
      };
      for (const item of row.items) {
        const last = part[part.length - 1];
        if (last && item.x - (last.x + last.w) > Math.max(26, width * 0.075)) flush();
        part.push(item);
      }
      flush();
    }
    return lines.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function detectSection(lines, pageHeight) {
    const heading = lines.filter((line) => line.y < pageHeight * 0.24).map((line) => line.text).join(' ').replace(/\s+/g, '');
    return SECTION_NAMES.find((name) => heading.includes(name)) || null;
  }

  function detectRound(lines, pageHeight) {
    const heading = lines.filter((line) => line.y < pageHeight * 0.24).map((line) => line.text).join(' ').replace(/\s+/g, '');
    const match = heading.match(/(?:제\s*)?(\d{1,2})\s*(?:회차|회|차)/);
    return match ? Number(match[1]) : null;
  }

  function questionNumber(line, pageWidth, pageHeight) {
    if (line.y < pageHeight * 0.035 || line.y > pageHeight * 0.92) return null;
    if (line.x > pageWidth * 0.72) return null;
    const value = line.text.replace(/^\s*\[\s*/, '').replace(/^\s*문항\s*/, '');
    if (/^(?:제\s*)?\d{1,2}\s*(?:회차|회|차)/.test(value)) return null;
    const match = value.match(/^(?:문제\s*)?(\d{1,3})(?:\s*[.)．。번\]]|\s{1,})\s*(.*)$/);
    if (!match) return null;
    const number = Number(match[1]);
    if (!Number.isInteger(number) || number < 1 || number > 150) return null;
    // A one-digit `1)` line is far more often an answer option than a question.
    if (match[1].length === 1 && /^\d\s*[)\]]/.test(value) && !/^문제/.test(value)) return null;
    // Single page numbers and numbered captions commonly occur in margins.
    const explicit = /^(?:문제\s*)?\d{1,3}\s*[.)．。번\]]/.test(value) || match[1].length >= 2;
    if (!explicit && !match[2]) return null;
    if (/^(?:정답|해설|풀이)/.test(match[2])) return null;
    return number;
  }

  function choiceNumber(text) {
    const compact = clean(text);
    const circled = CIRCLED.indexOf(compact[0]);
    if (circled >= 0) return circled + 1;
    const match = compact.match(/^([1-5])\s*[.)．。]/);
    return match ? Number(match[1]) : null;
  }

  function choiceMarkersInLine(line) {
    const result = [];
    for (const item of line.items) {
      const text = item.text;
      for (let index = 0; index < text.length; index++) {
        const number = CIRCLED.indexOf(text[index]) + 1;
        if (!number) continue;
        result.push({
          number,
          line: { ...item, x: item.x + item.w * index / Math.max(text.length, 1), w: Math.max(10, item.w * (text.length - index) / Math.max(text.length, 1)) },
        });
      }
      if (!result.some((marker) => marker.line.y === item.y)) {
        const number = choiceNumber(text);
        if (number) result.push({ number, line: item });
      }
    }
    if (!result.length) {
      const number = choiceNumber(line.text);
      if (number) result.push({ number, line });
    }
    return result;
  }

  function normalizedRect(x, y, w, h, pageWidth, pageHeight) {
    const left = clamp(x, 0, pageWidth);
    const top = clamp(y, 0, pageHeight);
    return {
      x: normalized(left, pageWidth),
      y: normalized(top, pageHeight),
      w: normalized(Math.max(0, Math.min(pageWidth, x + w) - left), pageWidth),
      h: normalized(Math.max(0, Math.min(pageHeight, y + h) - top), pageHeight),
    };
  }

  function pageLayout(pageIndex, info) {
    const lines = makeLines(info.items, info.width);
    const markers = lines.map((line) => ({ line, number: questionNumber(line, info.width, info.height) }))
      .filter((entry) => entry.number != null);
    const hasLeft = markers.some((entry) => entry.line.x < info.width * 0.46);
    const hasRight = markers.some((entry) => entry.line.x > info.width * 0.48);
    const twoColumns = hasLeft && hasRight && markers.length >= 2;
    const starts = markers.map((entry) => ({
      pageIndex,
      number: entry.number,
      line: entry.line,
      column: twoColumns && entry.line.x > info.width * 0.48 ? 1 : 0,
    }));
    starts.sort((a, b) => a.column - b.column || a.line.y - b.line.y);
    return {
      pageIndex, width: info.width, height: info.height, lines,
      section: detectSection(lines, info.height),
      round: detectRound(lines, info.height), twoColumns, starts,
      answerPage: /(?:정답\s*(?:및|과)?\s*해설|해설\s*(?:및|과)?\s*정답|정답표)/.test(lines.filter((line) => line.y < info.height * 0.24).map((line) => line.text).join(' ')),
    };
  }

  function cropForStart(layout, start, next) {
    const x = layout.twoColumns ? (start.column === 0 ? 0.035 : 0.50) : 0.035;
    const right = layout.twoColumns ? (start.column === 0 ? 0.50 : 0.965) : 0.965;
    const y = clamp(start.line.y / layout.height - 0.013, 0.03, 0.94);
    const bottom = next
      ? clamp(next.line.y / layout.height - 0.012, y + 0.025, 0.965)
      : 0.965;
    return { pageIndex: layout.pageIndex, x, y, w: right - x, h: bottom - y };
  }

  function cropForContinuation(layout, first) {
    const y = 0.035;
    const bottom = first ? clamp(first.line.y / layout.height - 0.012, y + 0.025, 0.965) : 0.965;
    return { pageIndex: layout.pageIndex, x: 0.035, y, w: 0.93, h: bottom - y };
  }

  function intersects(item, crop, width, height) {
    const x = item.x / width;
    const y = item.y / height;
    return x + item.w / width > crop.x && x < crop.x + crop.w && y + item.h / height > crop.y && y < crop.y + crop.h;
  }

  function locateChoices(question, layoutByPage) {
    const markers = [];
    const sourceLines = [];
    for (const crop of question.segments) {
      const layout = layoutByPage.get(crop.pageIndex);
      if (!layout) continue;
      for (const line of layout.lines) {
        if (!intersects(line, crop, layout.width, layout.height)) continue;
        sourceLines.push({ line, layout, crop });
        const isQuestionHeading = crop === question.segments[0] &&
          line.y < (crop.y + 0.035) * layout.height &&
          questionNumber(line, layout.width, layout.height) === question.number;
        if (isQuestionHeading) continue;
        for (const found of choiceMarkersInLine(line)) {
          markers.push({ ...found, layout, crop });
        }
      }
    }
    question.sourceText = sourceLines.map(({ line }) => line.text).join('\n');
    question.choices = [];
    for (let number = 1; number <= 5; number++) {
      const possible = markers.filter((marker) => marker.number === number);
      if (possible.length !== 1) continue;
      const marker = possible[0];
      const others = markers.filter((candidate) => candidate !== marker && candidate.crop === marker.crop);
      const rightNeighbor = others.filter((candidate) => Math.abs(candidate.line.y - marker.line.y) < marker.line.h * 0.7 && candidate.line.x > marker.line.x)
        .sort((a, b) => a.line.x - b.line.x)[0];
      const belowNeighbor = others.filter((candidate) => candidate.line.y > marker.line.y + marker.line.h * 0.4 && Math.abs(candidate.line.x - marker.line.x) < marker.layout.width * 0.12)
        .sort((a, b) => a.line.y - b.line.y)[0];
      const x = Math.max(marker.crop.x * marker.layout.width, marker.line.x - 3);
      const y = Math.max(marker.crop.y * marker.layout.height, marker.line.y - 3);
      const cropRight = (marker.crop.x + marker.crop.w) * marker.layout.width;
      const cropBottom = (marker.crop.y + marker.crop.h) * marker.layout.height;
      const hasSameRowChoice = others.some((candidate) => Math.abs(candidate.line.y - marker.line.y) < marker.line.h * 0.7);
      const right = rightNeighbor ? rightNeighbor.line.x - 3
        : hasSameRowChoice ? Math.min(cropRight, marker.line.x + marker.line.w + 8) : cropRight;
      const bottom = belowNeighbor ? belowNeighbor.line.y - 3 : Math.min(cropBottom, marker.line.y + Math.max(marker.line.h * 1.55, marker.layout.height * 0.034));
      const rect = normalizedRect(x, y, Math.max(10, right - x), Math.max(marker.line.h, bottom - y), marker.layout.width, marker.layout.height);
      question.choices.push({ number, pageIndex: marker.layout.pageIndex, ...rect });
    }
    question.choices.sort((a, b) => a.number - b.number);
    return markers;
  }

  function groupPassages(questions, layoutByPage) {
    const rangePattern = /(?:문제|문항)?\s*\[?\s*(\d{1,3})\s*(?:~|～|∼|–|—|-)\s*(\d{1,3})\s*\]?\s*(?:번|문항)?/;
    for (const question of questions) {
      const layout = layoutByPage.get(question.segments[0]?.pageIndex);
      if (!layout) continue;
      const startY = question.segments[0].y * layout.height;
      const preceding = layout.lines.filter((line) => line.y < startY && line.y > startY - layout.height * 0.23);
      const matchLine = preceding.reverse().find((line) => rangePattern.test(line.text));
      if (!matchLine) continue;
      const match = matchLine.text.match(rangePattern);
      const first = Number(match[1]);
      const last = Number(match[2]);
      if (last <= first || last - first > 8 || question.number !== first) continue;
      const groupId = `${question.docId}-${question.sectionId}-group-${first}-${last}`;
      const shared = {
        pageIndex: layout.pageIndex,
        x: question.segments[0].x,
        y: normalized(Math.max(layout.height * 0.04, matchLine.y - 5), layout.height),
        w: question.segments[0].w,
        h: normalized(Math.max(1, startY - matchLine.y + 3), layout.height),
      };
      for (const member of questions) {
        if (member.sectionId === question.sectionId && member.number >= first && member.number <= last) {
          member.groupId = groupId;
          member.groupRange = [first, last];
          member.sharedSegments = [shared];
        }
      }
    }
  }

  function segmentLayouts(docId, fileName, layouts, forcedSection) {
    const sections = [];
    const sectionById = new Map();
    const issues = [];
    const layoutByPage = new Map(layouts.map((layout) => [layout.pageIndex, layout]));
    let currentName = forcedSection?.name || '미분류';
    let currentRound = Number(forcedSection?.round) || 1;
    let answerMode = false;
    let lastQuestion = null;

    const sectionFor = (name, round) => {
      const id = `${docId}-round-${round}-${name.replace(/\s+/g, '')}`;
      if (!sectionById.has(id)) {
        const section = { id, name, round, questions: [] };
        sectionById.set(id, section);
        sections.push(section);
      }
      return sectionById.get(id);
    };

    for (const layout of layouts) {
      if (!forcedSection) {
        if (layout.answerPage) answerMode = true;
        if (answerMode) continue;
        if (layout.section) currentName = layout.section;
        if (layout.round) currentRound = layout.round;
      }
      const section = sectionFor(currentName, currentRound);
      const starts = layout.starts;
      // A page beginning with the tail of a question belongs to the preceding page.
      if (lastQuestion) locateChoices(lastQuestion, layoutByPage);
      if (lastQuestion && starts.length && lastQuestion.choices.length < 5 && lastQuestion.sectionId === section.id && starts[0].line.y > layout.height * 0.075) {
        lastQuestion.segments.push(cropForContinuation(layout, starts[0]));
      } else if (lastQuestion && !starts.length && layout.lines.length && lastQuestion.choices.length < 5 && lastQuestion.sectionId === section.id) {
        lastQuestion.segments.push(cropForContinuation(layout, null));
      }
      if (!starts.length) continue;
      for (let i = 0; i < starts.length; i++) {
        const start = starts[i];
        const next = starts.slice(i + 1).find((candidate) => candidate.column === start.column);
        const question = {
          id: `${section.id}-q-${start.number}-${layout.pageIndex + 1}`,
          docId, fileName, sectionId: section.id,
          number: start.number, section: section.name, round: section.round, answer: null,
          segments: [cropForStart(layout, start, next)],
          sharedSegments: [], choices: [], sourceText: '',
        };
        section.questions.push(question);
        lastQuestion = question;
      }
    }

    for (const section of sections) {
      groupPassages(section.questions, layoutByPage);
      for (const question of section.questions) {
        locateChoices(question, layoutByPage);
        if (question.choices.length !== 5) {
          issues.push({
            code: 'MISSING_CHOICES', severity: 'blocking',
            page: question.segments[0].pageIndex + 1, questionId: question.id,
            message: `${section.name} ${question.number}번의 보기 ${question.choices.length}/5개만 확인했습니다. 이 문제를 포함한 시험은 시작할 수 없습니다.`,
          });
        }
      }
      if (!section.questions.length) sectionById.delete(section.id);
    }
    const resultSections = sections.filter((section) => section.questions.length);
    if (!resultSections.length) {
      issues.push({ code: 'NO_QUESTIONS', severity: 'blocking', message: '문제 번호를 인식하지 못했습니다. 회차·영역의 페이지 범위를 지정해 다시 분석해 주세요.' });
    }
    if (resultSections.some((section) => section.name === '미분류')) {
      issues.push({ code: 'SECTION_UNRECOGNIZED', severity: 'warning', message: '일부 문제의 영역 이름을 찾지 못했습니다. 페이지 범위를 확인해 주세요.' });
    }
    return { sections: resultSections, issues };
  }

  async function analyzePages(docId, pageIndexes, options = {}, forcedSection) {
    const entry = documents.get(docId);
    if (!entry) throw namedError('DOCUMENT_NOT_FOUND', 'PDF를 다시 선택해 주세요.');
    const layouts = [];
    const issues = [];
    for (let i = 0; i < pageIndexes.length; i++) {
      const pageIndex = pageIndexes[i];
      const page = await entry.pdf.getPage(pageIndex + 1);
      try {
        let info = await extractPageItems(page, { ocr: true });
        let layout = pageLayout(pageIndex, info);
        const bodyTextLength = clean(info.items.filter((item) => item.y > info.height * 0.09 && item.y < info.height * 0.9)
          .map((item) => item.text).join('')).length;
        if (!info.usedOcr && !layout.answerPage && !layout.starts.length && bodyTextLength < 120 &&
          (layout.section || layouts.some((previous) => previous.starts.length))) {
          try {
            const retry = await extractPageItems(page, { forceOcr: true });
            const retryLayout = pageLayout(pageIndex, retry);
            if (retryLayout.starts.length || retry.items.length > info.items.length * 2) {
              info = retry;
              layout = retryLayout;
            }
          } catch (error) {
            issues.push({ code: error.code || 'OCR_RETRY_FAILED', severity: 'warning', page: pageIndex + 1,
              message: `${pageIndex + 1}페이지의 이미지 글자 인식을 확인하지 못했습니다: ${error.message}` });
          }
        }
        layouts.push(layout);
        if (info.usedOcr && info.items.length === 0) {
          issues.push({ code: 'OCR_EMPTY', severity: 'warning', page: pageIndex + 1, message: `${pageIndex + 1}페이지에서 글자를 읽지 못했습니다.` });
        }
      } catch (error) {
        issues.push({ code: error.code || 'PAGE_ANALYSIS_FAILED', severity: 'blocking', page: pageIndex + 1, message: `${pageIndex + 1}페이지 분석에 실패했습니다: ${error.message}` });
      } finally {
        if (page.cleanup) page.cleanup();
      }
      notify(options.onProgress, {
        stage: 'analyze', current: i + 1, total: pageIndexes.length, page: pageIndex + 1,
        percent: Math.round((i + 1) * 100 / pageIndexes.length),
        message: `${pageIndex + 1}페이지 분석 완료 (${i + 1}/${pageIndexes.length})`,
      });
    }
    const segmented = segmentLayouts(docId, entry.fileName, layouts, forcedSection);
    return { fileName: entry.fileName, docId, pageCount: entry.pageCount, sections: segmented.sections, issues: issues.concat(segmented.issues) };
  }

  async function analyze(file, options = {}) {
    const opened = await openDocument(file, options);
    const pages = Array.from({ length: opened.pageCount }, (_, index) => index);
    return analyzePages(opened.docId, pages, options);
  }

  async function analyzeRange(docId, range = {}) {
    const entry = documents.get(docId);
    if (!entry) throw namedError('DOCUMENT_NOT_FOUND', 'PDF를 다시 선택해 주세요.');
    const start = Math.floor(Number(range.startPage));
    const end = Math.floor(Number(range.endPage));
    if (!start || !end || start < 1 || end > entry.pageCount || end < start) {
      throw namedError('INVALID_RANGE', `페이지 범위는 1~${entry.pageCount} 안에서 지정해 주세요.`);
    }
    const pages = Array.from({ length: end - start + 1 }, (_, index) => start - 1 + index);
    return analyzePages(docId, pages, range, { name: clean(range.name) || '미분류', round: Number(range.round) || 1 });
  }

  function toBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(namedError('RENDER_FAILED', '문제 이미지를 만들지 못했습니다.')), 'image/png');
    });
  }

  async function renderCrop(entry, segment, scale) {
    const page = await entry.pdf.getPage(segment.pageIndex + 1);
    const viewport = page.getViewport({ scale });
    const full = global.document.createElement('canvas');
    full.width = Math.ceil(viewport.width);
    full.height = Math.ceil(viewport.height);
    try {
      await page.render({ canvasContext: full.getContext('2d', { alpha: false }), viewport }).promise;
      const sx = Math.floor(segment.x * full.width);
      const sy = Math.floor(segment.y * full.height);
      const sw = Math.max(1, Math.min(full.width - sx, Math.ceil(segment.w * full.width)));
      const sh = Math.max(1, Math.min(full.height - sy, Math.ceil(segment.h * full.height)));
      const cropped = global.document.createElement('canvas');
      cropped.width = sw;
      cropped.height = sh;
      cropped.getContext('2d').drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
      const url = URL.createObjectURL(await toBlob(cropped));
      renderedUrls.add(url);
      cropped.width = cropped.height = 0;
      return { url, width: sw, height: sh, pageIndex: segment.pageIndex };
    } finally {
      full.width = full.height = 0;
      if (page.cleanup) page.cleanup();
    }
  }

  function transformChoice(choice, segment, segmentIndex) {
    const x = clamp((choice.x - segment.x) / segment.w, 0, 1);
    const y = clamp((choice.y - segment.y) / segment.h, 0, 1);
    return {
      number: choice.number, segmentIndex,
      x, y,
      w: clamp(choice.w / segment.w, 0, 1 - x),
      h: clamp(choice.h / segment.h, 0, 1 - y),
    };
  }

  async function renderQuestion(question, options = {}) {
    const entry = documents.get(question?.docId);
    if (!entry) throw namedError('DOCUMENT_NOT_FOUND', '이 문제의 원본 PDF를 다시 선택해 주세요.');
    const segments = (question.sharedSegments || []).concat(question.segments || []);
    if (!segments.length) throw namedError('QUESTION_EMPTY', '이 문제에 표시할 영역이 없습니다.');
    const scale = clamp(Number(options.scale) || 1.7, 0.75, 3);
    const images = [];
    try {
      for (const segment of segments) images.push(await renderCrop(entry, segment, scale));
      const choices = (question.choices || []).map((choice) => {
        const segmentIndex = segments.findIndex((segment, index) => index >= (question.sharedSegments || []).length &&
          segment.pageIndex === choice.pageIndex && choice.x >= segment.x - 0.003 && choice.y >= segment.y - 0.003 &&
          choice.x <= segment.x + segment.w + 0.003 && choice.y <= segment.y + segment.h + 0.003);
        return segmentIndex < 0 ? null : transformChoice(choice, segments[segmentIndex], segmentIndex);
      }).filter(Boolean);
      return { segments: images, choices };
    } catch (error) {
      releaseRender({ segments: images });
      throw error;
    }
  }

  function releaseRender(rendered) {
    for (const image of rendered?.segments || []) {
      if (image.url && renderedUrls.delete(image.url)) URL.revokeObjectURL(image.url);
    }
  }

  async function dispose(docId) {
    for (const url of renderedUrls) URL.revokeObjectURL(url);
    renderedUrls.clear();
    const entries = docId ? [[docId, documents.get(docId)]] : [...documents.entries()];
    for (const [id, entry] of entries) {
      if (!entry) continue;
      documents.delete(id);
      await entry.pdf.destroy();
    }
    if (!docId && ocrWorkerPromise) {
      try { await (await ocrWorkerPromise).terminate(); } catch (_) { /* worker may already be gone */ }
      ocrWorkerPromise = null;
    }
  }

  global.PdfExamEngine = Object.freeze({
    getPdfJs, openDocument, analyze, analyzeRange, extractPageItems,
    getPageCount, renderQuestion, releaseRender, dispose,
  });
})(typeof window !== 'undefined' ? window : globalThis);
