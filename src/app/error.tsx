'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error] unhandled boundary error:', error.digest || error.message);
  }, [error]);

  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <h1>Something went wrong while loading this view.</h1>
        <p className="lede" style={{ marginTop: 20 }}>
          A temporary issue interrupted the request. Try reloading below, or return to the homepage.
        </p>
        <div className="btn-row" style={{ marginTop: 28 }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn-secondary" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}

