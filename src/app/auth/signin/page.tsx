import { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { SignInForm } from '@/features/auth/SignInForm';

export const metadata: Metadata = buildMetadata({
  title: 'Sign in · Collabify Growth',
  description: 'Sign in or create a Collabify Growth account.',
  path: '/auth/signin',
  noIndex: true,
});

export default function SignInPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Sign in' }]}
        h1="Sign in to Collabify."
        lede="Access the Collabify Community, affiliate partner dashboard, white-label workspace, or editorial tools."
      />
      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <Suspense fallback={<p className="muted">Loading sign-in…</p>}>
            <SignInForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}

