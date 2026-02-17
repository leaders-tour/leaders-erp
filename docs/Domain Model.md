# 🧠 Domain Modeling Document v2 (Final)

## Tour Itinerary ERP – TimeBlock 기반 구조

---

# 1️⃣ 도메인 설계 철학 (Final)

이 시스템은 단순 일정 나열기가 아니다.

> “시간 단위 이벤트 블록을 가진 여행 플로우 엔진”

핵심은:

- 하루는 시간의 흐름으로 구성된다.
- 시간은 단일 이벤트가 아니라 “블록”이다.
- 각 시간 블록에는 여러 활동(Activity)이 포함될 수 있다.
- 활동은 독립적이면서도 상위 시간에 종속된다.

---

# 2️⃣ 도메인 레이어 구조

`Static Domain    └── Region    └── Location  Graph Domain    └── Segment    └── RouteGraph  Plan Domain    └── Plan        └── DayPlan            └── TimeBlock                └── Activity  Override Domain`

---

# 3️⃣ Static Domain

---

## 3.1 Region

여행 권역 단위

### 속성

- id
- name (고비 / 중부 / 홉스골)
- description

### 규칙

- 모든 Location은 하나의 Region에 속해야 한다.
- Plan은 생성 이후 Region 변경 불가.

---

## 3.2 Location

여행 목적지

### 속성

- id
- regionId
- name
- defaultLodgingType
- latitude (선택)
- longitude (선택)

### 규칙

- Region 없이 존재 불가
- 기본 숙소 타입 필수

---

# 4️⃣ Graph Domain

---

## 4.1 Segment

목적지 간 이동 관계 (Directed Edge)

### 속성

- id
- regionId
- fromLocationId
- toLocationId
- averageDistanceKm
- averageTravelHours

### 규칙

- 동일 Region 내에서만 연결 가능
- 자기 자신 연결 금지
- 중복 구간 금지

---

## 4.2 RouteGraph

Region 단위의 Segment 집합

### 의미

- Directed Graph 구조
- 불가능한 루트는 생성 불가

---

# 5️⃣ Plan Domain (핵심 구조)

---

## 5.1 Plan

하나의 일정 설계 단위

### 속성

- id
- regionId
- variantType
- totalDays
- createdAt
- updatedAt

### 규칙

- totalDays는 2~10 범위
- 생성 이후 regionId 변경 불가

---

## 5.2 VariantType

출발 유형

- basic
- early
- afternoon
- extend

### 영향

- 1일차 시작 시간
- 마지막 날 구성
- 식사 규칙

---

# 6️⃣ DayPlan

하루 단위 일정

### 속성

- id
- planId
- dayIndex (1부터 시작)
- fromLocationId
- toLocationId
- distanceText
- lodgingText
- mealsText

### 규칙

- 이전 DayPlan의 toLocationId = 다음 DayPlan의 fromLocationId
- 최소 1개 이상의 TimeBlock 포함

---

# 7️⃣ TimeBlock (핵심 변경 구조)

> 하루의 시간 단위 블록

---

## 7.1 TimeBlock

### 속성

- id
- dayPlanId
- startTime (HH:mm)
- label (예: 출발, 점심, 저녁)
- orderIndex

### 의미

- 하루 흐름의 주요 시점
- 시간은 항상 명시적이어야 함

---

### 규칙

- 동일 DayPlan 내 orderIndex 유일
- startTime은 HH:mm 형식
- 최소 1개 이상의 Activity 포함

---

# 8️⃣ Activity (하위 이벤트)

> TimeBlock에 종속되는 실제 활동 단위

---

## 8.1 Activity

### 속성

- id
- timeBlockId
- description
- orderIndex
- isOptional (선택)
- conditionNote (예: 현지 상황에 따라 진행)

---

### 의미

Activity는:

- 특정 시간 블록에 속함
- 개별적인 일정 항목
- 독립적 정렬 가능
- 선택적(옵션) 여부 표시 가능

---

### 규칙

- 반드시 하나의 TimeBlock에 속함
- orderIndex는 block 내에서 유일
- description은 비어 있을 수 없음

---

# 9️⃣ 예시 모델 (최종 구조)

DayPlan (2일차)

### TimeBlock 1

`startTime: 08:00 label: 출발  Activities:   - 아침식사 후 쳉헤르 온천으로 출발`

### TimeBlock 2

`startTime: 12:00 label: 점심  Activities:   - 이동 중 점심식사   - 숙소 도착 후 자유시간   - 온천욕 및 온천 근원지 구경`

### TimeBlock 3

`startTime: 18:00 label: 저녁  Activities:   - 숙소 도착 (저녁식사 및 휴식)   - 캠프파이어 / 삼겹살파티     (isOptional: true)     (conditionNote: 현지 상황에 따라 진행)`

---

# 🔟 Override Domain

자동 생성 값 수정

---

## Override

### 속성

- id
- planId
- targetType (DayPlan / TimeBlock / Activity)
- targetId
- fieldName
- value

### 규칙

- 자동값은 항상 존재
- Override는 덮어쓰기 개념
- 삭제 시 자동값 복원

---

# 11️⃣ 도메인 관계 요약

`Region  └── Location        └── Segment (Graph) Plan  └── DayPlan        └── TimeBlock              └── Activity Plan  └── Override`

---

# 12️⃣ 도메인 불변 원칙 (Final)

1. Plan은 반드시 하나의 Region에 속한다.
2. DayPlan은 순차적으로 연결되어야 한다.
3. TimeBlock은 하루의 주요 시점이다.
4. Activity는 반드시 TimeBlock에 종속된다.
5. Activity는 시간 없이 존재할 수 없다.
6. 동일 블록 내 Activity는 순서를 가진다.
7. RouteGraph 검증 없이 Plan 생성 불가.
8. Override는 원본 데이터를 파괴하지 않는다.

---

# 13️⃣ 이 구조의 장점

✅ 시간-일정 1:N 표현 가능  
✅ 조건부 이벤트 가능  
✅ Drag & Drop 확장 가능  
✅ ERP 확장 가능  
✅ 예약/옵션 상품 연결 가능  
✅ 통계/분석 가능  
✅ PDF 타임라인 표현 용이

---

# 14️⃣ 최종 결론

TimeEvent 단일 구조는 폐기한다.

> TimeBlock + Activity 구조를  
> Tour Itinerary ERP의 공식 도메인 모델로 확정한다.

이제 이 모델이:

- DB 스키마의 기준
- GraphQL 스키마의 기준
- 프론트 상태 모델의 기준

이 된다.
