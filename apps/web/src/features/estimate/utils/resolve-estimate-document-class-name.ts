export type EstimateDocumentViewMode = 'screen-preview' | 'output' | 'print';

export function resolveEstimateDocumentClassName(viewMode: EstimateDocumentViewMode = 'output'): string {
  const classes = ['estimate-document'];

  if (viewMode === 'screen-preview' || viewMode === 'output' || viewMode === 'print') {
    classes.push('estimate-document--output');
  }

  if (viewMode === 'screen-preview') {
    classes.push('estimate-document--preview');
  }

  return classes.join(' ');
}
