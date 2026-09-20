const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const data = require('./data/skct_data.js');
const pages = data.sections.flatMap(section => section.questions);

test('browser and JSON consumers use the same 299 source answers', () => {
  assert.deepEqual(data, JSON.parse(fs.readFileSync(`${__dirname}/data/skct_data.json`, 'utf8')));
  assert.equal(pages.flatMap(page => page.subQuestions).length, 299);
  const ids = pages.flatMap(page => page.subQuestions.map(q => q.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('every displayed question has its answer and all required solution pages', () => {
  for (const page of pages) {
    assert.ok(fs.existsSync(`${__dirname}/${page.solution_image.split('?')[0]}`));
    if (page.is_passage) continue;
    assert.equal(page.answer, page.subQuestions[0].answer);
    assert.deepEqual(page.solution_pages, [...new Set(page.subQuestions.flatMap(q => q.solution_pages))].sort((a,b) => a-b));
    for (const question of page.subQuestions) {
      assert.ok(question.answer >= 1 && question.answer <= 5);
      assert.ok(question.answer_key_page > 0);
    }
  }
});

test('cross-page solutions and case questions use the actual explanation pages', () => {
  const page = id => pages.find(q => q.id === id);
  assert.deepEqual(page('seq_p02').solution_pages, [111, 112]);
  assert.deepEqual(page('reason_p07').solution_pages, [76, 77]);
  assert.deepEqual(page('math_p14').solution_pages, [65]);
  assert.deepEqual(page('math_p28').solution_pages, [69, 70]);
});
