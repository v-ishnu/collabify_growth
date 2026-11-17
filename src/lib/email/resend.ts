import { Resend } from 'resend';
import { getServerEnv } from '@/config/env';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#14131a;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e7e1d9;border-radius:12px;padding:32px;">
    <div style="font-size:13px;font-weight:600;color:#5e3a8e;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:16px;">Collabify Growth</div>
    <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;color:#14131a;">${esc(title)}</h1>
    <div style="font-size:15px;line-height:1.65;color:#2e2c36;">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #eee8e0;margin:28px 0 16px;" />
    <p style="font-size:12px;line-height:1.5;color:#6f6c78;margin:0;">Collabify Growth · hello@collabifygrowth.com</p>
  </div>
</body>
</html>`;
}

async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const client = getResendClient();
  const env = getServerEnv();
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[email:dev-noop] to=${Array.isArray(params.to) ? params.to.join(',') : params.to} subject=${params.subject}`);
    }
    return false;
  }

  try {
    await client.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      replyTo: env.EMAIL_REPLY_TO,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return true;
  } catch (err) {
    console.error('[email] resend send failed:', err);
    return false;
  }
}

export async function sendEnquiryConfirmationEmail(input: {
  to: string;
  name: string;
  ref: string;
  company: string;
  needs: string[];
}) {
  const firstName = input.name.split(' ')[0] || input.name;
  const needsList = input.needs.join(', ') || 'General scope';
  return sendEmail({
    to: input.to,
    subject: `We received your enquiry (${input.ref}) — Collabify Growth`,
    html: wrapEmail(
      `Thanks, ${firstName} — we’ve received your brief.`,
      `<p>Your enquiry for <strong>${esc(input.company)}</strong> is logged with reference <strong>${esc(input.ref)}</strong>.</p>
       <p><strong>Areas selected:</strong> ${esc(needsList)}</p>
       <p>A senior member of our team will review it and reply within one working day. Quote reference <strong>${esc(input.ref)}</strong> if you reply by email.</p>`,
    ),
    text: `Thanks ${firstName}, we received your enquiry for ${input.company} (Reference: ${input.ref}). Areas: ${needsList}. We will reply within one working day.`,
  });
}

export async function sendAdminAlertEmail(input: {
  subject: string;
  heading: string;
  lines: Array<[string, string]>;
}) {
  const env = getServerEnv();
  const rowsHtml = input.lines
    .map(([k, v]) => `<p style="margin:6px 0;"><strong>${esc(k)}:</strong> ${esc(v)}</p>`)
    .join('');
  const text = input.lines.map(([k, v]) => `${k}: ${v}`).join('\n');
  return sendEmail({
    to: env.ADMIN_NOTIFY_EMAIL,
    subject: input.subject,
    html: wrapEmail(input.heading, rowsHtml),
    text,
  });
}

export async function sendPartnerEnquiryEmail(input: {
  to: string;
  name: string;
  ref: string;
  partnerType: string;
}) {
  return sendEmail({
    to: input.to,
    subject: `Partner application received (${input.ref}) — Collabify Growth`,
    html: wrapEmail(
      'We’ve received your partner application.',
      `<p>Hi ${esc(input.name)}, thanks for applying to collaborate with Collabify Growth as a <strong>${esc(input.partnerType)}</strong>.</p>
       <p>Your reference is <strong>${esc(input.ref)}</strong>. We review applications and reach out whenever an upcoming brief matches your skills.</p>`,
    ),
    text: `Hi ${input.name}, your Collabify partner application (${input.partnerType}) was received with reference ${input.ref}.`,
  });
}

