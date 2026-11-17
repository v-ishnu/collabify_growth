import { CASES, LOGO_SLOTS, TESTIMONIAL } from '@/content';
import { PlaceholderText } from './PlaceholderText';

export function ProofSection() {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head split">
          <h2>Work we’re proud of.</h2>
          <p className="lede">
            Selected projects across our capabilities, published with each client’s approval.
          </p>
        </div>
        <div className="cases">
          {CASES.map((c, idx) => (
            <article className="case" key={idx}>
              <h3>
                <PlaceholderText text={c.client} />
              </h3>
              <p className="ind">
                <PlaceholderText text={c.industry} />
              </p>
              <dl>
                <dt>Challenge</dt>
                <dd>
                  <PlaceholderText text={c.challenge} />
                </dd>
                <dt>What we did</dt>
                <dd>
                  <PlaceholderText text={c.did} />
                </dd>
                <dt>Result</dt>
                <dd>
                  <PlaceholderText text={c.result} />
                </dd>
                <dt>Programme or services</dt>
                <dd>
                  <PlaceholderText text={c.used} />
                </dd>
              </dl>
            </article>
          ))}
        </div>
        <div className="logos" role="list" aria-label="Clients">
          {Array.from({ length: LOGO_SLOTS }, (_, i) => (
            <div key={i} role="listitem">
              [Client logo]
            </div>
          ))}
        </div>
        <figure className="quote">
          <blockquote>
            <PlaceholderText text={TESTIMONIAL.quote} />
          </blockquote>
          <figcaption>
            <PlaceholderText text={TESTIMONIAL.who} />, <PlaceholderText text={TESTIMONIAL.role} />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

