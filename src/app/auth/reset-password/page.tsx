import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';

export const metadata: Metadata = buildMetadata({
  title: 'Reset password · Collabify Growth',
  description: 'Set a new password for your Collabify Growth account.',
  path: '/auth/reset-password',
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Reset password' }]}
        h1="Choose a new password."
        lede="Enter a strong password of at least 8 characters."
      />
      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <ResetPasswordForm />
        </div>
      </section>
    </>
  );
}

