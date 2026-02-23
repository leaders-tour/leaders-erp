import { Card } from '@tour/ui';
import type { PlanVersionRow } from '../hooks';

interface VersionTreePanelProps {
  versions: PlanVersionRow[];
  currentVersionId: string | null;
  onOpenVersion: (versionId: string) => void;
}

function buildDepthMap(versions: PlanVersionRow[]): Map<string, number> {
  const byId = new Map(versions.map((version) => [version.id, version]));
  const depthMap = new Map<string, number>();

  const getDepth = (id: string): number => {
    if (depthMap.has(id)) {
      return depthMap.get(id) ?? 0;
    }

    const node = byId.get(id);
    if (!node || !node.parentVersionId) {
      depthMap.set(id, 0);
      return 0;
    }

    const parentDepth = byId.has(node.parentVersionId) ? getDepth(node.parentVersionId) : 0;
    const depth = parentDepth + 1;
    depthMap.set(id, depth);
    return depth;
  };

  versions.forEach((version) => {
    getDepth(version.id);
  });

  return depthMap;
}

export function VersionTreePanel({ versions, currentVersionId, onOpenVersion }: VersionTreePanelProps): JSX.Element {
  const depthMap = buildDepthMap(versions);
  const ordered = versions.slice().sort((a, b) => {
    const depthDiff = (depthMap.get(a.id) ?? 0) - (depthMap.get(b.id) ?? 0);
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return a.versionNumber - b.versionNumber;
  });

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">버전 트리</h3>
      <div className="mt-3 grid gap-2">
        {ordered.map((version) => {
          const depth = depthMap.get(version.id) ?? 0;
          return (
            <button
              key={version.id}
              type="button"
              onClick={() => onOpenVersion(version.id)}
              style={{ paddingLeft: `${depth * 16 + 12}px` }}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 text-left text-sm text-slate-800 hover:bg-slate-100"
            >
              <span className="font-medium">v{version.versionNumber}</span>
              {version.parentVersionId ? <span className="ml-2 text-xs text-slate-500">from {version.parentVersionId.slice(0, 8)}</span> : null}
              {currentVersionId === version.id ? (
                <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">current</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
