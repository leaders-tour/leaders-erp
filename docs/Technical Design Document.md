# 📐 Technical Design Document v2

## Tour Itinerary ERP – Full Stack Architecture (AI Agent Optimized)

---

# 1. 문서 목적

본 문서는 Tour Itinerary Admin MVP를  
**향후 여행사 기업용 ERP 시스템으로 확장 가능하도록 설계하기 위한 기술 설계 문서**이다.

이 시스템은 단순 일정 생성기가 아니라:

> Route Graph + Time Event Engine 기반  
> 여행 일정 생성 플랫폼

을 목표로 한다.

또한 본 설계는:

- AI 코딩 에이전트(Cursor / Claude Code / Codex)가
- 프론트 + 서버 + DB를 동시에 개발 가능하도록

구조를 명확히 정의하는 것을 목적으로 한다.

---

# 2. 전체 시스템 아키텍처

## 2.1 최종 구조

`pnpm monorepo │ ├── apps/ │   ├── web  (Vite + React)      → Vercel │   └── api  (Node + Express)    → CloudType │ ├── packages/ │   ├── domain      (공통 도메인 타입) │   ├── validation  (Zod schemas) │   └── config      (공통 설정) │ └── infra/     └── prisma (MySQL schema)`

---

# 3. 프론트엔드 설계

## 3.1 기술 스택

- Vite + React
- TypeScript
- TailwindCSS
- Zustand (전역 상태 관리)
- Zod (도메인 검증)
- React Hook Form (폼 확장 대비)
- Apollo Client (GraphQL 연동)

배포: **Vercel**

---

## 3.2 상태 관리 전략

### Zustand 채택 이유

- Redux 대비 러닝커브 낮음
- 보일러플레이트 최소화
- 전역 상태 구조 명확
- AI Agent가 이해하기 쉬운 구조
- ERP 확장에 적합

### 상태 분리 원칙

UI 상태와 도메인 상태를 분리한다.

`/store   route.store.ts   settings.store.ts   override.store.ts   plan.store.ts`

---

## 3.3 데이터 흐름

초기 MVP:

`UI → Zustand Store → Engine → Derived Plan → Render`

서버 연동 후:

`UI → Apollo Client → GraphQL API → DB`

---

## 3.4 프론트 아키텍처 원칙

1. UI 컴포넌트에 비즈니스 로직 금지
2. 도메인 로직은 engine 계층에 위치
3. 모든 도메인 타입은 packages/domain에서 공유
4. 폼 입력은 Zod 기반 검증
5. 타임테이블은 배열 기반 구조 유지

---

## 3.5 UI Layer 원칙

- UI 기본 컴포넌트는 shadcn 기반으로 사용
- Tailwind는 스타일 확장/토큰 정의용으로 사용
- shadcn 컴포넌트는 `packages/ui`에 래핑하여 사용
- 직접 Radix 호출 금지 (shadcn 통해서만 사용)

### 🎯 명확히 적어야 할 것

- shadcn은 “디자인 시스템 대체”가 아니라 “UI 안정화 레이어”
- 비즈니스 로직은 절대 shadcn 컴포넌트 안에 작성하지 않음
- 테이블은 shadcn 대신 TanStack Table 사용 고려

---

# 4. 백엔드 설계

## 4.1 기술 스택

- Node.js
- Express
- Apollo Server (GraphQL)
- TypeScript
- Prisma ORM

배포: **CloudType (한국 클라우드)**

---

## 4.2 서버 구조

`apps/api │ ├── src/ │   ├── schema/        (GraphQL schema) │   ├── resolvers/     (API entry) │   ├── services/      (비즈니스 로직) │   ├── repositories/  (DB 접근) │   ├── domain/        (서버 도메인 로직) │   └── context/       (Auth / Request context)`

---

## 4.3 계층 구조

`Resolver    ↓ Service    ↓ Repository    ↓ Prisma    ↓ MySQL`

비즈니스 로직은 반드시 Service 계층에만 존재한다.

---

## 4.4 GraphQL 채택 이유

- 중첩 일정 구조 표현에 적합
- ERP 확장 대비
- Overfetch 방지
- 타입 기반 설계 용이
- 프론트-서버 타입 일관성 유지 가능

---

# 5. 데이터베이스 설계

## 5.1 DB 선택

> AWS RDS MySQL

### 선택 이유

- 안정성
- ERP 친화적 구조
- 트랜잭션 신뢰성
- Prisma 완전 지원
- 향후 통계 및 분석 확장 가능

---

## 5.2 핵심 엔티티 (개념 정의)

- Region
- Location
- Segment
- Plan
- DayPlan
- TimeEvent
- Override

---

## 5.3 Prisma 기반 Single Source of Truth

Prisma Schema가:

- DB 구조
- GraphQL 타입
- Domain 타입

의 기준이 된다.

---

# 6. 인프라 설계

## 6.1 배포 구조

| 계층     | 서비스        |
| -------- | ------------- |
| 프론트   | Vercel        |
| API 서버 | CloudType     |
| DB       | AWS RDS MySQL |

---

## 6.2 향후 확장

- Redis (거리 API 캐싱)
- S3 (PDF 저장)
- Docker 기반 서버 분리
- CI/CD 자동화

---

# 7. 모노레포 전략 (AI Agent 최적화)

## 7.1 pnpm Monorepo 채택 이유

- 프론트/서버 동시 개발 가능
- 도메인 타입 공유
- Validation 재사용
- AI가 full-stack 수정 가능

---

## 7.2 공유 패키지

### packages/domain

- Location
- Segment
- Plan
- TimeEvent
- Variant
- Region

### packages/validation

- Zod 스키마
- 입력 검증 규칙

---

# 8. AI Agent 친화 설계 원칙

1. Domain은 반드시 packages에 위치
2. 비즈니스 로직은 Service에만 존재
3. UI는 렌더링만 담당
4. GraphQL 스키마 먼저 정의
5. Zod로 입력 검증
6. 타입 중복 정의 금지
7. Prisma schema 변경 시 모든 레이어 동기화

---

# 9. 보안 및 ERP 확장 대비

향후 필요 요소:

- JWT 기반 인증
- Role 기반 접근 제어
- Multi-tenant 구조
- Audit Log 저장

---

# 10. 단계별 구현 전략

## Phase 1 (MVP 기반)

- Monorepo 세팅
- Prisma + RDS 연결
- Express + Apollo 구성
- 기본 Plan CRUD API 구현

## Phase 2

- RouteGraph DB화
- Template 관리 기능
- 프론트 GraphQL 연결

## Phase 3

- 권한 시스템
- 기업 계정 구조
- PDF 서버 렌더링

---

# 11. 결론

이 시스템은 단순 일정 편집기가 아니라:

> 여행사 ERP 확장을 전제로 한  
> AI 에이전트 친화형 Full Stack 아키텍처

로 설계된다.
