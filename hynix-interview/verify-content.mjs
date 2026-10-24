import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context={window:{}};
vm.createContext(context);
for(const name of ['packaging','memory','questions','industry','curriculum','coaching','cases-packaging','cases-analysis','deepdives','process-foundations','process-advanced','process-interviews','process-map','cases-process']){
  vm.runInContext(readFileSync(new URL(`./content/${name}.js`,import.meta.url),'utf8'),context);
}
const {PACKAGING_LESSONS:p,MEMORY_LESSONS:m,QUESTION_TREES:baseTrees,EVIDENCE_CARDS:evidence,INDUSTRY_CARDS:industry}=context.window;
const lessons=[...p,...m,...context.window.PROCESS_FOUNDATION_LESSONS,...context.window.PROCESS_ADVANCED_LESSONS];
const trees=[...baseTrees,...context.window.PROCESS_QUESTION_TREES];
assert.equal(lessons.length,26);
assert.equal(new Set(lessons.map(x=>x.id)).size,26);
assert.equal(trees.length,14);
assert.equal(trees.reduce((n,t)=>n+t.levels.length,0),70);
assert.equal(trees.reduce((n,t)=>n+t.branches.length,0),28);
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
const cases=[...w.PACKAGING_CASES,...w.ANALYSIS_CASES,...w.PROCESS_CASES];
const caseIDs=new Set(cases.map(c=>c.id)),evidenceIDs=new Set(evidence.map(c=>c.id));
assert.equal(caseIDs.size,8);
assert.equal(Object.keys(w.LESSON_GUIDANCE).length,26);
assert.equal(Object.keys(w.INTERVIEW_COACHING).length,14);
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
assert.equal(w.LEARNING_PATHS.length,3);
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
console.log('Verified: 26 lessons, 98 questions, 8 complete cases, 3 routes, 14 coaching guides, references and numerical checks.');

assert.deepEqual(Object.keys(w.STAGE_DEEPDIVES).sort(),['T1-L2','T4-L2','T9-L1','T9-L2']);
for(const [key,d]of Object.entries(w.STAGE_DEEPDIVES)){
 const [id,stage]=key.split('-L');assert.ok(treeIDs.has(id)&&Number(stage)>=1&&Number(stage)<=5,key);
 assert.ok(d.explanation.length>=3&&d.formula&&d.example&&d.limits,key);
 assert.ok(d.sources.length&&d.sources.every(s=>new URL(s.url).protocol==='https:'),key);
}
assert.ok(Math.abs(1.2**3-1.728)<1e-12);
assert.ok(Math.abs(Math.acos(.2/.4)*180/Math.PI-60)<1e-12);
assert.equal((500-380)/(500-300),.6);
assert.equal(100*.01/.05,20);
assert.equal(20/40,.5);
assert.ok(Math.abs(.5*30e-6/1.5e-5-1)<1e-12);
assert.ok(Math.abs(.5*900e-6/1.5e-5-30)<1e-12);
console.log('Verified: 4 stage-specific deep dives, source targets and example calculations.');

// The process extension must point to existing lessons and source chapters.
const chapters=new Set(w.PACKAGINGBOOK.chapters.map(x=>x[0]));
assert.equal(chapters.size,17);
for(const item of [...w.PROCESS_FOUNDATION_LESSONS,...w.PROCESS_ADVANCED_LESSONS,...w.PROCESS_QUESTION_TREES,...w.PROCESS_CASES]){
 assert.ok(item.sourceChapters.length&&item.sourceChapters.every(s=>chapters.has(s)),item.id);
}
assert.equal(w.PROCESS_FLOWS.length,3);
for(const f of w.PROCESS_FLOWS){
 assert.equal(f.steps.length,6,f.id);
 for(const s of f.steps)assert.ok(lessonIDs.has(s.lesson)&&s.purpose&&s.window&&s.failure&&s.cae&&s.question,f.id);
}
const pass=.95*.995+.05*.01,q=.95*.995/pass;
assert.ok(Math.abs(pass-.94575)<1e-12);
assert.ok(Math.abs((1-q)*1e6-528.680941)<1e-5);
assert.ok(Math.abs(q**8*.98-.9758628029)<1e-9);
assert.ok(Math.abs((.9/.905)**4-.978083)<1e-6);
assert.ok(Math.abs((.9/.901)**8*.98-.9713323)<1e-6);
assert.equal((1000/20)**2/(1000/40)**2,4);
assert.ok(Math.abs(.01/(Math.PI*(10e-4)**2/4)-12732.395447)<1e-5);
assert.equal((50/100)**3,.125);assert.equal((100/50)**2,4);
assert.equal(12*2**2*2,96);assert.equal(96*.5,48);
assert.equal(2*10000/(2+2),5000);assert.equal(2e6/(40**2),1250);
assert.ok(Math.abs(50e-12/(1e-9)-.05)<1e-12);
assert.ok(Math.abs(1/(2*Math.PI*Math.sqrt(.5e-9*100e-9))/1e6-22.5079079)<1e-6);
console.log('Verified: 17 source chapters, 3 process flows, conditional yield, pitch/current density, plate and PDN examples.');
