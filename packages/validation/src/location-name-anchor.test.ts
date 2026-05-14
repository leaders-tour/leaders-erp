import { describe, expect, it } from 'vitest';
import {
  findAnchorLineIndexForGuideLocationName,
  findAnchorLineIndexInLocationName,
  guideLocationNameContainsAnchorToken,
  guideLocationNameHasNoWaypointInForm,
} from './location-name-anchor';

describe('findAnchorLineIndexInLocationName', () => {
  it('두 줄 이름에서 두 번째 줄이 앵커면 index 1', () => {
    expect(findAnchorLineIndexInLocationName(['a 운행', '욜린암'], '욜린암')).toBe(1);
  });

  it('한 줄 문자열처럼 처리된 이름에서 슬래시 뒤 토큰도 찾음', () => {
    expect(findAnchorLineIndexInLocationName(['a / 욜린암'], '욜린암')).toBe(0);
    expect(findAnchorLineIndexInLocationName(['욜린암 / b'], '욜린암')).toBe(0);
  });

  it('첫 줄에 앵커 조각이 있으면 우선 줄 0', () => {
    expect(findAnchorLineIndexInLocationName(['욜린암'], '욜린암')).toBe(0);
  });

  it('두 줄 중 위쪽 줄에 매칭 토큰 있으면 0 반환', () => {
    expect(findAnchorLineIndexInLocationName(['욜린암 / x', 'something'], '욜린암')).toBe(0);
  });

  it('토큰이 없으면 null', () => {
    expect(findAnchorLineIndexInLocationName(['a', 'b'], '욜린암')).toBeNull();
  });

  it('대소문자·공백 정규화 후 일치', () => {
    expect(findAnchorLineIndexInLocationName(['  Yolle / aa '], 'yolle')).toBe(0);
  });

  it('빈 토큰은 null', () => {
    expect(findAnchorLineIndexInLocationName(['a'], '   ')).toBeNull();
  });
});

describe('findAnchorLineIndexForGuideLocationName', () => {
  it('단일 줄 JSON 이름 사용', () => {
    expect(findAnchorLineIndexForGuideLocationName('a / 욜린암', '욜린암')).toBe(0);
    expect(findAnchorLineIndexForGuideLocationName('', '욜린암')).toBeNull();
  });

  it('guideLocationNameContainsAnchorToken 배열 문자열 허용', () => {
    expect(guideLocationNameContainsAnchorToken(['x', 'a / 욜린암'], '욜린암')).toBe(true);
    expect(guideLocationNameContainsAnchorToken(['없음'], '욜린암')).toBe(false);
  });
});

describe('guideLocationNameHasNoWaypointInForm', () => {
  it('단일 줄·단일 슬래시 조각만 통과한다', () => {
    expect(guideLocationNameHasNoWaypointInForm(['욜린암'])).toBe(true);
    expect(guideLocationNameHasNoWaypointInForm('욜린암')).toBe(true);
    expect(guideLocationNameHasNoWaypointInForm('a / b')).toBe(false);
    expect(guideLocationNameHasNoWaypointInForm(['차강', '욜린암'])).toBe(false);
  });
});
