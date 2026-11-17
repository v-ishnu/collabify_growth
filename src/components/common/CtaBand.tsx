import Link from 'next/link';

export function CtaBand() {
  return (
    <section className="sec on-brand cta-band">
      <div className="wrap">
        <div>
          <h2>One partner, from idea to launch.</h2>
          <p className="lede">
            Bring us one project or the whole plan. We’ll scope it, assemble the right team and lead
            it from brief to report.
          </p>
        </div>
        <div className="btn-row">
          <Link className="btn btn-primary" href="/start-a-project">
            Start a Project
          </Link>
          <Link className="btn btn-secondary" href="/how-we-work">
            See how we work
          </Link>
        </div>
      </div>
    </section>
  );
}

