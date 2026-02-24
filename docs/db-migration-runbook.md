# DB Migration Runbook (Prisma)

## 목적

Codex 환경(비대화형)에서 로컬/공용 DB를 안전하게 업데이트하기 위한 표준 절차.

## 기본 원칙

1. Codex에서는 `migrate dev`를 사용하지 않고, `db:deploy`만 사용
2. migration SQL은 수동 생성/보정해서 파일로 관리
3. `migrate resolve`는 예외 복구 절차
4. 수동 SQL 적용 시 migration 파일과 정합 유지
5. baseline 이후 활성 체인은 `prisma/migrations` 기준으로만 누적

## 표준 작업 플로우 (Codex)

1. `schema.prisma` 변경
2. 새 migration 디렉터리 생성
```bash
MIG=infra/prisma/prisma/migrations/$(date +%Y%m%d%H%M%S)_<name>
mkdir -p "$MIG"
```
3. SQL 초안 생성
```bash
pnpm --filter @tour/prisma exec prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$MIG/migration.sql"
```
4. SQL 검토/보정
- MySQL 식별자 길이(64자) 주의
- 재실행 가능하도록 idempotent 보정 필요 시 반영
5. 배포 적용
```bash
pnpm --filter @tour/prisma db:deploy
```
6. 검증
```bash
pnpm --filter @tour/prisma db:generate
pnpm --filter @tour/api typecheck
pnpm --filter @tour/web typecheck
```
7. 커밋
- 필요 시 `git add -f infra/prisma/prisma/migrations/...`

## 주의: `migrate dev` 사용 범위

- Codex에서는 비권장/불가(비대화형 제약).
- 사용하려면 로컬 인터랙티브 터미널에서 별도 개발 DB 대상으로만 실행.

## 실패 시 복구 절차

### A) `P3018` (중간 migration 실패)

1. 원인 확인
- 예: duplicate column/table already exists/identifier too long

2. 이미 반영된 내용이라면
```bash
pnpm --filter @tour/prisma exec prisma migrate resolve --applied <migration_name>
```

3. 부분 반영/실패 잔여가 있으면
- 필요한 SQL을 idempotent 하게 직접 보정 적용
- 이후:
```bash
pnpm --filter @tour/prisma exec prisma migrate resolve --applied <migration_name>
```

4. 실패 이력을 재시도하려면
```bash
pnpm --filter @tour/prisma exec prisma migrate resolve --rolled-back <migration_name>
```
그 다음 migration SQL 수정 후 `db:deploy` 재실행.

### B) `P3009` (failed migration 존재로 진행 차단)

1. failed migration 식별
2. 해당 migration을 `rolled-back` 또는 `applied`로 정리
3. `db:deploy` 재실행

### C) `P3006` (migrate dev shadow DB 실패)

- Codex 표준에서는 `migrate dev`를 사용하지 않는다.
- `db:deploy + resolve`로 정합 유지.
- 필요 시 로컬 인터랙티브 터미널에서만 별도 개발 DB 대상으로 `migrate dev` 사용.

## 점검 명령어

```bash
pnpm --filter @tour/prisma exec prisma migrate status --schema prisma/schema.prisma
```

## 커밋 체크리스트

1. `schema.prisma` 반영 여부
2. migration SQL 파일 반영 여부
3. `db:generate` 및 typecheck 통과 여부
4. `resolve` 사용 시 커밋/PR 본문에 사유 기록 여부
5. migration 파일이 활성 체인(`prisma/migrations`)에 있는지 여부
