import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { CookiesManageButton } from '@/features/legal/CookiesManageButton';

export const metadata: Metadata = buildMetadata({
  title: 'Cookie Policy · Collabify Growth',
  description: 'Cookie Policy',
  path: '/cookies',
});

const SECTIONS: Array<[string, string]> = [
  [
    'Essential cookies',
    'Needed for the site to work, including remembering your cookie choice and theme. These are always on.',
  ],
  [
    'Analytics cookies',
    'Used only if you accept them, to understand which pages are useful. [List analytics cookies once a tool is chosen.]',
  ],
  ['Changing your choice', 'Use the Cookie settings button below or in the footer at any time.'],
];

export default function CookiesPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Cookie Policy' }]}
        h1="Cookie Policy"
        lede="Which cookies this site uses, and how to change your choice."
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
          <CookiesManageButton />
        </div>
      </section>
    </>
  );
}

