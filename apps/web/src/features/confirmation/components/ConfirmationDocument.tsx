import { useRef } from 'react';
import '../styles/confirmation-print.css';
import { ExternalTransferLineText } from '../../document-layout/ExternalTransferLineText';
import { usePage1FitScale } from '../../document-layout/use-page1-fit-scale';
import { EstimatePreviewScaler } from '../../estimate/components/EstimatePreviewScaler';
import type { EstimateDocumentData, EstimatePage2Editor } from '../../estimate/model/types';
import type { MovementIntensityColorSetting } from '../../estimate/model/movement-intensity';
import {
  CONFIRMATION_COMPANY,
  CONFIRMATION_FOOTER_NOTICE,
  CONFIRMATION_TAGLINE,
  CONFIRMATION_TITLE,
} from '../model/constants';
import type { ConfirmationTraveler } from '../model/types';
import type { ConfirmationDocumentData } from '../utils/format';
import { fallbackText } from '../utils/format';
import { confirmationTravelerDisplayParts, resolveVehicleDisplayNote, splitConfirmationAccommodationDisplay } from '@tour/validation';
import { ConfirmationAppendixPages } from './ConfirmationAppendixPages';

interface ConfirmationDocumentProps {
  data: ConfirmationDocumentData;
  /** 견적 버전 기준 2~4페이지(일정표·안내·이동강도) 데이터 */
  appendixData?: EstimateDocumentData | null;
  appendixMovementIntensityColors?: readonly MovementIntensityColorSetting[] | null;
  appendixPage2Editor?: EstimatePage2Editor;
  /** false면 부록 Page2 일정표만 렌더 (홈 최신 미리보기 등) */
  appendixIncludeImagePages?: boolean;
  viewMode?: 'screen-preview' | 'output';
  onPage1LayoutReady?: () => void;
  /** screen-preview에서 미리보기 스케일 기준 너비 */
  previewBaseWidth?: number;
  /** screen-preview에서 컨테이너보다 넓을 때 확대 허용 */
  previewAllowUpscale?: boolean;
}

function blankIfDash(value: string): string {
  return value === '-' ? '' : value;
}

function VehicleTypeCellDisplay({
  vehicleType,
  vehicleDisplayNote,
}: {
  vehicleType: string | null | undefined;
  vehicleDisplayNote?: string | null;
}): JSX.Element {
  const main = fallbackText(vehicleType);
  const note =
    vehicleDisplayNote?.trim() || resolveVehicleDisplayNote(vehicleType, null)?.trim() || '';
  if (main === '-' && !note) {
    return <>-</>;
  }
  if (!note) {
    return <span className="whitespace-pre-wrap">{main}</span>;
  }
  return (
    <span className="confirmation-vehicle-note">
      {main !== '-' ? (
        <span className="confirmation-vehicle-note__main whitespace-pre-wrap">{main}</span>
      ) : null}
      <span className="confirmation-vehicle-note__sub whitespace-pre-wrap">{note}</span>
    </span>
  );
}

function EventNamesText({ value }: { value: string }): JSX.Element {
  const items = value
    .split(/\n|\s+\/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <>
      {items.map((item, index) => (
        <span key={`event-${index}`} className="confirmation-comma-break-line">
          {item}
        </span>
      ))}
    </>
  );
}

