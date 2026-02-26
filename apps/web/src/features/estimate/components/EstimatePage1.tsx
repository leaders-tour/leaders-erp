import { ESTIMATE_COMPANY, ESTIMATE_PAYMENT, ESTIMATE_TAGLINE, ESTIMATE_TITLE } from '../model/constants';
import type { EstimateDocumentData } from '../model/types';
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
}

function fallback(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

export function EstimatePage1({ data }: EstimatePage1Props): JSX.Element {
  const adjustmentLines = data.adjustmentLines;
  const securityDepositSummary =
    data.securityDepositUnitKrw === null
      ? '-'
      : `${formatCurrency(data.securityDepositUnitKrw)} (${data.securityDepositScope})`;

  return (
    <section className="estimate-sheet">
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
            <td>{formatTravelPeriod(data.travelStartDate, data.travelEndDate)}</td>
            <th>차량</th>
            <td>{fallback(data.vehicleType)}</td>
          </tr>
          <tr>
            <th>항공권 IN</th>
            <td>{formatFlightText(data.flightInDate, data.flightInTime)}</td>
            <th>항공권 OUT</th>
            <td>{formatFlightText(data.flightOutDate, data.flightOutTime)}</td>
          </tr>
          <tr>
            <th>픽업</th>
            <td className="pre-line">{fallback(data.pickupText)}</td>
            <th>드랍</th>
            <td className="pre-line">{fallback(data.dropText)}</td>
          </tr>
          <tr>
            <th>실투어 외 픽드랍</th>
            <td className="pre-line">{fallback(data.externalPickupDropText)}</td>
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
            <td className="pre-line">{fallback(data.rentalItemsText)}</td>
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
              {fallback(data.remarkText)}
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
