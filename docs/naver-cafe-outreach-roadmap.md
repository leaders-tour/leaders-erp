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
- 실카페 스모크 테스트 1차 완료
  - 대상 게시판: `https://cafe.naver.com/f-e/cafes/10709297/menus/177?viewType=L`
  - `storageState` bootstrap 완료
  - 신형 `f-e` / `ca-fe` 경로 대응
  - iframe 미사용 페이지 대응
  - 실제 게시글 상세 HTML / screenshot artifact 저장 확인
  - `leaders-db2`에 실데이터 수집 확인

## 남은 작업

### 1. 실환경 스모크 테스트

- `worker-cafe`는 실제 네이버 카페 게시판에서 동작 확인 완료
- iframe / 제목 / 본문 / 메타데이터 fallback은 1차 검증 완료
- 남은 확인
  - storageState 만료/재로그인 흐름 확인
  - `worker-ai` 실제 OpenAI 응답 품질 확인
  - 승인 후 `worker-mail` Gmail 발송 end-to-end 확인

## 최근 실측 결과

- 2026-03-11 실카페 수집 결과
  - `CafeLead` 18건 저장
  - `FETCHED` 17건
  - `DISCOVERED` 1건
  - `FAILED` 0건
- 확인된 실제 수집 articleId 예시
  - `255761`
  - `255760`
  - `255754`
  - `255751`
  - `255743`
  - `255742`
  - `255736`
- artifact 저장 예시
  - `tmp/artifacts/cafe/255761/.../article.html`
  - `tmp/artifacts/cafe/255761/.../article.png`

## 현재 블로커

- `.env`에 `OPENAI_API_KEY`가 없어 `worker-ai` 실테스트는 아직 미진행
- `.env`에 Gmail 발송 계정 값이 없어 `worker-mail` 실테스트는 아직 미진행

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
