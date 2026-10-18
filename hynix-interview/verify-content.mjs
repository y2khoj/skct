import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context={window:{}};
vm.createContext(context);
for(const name of ['packaging','memory','questions','industry','curriculum','coaching','cases-packaging','cases-analysis']){
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


const w=context.window;
const cases=[...w.PACKAGING_CASES,...w.ANALYSIS_CASES];
const caseIDs=new Set(cases.map(c=>c.id)),evidenceIDs=new Set(evidence.map(c=>c.id));
assert.equal(caseIDs.size,6);
assert.equal(Object.keys(w.LESSON_GUIDANCE).length,18);
assert.equal(Object.keys(w.INTERVIEW_COACHING).length,10);
assert.equal(w.SCORE_RUBRIC.length,5);
assert.ok(w.SCORE_RUBRIC.every(r=>r.levels.length===3&&r.levels.every(x=>x.length>15)));
for(const c of cases){
  assert.ok(lessonIDs.has(c.lessonId),c.id);
  assert.ok(c.objectives.length>=2&&c.assumptions.length>=3,c.id);
  assert.ok(c.given.headers.length>=2&&c.given.rows.length>=2,c.id);
  assert.ok(c.given.rows.every(row=>row.length===c.given.headers.length),c.id);
  assert.ok(c.steps.length>=3&&c.steps.every(s=>s.title&&s.body),c.id);
  for(const s of c.steps)if(s.table)assert.ok(s.table.rows.every(row=>row.length===s.table.headers.length),c.id);
  assert.equal(c.challenge.options.length,4,c.id);
  assert.ok(Number.isInteger(c.challenge.answer)&&c.challenge.answer>=0&&c.challenge.answer<4,c.id);
  assert.ok(c.challenge.options.every(o=>o.text&&o.feedback.length>25),c.id);
  assert.equal(c.branches.length,2,c.id);
  assert.equal(new Set(c.branches.map(b=>b.id)).size,2,c.id);
  assert.ok(c.branches.every(b=>b.observation&&b.interpretation&&b.nextAction),c.id);
  assert.notEqual(c.branches[0].nextAction,c.branches[1].nextAction,c.id);
  assert.ok(treeIDs.has(c.interview.treeId)&&c.interview.step>=1&&c.interview.step<=5,c.id);
  assert.ok(c.evidenceIds.every(x=>evidenceIDs.has(x)),c.id);
  assert.ok(c.sources.length>=1&&c.sources.every(s=>new URL(s.url).protocol==='https:'),c.id);
}
function checkTarget(s){
  const ids={lesson:lessonIDs,case:caseIDs,practice:treeIDs,evidence:evidenceIDs,industry:new Set(industry.map(c=>c.id))};
  assert.ok(ids[s.kind]?.has(s.id),`Broken target: ${s.kind}/${s.id}`);
}
assert.equal(w.LEARNING_PATHS.length,2);
for(const p of w.LEARNING_PATHS)p.steps.forEach(checkTarget);
for(const [id,g]of Object.entries(w.LESSON_GUIDANCE)){
  assert.ok(lessonIDs.has(id)&&g.prerequisites.every(x=>lessonIDs.has(x)),id);
  assert.ok(g.caseIds.every(x=>caseIDs.has(x)),id);checkTarget(g.next);
}
for(const [id,c]of Object.entries(w.INTERVIEW_COACHING)){
  assert.ok(treeIDs.has(id)&&c.levelGuidance.length===5,id);
  assert.ok(c.example.text.length>=300&&c.factBoundary.length>20,id);
  assert.ok(c.caseIds.every(x=>caseIDs.has(x))&&c.evidenceIds.every(x=>evidenceIDs.has(x)),id);
  for(const b of Object.values(c.followups))assert.ok(b.trigger&&b.repair&&b.reasoning.length>=3&&b.backTo.every(x=>lessonIDs.has(x)),id);
  assert.notEqual(c.followups.A.trigger,c.followups.B.trigger,id);
}
vm.runInContext(readFileSync(new URL('./assets/technical-diagrams.js',import.meta.url),'utf8'),context);
for(const id of ['M2','M4','P4','P6'])assert.ok(w.LEARNING_DIAGRAMS[id]().includes('aria-label='),id);
assert.ok(w.LEARNING_DIAGRAMS.M2().includes('문턱전압'));
assert.ok(!w.LEARNING_DIAGRAMS.M2().includes('REFRESH'));
assert.ok(Math.abs(Math.pow(.8,-1.5)-1.39754248594)<1e-9);
assert.equal(2048*6/8,1536);
assert.equal(800*20/1000,16);
assert.equal((5+1)*(5+2)/2,21);
console.log('Verified: 18 lessons, 70 questions, 6 complete cases, 2 routes, 10 coaching guides, references and numerical checks.');
