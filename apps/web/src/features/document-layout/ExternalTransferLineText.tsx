/** 실투어 외 픽드랍: 팀별 `\n` 구분, `>` 구간은 nowrap. 좁은 셀에서는 `>` 앞뒤로만 줄바꿈 */
export function ExternalTransferLineText({ value }: { value: string }): JSX.Element {
  if (value === '-') {
    return <>-</>;
  }

  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return <>-</>;
  }

  return (
    <>
      {lines.map((line, lineIndex) => {
        const segments = line
          .split(/\s*>\s*/)
          .map((segment) => segment.trim())
          .filter(Boolean);

        return (
          <span key={`external-transfer-line-${lineIndex}`} className="document-external-transfer-line">
            {segments.map((segment, segmentIndex) => (
              <span key={`external-transfer-segment-${lineIndex}-${segmentIndex}`} className="document-external-transfer-chunk">
                {segmentIndex > 0 ? (
                  <span className="document-external-transfer-separator" aria-hidden="true">
                    {' > '}
                  </span>
                ) : null}
                <span className="document-external-transfer-segment">{segment}</span>
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}
