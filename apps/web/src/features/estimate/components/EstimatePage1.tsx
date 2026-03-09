import { useState, type FocusEvent, type ReactNode } from 'react';
import { ESTIMATE_COMPANY, ESTIMATE_PAYMENT, ESTIMATE_TAGLINE, ESTIMATE_TITLE } from '../model/constants';
import type { EstimateDocumentData, EstimatePage1EditableField, EstimatePage1Editor } from '../model/types';
import {
  formatCurrency,
  formatDateKorean,
  formatFlightText,
  formatHeadcount,
  formatSignedCurrency,
  formatTravelPeriod,
} from '../utils/format';

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
  multiline = false,
  className,
  contentClassName,
  onActivate,
  onDeactivate,
}: EditableCellProps): JSX.Element {
  if (!editor) {
    return <td className={className}>{displayValue}</td>;
  }

  const isActive = activeField === field;

  if (isActive) {
    return (
      <td className={className}>
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
    <td className={className}>
      <button type="button" className="estimate-editable-trigger" onClick={() => onActivate(field)}>
        <span className={`estimate-editable-content ${multiline ? 'estimate-editable-content--multiline' : ''} ${contentClassName ?? ''}`}>
          {displayValue}
        </span>
      </button>
    </td>
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
      {data.isDraft ? <div className="estimate-draft-badge">임시본 (저장 전 출력)</div> : null}

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
            <td>{formatHeadcount(data.headcountTotal, data.headcountMale, data.headcountFemale)}</td>
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
              displayValue={formatFlightText(data.flightInDate, data.flightInTime)}
              input={
                <input
                  autoFocus
                  type="text"
                  value={editor?.flightInTime ?? ''}
                  onChange={(event) => editor?.onFlightInTimeChange(event.target.value)}
                  className="estimate-editable-input"
                  placeholder="예: 10:25"
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
              displayValue={formatFlightText(data.flightOutDate, data.flightOutTime)}
              input={
                <input
                  autoFocus
                  type="text"
                  value={editor?.flightOutTime ?? ''}
                  onChange={(event) => editor?.onFlightOutTimeChange(event.target.value)}
                  className="estimate-editable-input"
                  placeholder="예: 18:20"
                />
              }
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
          </tr>
          <tr>
            <th>픽업</th>
            <EditableCell
              field="pickupText"
              activeField={activeField}
              editor={editor}
              displayValue={fallback(data.pickupText)}
              multiline
              className="pre-line"
              input={
                <textarea
                  autoFocus
                  rows={3}
                  value={editor?.pickupText ?? ''}
                  onChange={(event) => editor?.onPickupTextChange(event.target.value)}
                  className="estimate-editable-input estimate-editable-textarea"
                />
              }
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
            <th>드랍</th>
            <td className="pre-line">{fallback(data.dropText)}</td>
          </tr>
          <tr>
            <th>실투어 외 픽드랍</th>
            <EditableCell
              field="externalPickupDropText"
              activeField={activeField}
              editor={editor}
              displayValue={fallback(data.externalPickupDropText)}
              multiline
              className="pre-line"
              input={
                <textarea
                  autoFocus
                  rows={3}
                  value={editor?.externalPickupDropText ?? ''}
                  onChange={(event) => editor?.onExternalPickupDropTextChange(event.target.value)}
                  className="estimate-editable-input estimate-editable-textarea"
                />
              }
              onActivate={setActiveField}
              onDeactivate={() => setActiveField(null)}
            />
            <th>특이사항</th>
            <td className="pre-line">{fallback(data.specialNoteText)}</td>
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
            <td className="pre-line">{fallback(data.eventText)}</td>
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
