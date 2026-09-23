# Phase 0 Planning — 모델·갭·연결

**목표:** 코딩 전에 “무엇의 ID가 무엇인지”와 기존 ERP 연결 가능 범위를 문서로 고정.

## 1. 목표·범위·비범위

- In: 갭표, 식별자 모델, 연결 인벤토리, Catalog 진화 전략, Phase별 DoD↔검수표 매핑
- Out: UI 구현, GPS 알고리즘 확정, 견적 빌더 연동

## 2. 갭 매트릭스 (기획 vs 현재 Catalog)

| 기획 v1.0 | 현재 Catalog / dataset UI | 판정 |
|-----------|---------------------------|------|
| T01-01 지도+목록+하단 상세 선택 동기화 | 표 중심 목록. 행 클릭 시 오버레이 상세 | 갭 |
| T01-02 숙소 상세, Accommodation 연결 | 목업 객실·요금 테이블. FK 없음 | 갭 |
| T01-03 장소 등록·편집 | create만(이름·유형·권역). update 없음 | 갭 |
| T01-04 지역·권역 지도 | 지역 목록+create. 지도 없음 | 부분 |
| T01-05 경로 목록형 | 경로 목록+create. 실측/GPS stub | 부분 |
| T01-06~08 GPS 판정 | 미착수 | 후순위 |
| 원본 ID + 버전 + 배치 ID | Element/Block에 `version` Int만. 버전 스냅샷·배치 override 없음 | 갭 |
| 블록 1~n일 단일 ID | `CatalogBlockShape` DAY/SET. SET은 블록 세트 | 폐기 대상 |
| 필드별 개별값(override) 플래그 | 없음 | 갭 |
| T04 여정 템플릿 | `DatasetTemplatesPage` 준비중 문구만 | 갭 |
| T05~T08 대량·반영·이력 | 버튼 stub | 후속 |

## 3. 식별자 모델 (확정 문장)

- **정보 DB**: Place / Region / Route — 좌표·분류·숙소 연결. 버전보다 기준정보.
- **원본(Source)**: Element / Block / Journey — `sourceId` + 최신 `version`.
- **버전(Version)**: 정의 스냅샷. 복원해도 옛 버전 보존 + 새 버전 생성.
- **배치(Placement/사용본)**: `placementId`, parent, order, `dayIndex`, 참조 `sourceId+version`, **필드별 override 플래그**.
- **블록**: 1~n일 **단일 sourceId**. 야간열차도 별도 출발/도착 블록 원본 금지. (구 `DAY`/`SET` 블록세트 폐기)

현재 테이블 매핑:

| 개념 | 현재 모델 | 진화 |
|------|-----------|------|
| 지역 | `CatalogRegion` | 유지. 분류 ID |
| 장소 | `CatalogPlace` | 기준정보 유지. `accommodationId` 등 ADD |
| 경로 | `CatalogRoute` | 유지. 실측 필드는 후순위 |
| 요소 원본 | `CatalogElement` (`version` Int) | 1차: 행=최신 버전. 스냅샷 테이블은 Phase 2+에서 ADD |
| 요소 배치 | `CatalogElementItem` | 세트 멤버. 순환 차단 추가. override 컬럼은 후속 |
| 블록 원본 | `CatalogBlock` | `dayCount` 유지. `shape=SET` 신규 생성 중단 |
| 블록 내부 일차 | 없음 | `CatalogBlockPlacement.dayIndex` ADD |
| 여정 | 없음 | `CatalogJourney` + placement ADD |

## 4. 연결 인벤토리 (D04)

| 연결 대상 | 상태 | 근거 | 이번 1차 조치 |
|-----------|------|------|----------------|
| `Accommodation` | **존재** | `infra/prisma/prisma/schema.prisma` 숙소·객실·요금. GraphQL `accommodations` | Place에 optional `accommodationId`. 미연결은 `연동 예정` |
| `Location` / `Segment` / `Plan` | **존재·미연동** | 생산 일정 빌더 핵심. Catalog와 의도적 분리 | 연결하지 않음 |
| `Employee` + 권한 | **존재** | `/dataset`는 `RequireStaffOrAbove` | 신규 권한 모델 없음. 기존 계정 재사용 |
| 작업 로그 | **존재·미연동** | 기존 activity 로그는 생산 도메인 | Catalog 작업 로그는 Phase 5 골격 |
| Google Maps | **존재** | `@react-google-maps/api`, `VITE_GOOGLE_MAPS_API_KEY`, 가이드 위치 지도 | T01 지도 셸에서 재사용. 키 없으면 플레이스홀더 |
| GPS / 가이드 위치 | **존재·미연동** | `GuideLocationMapPage` 실시간 위치. Catalog 방문 판정 없음 | `미연동` 표시. T01-06~08 deferred |
| 견적/확정 문서 | **존재·미연동** | Estimate/Confirmation 빌더 | 건드리지 않음. D10 후순위 |

