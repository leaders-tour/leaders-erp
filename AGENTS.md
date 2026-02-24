# AGENTS.md

## Database Migration Guardrails (Must Follow)

이 저장소는 baseline 전환 이력이 있으므로, Codex 작업에서는 아래 절차를 표준으로 사용한다.

1. Codex 환경에서는 `prisma migrate dev`를 사용하지 않는다.
- 이유: non-interactive 제약 + 과거 체인 불일치 가능성.
- 표준 명령: `pnpm --filter @tour/prisma db:deploy`

2. migration은 수동 SQL 파일 방식으로 작성한다.
- `schema.prisma` 변경 후 새 폴더 생성:
  - `infra/prisma/prisma/migrations/<timestamp>_<name>/migration.sql`
- SQL은 아래 방식으로 생성/보정:
  - `pnpm --filter @tour/prisma exec prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`

3. `migrate resolve`는 복구 목적에서만 사용한다.
- 사용 시 반드시 이유와 migration 이름을 작업 결과에 기록한다.

4. 이미 applied 된 migration 파일은 수정하지 않는다.
- 실패 중(미적용/rolled-back) migration만 수정 가능.

5. 수동 SQL을 DB에 직접 실행했다면, 동등한 migration SQL을 반드시 레포에 남긴다.
- DB만 바꾸고 migration 파일 누락 금지.

6. 작업 완료 전 최소 검증을 수행한다.
- `pnpm --filter @tour/prisma db:generate`
- `pnpm --filter @tour/api typecheck`
- `pnpm --filter @tour/web typecheck`

7. migrations 디렉터리 커밋 누락을 항상 점검한다.
- ignore 상태일 수 있으므로 필요 시:
  - `git add -f infra/prisma/prisma/migrations/...`

8. baseline 이전 migration은 보관용이다.
- `infra/prisma/prisma/migrations_legacy/`는 참고용 아카이브이며, 활성 체인은 `infra/prisma/prisma/migrations/` 기준으로만 운영한다.
- `migrations_legacy/`는 커밋하지 않는다.

## Migration Runbook

상세 절차(실패 복구/resolve/deploy 순서)는 아래 문서를 따른다.

- `docs/db-migration-runbook.md`
