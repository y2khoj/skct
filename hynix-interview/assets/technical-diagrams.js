// Topic-specific teaching diagrams. These are schematic, not product drawings.
(() => {
  const wrap = (label, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" role="img" aria-label="${label}" style="max-width:100%;height:auto" font-family="'Noto Sans KR','Apple SD Gothic Neo',sans-serif"><rect width="640" height="320" rx="18" fill="#fbf8f4"/>${body}</svg>`;
  const text = (x, y, value, size = 15, fill = '#33463f', anchor = 'start', weight = 400) => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${value}</text>`;
  window.LEARNING_DIAGRAMS = {
    M2: () => wrap('NAND의 문턱전압 네 상태와 페이지 읽기·프로그램, 블록 소거 단위를 보여 주는 개략도', `
      ${text(26, 32, 'NAND · 전하를 문턱전압 상태로 판독', 19, '#293d35', 'start', 700)}
      <rect x="20" y="48" width="294" height="231" rx="12" fill="#fff" stroke="#dcded7"/>
      <rect x="328" y="48" width="292" height="231" rx="12" fill="#fff" stroke="#dcded7"/>
      ${text(37, 75, '2 bit/셀의 네 상태 예', 16, '#293d35', 'start', 700)}
      ${text(37, 99, '저장 전하 → 문턱전압 이동', 14, '#64726c')}
      <path d="M42 183H291M42 183V112" stroke="#64726c" stroke-width="1.5" fill="none"/>
      <path d="M47 183C54 181 56 122 72 122S90 181 97 183" fill="#b4d4c4" stroke="#427a60" stroke-width="1.5"/>
      <path d="M104 183C111 181 113 122 129 122S147 181 154 183" fill="#b4d4c4" stroke="#427a60" stroke-width="1.5"/>
      <path d="M161 183C168 181 170 122 186 122S204 181 211 183" fill="#e7c6b6" stroke="#a8654f" stroke-width="1.5"/>
      <path d="M218 183C225 181 227 122 243 122S261 181 268 183" fill="#e7c6b6" stroke="#a8654f" stroke-width="1.5"/>
      <path d="M101 111V188M158 111V188M215 111V188" stroke="#a8b2ad" stroke-dasharray="4 4"/>
      ${text(72, 204, 'E', 14, '#33463f', 'middle')}${text(129, 204, 'P1', 14, '#33463f', 'middle')}${text(186, 204, 'P2', 14, '#33463f', 'middle')}${text(243, 204, 'P3', 14, '#33463f', 'middle')}
      ${text(293, 229, '문턱전압 Vth →', 14, '#64726c', 'end')}
      ${text(37, 257, '점선: 읽기 기준 전압의 예', 14, '#64726c')}
      ${text(347, 75, '페이지와 블록', 16, '#293d35', 'start', 700)}
      <rect x="347" y="89" width="252" height="137" rx="8" fill="#edf3ee" stroke="#427a60" stroke-width="2"/>
      <rect x="358" y="101" width="230" height="27" rx="4" fill="#487b61"/>
      ${text(473, 120, '페이지 · 읽기 / 프로그램', 14, '#fff', 'middle')}
      <rect x="358" y="136" width="230" height="21" rx="4" fill="#d3e2d8"/>
      <rect x="358" y="164" width="230" height="21" rx="4" fill="#d3e2d8"/>
      <rect x="358" y="192" width="230" height="21" rx="4" fill="#d3e2d8"/>
      ${text(473, 251, '여러 페이지를 포함한 블록 · 소거', 14, '#33463f', 'middle')}
      ${text(320, 303, '개략도 · 실제 상태 분포, 비트 부호화, 페이지 수와 비율은 제품별로 다름', 13, '#64726c', 'middle')}
    `),
    P4: () => wrap('CCSB의 구리 코어, 바깥 솔더, 위아래 패드와 패드 간격을 구분하고 강체 기하 필요조건을 설명한 단면', `
      ${text(26, 32, 'CCSB · 코어와 솔더가 맡는 역할을 구분', 19, '#293d35', 'start', 700)}
      <rect x="91" y="77" width="196" height="13" rx="3" fill="#9c624a"/>
      <rect x="91" y="240" width="196" height="13" rx="3" fill="#9c624a"/>
      <path d="M140 90C102 113 102 217 140 240H238C276 217 276 113 238 90Z" fill="#dbe3db" stroke="#738b7b" stroke-width="2"/>
      <circle cx="189" cy="165" r="65" fill="#c78a63" stroke="#995d3d" stroke-width="2"/>
      ${text(189, 160, 'Cu 코어', 18, '#3a2c24', 'middle', 700)}
      ${text(189, 183, '직경 D', 15, '#3a2c24', 'middle')}
      <path d="M54 90V240M47 90H66M47 240H66" fill="none" stroke="#427a60" stroke-width="2"/>
      <text x="36" y="166" font-size="15" fill="#427a60" text-anchor="middle" transform="rotate(-90 36 166)">패드 간격 h</text>
      <path d="M254 124H307V111" fill="none" stroke="#738b7b" stroke-width="1.5"/>
      ${text(310, 102, '솔더', 15)}
      ${text(189, 64, '위 패드', 14, '#64726c', 'middle')}${text(189, 277, '아래 패드', 14, '#64726c', 'middle')}
      <rect x="340" y="58" width="279" height="222" rx="12" fill="#fff" stroke="#dcded7"/>
      ${text(357, 85, '강체 기하의 필요조건', 16, '#293d35', 'start', 700)}
      ${text(479, 121, 'h ≥ D', 24, '#427a60', 'middle', 700)}
      ${text(357, 154, 'D = 200 μm인 가상 조건', 15)}
      ${text(357, 183, 'h = 190 ± 3 μm → 충돌', 14, '#9d4f43')}
      ${text(357, 208, 'h = 230 ± 3 μm → 기하 통과', 14, '#427a60')}
      ${text(357, 241, '통과 후에도 체적·젖음·연결 검증', 14)}
      ${text(357, 263, '형상 평형과 피로 수명은 별도 평가', 13, '#64726c')}
      ${text(320, 306, '개략도 · 평행한 강체 패드 가정 / 솔더 형상·접촉각·치수 비율은 예시', 13, '#64726c', 'middle')}
    `),
    M4: () => wrap('HBM 내부의 DRAM 다이와 TSV, 접합층, 베이스 다이, 인터포저와 패키지 기판 및 보드 접합을 구분한 2.5D 개략 단면', `
      ${text(26, 29, 'HBM 내부 적층과 2.5D 시스템 연결', 19, '#293d35', 'start', 700)}
      <rect x="33" y="52" width="569" height="228" rx="12" fill="#fff" stroke="#dcded7"/>
      <rect x="210" y="84" width="157" height="24" fill="#b8cfc5" stroke="#739785"/>
      <rect x="210" y="119" width="157" height="24" fill="#b8cfc5" stroke="#739785"/>
      <rect x="210" y="154" width="157" height="23" fill="#507e68"/>
      <path d="M233 84V108M265 84V108M297 84V108M329 84V108M233 119V143M265 119V143M297 119V143M329 119V143" stroke="#ab6e48" stroke-width="6"/>
      <path d="M218 113H359M218 149H359" stroke="#d4a277" stroke-width="6" stroke-dasharray="8 8"/>
      <rect x="78" y="137" width="105" height="40" rx="3" fill="#aa6371"/>
      ${text(130, 163, '로직 다이', 16, '#fff', 'middle')}
      <path d="M82 184H180M214 184H363" stroke="#b98a55" stroke-width="6" stroke-dasharray="8 8"/>
      <rect x="65" y="192" width="319" height="21" fill="#cfbda6" stroke="#a1896d"/>
      <path d="M83 219H369" stroke="#b98a55" stroke-width="6" stroke-dasharray="9 10"/>
      <rect x="65" y="226" width="319" height="17" fill="#87a18c"/>
      <g fill="#b7b6aa">${[83, 121, 159, 197, 235, 273, 311, 349].map(x => `<circle cx="${x}" cy="253" r="6"/>`).join('')}</g>
      <rect x="65" y="265" width="319" height="8" fill="#426652"/>
      ${text(288, 69, 'HBM 스택', 16, '#293d35', 'middle', 700)}
      ${text(106, 102, 'TSV', 15, '#1d3a2c', 'middle', 700)}
      <path d="M127 98H233" stroke="#ab6e48" fill="none"/>
      <path d="M367 95H407M367 113H407M367 165H407M365 184H407M384 203H407M376 219H407M384 235H407M355 253H407M384 269H407" stroke="#92a297" fill="none"/>
      ${text(415, 100, 'DRAM 다이', 14)}
      ${text(415, 119, '다이 간 접합층', 14)}
      ${text(415, 166, '베이스 다이', 14)}
      ${text(415, 187, '다이–인터포저 접합', 14)}
      ${text(415, 207, '인터포저', 14)}
      ${text(415, 224, '인터포저–기판 접합', 13)}
      ${text(415, 239, '패키지 기판', 14)}
      ${text(415, 257, '보드 접합 솔더볼', 13)}
      ${text(415, 275, '보드', 13)}
      ${text(320, 304, '개략도 · TSV는 실리콘을 관통 / 접합법·다이 수·크기·기판 연결은 제품마다 다름', 13, '#64726c', 'middle')}
    `),
    P6: () => wrap('서로 다른 재료 사이의 계면에서 모드 I 열림과 모드 II 미끄러짐을 구분하고 균열 길이와 파괴 저항의 관계를 설명한 개략도', `
      ${text(26, 32, '계면 박리 · 최대 응력만으로 판단하지 않기', 19, '#293d35', 'start', 700)}
      <rect x="20" y="49" width="294" height="230" rx="12" fill="#fff" stroke="#dcded7"/>
      <rect x="328" y="49" width="292" height="230" rx="12" fill="#fff" stroke="#dcded7"/>
      ${text(167, 78, '모드 I · 열림', 17, '#293d35', 'middle', 700)}
      ${text(474, 78, '모드 II · 미끄러짐', 17, '#293d35', 'middle', 700)}
      <path d="M49 124H281V156H167L49 141Z" fill="#b8cfc5" stroke="#739785"/>
      <path d="M49 197H281V165H167L49 180Z" fill="#e7c6b6" stroke="#ba8f76"/>
      <path d="M49 160H166" stroke="#b45d4e" stroke-width="3" stroke-dasharray="6 4"/>
      <path d="M99 122V98M92 105L99 98L106 105M99 199V223M92 216L99 223L106 216" fill="none" stroke="#427a60" stroke-width="2"/>
      <circle cx="167" cy="160" r="4" fill="#b45d4e"/>
      ${text(171, 223, '균열 끝', 14, '#9d4f43')}
      ${text(49, 251, '기존 균열 길이 a와 개구량을 관측', 14, '#64726c')}
      <rect x="364" y="123" width="218" height="34" fill="#b8cfc5" stroke="#739785"/>
      <rect x="352" y="165" width="218" height="34" fill="#e7c6b6" stroke="#ba8f76"/>
      <path d="M352 161H467" stroke="#b45d4e" stroke-width="3" stroke-dasharray="6 4"/>
      <circle cx="467" cy="161" r="4" fill="#b45d4e"/>
      <path d="M441 107H501M494 100L501 107L494 114M491 216H431M438 209L431 216L438 223" fill="none" stroke="#427a60" stroke-width="2"/>
      ${text(346, 251, '전단 방향 하중과 상대 미끄럼을 관측', 14, '#64726c')}
      ${text(320, 303, '파괴역학 예: 에너지 방출률 G와 계면 저항 Gc를 모드 혼합·온도 조건에 맞춰 비교', 13, '#64726c', 'middle')}
    `)
  };
})();
