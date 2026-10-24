# PackagingBook 출처 및 변경 사항

이 학습 페이지의 패키징 공정 확장은 **PackagingBook — geniuskey and PackagingBook contributors**의 교육 콘텐츠를 참고·각색했다.

Copyright (c) 2026 geniuskey and PackagingBook contributors.

- 교재: https://semi.euiyun.com/packaging/
- 원본 저장소: https://github.com/geniuskey/packagingbook
- 교육 콘텐츠 라이선스: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- 원본 라이선스 구분: https://semi.euiyun.com/packaging/LICENSE.md
- 교재 확인일: 2026-10-24

자료는 현 상태로 제공되며 보증하지 않습니다. 원저작자가 이 페이지나 면접 준비 내용을 보증하거나 승인한다는 의미가 아닙니다.

## 변경 사항

원문의 공정별 개념을 패키지 CAE 면접 학습에 맞게 재구성했다. 원리·공정 창·고장 모드·관측·설계 판단의 연결을 보강하고, 독립적인 가상 수치 예제·조건 변경 문제·반문과 답변 검토 기준을 작성했다. 계산식의 가정, 단위, 적용 범위와 반례를 명시했다. 예제는 실제 지원자의 실적이나 특정 기업의 제품 사양이 아니다.

이 페이지의 공정 탐색 UI, 계산기 실행 코드 및 SVG 개략도는 새로 작성했다. 원본의 시뮬레이터 코드·이미지·폰트·외부 라이브러리를 복사하지 않았다. 원문에서 각색한 교육 콘텐츠에는 위 출처와 CC BY 4.0 고지를 유지한다. 다른 기술 자료의 내용과 권리는 각 출처를 따른다.

## 단원별 원문 연결

아래 경로는 https://semi.euiyun.com/packaging/chapters/ 아래의 문서다. 실제 학습 화면에서는 각 원문에 직접 연결한다.

| 확장 단원 | 주요 원문 | 추가 학습 내용 |
| --- | --- | --- |
| P9 웨이퍼·KGD·박막화·다이싱 | wafer.html, dicing.html, dieattach.html | 검사 분모, 단계별 손상, 강성과 강도의 구별 |
| P10 UBM·RDL·범프 | bump.html, substrate.html, thermal.html | 접점 밀도·전류 밀도 계산, IMC와 계면 검증 |
| P11 어태치·와이어·플립칩 | dieattach.html, wirebond.html, flipchip.html | 접합 방식의 공정 창과 국부 간격·열 경로 |
| P12 언더필·몰딩·경화 | molding.html, flipchip.html, hbm.html, thermal.html | 충전 시간과 경화 창, 물성·이력·잔류 응력 |
| P13 기판·팬아웃·인터포저 | substrate.html, wlp.html, interposer.html | 배선과 접점의 별도 제약, 다이 시프트와 공정 선택 |
| P14 TSV·하이브리드 본딩 | tsv.html, hbm.html | 저항·열응력·표면·정렬·검사와 재작업 제약 |
| P15 검사·신뢰성 | wafer.html, test.html, lab.html | 조건부 확률, 잔여 불량, 검열 데이터와 시험 기구 |
| P16 전기·열·기계 | substrate.html, thermal.html | SI/PI, 목표 임피던스, ESR·ESL과 검증 우선순위 |

공정 지도는 위 단원 및 overview.html의 구조 구분을 종합했다. T11–T14는 5단계 질문과 각 2개 반문을 추가했다. C7은 선별 후 적층 수율의 조건부 확률, C8은 미세 피치의 밀도·전류 부담을 새로운 가상 조건으로 전개한다. 원문과 변경 범위는 공정 허브 및 해당 단원·질문·사례 하단에도 표시한다.
