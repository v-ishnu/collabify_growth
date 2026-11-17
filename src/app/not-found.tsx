import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <h1>This page doesn’t exist, or it has moved.</h1>
        <p className="lede" style={{ marginTop: 20 }}>
          Try one of these instead.
        </p>
        <div className="btn-row" style={{ marginTop: 28 }}>
          <Link className="btn btn-secondary" href="/capabilities">
            Capabilities
          </Link>
          <Link className="btn btn-secondary" href="/solutions">
            Solutions
          </Link>
          <Link className="btn btn-primary" href="/start-a-project">
            Start a Project
          </Link>
        </div>
      </div>
    </section>
  );
}

