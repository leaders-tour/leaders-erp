# Phase 4 Planning — T04 여정 템플릿

**목표:** 블록 사용본 배치 목록·상세. 빌더 교체 없음.

## 1. 목표·범위·비범위

- In: T04-01 목록+상세, T04-02 블록 배치·순서·일차 오프셋
- Out: 견적/확정 빌더 연동, 고객 일정 사용본 집계

## 2. 화면/스토리

- 여정 이름을 누르면 상세 패널. 편집은 별도 동작
- 여정에 들어 있는 것은 블록 복제가 아니라 `blockId` + 해당 여정 배치
- 지표는 `미정` / `계산 대기` 허용. 가짜 총액 금지
- 사용본 조회 탭은 고객 일정 연동 전 `미연동`

## 3. 데이터·API 변경

- `CatalogJourney`: code, name, version, nightCount, dayCount, status, calcStatusText
- `CatalogJourneyPlacement`: journeyId, blockId, orderIndex, dayOffset
- Query `catalogJourneys`, Mutation create/update/add placement

## 4. UI 구조

- `DatasetTemplatesPage`를 준비중에서 목록+상세로 교체
- 상세: 구성 블록, 일차 오프셋, 고객 표시 골격

## 5. 검수표 매핑

- 여정 클릭 시 같은 화면에서 블록 구성 조회
- 전체/일차 지표는 값이 있을 때만 숫자. 없으면 `미정`
- 빌더 미교체 확인

## 6. 리스크·의존

- D02, D09 지표 모델 미확정
- D10 발행본 비대상

## 7. 작업 체크리스트

- [x] Journey 테이블 ADD
- [x] API + 훅
- [x] 목록·상세·배치 편집
- [x] 사용본 탭 `미연동`
- [x] 검수 기록

## 8. 완료 기록

- 기준일: 2026-09-23
- 여정 목록·상세·블록 배치 동작. 빌더 미교체. 지표는 `미정` 허용.
