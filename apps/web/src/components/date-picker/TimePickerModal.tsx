import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  buildAllowedMinuteOptions,
  formatTimeTriggerLabel,
  formatTimeValue,
  getInitialTimePickerView,
  parseTimeValue,
} from './time-picker-utils';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const VIEWPORT_PADDING = 16;
const POPOVER_GAP = 8;
const POPOVER_WIDTH = 720;

interface PopoverPosition {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

export interface TimePickerModalProps {
  open: boolean;
  value: string;
  anchorEl: HTMLElement | null;
  title?: string;
  allowedMinutes?: readonly number[];
  onClose: () => void;
  onChange: (nextTime: string) => void;
}

function getPopoverPosition(anchorEl: HTMLElement): PopoverPosition {
  const rect = anchorEl.getBoundingClientRect();
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
  const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  const left = Math.min(Math.max(rect.left, VIEWPORT_PADDING), maxLeft);
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING - POPOVER_GAP;
  const spaceAbove = rect.top - VIEWPORT_PADDING - POPOVER_GAP;
  const placeAbove = spaceBelow < 320 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(260, Math.min(560, placeAbove ? spaceAbove : spaceBelow));

  if (placeAbove) {
    return {
      left,
      width,
      maxHeight,
      bottom: Math.max(window.innerHeight - rect.top + POPOVER_GAP, VIEWPORT_PADDING),
    };
  }

  return {
    left,
    width,
    maxHeight,
    top: Math.max(rect.bottom + POPOVER_GAP, VIEWPORT_PADDING),
  };
}

export function TimePickerModal({
  open,
  value,
  anchorEl,
  title = '시간 선택',
  allowedMinutes,
  onClose,
  onChange,
}: TimePickerModalProps): JSX.Element | null {
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const minuteOptions = useMemo(() => buildAllowedMinuteOptions(allowedMinutes), [allowedMinutes]);
  const parsedValue = useMemo(() => parseTimeValue(value), [value]);
  const selectedLabel = formatTimeTriggerLabel(value);
  const minuteGridClassName =
    minuteOptions.length > 24 ? 'grid-cols-5 sm:grid-cols-6 md:grid-cols-8' : minuteOptions.length > 6 ? 'grid-cols-4' : 'grid-cols-2';

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialView = getInitialTimePickerView(value, allowedMinutes);
    setSelectedHour(initialView.hour);
    setSelectedMinute(initialView.minute);
  }, [allowedMinutes, open, value]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    if (!anchorEl || !anchorEl.isConnected) {
      onClose();
      return;
    }

    const updatePosition = (): void => {
      if (!anchorEl.isConnected) {
        onClose();
        return;
      }

      setPosition(getPopoverPosition(anchorEl));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl, onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !position) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed z-50"
        style={{
          left: position.left,
          width: position.width,
          maxHeight: `min(calc(100vh - ${VIEWPORT_PADDING * 2}px), ${position.maxHeight + 160}px)`,
          top: position.top,
          bottom: position.bottom,
        }}
      >
        <Card
          className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
          role="dialog"
          aria-label={title}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">시간을 먼저 선택한 뒤 분을 누르면 바로 반영됩니다.</p>
            </div>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            선택값: <span className="font-medium text-slate-900">{selectedLabel || '아직 선택되지 않음'}</span>
          </div>

          <div className="mt-4 grid min-h-0 flex-1 gap-5 overflow-hidden md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="grid min-h-0 gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">시간 선택</h4>
                <p className="text-xs text-slate-500">{String(selectedHour).padStart(2, '0')}시</p>
              </div>

              <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {HOUR_OPTIONS.map((hour) => {
                    const isSelected = selectedHour === hour;
                    return (
                      <button
                        key={`hour-${hour}`}
                        type="button"
                        onClick={() => setSelectedHour(hour)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {String(hour).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">분 선택</h4>
                <p className="text-xs text-slate-500">
                  {parsedValue && parsedValue.hour === selectedHour
                    ? `현재 값 ${String(parsedValue.minute).padStart(2, '0')}분`
                    : `${String(selectedMinute).padStart(2, '0')}분`}
                </p>
              </div>

              <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 p-4">
                <div className={`grid gap-2 ${minuteGridClassName}`}>
                  {minuteOptions.map((minute) => {
                    const isSelected = selectedMinute === minute;
                    return (
                      <button
                        key={`minute-${minute}`}
                        type="button"
                        onClick={() => {
                          setSelectedMinute(minute);
                          onChange(formatTimeValue({ hour: selectedHour, minute }));
                          onClose();
                        }}
                        className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {String(minute).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
