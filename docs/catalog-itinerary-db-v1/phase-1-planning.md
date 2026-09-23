# Phase 1 Planning — T01 장소·지역·경로

**목표:** T01-01 지도 셸 + T01-03 등록/편집 + T01-02 숙소 상세 자리. GPS(T01-06~08)는 deferred.

## 1. 목표·범위·비범위

- In: 지도+목록+상세 선택 동기화, 장소 update, 좌표 미등록 저장, 지역/경로를 같은 지도 셸 탭, Accommodation optional 연결
- Out: 방문 판정·재분석(T01-06~08), 경로 실측 통계, 영구삭제

## 2. 화면/스토리

| 코드      | 이번 Phase         | 비고                                            |
| --------- | ------------------ | ----------------------------------------------- |
| T01-01    | 필수               | 지도+목록+하단/사이드 상세. 같은 `placeId` 선택 |
| T01-02    | 필수(연결 자리)    | Accommodation 있으면 조회, 없으면 `연동 예정`   |
| T01-03    | 필수               | 등록·편집. 좌표 미등록 저장 허용                |
| T01-04    | 필수(목록+지도 탭) | 지역·권역. 좌표 복제 금지                       |
| T01-05    | 필수(목록형)       | 경로 CRUD. 실측/GPS는 stub                      |
| T01-06~08 | deferred           | 판정·재분석                                     |

스토리:

1. 장소 탭에서 지도 핀과 목록·상세가 같은 `placeId`로 선택된다.
2. 좌표 없는 장소를 저장·목록 조회할 수 있고, 지도에는 핀을 만들지 않는다.
3. 부모 장소 아래 자식 등록 시 부모 좌표를 자동 복사하지 않는다.
4. 숙소 상세에서 객실·요금은 기존 Accommodation 범위로만 표시한다.
5. 지역/경로 탭 전환 시 같은 지도 셸을 유지한다.
6. 체크박스는 일괄 대상이고, 이름/핀 클릭은 조회 선택이다 (A01).

## 3. 데이터·API 변경

ADD (`CatalogPlace`):

- `displayName`, `internalNote`, `accommodationId`, `visitRadiusM`

Mutation:

- `createCatalogPlace` 확장: 좌표, 숙소, 표시명
- `updateCatalogPlace` 신규

Query:

- `catalogPlaces`에 accommodation 요약(id, name, region) include
- 기존 `accommodations` 쿼리 재사용 (생산 API 수정 없음)

출발 파일:

- `apps/web/src/pages/dataset/DatasetPlacesPage.tsx`
- `apps/web/src/pages/dataset/DatasetPlaceDetailPanel.tsx`
- `apps/api/src/schema/catalog.graphql`
- `apps/api/src/modules/catalog/`
- `packages/validation/src/catalog.schema.ts`

## 4. UI 구조

```
DatasetPlacesPage
  header (탭별 등록)
  tabs: 지역 | 장소 | 경로
  [places] map(left) + list(right) + detail(below or overlay)
  [regions/routes] 같은 지도 셸 + 해당 목록
```

지도: `VITE_GOOGLE_MAPS_API_KEY` + `@react-google-maps/api`. 키 없으면 플레이스홀더 + 외부 링크.

## 5. 검수표 매핑

| ID  | 기대                                     | 기록    |
| --- | ---------------------------------------- | ------- |
| A01 | 필터 바꿔도 체크 유지. 지도 선택 ≠ 체크  | 구현 후 |
| A02 | 기존 숙소 선택 연결. 자동 병합 없음      | 구현 후 |
| A03 | 부모 아래 새 장소. 좌표 미복사           | 구현 후 |
| A04 | 지역 화면과 같은 placeId                 | 구현 후 |
| A05 | 좌표 없이 저장, 핀 없음                  | 구현 후 |
| A06 | 위치=장소, 객실·요금=숙소 또는 연동 예정 | 구현 후 |

## 6. 리스크·의존

- D03: 반경 값은 저장만. 판정 엔진 없음
- D04: Maps 키·숙소 조회 권한은 기존 환경
- D06: 삭제는 `INACTIVE` soft. 휴지통 없음

## 7. 작업 체크리스트

- [x] Place ADD 컬럼 + migrate
- [x] create/update Zod·GraphQL
- [x] 지도 셸 + 선택 동기화
- [x] T01-03 편집 폼
- [x] Accommodation 연결 UI
- [x] 지역/경로 탭 동일 셸
- [x] A01~A06 기록

## 8. 완료 기록

- 기준일: 2026-09-23
- 마이그레이션: `20260923200000_catalog_itinerary_db_v1`
- 복구: 첫 deploy가 Postgres 인용부호로 MySQL 1064. 미적용 실패라 SQL을 MySQL로 고친 뒤 `migrate resolve --rolled-back 20260923200000_catalog_itinerary_db_v1` 후 재배포.
- 검수: A01 통과(체크≠핀). A02 통과(숙소 선택 연결, 자동병합 없음). A03 통과(부모 좌표 미복사). A04 통과(같은 placeId). A05 통과(좌표 없이 저장). A06 통과(객실·요금은 Accommodation 또는 연동 예정).
