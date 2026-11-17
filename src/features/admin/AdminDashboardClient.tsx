'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { REF_STATUSES, STAGES, STATUS_TEXT, WL_STATUSES } from '@/content';
import { fmtDay } from '@/lib/format';
import { fmtINR } from '@/features/tools/MediaKitCard';
import type {
  BriefStatus,
  PipelineStage,
  ReferralStatus,
  UserRole,
} from '@/types/database';
import type { AdminDashboardBundle } from './types';

type InboxTab =
  | 'overview'
  | 'enquiries'
  | 'affiliates'
  | 'wlapps'
  | 'applications'
  | 'members'
  | 'reports'
  | 'partners'
  | 'interest'
  | 'posts'
  | 'payments'
  | 'users'
  | 'audit';

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AdminDashboardClient({
  initialData,
}: {
  initialData: AdminDashboardBundle;
}) {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardBundle>(initialData);
  const [tab, setTab] = useState<InboxTab>('overview');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [stageEdits, setStageEdits] = useState<
    Record<string, { stage: PipelineStage; value_inr: string }>
  >({});
  const [refEdits, setRefEdits] = useState<
    Record<string, { status: ReferralStatus; commission_inr: string }>
  >({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [briefEdits, setBriefEdits] = useState<Record<string, BriefStatus>>({});
  const [openBriefPartnerId, setOpenBriefPartnerId] = useState<string | null>(null);
  const [payoutForm, setPayoutForm] = useState<
    Record<string, { amount: string; method: string; reference: string }>
  >({});

  const isAdmin = data.role === 'owner' || data.role === 'admin';

  const { referrals } = data;
  const referralByEnquiry = useMemo(() => {
    const map: Record<string, (typeof referrals)[number]> = {};
    for (const r of referrals) map[r.enquiry_id] = r;
    return map;
  }, [referrals]);

  async function refreshAll() {
    setBusyKey('refresh');
    setFeedback('');
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { data?: AdminDashboardBundle };
        if (json.data) setData(json.data);
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function runAction(
    key: string,
    url: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: Record<string, unknown>
  ) {
    setBusyKey(key);
    setFeedback('');
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback(json.error || 'Action failed.');
        return;
      }
      await refreshAll();
    } catch {
      setFeedback('Request failed. Check connection and try again.');
    } finally {
      setBusyKey(null);
    }
  }

  const tabs: Array<{ id: InboxTab; label: string; adminOnly?: boolean }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'enquiries', label: `Project enquiries (${data.enquiries.length})` },
    { id: 'affiliates', label: `Affiliates (${data.affiliates.length})` },
    { id: 'wlapps', label: `White-label partners (${data.wlApplications.length})` },
    { id: 'applications', label: `Community applications (${data.communityApps.length})` },
    { id: 'members', label: `Community members (${data.memberships.length})` },
    {
      id: 'reports',
      label: `Reports (${data.reports.filter((r) => !r.resolved).length})`,
    },
    { id: 'partners', label: `Partner applications (${data.specialists.length})` },
    { id: 'interest', label: `Marketplace interest (${data.marketplaceInterest.length})` },
    { id: 'posts', label: `Blog (${data.posts.length})` },
    { id: 'payments', label: `Payments (${data.payments.length})`, adminOnly: true },
    { id: 'users', label: `Users (${data.users.length})`, adminOnly: true },
    { id: 'audit', label: `Audit log`, adminOnly: true },
  ];

  // Overview KPIs
  const overviewStats = useMemo(() => {
    const now = Date.now();
    const d30 = data.enquiries.filter(
      (e) => now - Date.parse(e.created_at) < 30 * 864e5
    ).length;
    const open = data.enquiries.filter((e) =>
      ['New', 'Contacted', 'Proposal sent'].includes(e.stage)
    );
    const won = data.enquiries.filter((e) => e.stage === 'Won');
    const lost = data.enquiries.filter((e) => e.stage === 'Lost');
    const winRate =
      won.length + lost.length > 0
        ? `${Math.round((won.length / (won.length + lost.length)) * 100)}%`
        : '–';

    const sumVal = (rows: typeof data.enquiries) =>
      rows.reduce((s, r) => s + (r.value_inr || 0), 0);

    const activeMembers = data.memberships.filter((m) => m.status === 'active').length;
    const activeWl = data.wlPartners.filter((w) => w.status === 'active').length;
    const commissionDue = data.referrals
      .filter((r) => r.status === 'Won')
      .reduce((s, r) => s + (r.commission_inr || 0), 0);

    const countBy = (fn: (e: (typeof data.enquiries)[number]) => string[] | string | null) => {
      const m: Record<string, number> = {};
      for (const item of data.enquiries) {
        const vals = fn(item);
        const arr = Array.isArray(vals) ? vals : vals ? [vals] : [];
        for (const v of arr) {
          if (v) m[v] = (m[v] || 0) + 1;
        }
      }
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };

    const stageBars: Array<[string, number, string]> = STAGES.map((s) => {
      const rows = data.enquiries.filter((e) => e.stage === s);
      const val = sumVal(rows);
      return [s, rows.length, `${rows.length}${val ? `, ${fmtINR(val)}` : ''}`];
    });

    const needsBars: Array<[string, number, string]> = countBy((e) => e.needs)
      .slice(0, 8)
      .map(([k, n]) => [k, n, String(n)]);

    const sourceBars: Array<[string, number, string]> = countBy(
      (e) => e.source || 'Not given'
    )
      .slice(0, 6)
      .map(([k, n]) => [k, n, String(n)]);

    const partnerNetworkBars: Array<[string, number, string]> = [
      ['Affiliates approved', data.affiliates.filter((a) => a.status === 'approved').length, ''],
      ['Partner referrals', data.referrals.length, ''],
      ['Specialist applications', data.specialists.length, ''],
      ['Community applications', data.communityApps.length, ''],
    ].map(([k, n]) => [String(k), Number(n), String(n)]);

    return {
      d30,
      openVal: fmtINR(sumVal(open)) || '₹0',
      wonVal: fmtINR(sumVal(won)) || '₹0',
      winRate,
      partnerEnqs: data.enquiries.filter((e) => Boolean(e.partner_ref)).length,
      activeMembers,
      activeWl,
      commissionDue,
      stageBars,
      needsBars,
      sourceBars,
      partnerNetworkBars,
    };
  }, [data]);

  function renderChart(title: string, pairs: Array<[string, number, string]>) {
    const max = Math.max(1, ...pairs.map((p) => p[1]));
    return (
      <div className="ov-chart">
        <h3>{title}</h3>
        {pairs.length > 0 ? (
          pairs.map(([label, n, display]) => (
            <div className="ov-row" key={label}>
              <span>{label}</span>
              <span className="hc-track">
                <i className="on" style={{ ['--w' as string]: `${Math.round((n / max) * 100)}%` }} />
              </span>
              <b>{display || String(n)}</b>
            </div>
          ))
        ) : (
          <p className="muted small">No data yet.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Submission type">
        {tabs
          .filter((t) => !t.adminOnly || isAdmin)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
      </div>

      {feedback && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <strong>{feedback}</strong>
        </div>
      )}

      <div id="inboxList" aria-live="polite">
        {tab === 'overview' && (
          <>
            <div className="ov-kpis">
              <div>
                <b>{data.enquiries.length}</b>
                <span>Enquiries, all time</span>
              </div>
              <div>
                <b>{overviewStats.d30}</b>
                <span>Enquiries, last 30 days</span>
              </div>
              <div>
                <b>{overviewStats.openVal}</b>
                <span>Open pipeline value</span>
              </div>
              <div>
                <b>{overviewStats.wonVal}</b>
                <span>Won value</span>
              </div>
              <div>
                <b>{overviewStats.winRate}</b>
                <span>Win rate (won vs lost)</span>
              </div>
              <div>
                <b>{overviewStats.partnerEnqs}</b>
                <span>Enquiries from partners</span>
              </div>
              <div>
                <b>{overviewStats.activeMembers}</b>
                <span>Active community members</span>
              </div>
              <div>
                <b>{overviewStats.activeWl}</b>
                <span>White-label partners</span>
              </div>
            </div>

            <div className="ov-grid">
              {renderChart('Pipeline by stage', overviewStats.stageBars)}
              {renderChart('What enquiries ask for', overviewStats.needsBars)}
              {renderChart('How people found you', overviewStats.sourceBars)}
              {renderChart('Partner network', overviewStats.partnerNetworkBars)}
            </div>

            {overviewStats.commissionDue > 0 && (
              <p className="small muted" style={{ marginTop: 14 }}>
                Commission currently due to affiliates: {fmtINR(overviewStats.commissionDue)}.
              </p>
            )}

            <p style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busyKey === 'refresh'}
                onClick={refreshAll}
              >
                {busyKey === 'refresh' ? 'Refreshing…' : 'Refresh numbers'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  await fetch('/api/auth/signout', { method: 'POST' });
                  router.push('/');
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </p>
          </>
        )}

        {tab === 'enquiries' &&
          (data.enquiries.length === 0 ? (
            <div className="callout">
              <p className="muted">No project enquiries yet.</p>
            </div>
          ) : (
            data.enquiries.map((r) => {
              const edit = stageEdits[r.id] || {
                stage: r.stage,
                value_inr: r.value_inr ? String(r.value_inr) : '',
              };
              const linkedRef = referralByEnquiry[r.id];
              const refEdit = refEdits[r.id] || {
                status: linkedRef?.status || 'Lead',
                commission_inr: linkedRef?.commission_inr ? String(linkedRef.commission_inr) : '',
              };
              const notes = data.enquiryNotes[r.id] || [];

              return (
                <details className="inbox-item" key={r.id}>
                  <summary>
                    <span className="who">
                      {r.name} <span className="muted">at {r.company}</span>
                    </span>
                    <span
                      className={`status${
                        r.stage === 'Won' || r.stage === 'Contacted' || r.stage === 'Proposal sent'
                          ? ' contacted'
                          : ''
                      }`}
                    >
                      {r.stage}
                    </span>
                    <span className="meta">
                      {fmtDateTime(r.created_at)} · {r.id}
                    </span>
                  </summary>
                  <div className="inbox-body">
                    <dl>
                      <dt>Email</dt>
                      <dd>{r.email}</dd>
                      {r.phone && (
                        <>
                          <dt>Phone</dt>
                          <dd>{r.phone}</dd>
                        </>
                      )}
                      <dt>Role</dt>
                      <dd>{r.role}</dd>
                      {r.website && (
                        <>
                          <dt>Website</dt>
                          <dd>{r.website}</dd>
                        </>
                      )}
                      {r.needs.length > 0 && (
                        <>
                          <dt>Needs</dt>
                          <dd>{r.needs.join(', ')}</dd>
                        </>
                      )}
                      {r.shortlist.length > 0 && (
                        <>
                          <dt>Shortlisted services</dt>
                          <dd>{r.shortlist.join(', ')}</dd>
                        </>
                      )}
                      {r.programme && (
                        <>
                          <dt>Programme</dt>
                          <dd>{r.programme}</dd>
                        </>
                      )}
                      <dt>Project</dt>
                      <dd>{r.description}</dd>
                      <dt>Timeline</dt>
                      <dd>{r.timeline}</dd>
                      <dt>Budget</dt>
                      <dd>{r.budget}</dd>
                      {r.source && (
                        <>
                          <dt>Heard via</dt>
                          <dd>{r.source}</dd>
                        </>
                      )}
                      {r.partner_ref && (
                        <>
                          <dt>Referred by</dt>
                          <dd>{r.partner_ref}</dd>
                        </>
                      )}
                    </dl>

                    <div className="ref-box">
                      <p>
                        <strong>Sales pipeline</strong>
                      </p>
                      <div className="ref-ctl">
                        <label className="sr-only" htmlFor={`st-${r.id}`}>
                          Stage
                        </label>
                        <select
                          id={`st-${r.id}`}
                          value={edit.stage}
                          onChange={(e) =>
                            setStageEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...edit, stage: e.target.value as PipelineStage },
                            }))
                          }
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <label className="sr-only" htmlFor={`dv-${r.id}`}>
                          Deal value in rupees
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          id={`dv-${r.id}`}
                          placeholder="Deal value ₹"
                          value={edit.value_inr}
                          onChange={(e) =>
                            setStageEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...edit, value_inr: e.target.value },
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busyKey === `st-${r.id}`}
                          onClick={() =>
                            runAction(
                              `st-${r.id}`,
                              `/api/admin/enquiries/${encodeURIComponent(r.id)}`,
                              'PATCH',
                              {
                                stage: edit.stage,
                                value_inr: edit.value_inr ? Number(edit.value_inr.replace(/\D/g, '')) : null,
                              }
                            )
                          }
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {r.partner_ref && (
                      <div className="ref-box">
                        <p>
                          <strong>Referred by partner {r.partner_ref}</strong>{' '}
                          {linkedRef && (
                            <span className="small muted">
                              Status: {linkedRef.status}
                              {linkedRef.commission_inr
                                ? `, commission ${fmtINR(linkedRef.commission_inr)}`
                                : ''}
                            </span>
                          )}
                        </p>
                        <div className="ref-ctl">
                          <select
                            aria-label="Referral status"
                            value={refEdit.status}
                            onChange={(e) =>
                              setRefEdits((prev) => ({
                                ...prev,
                                [r.id]: {
                                  ...refEdit,
                                  status: e.target.value as ReferralStatus,
                                },
                              }))
                            }
                          >
                            {REF_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Commission ₹"
                            value={refEdit.commission_inr}
                            onChange={(e) =>
                              setRefEdits((prev) => ({
                                ...prev,
                                [r.id]: { ...refEdit, commission_inr: e.target.value },
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={busyKey === `ref-${r.id}`}
                            onClick={() =>
                              runAction(
                                `ref-${r.id}`,
                                `/api/admin/referrals/${encodeURIComponent(r.id)}`,
                                'PATCH',
                                {
                                  code: r.partner_ref,
                                  status: refEdit.status,
                                  commission_inr: refEdit.commission_inr
                                    ? Number(refEdit.commission_inr.replace(/\D/g, ''))
                                    : null,
                                }
                              )
                            }
                          >
                            Save for partner
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="ref-box">
                      <p>
                        <strong>Internal notes ({notes.length})</strong>
                      </p>
                      {notes.length > 0 && (
                        <ul style={{ margin: '8px 0 10px 18px', fontSize: '0.9rem' }}>
                          {notes.map((n) => (
                            <li key={n.id}>
                              {n.body}{' '}
                              <span className="small muted">({fmtDateTime(n.created_at)})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="ref-ctl">
                        <input
                          type="text"
                          placeholder="Add an internal note…"
                          value={noteDrafts[r.id] || ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!noteDrafts[r.id]?.trim() || busyKey === `note-${r.id}`}
                          onClick={async () => {
                            const body = (noteDrafts[r.id] || '').trim();
                            if (!body) return;
                            await runAction(
                              `note-${r.id}`,
                              `/api/admin/enquiries/${encodeURIComponent(r.id)}/notes`,
                              'POST',
                              { body }
                            );
                            setNoteDrafts((prev) => ({ ...prev, [r.id]: '' }));
                          }}
                        >
                          Add note
                        </button>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="btn-row" style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn-quiet"
                          onClick={() => {
                            if (window.confirm('Delete this enquiry permanently?')) {
                              void runAction(
                                `del-enq-${r.id}`,
                                `/api/admin/enquiries/${encodeURIComponent(r.id)}`,
                                'DELETE'
                              );
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </details>
              );
            })
          ))}

        {tab === 'affiliates' &&
          (data.affiliates.length === 0 ? (
            <div className="callout">
              <p className="muted">No affiliate applications yet.</p>
            </div>
          ) : (
            data.affiliates.map((a) => {
              const pForm = payoutForm[a.user_id] || {
                amount: '',
                method: 'UPI',
                reference: '',
              };
              return (
                <details className="inbox-item" key={a.user_id}>
                  <summary>
                    <span className="who">
                      {a.name} <span className="muted">in {a.city}</span>
                    </span>
                    <span className={`status${a.status === 'approved' ? ' contacted' : ''}`}>
                      {STATUS_TEXT[a.status] || a.status}
                    </span>
                    <span className="meta">
                      {fmtDateTime(a.created_at)}
                      {a.code ? ` · ${a.code}` : ''}
                    </span>
                  </summary>
                  <div className="inbox-body">
                    <dl>
                      <dt>Email</dt>
                      <dd>{a.email}</dd>
                      {a.phone && (
                        <>
                          <dt>Phone</dt>
                          <dd>{a.phone}</dd>
                        </>
                      )}
                      <dt>Shares on</dt>
                      <dd>{a.share_channels.join(', ')}</dd>
                      <dt>Audience</dt>
                      <dd>{a.audience}</dd>
                      {a.link && (
                        <>
                          <dt>Link</dt>
                          <dd>{a.link}</dd>
                        </>
                      )}
                    </dl>
                    <div className="btn-row">
                      {a.status === 'approved' ? (
                        <span className="small muted">Partner code {a.code} is active.</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              runAction(
                                `aff-app-${a.user_id}`,
                                `/api/admin/affiliates/${encodeURIComponent(a.user_id)}`,
                                'PATCH',
                                { status: 'approved' }
                              )
                            }
                          >
                            Approve and create link
                          </button>
                          {a.status !== 'declined' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                runAction(
                                  `aff-dec-${a.user_id}`,
                                  `/api/admin/affiliates/${encodeURIComponent(a.user_id)}`,
                                  'PATCH',
                                  { status: 'declined' }
                                )
                              }
                            >
                              Decline
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {a.status === 'approved' && isAdmin && (
                      <div className="ref-box">
                        <p>
                          <strong>Record commission payout</strong>
                        </p>
                        <div className="ref-ctl">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Amount ₹"
                            value={pForm.amount}
                            onChange={(e) =>
                              setPayoutForm((prev) => ({
                                ...prev,
                                [a.user_id]: { ...pForm, amount: e.target.value },
                              }))
                            }
                          />
                          <select
                            value={pForm.method}
                            onChange={(e) =>
                              setPayoutForm((prev) => ({
                                ...prev,
                                [a.user_id]: { ...pForm, method: e.target.value },
                              }))
                            }
                          >
                            <option value="UPI">UPI</option>
                            <option value="Bank transfer">Bank transfer</option>
                          </select>
                          <input
                            type="text"
                            placeholder="UTR / Reference"
                            value={pForm.reference}
                            onChange={(e) =>
                              setPayoutForm((prev) => ({
                                ...prev,
                                [a.user_id]: { ...pForm, reference: e.target.value },
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              runAction('record-payout', '/api/admin/payouts', 'POST', {
                                affiliate_id: a.user_id,
                                amount_inr: Number(pForm.amount.replace(/\D/g, '')),
                                method: pForm.method,
                                reference: pForm.reference || null,
                              })
                            }
                          >
                            Log payout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })
          ))}

        {tab === 'wlapps' &&
          (data.wlApplications.length === 0 ? (
            <div className="callout">
              <p className="muted">No white-label applications yet.</p>
            </div>
          ) : (
            data.wlApplications.map((w) => {
              const partnerBriefs = data.wlBriefs.filter((b) => b.partner_id === w.user_id);
              const showBriefs = openBriefPartnerId === w.user_id;
              return (
                <details className="inbox-item" key={w.user_id}>
                  <summary>
                    <span className="who">
                      {w.name} <span className="muted">at {w.company}</span>
                    </span>
                    <span className={`status${w.status === 'approved' ? ' contacted' : ''}`}>
                      {STATUS_TEXT[w.status] || w.status}
                    </span>
                    <span className="meta">{fmtDateTime(w.created_at)}</span>
                  </summary>
                  <div className="inbox-body">
                    <dl>
                      <dt>Email</dt>
                      <dd>{w.email}</dd>
                      <dt>City</dt>
                      <dd>{w.city}</dd>
                      {w.website && (
                        <>
                          <dt>Website</dt>
                          <dd>{w.website}</dd>
                        </>
                      )}
                      <dt>Capabilities</dt>
                      <dd>{w.capabilities.join(', ')}</dd>
                      <dt>Projects per month</dt>
                      <dd>{w.volume}</dd>
                      {w.notes && (
                        <>
                          <dt>Notes</dt>
                          <dd>{w.notes}</dd>
                        </>
                      )}
                    </dl>
                    <div className="btn-row">
                      {w.status === 'approved' ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setOpenBriefPartnerId(showBriefs ? null : w.user_id)
                          }
                        >
                          {showBriefs
                            ? 'Hide briefs'
                            : `Show briefs (${partnerBriefs.length})`}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              runAction(
                                `wl-app-${w.user_id}`,
                                `/api/admin/whitelabel/${encodeURIComponent(w.user_id)}`,
                                'PATCH',
                                { status: 'approved' }
                              )
                            }
                          >
                            Approve partner
                          </button>
                          {w.status !== 'declined' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                runAction(
                                  `wl-dec-${w.user_id}`,
                                  `/api/admin/whitelabel/${encodeURIComponent(w.user_id)}`,
                                  'PATCH',
                                  { status: 'declined' }
                                )
                              }
                            >
                              Decline
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {showBriefs && (
                      <div className="wlb">
                        {partnerBriefs.length === 0 ? (
                          <p className="small muted">No briefs yet.</p>
                        ) : (
                          partnerBriefs.map((b) => {
                            const nextStatus = briefEdits[b.id] || b.status;
                            return (
                              <div className="wlb-item" key={b.id}>
                                <p>
                                  <strong>{b.title}</strong>{' '}
                                  <span className="small muted">
                                    {[
                                      b.capability,
                                      b.industry,
                                      b.budget,
                                      b.due_date ? `due ${fmtDay(b.due_date)}` : '',
                                    ]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </span>
                                </p>
                                <p className="small" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                                  {`${b.services}\n${b.details}${
                                    b.branding ? `\nBranding: ${b.branding}` : ''
                                  }`}
                                </p>
                                {(data.wlBriefFiles[b.id]?.length ?? 0) > 0 && (
                                  <div className="btn-row" style={{ marginTop: 8 }}>
                                    {data.wlBriefFiles[b.id]!.map((f) => (
                                      <button
                                        key={f.id}
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={async () => {
                                          const r = await fetch(
                                            `/api/whitelabel/briefs/${encodeURIComponent(b.id)}/files`,
                                          );
                                          const j = (await r.json()) as {
                                            files?: Array<{ id: number; signed_url?: string | null }>;
                                          };
                                          const target = j.files?.find((x) => x.id === f.id);
                                          if (target?.signed_url) {
                                            window.open(target.signed_url, '_blank', 'noopener,noreferrer');
                                          }
                                        }}
                                      >
                                        Download {f.file_name || 'file'}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="ref-ctl">
                                  <select
                                    aria-label="Brief status"
                                    value={nextStatus}
                                    onChange={(e) =>
                                      setBriefEdits((prev) => ({
                                        ...prev,
                                        [b.id]: e.target.value as BriefStatus,
                                      }))
                                    }
                                  >
                                    {WL_STATUSES.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() =>
                                      runAction(
                                        `wl-b-${b.id}`,
                                        `/api/admin/whitelabel/briefs/${encodeURIComponent(b.id)}`,
                                        'PATCH',
                                        { status: nextStatus }
                                      )
                                    }
                                  >
                                    Update status
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </details>
              );
            })
          ))}

        {tab === 'applications' &&
          (data.communityApps.length === 0 ? (
            <div className="callout">
              <p className="muted">No community applications yet.</p>
            </div>
          ) : (
            data.communityApps.map((a) => (
              <details className="inbox-item" key={a.user_id}>
                <summary>
                  <span className="who">
                    {a.name} <span className="muted">at {a.company}</span>
                  </span>
                  <span className={`status${a.status === 'approved' ? ' contacted' : ''}`}>
                    {STATUS_TEXT[a.status] || a.status}
                  </span>
                  <span className="meta">
                    {fmtDateTime(a.created_at)} · {a.plan}
                  </span>
                </summary>
                <div className="inbox-body">
                  <dl>
                    <dt>Email</dt>
                    <dd>{a.email}</dd>
                    <dt>Role</dt>
                    <dd>{a.role}</dd>
                    <dt>City</dt>
                    <dd>{a.city}</dd>
                    <dt>Working on</dt>
                    <dd>{a.working_on}</dd>
                    {a.interests.length > 0 && (
                      <>
                        <dt>Interests</dt>
                        <dd>{a.interests.join(', ')}</dd>
                      </>
                    )}
                  </dl>
                  <div className="btn-row">
                    {a.status === 'approved' ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          runAction(
                            `mem-rem-${a.user_id}`,
                            `/api/admin/community/members/${encodeURIComponent(a.user_id)}`,
                            'PATCH',
                            { status: 'cancelled' }
                          )
                        }
                      >
                        Remove access
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            runAction(
                              `app-ok-${a.user_id}`,
                              `/api/admin/community/applications/${encodeURIComponent(a.user_id)}`,
                              'PATCH',
                              { status: 'approved' }
                            )
                          }
                        >
                          Payment received: give access
                        </button>
                        {a.status === 'pending' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              runAction(
                                `app-no-${a.user_id}`,
                                `/api/admin/community/applications/${encodeURIComponent(a.user_id)}`,
                                'PATCH',
                                { status: 'declined' }
                              )
                            }
                          >
                            Decline
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </details>
            ))
          ))}

        {tab === 'members' &&
          (data.memberships.length === 0 ? (
            <div className="callout">
              <p className="muted">No community memberships yet.</p>
            </div>
          ) : (
            data.memberships.map((m) => (
              <details className="inbox-item" key={m.user_id}>
                <summary>
                  <span className="who">
                    {m.display_name}{' '}
                    {m.company && <span className="muted">at {m.company}</span>}
                  </span>
                  <span className={`status${m.status === 'active' ? ' contacted' : ''}`}>
                    {STATUS_TEXT[m.status] || m.status}
                  </span>
                  <span className="meta">
                    {m.plan} · started {fmtDay(m.started_at)}
                  </span>
                </summary>
                <div className="inbox-body">
                  <dl>
                    {m.role && (
                      <>
                        <dt>Role</dt>
                        <dd>{m.role}</dd>
                      </>
                    )}
                    {m.city && (
                      <>
                        <dt>City</dt>
                        <dd>{m.city}</dd>
                      </>
                    )}
                    {m.working_on && (
                      <>
                        <dt>Working on</dt>
                        <dd>{m.working_on}</dd>
                      </>
                    )}
                  </dl>
                  <div className="btn-row">
                    {m.status === 'active' ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          runAction(
                            `mem-rem-${m.user_id}`,
                            `/api/admin/community/members/${encodeURIComponent(m.user_id)}`,
                            'PATCH',
                            { status: 'cancelled' }
                          )
                        }
                      >
                        Remove access
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          runAction(
                            `mem-act-${m.user_id}`,
                            `/api/admin/community/members/${encodeURIComponent(m.user_id)}`,
                            'PATCH',
                            { status: 'active' }
                          )
                        }
                      >
                        Restore access
                      </button>
                    )}
                  </div>
                </div>
              </details>
            ))
          ))}

        {tab === 'reports' &&
          (data.reports.length === 0 ? (
            <div className="callout">
              <p className="muted">No reported messages.</p>
            </div>
          ) : (
            data.reports.map((rep) => (
              <details className="inbox-item" key={rep.id}>
                <summary>
                  <span className="who">Report #{rep.id}</span>
                  <span className={`status${rep.resolved ? ' contacted' : ''}`}>
                    {rep.resolved ? 'Resolved' : 'Open'}
                  </span>
                  <span className="meta">{fmtDateTime(rep.created_at)}</span>
                </summary>
                <div className="inbox-body">
                  <dl>
                    <dt>Reason</dt>
                    <dd>{rep.reason || 'Reported by member'}</dd>
                    <dt>Channel</dt>
                    <dd>{rep.message?.channel_id || '–'}</dd>
                    <dt>Message</dt>
                    <dd>{rep.message?.body || '[deleted]'}</dd>
                  </dl>
                  {!rep.resolved && (
                    <div className="btn-row">
                      {rep.message && !rep.message.deleted_at && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            runAction(
                              `rep-del-${rep.id}`,
                              `/api/admin/community/reports/${rep.id}`,
                              'PATCH',
                              { action: 'delete_message' }
                            )
                          }
                        >
                          Delete message & resolve
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          runAction(
                            `rep-dis-${rep.id}`,
                            `/api/admin/community/reports/${rep.id}`,
                            'PATCH',
                            { action: 'dismiss' }
                          )
                        }
                      >
                        Dismiss report
                      </button>
                    </div>
                  )}
                </div>
              </details>
            ))
          ))}

        {tab === 'partners' &&
          (data.specialists.length === 0 ? (
            <div className="callout">
              <p className="muted">No specialist or vendor applications yet.</p>
            </div>
          ) : (
            data.specialists.map((s) => (
              <details className="inbox-item" key={s.id}>
                <summary>
                  <span className="who">
                    {s.name} <span className="muted">in {s.city}</span>
                  </span>
                  <span className={`status${s.status === 'contacted' ? ' contacted' : ''}`}>
                    {STATUS_TEXT[s.status] || s.status}
                  </span>
                  <span className="meta">
                    {fmtDateTime(s.created_at)} · {s.id}
                  </span>
                </summary>
                <div className="inbox-body">
                  <dl>
                    <dt>Email</dt>
                    <dd>{s.email}</dd>
                    <dt>Partner type</dt>
                    <dd>{s.partner_type}</dd>
                    <dt>Availability</dt>
                    <dd>{s.availability}</dd>
                    <dt>Capabilities</dt>
                    <dd>{s.capabilities.join(', ')}</dd>
                    <dt>Portfolio</dt>
                    <dd>{s.portfolio}</dd>
                  </dl>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        runAction(
                          `sp-${s.id}`,
                          `/api/admin/specialists/${encodeURIComponent(s.id)}`,
                          'PATCH',
                          { status: s.status === 'contacted' ? 'new' : 'contacted' }
                        )
                      }
                    >
                      {s.status === 'contacted' ? 'Mark as new' : 'Mark as contacted'}
                    </button>
                  </div>
                </div>
              </details>
            ))
          ))}

        {tab === 'interest' &&
          (data.marketplaceInterest.length === 0 ? (
            <div className="callout">
              <p className="muted">No marketplace interest submissions yet.</p>
            </div>
          ) : (
            data.marketplaceInterest.map((i) => (
              <details className="inbox-item" key={i.id}>
                <summary>
                  <span className="who">
                    {i.name} {i.company && <span className="muted">at {i.company}</span>}
                  </span>
                  <span className="status">{i.role}</span>
                  <span className="meta">
                    {fmtDateTime(i.created_at)} · {i.id}
                  </span>
                </summary>
                <div className="inbox-body">
                  <dl>
                    <dt>Email</dt>
                    <dd>{i.email}</dd>
                    <dt>Role</dt>
                    <dd>{i.role}</dd>
                    {i.audiences && (
                      <>
                        <dt>Audiences</dt>
                        <dd>{i.audiences}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </details>
            ))
          ))}

        {tab === 'posts' && (
          <div>
            <div className="admin-bar">
              <div>
                <strong>Blog articles & drafts</strong>
              </div>
              <Link className="btn btn-primary btn-sm" href="/blog/write">
                Write a post
              </Link>
            </div>
            {data.posts.length === 0 ? (
              <div className="callout">
                <p className="muted">No blog posts yet.</p>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Title</th>
                      <th scope="col">Status</th>
                      <th scope="col">Category</th>
                      <th scope="col">Updated</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.posts.map((p) => (
                      <tr key={p.slug}>
                        <td>{p.title}</td>
                        <td>{p.status}</td>
                        <td>{p.category || '–'}</td>
                        <td>{fmtDay(p.updated_at)}</td>
                        <td>
                          <Link className="tlink small" href={`/blog/write/${p.slug}`}>
                            Edit
                          </Link>{' '}
                          ·{' '}
                          <Link className="tlink small" href={`/blog/${p.slug}`}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && isAdmin && (
          <div className="tbl-wrap">
            {data.payments.length === 0 ? (
              <div className="callout">
                <p className="muted">No recorded Razorpay payments yet.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Payment ID</th>
                    <th scope="col">Purpose</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((pay) => (
                    <tr key={pay.id}>
                      <td>{pay.id}</td>
                      <td>{pay.purpose}</td>
                      <td>₹{(pay.amount_paise / 100).toLocaleString('en-IN')}</td>
                      <td>{pay.status}</td>
                      <td>{fmtDateTime(pay.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'users' && isAdmin && (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Access</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.full_name || '–'}</td>
                    <td>
                      <select
                        aria-label={`Role for ${u.email}`}
                        value={u.role}
                        onChange={(e) =>
                          runAction(
                            `role-${u.id}`,
                            `/api/admin/users/${encodeURIComponent(u.id)}`,
                            'PATCH',
                            { role: e.target.value as UserRole }
                          )
                        }
                      >
                        <option value="user">user</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                        <option value="owner">owner</option>
                      </select>
                    </td>
                    <td>{u.is_suspended ? 'Suspended' : 'Active'}</td>
                    <td>{fmtDay(u.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={
                          busyKey === `suspend-${u.id}` ||
                          (u.role === 'owner' && data.role !== 'owner')
                        }
                        onClick={() =>
                          runAction(
                            `suspend-${u.id}`,
                            `/api/admin/users/${encodeURIComponent(u.id)}`,
                            'PATCH',
                            { is_suspended: !u.is_suspended }
                          )
                        }
                      >
                        {u.is_suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'audit' && isAdmin && (
          <div className="tbl-wrap">
            {data.auditLogs.length === 0 ? (
              <div className="callout">
                <p className="muted">No audit log entries yet.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{fmtDateTime(log.created_at)}</td>
                      <td>{log.actor_email || log.actor_id || 'system'}</td>
                      <td>{log.action}</td>
                      <td>
                        {log.entity_type}
                        {log.entity_id ? ` · ${log.entity_id}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}

