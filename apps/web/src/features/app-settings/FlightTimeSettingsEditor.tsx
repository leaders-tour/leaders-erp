import {
  APP_SETTINGS_DEFAULT,
  collectFlightTimeSettingsIssues,
  isValidFlightTimeShortcut,
  type FlightTimeSettings,
} from '@tour/validation';
import { Button } from '@tour/ui';
import { useCallback, useMemo, useState } from 'react';

type FlightDirection = 'in' | 'out';

interface FlightTimeSettingsEditorProps {
  draft: FlightTimeSettings;
  onChange: (next: FlightTimeSettings) => void;
  onResetDefaults: () => void;
  disabled?: boolean;
}

function cloneFlightTimeSettings(settings: FlightTimeSettings): FlightTimeSettings {
  return {
    defaultInTime: settings.defaultInTime,
    defaultOutTime: settings.defaultOutTime,
    inTimeShortcuts: [...settings.inTimeShortcuts],
    outTimeShortcuts: [...settings.outTimeShortcuts],
  };
}

function getShortcutKey(direction: FlightDirection): 'inTimeShortcuts' | 'outTimeShortcuts' {
  return direction === 'in' ? 'inTimeShortcuts' : 'outTimeShortcuts';
}

function getDefaultKey(direction: FlightDirection): 'defaultInTime' | 'defaultOutTime' {
  return direction === 'in' ? 'defaultInTime' : 'defaultOutTime';
}

interface ShortcutListEditorProps {
  direction: FlightDirection;
  title: string;
  description: string;
  shortcuts: string[];
  defaultTime: string;
  newTimeDraft: string;
  onNewTimeDraftChange: (value: string) => void;
  onChange: (next: FlightTimeSettings) => void;
  draft: FlightTimeSettings;
  disabled?: boolean;
}

