# 📘 Coding Convention & Rules v1 (Official Final)

## Tour Itinerary ERP – Monorepo + AI Agent 협업 기준

---

# 📑 Table of Contents

1. 기본 원칙
2. Monorepo 구조 규칙
3. TypeScript 규칙
4. API 타입 동기화 규칙 (GraphQL Codegen)
5. Zustand 상태관리 규칙
6. React 컴포넌트 규칙
7. React Hook Form 규칙
8. Zod Validation 규칙
9. GraphQL 규칙 (API Layer)
10. Prisma 규칙 (DB Layer)
11. 파일 네이밍 규칙
12. ESLint & Prettier 규칙
13. Git 규칙
14. AI Agent 협업 규칙
15. 성능 규칙
16. ERP 확장 대비 규칙

---

# 1️⃣ 기본 원칙

## 1.1 Single Source of Truth

- DB 구조의 진실 → **Prisma Schema**
- API 구조의 진실 → **GraphQL Schema**
- 도메인 타입의 진실 → **packages/domain**
- 프론트 타입의 진실 → **GraphQL Codegen 결과물**

---

## 1.2 절대 금지

❌ any 사용 금지 (암묵적 any 포함)  
❌ as any 캐스팅 금지  
❌ 도메인 타입을 프론트에서 재정의  
❌ 매직 스트링 사용  
❌ 순환 의존성  
❌ 비즈니스 로직을 UI 레이어에 작성

---

# 2️⃣ Monorepo 구조 규칙 (pnpm)

```
apps/
  web/
  api/

packages/
  domain/
  ui/
  config/
```

## 규칙

- apps는 packages에만 의존 가능
- packages 간 순환 참조 금지
- domain은 가장 하위 계층
- infra 설정은 packages/config에 위치
- packages/ui는 shadcn 기반 UI 래퍼 레이어이다.

---

# 3️⃣ TypeScript 규칙

## 3.1 Strict Mode 필수

`"strict": true "noImplicitAny": true "noUncheckedIndexedAccess": true`

## 3.2 네이밍 규칙

| 구분       | 규칙             |
| ---------- | ---------------- |
| 인터페이스 | PascalCase       |
| Enum       | PascalCase       |
| 타입       | PascalCase       |
| 함수       | camelCase        |
| 상수       | UPPER_SNAKE_CASE |

---

## 3.3 도메인 타입 위치

`packages/domain/src/`

프론트에서 재정의 금지.

---

# 4️⃣ API 타입 동기화 규칙 (GraphQL Codegen)

## 🎯 원칙

프론트는 API 타입을 직접 정의하지 않는다.

GraphQL Code Generator를 사용하여  
서버 스키마와 100% 일치하는 타입을 자동 생성한다.

---

## 4.1 흐름

`GraphQL Schema     ↓ Codegen 실행     ↓ generated/graphql.ts 생성     ↓ 프론트에서 직접 사용`

---

## 4.2 사용 방식

`type Plan = GetPlanQuery["plan"]`

---

## 4.3 금지

❌ API 응답 타입 수동 정의  
❌ 도메인 타입과 API 타입 혼용  
❌ any 캐스팅으로 타입 우회

---

# 5️⃣ Zustand 상태관리 규칙

## 사용 범위

- UI 상태
- 선택 상태
- 편집 임시 상태

## 금지

❌ API 호출 로직 작성  
❌ 비즈니스 로직 작성  
❌ 거대한 글로벌 단일 store

---

# 6️⃣ React 컴포넌트 규칙

## 구조 예시

```
components/
  PlanEditor/
    PlanEditor.tsx
    TimeBlockCard.tsx
    ActivityItem.tsx
```

## 규칙

- 150줄 초과 금지
- useEffect 남발 금지
- Container / Presentational 분리
- 명확한 Props 타입 정의

---

## 6.1 UI Layer 규칙

### 원칙

- 기본 UI 컴포넌트는 shadcn 사용
- 커스텀 UI는 shadcn 기반으로 확장
- 프로젝트 외부 UI 라이브러리 추가 금지

### 사용 범위

✅ Dialog  
✅ Sheet  
✅ Dropdown  
✅ Select  
✅ Tabs  
✅ Tooltip  
✅ Toast  
✅ AlertDialog