function CommaBreakText({ value }: { value: string }): JSX.Element {
  const lines = value.split('\n');

  return (
    <>
      {lines.map((line, lineIndex) => {
        const parts = line.split(',');

        return (
          <span key={`comma-line-${lineIndex}`} className="confirmation-comma-break-line">
            {parts.map((part, partIndex) => {
              const isLast = partIndex === parts.length - 1;
              const text = part.trim();

              if (!text) {
                return null;
              }

              return (
                <span key={`comma-part-${lineIndex}-${partIndex}`} className="confirmation-comma-break-item">
                  {text}
                  {isLast ? null : ','}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

function formatTravelPeriodCompact(value: string): string {
  if (value === '-') {
    return '';
  }

  const firstParenIndex = value.indexOf(' (');
  if (firstParenIndex < 0) {
    return value;
  }

  return `${value.slice(0, firstParenIndex)}\n${value.slice(firstParenIndex + 1)}`;
}

function ConfirmationPage1LogoMark(): JSX.Element {
  return (
    <img
      className="confirmation-page1-logo-mark"
      src="/estimate/page1-hero-logo.png"
      alt="Leaders Tour"
      width={220}
      height={92}
      decoding="async"
    />
  );
}

function ConfirmationTravelerList({ travelers }: { travelers: ConfirmationTraveler[] }): JSX.Element {
  const entries = travelers
    .map((traveler) => confirmationTravelerDisplayParts(traveler))
    .filter((entry) => entry.core.length > 0);

  if (entries.length === 0) {
    return <span className="confirmation-page1-detail-empty">-</span>;
  }

  return (
    <ul className="confirmation-page1-detail-list">
      {entries.map((entry, index) => (
        <li key={`traveler-${index}`} className="confirmation-page1-detail-entry">
          <span className="confirmation-page1-traveler-core whitespace-pre-wrap">{entry.core}</span>
        </li>
      ))}
    </ul>
  );
}

function ConfirmationAccommodationList({ lines }: { lines: string[] }): JSX.Element {
  const entries = lines
    .map((line) => splitConfirmationAccommodationDisplay(line))
    .filter((entry) => entry.name.length > 0);

  if (entries.length === 0) {
    return <span className="confirmation-page1-detail-empty">-</span>;
  }

  return (
    <ol className="confirmation-page1-detail-list confirmation-page1-detail-list--numbered">
      {entries.map((entry, index) => (
        <li key={`accommodation-${index}`} className="confirmation-page1-detail-entry">
          <span className="confirmation-page1-accommodation-line">
            <span className="confirmation-page1-accommodation-lead whitespace-pre-wrap">
              {index + 1}. {entry.name}
            </span>
            {entry.spec ? (
              <>
                {' '}
                <span className="confirmation-page1-accommodation-spec-inline whitespace-pre-wrap">
                  {entry.spec}
                </span>
              </>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ConfirmationPage({
  data,
  onLayoutReady,
}: {
  data: ConfirmationDocumentData;
  onLayoutReady?: () => void;
}) {
  const pageRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const bodyShellRef = useRef<HTMLDivElement | null>(null);
  const bodyFitRef = useRef<HTMLDivElement | null>(null);
  const travelPeriodCompact = formatTravelPeriodCompact(fallbackText(data.travelPeriodText));
  const rentalItemsText = fallbackText(data.rentalItemsText);
  const eventNamesText = fallbackText(data.eventNames);

  usePage1FitScale({
    pageRef,
    heroRef,
    bodyShellRef,
    bodyFitRef,
    fitScaleCssVar: '--confirmation-page1-fit-scale',
    layoutReadyDataAttr: 'data-confirmation-page1-layout-ready',
    onLayoutReady,
    deps: [data, onLayoutReady],
  });

  return (
    <section ref={pageRef} className="confirmation-sheet confirmation-sheet-page1">
      <header ref={heroRef} className="confirmation-page1-hero">
        <div className="confirmation-page1-hero-copy">
          <div className="confirmation-page1-hero-title-row">
            <div className="confirmation-page1-hero-headline">
              <p className="confirmation-page1-tagline">{CONFIRMATION_TAGLINE}</p>
              <h1 className="confirmation-page1-title">{CONFIRMATION_TITLE}</h1>
            </div>
            <div className="confirmation-page1-hero-brand">
              <ConfirmationPage1LogoMark />
            </div>
          </div>

          <div className="confirmation-page1-company-meta">
            <div className="confirmation-page1-company-meta-group">
              <div>사업자 등록번호 {CONFIRMATION_COMPANY.businessNumber}</div>
              <div>네이버플레이스 {CONFIRMATION_COMPANY.naverPlace}</div>
            </div>
            <div className="confirmation-page1-company-meta-group confirmation-page1-company-meta-group--right">
              <div>@ {CONFIRMATION_COMPANY.instagram.replace(/^@/, '')}</div>
              <div>카카오톡 채널 {CONFIRMATION_COMPANY.kakaoChannel}</div>
            </div>
          </div>
        </div>
      </header>

      <div ref={bodyShellRef} className="confirmation-page1-body-shell">
        <div ref={bodyFitRef} className="confirmation-page1-body">
          <table className="confirmation-table confirmation-page1-table confirmation-page1-table--main">
            <colgroup>
              <col className="confirmation-page1-col-4-label" />
              <col className="confirmation-page1-col-4-value" />
              <col className="confirmation-page1-col-4-label" />
              <col className="confirmation-page1-col-4-value" />
            </colgroup>
            <tbody className="confirmation-page1-tbody--basic">
              <tr className="confirmation-page1-tr--even-height">
                <th>대표자명</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.leaderName))}</span>
                </td>
                <th>문서번호</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.documentNumber))}</span>
                </td>
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>여행지</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.destination))}</span>
                </td>
                <th>인원</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.headcountText))}</span>
                </td>
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>여행 기간</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{travelPeriodCompact}</span>
                </td>
                <th>차량</th>
                <td className="confirmation-page1-preline-cell">
                  <VehicleTypeCellDisplay
                    vehicleType={data.vehicleType}
                    vehicleDisplayNote={data.vehicleDisplayNote}
                  />
                </td>
              </tr>
            </tbody>
            <tbody className="confirmation-page1-tbody--logistics">
              <tr className="confirmation-page1-tr--tbody-gap" aria-hidden="true">
                <td colSpan={4} />
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>항공권 IN</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.flightInText))}</span>
                </td>
                <th>항공권 OUT</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.flightOutText))}</span>
                </td>
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>픽업</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.pickupText))}</span>
                </td>
                <th>드랍</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.dropText))}</span>
                </td>
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>실투어 외 픽드랍</th>
                <td className="confirmation-page1-preline-cell">
                  <ExternalTransferLineText value={fallbackText(data.externalPickupDropText)} />
                </td>
                <th>특이사항</th>
                <td className="confirmation-page1-preline-cell">{fallbackText(data.specialNote)}</td>
              </tr>
            </tbody>
            <tbody className="confirmation-page1-tbody--extras">
              <tr className="confirmation-page1-tr--tbody-gap" aria-hidden="true">
                <td colSpan={4} />
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>기본 대여물품</th>
                <td className="confirmation-page1-preline-cell">
                  <CommaBreakText value={rentalItemsText} />
                </td>
                <th>참여 이벤트</th>
                <td className="confirmation-page1-preline-cell confirmation-page1-event-cell">
                  <EventNamesText value={eventNamesText} />
                </td>
              </tr>
              <tr>
                <th>비고</th>
                <td className="confirmation-page1-preline-cell" colSpan={3}>
                  {fallbackText(data.remark)}
                </td>
              </tr>
            </tbody>
            <tbody className="confirmation-page1-tbody--closing">
              <tr className="confirmation-page1-tr--tbody-gap" aria-hidden="true">
                <td colSpan={4} />
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>잔금(1인)</th>
                <td className="confirmation-page1-preline-cell" colSpan={3}>
                  {blankIfDash(fallbackText(data.balancePerPersonText))}
                </td>
              </tr>
              <tr className="confirmation-page1-tr--even-height">
                <th>가이드님</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.guideName))}</span>
                </td>
                <th>미팅장소</th>
                <td className="confirmation-page1-preline-cell">
                  <span className="whitespace-pre-wrap">{blankIfDash(fallbackText(data.meetingPlace))}</span>
                </td>
              </tr>
              <tr className="confirmation-page1-tr--detail-row">
                <th className="confirmation-page1-detail-label">여행객 명단</th>
                <td className="confirmation-page1-detail-cell">
                  <ConfirmationTravelerList travelers={data.travelers} />
                </td>
                <th className="confirmation-page1-detail-label">숙소</th>
                <td className="confirmation-page1-detail-cell">
                  <ConfirmationAccommodationList lines={data.accommodationLines} />
                </td>
              </tr>
            </tbody>
          </table>

          <p className="confirmation-page1-notice">{CONFIRMATION_FOOTER_NOTICE}</p>
        </div>
      </div>
    </section>
  );
}

