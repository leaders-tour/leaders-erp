import { Button, Card, Table, Td, Th } from '@tour/ui';
import type { PlanVersionListItem } from '../hooks';
import { toVariantLabel } from '../variant-label';

interface CustomerVersionListPanelProps {
  versions: PlanVersionListItem[];
  currentVersionId: string | null;
  customerName: string;
  selectedVersionId: string | null;
  planTitle?: string | null;
  loading?: boolean;
  emptyMessage?: string;
  onSelectVersion: (versionId: string) => void;
  onOpenVersion: (versionId: string) => void;
}

function VersionListSkeletonRows(): JSX.Element {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <tr key={index}>
          <Td>
            <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-8 w-12 animate-pulse rounded bg-slate-100" />
          </Td>
        </tr>
      ))}
    </>
  );
}

export function CustomerVersionListPanel({
  versions,
  currentVersionId,
  customerName,
  selectedVersionId,
  planTitle,
  loading = false,
  emptyMessage = '버전이 없습니다.',
  onSelectVersion,
  onOpenVersion,
}: CustomerVersionListPanelProps): JSX.Element {
  const sortedVersions = versions.slice().sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <Card className="w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">일정 버전 목록</h3>
        {planTitle ? <p className="mt-1 text-xs text-slate-500">{planTitle}</p> : null}
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <Table>
            <thead>
              <tr>
                <Th>버전</Th>
                <Th>대표자명</Th>
                <Th>타입</Th>
                <Th>일수</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              <VersionListSkeletonRows />
            </tbody>
          </Table>
        ) : sortedVersions.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>버전</Th>
                <Th>대표자명</Th>
                <Th>타입</Th>
                <Th>일수</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              {sortedVersions.map((version) => {
                const isSelected = selectedVersionId === version.id;
                return (
                  <tr
                    key={version.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-900/5' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => onSelectVersion(version.id)}
                  >
                    <Td>
                      <span className={isSelected ? 'font-semibold text-slate-900' : 'font-medium'}>
                        v{version.versionNumber}
                      </span>
                      {currentVersionId === version.id ? (
                        <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          current
                        </span>
                      ) : null}
                    </Td>
                    <Td>{version.meta?.leaderName?.trim() || customerName}</Td>
                    <Td>{toVariantLabel(version.variantType)}</Td>
                    <Td>{version.totalDays}</Td>
                    <Td>
                      <Button
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenVersion(version.id);
                        }}
                      >
                        상세
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </Card>
  );
}
