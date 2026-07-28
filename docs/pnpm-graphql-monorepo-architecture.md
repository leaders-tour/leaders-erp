# pnpm GraphQL 모노레포 아키텍처 참고 문서

## 1. 개요

이 문서는 `leaders-erp`의 현재 구조를 바탕으로, 다른 TypeScript 프로젝트에서도 참고할 수 있도록 일반화한 모노레포 구성 가이드다.

핵심 목표는 다음과 같다.

- Web, API, Worker를 독립적으로 개발하고 배포한다.
- 도메인 로직과 입력 검증을 여러 애플리케이션에서 공유한다.
- GraphQL 계약, 런타임 검증, 실제 요청 payload를 동기화한다.
- 데이터베이스 변경 이력을 migration으로 관리한다.

## 2. 전체 디렉터리 구조

```text
repo/
├── apps/
│   ├── web/                 React + Vite 프론트엔드
│   ├── api/                 Express + Apollo GraphQL API
│   └── workers/             동기화 및 장시간 실행 작업
├── packages/
│   ├── domain/              공유 도메인 타입·계산·출력 포맷
│   ├── validation/          Zod 입력 스키마
│   ├── ui/                  공유 UI 컴포넌트
│   └── config/              공통 설정
├── infra/
│   └── prisma/              Prisma 스키마·migration·DB 스크립트
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

워크스페이스는 `pnpm-workspace.yaml`에서 관리한다.

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "infra/*"
```

이 프로젝트는 Turborepo를 사용하지 않고 pnpm workspace의 재귀 실행과 `--filter`를 사용한다.

## 3. 애플리케이션 역할

### `apps/web`

- React 기반 사용자 인터페이스
- Apollo Client를 통한 GraphQL 요청
- 사용자 입력의 즉시 피드백을 위한 클라이언트 검증
- 견적서·확정서 화면과 PDF 미리보기 렌더링

Web의 검증은 사용자 경험을 위한 것이다. 최종적인 입력 신뢰 여부는 반드시 API에서 다시 판단해야 한다.

### `apps/api`

- Express 기반 HTTP 서버
- Apollo Server 기반 GraphQL API
- JWT 인증 및 역할별 권한 검사
- Zod를 이용한 런타임 입력 검증
- Service 계층의 비즈니스 로직 실행
- Prisma를 통한 MySQL 접근
- PDF 생성 등 일부 REST 엔드포인트 제공

### `apps/workers`

- Google Sheet 등 외부 데이터 동기화
- 메일·AI·브라우저 자동화 작업
- 일정 주기로 반복되는 장시간 실행 프로세스
- API와 별도의 프로세스 및 배포 단위로 운영

## 4. 공유 패키지 역할

### `packages/domain`

프레임워크와 저장소에 종속되지 않는 공유 도메인 로직을 둔다.

주요 대상:

- enum 및 모델 타입
- 금액·일정 계산
- 고객 문서 출력 포맷
- 여러 애플리케이션에서 동일하게 사용해야 하는 순수 함수

가능하면 React, Express, Prisma에 의존하지 않도록 유지한다.

### `packages/validation`

Zod 기반 외부 입력 계약을 관리한다.

```ts
export const planVersionTransportGroupInputSchema = z.object({
  teamName: z.string().min(1),
  headcount: z.number().int().min(1),
  flightInDate: optionalDateTimeInputSchema,
  flightInTime: optionalTimeSchema,
});

export type PlanVersionTransportGroupInput =
  z.infer<typeof planVersionTransportGroupInputSchema>;
```

API에서는 런타임 검증에 사용한다.

```ts
const parsed = planVersionCreateSchema.safeParse(input);

if (!parsed.success) {
  throw createValidationError("Invalid plan input", parsed.error);
}
```

Web에서도 같은 스키마 또는 관련 타입을 활용할 수 있지만, 서버 검증을 대체하지는 않는다.

### `packages/ui`

- 공통 버튼, 입력, 카드, 테이블
- 디자인 토큰과 공통 상호작용
- Web 애플리케이션 전용 공유 계층

