import {
  ESTIMATE_PAGE4_BRAND,
  ESTIMATE_PAGE4_FOOTNOTE,
  ESTIMATE_PAGE4_LEVELS,
  ESTIMATE_PAGE4_TITLE,
} from '../model/constants';

export function EstimatePage4(): JSX.Element {
  return (
    <section className="estimate-sheet estimate-sheet-page4 estimate-sheet-intensity">
      <header className="estimate-intensity-header">
        <p className="estimate-intensity-brand">{ESTIMATE_PAGE4_BRAND}</p>
        <h1 className="estimate-intensity-title">{ESTIMATE_PAGE4_TITLE}</h1>
      </header>

      <div className="estimate-intensity-board">
        {ESTIMATE_PAGE4_LEVELS.map((level) => (
          <article className="estimate-intensity-row" key={level.title}>
            <div className="estimate-intensity-main">
              <div className="estimate-intensity-row-title">
                <span className="estimate-intensity-dot" style={{ backgroundColor: level.color }} />
                <h2>{level.title}</h2>
              </div>
              <ul>
                {level.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="estimate-intensity-summary">{level.summary}</p>
            </div>

            <div className="estimate-intensity-recommend">
              <h3>이런 분께 추천드립니다</h3>
              <ul>
                {level.recommend.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <p className="estimate-intensity-footnote">{ESTIMATE_PAGE4_FOOTNOTE}</p>
    </section>
  );
}
