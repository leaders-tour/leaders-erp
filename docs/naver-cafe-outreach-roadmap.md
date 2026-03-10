# Naver Cafe Outreach Roadmap

## 목적

네이버 카페 게시글 수집 -> AI 구조화/초안 생성 -> ERP 승인 -> Gmail 발송 흐름을 운영 가능한 수준으로 완성한다.

## 현재 완료

- Prisma 모델 추가
  - `CafeSource`
  - `CafeLead`
  - `OutreachDraft`
  - `OutboundMessage`
  - `ContactSuppression`
- 신규 migration 작성 및 `leaders-db2` 반영
- `apps/workers` 추가
  - `worker-cafe`
  - `worker-ai`
  - `worker-mail`
  - `bootstrap:naver-auth`
- API GraphQL outreach 모듈 추가
- ERP 웹 화면 추가
  - 리드 리스트
  - 리드 상세 / 승인 액션
- 기본 단위 테스트 추가
  - articleId 추출
  - HTML 파서
  - 연락처 regex
  - AI schema 검증
- README / env example 정리

## 남은 작업

### 1. 실환경 스모크 테스트

- 실제 네이버 카페 게시판에서 `worker-cafe` selector 동작 확인
- iframe / 제목 / 본문 / 메타데이터 fallback이 충분한지 확인
- storageState 만료/재로그인 흐름 확인

### 2. 운영 보강

- `CafeSource.boardName`을 env 고정값이 아니라 실제 게시판명으로 채우기
- suppression 관리 UI 또는 최소 관리 API 추가
- 리드 상세에서 연락처 수동 보정 기능 추가 여부 결정
- `다시 생성` 후 worker-ai 자동 트리거 방식 결정

### 3. 품질 보강

- worker-cafe 통합 테스트 fixture 확대
- mail footer / HTML 렌더링 검증 강화
- 발송 실패 재시도 정책 명확화
- lead score 규칙과 prompt version 운영 기준 문서화

### 4. 배포 준비

- `leaders-db2` 기준 초기 운영 검증
- worker 실행 방식 결정
  - pm2 / systemd / cron / container
- Gmail 한도 및 수신거부 처리 운영 정책 정리

## 다음 우선순위

1. 실카페 storageState bootstrap
2. `worker-cafe` 실게시판 수집 확인
3. `worker-ai` 실제 초안 품질 확인
4. 관리자 승인 후 Gmail 발송 end-to-end 확인

## 운영 원칙

- 새 작업은 이 문서를 기준 이정표로 삼는다.
- DB 영향이 있는 변경은 계속 `leaders-db2`에서 먼저 검증한다.
- migration 파일은 항상 활성 체인 `infra/prisma/prisma/migrations/` 기준으로 관리한다.
