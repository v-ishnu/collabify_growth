import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy · Collabify Growth',
  description: 'Privacy Policy',
  path: '/privacy',
});

const SECTIONS: Array<[string, string | string[]]> = [
  [
    'Who we are',
    '[Registered entity name], [registered address]. For questions about your data, contact [data contact name] at [email].',
  ],
  [
    'What we collect',
    [
      'Details you submit in our forms: name, email, phone, company, role, project details, timeline, budget range and your consent choices.',
      'Partner applications: skills, portfolio links, rates and availability.',
      'Community applications, your member profile and the messages you post in member channels.',
      'Analytics data about how the site is used, only if you accept analytics cookies.',
    ],
  ],
  [
    'Why we use it',
    [
      'To reply to your enquiry and prepare a proposal.',
      'To review partner applications and contact you about relevant projects.',
      'To send updates by email, only if you opted in.',
      'To contact you on WhatsApp, only if you opted in.',
    ],
  ],
  [
    'How long we keep it',
    'We keep enquiry and application data for [retention period], then delete it unless we have an ongoing engagement with you.',
  ],
  [
    'Who we share it with',
    'Service providers that host our website, forms and CRM: [list providers]. We never sell your personal data.',
  ],
  [
    'Your rights',
    [
      'Ask for a summary of the personal data we hold about you.',
      'Ask us to correct, complete, update or erase it.',
      'Withdraw consent at any time, as easily as you gave it.',
      'Raise a grievance with us, and escalate to the Data Protection Board of India if it isn’t resolved.',
      'Nominate someone to exercise your rights if you are unable to.',
    ],
  ],
  ['Contact', 'Grievance contact: [name], [email], [phone].'],
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]}
        h1="Privacy Policy"
        lede="How Collabify Growth collects, uses and protects your personal data, in line with India’s Digital Personal Data Protection Act, 2023."
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
              {Array.isArray(body) ? (
                <ul>
                  {body.map((item) => (
                    <li key={item}>
                      <PlaceholderText text={item} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  <PlaceholderText text={body} />
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

