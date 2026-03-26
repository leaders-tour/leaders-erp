import {
  ESTIMATE_PAGE5_FULL_PAGE_IMAGE_SRC,
  ESTIMATE_PAGE5_HEADER_TAGLINE,
  ESTIMATE_PAGE5_HEADER_TITLE,
  ESTIMATE_PAGE5_NOTICES,
  ESTIMATE_PAGE5_TABLE_ROWS,
} from '../model/constants';

export function EstimatePage5(): JSX.Element {
  if (ESTIMATE_PAGE5_FULL_PAGE_IMAGE_SRC) {
    return (
      <section
        className="estimate-sheet estimate-sheet-page5 estimate-sheet-full-page-image"
        aria-label={ESTIMATE_PAGE5_HEADER_TITLE}
      >
        <img
          className="estimate-full-page-image"
          src={ESTIMATE_PAGE5_FULL_PAGE_IMAGE_SRC}
          alt=""
          draggable={false}
        />
      </section>
    );
  }

  return (
    <section className="estimate-sheet estimate-sheet-page5 estimate-sheet-policy">
      <header className="estimate-policy-header">
        <p className="estimate-policy-tagline">{ESTIMATE_PAGE5_HEADER_TAGLINE}</p>
        <h1 className="estimate-policy-title">{ESTIMATE_PAGE5_HEADER_TITLE}</h1>
        <div className="estimate-policy-company">
          <div>사업자 등록번호 858-09-02356</div>
          <div>네이버플레이스 리더스투어 몽골리아</div>
          <div>@leaders.mongolia</div>
          <div>카카오톡 채널 리더스투어_몽골리아</div>
        </div>
      </header>

      <table className="estimate-policy-table">
        <tbody>
          {ESTIMATE_PAGE5_TABLE_ROWS.map((row) => (
            <tr key={row.label}>
              <th>{row.label}</th>
              <td>
                {row.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </td>
            </tr>
          ))}
          <tr>
            <th>여행 안내 및 유의사항</th>
            <td>
              {ESTIMATE_PAGE5_NOTICES.map((notice) => (
                <p key={notice}>- {notice}</p>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
