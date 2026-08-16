/**
 * lib/email.ts
 * Email service using SMTP via Nodemailer.
 * Can be configured via Database settings or fallback to GMAIL_USER / GMAIL_APP_PASSWORD in .env.
 */

import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { env } from '@/config/application/env'

// ─── Transporter ──────────────────────────────────────────────────────────────

async function createTransporter() {
  try {
    const settings = await prisma.appSettings.findFirst()
    if (settings && settings.smtpUser && settings.smtpPass) {
      const host = settings.smtpHost || 'smtp.gmail.com'
      const port = Number(settings.smtpPort) || 587
      const secure = port === 465

      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        },
      })
    }
  } catch (err) {
    console.error('[email] Failed to query SMTP settings from database:', err)
  }

  const user = env.GMAIL_USER
  const pass = env.GMAIL_APP_PASSWORD

  if (!user || !pass || user === 'your@gmail.com') {
    // Return null — emails will be skipped gracefully when not configured
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

// ─── Base mailer ──────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const transporter = await createTransporter()
  if (!transporter) {
    console.warn(`[email] SMTP not configured — skipping email to ${to}: "${subject}"`)
    return false
  }

  let from = `"Tvita Platform" <${env.GMAIL_USER || 'noreply@tvita.dev'}>`

  try {
    const settings = await prisma.appSettings.findFirst()
    if (settings && settings.smtpSender) {
      from = settings.smtpSender
    } else if (settings && settings.smtpUser) {
      from = `"${settings.companyName || 'Tvita Platform'}" <${settings.smtpUser}>`
    }
  } catch {
    // fallback to default
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    })
    console.log(`[email] ✓ Sent "${subject}" to ${to}`)
    return true
  } catch (err) {
    console.error(`[email] ✗ Failed to send "${subject}" to ${to}:`, err)
    return false
  }
}

// ─── Client Invite ────────────────────────────────────────────────────────────

interface ClientInviteOptions {
  to: string
  name: string
  inviteLink: string
  appName?: string
}

