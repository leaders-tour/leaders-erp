import { useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import {
  teamPricingsForSummaryDisplay,
  teamPricingSummarySignatureFromParts,
} from '../../pricing/team-pricing-summary-display';
import { PICKUP_DROP_PLACE_OPTIONS, formatPickupDropDisplay, type PickupDropPlaceType } from '../../plan/pickup-drop';
import { ESTIMATE_COMPANY, ESTIMATE_PAYMENT, ESTIMATE_TAGLINE, ESTIMATE_TITLE } from '../model/constants';
import type {
  EstimateDocumentData,
  EstimatePage1EditableField,
  EstimatePage1Editor,
  EstimateTeamPricing,
  EstimateTransportGroup,
} from '../model/types';
import {
  formatCurrency,
  formatDateKorean,
  formatFlightText,
  formatHeadcount,
  formatSignedCurrency,
  formatTransportFlightText,
  formatTransportPickupDropText,
  formatTravelPeriod,
} from '../utils/format';

const FLIGHT_IN_TIME_OPTIONS = ['00:05', '00:30', '00:50', '02:45', '04:30', '11:10', '12:40', '13:20', '17:00', '18:10', '23:05', '23:30'] as const;
const FLIGHT_OUT_TIME_OPTIONS = ['00:25', '00:50', '01:30', '01:50', '02:05', '08:40', '11:00', '13:00', '13:40', '14:50', '18:15', '20:30'] as const;
const PICKUP_DROP_TIME_OPTIONS = ['04:00', '05:00', '08:00', '15:30', '19:00', '21:00', '23:00'] as const;

interface EstimatePage1Props {
  data: EstimateDocumentData;
  editor?: EstimatePage1Editor;
}

function fallback(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

const VEHICLE_PURGONG_PHOTO_NOTE = '*푸르공 사진촬영 가능';

function vehicleTypeShowsPurgongPhotoNote(vehicleType: string | null | undefined): boolean {
  const v = vehicleType?.trim();
  return v === '스타렉스' || v === '하이에이스';
}

function estimateTeamPricingSummarySignature(row: EstimateTeamPricing): string {
  return teamPricingSummarySignatureFromParts({
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw: row.depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    securityNone: row.securityDepositScope === '-',
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityDepositUnitKrw: row.securityDepositUnitKrw,
    securityScopeWhenPresent: row.securityDepositScope === '-' ? '' : row.securityDepositScope,
  });
}

function VehicleTypeCellDisplay({ vehicleType }: { vehicleType: string | null | undefined }): JSX.Element {
  const main = fallback(vehicleType);
  if (main === '-' || !vehicleTypeShowsPurgongPhotoNote(vehicleType)) {
    return <>{main}</>;
  }
  return (
    <span className="inline-flex flex-col items-center gap-0.5 text-center text-inherit">
      <span className="block font-semibold leading-tight">{main}</span>
      <span className="block text-[0.8125em] leading-snug text-inherit">{VEHICLE_PURGONG_PHOTO_NOTE}</span>
    </span>
  );
}

interface EditableCellProps {
  field: EstimatePage1EditableField;
  activeField: EstimatePage1EditableField | null;
  editor?: EstimatePage1Editor;
  displayValue: ReactNode;
  input: ReactNode;
  colSpan?: number;
  multiline?: boolean;
  className?: string;
  contentClassName?: string;
  onActivate: (field: EstimatePage1EditableField) => void;
  onDeactivate: () => void;
}

function EditableCell({
  field,
  activeField,
  editor,
  displayValue,
  input,
  colSpan,
  multiline = false,
  className,
  contentClassName,
  onActivate,
  onDeactivate,
}: EditableCellProps): JSX.Element {
  if (!editor) {
    return (
      <td className={className} colSpan={colSpan}>
        {displayValue}
      </td>
    );
  }

  const isActive = activeField === field;

  if (isActive) {
    return (
      <td className={className} colSpan={colSpan}>
        <div
          className="estimate-editable-shell estimate-editable-shell--active"
          onBlurCapture={(event: FocusEvent<HTMLDivElement>) => {
            const nextTarget = event.relatedTarget;
            if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
              return;
            }
            onDeactivate();
          }}
        >
          {input}
        </div>
      </td>
    );
  }

  return (
    <td className={className} colSpan={colSpan}>
      <button type="button" className="estimate-editable-trigger" onClick={() => onActivate(field)}>
        <span className={`estimate-editable-content ${multiline ? 'estimate-editable-content--multiline' : ''} ${contentClassName ?? ''}`}>
          {displayValue}
        </span>
      </button>
    </td>
  );
}

interface TransportGroupEditorProps {
  groups: EstimateTransportGroup[];
  mode: 'flightIn' | 'flightOut' | 'pickup' | 'drop';
  headcountTotal: number;
  onFieldChange: EstimatePage1Editor['onTransportGroupFieldChange'];
  onAdd: () => void;
  onRemove: (index: number) => void;
}

interface PlaceButtonGroupProps {
  placeType: PickupDropPlaceType;
  onChange: (value: PickupDropPlaceType) => void;
}

function PlaceButtonGroup({ placeType, onChange }: PlaceButtonGroupProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {PICKUP_DROP_PLACE_OPTIONS.map((option) => (
        <button
          key={`place-button-${option.value}`}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl border px-3 py-1.5 text-sm transition ${
            placeType === option.value
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface FlightTimeButtonGroupProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

function FlightTimeButtonGroup({ options, value, onChange }: FlightTimeButtonGroupProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={`flight-time-${option}`}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-xl border px-3 py-1.5 text-xs transition ${
            value === option
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function TransportGroupEditor({
  groups,
  mode,
  headcountTotal,
  onFieldChange,
  onAdd,
  onRemove,
}: TransportGroupEditorProps): JSX.Element {
  const showGroupMeta = groups.length > 1;
  const title =
    mode === 'flightIn'
      ? 'IN'
      : mode === 'flightOut'
        ? 'OUT'
        : mode === 'pickup'
          ? '픽업'
          : '드랍';

  return (
    <div className="estimate-editable-grid">
      {groups.map((group, index) => (
        <div key={`${title}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
          {showGroupMeta ? (
            <div className="mb-2 grid gap-2 md:grid-cols-[1fr_minmax(11rem,1fr)_auto]">
              <input
                autoFocus={index === 0}
                type="text"
                value={group.teamName}
                onChange={(event) => onFieldChange(index, 'teamName', event.target.value)}
                placeholder="팀명"
                className="estimate-editable-input"
              />
              <div className="grid min-w-0 gap-1">
                <span className="text-[10px] font-medium text-slate-500 md:hidden">인원</span>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
                  <button
                    type="button"
                    onClick={() => onFieldChange(index, 'headcount', group.headcount - 1)}
                    disabled={group.headcount <= 1}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="팀 인원 감소"
                  >
                    -
                  </button>
                  <div className="min-w-0 flex-1 text-center text-sm font-semibold text-slate-900 sm:text-base">
                    {group.headcount}명
                  </div>
                  <button
                    type="button"
                    onClick={() => onFieldChange(index, 'headcount', group.headcount + 1)}
                    disabled={group.headcount >= headcountTotal - (groups.length - 1)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="팀 인원 증가"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                disabled={groups.length <= 1}
                onClick={() => onRemove(index)}
                className="estimate-editable-input disabled:cursor-not-allowed disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          ) : null}

          {mode === 'flightIn' ? (
            <div className="grid gap-2">
              <input
                type="date"
                value={group.flightInDate}
                onChange={(event) => onFieldChange(index, 'flightInDate', event.target.value)}
                className="estimate-editable-input"
              />
              <input
                type="time"
                value={group.flightInTime}
                onChange={(event) => onFieldChange(index, 'flightInTime', event.target.value)}
                className="estimate-editable-input"
              />
              <FlightTimeButtonGroup
                options={FLIGHT_IN_TIME_OPTIONS}
                value={group.flightInTime}
                onChange={(value) => onFieldChange(index, 'flightInTime', value)}
              />
            </div>
          ) : null}

          {mode === 'flightOut' ? (
            <div className="grid gap-2">
              <input
                type="date"
                value={group.flightOutDate}
                onChange={(event) => onFieldChange(index, 'flightOutDate', event.target.value)}
                className="estimate-editable-input"
              />
              <input
                type="time"
                value={group.flightOutTime}
                onChange={(event) => onFieldChange(index, 'flightOutTime', event.target.value)}
                className="estimate-editable-input"
              />
              <FlightTimeButtonGroup
                options={FLIGHT_OUT_TIME_OPTIONS}
                value={group.flightOutTime}
                onChange={(value) => onFieldChange(index, 'flightOutTime', value)}
              />
            </div>
          ) : null}

          {mode === 'pickup' ? (
            <div className="grid gap-2">
              <div className="grid gap-2">
                <input
                  type="date"
                  value={group.pickupDate}
                  onChange={(event) => onFieldChange(index, 'pickupDate', event.target.value)}
                  className="estimate-editable-input"
                />
                <input
                  type="time"
                  value={group.pickupTime}
                  onChange={(event) => onFieldChange(index, 'pickupTime', event.target.value)}
                  className="estimate-editable-input"
                />
                <FlightTimeButtonGroup
                  options={PICKUP_DROP_TIME_OPTIONS}
                  value={group.pickupTime}
                  onChange={(value) => onFieldChange(index, 'pickupTime', value)}
                />
              </div>
              <PlaceButtonGroup
                placeType={group.pickupPlaceType}
                onChange={(value) => onFieldChange(index, 'pickupPlaceType', value)}
              />
              {group.pickupPlaceType === 'CUSTOM' ? (
                <input
                  type="text"
                  value={group.pickupPlaceCustomText}
                  onChange={(event) => onFieldChange(index, 'pickupPlaceCustomText', event.target.value)}
                  placeholder="장소 직접 입력"
                  className="estimate-editable-input"
                />
              ) : null}
            </div>
          ) : null}

          {mode === 'drop' ? (
            <div className="grid gap-2">
              <div className="grid gap-2">
                <input
                  type="date"
                  value={group.dropDate}
                  onChange={(event) => onFieldChange(index, 'dropDate', event.target.value)}
                  className="estimate-editable-input"
                />
                <input
                  type="time"
                  value={group.dropTime}
                  onChange={(event) => onFieldChange(index, 'dropTime', event.target.value)}
                  className="estimate-editable-input"
                />
                <FlightTimeButtonGroup
                  options={PICKUP_DROP_TIME_OPTIONS}
                  value={group.dropTime}
                  onChange={(value) => onFieldChange(index, 'dropTime', value)}
                />
              </div>
              <PlaceButtonGroup
                placeType={group.dropPlaceType}
                onChange={(value) => onFieldChange(index, 'dropPlaceType', value)}
              />
              {group.dropPlaceType === 'CUSTOM' ? (
                <input
                  type="text"
                  value={group.dropPlaceCustomText}
                  onChange={(event) => onFieldChange(index, 'dropPlaceCustomText', event.target.value)}
                  placeholder="장소 직접 입력"
                  className="estimate-editable-input"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      <button type="button" onClick={onAdd} className="estimate-editable-input">
        팀 추가
      </button>
    </div>
  );
}

function blankIfDash(value: string): string {
  return value === '-' ? '' : value;
}

const MIN_ESTIMATE_PAGE1_FIT_SCALE = 0.72;

function formatTravelPeriodCompact(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const travelPeriod = formatTravelPeriod(startDate, endDate);
  if (travelPeriod === '-') {
    return '';
  }

  const firstParenIndex = travelPeriod.indexOf(' (');
  if (firstParenIndex < 0) {
    return travelPeriod;
  }

  return `${travelPeriod.slice(0, firstParenIndex)}\n${travelPeriod.slice(firstParenIndex + 1)}`;
}

function EstimatePage1LogoMark(): JSX.Element {
  return (
    <img
      className="estimate-page1-logo-mark"
      src="/estimate/page1-hero-logo.png"
      alt="Leaders Tour"
      width={220}
      height={92}
      decoding="async"
    />
  );
}

export function EstimatePage1({ data, editor }: EstimatePage1Props): JSX.Element {
  const adjustmentLines = data.adjustmentLines;
  const [activeField, setActiveField] = useState<EstimatePage1EditableField | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const bodyShellRef = useRef<HTMLDivElement | null>(null);
  const bodyFitRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const hasLongPricingText = adjustmentLines.some((line) => line.label.length >= 18 || line.formula.length >= 18);
  const page1DensityClassName =
    adjustmentLines.length >= 6 || (adjustmentLines.length >= 5 && hasLongPricingText)
      ? ' estimate-sheet-page1--compact'
      : adjustmentLines.length >= 4 || hasLongPricingText
        ? ' estimate-sheet-page1--dense'
        : '';
  const securityDepositSummary =
    data.securityDepositUnitKrw === null
      ? ''
      : `${formatCurrency(data.securityDepositUnitKrw)} (${data.securityDepositScope})`;
  const summaryTeamPricingsForDisplay = useMemo(
    () => teamPricingsForSummaryDisplay(data.teamPricings, estimateTeamPricingSummarySignature),
    [data.teamPricings],
  );
  const estimateSummaryShowTeamPrefix = summaryTeamPricingsForDisplay.length > 1;
  const travelPeriodCompact = formatTravelPeriodCompact(data.travelStartDate, data.travelEndDate);
  const headcountDisplay = blankIfDash(formatHeadcount(data.headcountTotal, data.headcountMale, data.headcountFemale));
  const flightInText = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportFlightText(data.transportGroups, 'IN')
      : formatFlightText(data.flightInDate, data.flightInTime),
  );
  const flightOutText = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportFlightText(data.transportGroups, 'OUT')
      : formatFlightText(data.flightOutDate, data.flightOutTime),
  );
  const pickupText = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportPickupDropText(data.transportGroups, 'pickup')
      : formatPickupDropDisplay(data.pickupDate, data.pickupTime, data.pickupPlaceType, data.pickupPlaceCustomText),
  );
  const dropText = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportPickupDropText(data.transportGroups, 'drop')
      : formatPickupDropDisplay(data.dropDate, data.dropTime, data.dropPlaceType, data.dropPlaceCustomText),
  );
  const documentNumberText = data.documentNumber?.trim() ?? '';

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const pageElement = pageRef.current;
    const heroElement = heroRef.current;
    const bodyShellElement = bodyShellRef.current;
    const bodyFitElement = bodyFitRef.current;
    const footerElement = footerRef.current;

    if (!pageElement || !heroElement || !bodyShellElement || !bodyFitElement || !footerElement) {
      return undefined;
    }

    let animationFrameId = 0;

    const setScale = (value: number) => {
      const nextValue = value.toFixed(4);
      if (pageElement.style.getPropertyValue('--estimate-page1-fit-scale') !== nextValue) {
        pageElement.style.setProperty('--estimate-page1-fit-scale', nextValue);
      }
    };

    const measureContentHeight = (scale: number): number => {
      setScale(scale);
      return bodyFitElement.scrollHeight;
    };

    const recalcScale = () => {
      const availableHeight = bodyShellElement.clientHeight;
      if (availableHeight <= 0) {
        setScale(1);
        return;
      }

      const fitsInSlot = (height: number) => height <= availableHeight + 1;
      const naturalHeight = measureContentHeight(1);

      if (fitsInSlot(naturalHeight)) {
        setScale(1);
        return;
      }

      const minimumHeight = measureContentHeight(MIN_ESTIMATE_PAGE1_FIT_SCALE);
      if (!fitsInSlot(minimumHeight)) {
        setScale(MIN_ESTIMATE_PAGE1_FIT_SCALE);
        return;
      }

      let low = MIN_ESTIMATE_PAGE1_FIT_SCALE;
      let high = 1;
      let best = low;

      for (let index = 0; index < 8; index += 1) {
        const mid = (low + high) / 2;
        if (fitsInSlot(measureContentHeight(mid))) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      setScale(best);
    };

    const scheduleRecalc = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(recalcScale);
    };

    scheduleRecalc();

    const resizeObserver = new ResizeObserver(() => {
      scheduleRecalc();
    });

    resizeObserver.observe(pageElement);
    resizeObserver.observe(heroElement);
    resizeObserver.observe(bodyShellElement);
    resizeObserver.observe(footerElement);

    window.addEventListener('resize', scheduleRecalc);
    window.addEventListener('beforeprint', recalcScale);
    window.addEventListener('afterprint', scheduleRecalc);
    void document.fonts?.ready.then(() => {
      scheduleRecalc();
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleRecalc);
      window.removeEventListener('beforeprint', recalcScale);
      window.removeEventListener('afterprint', scheduleRecalc);
    };
  }, [activeField, adjustmentLines, data, page1DensityClassName]);

  return (
    <section ref={pageRef} className={`estimate-sheet estimate-sheet-page1${page1DensityClassName}`}>
      <header ref={heroRef} className="estimate-page1-hero">
        <div className="estimate-page1-hero-copy">
          <div className="estimate-page1-hero-title-row">
            <div className="estimate-page1-hero-headline">
              <p className="estimate-tagline estimate-page1-tagline">{ESTIMATE_TAGLINE}</p>
              <h1 className="estimate-title estimate-page1-title">{ESTIMATE_TITLE}</h1>
            </div>
            <div className="estimate-page1-hero-brand">
              <EstimatePage1LogoMark />
            </div>
          </div>

          <div className="estimate-page1-company-meta">
            <div className="estimate-page1-company-meta-group">
              <div>사업자 등록번호 {ESTIMATE_COMPANY.businessNumber}</div>
              <div>네이버플레이스 {ESTIMATE_COMPANY.naverPlace}</div>
            </div>
            <div className="estimate-page1-company-meta-group estimate-page1-company-meta-group--right">
              <div>@ {ESTIMATE_COMPANY.instagram.replace(/^@/, '')}</div>
              <div>카카오톡 채널 {ESTIMATE_COMPANY.kakaoChannel}</div>
            </div>
          </div>
        </div>
      </header>

      <div ref={bodyShellRef} className="estimate-page1-body-shell">
        <div ref={bodyFitRef} className="estimate-page1-body">
          <table className="estimate-table estimate-page1-table estimate-page1-table--main">
          <colgroup>
            <col className="estimate-page1-col-4-label" />
            <col className="estimate-page1-col-4-value" />
            <col className="estimate-page1-col-4-label" />
            <col className="estimate-page1-col-4-value" />
          </colgroup>
          <tbody className="estimate-page1-tbody--basic">
            <tr className="estimate-page1-tr--even-height">
              <th>대표자명</th>
              <td>{blankIfDash(fallback(data.leaderName))}</td>
              <th>문서번호</th>
              <td>{documentNumberText}</td>
            </tr>
            <tr className="estimate-page1-tr--even-height">
              <th>여행지</th>
              <td>{blankIfDash(fallback(data.destinationName))}</td>
              <th>인원</th>
              <EditableCell
                field="headcount"
                activeField={activeField}
                editor={editor}
                displayValue={headcountDisplay}
                input={
                  <div className="estimate-editable-grid">
                    <label className="estimate-editable-meta">
                      <span>총 인원</span>
                      <input
                        autoFocus
                        type="number"
                        min={1}
                        value={editor?.headcountTotal ?? 1}
                        onChange={(event) => editor?.onHeadcountTotalChange(Math.max(1, Number(event.target.value) || 1))}
                        className="estimate-editable-input"
                      />
                    </label>
                    <div className="estimate-editable-meta">
                      <span>남성 인원</span>
                      <div className="estimate-editable-token-grid">
                        {Array.from({ length: (editor?.headcountTotal ?? 0) + 1 }, (_unused, count) => (
                          <button
                            key={`male-count-${count}`}
                            type="button"
                            className={`estimate-editable-token ${editor?.headcountMale === count ? 'estimate-editable-token--active' : ''}`}
                            onClick={() => editor?.onHeadcountMaleChange(count)}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                }
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
            </tr>
            <tr className="estimate-page1-tr--even-height">
              <th>여행 기간</th>
              <EditableCell
                field="travelPeriod"
                activeField={activeField}
                editor={editor}
                displayValue={<span className="whitespace-pre-line">{travelPeriodCompact}</span>}
                input={
                  <div className="estimate-editable-grid">
                    <input
                      autoFocus
                      type="date"
                      value={editor?.travelStartDate ?? ''}
                      onChange={(event) => editor?.onTravelStartDateChange(event.target.value)}
                      className="estimate-editable-input"
                    />
                    <input
                      type="date"
                      value={editor?.travelEndDate ?? ''}
                      onChange={(event) => editor?.onTravelEndDateChange(event.target.value)}
                      className="estimate-editable-input"
                    />
                  </div>
                }
                className="estimate-page1-preline-cell"
                multiline
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
              <th>차량</th>
              <EditableCell
                field="vehicleType"
                activeField={activeField}
                editor={editor}
                displayValue={<VehicleTypeCellDisplay vehicleType={data.vehicleType} />}
                input={
                  <select
                    autoFocus
                    value={editor?.vehicleType ?? ''}
                    onChange={(event) => editor?.onVehicleTypeChange(event.target.value)}
                    className="estimate-editable-input"
                  >
                    {editor?.vehicleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                }
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
            </tr>
          </tbody>
          <tbody className="estimate-page1-tbody--logistics">
            <tr className="estimate-page1-tr--tbody-gap" aria-hidden="true">
              <td colSpan={4} />
            </tr>
            <tr className="estimate-page1-tr--even-height">
              <th>항공권 IN</th>
              <EditableCell
                field="flightInTime"
                activeField={activeField}
                editor={editor}
                displayValue={<span className="whitespace-pre-wrap">{flightInText}</span>}
                multiline
                input={
                  <TransportGroupEditor
                    groups={editor?.transportGroups ?? []}
                    mode="flightIn"
                    headcountTotal={editor?.headcountTotal ?? 1}
                    onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                    onAdd={() => editor?.onAddTransportGroup()}
                    onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                  />
                }
                className="estimate-page1-preline-cell"
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
              <th>항공권 OUT</th>
              <EditableCell
                field="flightOutTime"
                activeField={activeField}
                editor={editor}
                displayValue={<span className="whitespace-pre-wrap">{flightOutText}</span>}
                multiline
                input={
                  <TransportGroupEditor
                    groups={editor?.transportGroups ?? []}
                    mode="flightOut"
                    headcountTotal={editor?.headcountTotal ?? 1}
                    onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                    onAdd={() => editor?.onAddTransportGroup()}
                    onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                  />
                }
                className="estimate-page1-preline-cell"
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
            </tr>
            <tr className="estimate-page1-tr--even-height">
              <th>픽업</th>
              <EditableCell
                field="pickupDate"
                activeField={activeField}
                editor={editor}
                displayValue={<span className="whitespace-pre-wrap">{pickupText}</span>}
                multiline
                input={
                  <TransportGroupEditor
                    groups={editor?.transportGroups ?? []}
                    mode="pickup"
                    headcountTotal={editor?.headcountTotal ?? 1}
                    onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                    onAdd={() => editor?.onAddTransportGroup()}
                    onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                  />
                }
                className="estimate-page1-preline-cell"
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
              <th>드랍</th>
              <EditableCell
                field="dropDate"
                activeField={activeField}
                editor={editor}
                displayValue={<span className="whitespace-pre-wrap">{dropText}</span>}
                multiline
                input={
                  <TransportGroupEditor
                    groups={editor?.transportGroups ?? []}
                    mode="drop"
                    headcountTotal={editor?.headcountTotal ?? 1}
                    onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                    onAdd={() => editor?.onAddTransportGroup()}
                    onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                  />
                }
                className="estimate-page1-preline-cell"
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
            </tr>
            <tr>
              <th>실투어 외 픽드랍</th>
              <td className="estimate-page1-preline-cell">{fallback(data.externalPickupDropText)}</td>
              <th>특이사항</th>
              <EditableCell
                field="specialNoteText"
                activeField={activeField}
                editor={editor}
                displayValue={fallback(data.specialNoteText)}
                multiline
                className="estimate-page1-preline-cell"
                input={
                  <textarea
                    autoFocus
                    rows={3}
                    value={editor?.specialNoteText ?? ''}
                    onChange={(event) => editor?.onSpecialNoteTextChange(event.target.value)}
                    className="estimate-editable-input estimate-editable-textarea"
                  />
                }
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
            </tr>
          </tbody>
          <tbody className="estimate-page1-tbody--extras">
            <tr className="estimate-page1-tr--tbody-gap" aria-hidden="true">
              <td colSpan={4} />
            </tr>
            <tr>
              <th>기본 대여물품</th>
              <EditableCell
                field="rentalItemsText"
                activeField={activeField}
                editor={editor}
                displayValue={fallback(data.rentalItemsText)}
                multiline
                className="estimate-page1-preline-cell"
                input={
                  <textarea
                    autoFocus
                    rows={4}
                    value={editor?.rentalItemsText ?? ''}
                    onChange={(event) => editor?.onRentalItemsTextChange(event.target.value)}
                    className="estimate-editable-input estimate-editable-textarea"
                  />
                }
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
              <th>참여 이벤트</th>
              <EditableCell
                field="eventIds"
                activeField={activeField}
                editor={editor}
                displayValue={fallback(data.eventText)}
                multiline
                className="estimate-page1-preline-cell"
                input={
                  <div className="estimate-editable-grid">
                    <div className="estimate-editable-chip-list">
                      {editor?.eventOptions.map((eventOption) => {
                        const active = editor.eventIds.includes(eventOption.id);
                        return (
                          <button
                            key={eventOption.id}
                            type="button"
                            className={`estimate-editable-chip ${active ? 'estimate-editable-chip--active' : ''}`}
                            onClick={() => editor.onToggleEventId(eventOption.id)}
                          >
                            {eventOption.name}
                          </button>
                        );
                      })}
                      {editor?.eventOptions.length === 0 ? <span className="estimate-editable-empty">진행중 이벤트 없음</span> : null}
                    </div>
                  </div>
                }
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
            </tr>
            <tr>
              <th>비고</th>
              <EditableCell
                field="remarkText"
                activeField={activeField}
                editor={editor}
                displayValue={fallback(data.remarkText)}
                multiline
                className="estimate-page1-preline-cell"
                colSpan={3}
                input={
                  <textarea
                    autoFocus
                    rows={4}
                    value={editor?.remarkText ?? ''}
                    onChange={(event) => editor?.onRemarkTextChange(event.target.value)}
                    className="estimate-editable-input estimate-editable-textarea"
                  />
                }
                onActivate={setActiveField}
                onDeactivate={() => setActiveField(null)}
              />
            </tr>
          </tbody>
          </table>

          <table className="estimate-table estimate-page1-table estimate-page1-table--pricing">
          <colgroup>
            <col className="estimate-page1-col-pricing-base" />
            <col className="estimate-page1-col-pricing-detail" />
          </colgroup>
          <thead>
            <tr>
              <th>기본금 (1인)</th>
              <th>추가 및 할인 사항</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="estimate-page1-price-cell estimate-page1-price-cell--base">{blankIfDash(formatCurrency(data.basePricePerPersonKrw))}</td>
              <td className="estimate-page1-price-cell estimate-page1-price-cell--details">
                {adjustmentLines.length === 0 ? (
                  <div className="estimate-page1-price-placeholder" />
                ) : (
                  adjustmentLines.map((line, index) => (
                    <div key={`adj-${index}`} className="estimate-page1-price-line">
                      <span className="estimate-page1-price-line-gutter" aria-hidden="true" />
                      <span className="estimate-page1-price-line-lead">
                        <span className="estimate-page1-price-line-label">
                          {line.teamName ? <span className="estimate-page1-price-line-team">{`${line.teamName})`}</span> : null}
                          <span>{line.label}</span>
                        </span>
                        <strong className="estimate-page1-price-line-amount">
                        {formatSignedCurrency(line.leadAmountKrw)}
                        </strong>
                      </span>
                      <span className="estimate-page1-price-line-formula">{line.formula}</span>
                    </div>
                  ))
                )}
              </td>
            </tr>
          </tbody>
          </table>

          <div className="estimate-page1-summary-block">
            <table className="estimate-table estimate-page1-table estimate-page1-table--summary">
            <thead>
              <tr>
                <th>총액 (1인)</th>
                <th>예약금 (1인)</th>
                <th>잔금 (1인)</th>
                <th>대여 물품 보증금</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="emphasis">
                  {data.teamPricings.length > 0 ? (
                    <div className="estimate-page1-summary-team-list">
                      {summaryTeamPricingsForDisplay.map((teamPricing) => (
                        <div key={`total-${teamPricing.teamOrderIndex}`} className="estimate-page1-summary-team-item">
                          <div>{`${estimateSummaryShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${blankIfDash(formatCurrency(teamPricing.totalAmountKrw))}`}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    blankIfDash(formatCurrency(data.totalPricePerPersonKrw))
                  )}
                </td>
                <td className="emphasis">
                  {data.teamPricings.length > 0 ? (
                    <div className="estimate-page1-summary-team-list">
                      {summaryTeamPricingsForDisplay.map((teamPricing) => (
                        <div key={`deposit-${teamPricing.teamOrderIndex}`} className="estimate-page1-summary-team-item">
                          <div>{`${estimateSummaryShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${blankIfDash(formatCurrency(teamPricing.depositAmountKrw))}`}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    blankIfDash(formatCurrency(data.depositPricePerPersonKrw))
                  )}
                </td>
                <td className="emphasis">
                  {data.teamPricings.length > 0 ? (
                    <div className="estimate-page1-summary-team-list">
                      {summaryTeamPricingsForDisplay.map((teamPricing) => (
                        <div key={`balance-${teamPricing.teamOrderIndex}`} className="estimate-page1-summary-team-item">
                          <div>{`${estimateSummaryShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${blankIfDash(formatCurrency(teamPricing.balanceAmountKrw))}`}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    blankIfDash(formatCurrency(data.balancePricePerPersonKrw))
                  )}
                </td>
                <td className="emphasis">
                  {data.teamPricings.length > 0 ? (
                    <div className="estimate-page1-summary-team-list">
                      {summaryTeamPricingsForDisplay.map((teamPricing) => (
                        <div key={`security-${teamPricing.teamOrderIndex}`} className="estimate-page1-summary-team-item">
                          <div>
                            {teamPricing.securityDepositScope === '-'
                              ? `${estimateSummaryShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${blankIfDash(formatCurrency(teamPricing.securityDepositAmountKrw))}`
                              : `${estimateSummaryShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${formatCurrency(teamPricing.securityDepositUnitKrw)} (${teamPricing.securityDepositScope})`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    securityDepositSummary
                  )}
                </td>
              </tr>
            </tbody>
            </table>
            <p className="estimate-page1-validity-note">
              견적서 내 금액은 모두 1인 기준 견적입니다. 해당 견적은 {formatDateKorean(data.validUntilDate)}까지 유효합니다.
            </p>
          </div>
        </div>
      </div>

      <div ref={footerRef} className="estimate-page1-payment-bar">
        <div className="estimate-page1-company-meta estimate-page1-payment-bar-meta">
          <div className="estimate-page1-company-meta-group">
            <div>
              결제 방식 예약금, 보증금 : {ESTIMATE_PAYMENT.reservationAndDepositMethod} / 잔금 : {ESTIMATE_PAYMENT.balanceMethod}{' '}
              ({ESTIMATE_PAYMENT.vatText})
            </div>
          </div>
          <div className="estimate-page1-company-meta-group estimate-page1-company-meta-group--right">
            <div>
              입금 계좌 {ESTIMATE_PAYMENT.bankAccount} {ESTIMATE_PAYMENT.bankName} {ESTIMATE_PAYMENT.bankOwner}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
