'use client';

import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: '80px 24px', maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 12 }}>Something went wrong.</h1>
          <p style={{ color: '#555', marginBottom: 24 }}>
            We hit an unexpected error rendering the page. Reload to try again.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: 'none',
                background: '#111',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
            <Link
              href="/"
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid #ccc',
                color: '#111',
                textDecoration: 'none',
              }}
            >
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}

