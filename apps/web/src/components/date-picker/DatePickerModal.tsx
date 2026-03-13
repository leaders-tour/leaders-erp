import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  KOREAN_WEEKDAY_LABELS,
  formatDateTriggerLabel,
  formatIsoDate,
  getCurrentLocalYear,
  getDaysInMonth,
  getInitialDatePickerView,
  getWeekdayIndex,
  parseIsoDate,
} from './date-picker-utils';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const YEAR_RANGE_RADIUS = 10;
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

export interface DatePickerModalProps {
  open: boolean;
  value: string;
  anchorEl: HTMLElement | null;
  defaultYear?: number;
  title?: string;
  onClose: () => void;
  onChange: (nextIsoDate: string) => void;
}

function getPopoverPosition(anchorEl: HTMLElement): PopoverPosition {
  const rect = anchorEl.getBoundingClientRect();
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
  const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  const left = Math.min(Math.max(rect.left, VIEWPORT_PADDING), maxLeft);
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING - POPOVER_GAP;
  const spaceAbove = rect.top - VIEWPORT_PADDING - POPOVER_GAP;
  const placeAbove = spaceBelow < 360 && spaceAbove > spaceBelow;
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

export function DatePickerModal({
  open,
  value,
  anchorEl,
  defaultYear,
  title = '날짜 선택',
  onClose,
  onChange,
}: DatePickerModalProps): JSX.Element | null {
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear ?? getCurrentLocalYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialView = getInitialDatePickerView(value, defaultYear);
    setSelectedYear(initialView.year);
    setSelectedMonth(initialView.month);
  }, [defaultYear, open, value]);

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

  const parsedValue = useMemo(() => parseIsoDate(value), [value]);
  const anchorYear = defaultYear ?? getCurrentLocalYear();
  const minYear = Math.min(anchorYear - YEAR_RANGE_RADIUS, parsedValue?.year ?? anchorYear);
  const maxYear = Math.max(anchorYear + YEAR_RANGE_RADIUS, parsedValue?.year ?? anchorYear);
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  const selectedLabel = formatDateTriggerLabel(value);

  const dayButtons = useMemo(() => {
    if (selectedMonth === null) {
      return [];
    }

    const leadingBlankCount = getWeekdayIndex(selectedYear, selectedMonth, 1);
    const totalDays = getDaysInMonth(selectedYear, selectedMonth);
    const blanks = Array.from({ length: leadingBlankCount }, (_, index) => ({
      key: `blank-${index}`,
      day: null,
      isoDate: '',
    }));
    const days = Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      return {
        key: `day-${day}`,
        day,
        isoDate: formatIsoDate({ year: selectedYear, month: selectedMonth, day }),
      };
    });

    return [...blanks, ...days];
  }, [selectedMonth, selectedYear]);

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
          maxHeight: `min(calc(100vh - ${VIEWPORT_PADDING * 2}px), ${position.maxHeight + 220}px)`,
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
              <p className="mt-1 text-sm text-slate-600">월을 먼저 선택한 뒤 날짜를 누르면 바로 반영됩니다.</p>
            </div>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            선택값: <span className="font-medium text-slate-900">{selectedLabel || '아직 선택되지 않음'}</span>
          </div>

          <div className="mt-4 grid min-h-0 flex-1 gap-5 overflow-hidden md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">연도</span>
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2">
                <span className="text-xs font-medium text-slate-600">월</span>
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_OPTIONS.map((month) => {
                    const isSelected = selectedMonth === month;
                    return (
                      <button
                        key={`month-${month}`}
                        type="button"
                        onClick={() => setSelectedMonth(month)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {month}월
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">일 선택</h4>
                <p className="text-xs text-slate-500">
                  {selectedMonth === null ? '먼저 월을 선택하세요.' : `${selectedYear}년 ${selectedMonth}월`}
                </p>
              </div>

              {selectedMonth === null ? (
                <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  월을 선택하면 날짜가 표시됩니다.
                </div>
              ) : (
                <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 p-4">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
                    {KOREAN_WEEKDAY_LABELS.map((label) => (
                      <span key={`weekday-${label}`} className="py-1">
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {dayButtons.map((item) => {
                      if (item.day === null) {
                        return <span key={item.key} className="h-12 rounded-2xl" aria-hidden="true" />;
                      }

                      const isSelected =
                        parsedValue?.year === selectedYear &&
                        parsedValue?.month === selectedMonth &&
                        parsedValue?.day === item.day;
                      const weekdayLabel = KOREAN_WEEKDAY_LABELS[getWeekdayIndex(selectedYear, selectedMonth, item.day)];

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            onChange(item.isoDate);
                            onClose();
                          }}
                          className={`flex h-12 flex-col items-center justify-center rounded-2xl border text-sm transition ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-semibold">{item.day}</span>
                          <span className={`text-[11px] ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>{weekdayLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
