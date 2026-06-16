import '../styles/confirmation-print.css';
import { EstimatePreviewScaler } from '../../estimate/components/EstimatePreviewScaler';
import {
  CONFIRMATION_COMPANY,
  CONFIRMATION_FOOTER_NOTICE,
  CONFIRMATION_TAGLINE,
  CONFIRMATION_TITLE,
} from '../model/constants';
import type { ConfirmationDocumentData } from '../utils/format';
import { fallbackText } from '../utils/format';

interface ConfirmationDocumentProps {
  data: ConfirmationDocumentData;
  viewMode?: 'screen-preview' | 'output';
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="confirmation-info-cell">
      <div className="confirmation-info-cell__label">{label}</div>
      <div className="confirmation-info-cell__value">{value}</div>
    </div>
  );
}

function ConfirmationPage({ data }: { data: ConfirmationDocumentData }) {
  return (
    <article className="confirmation-sheet">
      <header className="confirmation-sheet__header">
        <div className="confirmation-sheet__brand">
          <img src="/estimate/page1-hero-logo.png" alt="" className="confirmation-sheet__logo" />
          <div>
            <p className="confirmation-sheet__tagline">{CONFIRMATION_TAGLINE}</p>
            <h1 className="confirmation-sheet__title">{CONFIRMATION_TITLE}</h1>
          </div>
        </div>
        <div className="confirmation-sheet__company">
          <p>사업자 등록번호 {CONFIRMATION_COMPANY.businessNumber}</p>
          <p>네이버플레이스 {CONFIRMATION_COMPANY.naverPlace}</p>
          <p>{CONFIRMATION_COMPANY.instagram} · 카카오톡 {CONFIRMATION_COMPANY.kakaoChannel}</p>
        </div>
      </header>

      <section className="confirmation-sheet__grid">
        <InfoCell label="대표자명" value={fallbackText(data.leaderName)} />
        <InfoCell label="문서번호" value={fallbackText(data.documentNumber)} />
        <InfoCell label="여행지" value={fallbackText(data.destination)} />
        <InfoCell label="인원" value={fallbackText(data.headcountText)} />
        <InfoCell label="여행 기간" value={fallbackText(data.travelPeriodText)} />
        <InfoCell label="차량" value={fallbackText(data.vehicleType)} />
        <InfoCell label="항공권 IN" value={fallbackText(data.flightInText)} />
        <InfoCell label="항공권 OUT" value={fallbackText(data.flightOutText)} />
        <InfoCell label="픽업" value={fallbackText(data.pickupText)} />
        <InfoCell label="드랍" value={fallbackText(data.dropText)} />
        <InfoCell label="실투어 외 픽드랍" value={fallbackText(data.externalPickupDropText)} />
        <InfoCell label="특이사항" value={fallbackText(data.specialNote)} />
      </section>

      <section className="confirmation-sheet__grid confirmation-sheet__grid--compact">
        <InfoCell label="기본 대여물품" value={fallbackText(data.rentalItemsText)} />
        <InfoCell label="참여 이벤트" value={fallbackText(data.eventNames)} />
        <InfoCell label="비고" value={fallbackText(data.remark)} />
      </section>

      <section className="confirmation-sheet__grid confirmation-sheet__grid--compact">
        <InfoCell label="잔금(1인)" value={fallbackText(data.balancePerPersonText)} />
        <InfoCell label="가이드님" value={fallbackText(data.guideName)} />
        <InfoCell label="미팅장소" value={fallbackText(data.meetingPlace)} />
      </section>

      <section className="confirmation-sheet__detail-block">
        <h2 className="confirmation-sheet__detail-title">여행객 명단 (특이사항)</h2>
        <pre className="confirmation-sheet__detail-text">{fallbackText(data.travelersText)}</pre>
      </section>

      <section className="confirmation-sheet__detail-block">
        <h2 className="confirmation-sheet__detail-title">숙소</h2>
        <pre className="confirmation-sheet__detail-text">{fallbackText(data.accommodationText)}</pre>
      </section>

      <footer className="confirmation-sheet__footer">{CONFIRMATION_FOOTER_NOTICE}</footer>
    </article>
  );
}

export function ConfirmationDocument({ data, viewMode = 'screen-preview' }: ConfirmationDocumentProps) {
  const className =
    viewMode === 'output'
      ? 'confirmation-document confirmation-document--output'
      : 'confirmation-document confirmation-document--preview';

  return (
    <div className={className}>
      {viewMode === 'screen-preview' ? (
        <EstimatePreviewScaler>
          <ConfirmationPage data={data} />
        </EstimatePreviewScaler>
      ) : (
        <ConfirmationPage data={data} />
      )}
    </div>
  );
}
