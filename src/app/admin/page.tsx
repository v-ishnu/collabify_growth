import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { loadAdminDashboardBundle } from '@/lib/admin/bundle';
import { PageHero } from '@/components/common/PageHero';
import { NoticeBox } from '@/components/common/NoticeBox';
import { AdminDashboardClient } from '@/features/admin/AdminDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Enquiry inbox · Collabify Growth',
  description: 'Owner and team inbox.',
  path: '/admin',
  noIndex: true,
});

export default async function AdminPage() {
  const { user, profile } = await getSessionUserAndProfile();
  const canView = Boolean(user && isStaffRole(profile?.role));

  if (!canView || !profile) {
    return (
      <>
        <PageHero
          crumbs={[{ label: 'Home', href: '/' }, { label: 'Enquiry inbox' }]}
          h1="Enquiry inbox"
          lede="The inbox is restricted to authorized Collabify team members."
        />
        <section className="sec-tight">
          <div className="wrap">
            <NoticeBox
              title="Staff access required"
              body="Sign in with an owner, admin, or editor account to view submissions and manage the workspace."
            >
              {!user && (
                <Link className="btn btn-primary" href="/auth/signin?next=/admin">
                  Sign in
                </Link>
              )}
              <Link className="btn btn-secondary" href="/">
                Back to home
              </Link>
            </NoticeBox>
          </div>
        </section>
      </>
    );
  }

  const bundle = await loadAdminDashboardBundle(profile.role);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Enquiry inbox' }]}
        h1="Enquiry inbox"
        lede="Submissions from the site’s forms, newest first. Only you and editors can see this page."
      />
      <section className="sec-tight">
        <div className="wrap">
          <AdminDashboardClient initialData={bundle} />
        </div>
      </section>
    </>
  );
}