function ShortcutListEditor({
  direction,
  title,
  description,
  shortcuts,
  defaultTime,
  newTimeDraft,
  onNewTimeDraftChange,
  onChange,
  draft,
  disabled = false,
}: ShortcutListEditorProps): JSX.Element {
  const shortcutKey = getShortcutKey(direction);
  const defaultKey = getDefaultKey(direction);

  const updateShortcuts = useCallback(
    (nextShortcuts: string[]) => {
      const next = cloneFlightTimeSettings(draft);
      next[shortcutKey] = nextShortcuts;
      if (!nextShortcuts.includes(next[defaultKey]) && nextShortcuts[0]) {
        next[defaultKey] = nextShortcuts[0];
      }
      onChange(next);
    },
    [defaultKey, draft, onChange, shortcutKey],
  );

  const handleAdd = useCallback(() => {
    const normalized = newTimeDraft.trim();
    if (!isValidFlightTimeShortcut(normalized)) {
      return;
    }
    if (shortcuts.includes(normalized)) {
      return;
    }
    updateShortcuts([...shortcuts, normalized]);
    onNewTimeDraftChange('');
  }, [newTimeDraft, onNewTimeDraftChange, shortcuts, updateShortcuts]);

  const handleUpdate = useCallback(
    (index: number, value: string) => {
      const nextShortcuts = [...shortcuts];
      nextShortcuts[index] = value;
      const next = cloneFlightTimeSettings(draft);
      next[shortcutKey] = nextShortcuts;
      if (next[defaultKey] === shortcuts[index] && value.trim()) {
        next[defaultKey] = value.trim();
      }
      onChange(next);
    },
    [defaultKey, draft, onChange, shortcutKey, shortcuts],
  );

  const handleDelete = useCallback(
    (index: number) => {
      if (shortcuts.length <= 1) {
        return;
      }
      const removed = shortcuts[index];
      const nextShortcuts = shortcuts.filter((_, itemIndex) => itemIndex !== index);
      const next = cloneFlightTimeSettings(draft);
      next[shortcutKey] = nextShortcuts;
      if (removed === next[defaultKey]) {
        next[defaultKey] = nextShortcuts[0] ?? next[defaultKey];
      }
      onChange(next);
    },
    [defaultKey, draft, onChange, shortcutKey, shortcuts],
  );

  const handleMove = useCallback(
    (index: number, directionDelta: -1 | 1) => {
      const nextIndex = index + directionDelta;
      if (nextIndex < 0 || nextIndex >= shortcuts.length) {
        return;
      }
      const nextShortcuts = [...shortcuts];
      const [item] = nextShortcuts.splice(index, 1);
      if (!item) {
        return;
      }
      nextShortcuts.splice(nextIndex, 0, item);
      updateShortcuts(nextShortcuts);
    },
    [shortcuts, updateShortcuts],
  );

  const handleSetDefault = useCallback(
    (time: string) => {
      if (!isValidFlightTimeShortcut(time) || !shortcuts.includes(time)) {
        return;
      }
      onChange({
        ...cloneFlightTimeSettings(draft),
        [defaultKey]: time,
      });
    },
    [defaultKey, draft, onChange, shortcuts],
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-medium text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      <div className="mt-4 grid gap-2">
        {shortcuts.map((time, index) => {
          const isInvalid = !isValidFlightTimeShortcut(time);
          const isDuplicate = shortcuts.filter((item) => item === time).length > 1;
          return (
            <div
              key={`${direction}-${index}-${time}`}
              className="rounded-xl border border-slate-200 px-3 py-3"
            >
              <div className="grid grid-cols-[auto_6.75rem_minmax(0,1fr)] items-center gap-x-2 sm:gap-x-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name={`${direction}-default-time`}
                    checked={defaultTime === time}
                    disabled={disabled || isInvalid}
                    onChange={() => handleSetDefault(time)}
                  />
                  자동 초기값
                </label>
                <input
                  value={time}
                  disabled={disabled}
                  onChange={(event) => handleUpdate(index, event.target.value)}
                  placeholder="HH:mm"
                  className={`box-border h-10 w-full rounded-lg border px-3 text-center text-sm font-mono tabular-nums tracking-wide ${
                    isInvalid || isDuplicate
                      ? 'border-red-300 bg-red-50 text-red-900'
                      : 'border-slate-200 text-slate-900'
                  }`}
                />
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 px-2.5"
                    disabled={disabled || index === 0}
                    onClick={() => handleMove(index, -1)}
                  >
                    위
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 px-2.5"
                    disabled={disabled || index === shortcuts.length - 1}
                    onClick={() => handleMove(index, 1)}
                  >
                    아래
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 px-2.5"
                    disabled={disabled || shortcuts.length <= 1}
                    onClick={() => handleDelete(index)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
              {isInvalid ? <p className="mt-2 text-xs text-red-600">HH:mm 형식</p> : null}
              {isDuplicate ? <p className="mt-2 text-xs text-red-600">중복된 시간</p> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="grid flex-1 gap-1 text-sm text-slate-700">
          <span>시간 추가</span>
          <input
            value={newTimeDraft}
            disabled={disabled}
            onChange={(event) => onNewTimeDraftChange(event.target.value)}
            placeholder="예: 02:45"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-mono text-slate-900"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !isValidFlightTimeShortcut(newTimeDraft.trim()) || shortcuts.includes(newTimeDraft.trim())}
          onClick={handleAdd}
        >
          추가
        </Button>
      </div>
    </div>
  );
}

export function FlightTimeSettingsEditor({
  draft,
  onChange,
  onResetDefaults,
  disabled = false,
}: FlightTimeSettingsEditorProps): JSX.Element {
  const [newInTimeDraft, setNewInTimeDraft] = useState('');
  const [newOutTimeDraft, setNewOutTimeDraft] = useState('');

  const issues = useMemo(() => collectFlightTimeSettingsIssues(draft), [draft]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">
            일정빌더·견적 편집·상담 시간 보정에 공통 적용됩니다. 배열 순서가 단축키 표시 순서입니다.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={disabled} onClick={onResetDefaults}>
          기본값 복원
        </Button>
      </div>

      {issues.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <ul className="list-disc pl-5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ShortcutListEditor
          direction="in"
          title="항공 IN 단축키"
          description="입국 항공 시간 단축키와 자동 초기값을 관리합니다."
          shortcuts={draft.inTimeShortcuts}
          defaultTime={draft.defaultInTime}
          newTimeDraft={newInTimeDraft}
          onNewTimeDraftChange={setNewInTimeDraft}
          onChange={onChange}
          draft={draft}
          disabled={disabled}
        />
        <ShortcutListEditor
          direction="out"
          title="항공 OUT 단축키"
          description="출국 항공 시간 단축키와 자동 초기값을 관리합니다."
          shortcuts={draft.outTimeShortcuts}
          defaultTime={draft.defaultOutTime}
          newTimeDraft={newOutTimeDraft}
          onNewTimeDraftChange={setNewOutTimeDraft}
          onChange={onChange}
          draft={draft}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function createFlightTimeSettingsDraft(
  settings: FlightTimeSettings = APP_SETTINGS_DEFAULT.flightTimeSettings,
): FlightTimeSettings {
  return {
    defaultInTime: settings.defaultInTime,
    defaultOutTime: settings.defaultOutTime,
    inTimeShortcuts: [...settings.inTimeShortcuts],
    outTimeShortcuts: [...settings.outTimeShortcuts],
  };
}