### `infra/prisma`

- `schema.prisma`
- 활성 migration 이력
- Prisma Client 생성
- DB 배포 및 seed 스크립트

현재 데이터베이스 provider는 MySQL이다.

## 5. 패키지 연결 방식

API는 공유 패키지를 workspace 의존성으로 선언한다.

```json
{
  "dependencies": {
    "@tour/domain": "workspace:*",
    "@tour/validation": "workspace:*"
  }
}
```

TypeScript는 루트 `tsconfig.base.json`의 path mapping으로 소스 위치를 해석한다.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@tour/domain": ["packages/domain/src/index.ts"],
      "@tour/validation": ["packages/validation/src/index.ts"],
      "@tour/ui": ["packages/ui/src/index.ts"]
    }
  }
}
```

따라서 애플리케이션에서는 상대 경로 대신 패키지 이름을 사용한다.

```ts
import { planVersionCreateSchema } from "@tour/validation";
import { formatTransportFlightLines } from "@tour/domain";
```

## 6. API 내부 계층

일반적인 요청 흐름은 다음과 같다.

```text
GraphQL Request
    ↓
Resolver
    ↓
Service
    ↓
Repository
    ↓
Prisma Client
    ↓
MySQL
```

### Resolver

- GraphQL 인자와 context 수신
- 로그인 및 역할 권한 검사
- Service 호출
- GraphQL 응답 반환

Resolver에는 복잡한 비즈니스 로직을 넣지 않는다.

### Service

- Zod 입력 검증
- 비즈니스 규칙
- 여러 Repository 호출 조합
- 트랜잭션 경계
- 도메인 오류 변환

### Repository

- Prisma 조회·생성·수정·삭제
- 반복되는 include/select 캡슐화
- 저장소 세부 구현을 Service에서 분리

### Context

GraphQL 요청별로 다음 정보를 주입한다.

- Prisma Client
- 현재 로그인 직원
- 요청·응답 객체
- 인증 관련 정보

## 7. GraphQL 입력 계약 변경 원칙

GraphQL 입력 필드를 변경할 때 한 계층만 수정하면 안 된다.

다음 항목을 하나의 변경 단위로 관리한다.

1. GraphQL SDL
2. `packages/validation`의 Zod 스키마
3. Web의 payload builder
4. API Service 및 Repository
5. GraphQL codegen 결과
6. 관련 단위 테스트와 타입체크

예를 들어 항공권 날짜를 선택적으로 허용한다면 다음을 함께 확인한다.

```text
PlanVersionTransportGroupInput GraphQL SDL
→ planVersionTransportGroupInputSchema
→ mapTransportGroupToPlanMutationInput
→ PlanService validation
→ PlanRepository 저장
→ 견적서·확정서 출력 포맷
```

## 8. 개발 서버와 공유 패키지 watch

현재 API 개발 명령은 다음과 같다.

```json
{
  "dev": "tsx watch --include 'src/schema/**/*.graphql' src/index.ts"
}
```

이 설정은 API 소스와 GraphQL SDL 변경은 감지하지만, pnpm workspace 링크로 연결된 `packages/validation` 또는 `packages/domain` 변경을 놓칠 수 있다.

그 결과 다음과 같은 상황이 발생할 수 있다.

1. Web HMR에는 새 계약이 반영된다.
2. API 프로세스는 이전 Zod 스키마를 메모리에 유지한다.
3. Web의 최신 요청을 API의 이전 검증 규칙이 거부한다.

### 개선안 A: 공유 소스 명시 감시

```json
{
  "dev": "tsx watch --include 'src/schema/**/*.graphql' --include '../../packages/validation/src/**/*' --include '../../packages/domain/src/**/*' src/index.ts"
}
```

프로젝트와 `tsx` 버전에 따라 glob 동작을 확인해야 한다.

### 개선안 B: 공유 패키지 watch build

```text
packages/domain src → dist watch build
packages/validation src → dist watch build
apps/api → dist 패키지를 import
```

프로덕션과 개발의 모듈 해석 방식을 일치시키고 싶다면 이 방식이 더 명확하다.

### 최소 운영 원칙

공유 검증 패키지를 변경한 뒤에는 다음을 수행한다.

```bash
pnpm --filter @tour/validation typecheck
pnpm --filter @tour/api typecheck
pnpm --filter @tour/web typecheck
```

개발 중인 API가 기존 규칙을 계속 사용한다면 API 프로세스를 재시작한다.

## 9. 빌드와 배포

현재 권장 배포 단위:

- Web: Vercel
- API: CloudType Docker 서비스
- Worker: CloudType 별도 Docker 서비스
- DB: MySQL

API Docker 흐름:

```text
pnpm install
→ Prisma Client 생성
→ API build
→ container 시작
→ prisma migrate deploy
→ API start
```

Web과 API를 따로 배포하므로 계약 변경 시 배포 순서도 중요하다.

하위 호환이 필요한 경우:

1. API가 기존 필드와 새 필드를 모두 받을 수 있게 먼저 배포한다.
2. 새 필드를 보내는 Web을 배포한다.
3. 필요하면 후속 배포에서 기존 필드를 제거한다.

Web을 먼저 배포해 API에 없는 GraphQL 필드를 조회하면 전체 GraphQL operation이 실패할 수 있다.

## 10. 다른 프로젝트 적용 시 권장 원칙

1. API는 모든 외부 입력을 런타임에서 다시 검증한다.
2. `domain`은 프레임워크·DB에 의존하지 않는 순수 로직 중심으로 유지한다.
3. GraphQL SDL, Zod, payload builder를 하나의 계약으로 관리한다.
4. Resolver에는 전달·권한 로직만 두고 비즈니스 규칙은 Service로 이동한다.
5. Prisma 세부 조회는 Repository로 캡슐화한다.
6. DB 변경은 migration 파일로 저장하고 배포 이력에 포함한다.
7. Web, API, Worker는 독립적으로 배포할 수 있게 구성한다.
8. 공유 패키지의 개발 watch와 프로덕션 module resolution을 명시적으로 설계한다.
9. 역할별 권한은 UI 숨김뿐 아니라 API에서 강제한다.
10. 계약 변경 테스트에는 정상 입력뿐 아니라 부분 입력·누락·레거시 데이터도 포함한다.

## 11. 주의할 점

### 공유 TypeScript 소스 직접 노출

`package.json`의 `main`이 `src/index.ts`를 가리키는 구조는 개발에는 간단하지만, plain Node 프로덕션 실행과 패키지 배포 경계가 불명확해질 수 있다.

규모가 커지면 각 공유 패키지가 `dist`를 생성하고 `exports`로 진입점을 명시하는 방식을 고려한다.

### 클라이언트 검증 의존

Web의 검증은 우회할 수 있다. 권한과 필수 비즈니스 규칙은 반드시 API에서 검사한다.

### Prisma 모델 직접 노출

Prisma 모델을 GraphQL 응답으로 그대로 노출하면 DB 구조와 API 계약이 강하게 결합된다. 공개 계약이 중요한 영역은 mapper 또는 DTO를 둔다.

### 분리 배포 계약 불일치

Web과 API가 서로 다른 버전으로 배포될 수 있음을 전제로 새 필드는 가능한 한 optional하게 추가하고, 제거는 단계적으로 진행한다.

## 12. 요약

이 구조의 핵심은 다음과 같다.

```text
pnpm workspace로 애플리케이션과 공유 패키지 관리
→ GraphQL SDL로 네트워크 계약 정의
→ Zod로 런타임 입력 검증
→ Service에서 비즈니스 규칙 처리
→ Repository와 Prisma로 DB 접근
→ Web, API, Worker를 독립 배포
```

구조 자체보다 중요한 것은 GraphQL, Zod, payload, 저장, 출력 포맷을 하나의 계약으로 보고 함께 변경하는 것이다.
