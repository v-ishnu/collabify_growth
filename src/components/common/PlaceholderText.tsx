import { Fragment } from 'react';

export function PlaceholderText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, idx) =>
        part.startsWith('[') && part.endsWith(']') ? (
          <span key={idx} className="ph">
            {part}
          </span>
        ) : (
          <Fragment key={idx}>{part}</Fragment>
        ),
      )}
    </>
  );
}

