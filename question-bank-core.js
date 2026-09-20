/* Canonical option IDs drive both visible answers and the existing numeric OMR. */
(function(root) {
  'use strict';
  function answer(question) {
    const option = question.options.find(o => o.id === question.answer_option_id);
    if (!option) throw new Error(`정답 보기 연결 없음: ${question.id}`);
    return option;
  }
  function validate(bank) {
    const optionIds = new Set();
    for (const [id,q] of Object.entries(bank.questions)) {
      if (id !== q.id || !q.stem || q.options.length !== 5) throw new Error(`문항 형식 오류: ${id}`);
      const numbers = new Set();
      for (const o of q.options) {
        if (optionIds.has(o.id) || numbers.has(o.number) || o.number < 1 || o.number > 5 || !o.text) throw new Error(`보기 형식 오류: ${id}`);
        optionIds.add(o.id); numbers.add(o.number);
      }
      answer(q);
      if (q.passage_id && !bank.passages[q.passage_id]) throw new Error(`공통 지문 연결 없음: ${id}`);
    }
    return bank;
  }
  function bind(data, bank) {
    validate(bank);
    const bound = new Set();
    for (const section of data.sections) for (const page of section.questions) {
      if (page.is_passage) continue;
      for (const sub of page.subQuestions) {
        const question = bank.questions[sub.id];
        if (!question || question.page_id !== page.id || bound.has(sub.id)) throw new Error(`문제/정답 연결 오류: ${sub.id}`);
        bound.add(sub.id);
        // These getters prevent a separately edited numeric answer from diverging.
        Object.defineProperty(sub,'answer',{configurable:true,enumerable:true,get:()=>answer(question).number});
        sub.text_question_id = question.id;
      }
      Object.defineProperty(page,'answer',{configurable:true,enumerable:true,get:()=>page.subQuestions[0].answer});
      page.text_binding = true;
    }
    if (bound.size !== Object.keys(bank.questions).length) throw new Error('화면에 연결되지 않은 문항이 있습니다.');
    return data;
  }
  const api = {answer,validate,bind};
  if (typeof module !== 'undefined') module.exports = api;
  else root.QuestionBankCore = api;
})(typeof window === 'undefined' ? globalThis : window);
