// Learning routes recommend practice; they do not certify interview readiness.
window.LEARNING_PATHS = [
  {
    id: 'structure',
    title: '메모리 구조부터 이해하기',
    description: 'HBM 내부 적층과 시스템 연결을 구분하고, 대역폭을 계산한 뒤 성능의 한계를 설명합니다. 이미 설명할 수 있는 단계는 건너뛰세요.',
    output: 'HBM 구조도 한 장 + 조건을 밝힌 대역폭 계산 + 성능 향상을 보장할 수 없는 이유',
    steps: [
      {kind: 'lesson', id: 'F1', title: '구조의 경계 정하기', why: '메모리 셀·스택·인터포저·보드 중 어디를 설명하는지 먼저 정합니다.'},
      {kind: 'lesson', id: 'M1', title: 'DRAM이 읽고 복원하는 과정', why: '대역폭과 첫 응답의 지연, 리프레시를 구분할 동작 원리를 익힙니다.'},
      {kind: 'lesson', id: 'P1', title: '로직과 메모리의 연결 그리기', why: 'RDL·TSV·인터포저의 위치와 역할을 표시합니다.'},
      {kind: 'lesson', id: 'M4', title: 'HBM 적층과 외부 인터페이스', why: '적층 수 증가가 용량과 대역폭에 각각 어떤 영향을 주는지 설명합니다.'},
      {kind: 'lesson', id: 'M5', title: '단위부터 대역폭 계산하기', why: 'bit와 byte, 데이터 전송률과 클록을 혼동하지 않는지 확인합니다.'},
      {kind: 'case', id: 'C5', title: '숫자가 바뀐 성능 문제 풀기', why: '새 조건에서 계산하고, 연산·메모리 병목의 가설을 비교합니다.'},
      {kind: 'practice', id: 'T6', stage: 5, title: '성능이 오르지 않는 반례 설명', why: '측정할 지표와 판단을 바꿀 조건까지 3분 안에 답합니다.'}
    ]
  },
  {
    id: 'experience',
    title: '내 실적부터 점검하기',
    description: 'BLR 정합성과 계산시간 단축을 출발점으로, 확인한 성과와 검증이 필요한 부분을 정리합니다. 실제 자료가 없는 항목은 확인할 질문으로 남깁니다.',
    output: '성과 지표의 정의 + 비교 조건 + 검증 범위 + 답변을 제한해야 하는 조건',
    steps: [
      {kind: 'practice', id: 'T1', stage: 1, title: '정합성의 의미 먼저 답하기', why: '읽기 전에 계산식·분모·표본 단위를 실제로 설명할 수 있는지 점검합니다.'},
      {kind: 'evidence', id: 'E1', title: '수치의 실제 근거 기록하기', why: '지원서에 쓴 결과와 아직 확인하지 못한 지표 정의를 나눕니다.'},
      {kind: 'lesson', id: 'P5', title: '손상 지표에서 수명으로', why: '구성방정식·손상 지표·수명 상관식의 역할을 분리합니다.'},
      {kind: 'case', id: 'C3', title: '비선형 수명비와 설계 순위', why: '손상 감소의 수명 효과를 계산하고, 입력 불확실성에서 설계 순위가 유지되는지 판단합니다.'},
      {kind: 'lesson', id: 'P7', title: '계산 절감의 검증 조건', why: '메시·시간증분·절단 경계의 민감도와 실험 검증을 구별합니다.'},
      {kind: 'case', id: 'C4', title: '서브모델 결과가 바뀌는 이유', why: '수렴표와 경계 변화에서 어떤 결론까지 가능한지 판단합니다.'},
      {kind: 'practice', id: 'T2', stage: 3, title: '실제 검증과 추가 검증 구분', why: '수행한 확인, 확인이 필요한 근거, 새롭게 제안하는 방법을 나누어 답합니다.'}
    ]
  }
];

