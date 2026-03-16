import { useState, type FocusEvent, type ReactNode } from 'react';
import { PICKUP_DROP_PLACE_OPTIONS, formatPickupDropDisplay, type PickupDropPlaceType } from '../../plan/pickup-drop';
import { ESTIMATE_COMPANY, ESTIMATE_PAYMENT, ESTIMATE_TAGLINE, ESTIMATE_TITLE } from '../model/constants';
import type { EstimateDocumentData, EstimatePage1EditableField, EstimatePage1Editor, EstimateTransportGroup } from '../model/types';
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

const FLIGHT_IN_TIME_OPTIONS = ['00:00', '00:50', '02:45', '04:00', '04:30', '05:00'] as const;
const FLIGHT_OUT_TIME_OPTIONS = ['00:25', '01:55', '02:05', '11:00', '14:50', '18:15', '20:30'] as const;
const PICKUP_DROP_TIME_OPTIONS = ['04:00', '05:00', '08:00', '15:30', '19:00', '21:00', '23:00'] as const;

interface EstimatePage1Props {
  data: EstimateDocumentData;
  editor?: EstimatePage1Editor;
}

function fallback(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
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

function TransportGroupEditor({ groups, mode, onFieldChange, onAdd, onRemove }: TransportGroupEditorProps): JSX.Element {
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
            <div className="mb-2 grid gap-2 md:grid-cols-[1fr_100px_auto]">
              <input
                autoFocus={index === 0}
                type="text"
                value={group.teamName}
                onChange={(event) => onFieldChange(index, 'teamName', event.target.value)}
                placeholder="팀명"
                className="estimate-editable-input"
              />
              <input
                type="number"
                min={1}
                value={group.headcount}
                onChange={(event) => onFieldChange(index, 'headcount', Math.max(1, Number(event.target.value) || 1))}
                placeholder="인원"
                className="estimate-editable-input"
              />
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

export function EstimatePage1({ data, editor }: EstimatePage1Props): JSX.Element {
  const adjustmentLines = data.adjustmentLines;
  const [activeField, setActiveField] = useState<EstimatePage1EditableField | null>(null);
  const securityDepositSummary =
    data.securityDepositUnitKrw === null
      ? '-'
      : `${formatCurrency(data.securityDepositUnitKrw)} (${data.securityDepositScope})`;

  return (
    <section className="estimate-sheet estimate-sheet-page1">
      <p className="estimate-tagline">{ESTIMATE_TAGLINE}</p>
      <h1 className="estimate-title">{ESTIMATE_TITLE}</h1>

      <div className="estimate-company-grid">
        <div>사업자 등록번호: {ESTIMATE_COMPANY.businessNumber}</div>
        <div>인스타그램: {ESTIMATE_COMPANY.instagram}</div>
        <div>네이버플레이스: {ESTIMATE_COMPANY.naverPlace}</div>
        <div>카카오톡 채널: {ESTIMATE_COMPANY.kakaoChannel}</div>
      </div>

      <hr className="estimate-divider" />

      <h2 className="estimate-section-title">1) 기본 정보</h2>
      <table className="estimate-table">
        <tbody>
          <tr>
            <th>대표자명</th>
            <td>{fallback(data.leaderName)}</td>
            <th>문서번호</th>
            <td>{data.documentNumber ?? '미발급(저장 후 자동 생성)'}</td>
          </tr>
          <tr>
            <th>여행지</th>
            <td>{fallback(data.destinationName)}</td>
            <th>인원</th>
            <EditableCell
              field="headcount"
              activeField={activeField}
              editor={editor}
              displayValue={formatHeadcount(data.headcountTotal, data.headcountMale, data.headcountFemale)}
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
          <tr>
            <th>여행 기간</th>
            <EditableCell
              field="travelPeriod"
              activeField={activeField}
              editor={editor}
              displayValue={formatTravelPeriod(data.travelStartDate, data.travelEndDate)}
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
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
            <th>차량</th>
            <EditableCell
              field="vehicleType"
              activeField={activeField}
              editor={editor}
              displayValue={fallback(data.vehicleType)}
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
          <tr>
            <th>항공권 IN</th>
            <EditableCell
              field="flightInTime"
              activeField={activeField}
              editor={editor}
              displayValue={
                <span className="whitespace-pre-wrap">
                  {data.transportGroups.length > 0
                    ? formatTransportFlightText(data.transportGroups, 'IN')
                    : formatFlightText(data.flightInDate, data.flightInTime)}
                </span>
              }
              multiline
              input={
                <TransportGroupEditor
                  groups={editor?.transportGroups ?? []}
                  mode="flightIn"
                  onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                  onAdd={() => editor?.onAddTransportGroup()}
                  onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                />
              }
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
            <th>항공권 OUT</th>
            <EditableCell
              field="flightOutTime"
              activeField={activeField}
              editor={editor}
              displayValue={
                <span className="whitespace-pre-wrap">
                  {data.transportGroups.length > 0
                    ? formatTransportFlightText(data.transportGroups, 'OUT')
                    : formatFlightText(data.flightOutDate, data.flightOutTime)}
                </span>
              }
              multiline
              input={
                <TransportGroupEditor
                  groups={editor?.transportGroups ?? []}
                  mode="flightOut"
                  onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                  onAdd={() => editor?.onAddTransportGroup()}
                  onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                />
              }
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
          </tr>
          <tr>
            <th>픽업</th>
            <EditableCell
              field="pickupDate"
              activeField={activeField}
              editor={editor}
              displayValue={
                <span className="whitespace-pre-wrap">
                  {data.transportGroups.length > 0
                    ? formatTransportPickupDropText(data.transportGroups, 'pickup')
                    : formatPickupDropDisplay(
                        data.pickupDate,
                        data.pickupTime,
                        data.pickupPlaceType,
                        data.pickupPlaceCustomText,
                      )}
                </span>
              }
              multiline
              input={
                <TransportGroupEditor
                  groups={editor?.transportGroups ?? []}
                  mode="pickup"
                  onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                  onAdd={() => editor?.onAddTransportGroup()}
                  onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                />
              }
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
            <th>드랍</th>
            <EditableCell
              field="dropDate"
              activeField={activeField}
              editor={editor}
              displayValue={
                <span className="whitespace-pre-wrap">
                  {data.transportGroups.length > 0
                    ? formatTransportPickupDropText(data.transportGroups, 'drop')
                    : formatPickupDropDisplay(
                        data.dropDate,
                        data.dropTime,
                        data.dropPlaceType,
                        data.dropPlaceCustomText,
                      )}
                </span>
              }
              multiline
              input={
                <TransportGroupEditor
                  groups={editor?.transportGroups ?? []}
                  mode="drop"
                  onFieldChange={(index, field, value) => editor?.onTransportGroupFieldChange(index, field, value)}
                  onAdd={() => editor?.onAddTransportGroup()}
                  onRemove={(index) => editor?.onRemoveTransportGroup(index)}
                />
              }
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
          </tr>
          <tr>
            <th>실투어 외 픽업</th>
            <td className="whitespace-pre-wrap">{fallback(data.externalPickupText)}</td>
            <th>실투어 외 드랍</th>
            <td className="whitespace-pre-wrap">{fallback(data.externalDropText)}</td>
          </tr>
          <tr>
            <th>특이사항</th>
            <EditableCell
              field="specialNoteText"
              activeField={activeField}
              editor={editor}
              displayValue={fallback(data.specialNoteText)}
              multiline
              className="pre-line"
              colSpan={3}
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
      </table>

      <h2 className="estimate-section-title">2) 제공 / 준비 항목</h2>
      <table className="estimate-table">
        <tbody>
          <tr>
            <th>기본 대여물품</th>
            <EditableCell
              field="rentalItemsText"
              activeField={activeField}
              editor={editor}
              displayValue={fallback(data.rentalItemsText)}
              multiline
              className="pre-line"
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
              className="pre-line"
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
        </tbody>
      </table>

      <h2 className="estimate-section-title">3) 비고</h2>
      <table className="estimate-table">
        <tbody>
          <tr>
            <th>비고</th>
            <td className="pre-line" colSpan={3}>
              {editor ? (
                activeField === 'remarkText' ? (
                  <div
                    className="estimate-editable-shell estimate-editable-shell--active"
                    onBlurCapture={(event: FocusEvent<HTMLDivElement>) => {
                      const nextTarget = event.relatedTarget;
                      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                        return;
                      }
                      setActiveField(null);
                    }}
                  >
                    <textarea
                      autoFocus
                      rows={4}
                      value={editor.remarkText}
                      onChange={(event) => editor.onRemarkTextChange(event.target.value)}
                      className="estimate-editable-input estimate-editable-textarea"
                    />
                  </div>
                ) : (
                  <button type="button" className="estimate-editable-trigger" onClick={() => setActiveField('remarkText')}>
                    <span className="estimate-editable-content estimate-editable-content--multiline">{fallback(data.remarkText)}</span>
                  </button>
                )
              ) : (
                fallback(data.remarkText)
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="estimate-section-title">4) 가격 상세</h2>
      <p className="estimate-subtitle">기본금 / 추가 및 할인 사항</p>
      <table className="estimate-table estimate-table-pricing">
        <thead>
          <tr>
            <th>기본금 (1인)</th>
            <th>추가 및 할인 사항</th>
            <th>계산 기준</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="align-top text-right emphasis">{formatCurrency(data.basePricePerPersonKrw)}</td>
            <td className="align-top">
              {adjustmentLines.length === 0 ? (
                <div>-</div>
              ) : (
                adjustmentLines.map((line, index) => (
                  <div key={`adj-${index}`}>
                    {line.label} <strong>{formatSignedCurrency(line.amountKrw)}</strong>
                  </div>
                ))
              )}
            </td>
            <td className="align-top">
              {adjustmentLines.length === 0 ? (
                <div>-</div>
              ) : (
                adjustmentLines.map((line, index) => <div key={`basis-${index}`}>{line.formula}</div>)
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="estimate-section-title">5) 결제 요약</h2>
      <table className="estimate-table estimate-table-summary">
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
            <td className="text-right emphasis">{formatCurrency(data.totalPricePerPersonKrw)}</td>
            <td className="text-right emphasis">{formatCurrency(data.depositPricePerPersonKrw)}</td>
            <td className="text-right emphasis">{formatCurrency(data.balancePricePerPersonKrw)}</td>
            <td className="text-right emphasis">{securityDepositSummary}</td>
          </tr>
        </tbody>
      </table>

      <div className="estimate-footer-meta">
        <p className="estimate-single-line-note">
          견적서 내 금액은 모두 1인 기준 견적입니다. 해당 견적은 {formatDateKorean(data.validUntilDate)}까지 유효합니다.
        </p>

        <p className="estimate-payment-line">
          [결제 방식] 예약금, 보증금 : {ESTIMATE_PAYMENT.reservationAndDepositMethod} / 잔금 : {ESTIMATE_PAYMENT.balanceMethod} [
          {ESTIMATE_PAYMENT.vatText}]
        </p>
        <p className="estimate-payment-line">
          [입금 계좌] {ESTIMATE_PAYMENT.bankAccount} {ESTIMATE_PAYMENT.bankName} {ESTIMATE_PAYMENT.bankOwner}
        </p>
      </div>
    </section>
  );
}
