import { describe, expect, it } from 'vitest';
import {
  analyzeContractSubmissionReview,
  extractContractFormResponses,
} from './contract-submission-review';

describe('extractContractFormResponses', () => {
  it('excludes identity metadata and keeps consent responses', () => {
    const responses = extractContractFormResponses({
      '여행객 한글 성명': '박보라',
      성별: '여성',
      문서번호: '260823852V1',
      '본인은 제1조부터 제4조까지의 내용을 확인하였고 이에 동의합니다.': '동의함',
      '견적서상 예약금 결제수단을 선택해 주세요.': '계좌이체',
    });

    expect(responses.map((item) => item.label)).toEqual([
      '본인은 제1조부터 제4조까지의 내용을 확인하였고 이에 동의합니다.',
      '견적서상 예약금 결제수단을 선택해 주세요.',
    ]);
  });
});

describe('analyzeContractSubmissionReview', () => {
  it('flags non-trivial special notes', () => {
    const summary = analyzeContractSubmissionReview({
      rawJson: {
        '리더스투어가 반드시 알아야 할 특이사항': '갑각류 알레르기 보유',
        '여행객 한글 성명': '홍길동',
        '본인은 제22조를 포함한 본 계약 전체에 최종 동의합니다.': '동의함(계약서 작성완료)',
      },
    });

    expect(summary.hasAttentionItems).toBe(true);
    expect(summary.attentionItems).toEqual([
      expect.objectContaining({
        kind: 'special_note',
        detail: '갑각류 알레르기 보유',
      }),
    ]);
  });

  it('ignores trivial special notes and marketing opt-out', () => {
    const summary = analyzeContractSubmissionReview({
      rawJson: {
        '리더스투어가 반드시 알아야 할 특이사항': '없음',
        '이메일 광고성 정보 수신 동의': '동의하지 아니함',
        '본인은 제22조를 포함한 본 계약 전체에 최종 동의합니다.': '동의함(계약서 작성완료)',
      },
    });

    expect(summary.hasAttentionItems).toBe(false);
  });

  it('flags declined consent from long free-text responses', () => {
    const summary = analyzeContractSubmissionReview({
      rawJson: {
        '제 10조 (여행 중 발생할 수 있는 사고 또는 문제에 관한 책임)':
          '"을"은 본 조 제1항부터 5항까지 항의 일부 또는 전부에 내용에 동의하지 아니함.(미 동의시 여행 계약이 거절될 수 있습니다.)',
        '본인은 제22조를 포함한 본 계약 전체에 최종 동의합니다.': '동의함(계약서 작성완료)',
      },
    });

    expect(summary.attentionItems).toEqual([
      expect.objectContaining({
        kind: 'declined_consent',
        detail: expect.stringContaining('동의하지 아니함'),
      }),
    ]);
  });

  it('flags activity opt-out separately', () => {
    const summary = analyzeContractSubmissionReview({
      rawJson: {
        '제 12조 (액티비티 체험의 위험성 인식)': '인식하였고, 감수하지 아니함(액티비티 체험 생략)',
        '본인은 제22조를 포함한 본 계약 전체에 최종 동의합니다.': '동의함(계약서 작성완료)',
      },
    });

    expect(summary.attentionItems).toEqual([
      expect.objectContaining({
        kind: 'activity_opt_out',
        detail: expect.stringContaining('액티비티 체험 생략'),
      }),
    ]);
  });

  it('flags incomplete final consent when traveler name exists', () => {
    const summary = analyzeContractSubmissionReview({
      rawJson: {
        '여행객 한글 성명': '김철수',
        '본인은 제1조부터 제4조까지의 내용을 확인하였고 이에 동의합니다.': '동의함',
      },
    });

    expect(summary.attentionItems).toEqual([
      expect.objectContaining({
        kind: 'incomplete',
        label: '최종 동의 미완료',
      }),
    ]);
  });

  it('flags consultation notes', () => {
    const summary = analyzeContractSubmissionReview({
      rawJson: {
        '상담이 필요한 내용': '출국 전 비자 관련 상담 희망',
        '본인은 제22조를 포함한 본 계약 전체에 최종 동의합니다.': '동의함(계약서 작성완료)',
      },
    });

    expect(summary.attentionItems).toEqual([
      expect.objectContaining({
        kind: 'consultation',
        detail: '출국 전 비자 관련 상담 희망',
      }),
    ]);
  });
});
