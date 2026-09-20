// Publish edits to the canonical text bank without re-extracting the PDFs.
const fs=require('node:fs');
const path=require('node:path');
const Core=require('./question-bank-core');
const file=path.join(__dirname,'data/question-bank.json');
const bank=JSON.parse(fs.readFileSync(file,'utf8'));
Core.validate(bank);
Core.bind(structuredClone(require('./data/skct_data')),bank);
const lines=['# SKCT 텍스트 문제·정답 목록','','편집 기준: question-bank.json. 이 문서는 읽기용 출력입니다.',''];
for(const q of Object.values(bank.questions)){
  const answer=Core.answer(q);q.answer_text=answer.text;
  lines.push(`## ${q.title} [${q.id}]`,'',q.stem,'');
  if(q.passage_id)lines.push(bank.passages[q.passage_id].text,'');
  lines.push(q.context,'');
  for(const t of q.tables||[]){lines.push(t.caption,t.headers.join(' | '),...t.rows.map(r=>r.join(' | ')),t.notes||'','');}
  if(q.figure_description)lines.push(q.figure_description,'');
  if(q.layout_mode==='spatial_text')lines.push('※ 도형·분수·표의 배치는 앱의 텍스트 도형에서 확인하세요.','');
  lines.push(...q.options.map(o=>`${o.number}. ${o.text}`),'',`정답: ${answer.number}번 — ${answer.text}`,
    `유형: ${q.analysis.type}`,`원본 문제 PDF: ${(q.source.question_pages||[q.source.question_page]).join(', ')}p`,'');
}
const json=JSON.stringify(bank,null,2);
fs.writeFileSync(file,json+'\n');
fs.writeFileSync(path.join(__dirname,'data/question-bank.js'),'const SKCT_QUESTION_BANK = '+json+';\nif (typeof module !== "undefined") module.exports = SKCT_QUESTION_BANK;\n');
fs.writeFileSync(path.join(__dirname,'data/question-bank.md'),lines.join('\n'));
console.log(`Built ${Object.keys(bank.questions).length} text questions with ID-bound answers.`);