export function ConfirmationDocument({
  data,
  appendixData,
  appendixMovementIntensityColors,
  appendixPage2Editor,
  appendixIncludeImagePages,
  viewMode = 'screen-preview',
  onPage1LayoutReady,
  previewBaseWidth,
  previewAllowUpscale,
}: ConfirmationDocumentProps) {
  const className =
    viewMode === 'output'
      ? 'confirmation-document confirmation-document--output'
      : 'confirmation-document confirmation-document--preview';

  const pages = (
    <div className={viewMode === 'screen-preview' ? 'confirmation-document-pages' : undefined}>
      <div className={viewMode === 'output' ? 'confirmation-page-break confirmation-page-break--first' : undefined}>
        <ConfirmationPage data={data} onLayoutReady={onPage1LayoutReady} />
      </div>
      {appendixData ? (
        <ConfirmationAppendixPages
          data={appendixData}
          viewMode={viewMode}
          movementIntensityColors={appendixMovementIntensityColors}
          page2Editor={appendixPage2Editor}
          includeImagePages={appendixIncludeImagePages}
        />
      ) : null}
    </div>
  );

  return (
    <div className={className}>
      {viewMode === 'screen-preview' ? (
        <EstimatePreviewScaler baseWidth={previewBaseWidth} allowUpscale={previewAllowUpscale}>
          {pages}
        </EstimatePreviewScaler>
      ) : (
        pages
      )}
    </div>
  );
}
