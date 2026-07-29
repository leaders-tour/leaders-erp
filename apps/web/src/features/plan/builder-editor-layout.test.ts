import { describe, expect, it } from 'vitest';
import { resolveBuilderEditorLayout } from './builder-editor-layout';

describe('resolveBuilderEditorLayout', () => {
  it('uses compact 1-column form and section nav in 3-pane compare', () => {
    const layout = resolveBuilderEditorLayout({
      isVersionCompareMode: true,
      isPreviousVersionPreviewEnabled: true,
    });

    expect(layout.isThreePaneCompare).toBe(true);
    expect(layout.isTwoPaneCompare).toBe(false);
    expect(layout.compareColumnCount).toBe(3);
    expect(layout.showSectionNav).toBe(true);
    expect(layout.formSectionGridClass).toContain('grid-cols-1');
    expect(layout.formSectionGridClass).not.toContain('lg:grid-cols-2');
  });

  it('restores 2-column form and hides section nav when previous preview is off', () => {
    const layout = resolveBuilderEditorLayout({
      isVersionCompareMode: true,
      isPreviousVersionPreviewEnabled: false,
    });

    expect(layout.isThreePaneCompare).toBe(false);
    expect(layout.isTwoPaneCompare).toBe(true);
    expect(layout.compareColumnCount).toBe(2);
    expect(layout.showSectionNav).toBe(false);
    expect(layout.formSectionGridClass).toContain('lg:grid-cols-2');
    expect(layout.headcountFieldMaxWidthClass).toBe('sm:max-w-[50%]');
  });

  it('keeps standard 2-column form outside compare mode', () => {
    const layout = resolveBuilderEditorLayout({
      isVersionCompareMode: false,
      isPreviousVersionPreviewEnabled: true,
    });

    expect(layout.isThreePaneCompare).toBe(false);
    expect(layout.isTwoPaneCompare).toBe(false);
    expect(layout.showSectionNav).toBe(false);
    expect(layout.formSectionGridClass).toContain('lg:grid-cols-2');
  });
});