### 금지

❌ 직접 Radix 사용  
❌ shadcn 내부 코드 직접 수정  
❌ styles override 난발  
❌ 디자인 토큰 무시

### 위치 규칙

`packages/ui/    
  ㄴbutton.tsx   
  ㄴdialog.tsx   
  ㄴsheet.tsx`

apps/web에서는 직접 shadcn import 금지.

```
packages/ui/
  base/         (shadcn raw components)
  composite/    (프로젝트 특화 UI)
  layout/
```

우리는:

- shadcn을 사용한다
- 하지만 “UI 안정화 도구”로만 쓴다
- 구조는 그대로 유지한다
- packages/ui에 격리한다

---

# 7️⃣ React Hook Form 규칙

- 모든 폼은 RHF 사용
- Zod와 연결
- 서버 validation과 동일 로직 유지

---

# 8️⃣ Zod Validation 규칙

## 위치

`packages/domain/validation/`

## 원칙

- 서버/프론트 동일 스키마 사용
- 모든 입력은 Zod로 검증

---

# 9️⃣ GraphQL 규칙 (API Layer)

## 구조

```
api/modules/
  plan/
    plan.resolver.ts
    plan.service.ts
    plan.repository.ts
```

## 역할 분리

| 레이어     | 역할        |
| ---------- | ----------- |
| resolver   | 입출력 처리 |
| service    | 도메인 로직 |
| repository | DB 접근     |

## 금지

❌ resolver에서 prisma 직접 호출  
❌ validation 생략

---

# 🔟 Prisma 규칙 (DB Layer)

## 10.1 Repository Layer에서만 사용

Prisma 직접 호출은 repository 내부에서만.

---

## 10.2 트랜잭션 규칙

Plan 생성 시:

- Plan
- DayPlan
- TimeBlock
- Activity

모두 하나의 transaction 안에서 처리.

---

# 11️⃣ 파일 네이밍 규칙

| 유형       | 예시               |
| ---------- | ------------------ |
| 컴포넌트   | PlanEditor.tsx     |
| store      | plan.store.ts      |
| service    | plan.service.ts    |
| repository | plan.repository.ts |
| validation | plan.schema.ts     |

---

# 12️⃣ ESLint & Prettier 규칙

- unused import 금지
- console.log production 금지
- 파일 최대 300줄
- 함수 최대 80줄

---

# 13️⃣ Git 규칙

## 브랜치 네이밍

`feature/plan-editor fix/segment-validation refactor/timeblock-logic`

---

## 커밋 메시지 규칙

### 접두어는 유지 (영문)

`feat: fix: refactor: chore:`

### 본문은 반드시 한글로 작성

예:

`feat: 타임블록 드래그 정렬 기능 추가 fix: 세그먼트 연결 검증 로직 오류 수정 refactor: Activity 컴포넌트 구조 개선`

### 금지

❌ 영어 본문 작성  
❌ “수정”, “업데이트” 같은 모호한 메시지

---

# 14️⃣ AI Agent 협업 규칙

## AI 요청 시 반드시 명시

- 파일 경로
- 변경 범위
- 기존 구조 변경 여부

---

## 변경 순서 원칙

1. PRD 수정
2. Domain 수정
3. DB 수정
4. API 수정
5. 프론트 수정

---

## 금지

❌ 전체 리팩토링 요청  
❌ 구조 변경 요청  
❌ 도메인 변경 요청

---

# 15️⃣ 성능 규칙

- N+1 방지
- GraphQL depth 제한
- orderIndex 기준 정렬
- 무한 렌더 방지
- 불필요한 re-render 방지

---

# 16️⃣ ERP 확장 대비 규칙

- 모든 주요 모델에 createdAt / updatedAt 유지
- Soft delete는 추후 도입
- Region → Company 확장 가능 구조 유지
- Multi-tenant 대비 구조 유지
- Activity 통계 확장 가능 설계 유지

---

# 🎯 최종 선언

이 문서는:

- Tour Itinerary ERP의 공식 코드 규칙 문서다.
- AI Agent와 협업 가능한 구조를 보장한다.
- ERP 확장 시에도 구조가 무너지지 않도록 설계되었다.
- 타입 불일치로 인한 런타임 오류를 최소화한다.