window.LEARNING_MISSIONS = [
  {
    id: 'explain', title: '구조와 원리를 설명한다',
    question: 'HBM을 많이 쌓으면 왜 대역폭도 같은 비율로 늘어난다고 할 수 없을까?',
    output: '계층을 표시한 구조도와 60초 설명, 새로운 사양의 대역폭 계산',
    lessonIds: ['F1', 'P1', 'M1', 'M3', 'M4', 'M5'], caseIds: ['C5'], treeIds: ['T6']
  },
  {
    id: 'defend', title: '내 성과를 근거로 설명한다',
    question: '성과 수치의 의미와 검증 범위를 물어도 같은 주장을 유지할 수 있을까?',
    output: '지표·비교 조건·본인 기여·실패 조건을 분리한 성과 근거 카드',
    lessonIds: ['P3', 'P4', 'P5', 'P7', 'P8'], caseIds: ['C1', 'C2', 'C3', 'C4', 'C6'], treeIds: ['T1', 'T2', 'T3', 'T4', 'T7', 'T8']
  },
  {
    id: 'decide', title: '새 구조의 설계를 판단한다',
    question: '시험이 부족한 신규 HBM·2.5D 구조에서 무엇을 선택하고 무엇을 보류할까?',
    output: '전이할 접근, 다시 검증할 입력, 최소 시험, 판단 변경 조건을 담은 의사결정 메모',
    lessonIds: ['P2', 'P6', 'P8', 'M6', 'H1'], caseIds: ['C1', 'C2', 'C3', 'C4', 'C6'], treeIds: ['T5', 'T9']
  },
  {
    id: 'interpret', title: '산업의 변화를 근거로 해석한다',
    question: '기술 발표가 양품 출하와 경쟁력으로 이어지려면 어떤 조건이 필요할까?',
    output: '날짜가 있는 사실 1개, 기술적 해석, 반대 시나리오, 직무와 연결할 질문',
    lessonIds: ['F2', 'M2', 'M7'], caseIds: ['C5'], treeIds: ['T10']
  }
];

