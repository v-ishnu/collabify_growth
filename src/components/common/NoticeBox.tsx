import type { ReactNode } from 'react';

interface NoticeBoxProps {
  title: string;
  body: ReactNode;
  buttons?: ReactNode;
  children?: ReactNode;
}

export function NoticeBox({ title, body, buttons, children }: NoticeBoxProps) {
  const actions = buttons ?? children;
  return (
    <div className="callout" style={{ maxWidth: 780 }}>
      <h2 style={{ fontSize: '1.4rem' }}>{title}</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        {body}
      </p>
      {actions && (
        <div className="btn-row" style={{ marginTop: 20 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
