import { Button, Card, Table, Td, Th } from '@tour/ui';
import type { PlanVersionRow } from '../hooks';
import { toVariantLabel } from '../variant-label';

interface VersionListPanelProps {
  versions: PlanVersionRow[];
  currentVersionId: string | null;
  customerName: string;
  onOpenVersion: (versionId: string) => void;
  onOpenEstimatePdf: (versionId: string) => void;
  onCreateVersion: (versionId: string) => void;
}

export function VersionListPanel({
  versions,
  currentVersionId,
  customerName,
  onOpenVersion,
  onOpenEstimatePdf,
  onCreateVersion,
}: VersionListPanelProps): JSX.Element {
  const versionNumberById = new Map(versions.map((version) => [version.id, version.versionNumber]));

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">버전 리스트</h3>
      </div>
      <div className="overflow-auto">
        <Table>
          <thead>
            <tr>
              <Th>고객명</Th>
              <Th>버전</Th>
              <Th>부모</Th>
              <Th>타입</Th>
              <Th>일수</Th>
              <Th>변경 메모</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {versions.map((version) => (
              <tr key={version.id}>
                <Td>{customerName}</Td>
                <Td>
                  <span className="font-medium">v{version.versionNumber}</span>
                  {currentVersionId === version.id ? (
                    <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      current
                    </span>
                  ) : null}
                </Td>
                <Td>
                  {version.parentVersionId
                    ? `v${versionNumberById.get(version.parentVersionId) ?? '?'}`
                    : '-'}
                </Td>
                <Td>{toVariantLabel(version.variantType)}</Td>
                <Td>{version.totalDays}</Td>
                <Td>{version.changeNote ?? '-'}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => onOpenVersion(version.id)}>
                      상세
                    </Button>
                    <Button variant="outline" onClick={() => onOpenEstimatePdf(version.id)}>
                      PDF 출력
                    </Button>
                    <Button variant="primary" onClick={() => onCreateVersion(version.id)}>
                      새 버전 생성
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
