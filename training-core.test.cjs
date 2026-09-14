const assert = require('node:assert/strict');
const {test} = require('node:test');
const C = require('./training-core');
const questions = [{id:'data_1',answer:2},{id:'lang_1',answer:3},{id:'math_1',answer:1}];

test('worksheet placeholder answers never inflate objective accuracy or slow counts',()=>{
  const attempts={data_1:{answer:2,seconds:52,skipped:true},lang_1:{seconds:8},math_1:{answer:1,seconds:300}};
  assert.deepEqual(C.summary(questions,attempts),{correct:1,wrong:0,unanswered:1,manual:1,slow:1,recovered:1,seconds:360,graded:2,accuracy:100});
  assert.equal(C.status(questions[2],attempts.math_1),'manual');
});
test('a correct but slow answer is reviewed; a completed worksheet is not',()=>{
  assert.equal(C.needsReview(questions[0],{status:'correct',slow:true}),true);
  assert.equal(C.needsReview(questions[2],{status:'done'}),false);
  assert.equal(C.needsReview(questions[2],{status:'retry'}),true);
  assert.equal(C.needsReview(questions[1],{status:'unanswered'}),true);
});
test('sampling favors unseen items, caps short sections and never duplicates questions',()=>{
  assert.deepEqual(C.choose(questions,20,{data_1:{count:2}},()=>.5),['lang_1','math_1','data_1']);
  assert.equal(new Set(C.choose(questions,20,{})).size,3);
  assert.equal(C.choose([],10,{}).length,0);
});
test('unanswered tests have no claimed accuracy and fresh attempts do not reuse answers',()=>{
  assert.equal(C.summary(questions,{}).accuracy,null);
  assert.equal(C.status(questions[0],{}),'unanswered');
  assert.equal(C.summary([questions[2]],{}).graded,0);
});
