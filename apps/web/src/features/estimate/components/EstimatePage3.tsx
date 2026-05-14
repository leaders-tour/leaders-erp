import type { EstimateGuideBlock } from '../model/types';

interface EstimatePage3Props {
  blocks: EstimateGuideBlock[];
}

export function EstimatePage3({ blocks }: EstimatePage3Props): JSX.Element {
  return (
    <section className="estimate-sheet estimate-sheet-page3 estimate-sheet-guides estimate-sheet-guides--template estimate-sheet-guides--flush">
      <div className="estimate-guide-template-list">
        {blocks.length === 0
          ? null
          : blocks.map((block, index) => {
              const url = block.imageUrls[0];
              return (
                <div className="estimate-guide-template-item" key={`${block.locationId}-${index + 1}`}>
                  {url ? (
                    <img
                      className="estimate-guide-template-image"
                      src={url}
                      alt=""
                      role="presentation"
                    />
                  ) : null}
                </div>
              );
            })}
      </div>
    </section>
  );
}
