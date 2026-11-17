import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Use · Collabify Growth',
  description: 'Terms of Use',
  path: '/terms',
});

const SECTIONS: Array<[string, string]> = [
  [
    'Using this site',
    'This site describes Collabify Growth’s services. Information on it is general and doesn’t form an offer or contract; every engagement is governed by its own written agreement.',
  ],
  [
    'Content ownership',
    'Text, design and graphics on this site belong to [registered entity name] unless stated otherwise. You may share links to it, but not reproduce its content without permission.',
  ],
  [
    'No guarantees',
    'We describe what we deliver, not guaranteed outcomes. We don’t promise search rankings, press coverage, virality or registrations.',
  ],
  [
    'Links to other sites',
    'Where we link to other websites, we aren’t responsible for their content or privacy practices.',
  ],
  ['Limitation of liability', '[To be drafted with counsel.]'],
  [
    'Governing law',
    'These terms are governed by the laws of India, with courts at [city] having jurisdiction.',
  ],
  ['Contact', 'Questions about these terms: [email].'],
];

export default function TermsPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Terms of Use' }]}
        h1="Terms of Use"
        lede="The terms that apply when you use this website."
      />
      <section className="sec-tight">
        <div className="wrap legal" style={{ maxWidth: 860 }}>
          <div className="placeholder-block">
            This page sets out the structure. Finalise the wording with your lawyer before launch.
            Last updated <span className="ph">[date]</span>.
          </div>
          {SECTIONS.map(([heading, body]) => (
            <div key={heading}>
              <h2>{heading}</h2>
              <p>
                <PlaceholderText text={body} />
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

