/* Shared, DOM-free training rules. Math entries are worksheets, not MCQs. */
(function (root) {
  'use strict';
  const manual = q => q.id.startsWith('math_');
  const status = (q, a = {}) => manual(q) ? (a.manual || 'manual') :
    a.answer == null ? 'unanswered' : a.answer === q.answer ? 'correct' : 'wrong';
  function summary(questions, attempts) {
    const out = {correct: 0, wrong: 0, unanswered: 0, manual: 0, slow: 0, recovered: 0, seconds: 0};
    questions.forEach(q => {
      const a = attempts[q.id] || {};
      if (manual(q)) out.manual++;
      else out[status(q, a)]++;
      if (!manual(q) && (a.seconds || 0) > 45) out.slow++;
      if (!manual(q) && a.skipped && status(q, a) === 'correct') out.recovered++;
      out.seconds += a.seconds || 0;
    });
    out.graded = questions.length - out.manual;
    out.accuracy = out.correct + out.wrong ? Math.round(out.correct / (out.correct + out.wrong) * 100) : null;
    return out;
  }
  function choose(questions, count, history, random = Math.random) {
    return questions.map(q => ({q, seen: history[q.id]?.count || 0, r: random()}))
      .sort((a,b) => a.seen - b.seen || a.r - b.r).slice(0,count).map(x => x.q.id);
  }
  function needsReview(q, record) {
    return !!record && !!(['wrong','unanswered','retry'].includes(record.status) || record.slow || record.flagged);
  }
  const api = {manual, status, summary, choose, needsReview};
  if (typeof module !== 'undefined') module.exports = api;
  else root.TrainingCore = api;
})(typeof window === 'undefined' ? globalThis : window);
