import { describe, expect, it } from 'vitest';
import { resolveEstimateDocumentClassName } from './resolve-estimate-document-class-name';

describe('resolveEstimateDocumentClassName', () => {
  it('미리보기는 output과 preview 클래스를 모두 적용한다', () => {
    expect(resolveEstimateDocumentClassName('screen-preview')).toBe(
      'estimate-document estimate-document--output estimate-document--preview',
    );
  });

  it('PDF/인쇄 output 모드는 output 클래스만 적용한다', () => {
    expect(resolveEstimateDocumentClassName('output')).toBe('estimate-document estimate-document--output');
  });

  it('print 모드는 output과 동일한 레이아웃 클래스를 사용한다', () => {
    expect(resolveEstimateDocumentClassName('print')).toBe('estimate-document estimate-document--output');
  });
});
