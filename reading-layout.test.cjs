const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const layout=require('./text-layout-core');
const library=require('./source-library');
const bank=require('./data/question-bank');
const data=require('./data/skct_data');
const chars=text=>text.replace(/\s/g,'');
test('reflow repairs reviewed split words and preserves distinct paragraphs and conditions',()=>{
  assert.equal(layout.inline('수능제\n도가 학생들의 학습 태도를 강화한다.'),'수능제도가 학생들의 학습 태도를 강화한다.');
  assert.equal(layout.inline('여러\n가지 논거를 이를\n통해 확인한다.'),'여러 가지 논거를 이를 통해 확인한다.');
  assert.deepEqual(layout.paragraphs('전제\n모든 학생은 교복을 입는다.\n결론\n학생은 교복을 입는다.'),['전제','모든 학생은 교복을 입는다.','결론','학생은 교복을 입는다.']);
  assert.deepEqual(layout.paragraphs('① 첫 번째 보기의\n설명이다.\n② 두 번째 보기의 설명이다.'),['① 첫 번째 보기의 설명이다.','② 두 번째 보기의 설명이다.']);
  assert.deepEqual(layout.paragraphs('[조건]\n• A는\n찌개를 주문한다.\n• B는 밥을 주문한다.'),['[조건]','• A는 찌개를 주문한다.','• B는 밥을 주문한다.']);
});
test('reflow preserves every non-whitespace character across all question and solution text',()=>{
 const fields=Object.values(bank.questions).flatMap(q=>[q.stem,q.context,...q.options.map(o=>o.text),q.explanation?.text]).concat(Object.values(bank.passages).map(p=>p.text)).filter(Boolean);
 for(const text of fields){assert.equal(chars(layout.inline(text)),chars(text));assert.equal(chars(layout.paragraphs(text).join(' ')),chars(text));}
});
test('source library includes all 168 groups with original question and explanation bindings',()=>{
 const items=library.entries(data),pages=data.sections.flatMap(s=>s.questions);
 assert.equal(items.length,168);assert.equal(new Set(items.map(i=>i.id)).size,168);
 for(const item of items){const page=pages.find(p=>p.id===item.id);assert.equal(item.questionImage,page.image);assert.deepEqual(item.solutionPages,page.solution_pages);assert.ok(fs.existsSync(item.questionImage.split('?')[0]));if(!item.isPassage){assert.equal(item.solutionImage,page.solution_image);assert.ok(fs.existsSync(item.solutionImage.split('?')[0]));}}
});
test('source library filters by subject, question number and handles empty searches',()=>{
 const items=library.entries(data);
 assert.equal(library.filter(items,'data','자료해석 30번')[0].id,'data_30');
 assert.equal(library.filter(items,'lang','자료해석').length,0);
 assert.equal(library.filter(items,'all','없는자료').length,0);
 assert.equal(library.filter(items,'all','').length,168);
});