window.LESSON_GUIDANCE = {
  F1: {
    prerequisites: [],
    question: '내가 설명하는 접합부는 HBM 스택 안인가, 인터포저 위인가, 보드 위인가?',
    output: '데이터·열·힘의 경로와 접합부 세 위치를 표시한 구조도',
    misconception: {claim: 'HBM에 TSV가 있으므로 시스템의 모든 연결은 같은 3D 구조다.', correction: 'HBM 내부 적층, 로직–HBM 연결, 패키지–보드 접합을 각각 표시해야 재료·하중·고장 모드를 비교할 수 있습니다.'},
    caseIds: [], next: {kind: 'lesson', id: 'M1', title: 'DRAM의 저장·읽기 원리로 이동'}
  },
  F2: {
    prerequisites: ['F1'],
    question: '설비가 늘었다는 발표에서 실제 양품 출하를 얼마나 추론할 수 있을까?',
    output: '투입·조립·검사·출하의 흐름과 병목을 확인할 지표',
    misconception: {claim: '명목 생산능력이 20% 늘면 출하도 20% 늘어난다.', correction: '가동률·다른 공정의 처리량·수율·인증·제품 구성에 따라 실제 출하 증가가 달라집니다.'},
    caseIds: [], next: {kind: 'industry', id: 'hbm4-mass-shipments-2026', title: '발표와 양품 공급을 구분해 읽기'}
  },
  P1: {
    prerequisites: ['F1'],
    question: '인터포저·RDL·TSV는 각각 어디에서 무엇을 연결할까?',
    output: 'HBM 내부와 시스템 연결을 나눈 단면도, 구조 선택의 이점과 부담 두 가지',
    misconception: {claim: 'HBM 적층 공정명이 2.5D 패키지 전체 조립법을 설명한다.', correction: 'HBM 내부 적층과 로직·HBM을 시스템에 연결하는 조립은 범위가 다릅니다. 각 접합 위치의 공정과 재료를 확인합니다.'},
    caseIds: [], next: {kind: 'lesson', id: 'M4', title: 'HBM 스택과 인터페이스 연결하기'}
  },
  P2: {
    prerequisites: ['P1'],
    question: '최종 온도가 같은데 잔류변형이 다르면 어떤 가정부터 의심할까?',
    output: '접합·경화·구속 변화·온도 이력이 표시된 공정표와 구별할 측정 한 가지',
    misconception: {claim: '실온까지 냉각한 모델이 맞으면 중간 공정도 검증되었다.', correction: '같은 최종 형상이 다른 이력에서 나올 수 있습니다. 가열·냉각·유지 시간 또는 공정 단계별 관측으로 가설을 구별합니다.'},
    caseIds: ['C1'], next: {kind: 'lesson', id: 'P3', title: '온도별 warpage 오차를 진단하기'}
  },
  P3: {
    prerequisites: ['P2'],
    question: '실온에서는 맞고 고온에서 틀리는 모델을 어떤 측정으로 구별할까?',
    output: '자유 열변형의 계산과 실제 휨에 필요한 추가 입력, 두 가설을 구별하는 시험',
    misconception: {claim: 'CTE 차이와 온도 차이만 알면 warpage 크기가 정해진다.', correction: 'Δα·ΔT는 자유 열변형 차이의 근사입니다. 휨에는 두께·강성·적층 순서·구속과 공정 이력이 필요합니다.'},
    caseIds: ['C1'], next: {kind: 'case', id: 'C1', title: 'Warpage의 계산과 반례 풀기'}
  },
  P4: {
    prerequisites: ['P2', 'P3'],
    question: '단일 솔더 형상 검증에서 전체 실장 불량 예측으로 가려면 무엇이 더 필요할까?',
    output: '위치별 간격·젖음·체적의 확인표와 실장성·열사이클 신뢰성을 나눈 결론',
    misconception: {claim: '코어가 접합부 간격을 유지하므로 피로 수명도 반드시 늘어난다.', correction: '코어는 하중 분담과 솔더의 변형 영역도 바꿉니다. 평형 형상과 냉각·열사이클 손상은 각각 검증합니다.'},
    caseIds: ['C2'], next: {kind: 'case', id: 'C2', title: 'CCSB의 국부 간격과 검증 범위 판단'}
  },
  P5: {
    prerequisites: ['F1', 'P3'],
    question: '손상 위치와 수명 순위가 맞으면 절대 수명도 검증된 것일까?',
    output: '구성방정식→손상 지표→수명 변환의 흐름과 위치·순위·절대값의 검증 범위',
    misconception: {claim: '시험과 상관계수가 높으므로 수명 예측도 정확하다.', correction: '순위가 비슷해도 배율 오류가 남을 수 있습니다. 같은 시험 조건에서 수명 비율·오차·산포와 독립 검증을 함께 봅니다.'},
    caseIds: ['C3'], next: {kind: 'case', id: 'C3', title: 'BLR 수명비와 불확실성 계산'}
  },
  P6: {
    prerequisites: ['P3'],
    question: '메시를 줄일수록 최대 응력이 계속 커지면 어떤 결과로 설계를 비교할까?',
    output: '고장 위치·모드에 맞는 평가량과 수치 검증·시험 검증을 나눈 계획',
    misconception: {claim: '가장 작은 메시의 최대 응력이 실제 파손을 가장 잘 예측한다.', correction: '특이점의 극값은 수렴하지 않을 수 있습니다. 고장 모드에 맞는 에너지량·정의된 평균량·계면 모델과 물성을 검토합니다.'},
    caseIds: ['C4'], next: {kind: 'lesson', id: 'P7', title: '관심 평가량의 수렴과 검증 구분'}
  },
  P7: {
    prerequisites: ['P5'],
    question: '국부 메시가 수렴해도 전역 모델의 경계 입력이 틀릴 수 있을까?',
    output: '메시·시간증분·영역 크기 민감도와 실험 검증을 분리한 확인표',
    misconception: {claim: '국부 모델을 정교하게 만들면 전역 하중 경로의 오류도 사라진다.', correction: '전달한 경계가 잘못되면 국부 해는 잘못된 조건에 수렴할 수 있습니다. 경계 위치와 국부 손상의 전역 피드백을 별도로 확인합니다.'},
    caseIds: ['C4'], next: {kind: 'case', id: 'C4', title: '메시와 절단 경계 민감도 표 해석'}
  },
  P8: {
    prerequisites: ['P3'],
    question: '학습 데이터에 잘 맞는 회귀가 신규 제품의 설계 순위도 예측할까?',
    output: '계수 수·독립 표본·검증 분할·적용 범위의 점검표와 추가 실험 우선순위',
    misconception: {claim: '학습 적합도가 높으면 약 20건으로도 복잡한 다항식의 예측력이 확인된다.', correction: '모형 자유도와 설계행렬, 표본 독립성, 외부 검증이 필요합니다. 입력 5개의 완전 2차식에는 절편 포함 21개 계수가 있습니다.'},
    caseIds: ['C6'], next: {kind: 'case', id: 'C6', title: '소표본 회귀와 외삽 문제 풀기'}
  },
  M1: {
    prerequisites: ['F1'],
    question: 'DRAM은 왜 읽은 뒤 복원하고, 온도 변화는 왜 리프레시와 연결될까?',
    output: '셀→감지·복원→행/열 접근의 흐름과 대역폭·지연시간의 차이',
    misconception: {claim: '인터페이스 대역폭이 두 배이면 첫 데이터의 응답 시간도 절반이다.', correction: '행 활성화·프리차지·접근 패턴은 첫 응답에 별도의 영향을 줍니다. 일정 시간의 전송량과 요청 지연을 구분합니다.'},
    caseIds: ['C5'], next: {kind: 'lesson', id: 'M3', title: 'DRAM 제품별 설계 목표 비교'}
  },
  M2: {
    prerequisites: ['F1'],
    question: 'NAND의 고단화와 HBM의 다이 적층은 어떤 점에서 다를까?',
    output: '저장 원리·읽기/쓰기/소거 단위·적층 방식으로 비교한 NAND와 DRAM 표',
    misconception: {claim: 'NAND 층수가 늘어나는 것은 HBM의 DRAM 다이를 더 쌓는 것과 같다.', correction: '3D NAND의 셀 구조 적층과 HBM의 개별 DRAM 다이 적층은 구조와 제조 문제가 다릅니다. 층수 숫자만으로 비교하지 않습니다.'},
    caseIds: [], next: {kind: 'lesson', id: 'M7', title: '서로 다른 메모리의 발전 과제 비교'}
  },
  M3: {
    prerequisites: ['M1'],
    question: '대역폭이 높은 제품을 고르면 모든 시스템에서 좋은 선택일까?',
    output: '용량·대역폭·전력·패키지·비용 제약을 밝힌 제품군 선택과 반례',
    misconception: {claim: 'HBM은 대역폭이 크므로 DDR·LPDDR·GDDR을 모든 곳에서 대체한다.', correction: '시스템마다 용량·전력·확장성·패키징 비용의 우선순위가 다릅니다. 요구조건을 정한 뒤 제품군의 장단점을 비교합니다.'},
    caseIds: ['C5'], next: {kind: 'lesson', id: 'M4', title: 'HBM이 넓은 데이터 길을 만드는 구조'}
  },
  M4: {
    prerequisites: ['M1', 'P1'],
    question: '스택 용량·외부 데이터 폭·전송률을 각각 바꾸면 무엇이 달라질까?',
    output: 'DRAM 다이·베이스 다이·TSV·외부 연결을 표시한 구조도와 용량/대역폭 구분',
    misconception: {claim: 'DRAM 다이를 두 배 쌓으면 외부 이론 대역폭도 두 배다.', correction: '외부 데이터 폭과 핀당 전송률이 유지되면 이론 대역폭은 같습니다. 적층 수는 용량·높이·열·접합 부담과 별도로 연결합니다.'},
    caseIds: ['C5'], next: {kind: 'lesson', id: 'M5', title: '인터페이스 사양으로 대역폭 계산'}
  },
  M5: {
    prerequisites: ['M1', 'M4'],
    question: '이론 대역폭을 계산한 뒤 실제 처리량을 주장하려면 어떤 정보가 더 필요할까?',
    output: '단위가 있는 대역폭 계산과 연산·메모리 병목을 구별할 관측 지표',
    misconception: {claim: '핀당 데이터 전송률에 DDR이라는 이유로 다시 2를 곱한다.', correction: '이미 제시된 데이터 전송률에는 해당 전송 효과가 포함되어 있습니다. 클록 주파수와 데이터 전송률의 정의를 먼저 확인합니다.'},
    caseIds: ['C5'], next: {kind: 'case', id: 'C5', title: '다른 조건에서 대역폭과 성능 판단'}
  },
  M6: {
    prerequisites: ['M4', 'P3'],
    question: '평균온도를 낮춘 설계가 국부 접합부 신뢰성에도 유리하다고 할 수 있을까?',
    output: '열원·열 경로·온도 구배·구속을 표시하고 필요한 열–구조 전달 조건 정리',
    misconception: {claim: '전력이나 평균온도가 낮아지면 모든 계면의 손상도 줄어든다.', correction: '온도 분포·구배·과도 이력과 구조 강성이 국부 하중을 바꿉니다. 관심 접합부의 온도·변형 이력과 고장 모드를 확인합니다.'},
    caseIds: ['C1', 'C4'], next: {kind: 'lesson', id: 'H1', title: '열·기계 판단을 새 구조에 연결'}
  },
  M7: {
    prerequisites: ['M2', 'M4'],
    question: '세대 이름 대신 바뀐 변수와 새로 검증할 문제를 설명할 수 있을까?',
    output: 'DRAM 미세화·NAND 고단화·HBM 진화의 이득, 부담, 확인할 근거 비교',
    misconception: {claim: '개발 발표나 샘플 사양이 공개되면 안정적인 양산 공급도 확인된 것이다.', correction: '발표·샘플·인증·양산·출하는 서로 다른 상태입니다. 제품과 날짜, 확인된 범위를 붙여 기술 전망을 말합니다.'},
    caseIds: [], next: {kind: 'practice', id: 'T10', title: '사실과 전망을 구분해 산업 견해 답변'}
  },
  H1: {
    prerequisites: ['M4', 'M6', 'P7'],
    question: '기존 CAE 경험에서 가져갈 접근과 새 구조에서 다시 검증할 부분은 무엇일까?',
    output: '전이 가능한 결론·재검증 계획·보류 조건을 담은 최종 판단 메모',
    misconception: {claim: '기존 보드볼 수명 모델의 계수를 HBM 내부 접합부에 그대로 적용할 수 있다.', correction: '구조 계층과 재료·공정·하중·고장 모드가 달라질 수 있습니다. 검증 절차는 활용하되 물성·계수·적용 범위는 새 근거로 확인합니다.'},
    caseIds: ['C1', 'C2', 'C3', 'C4', 'C6'], next: {kind: 'practice', id: 'T5', title: '최종 메모로 경험 전이 면접 연습'}
  }
};

