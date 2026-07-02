import { splitTextIntoLinkifySegments } from '../lib/linkify-text';

type LinkifiedTextProps = {
  text: string;
};

export function LinkifiedText({ text }: LinkifiedTextProps): JSX.Element {
  const segments = splitTextIntoLinkifySegments(text);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <a
              key={`link-${index}-${segment.value}`}
              href={segment.value}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-blue-600 underline hover:text-blue-800"
            >
              {segment.value}
            </a>
          );
        }

        return <span key={`text-${index}`}>{segment.value}</span>;
      })}
    </>
  );
}
