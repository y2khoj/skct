import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context={window:{}};
vm.createContext(context);
for(const name of ['packaging','memory','questions','industry']){
  vm.runInContext(readFileSync(new URL(`./content/${name}.js`,import.meta.url),'utf8'),context);
}
const {PACKAGING_LESSONS:p,MEMORY_LESSONS:m,QUESTION_TREES:trees,EVIDENCE_CARDS:evidence,INDUSTRY_CARDS:industry}=context.window;
const lessons=[...p,...m];
assert.equal(lessons.length,18);
assert.equal(new Set(lessons.map(x=>x.id)).size,18);
assert.equal(trees.length,10);
assert.equal(trees.reduce((n,t)=>n+t.levels.length,0),50);
assert.equal(trees.reduce((n,t)=>n+t.branches.length,0),20);
assert.equal(evidence.length,8);
assert.equal(industry.length,6);
const lessonIDs=new Set(lessons.map(x=>x.id)),treeIDs=new Set(trees.map(x=>x.id));
for(const l of lessons){
  assert.ok(l.title&&l.summary&&l.duration>0,l.id);
  assert.ok(l.sections.length>=3,l.id);
  assert.ok(l.sections.every(s=>s.title&&s.body.length>=70),l.id);
  assert.equal(l.quiz.options.length,4,l.id);
  assert.ok(Number.isInteger(l.quiz.answer)&&l.quiz.answer>=0&&l.quiz.answer<4,l.id);
  assert.ok(l.quiz.explanation,l.id);
  assert.ok(l.related.every(x=>treeIDs.has(x)),l.id);
  assert.ok(l.sources.every(s=>new URL(s.url).protocol==='https:'),l.id);
}
for(const t of trees){
  assert.equal(t.levels.length,5,t.id);
  assert.equal(t.branches.length,2,t.id);
  assert.ok(t.levels.every((l,i)=>l.level===i+1&&l.checkpoints.length>=2),t.id);
  assert.ok(t.relatedLessons.every(x=>lessonIDs.has(x)),t.id);
}
for(const c of evidence){
  assert.ok(c.fields.length>=3,c.id);
  assert.equal(new Set(c.fields.map(f=>f.key)).size,c.fields.length,c.id);
}
for(const c of industry){
  assert.ok(c.date<='2026-10-17',c.id);
  assert.ok(c.facts.length>=2&&c.implications.length>=2&&c.uncertainty,c.id);
  assert.ok(c.scenario.base&&c.scenario.upside&&c.scenario.downside,c.id);
  assert.equal(new URL(c.source.url).protocol,'https:',c.id);
}
console.log('Content verified: 18 lessons, 70 questions, 8 evidence cards, 6 industry cards.');
