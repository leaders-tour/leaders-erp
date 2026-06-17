import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  sumTeamHeadcounts,
  validateTeamHeadcountDraft,
  type TransportTeamHeadcountRow,
} from '../transport-team-headcount';

export interface TransportTeamHeadcountModalProps {
  open: boolean;
  teams: TransportTeamHeadcountRow[];
  headcountTotal: number;
  onClose: () => void;
  onSave: (counts: number[]) => void;
}

export function TransportTeamHeadcountModal({
  open,
  teams,
  headcountTotal,
  onClose,
  onSave,
}: TransportTeamHeadcountModalProps): JSX.Element | null {
  const [draftCounts, setDraftCounts] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraftCounts(teams.map((team) => team.headcount));
  }, [open, teams]);

  const validationError = useMemo(
    () => validateTeamHeadcountDraft(draftCounts, headcountTotal),
    [draftCounts, headcountTotal],
  );

  const draftSum = useMemo(() => sumTeamHeadcounts(draftCounts), [draftCounts]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">팀별 인원 설정</h3>
        <p className="mt-1 text-sm text-slate-600">
          3팀 이상일 때는 팀별 인원을 한 번에 입력한 뒤 저장해야 반영됩니다.
        </p>

        <div className="mt-4 grid gap-3">
          {teams.map((team, index) => (
            <label key={`${team.teamName}-${index}`} className="grid gap-1 text-sm">
              <span className="text-xs text-slate-600">{team.teamName || `${index + 1}번 팀`}</span>
              <input
                type="number"
                min={1}
                step={1}
                value={draftCounts[index] ?? 1}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setDraftCounts((current) =>
                    current.map((count, countIndex) =>
                      countIndex === index
                        ? Number.isInteger(nextValue)
                          ? nextValue
                          : count
                        : count,
                    ),
                  );
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <span>팀별 합계</span>
            <span className="font-semibold text-slate-900">{draftSum}명</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span>전체 인원</span>
            <span className="font-semibold text-slate-900">{headcountTotal}명</span>
          </div>
        </div>

        {validationError ? (
          <p className="mt-3 text-sm text-rose-700">{validationError}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={validationError != null}
            onClick={() => {
              if (validationError) {
                return;
              }
              onSave(draftCounts);
            }}
          >
            저장
          </Button>
        </div>
      </Card>
    </div>
  );
}