window.INTEGRATION_TASK = {
  title: '최종 과제 · 시험이 부족한 신규 구조를 어떻게 판단할까?',
  brief: '가상의 신규 2.5D 패키지 검토를 맡았다고 가정합니다. 핵심 사례에서 얻은 결과 중 두 가지 이상을 골라, 어느 구조 계층의 어떤 판단에 활용할지 작성하세요. 사례의 숫자는 학습용 가정이며 신규 제품의 측정값이나 본인의 실제 실적이 아닙니다.',
  assumptions: [
    'HBM 내부 접합, HBM–인터포저 연결, 패키지–보드 접합 중 검토 대상을 먼저 하나 정합니다.',
    '신규 구조의 재료·접합 공정·온도 이력·고장 모드는 아직 모두 확인되지 않았습니다.',
    '일주일 안에 1차 설계 검토 의견을 내야 하며, 추가 확인 조건은 최대 세 가지로 제안합니다.',
    '기존 사례에서 얻은 상대 경향과 검증 절차를 활용하되, 독립적인 사례 숫자를 같은 제품의 데이터처럼 합치지 않습니다.'
  ],
  prompts: [
    {id: 'scope', label: '1. 어떤 실패와 어느 계층을 다루는가?', hint: '검토 대상 접합부·하중·관심 지표를 적고, 모르는 재료·공정 조건을 표시하세요.'},
    {id: 'transfer', label: '2. 무엇을 활용할 수 있는가?', hint: '참고한 사례 ID 두 개 이상과 가져갈 논리를 쓰세요. 예: 경계 민감도 검토 절차는 활용하되 보드볼 수명 계수는 새로 검증합니다.'},
    {id: 'revalidate', label: '3. 어떤 가정을 다시 검증할 것인가?', hint: '재료 거동·수명 계수·젖음 조건·전역 피드백 중 영향이 큰 항목을 고르고, 재사용이 가능한 조건을 적으세요.'},
    {id: 'checks', label: '4. 추가 확인 세 가지를 어디에 쓸 것인가?', hint: '각 확인의 관측값, 구별하려는 두 가설, 그 결과에 따라 바꿀 판단을 짝지으세요.'},
    {id: 'decision', label: '5. 지금 내릴 결론과 보류할 결론은 무엇인가?', hint: '조건부 후보 추천, 필요한 규격 정보, 절대 수명·양산 보증의 근거 부족을 구체적으로 구분하세요.'},
    {id: 'change', label: '6. 어떤 결과가 나오면 판단을 바꿀 것인가?', hint: '허용 오차·규격·고장 모드에 관한 기준이 없다면 수치를 만들지 말고, 누구의 어떤 자료로 정할지 적으세요.'}
  ],
  reviewCriteria: [
    '구조 계층과 관심 고장 모드를 명시하고, HBM 내부와 보드 수준의 결과를 섞지 않았다.',
    '사례 두 개 이상을 인용하되 가상 결과·일반 접근·실제 경험을 구분했다.',
    '전이할 절차와 재검증할 입력 또는 계수를 각각 밝혔다.',
    '추가 확인마다 경쟁 가설과 판단을 바꿀 관측값이 있다.',
    '현재 근거로 가능한 결론, 부족한 정보, 결론을 바꿀 조건이 구체적이다.'
  ],
  caseIds: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']
};
