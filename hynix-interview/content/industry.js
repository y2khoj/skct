/* 공식 원문 확인일: 2026-10-17. 사실·해석·조건부 전망을 구분한 학습 자료. */
window.INDUSTRY_CARDS = [
  {
    id: 'memory-centric-ocp-2026',
    title: 'AI 병목은 메모리 계층 전체로 확장된다',
    tag: '생태계',
    date: '2026-10-16',
    asOf: '2026-10-17',
    summary: 'OCP 2026에서 공개한 CXL·MARS는 HBM 외의 용량·데이터 이동 문제까지 함께 다루는 시스템 접근이다.',
    facts: [
      'SK하이닉스는 CXL 3.2 기반 256GB 2세대 CMM-DDR5와 메모리 중심 AI 랙 시스템 MARS를 전시했다.',
      '파트너들과 CXL pooled memory를 통한 KV cache 공유·재사용을 시연했다. NAVER Cloud 협업 결과는 PoC 수준 검증으로 설명했다.',
      'CMM-Ax 연산 기능과 DRAM·SSD를 결합한 CXL hybrid memory도 데모로 소개했다.'
    ],
    implications: [
      '면접 해석: 병목을 HBM 대역폭, 메모리 용량, 네트워크 이동, 냉각으로 나눈 뒤 워크로드별 우선순위를 설명한다.',
      'CAE 연결: 제품 성능만큼 랙의 전력·냉각 조건과 사용 온도 분포가 패키지 신뢰성 평가 조건에 영향을 준다.'
    ],
    uncertainty: '전시·데모·PoC는 전면 상용화나 모든 워크로드에서의 성능 향상을 뜻하지 않는다. 지연시간, 적중률, 동시 사용자 수, 소프트웨어 지원을 확인해야 한다.',
    interviewQuestion: 'KV cache를 CXL 메모리로 옮겼는데 응답이 느려졌다. 어떤 측정으로 용량 부족, 링크 지연, 캐시 정책 중 원인을 구분하겠는가?',
    source: {
      label: 'SK hynix · OCP Global Summit 2026 (2026-10-16)',
      url: 'https://news.skhynix.com/en/ocp-global-summit-2026/'
    },
    scenario: {
      base: '조건부 전망: 용량과 재사용 요구가 커지는 추론에서 HBM·DRAM·SSD의 역할 분담이 확대된다.',
      upside: '공유 소프트웨어와 실제 고객 검증이 성숙하면 유휴 용량과 데이터 복사를 줄여 시스템 비용을 낮출 수 있다.',
      downside: '추가 지연과 관리 비용이 재사용 이익을 넘는 워크로드에서는 도입 효과가 제한된다.'
    }
  },
  {
    id: 'hbm4-mass-shipments-2026',
    title: 'HBM4의 다음 경쟁은 안정적인 대량 공급',
    tag: '메모리',
    date: '2026-07-29',
    asOf: '2026-10-17',
    summary: '개발 완료 다음에는 고객 요구 충족, 수율, 품질, 적기 공급을 함께 입증해야 한다.',
    facts: [
      '2026년 2분기 실적 발표에서 SK하이닉스는 해당 분기에 HBM4 대량 출하를 시작했다고 밝혔다.',
      'HBM4 생산 확대는 2026년 하반기 계획으로 제시했다. HBM4E는 상반기 샘플 공급 완료로 구분했다.',
      '약 10개 고객과 장기공급계약을 체결했다고 발표했다. 이는 회사 전체 고객 설명이며 HBM4만의 계약 수로 제시한 수치가 아니다.'
    ],
    implications: [
      '면접 해석: 개발·내부 검증·고객 인증·대량 출하를 구분하고, 성능뿐 아니라 수율과 공급 안정성으로 경쟁력을 설명한다.',
      'CAE 연결: 설계 최적화의 목적함수에 손상 지표와 함께 공정 산포, 생산성, 시험 불확실성을 포함한다.'
    ],
    uncertainty: '회사 발표일 기준 상태다. 하반기 증산 계획의 완료, 고객별 인증 범위와 물량, 제품별 수율은 이 자료로 확인할 수 없다. 장기계약도 전량 인식 매출을 보장하지 않는다.',
    interviewQuestion: '시제품은 통과했는데 증산 후 불량률이 늘었다. 설계 취약성, 재료 편차, 공정 조건 변화 중 무엇을 어떤 순서로 검증하겠는가?',
    source: {
      label: 'SK hynix · 2Q26 Financial Results (2026-07-29)',
      url: 'https://news.skhynix.com/en/q2-2026-business-results/'
    },
    scenario: {
      base: '조건부 전망: 고객 수요와 증산이 함께 이어지면 양산 수율·품질 관리의 가치가 커진다.',
      upside: '고객별 재검증 기간과 초기 불량을 줄이면 신규 설계의 공급 확대를 앞당길 수 있다.',
      downside: '공정 변경이나 고객 일정 변경이 생기면 생산능력 확대가 실제 출하 증가로 이어지는 시점이 늦어진다.'
    }
  },
  {
    id: 'hbm4e-samples-2026',
    title: 'HBM4E: 샘플 성능을 양산 신뢰성으로 연결하기',
    tag: '메모리',
    date: '2026-06-18',
    asOf: '2026-10-17',
    summary: 'HBM4E의 속도·용량 확대는 적층 구조의 열과 기계적 안정성을 함께 요구한다.',
    facts: [
      'SK하이닉스는 주요 고객에게 HBM4E 12단 샘플을 공급했다고 발표했다. 이 발표의 이정표는 샘플 공급이다.',
      '발표 사양은 12단 48GB, 핀당 최대 16Gbps다. 최대 핀 속도는 실제 시스템의 지속 대역폭과 구분해야 한다.',
      '회사는 Advanced MR-MUF를 적용해 구조 안정성과 열 특성을 개선했다고 설명했다.'
    ],
    implications: [
      '면접 해석: 속도와 용량 증가를 전력, 접합부 온도, 얇은 다이의 변형, 공정 창과 함께 설명한다.',
      'CAE 연결: 상온 warpage 정합성에 더해 공정 온도 이력, 온도 의존 물성, 접합 이후의 잔류 응력까지 검증한다.'
    ],
    uncertainty: '샘플 발표만으로 고객 인증 완료나 양산 개시를 단정할 수 없다. 회사가 제시한 열 개선 수치는 측정 지표·경계조건·비교 대상을 원문과 추가 자료로 확인한 뒤 사용한다.',
    interviewQuestion: '새 적층 구조에서 열 특성은 좋아졌지만 TC 수명이 나빠졌다. 가능한 메커니즘 두 가지와 이를 구분할 실험을 설계하라.',
    source: {
      label: 'SK hynix · 12-Layer HBM4E Samples (2026-06-18)',
      url: 'https://news.skhynix.com/en/sk-hynix-ships-samples-of-12-layer-next-gen-hbm4e-2/'
    },
    scenario: {
      base: '조건부 전망: 고객 검증과 공정 안정화가 진행될수록 열·기계·전기 평가의 연결이 중요해진다.',
      upside: '재료와 공정 산포를 줄이면 성능 향상과 양산 안정성을 함께 확보할 수 있다.',
      downside: '샘플에서 관찰되지 않은 공정 편차나 열 집중이 발견되면 추가 검증과 설계 변경이 필요해진다.'
    }
  },
  {
    id: 'cowos-scaling-2026',
    title: '2.5D PKG 대형화: 연결 수만큼 검증 난도도 증가',
    tag: '2.5D PKG',
    date: '2026-04-23',
    asOf: '2026-10-17',
    summary: 'TSMC의 CoWoS 로드맵은 하나의 패키지에 더 많은 로직과 HBM을 통합하는 방향을 보여준다.',
    facts: [
      'TSMC는 2026 기술 심포지엄 발표에서 5.5-reticle 크기 CoWoS를 생산 중이라고 밝혔다. reticle 배수는 면적 규모를 나타내며 다이 개수가 아니다.',
      '약 10개 대형 연산 다이와 20개 HBM 스택을 통합할 수 있는 14-reticle CoWoS는 2028년 생산 계획으로 제시했다.',
      '페이지 발행일은 2026-04-23이며, 본문 현지 발표일은 미국 2026-04-22다.'
    ],
    implications: [
      '면접 해석: 대형화를 대역폭 증가에 연결한 뒤 warpage, 열 경로, 조립 공차, 비용과 수율의 부담을 설명한다.',
      'CAE 연결: 전역 변형과 국부 접합부 손상을 연결하되, 국부 손상이 전역 강성을 바꾸면 일방향 서브모델의 타당성을 재검토한다.'
    ],
    uncertainty: '14-reticle과 2029년 이후 확장안은 미래 로드맵이다. 현재 양산 제품으로 표현하지 않는다. 실제 구성·크기·수율은 고객 설계와 공정 조건에 따라 달라진다.',
    interviewQuestion: '패키지 면적을 늘릴 때 기존 모델의 수명 결과를 그대로 외삽할 수 있는가? 경계조건·응력 자유 온도·재료 비선형성·검증 범위를 들어 답하라.',
    source: {
      label: 'TSMC · 2026 North America Technology Symposium (2026-04-23)',
      url: 'https://pr.tsmc.com/english/news/3302'
    },
    scenario: {
      base: '조건부 전망: 통합 규모가 커지면 구조·열·연결과 제조 공정을 함께 최적화해야 한다.',
      upside: '재료·검사·조립 기술이 함께 성숙하면 더 많은 HBM을 연결하며 유효 성능을 높일 수 있다.',
      downside: 'warpage와 조립 수율, 냉각 또는 비용 제약이 지배하면 통합 규모 확대가 시스템 이익으로 이어지지 않을 수 있다.'
    }
  },
  {
    id: 'hbm-competition-2026',
    title: '경쟁사 비교는 같은 제품·단계·조건에서',
    tag: '생태계',
    date: '2026-03-16',
    asOf: '2026-10-17',
    summary: 'Micron의 HBM4 양산과 16단 샘플 발표를 통해 경쟁 지표의 분모와 단계부터 확인한다.',
    facts: [
      'Micron은 2026년 1분기 중 HBM4 36GB 12단의 대량 출하를 시작했으며 NVIDIA Vera Rubin용으로 설계했다고 밝혔다.',
      '동일 발표에서 HBM4 48GB 16단은 고객 샘플 공급으로 구분했다.',
      '발표된 20% 이상 전력 효율 개선은 자사 HBM3E 12단 9.2Gbps와 지정 워크로드 패턴을 비교한 내부 전력 계산 기준이다.'
    ],
    implications: [
      '면접 해석: 서로 다른 적층 수·용량·속도·측정 조건의 숫자를 직접 비교하지 않는다.',
      '경쟁력은 최대 사양, 고객 검증, 양산 품질, 비용, 공급 능력의 조합으로 설명하고 특정 고객 내 점유율은 별도 근거를 요구한다.'
    ],
    uncertainty: '이는 Micron의 공식 제품 발표이며 독립적인 업체 간 비교 결과가 아니다. 출하 시작만으로 고객 시스템 전체의 상용화나 시장 우위를 단정하지 않는다.',
    interviewQuestion: '경쟁사의 전력 효율이 20% 좋다는 자료를 받았다. 설계 변경 전에 어떤 비교 조건과 검증 자료를 요구하겠는가?',
    source: {
      label: 'Micron · HBM4 High-Volume Production (2026-03-16)',
      url: 'https://investors.micron.com/news/press-release/2026/Micron-in-High-Volume-Production-of-HBM4-Designed-for-NVIDIA-Vera-Rubin-PCIe-Gen6-SSD-and-SOCAMM2-03-16-2026/default.aspx'
    },
    scenario: {
      base: '조건부 전망: 고객은 제품 사양과 양산 안정성을 함께 평가하며 공급사별 장단점을 비교한다.',
      upside: '공동 검증과 공급 다변화가 진행되면 각 업체가 차별화할 수 있는 고객·제품 영역이 넓어진다.',
      downside: '성능 목표나 고객 일정이 바뀌면 인증과 재설계 비용이 증가하고 공급 계획이 지연될 수 있다.'
    }
  },
  {
    id: 'hbf-standardization-2026',
    title: 'HBF: HBM과 SSD 사이의 계층을 모색',
    tag: '메모리',
    date: '2026-02-26',
    asOf: '2026-10-17',
    summary: 'HBF는 고용량 추론을 위한 새로운 메모리 계층으로 표준화와 상용화를 추진하는 단계다.',
    facts: [
      'SK하이닉스와 Sandisk는 HBF 표준화 전략을 발표하고 OCP 내 전담 workstream을 추진한다고 밝혔다.',
      '발표는 HBF를 고대역폭 HBM과 고용량 SSD 사이의 보조 계층으로 설명한다. HBM을 전면 대체한다는 설명은 아니다.',
      '서울 보도자료 기준일은 2026-02-26이다. 페이지 상단과 미국 현지 킥오프 행사는 2026-02-25로 표기되어 있다.'
    ],
    implications: [
      '면접 해석: 용량당 비용뿐 아니라 읽기 지연, 접근 단위, 쓰기 내구성, 데이터 배치와 소프트웨어 변경을 비교한다.',
      'PKG 연결: DRAM 적층 경험을 활용하더라도 NAND의 사용 조건과 발열·접합·신뢰성 검증은 다시 정의해야 한다.'
    ],
    uncertainty: '표준화 착수와 상용 양산을 구분한다. 원문의 2030년 전후 수요 확대는 산업 전망이며 확정 일정이나 이미 실현된 수요가 아니다.',
    interviewQuestion: 'HBM 용량이 부족한 추론 서버에 HBF를 제안한다면 어떤 데이터부터 옮길 것인가? 평균 지연이 좋아져도 꼬리 지연이 악화되는 조건은 무엇인가?',
    source: {
      label: 'SK hynix · HBF Standardization (서울 2026-02-26)',
      url: 'https://news.skhynix.com/en/sk-hynix-and-sandisk-begin-global-standardization-ofnext-generation-memory-hbf/'
    },
    scenario: {
      base: '조건부 전망: 표준·인터페이스·워크로드 검증을 통해 HBF가 유리한 사용 영역을 찾아간다.',
      upside: '대용량 읽기 중심 추론에서 소프트웨어와 장치가 함께 최적화되면 용량과 비용 제약을 완화할 수 있다.',
      downside: '접근 지연·내구성·표준화 비용이 기대 이익보다 크면 적용 범위와 상용화 속도가 제한된다.'
    }
  }
];
