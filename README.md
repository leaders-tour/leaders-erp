# leaders-erp Outreach Workflow

## 전체 시스템 구조

```text
worker-cafe
  -> CafeLead 저장
worker-ai
  -> parsedNeedsJson / OutreachDraft 생성
ERP 관리자 화면
  -> 검토 / 수정 / 승인
worker-mail
  -> Gmail 발송
```

이 기능은 자동 대량 발송 시스템이 아니라 승인 기반 영업 보조 도구다.

## 실행 방법

```bash
pnpm install
cp .env.example .env
pnpm --filter @tour/prisma db:deploy
pnpm --filter @tour/prisma db:generate
pnpm --filter @tour/api dev
pnpm --filter @tour/web dev
```

워커는 각각 독립 실행한다.

```bash
pnpm --filter @tour/workers bootstrap:naver-auth
pnpm --filter @tour/workers worker:cafe
pnpm --filter @tour/workers worker:ai
pnpm --filter @tour/workers worker:mail
```

## 네이버 로그인 bootstrap

- `bootstrap:naver-auth` 실행
- 브라우저에서 직접 로그인
- 터미널에서 Enter
- `secrets/naver-auth.json` 저장

이후 `worker-cafe`는 storageState를 재사용한다.

## 관리자 UI 사용 방법

- 경로: `/outreach/leads`
- 리스트에서 새 리드 확인
- 상세에서 원문 / parsed needs / AI 초안을 동시에 검토
- 액션
  - `승인`
  - `수정 후 승인`
  - `보류`
  - `제외`
  - `다시 생성`

`다시 생성`은 즉시 메일을 새로 만드는 것이 아니라 worker-ai가 다시 처리할 수 있도록 상태를 되돌리는 동작이다.

## 메일 발송 설정

- Gmail SMTP 사용
- 필수 env
  - `GMAIL_USER`
  - `GMAIL_APP_PASSWORD`
  - `MAIL_FROM`
- 발송 조건
  - 승인된 초안
  - 이메일 존재
  - suppression 비대상
- 시간당 최대 30건 발송

## 운영 시 주의사항

- selector 변경 가능성이 있어 artifact screenshot/html 확인이 필요하다.
- storageState 만료 시 bootstrap을 다시 수행해야 한다.
- 이메일이 없는 리드는 남기되 승인과 발송은 막는다.
- Gmail 일반 비밀번호가 아니라 앱 비밀번호를 사용해야 한다.
