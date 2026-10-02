(function (global) {
  "use strict";

  const CHOICE_MAP = { "①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5,
    "❶": 1, "❷": 2, "❸": 3, "❹": 4, "❺": 5 };
  const SECTION_NAMES = [
    "언어이해", "자료해석", "언어추리", "수리추리", "수열추리",
    "응용수리", "응용계산", "창의수리", "공간지각", "실행역량", "심층역량",
    "인지역량", "수리영역", "언어영역", "추리영역"
  ];

  function clean(value) {
    return String(value ?? "").replace(/[\u00a0\u200b\u2060]/g, " ")
      .replace(/[ \t]+/g, " ").trim();
  }

  function sectionName(value) {
    const text = clean(value).replace(/\s/g, "");
    if (!text) return "";
    const aliases = { lang: "언어이해", data: "자료해석", reason: "언어추리",
      seq: "수열추리", math: "응용수리" };
    if (aliases[text]) return aliases[text];
    const found = SECTION_NAMES.find(name => text.includes(name));
    if (found) return found;
    if (/^언어$/.test(text)) return "언어이해";
    if (/^자료$/.test(text)) return "자료해석";
    if (/^수열$/.test(text)) return "수열추리";
    return text.length <= 12 ? text : "";
  }

  function roundName(value) {
    if (value == null || value === "") return "";
    const text = clean(value);
    if (/^\d+$/.test(text)) return String(Number(text));
    const match = text.match(/(?:제\s*)?(\d{1,2})\s*(?:회차|회|차|모의고사)/);
    return match ? String(Number(match[1])) : "";
  }

  function keyOf(round, section, number) {
    return `${roundName(round)}|${sectionName(section)}|${Number(number)}`;
  }

  function choiceOf(value) {
    const text = clean(value);
    if (Object.prototype.hasOwnProperty.call(CHOICE_MAP, text)) return CHOICE_MAP[text];
    if (/^[1-5]$/.test(text)) return Number(text);
    return null;
  }

  function buildLines(items, width, side) {
    const mid = width / 2;
    const selected = (items || []).filter(item => {
      const value = clean(item.text);
      if (!value) return false;
      if (side === "left") return Number(item.x) < mid && Number(item.x) + Number(item.w || 0) <= mid + 10;
      if (side === "right") return Number(item.x) >= mid - 10;
      return true;
    }).map(item => ({
      text: clean(item.text), x: Number(item.x) || 0,
      y: Number(item.y) || 0, w: Number(item.w) || 0,
      h: Number(item.h) || 10
    })).sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const item of selected) {
      const tolerance = Math.max(3, Math.min(7, item.h * 0.45));
      let line = lines[lines.length - 1];
      if (!line || Math.abs(line.y - item.y) > tolerance) {
        line = { y: item.y, x: item.x, items: [] };
        lines.push(line);
      }
      line.items.push(item);
    }
    return lines.map(line => {
      line.items.sort((a, b) => a.x - b.x);
      let text = "";
      let right = null;
      for (const item of line.items) {
        const gap = right == null ? 0 : item.x - right;
        text += (text && gap > Math.max(2, item.h * 0.12) ? " " : "") + item.text;
        right = Math.max(right ?? 0, item.x + item.w);
      }
      return { text: clean(text), y: line.y, x: line.x };
    });
  }

  function pageContext(lines, prior) {
    const next = { section: prior?.section || "", round: prior?.round || "" };
    const top = lines.filter(line => line.y <= Math.max(170, (lines.at(-1)?.y || 0) * 0.23));
    for (const line of top) {
      const text = line.text;
      const round = roundName(text);
      if (round) next.round = round;
      if (text.length <= 55 && !/^[①②③④⑤]/.test(text)) {
        const section = SECTION_NAMES.find(name => text.replace(/\s/g, "").includes(name));
        if (section) next.section = section;
      }
    }
    return next;
  }

  function parseColumn(lines, pageNumber, context, isAnswerPage) {
    const candidates = [];
    const headerLineIndexes = [];
    const direct = /(?:^|\s)(\d{1,3})\s*(?:번|[.)])\s*([①②③④⑤❶❷❸❹❺1-5])(?=$|\s|[.,;:])/g;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const text = line.text;
      const matches = [...text.matchAll(direct)];
      if (matches.length) {
        for (const match of matches) {
          const number = Number(match[1]);
          const answer = choiceOf(match[2]);
          if (number < 1 || number > 300 || !answer) continue;
          candidates.push({ number, answer, page: pageNumber, lineIndex: index,
            section: context.section, round: context.round,
            confidence: match[2] in CHOICE_MAP ? 0.92 : 0.78,
            kind: matches.length === 1 ? "header" : "table", explanation: "" });
          if (matches.length === 1) headerLineIndexes.push(index);
        }
        continue;
      }
      const bareInline = isAnswerPage && text.match(/^(\d{1,3})\s+([①②③④⑤❶❷❸❹❺])$/);
      if (bareInline) {
        candidates.push({ number: Number(bareInline[1]), answer: choiceOf(bareInline[2]),
          page: pageNumber, lineIndex: index, section: context.section,
          round: context.round, confidence: 0.8, kind: "table", explanation: "" });
        continue;
      }
      // Many printed answer keys put the question number and circled answer on
      // separate rows. A single isolated pair is too easy to confuse with prose.
      if (isAnswerPage && /^\d{1,3}$/.test(text) && index + 1 < lines.length) {
        const next = lines[index + 1];
        const answer = choiceOf(next.text);
        if (answer && next.y - line.y < 32) {
          candidates.push({ number: Number(text), answer, page: pageNumber,
            lineIndex: index, section: context.section, round: context.round,
            confidence: 0.8, kind: "table", explanation: "" });
        }
      }
      // Some keys use one row of "1번 2번 ..." above one row of "⑤ ④ ...".
      const numberTokens = [...text.matchAll(/(\d{1,3})\s*번/g)].map(match => Number(match[1]));
      if (isAnswerPage && numberTokens.length >= 3 && index + 1 < lines.length) {
        const values = lines[index + 1].text.match(/[①②③④⑤❶❷❸❹❺1-5]/g) || [];
        if (values.length === numberTokens.length && lines[index + 1].y - line.y < 35) {
          numberTokens.forEach((number, position) => candidates.push({
            number, answer: choiceOf(values[position]), page: pageNumber,
            lineIndex: index, section: context.section, round: context.round,
            confidence: 0.82, kind: "table", explanation: ""
          }));
        }
      }
    }
    // A solution page is often two columns headed "1. ⑤" with the detailed
    // explanation underneath. Keep text only from the same column.
    for (const entry of candidates) {
      if (entry.kind !== "header" || headerLineIndexes.length > 12) continue;
      const nextHeader = headerLineIndexes.find(index => index > entry.lineIndex) ?? lines.length;
      const body = lines.slice(entry.lineIndex + 1, nextHeader)
        .filter(line => line.text && !/^(?:\d{1,3}|온라인 SKCT|[①②③④⑤]\s*$)/.test(line.text))
        .map(line => line.text);
      const explanation = clean(body.join("\n"));
      if (explanation.length >= 15) entry.explanation = explanation.slice(0, 8000);
    }
    return candidates;
  }

  function parsePageItems(pageData, pageNumber, priorContext = {}) {
    const width = Number(pageData.width) || 600;
    const allLines = buildLines(pageData.items, width, "all");
    const context = pageContext(allLines, priorContext);
    const isAnswerPage = /정답|해설|답안|answer\s*key/i.test(allLines.slice(0, 18).map(line => line.text).join(" "));
    const left = buildLines(pageData.items, width, "left");
    const right = buildLines(pageData.items, width, "right");
    const columns = right.length >= 2 && left.length >= 2 ? [left, right] : [allLines];
    let entries = columns.flatMap(lines => parseColumn(lines, pageNumber, context, isAnswerPage));
    if (columns.length > 1) {
      // Five-column answer tables span the whole page; splitting at the center
      // would otherwise lose the first two cells of each row.
      entries.push(...parseColumn(allLines, pageNumber, context, isAnswerPage)
        .filter(entry => entry.kind === "table"));
    }
    // Answer tables can repeat a number in two OCR passes or in a page header.
    const unique = new Map();
    for (const entry of entries) {
      const key = `${entry.number}:${entry.answer}:${entry.page}`;
      const old = unique.get(key);
      if (!old || entry.explanation.length > old.explanation.length) unique.set(key, entry);
    }
    entries = [...unique.values()];
    if (!isAnswerPage && entries.length < 3) entries = [];
    return { entries, context, usedOcr: !!pageData.usedOcr,
      textFound: allLines.length > 0 };
  }

  function mergeEntry(result, candidate) {
    const baseKey = keyOf(candidate.round, candidate.section, candidate.number);
    const entry = {
      number: candidate.number, answer: candidate.answer,
      explanation: candidate.explanation || "", section: candidate.section || "",
      round: candidate.round || "", sourcePages: [candidate.page],
      confidence: candidate.confidence, source: "pdf"
    };
    const old = result.answers[baseKey];
    if (!old) {
      result.answers[baseKey] = entry;
      return;
    }
    if (old.answer === entry.answer) {
      old.sourcePages = [...new Set([...old.sourcePages, candidate.page])];
      if (entry.explanation.length > old.explanation.length) old.explanation = entry.explanation;
      old.confidence = Math.max(old.confidence, entry.confidence);
      return;
    }
    // Do not silently choose a value when two publisher sections reuse a number.
    const conflictKey = `${baseKey}|page${candidate.page}`;
    result.answers[conflictKey] = entry;
    result.issues.push({ type: "conflicting_answers", page: candidate.page,
      number: candidate.number, section: candidate.section || "",
      message: `${candidate.number}번 정답이 여러 값으로 추출되었습니다. 직접 확인해 주세요.` });
  }

  function questionIdentity(question) {
    return {
      number: Number(question?.number ?? question?.num),
      section: sectionName(question?.section ?? question?.sectionName ??
        question?.sectionId ?? question?.section_id ?? ""),
      round: roundName(question?.round ?? question?.roundNumber ?? question?.roundName ?? "")
    };
  }

  function match(result, question) {
    const wanted = questionIdentity(question);
    if (!Number.isInteger(wanted.number) || wanted.number < 1) return null;
    const candidates = Object.values(result?.answers || {}).filter(entry => {
      if (Number(entry.number) !== wanted.number) return false;
      if (wanted.section && entry.section && sectionName(entry.section) !== wanted.section) return false;
      if (wanted.round && entry.round && roundName(entry.round) !== wanted.round) return false;
      return true;
    });
    if (!candidates.length) return null;
    const ranked = candidates.map(entry => ({ entry,
      score: (wanted.section && sectionName(entry.section) === wanted.section ? 2 : 0) +
        (wanted.round && roundName(entry.round) === wanted.round ? 2 : 0) +
        (entry.source === "manual" ? 10 : 0)
    })).sort((a, b) => b.score - a.score);
    const best = ranked.filter(item => item.score === ranked[0].score).map(item => item.entry);
    return best.length === 1 ? best[0] : null;
  }

  function correct(result, question, answer, explanation = "") {
    const identity = questionIdentity(question);
    const numericAnswer = choiceOf(answer);
    if (!Number.isInteger(identity.number) || !numericAnswer) {
      throw new Error("문제 번호와 1~5번 정답을 확인해 주세요.");
    }
    const key = keyOf(identity.round, identity.section, identity.number);
    result.answers[key] = {
      number: identity.number, answer: numericAnswer,
      explanation: clean(explanation), section: identity.section,
      round: identity.round, sourcePages: [], confidence: 1, source: "manual"
    };
    return result.answers[key];
  }

  async function getPdfJs() {
    if (global.PdfExamEngine?.getPdfJs) return global.PdfExamEngine.getPdfJs();
    if (global.pdfjsLib?.getDocument) return global.pdfjsLib;
    return import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs");
  }

  async function fallbackPageItems(page) {
    const viewport = page.getViewport({ scale: 1 });
    const text = await page.getTextContent();
    const items = text.items.map(item => {
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      return { text: item.str, x, y: y - Math.abs(item.height || 10),
        w: item.width || 0, h: Math.abs(item.height || 10) };
    });
    return { items, width: viewport.width, height: viewport.height, usedOcr: false };
  }

  async function extract(file, options = {}) {
    if (!file?.arrayBuffer) throw new TypeError("PDF 파일을 선택해 주세요.");
    const pdfjs = await getPdfJs();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const task = pdfjs.getDocument({ data: bytes, password: options.password || undefined,
      useSystemFonts: true });
    let pdf;
    try {
      pdf = await task.promise;
    } catch (error) {
      if (error?.name === "PasswordException" || error?.code === 1 || error?.code === 2) {
        const wrapped = new Error("PDF 암호가 필요하거나 입력한 암호가 맞지 않습니다.");
        wrapped.code = "PASSWORD_REQUIRED";
        throw wrapped;
      }
      throw error;
    }
    const result = { answers: {}, issues: [] };
    let context = {};
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        options.onProgress?.({ page: pageNumber, total: pdf.numPages, phase: "answers" });
        try {
          const page = await pdf.getPage(pageNumber);
          let pageData = global.PdfExamEngine?.extractPageItems
            ? await global.PdfExamEngine.extractPageItems(page, { ocr: true })
            : await fallbackPageItems(page);
          let parsed = parsePageItems(pageData, pageNumber, context);
          if (!parsed.entries.length && !parsed.usedOcr && pageData.items.length < 20 &&
              global.PdfExamEngine?.extractPageItems) {
            pageData = await global.PdfExamEngine.extractPageItems(page, { forceOcr: true });
            parsed = parsePageItems(pageData, pageNumber, context);
          }
          context = parsed.context;
          for (const candidate of parsed.entries) mergeEntry(result, candidate);
          if (!parsed.textFound) result.issues.push({ type: "no_text", page: pageNumber,
            message: `${pageNumber}쪽에서 글자를 읽지 못했습니다.` });
          page.cleanup?.();
        } catch (error) {
          result.issues.push({ type: "page_error", page: pageNumber,
            message: `${pageNumber}쪽 분석 실패: ${error.message || error}` });
        }
      }
      if (!Object.keys(result.answers).length) result.issues.push({ type: "no_answers",
        message: "정답을 찾지 못했습니다. PDF가 정답·해설 파일인지 확인해 주세요." });
      return result;
    } finally {
      await task.destroy();
    }
  }

  global.PdfAnswerEngine = { extract, parsePageItems, match, correct, keyOf };
})(window);