export async function sendClientInvite({ to, name, inviteLink, appName = 'Tvita' }: ClientInviteOptions) {
  const subject = `You're invited to join ${appName} Client Portal`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Welcome to ${appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a35;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6c47ff 0%,#a855f7 100%);padding:32px 40px;text-align:center;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;font-weight:800;color:#fff;">T</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${appName}</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Client Portal</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px;">
      <h2 style="color:#f1f1f1;font-size:20px;font-weight:600;margin:0 0 12px;">Welcome aboard, ${name}! 👋</h2>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Your client account has been set up on <strong style="color:#f1f1f1;">${appName}</strong>.
        Click the button below to set your password and access your project portal.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${inviteLink}" 
           style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a855f7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.02em;">
          Set Up My Password
        </a>
      </div>

      <p style="color:#6b6b80;font-size:12px;line-height:1.6;margin:0;">
        This link expires in 24 hours. If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#13131a;padding:20px 40px;text-align:center;border-top:1px solid #2a2a35;">
      <p style="color:#4a4a5a;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
  return sendEmail({ to, subject, html })
}

// ─── Client Sub-Team Invite ───────────────────────────────────────────────────

interface ClientTeamInviteOptions {
  to: string
  teamName: string
  clientName: string
  inviteLink: string
  appName?: string
}

export async function sendClientTeamInvite({
  to,
  teamName,
  clientName,
  inviteLink,
  appName = 'Tvita',
}: ClientTeamInviteOptions) {
  const subject = `${clientName} has invited you to their ${appName} workspace`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Team Invite — ${appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a35;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0ea5e9 0%,#6c47ff 100%);padding:32px 40px;text-align:center;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;font-weight:800;color:#fff;">T</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${appName}</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Team Access</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px;">
      <h2 style="color:#f1f1f1;font-size:20px;font-weight:600;margin:0 0 12px;">You've been invited! 🎉</h2>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 8px;">
        <strong style="color:#f1f1f1;">${clientName}</strong> has added you as a member of the
        <strong style="color:#f1f1f1;">${teamName}</strong> team on <strong style="color:#f1f1f1;">${appName}</strong>.
      </p>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 24px;">
        You'll have access to project updates, completed milestones, and client approvals relevant to your team.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${inviteLink}"
           style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6c47ff);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.02em;">
          Accept Invitation & Set Password
        </a>
      </div>

      <p style="color:#6b6b80;font-size:12px;line-height:1.6;margin:0;">
        This link expires in 24 hours. If you didn't expect this invitation, please contact <strong>${clientName}</strong>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#13131a;padding:20px 40px;text-align:center;border-top:1px solid #2a2a35;">
      <p style="color:#4a4a5a;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
  return sendEmail({ to, subject, html })
}

// ─── Team / Role Member Account Created ──────────────────────────────────────

interface RoleAccountCreatedOptions {
  to: string
  name: string
  role: string
  inviteLink: string
  appName?: string
}

export async function sendRoleAccountCreatedEmail({
  to,
  name,
  role,
  inviteLink,
  appName = 'Tvita',
}: RoleAccountCreatedOptions) {
  const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
  const subject = `Welcome to ${appName} — Account Created (${formattedRole})`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Welcome to ${appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a35;">
    <div style="background:linear-gradient(135deg,#6c47ff 0%,#a855f7 100%);padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${appName}</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">${formattedRole} Workspace Access</p>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="color:#f1f1f1;font-size:20px;font-weight:600;margin:0 0 12px;">Hello ${name},</h2>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 24px;">
        An administrator has set up your account on <strong style="color:#f1f1f1;">${appName}</strong> with the role of <strong>${formattedRole}</strong>.
        Click below to complete setting up your account.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a855f7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">Set Up Account</a>
      </div>
    </div>
    <div style="background:#13131a;padding:20px 40px;text-align:center;border-top:1px solid #2a2a35;">
      <p style="color:#4a4a5a;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
  return sendEmail({ to, subject, html })
}

// ─── Account Status Changed (Revoke / Restore / Deactivate) ────────────────────

interface AccountStatusChangedOptions {
  to: string
  name: string
  status: 'ACTIVE' | 'REVOKED' | 'INACTIVE'
  reason?: string
  appName?: string
}

export async function sendAccountStatusChangedEmail({
  to,
  name,
  status,
  reason,
  appName = 'Tvita',
}: AccountStatusChangedOptions) {
  const isRevoked = status === 'REVOKED' || status === 'INACTIVE'
  const subject = `Account Status Notification — ${appName}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Account Status — ${appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a35;">
    <div style="background:${isRevoked ? '#ef4444' : '#10b981'};padding:32px 40px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">${appName} Account Update</h1>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="color:#f1f1f1;font-size:18px;margin:0 0 12px;">Hello ${name},</h2>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your access status to <strong>${appName}</strong> has been updated to:
        <strong style="color:${isRevoked ? '#ef4444' : '#10b981'};">${status}</strong>.
      </p>
      ${reason ? `<p style="color:#858599;font-size:13px;background:#13131a;padding:12px;border-radius:8px;">Reason: ${reason}</p>` : ''}
      <p style="color:#a1a1b5;font-size:13px;line-height:1.6;margin-top:20px;">
        If you have questions, please contact your workspace administrator or agency manager.
      </p>
    </div>
  </div>
</body>
</html>
`
  return sendEmail({ to, subject, html })
}

// ─── Project Assignment ────────────────────────────────────────────────────────

interface ProjectAssignedOptions {
  to: string
  name: string
  projectName: string
  role: string
  projectUrl: string
  appName?: string
}

export async function sendProjectAssignedEmail({
  to,
  name,
  projectName,
  role,
  projectUrl,
  appName = 'Tvita',
}: ProjectAssignedOptions) {
  const subject = `You've been assigned to project "${projectName}" — ${appName}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Project Assigned — ${appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a35;">
    <div style="background:linear-gradient(135deg,#6c47ff,#0ea5e9);padding:32px 40px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">Project Assigned 🚀</h1>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="color:#f1f1f1;font-size:18px;margin:0 0 12px;">Hello ${name},</h2>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 20px;">
        You have been assigned as <strong>${role}</strong> to the project <strong style="color:#f1f1f1;">${projectName}</strong> on ${appName}.
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${projectUrl}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#0ea5e9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">View Project Workspace</a>
      </div>
    </div>
  </div>
</body>
</html>
`
  return sendEmail({ to, subject, html })
}

// ─── Subscription Activated Email ──────────────────────────────────────────────

interface SubscriptionActivatedOptions {
  to: string
  clientName: string
  planName: string
  amount: string
  billingCycle: string
  appName?: string
}

export async function sendSubscriptionActivatedEmail({
  to,
  clientName,
  planName,
  amount,
  billingCycle,
  appName = 'Tvita',
}: SubscriptionActivatedOptions) {
  const subject = `Subscription Confirmed: ${planName} — ${appName}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Subscription Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a35;">
    <div style="background:linear-gradient(135deg,#10b981,#0ea5e9);padding:32px 40px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">Subscription Activated 🎉</h1>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="color:#f1f1f1;font-size:18px;margin:0 0 12px;">Hello ${clientName},</h2>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Thank you! Your subscription package <strong style="color:#f1f1f1;">${planName}</strong> (${amount}/${billingCycle}) is now active.
      </p>
    </div>
  </div>
</body>
</html>
`
  return sendEmail({ to, subject, html })
}

interface PasswordResetEmailOptions {
  to: string
  name: string
  resetLink: string
  appName?: string
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
  appName = 'Tvita',
}: PasswordResetEmailOptions) {
  const subject = `Reset your password — ${appName}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Reset Password — ${appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid #2a2a35;">
    <div style="background:linear-gradient(135deg,#6c47ff,#a855f7);padding:32px 40px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">Password Reset Request</h1>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="color:#f1f1f1;font-size:18px;margin:0 0 12px;">Hello ${name},</h2>
      <p style="color:#a1a1b5;font-size:14px;line-height:1.7;margin:0 0 20px;">
        We received a request to reset the password for your account. Click the button below to reset it:
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a855f7);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">Reset Password</a>
      </div>
      <p style="color:#6b6b80;font-size:12px;line-height:1.6;margin:0;">
        This link expires in 2 hours. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
`
  return sendEmail({ to, subject, html })
}


