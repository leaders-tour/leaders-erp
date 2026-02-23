import { Card } from '@tour/ui';
import { useMemo } from 'react';
import type { PlanVersionRow } from '../hooks';

interface VersionTreePanelProps {
  versions: PlanVersionRow[];
  currentVersionId: string | null;
  onOpenVersion: (versionId: string) => void;
}

interface PositionedVersion {
  version: PlanVersionRow;
  depth: number;
  x: number;
  y: number;
}

const NODE_RADIUS = 18;
const COL_GAP = 110;
const ROW_GAP = 110;
const PADDING = 28;
const NOTE_MAX_LENGTH = 16;

function formatNote(value: string | null): string {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > NOTE_MAX_LENGTH ? `${trimmed.slice(0, NOTE_MAX_LENGTH)}...` : trimmed;
}

function buildTreeLayout(versions: PlanVersionRow[]): { nodes: PositionedVersion[]; width: number; height: number } {
  if (versions.length === 0) {
    return { nodes: [], width: 360, height: 180 };
  }

  const byId = new Map(versions.map((version) => [version.id, version]));
  const childrenMap = new Map<string, PlanVersionRow[]>();

  versions.forEach((version) => {
    if (!version.parentVersionId || !byId.has(version.parentVersionId)) {
      return;
    }
    const current = childrenMap.get(version.parentVersionId) ?? [];
    current.push(version);
    childrenMap.set(version.parentVersionId, current);
  });

  childrenMap.forEach((children) => {
    children.sort((a, b) => a.versionNumber - b.versionNumber);
  });

  const roots = versions
    .filter((version) => !version.parentVersionId || !byId.has(version.parentVersionId))
    .sort((a, b) => a.versionNumber - b.versionNumber);

  const positioned = new Map<string, PositionedVersion>();
  let nextLeafCol = 0;
  let maxDepth = 0;

  const visit = (version: PlanVersionRow, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const children = childrenMap.get(version.id) ?? [];

    let x: number;
    if (children.length === 0) {
      x = nextLeafCol;
      nextLeafCol += 1;
    } else {
      const childXs = children.map((child) => visit(child, depth + 1));
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }

    positioned.set(version.id, {
      version,
      depth,
      x: PADDING + x * COL_GAP,
      y: PADDING + depth * ROW_GAP,
    });

    return x;
  };

  roots.forEach((root, index) => {
    visit(root, 0);
    if (index < roots.length - 1) {
      nextLeafCol += 1;
    }
  });

  const nodes = Array.from(positioned.values()).sort((a, b) => a.version.versionNumber - b.version.versionNumber);
  const width = Math.max(360, PADDING * 2 + Math.max(1, nextLeafCol) * COL_GAP);
  const height = Math.max(180, PADDING * 2 + (maxDepth + 1) * ROW_GAP);

  return { nodes, width, height };
}

export function VersionTreePanel({ versions, currentVersionId, onOpenVersion }: VersionTreePanelProps): JSX.Element {
  const { nodes, width, height } = useMemo(() => buildTreeLayout(versions), [versions]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.version.id, node])), [nodes]);

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">버전 트리</h3>
      <div className="mt-3 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <svg width={width} height={height} role="img" aria-label="버전 트리">
          <defs>
            <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
            </marker>
          </defs>

          {nodes.map((node) => {
            const parentId = node.version.parentVersionId;
            if (!parentId) {
              return null;
            }
            const parent = nodeById.get(parentId);
            if (!parent) {
              return null;
            }

            return (
              <line
                key={`edge-${parent.version.id}-${node.version.id}`}
                x1={parent.x}
                y1={parent.y + NODE_RADIUS + 2}
                x2={node.x}
                y2={node.y - NODE_RADIUS - 4}
                stroke="#94a3b8"
                strokeWidth={2}
                markerEnd="url(#arrow-head)"
              />
            );
          })}

          {nodes.map((node) => {
            const isCurrent = currentVersionId === node.version.id;
            const note = formatNote(node.version.changeNote ?? null);
            return (
              <g
                key={node.version.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={() => onOpenVersion(node.version.id)}
              >
                <circle
                  r={NODE_RADIUS}
                  fill={isCurrent ? '#dcfce7' : '#ffffff'}
                  stroke={isCurrent ? '#16a34a' : '#334155'}
                  strokeWidth={isCurrent ? 2.5 : 2}
                />
                <text textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#0f172a" fontWeight="700">
                  v{node.version.versionNumber}
                </text>
                {note ? (
                  <text x={NODE_RADIUS + 8} y={-2} textAnchor="start" fontSize="10" fill="#475569">
                    {note}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}
