import { useMutation, useQuery } from '@apollo/client';
import { APP_SETTINGS_DEFAULT } from '@tour/validation';
import { Button, Card } from '@tour/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppSettingsDocument,
  UpdateAppSettingsDocument,
  type AppSettingsInput,
} from '../generated/graphql';
import {
  MOVEMENT_INTENSITY_ORDER,
  getMovementIntensityMeta,
  normalizeMovementIntensityColorSettings,
  type MovementIntensityColorSetting,
  type MovementIntensityValue,
} from '../features/estimate/model/movement-intensity';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function toDraftFromSettings(colors: readonly MovementIntensityColorSetting[] | null | undefined): MovementIntensityColorSetting[] {
  return normalizeMovementIntensityColorSettings(colors);
}

function toMutationInput(colors: readonly MovementIntensityColorSetting[]): AppSettingsInput {
  return {
    movementIntensityColors: colors.map((item) => ({
      level: item.level as AppSettingsInput['movementIntensityColors'][number]['level'],
      color: item.color,
    })),
  };
}

function formatUpdatedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString('ko-KR');
}

export function SettingsPage(): JSX.Element {
  const { data, loading, refetch } = useQuery(AppSettingsDocument, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateSettings, { loading: saving }] = useMutation(UpdateAppSettingsDocument);
  const [draft, setDraft] = useState<MovementIntensityColorSetting[]>(
    () => APP_SETTINGS_DEFAULT.movementIntensityColors,
  );
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  useEffect(() => {
    if (data?.appSettings) {
      setDraft(toDraftFromSettings(
        data.appSettings.movementIntensityColors.map((item) => ({
          level: item.level as MovementIntensityValue,
          color: item.color,
        })),
      ));
    }
  }, [data]);

  const invalidLevels = useMemo(
    () => draft.filter((item) => !HEX_COLOR_PATTERN.test(item.color)).map((item) => item.level),
    [draft],
  );
  const canSave = invalidLevels.length === 0 && !saving;

  const colorByLevel = useMemo(
    () => new Map(draft.map((item) => [item.level, item.color] as const)),
    [draft],
  );

  const updateColor = useCallback((level: MovementIntensityValue, color: string) => {
    setDraft((current) => {
      const currentColorByLevel = new Map(current.map((item) => [item.level, item.color] as const));
      return MOVEMENT_INTENSITY_ORDER.map((itemLevel) => ({
        level: itemLevel,
        color: itemLevel === level
          ? color
          : currentColorByLevel.get(itemLevel) ??
            APP_SETTINGS_DEFAULT.movementIntensityColors.find((item) => item.level === itemLevel)!.color,
      }));
    });
    setFeedback(null);
  }, []);

  const handleResetDefaults = useCallback(() => {
    setDraft(APP_SETTINGS_DEFAULT.movementIntensityColors.map((item) => ({ ...item })));
    setFeedback({ type: 'ok', message: '기본 색상으로 채웠습니다. 저장하면 반영됩니다.' });
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      setFeedback({ type: 'err', message: 'HEX 색상 형식을 확인해 주세요.' });
      return;
    }

    setFeedback(null);
    try {
      await updateSettings({
        variables: {
          input: toMutationInput(draft),
        },
      });
      await refetch();
      setFeedback({ type: 'ok', message: '저장했습니다.' });
    } catch (error) {
      setFeedback({
        type: 'err',
        message: error instanceof Error ? error.message : '저장에 실패했습니다.',
      });
    }
  }, [canSave, draft, refetch, updateSettings]);

  const updatedAt = formatUpdatedAt(data?.appSettings.updatedAt);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">설정</h1>
        {updatedAt ? (
          <p className="mt-2 text-xs text-slate-500">마지막 수정: {updatedAt}</p>
        ) : null}
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <Card className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">이동강도 색상</h2>
            <p className="mt-1 text-xs text-slate-500">내부 배지와 견적서 일정표 칩에 적용됩니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleResetDefaults} disabled={saving}>
              기본값 복원
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!canSave || loading}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {MOVEMENT_INTENSITY_ORDER.map((level) => {
            const color = colorByLevel.get(level) ?? '#000000';
            const meta = getMovementIntensityMeta(level, draft);
            const isInvalid = !HEX_COLOR_PATTERN.test(color);

            return (
              <div
                key={level}
                className="grid gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:grid-cols-[minmax(120px,1fr)_auto_minmax(150px,180px)] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-8 min-w-[6rem] items-center justify-center rounded-full border px-3 text-xs font-semibold"
                    style={{
                      backgroundColor: meta?.backgroundColor,
                      borderColor: meta?.borderColor,
                      color: meta?.textColor,
                    }}
                  >
                    {meta?.label ?? level}
                  </span>
                  <span className="text-sm text-slate-600">{level}</span>
                </div>

                <input
                  type="color"
                  value={HEX_COLOR_PATTERN.test(color) ? color : '#000000'}
                  aria-label={`${meta?.label ?? level} 색상`}
                  onChange={(event) => updateColor(level, event.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />

                <div>
                  <input
                    value={color}
                    onChange={(event) => updateColor(level, event.target.value)}
                    className={`h-10 w-full rounded-lg border px-3 text-sm font-mono uppercase ${
                      isInvalid ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 text-slate-900'
                    }`}
                  />
                  {isInvalid ? <p className="mt-1 text-xs text-red-600">#RRGGBB 형식</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