## 5. Phase 1 Place CRUD 필드 목록 (게이트)

저장 가능:

- `name` (필수), `placeType` (필수)
- `country`, `regionId`, `parentPlaceId`
- `latitude`, `longitude` (둘 다 null 허용. 부모 좌표 자동복사 금지)
- `displayName`, `internalNote`
- `accommodationId` (LODGING만, optional)
- `status` (`ACTIVE` / `INACTIVE`)

표시 전용(기존 seed / 숙소 조회):

- `lodgingLevel`, `rateSummary`, `linkLabel` — 숙소 연결 후 조회값으로 대체. 장소 테이블에 복사 입력하지 않는 것이 목표
- `visitRadiusM` — nullable, 판정 알고리즘은 deferred. 설정 UI만

금지:

- 부모 좌표를 자식 실제 위치로 복사
- 좌표 미등록 장소의 거리/시간 임의 생성
- Accommodation 객실·요금을 Catalog에 복제 저장

## 6. 스키마 diff 초안 (ADD-only, 실행은 각 Phase)

Phase 1:

- `CatalogPlace.displayName String?`
- `CatalogPlace.internalNote String?`
- `CatalogPlace.accommodationId String?` + optional relation
- `CatalogPlace.visitRadiusM Int?`

Phase 2:

- Element update / set item mutation
- 순환 참조 검증 (서비스 레이어)
- 버전 스냅샷 테이블은 최소 동작(현재 `version` Int bump)으로 시작

Phase 3:

- `CatalogBlockPlacement` (blockId, elementId, dayIndex, orderIndex, startMinute?)
- `shape=SET` 신규 생성 중단. 기존 SET seed는 읽기 호환

Phase 4:

- `CatalogJourney`, `CatalogJourneyPlacement` (journeyId, blockId, orderIndex, dayOffset)

Phase 5:

- 작업 로그 골격 / 임시 요소 상태 필드. 영구삭제는 D06 이후

금지: `Plan`, `PlanStop`, `Location`, `Accommodation` 컬럼 ALTER.

## 7. DoD 매핑 (검수표 → Phase)

| 검수 ID | 관련 화면 | Phase | 1차 기대 |
|---------|-----------|-------|----------|
| A01 | T01-01, T05-01 | 1 / 5 | 필터 변경 시 체크 유지. 지도 선택 ≠ 체크 |
| A02 | T01-03, T01-02 | 1 | 기존 숙소 연결. 자동 병합 금지 |
| A03 | T01-03, T01-04 | 1 | 부모 아래 자식. 좌표 미복사 |
| A04 | T01-01, T01-04 | 1 | 같은 placeId |
| A05 | T01-03 | 1 | 좌표 없이 저장 |
| A06 | T01-02, T01-03 | 1 | 위치=장소, 객실·요금=숙소 |
| B01~B05 | T02 | 2 | 유형 등록, 세트 중첩, 순환 차단 |
| B06~B10 | T02-04~08 | 2 골격 / deferred | UI + `미정` |
| C01~C04 | T03 | 3 | 1~n일 동일 ID, 공백 유지 |
| C05~C08 | T03-02 | 3b / deferred | 자동이동·조 |
| T04 관련 | T04 | 4 | 블록 배치·조회 |
| T05~T08 | 공통 | 5 | 골격. D05~D08 값 미확정 |

T09는 독립 메뉴가 아니라 통합 검수 시나리오다.

## 8. 현재 코드와의 결정

- 유지: 격리 메뉴, `CatalogRegion/Place/Route/Element/Block` 테이블명, seed 예시 ID
- 변경 예정: Block SET 의미, Element/Block placement, Journey 테이블
- 금지: Plan/Stop/견적 스키마 변경

## 9. 리스크·의존

- Maps 키 부재 시 플레이스홀더. “연동 완료”로 표시하지 않음
- Accommodation 이름 유사성만으로 자동 연결하지 않음
- D01~D10 운영값은 이 Phase에서 확정하지 않음

## 10. 작업 체크리스트

- [x] 갭 매트릭스
- [x] 식별자 문장
- [x] D04 연결표 (`존재` / `미확인` / `미연동`)
- [x] Phase 1 Place 필드 목록
- [x] DoD 매핑
- [x] 스키마 diff 초안 (migrate는 Phase 1부터)

## 11. 완료 기록

- 기준일: 2026-09-23
- 조사 범위: `Catalog*` Prisma, `catalog.graphql`, dataset 페이지, `Accommodation`, `Location`, `@react-google-maps/api`
- 게이트: 식별자 문장 + Place CRUD 필드 목록 충족. Phase 1 착수 가능
