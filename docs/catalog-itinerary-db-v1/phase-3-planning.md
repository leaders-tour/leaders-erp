# Phase 3 Planning — T03 일정 블록 (1~n일)

**목표:** 블록세트 개념 제거. 한 블록 ID로 다일·야간열차.

## 1. 목표·범위·비범위

- In: T03-01 목록·일차 펼침, T03-02 MVP(시간순 배치·day 추가)
- Out: 드래그 고도화, 자동이동(C05~C06), 조 분리(C07)

## 2. 화면/스토리

| 코드 | 이번 Phase | 비고 |
|------|------------|------|
| T03-01 | 필수 | 목록·일차 펼침. 펼침 행은 별도 원본 아님 |
| T03-02 | 필수(MVP) | 요소/세트 배치, day 추가, 순서 |

스토리:

1. 1일 블록과 2일 블록이 같은 `sourceId` 체계를 쓴다.
2. 야간열차는 하나의 블록에서 dayIndex 1·2로 펼친다.
3. `shape=SET`으로 다일을 만들지 않는다.
4. 지표가 없으면 `계산 대기` / `미정`이다.

## 3. 데이터·API 변경

- `CatalogBlockPlacement`: `blockId`, `elementId`, `dayIndex`, `orderIndex`, `startLabel?`
- `createCatalogBlock`에서 `dayCount` 지정. SET 신규 생성 UI 제거
- `addCatalogBlockDay`, `addCatalogBlockPlacement`, `updateCatalogBlock`
- 기존 `CatalogBlockItem`(블록 세트)은 읽기 호환. 신규 작성 경로에서 사용하지 않음

seed 방향: BL-030 야간열차를 `dayCount=2` + placement로 표현. 기존 SET seed는 목록에서 펼침 대신 “레거시 세트”로 표시 가능.

## 4. UI 구조

- 목록: 원본/사용본 탭. dayCount>1이면 일차 펼침
- 편집 오버레이: 일차 탭, 요소 추가, 순서
- 사용본 탭=`미연동`

## 5. 검수표 매핑

| ID | 기대 | 기록 |
|----|------|------|
| C01 | 하루 추가·밤샘은 동일 블록 ID | 구현 후 |
| C02 | 시간순 목록 유지. 반올림 강제 없음 | MVP |
| C03 | 드래그 맞춤 간격 | 후속 / 미구현 |
| C04 | 공백·빈 날짜 유지. 자동 비용 생성 없음 | 구현 후 |
| C05~C08 | deferred | — |

## 6. 리스크·의존

- D02 포화도·피로도 숫자는 seed/표시만. 전사 공식 고정 금지
- 기존 SET seed와의 이중 표현. 목록은 `dayCount` 우선

## 7. 작업 체크리스트

- [x] Placement 테이블 ADD
- [x] Block update / day / placement API
- [x] 목록 일차 펼침
- [x] 편집 MVP
- [x] SET 생성 UI 제거
- [x] C01~C04 기록

## 8. 완료 기록

- 기준일: 2026-09-23
- C01 통과(하루 추가·동일 블록 ID). C02 MVP. C03 미구현(드래그). C04 통과(빈 날짜 유지).
