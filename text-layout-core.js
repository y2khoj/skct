/* Display-only text reflow. Canonical wording and answer bindings remain unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SKCTTextLayout=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // These line-boundary fragments were reviewed against intact words in the source corpus.
  const joinedFragments=new Set(["가|능하므로", "가|능한", "가|지", "가|지이다", "가지이|다", "가평균|을", "같|은", "개|발에", "거|주하는", "거|주하지", "거주하|지", "거짓이|라면", "검토한|다", "검토해|야", "것|을", "것|이", "경|우", "경|우는", "고등학|생이", "고양|이를", "곱|하면", "관|련", "관계|를", "교|육을", "군|을", "규|칙을", "규|칙이다", "규칙이|다", "기|관", "기|술도입액은", "기술도|입액이", "기울|기가", "나|와야", "나누|면", "나온|다", "남는|다", "넘|으므로", "년|은", "년|이", "높으므|로", "다르|다", "다음|과", "다음으|로", "단|위로", "대|비", "대각|선에", "된|다", "들|어갈", "들어|갈", "등|이다", "따|라서", "따|르면", "때|문이다", "때|의", "때문|에", "똑같|고", "라인|이", "만|나게", "만|들어졌다", "만나|기만", "많았|고", "맞|는", "먹|을", "무|조건", "문|제를", "문장|에서", "미국|에", "바탕으|로", "밖|에", "발명|청", "배분|을", "번|은", "번|이", "번째이|므로", "범인|이", "보|기", "보|기이다", "보기|이다", "보기|인", "보기이|다", "부|분을", "부|족하다", "부분|에", "부분|을", "부족|하므로", "부족하|고", "부족하|므로", "분모|로", "비|용은", "비|중이", "비교하|면", "비율|임", "빈|칸에", "사|이에", "생각하|면", "성|과급을", "수능제|도가", "수학|을", "순서|대로", "숫|자는", "쉬므|로", "신|설", "아|래와", "아니|다", "않는|다", "않아|도", "알아|낼", "억|원이", "억원|을", "억원|이", "억원이|다", "없|기", "없|으므로", "없으|므로", "열정점수|가", "와|야", "와|야하므로", "이|고", "이|는", "이|다", "이|므로", "이|미", "이러|한", "이루|고", "이므|로", "이하|인", "일제|강점기", "입장인|원은", "있|다", "있|으므로", "있다|는", "있으|므로", "있으므|로", "자본|주의의", "자연|스러움과", "적|극", "적|어도", "점|수가", "점|심을", "정|도인", "정답|은", "정답이|다", "정확하|게", "조건으|로부터", "존재|하지", "중|단하는", "증|가하는", "증가하|고", "지|역은", "쪽|에", "차지|하는", "참|이다", "천만원|에", "축산|물", "층|에", "층|이므로", "크|다", "크|므로", "탄수화물|을", "토|대로", "틀|린", "팀이므|로", "파랑색|을", "평|균", "포|함하는", "하|나", "하|므로", "하|지만", "하|천으로", "하므|로", "하지|만", "한|다", "항|상", "항|의", "해|당", "해|야", "해발고도|가", "혼합|림", "확|인하면", "확인|할", "활용하|여"]);
  function repairWraps(value){
    return String(value??'').replace(/\r\n?/g,'\n').replace(/([가-힣]+)\n(?=([가-힣]+))/g,(match,left,right)=>joinedFragments.has(left+'|'+right)?left:match);
  }
  function inline(value){return repairWraps(value).replace(/[ \t]*\n[ \t]*/g,' ').trim();}
  const marker=/^(?:[•●▶※①②③④⑤⑥⑦⑧⑨⑩㉠㉡㉢㉣]|[ㄱㄴㄷㄹㅁ]\s*[.)]|\d+[.)]\s|\([가-힣A-Z0-9]\)|(?:전제\s*\d*|결론|조건|정답)\s*[:：]?|[A-Z]\s*[:：]|\[[^\]]+\]$)/;
  function paragraphs(value){
    const lines=repairWraps(value).replace(/(?<=[.!?。]\s)(?=(?:첫째|둘째|셋째|넷째|다섯째)(?:로)?[,，])/gu,'\n\n').split('\n');
    const result=[];let current=[];
    const flush=()=>{if(current.length)result.push(current.join(' '));current=[];};
    for(const source of lines){
      const line=source.trim();if(!line){flush();continue;}
      // Standalone labels / table cells are not treated as running prose.
      if(marker.test(line))flush();
      current.push(line);
      if(line.length<=3||/^(?:전제|결론|조건|\[[^\]]+\])$/.test(line))flush();
    }
    flush();return result;
  }
  return {inline,paragraphs,repairWraps};
});