export async function sendCommunityApplicationEmail(input: {
  to: string;
  name: string;
  status: 'pending' | 'approved' | 'declined' | 'removed';
  siteUrl: string;
}) {
  const joinUrl = `${input.siteUrl.replace(/\/$/, '')}/community/join`;
  const chatUrl = `${input.siteUrl.replace(/\/$/, '')}/community/chat`;

  if (input.status === 'approved') {
    return sendEmail({
      to: input.to,
      subject: 'Your Collabify Community application is approved',
      html: wrapEmail(
        'You’re approved to join the Collabify Community.',
        `<p>Hi ${esc(input.name)}, your application has been approved.</p>
         <p>Complete your membership plan setup at <a href="${esc(joinUrl)}">${esc(joinUrl)}</a> to unlock the members area and directory (<a href="${esc(chatUrl)}">${esc(chatUrl)}</a>).</p>`,
      ),
      text: `Hi ${input.name}, your Collabify Community application is approved. Complete setup here: ${joinUrl}`,
    });
  }

  if (input.status === 'declined') {
    return sendEmail({
      to: input.to,
      subject: 'Update on your Collabify Community application',
      html: wrapEmail(
        'Update on your community application.',
        `<p>Hi ${esc(input.name)}, thank you for applying to the Collabify Community. Unfortunately we aren’t able to accept your application for the current cohort.</p>`,
      ),
      text: `Hi ${input.name}, thank you for applying to the Collabify Community. Unfortunately we aren't able to accept your application right now.`,
    });
  }

  return sendEmail({
    to: input.to,
    subject: 'We received your Collabify Community application',
    html: wrapEmail(
      'Application received.',
      `<p>Hi ${esc(input.name)}, thanks for applying to join the Collabify Community. We review each application carefully and will email you once yours is reviewed.</p>
       <p>Check your status anytime at <a href="${esc(joinUrl)}">${esc(joinUrl)}</a>.</p>`,
    ),
    text: `Hi ${input.name}, thanks for applying to the Collabify Community. Check status anytime at ${joinUrl}`,
  });
}

export async function sendSubscriptionConfirmedEmail(input: {
  to: string;
  name: string;
  plan: string;
  periodEnd: string | null;
  siteUrl: string;
}) {
  const chatUrl = `${input.siteUrl.replace(/\/$/, '')}/community/chat`;
  return sendEmail({
    to: input.to,
    subject: 'Your Collabify Community membership is active',
    html: wrapEmail(
      'Welcome to the Collabify Community.',
      `<p>Hi ${esc(input.name)}, your <strong>${esc(input.plan)}</strong> membership is now active.</p>
       ${input.periodEnd ? `<p>Current period ends: ${esc(input.periodEnd.slice(0, 10))}</p>` : ''}
       <p>Enter the members channels and directory here: <a href="${esc(chatUrl)}">${esc(chatUrl)}</a>.</p>`,
    ),
    text: `Hi ${input.name}, your ${input.plan} membership is active. Enter here: ${chatUrl}`,
  });
}

export async function sendPaymentFailedEmail(input: {
  to: string;
  name: string;
  siteUrl: string;
}) {
  const joinUrl = `${input.siteUrl.replace(/\/$/, '')}/community/join`;
  return sendEmail({
    to: input.to,
    subject: 'Action needed: Collabify Community payment did not go through',
    html: wrapEmail(
      'Your membership payment needs attention.',
      `<p>Hi ${esc(input.name)}, we couldn’t process the latest payment for your Collabify Community membership.</p>
       <p>Please update your payment details or retry checkout at <a href="${esc(joinUrl)}">${esc(joinUrl)}</a> to keep uninterrupted access.</p>`,
    ),
    text: `Hi ${input.name}, your Collabify Community payment could not be processed. Retry here: ${joinUrl}`,
  });
}

export async function sendWhiteLabelUpdateEmail(input: {
  to: string;
  name: string;
  company: string;
  subject: string;
  heading: string;
  message: string;
  siteUrl: string;
}) {
  const portalUrl = `${input.siteUrl.replace(/\/$/, '')}/white-label`;
  return sendEmail({
    to: input.to,
    subject: input.subject,
    html: wrapEmail(
      input.heading,
      `<p>Hi ${esc(input.name)} (${esc(input.company)}),</p>
       <p>${esc(input.message)}</p>
       <p>Open your white-label portal at <a href="${esc(portalUrl)}">${esc(portalUrl)}</a>.</p>`,
    ),
    text: `Hi ${input.name} (${input.company}), ${input.message} Portal: ${portalUrl}`,
  });
}

export async function sendPasswordRecoveryEmail(input: {
  to: string;
  recoveryLink: string;
}) {
  return sendEmail({
    to: input.to,
    subject: 'Reset your Collabify Growth password',
    html: wrapEmail(
      'Reset your password.',
      `<p>Use the secure link below to set a new password for your Collabify Growth account:</p>
       <p style="margin:20px 0;"><a href="${esc(input.recoveryLink)}" style="background:#5e3a8e;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block;font-weight:600;">Reset password</a></p>
       <p>If you didn’t ask for this, you can safely ignore this email.</p>`,
    ),
    text: `Reset your Collabify Growth password using this link: ${input.recoveryLink}`,
  });
}

