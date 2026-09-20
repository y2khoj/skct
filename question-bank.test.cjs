const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const bank=require('./data/question-bank');
const data=require('./data/skct_data');
const Core=require('./question-bank-core');

test('all 299 questions and 1495 options are unique and bound to source keys',()=>{
  Core.validate(bank);
  assert.equal(Object.keys(bank.questions).length,299);
  assert.deepEqual(bank,JSON.parse(fs.readFileSync(`${__dirname}/data/question-bank.json`,'utf8')));
  let count=0;
  for(const p of data.sections.flatMap(s=>s.questions))for(const q of p.subQuestions){
    assert.equal(Core.answer(bank.questions[q.id]).number,q.answer,q.id);
    assert.equal(bank.questions[q.id].source.answer_key_page,q.answer_key_page);
    count+=bank.questions[q.id].options.length;
  }
  assert.equal(count,1495);
});
test('editing the canonical option or correct ID updates the displayed answer and OMR key together',()=>{
  const b=structuredClone(bank),d=structuredClone(data);Core.bind(d,b);
  const page=d.sections[0].questions[0],question=b.questions[page.subQuestions[0].id];
  question.options[0].text='수정된 보기';question.answer_option_id=question.options[0].id;
  assert.equal(page.answer,1);assert.equal(page.subQuestions[0].answer,1);
  assert.equal(Core.answer(question).text,'수정된 보기');
});
test('missing answer IDs, duplicate options and unmatched questions fail closed',()=>{
  let b=structuredClone(bank);b.questions.data_1.answer_option_id='missing';assert.throws(()=>Core.validate(b));
  b=structuredClone(bank);b.questions.data_1.options[0].id=b.questions.data_1.options[1].id;assert.throws(()=>Core.validate(b));
  b=structuredClone(bank);delete b.questions.data_1;assert.throws(()=>Core.bind(structuredClone(data),b));
});
test('PSAT shared passages travel with all four dependent questions',()=>{
  for(const n of [8,9,12,13]){
    const q=bank.questions[`lang_psat_${n}`];assert.ok(bank.passages[q.passage_id].text.length>300);
  }
});
test('missing page 84 choices, source label typo and fractional choices stay repaired',()=>{
  const q=bank.questions.data_30;
  assert.deepEqual(q.source.question_pages,[83,84]);assert.ok(q.options[0].text.includes('287,824'));
  assert.equal(Core.answer(q).number,5);assert.ok(Core.answer(q).text.includes('증가 분야'));
  assert.equal(bank.questions.data_15.options[4].number,5);
  assert.equal(bank.questions.seq_31.options[0].text,'11/4');
  for(const n of [23,24])assert.ok(bank.questions[`seq_${n}`].options.every(o=>o.text&&o.diagram));
});
test('independent solving is not falsely claimed by future-authoring metadata',()=>{
  for(const q of Object.values(bank.questions)){
    assert.equal(q.analysis.generation_ready,false);
    assert.ok(q.analysis.type&&q.analysis.next_validation);
  }
});
