import type { CSSProperties } from 'react';
import type { EstimateDocumentData, EstimateGuideBlock } from '../model/types';

interface EstimatePage3Props {
  data: EstimateDocumentData;
}

function fallback(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

function hasImages(block: EstimateGuideBlock): boolean {
  return Array.isArray(block.imageUrls) && block.imageUrls.length > 0;
}

export function EstimatePage3({ data }: EstimatePage3Props): JSX.Element {
  const blocks = data.page3Blocks;
  const rowCount = Math.max(blocks.length, 1);
  const listStyle = {
    '--guide-row-count': String(rowCount),
  } as CSSProperties;

  return (
    <section className="estimate-sheet estimate-sheet-page3 estimate-sheet-guides">
      <h1 className="estimate-guides-title">{fallback(data.page3Title)}</h1>

      <div className="estimate-guide-list" style={listStyle}>
        {blocks.length === 0 ? <p className="estimate-guide-empty">안내사항이 없습니다.</p> : null}

        {blocks.map((block, index) => {
          const blockHasImages = hasImages(block);
          const reverseClass = blockHasImages && index % 2 === 1 ? ' estimate-guide-item--reverse' : '';
          const textOnlyClass = !blockHasImages ? ' estimate-guide-item--text-only' : '';

          return (
            <article className={`estimate-guide-item${reverseClass}${textOnlyClass}`} key={`${block.locationId}-${index + 1}`}>
              <div className="estimate-guide-text">
                <h2 className="estimate-guide-location">{fallback(block.locationName)}</h2>
                <p className="estimate-guide-description">{fallback(block.description)}</p>
              </div>

              {blockHasImages ? (
                <div className="estimate-guide-images">
                  {block.imageUrls.map((imageUrl, imageIndex) => (
                    <img
                      key={`${block.locationId}-image-${imageIndex + 1}`}
                      className="estimate-guide-image"
                      src={imageUrl}
                      alt={`${fallback(block.locationName)} 안내 이미지 ${imageIndex + 1}`}
                    />
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
