export interface BuilderEditorLayout {
  /** 3열 비교(편집|이전|새)일 때 true — 편집열이 좁아 1열 폼 + 섹션 nav 사용 */
  isThreePaneCompare: boolean;
  /** 2열 비교(편집|새)일 때 true — 편집열이 넓어 일반 2grid 폼 사용 */
  isTwoPaneCompare: boolean;
  compareColumnCount: 2 | 3;
  formSectionGridClass: string;
  formSplitGridClass: string;
  formSplitGridClassSm: string;
  formSplitGridClassMd3: string;
  showSectionNav: boolean;
  headcountFieldMaxWidthClass: string;
}

export function resolveBuilderEditorLayout(input: {
  isVersionCompareMode: boolean;
  isPreviousVersionPreviewEnabled: boolean;
}): BuilderEditorLayout {
  const isThreePaneCompare =
    input.isVersionCompareMode && input.isPreviousVersionPreviewEnabled;
  const isTwoPaneCompare =
    input.isVersionCompareMode && !input.isPreviousVersionPreviewEnabled;

  return {
    isThreePaneCompare,
    isTwoPaneCompare,
    compareColumnCount: isThreePaneCompare ? 3 : 2,
    formSectionGridClass: isThreePaneCompare
      ? 'grid grid-cols-1 gap-5'
      : 'grid grid-cols-1 gap-5 lg:grid-cols-2',
    formSplitGridClass: isThreePaneCompare ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2',
    formSplitGridClassSm: isThreePaneCompare ? 'grid gap-2' : 'grid gap-2 md:grid-cols-2',
    formSplitGridClassMd3: isThreePaneCompare ? 'grid gap-3' : 'grid gap-3 md:grid-cols-2',
    showSectionNav: isThreePaneCompare,
    headcountFieldMaxWidthClass: isThreePaneCompare ? '' : 'sm:max-w-[50%]',
  };
}
