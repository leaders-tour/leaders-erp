# 분리 배포 실행 계획 (Web: Vercel / API: CloudType)

## 1) 근거 문서

- 아키텍처 기준: `docs/Technical Design Document.md`
  - Web: Vercel
  - API: CloudType
  - DB: AWS RDS MySQL
- DB 변경/배포 기준: `docs/db-migration-runbook.md`
- S3 업로드 환경변수 기준: `docs/location-guide-image-upload-env.md`

## 2) 현재 상태 기반 핵심 결론

- 현재 구조는 분리 배포가 정석이다.
  - `apps/web`: Vite 정적 빌드 결과물(`dist`) 배포
  - `apps/api`: Express + Apollo 장기 실행 서버 배포
- 단, API `start` 스크립트 경로 점검이 필요하다.
  - 현재: `node dist/index.js`
  - 실제 빌드 산출: `apps/api/dist/apps/api/src/index.js`
- 프론트 환경변수 명칭을 배포 시 명확히 분리해야 한다.
  - 런타임: `VITE_GRAPHQL_URL` (웹 앱에서 사용)
  - 코드젠: `WEB_GRAPHQL_URL` (로컬 codegen 용도)

## 3) 목표 환경

- `staging`
  - Web: `staging-web.<domain>`
  - API: `staging-api.<domain>`
  - DB: staging RDS
  - S3 Prefix: `stg`
- `production`
  - Web: `<domain>`
  - API: `api.<domain>`
  - DB: production RDS
  - S3 Prefix: `prd`

## 4) 환경변수 매트릭스

### API (CloudType)

- 필수
  - `DATABASE_URL`
  - `API_PORT` (CloudType가 내부 포트를 요구하면 해당 값으로 고정)
  - `AWS_REGION`
  - `S3_BUCKET`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- 선택
  - `AWS_SESSION_TOKEN`
  - `S3_KEY_PREFIX` (`stg`, `prd`)
  - `S3_PUBLIC_BASE_URL`
  - `S3_UPLOAD_TIMEOUT_MS`

### Web (Vercel)

- 필수
  - `VITE_GRAPHQL_URL=https://<api-domain>/graphql`
- 선택
  - `WEB_GRAPHQL_URL` (Vercel에서 codegen 수행 시에만)

## 5) 선행 작업 (D-3 ~ D-1)

1. API 시작 커맨드 점검
   - CloudType 시작 명령을 실제 빌드 산출 경로에 맞춰 확정
   - 후보: `node apps/api/dist/apps/api/src/index.js`
2. 배포 플랫폼별 워크스페이스 빌드 커맨드 확정
   - 공통 설치: `pnpm install --frozen-lockfile`
   - API 빌드: `pnpm --filter @tour/api build`
   - Web 빌드: `pnpm --filter @tour/web build`
3. 도메인/인증서/DNS 레코드 사전 생성
   - `api.<domain>` -> CloudType
   - `<domain>` 및 필요 시 `www` -> Vercel
4. 시크릿 분리
   - staging/prod 서로 다른 `DATABASE_URL`, AWS Key 사용

## 6) 배포 순서 (릴리스 당일 Runbook)

1. API 선배포 (staging)
   - CloudType에 API 배포
   - `/health` 확인
   - GraphQL introspection 또는 샘플 Query 확인
2. DB 마이그레이션 적용
   - `pnpm --filter @tour/prisma db:deploy`
   - 검증:
     - `pnpm --filter @tour/prisma db:generate`
     - `pnpm --filter @tour/api typecheck`
     - `pnpm --filter @tour/web typecheck`
3. Web 배포 (staging)
   - Vercel 환경변수 `VITE_GRAPHQL_URL`을 staging API로 설정
   - 배포 후 주요 화면/Mutation smoke test
4. production 동일 절차 반복
   - API -> DB deploy -> Web 순서 고정

## 7) CI/CD 권장 파이프라인

1. `lint + typecheck + test` (모노레포)
2. API build artifact 생성/검증
3. Web build artifact 생성/검증
4. 운영 승인 후:
   - API deploy
   - DB deploy (`@tour/prisma db:deploy`)
   - Web deploy

## 8) 롤백 전략

- Web: Vercel 이전 배포로 즉시 롤백
- API: CloudType 이전 릴리스로 롤백
- DB: 직접 다운그레이드보다 "정방향 복구 migration" 원칙
  - `migrate resolve`는 복구 시나리오에서만 사용
  - 사용 시 migration 이름/사유를 릴리스 기록에 남김

## 9) 운영 체크리스트

1. API
   - `/health` 200 확인
   - `/graphql` 응답 지연/에러율 확인
2. 파일 업로드
   - `createLocationGuide`, `updateLocationGuide` 업로드 성공
   - DB `LocationGuide.imageUrls` 저장 확인
   - 공개 URL 접근 확인
3. 프론트
   - 브라우저 콘솔 CORS/network 에러 없음
   - 주요 생성/수정 Mutation 정상

## 10) 리스크와 대응

1. API 시작 경로 불일치
   - 대응: 배포 전 CloudType 시작 명령 고정 및 staging에서 프로세스 부팅 검증
2. 환경변수 혼동 (`WEB_GRAPHQL_URL` vs `VITE_GRAPHQL_URL`)
   - 대응: 웹 런타임은 `VITE_GRAPHQL_URL`만 사용하도록 운영 표준화
3. migration 파일 누락
   - 현재 `infra/prisma/prisma/migrations`는 gitignore 대상일 수 있으므로
   - 필요 시 `git add -f infra/prisma/prisma/migrations/...` 강제 추가

## 11) 즉시 실행 TODO (이번 주)

1. CloudType 서비스 2개 생성: `tour-api-stg`, `tour-api-prd`
2. Vercel 프로젝트 2개 생성: `tour-web-stg`, `tour-web-prd`
3. staging 기준 1회 리허설
   - API 배포 -> `db:deploy` -> Web 배포 -> smoke test
4. 리허설 결과 기반으로 production 컷오버 일정 확정
